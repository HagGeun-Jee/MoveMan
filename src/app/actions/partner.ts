'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/session'
import { format } from 'date-fns'

export type PartnerBadgeColor =
  | 'blue'
  | 'indigo'
  | 'emerald'
  | 'purple'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'slate'

export interface PartnerCompanyItem {
  id: string
  name: string
  shortName: string
  color: PartnerBadgeColor
  contactPerson: string
  phone: string
  feeType: 'NONE' | 'RATE' | 'FIXED'
  feeValue: number
  memo: string
  isActive: boolean
  order: number
  createdAt: string
}

export interface CreateQuickVisitInput {
  partnerId?: string
  partnerName?: string
  partnerShortName?: string
  partnerColor?: string
  customerName: string
  contact: string
  movingType: 'P' | 'G' | 'K'
  visitDate: string // ISO string or YYYY-MM-DDTHH:mm
  movingDate?: string // YYYY-MM-DD
  fromAddress?: string
  toAddress?: string
  specialNotes?: string
}

let isPartnerSchemaEnsured = false

export async function ensurePartnerSchema() {
  if (isPartnerSchemaEnsured) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PartnerCompany" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "shortName" TEXT DEFAULT '',
        "color" TEXT DEFAULT 'blue',
        "contactPerson" TEXT DEFAULT '',
        "phone" TEXT DEFAULT '',
        "feeType" TEXT DEFAULT 'NONE',
        "feeValue" DOUBLE PRECISION DEFAULT 0,
        "memo" TEXT DEFAULT '',
        "isActive" BOOLEAN DEFAULT true,
        "order" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PartnerCompany_pkey" PRIMARY KEY ("id")
      );
    `)
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "PartnerCompany_name_key"
      ON "PartnerCompany"("name");
    `)
    isPartnerSchemaEnsured = true
  } catch (err) {
    console.warn('ensurePartnerSchema warning:', err)
  }
}

export async function getPartnerCompanies(): Promise<PartnerCompanyItem[]> {
  await ensurePartnerSchema()
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT
        "id",
        "name",
        COALESCE("shortName", '') AS "shortName",
        COALESCE("color", 'blue') AS "color",
        COALESCE("contactPerson", '') AS "contactPerson",
        COALESCE("phone", '') AS "phone",
        COALESCE("feeType", 'NONE') AS "feeType",
        COALESCE("feeValue", 0) AS "feeValue",
        COALESCE("memo", '') AS "memo",
        COALESCE("isActive", true) AS "isActive",
        COALESCE("order", 0) AS "order",
        "createdAt"
      FROM "PartnerCompany"
      ORDER BY COALESCE("order", 0) ASC, "name" ASC`
    )

    return rows.map(r => ({
      id: r.id,
      name: r.name || '',
      shortName: r.shortName || (r.name || '').slice(0, 4),
      color: (['blue', 'indigo', 'emerald', 'purple', 'amber', 'rose', 'cyan', 'slate'].includes(r.color)
        ? r.color
        : 'blue') as PartnerBadgeColor,
      contactPerson: r.contactPerson || '',
      phone: r.phone || '',
      feeType: (['NONE', 'RATE', 'FIXED'].includes(r.feeType) ? r.feeType : 'NONE') as
        | 'NONE'
        | 'RATE'
        | 'FIXED',
      feeValue: Number(r.feeValue) || 0,
      memo: r.memo || '',
      isActive: Boolean(r.isActive ?? true),
      order: Number(r.order) || 0,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : ''
    }))
  } catch (err) {
    console.error('getPartnerCompanies error:', err)
    return []
  }
}

export async function createPartnerCompany(payload: {
  name: string
  shortName?: string
  color?: PartnerBadgeColor
  contactPerson?: string
  phone?: string
  feeType?: 'NONE' | 'RATE' | 'FIXED'
  feeValue?: number
  memo?: string
}) {
  await ensurePartnerSchema()
  const name = (payload.name || '').trim()
  if (!name) return { error: '의뢰 이사업체명을 입력해주세요.' }

  const shortName = (payload.shortName || '').trim() || name.slice(0, 4)
  const id = `PTN_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "PartnerCompany" (
        "id", "name", "shortName", "color", "contactPerson", "phone",
        "feeType", "feeValue", "memo", "isActive", "order", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )`,
      id,
      name,
      shortName,
      payload.color || 'blue',
      (payload.contactPerson || '').trim(),
      (payload.phone || '').trim(),
      payload.feeType || 'NONE',
      Number(payload.feeValue) || 0,
      (payload.memo || '').trim()
    )
    revalidatePath('/estimates')
    revalidatePath('/estimates/new')
    revalidatePath('/calendar')
    revalidatePath('/')
    return {
      success: true,
      partner: {
        id,
        name,
        shortName,
        color: (payload.color || 'blue') as PartnerBadgeColor,
        contactPerson: (payload.contactPerson || '').trim(),
        phone: (payload.phone || '').trim(),
        feeType: (payload.feeType || 'NONE') as 'NONE' | 'RATE' | 'FIXED',
        feeValue: Number(payload.feeValue) || 0,
        memo: (payload.memo || '').trim(),
        isActive: true,
        order: 0,
        createdAt: new Date().toISOString()
      }
    }
  } catch (err: any) {
    console.error('createPartnerCompany error:', err)
    return { error: '동일한 이름의 의뢰 이사업체가 이미 등록되어 있습니다.' }
  }
}

export async function updatePartnerCompany(
  id: string,
  payload: {
    name: string
    shortName?: string
    color?: PartnerBadgeColor
    contactPerson?: string
    phone?: string
    feeType?: 'NONE' | 'RATE' | 'FIXED'
    feeValue?: number
    memo?: string
    isActive?: boolean
  }
) {
  await ensurePartnerSchema()
  const name = (payload.name || '').trim()
  if (!name) return { error: '의뢰 이사업체명을 입력해주세요.' }
  const shortName = (payload.shortName || '').trim() || name.slice(0, 4)

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "PartnerCompany"
       SET "name" = $1,
           "shortName" = $2,
           "color" = $3,
           "contactPerson" = $4,
           "phone" = $5,
           "feeType" = $6,
           "feeValue" = $7,
           "memo" = $8,
           "isActive" = $9,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $10`,
      name,
      shortName,
      payload.color || 'blue',
      (payload.contactPerson || '').trim(),
      (payload.phone || '').trim(),
      payload.feeType || 'NONE',
      Number(payload.feeValue) || 0,
      (payload.memo || '').trim(),
      payload.isActive ?? true,
      id
    )
    revalidatePath('/estimates')
    revalidatePath('/estimates/new')
    revalidatePath('/calendar')
    revalidatePath('/')
    return { success: true }
  } catch (err) {
    console.error('updatePartnerCompany error:', err)
    return { error: '업체 정보 수정 중 오류가 발생했습니다.' }
  }
}

export async function deletePartnerCompany(id: string) {
  await ensurePartnerSchema()
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "PartnerCompany" WHERE "id" = $1`, id)
    revalidatePath('/estimates')
    revalidatePath('/estimates/new')
    revalidatePath('/calendar')
    revalidatePath('/')
    return { success: true }
  } catch (err) {
    console.error('deletePartnerCompany error:', err)
    return { error: '업체 삭제 중 오류가 발생했습니다.' }
  }
}

/**
 * 문자 수신 후 10초 만에 방문견적 일정만 빠르게 접수하는 서버 액션
 */
export async function createQuickVisitEstimate(input: CreateQuickVisitInput) {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  const session = await decrypt(cookie)
  if (!session?.userId) {
    return { error: '로그인이 필요합니다.' }
  }

  const customerName = (input.customerName || '').trim()
  const contact = (input.contact || '').trim()
  if (!customerName || !contact) {
    return { error: '고객명과 연락처를 입력해주세요.' }
  }

  const movingType = (['P', 'G', 'K'].includes(input.movingType) ? input.movingType : 'P') as
    | 'P'
    | 'G'
    | 'K'

  const now = new Date()
  const dateStr = format(now, 'yyMMdd')
  const prefix = `${movingType}${dateStr}`

  const lastEstimate = await prisma.estimate.findFirst({
    where: { id: { startsWith: prefix } },
    orderBy: { id: 'desc' }
  })

  let seq = 1
  if (lastEstimate) {
    const lastSeq = parseInt(lastEstimate.id.slice(-4), 10)
    seq = (isNaN(lastSeq) ? 0 : lastSeq) + 1
  }

  const estimatorName = String(session.name || '').trim()

  const environmentObj = {
    partnerId: (input.partnerId || '').trim(),
    partnerName: (input.partnerName || '').trim(),
    partnerShortName: (input.partnerShortName || input.partnerName || '').trim(),
    partnerColor: (input.partnerColor || 'blue').trim(),
    estimatorName,
    baseDistanceKm: 30,
    specialNotes: (input.specialNotes || '').trim(),
    labors: [],
    vehicles: []
  }

  const paymentPlanObj = {
    targetType: 'total',
    targetAmount: 0,
    downPayment: 0,
    downPaymentDate: '',
    downPaymentPaid: false,
    intermediatePayment: 0,
    intermediateDate: '',
    intermediatePaymentPaid: false,
    balance: 0,
    balanceDate: '',
    balancePaid: false,
    remainingAmount: 0
  }

  const adminHistory = JSON.stringify([
    { action: 'CREATE_QUICK_VISIT', by: estimatorName, at: now.toISOString() }
  ])

  const baseData = {
    movingType,
    customerName,
    contact,
    fromAddress: (input.fromAddress || '').trim() || '방문 시 상세확인',
    toAddress: (input.toAddress || '').trim() || '',
    estimateDate: now,
    visitDate: input.visitDate ? new Date(input.visitDate) : null,
    movingDate: input.movingDate ? new Date(input.movingDate) : null,
    organizeDate: null,
    cbmItems: '[]',
    materials: '[]',
    environment: JSON.stringify(environmentObj),
    paymentPlan: JSON.stringify(paymentPlanObj),
    adminHistory,
    signature: null,
    movingCost: 0,
    storageCost: 0,
    storageDays: 0,
    additionalCost: 0,
    vat: 0,
    totalAmount: 0
  }

  let currentId = `${prefix}${seq.toString().padStart(4, '0')}`
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      if (attempt > 0) {
        const latest = await prisma.estimate.findFirst({
          where: { id: { startsWith: prefix } },
          orderBy: { id: 'desc' }
        })
        const nextSeq = latest ? (parseInt(latest.id.slice(-4), 10) || 0) + 1 : seq + attempt
        currentId = `${prefix}${nextSeq.toString().padStart(4, '0')}`
      }
      await prisma.estimate.create({
        data: {
          id: currentId,
          ...baseData
        }
      })
      break
    } catch (err: any) {
      const isUniqueCollision =
        err?.code === 'P2002' || String(err?.message || '').includes('Unique constraint')
      if (isUniqueCollision && attempt < 4) {
        continue
      }
      console.error('createQuickVisitEstimate error:', err)
      return { error: '방문견적 예약 생성 중 오류가 발생했습니다.' }
    }
  }

  revalidatePath('/estimates')
  revalidatePath('/calendar')
  revalidatePath('/')
  return { success: true, id: currentId }
}

