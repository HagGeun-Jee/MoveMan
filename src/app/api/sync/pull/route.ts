import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/session'

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const sinceStr = searchParams.get('since')
    const sinceDate = sinceStr ? new Date(sinceStr) : null

    // 1. 기준정보 마스터 데이터 일괄 조회
    const [
      categories,
      standardItems,
      vehicles,
      labors,
      ladders,
      materials,
      locations
    ] = await Promise.all([
      prisma.locationCategory.findMany({ orderBy: { order: 'asc' } }),
      prisma.standardItem.findMany({ include: { locations: true } }),
      prisma.vehicleMaster.findMany(),
      prisma.laborMaster.findMany(),
      prisma.ladderTruckMaster.findMany({ orderBy: { order: 'asc' } }),
      prisma.materialItem.findMany({ orderBy: { order: 'asc' } }),
      prisma.inventoryLocation.findMany({ orderBy: { order: 'asc' } })
    ])

    // 2. 견적서 데이터 조회 (since가 있으면 변경분만, 없으면 최근 150건)
    const estimatesWhere = sinceDate ? { updatedAt: { gte: sinceDate } } : {}
    const estimates = await prisma.estimate.findMany({
      where: estimatesWhere,
      orderBy: { updatedAt: 'desc' },
      take: 150
    })

    return NextResponse.json({
      success: true,
      serverTime: new Date().toISOString(),
      masterData: {
        categories,
        standardItems,
        vehicles,
        labors,
        ladders,
        materials,
        locations
      },
      estimates: estimates.map(e => ({
        ...e,
        estimateDate: e.estimateDate.toISOString(),
        visitDate: e.visitDate ? e.visitDate.toISOString() : null,
        movingDate: e.movingDate ? e.movingDate.toISOString() : null,
        organizeDate: e.organizeDate ? e.organizeDate.toISOString() : null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      }))
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      }
    })
  } catch (error: any) {
    console.error('Sync Pull Error:', error)
    return NextResponse.json(
      { error: '동기화 데이터 수신 실패', details: error.message }, 
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
