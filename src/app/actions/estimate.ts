'use server'

import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/session'
import { format } from 'date-fns'

export async function createEstimate(formData: FormData) {
  // 인증 확인
  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  const session = await decrypt(cookie)
  if (!session?.userId) {
    throw new Error('Unauthorized')
  }

  const movingType = formData.get('movingType') as string
  const estimateDateStr = formData.get('estimateDate') as string
  const estimateDate = new Date(estimateDateStr)
  
  // 식별코드 자동 생성 로직: 이사종류코드 + 견적일자(YYMMDD) + 일련번호 4자리 (예: P2609070001)
  const dateStr = format(estimateDate, 'yyMMdd')
  const prefix = `${movingType}${dateStr}`
  
  // 같은 prefix로 시작하는 가장 마지막 견적번호 찾기
  const lastEstimate = await prisma.estimate.findFirst({
    where: { id: { startsWith: prefix } },
    orderBy: { id: 'desc' }
  })
  
  let seq = 1
  if (lastEstimate) {
    const lastSeq = parseInt(lastEstimate.id.slice(-4), 10)
    seq = lastSeq + 1
  }
  const id = `${prefix}${seq.toString().padStart(4, '0')}`

  // CBM 항목 및 결제 정보
  const cbmItems = formData.get('cbmItems') as string
  const materials = formData.get('materials') as string
  const paymentPlan = formData.get('paymentPlan') as string
  
  // 흩어져 있는 작업 환경(인원, 차량, 보관이사 정리여부, 층수, 작업조건 등) 필드들을 JSON으로 묶음
  const environmentObj = {
    labors: formData.get('labors') ? JSON.parse(formData.get('labors') as string) : [],
    vehicles: formData.get('vehicles') ? JSON.parse(formData.get('vehicles') as string) : [],
    organizeStatus: formData.get('organizeStatus') as string || '',
    fromFloor: formData.get('fromFloor') as string || '',
    fromWorkTypes: formData.get('fromWorkTypes') ? JSON.parse(formData.get('fromWorkTypes') as string) : [],
    toFloor: formData.get('toFloor') as string || '',
    toWorkTypes: formData.get('toWorkTypes') ? JSON.parse(formData.get('toWorkTypes') as string) : [],
  }
  const environment = JSON.stringify(environmentObj)
  
  // 이력 저장
  const adminHistory = JSON.stringify([
    { action: 'CREATE', by: session.name, at: new Date().toISOString() }
  ])

  await prisma.estimate.create({
    data: {
      id,
      movingType,
      customerName: formData.get('customerName') as string,
      contact: formData.get('contact') as string,
      fromAddress: formData.get('fromAddress') as string,
      toAddress: formData.get('toAddress') as string,
      estimateDate,
      movingDate: formData.get('movingDate') ? new Date(formData.get('movingDate') as string) : null,
      organizeDate: formData.get('organizeDate') ? new Date(formData.get('organizeDate') as string) : null,
      visitDate: formData.get('visitDate') ? new Date(formData.get('visitDate') as string) : null,
      
      cbmItems,
      materials,
      environment,
      paymentPlan,
      adminHistory,
      signature: formData.get('signature') as string || null,
      
      movingCost: parseInt((formData.get('movingCost') as string || '0').replace(/,/g, ''), 10),
      storageCost: parseInt((formData.get('storageCost') as string || '0').replace(/,/g, ''), 10),
      storageDays: parseInt((formData.get('storageDays') as string || '0').replace(/,/g, ''), 10),
      additionalCost: parseInt((formData.get('additionalCost') as string || '0').replace(/,/g, ''), 10),
      vat: parseInt((formData.get('vat') as string || '0').replace(/,/g, ''), 10),
      totalAmount: parseInt((formData.get('totalAmount') as string || '0').replace(/,/g, ''), 10),
    }
  })

  redirect('/estimates')
}

export async function updateEstimate(formData: FormData) {
  // 인증 확인
  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  const session = await decrypt(cookie)
  if (!session?.userId) {
    throw new Error('Unauthorized')
  }

  const id = formData.get('id') as string
  if (!id) {
    throw new Error('Estimate ID is required for update')
  }

  const movingType = formData.get('movingType') as string
  const estimateDateStr = formData.get('estimateDate') as string
  const estimateDate = new Date(estimateDateStr)
  
  // CBM 항목 및 결제 정보
  const cbmItems = formData.get('cbmItems') as string
  const materials = formData.get('materials') as string
  const paymentPlan = formData.get('paymentPlan') as string
  
  // 흩어져 있는 작업 환경(인원, 차량, 보관이사 정리여부, 층수, 작업조건 등) 필드들을 JSON으로 묶음
  const environmentObj = {
    labors: formData.get('labors') ? JSON.parse(formData.get('labors') as string) : [],
    vehicles: formData.get('vehicles') ? JSON.parse(formData.get('vehicles') as string) : [],
    organizeStatus: formData.get('organizeStatus') as string || '',
    fromFloor: formData.get('fromFloor') as string || '',
    fromWorkTypes: formData.get('fromWorkTypes') ? JSON.parse(formData.get('fromWorkTypes') as string) : [],
    toFloor: formData.get('toFloor') as string || '',
    toWorkTypes: formData.get('toWorkTypes') ? JSON.parse(formData.get('toWorkTypes') as string) : [],
  }
  const environment = JSON.stringify(environmentObj)
  
  // 기존 이력 조회 후 추가
  const existingEstimate = await prisma.estimate.findUnique({
    where: { id }
  })
  
  const adminHistoryArray = existingEstimate?.adminHistory ? JSON.parse(existingEstimate.adminHistory) : []
  adminHistoryArray.push({ action: 'UPDATE', by: session.name, at: new Date().toISOString() })
  const adminHistory = JSON.stringify(adminHistoryArray)

  await prisma.estimate.update({
    where: { id },
    data: {
      movingType,
      customerName: formData.get('customerName') as string,
      contact: formData.get('contact') as string,
      fromAddress: formData.get('fromAddress') as string,
      toAddress: formData.get('toAddress') as string,
      estimateDate,
      movingDate: formData.get('movingDate') ? new Date(formData.get('movingDate') as string) : null,
      organizeDate: formData.get('organizeDate') ? new Date(formData.get('organizeDate') as string) : null,
      visitDate: formData.get('visitDate') ? new Date(formData.get('visitDate') as string) : null,
      
      cbmItems,
      materials,
      environment,
      paymentPlan,
      adminHistory,
      signature: formData.get('signature') as string || null,
      
      movingCost: parseInt((formData.get('movingCost') as string || '0').replace(/,/g, ''), 10),
      storageCost: parseInt((formData.get('storageCost') as string || '0').replace(/,/g, ''), 10),
      storageDays: parseInt((formData.get('storageDays') as string || '0').replace(/,/g, ''), 10),
      additionalCost: parseInt((formData.get('additionalCost') as string || '0').replace(/,/g, ''), 10),
      vat: parseInt((formData.get('vat') as string || '0').replace(/,/g, ''), 10),
      totalAmount: parseInt((formData.get('totalAmount') as string || '0').replace(/,/g, ''), 10),
    }
  })

  redirect('/estimates')
}
