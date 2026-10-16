import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/session'
import { format } from 'date-fns'

export async function POST(request: Request) {
  try {
    const syncToken = request.headers.get('x-sync-token')
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value
    const session = await decrypt(sessionCookie)

    const isAppClient = syncToken === 'meman-sync-auth-token-2026'
    if (!session?.userId && !isAppClient) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다. 로그인 상태를 확인해주세요.' }, 
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*'
          }
        }
      )
    }

    const body = await request.json()
    const items = body.items || []

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: true, processedCount: 0, results: [] })
    }

    const results = []

    for (const item of items) {
      try {
        if (item.entityType === 'estimate') {
          if (item.action === 'CREATE') {
            const data = item.payload
            const movingType = data.movingType || 'P'
            const estDate = data.estimateDate ? new Date(data.estimateDate) : new Date()
            
            // 견적번호 채번: movingType + YYMMDD + 0001
            const dateStr = format(estDate, 'yyMMdd')
            const prefix = `${movingType}${dateStr}`

            const lastEstimate = await prisma.estimate.findFirst({
              where: { id: { startsWith: prefix } },
              orderBy: { id: 'desc' }
            })

            let seq = 1
            if (lastEstimate) {
              const lastSeq = parseInt(lastEstimate.id.slice(-4), 10)
              if (!isNaN(lastSeq)) {
                seq = lastSeq + 1
              }
            }
            const serverId = `${prefix}${seq.toString().padStart(4, '0')}`

            await prisma.estimate.create({
              data: {
                id: serverId,
                movingType: data.movingType,
                customerName: data.customerName || '',
                contact: data.contact || '',
                fromAddress: data.fromAddress || '',
                toAddress: data.toAddress || '',
                estimateDate: estDate,
                visitDate: data.visitDate ? new Date(data.visitDate) : null,
                movingDate: data.movingDate ? new Date(data.movingDate) : null,
                organizeDate: data.organizeDate ? new Date(data.organizeDate) : null,
                cbmItems: typeof data.cbmItems === 'string' ? data.cbmItems : JSON.stringify(data.cbmItems || []),
                materials: typeof data.materials === 'string' ? data.materials : JSON.stringify(data.materials || {}),
                assemblyItems: typeof data.assemblyItems === 'string' ? data.assemblyItems : JSON.stringify(data.assemblyItems || []),
                environment: typeof data.environment === 'string' ? data.environment : JSON.stringify(data.environment || {}),
                paymentPlan: typeof data.paymentPlan === 'string' ? data.paymentPlan : JSON.stringify(data.paymentPlan || {}),
                movingCost: Math.round(Number(data.movingCost) || 0),
                storageCost: Math.round(Number(data.storageCost) || 0),
                additionalCost: Math.round(Number(data.additionalCost) || 0),
                vat: Math.round(Number(data.vat) || 0),
                totalAmount: Math.round(Number(data.totalAmount) || 0),
              }
            })

            results.push({
              queueId: item.id,
              clientTempId: item.entityId,
              serverId: serverId,
              action: 'CREATE',
              status: 'success'
            })
          } else if (item.action === 'UPDATE') {
            const data = item.payload
            const serverId = item.entityId

            const existing = await prisma.estimate.findUnique({
              where: { id: serverId }
            })

            if (existing) {
              await prisma.estimate.update({
                where: { id: serverId },
                data: {
                  movingType: data.movingType !== undefined ? data.movingType : existing.movingType,
                  customerName: data.customerName !== undefined ? data.customerName : existing.customerName,
                  contact: data.contact !== undefined ? data.contact : existing.contact,
                  fromAddress: data.fromAddress !== undefined ? data.fromAddress : existing.fromAddress,
                  toAddress: data.toAddress !== undefined ? data.toAddress : existing.toAddress,
                  estimateDate: data.estimateDate ? new Date(data.estimateDate) : existing.estimateDate,
                  visitDate: data.visitDate ? new Date(data.visitDate) : existing.visitDate,
                  movingDate: data.movingDate ? new Date(data.movingDate) : existing.movingDate,
                  organizeDate: data.organizeDate ? new Date(data.organizeDate) : existing.organizeDate,
                  cbmItems: data.cbmItems !== undefined ? (typeof data.cbmItems === 'string' ? data.cbmItems : JSON.stringify(data.cbmItems)) : existing.cbmItems,
                  materials: data.materials !== undefined ? (typeof data.materials === 'string' ? data.materials : JSON.stringify(data.materials)) : existing.materials,
                  assemblyItems: data.assemblyItems !== undefined ? (typeof data.assemblyItems === 'string' ? data.assemblyItems : JSON.stringify(data.assemblyItems)) : existing.assemblyItems,
                  environment: data.environment !== undefined ? (typeof data.environment === 'string' ? data.environment : JSON.stringify(data.environment)) : existing.environment,
                  paymentPlan: data.paymentPlan !== undefined ? (typeof data.paymentPlan === 'string' ? data.paymentPlan : JSON.stringify(data.paymentPlan)) : existing.paymentPlan,
                  movingCost: data.movingCost !== undefined ? Math.round(Number(data.movingCost) || 0) : existing.movingCost,
                  storageCost: data.storageCost !== undefined ? Math.round(Number(data.storageCost) || 0) : existing.storageCost,
                  additionalCost: data.additionalCost !== undefined ? Math.round(Number(data.additionalCost) || 0) : existing.additionalCost,
                  vat: data.vat !== undefined ? Math.round(Number(data.vat) || 0) : existing.vat,
                  totalAmount: data.totalAmount !== undefined ? Math.round(Number(data.totalAmount) || 0) : existing.totalAmount,
                }
              })
              results.push({
                queueId: item.id,
                serverId: serverId,
                action: 'UPDATE',
                status: 'success'
              })
            } else {
              results.push({
                queueId: item.id,
                serverId: serverId,
                action: 'UPDATE',
                status: 'error',
                message: '수정할 원본 견적을 서버에서 찾을 수 없습니다.'
              })
            }
          } else if (item.action === 'DELETE') {
            const serverId = item.entityId
            await prisma.estimate.delete({
              where: { id: serverId }
            }).catch(() => {}) // 이미 없는 경우 무시

            results.push({
              queueId: item.id,
              serverId: serverId,
              action: 'DELETE',
              status: 'success'
            })
          }
        }
      } catch (itemError: any) {
        console.error(`Item Sync Error (ID: ${item.entityId}):`, itemError)
        results.push({
          queueId: item.id,
          entityId: item.entityId,
          status: 'error',
          message: itemError.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: results.filter(r => r.status === 'success').length,
      totalReceived: items.length,
      results
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      }
    })
  } catch (error: any) {
    console.error('Sync Push Error:', error)
    return NextResponse.json(
      { error: '동기화 데이터 업로드 실패', details: error.message }, 
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*'
        }
      }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-sync-token',
    },
  })
}
