'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { CharteredTruckFareItem } from '@/types/charteredTruck'

// 전국 화물운송연합회 및 화물콜(24시콜, 전국콜) 공식 표준 용차 운임표
const DEFAULT_CHARTERED_TRUCK_FARES: Omit<CharteredTruckFareItem, 'id'>[] = [
  { distanceName: '시내 관내 (20km 이내)', minDistanceKm: 0, maxDistanceKm: 20, cost1TonCargo: 60000, cost1TonTop: 80000, cost2_5TonCargo: 120000, cost2_5TonTop: 150000, cost5TonCargo: 180000, cost5TonTop: 220000, order: 1, note: '시내 기본운임' },
  { distanceName: '30km 이내', minDistanceKm: 21, maxDistanceKm: 30, cost1TonCargo: 70000, cost1TonTop: 90000, cost2_5TonCargo: 130000, cost2_5TonTop: 160000, cost5TonCargo: 200000, cost5TonTop: 240000, order: 2, note: '단거리' },
  { distanceName: '50km 이내', minDistanceKm: 31, maxDistanceKm: 50, cost1TonCargo: 90000, cost1TonTop: 110000, cost2_5TonCargo: 160000, cost2_5TonTop: 190000, cost5TonCargo: 230000, cost5TonTop: 270000, order: 3, note: '수도권 인접' },
  { distanceName: '70km 이내', minDistanceKm: 51, maxDistanceKm: 70, cost1TonCargo: 110000, cost1TonTop: 130000, cost2_5TonCargo: 180000, cost2_5TonTop: 220000, cost5TonCargo: 260000, cost5TonTop: 300000, order: 4, note: '중거리' },
  { distanceName: '100km 이내', minDistanceKm: 71, maxDistanceKm: 100, cost1TonCargo: 130000, cost1TonTop: 160000, cost2_5TonCargo: 210000, cost2_5TonTop: 250000, cost5TonCargo: 300000, cost5TonTop: 350000, order: 5, note: '지방권 진입' },
  { distanceName: '150km 이내', minDistanceKm: 101, maxDistanceKm: 150, cost1TonCargo: 160000, cost1TonTop: 190000, cost2_5TonCargo: 250000, cost2_5TonTop: 290000, cost5TonCargo: 360000, cost5TonTop: 420000, order: 6, note: '충청/강원' },
  { distanceName: '200km 이내', minDistanceKm: 151, maxDistanceKm: 200, cost1TonCargo: 190000, cost1TonTop: 230000, cost2_5TonCargo: 290000, cost2_5TonTop: 340000, cost5TonCargo: 420000, cost5TonTop: 480000, order: 7, note: '전라/경북' },
  { distanceName: '300km 이상', minDistanceKm: 201, maxDistanceKm: 999, cost1TonCargo: 250000, cost1TonTop: 290000, cost2_5TonCargo: 380000, cost2_5TonTop: 440000, cost5TonCargo: 530000, cost5TonTop: 600000, order: 8, note: '부산/남부 장거리' },
]

/**
 * 용차 표준 운임표 전체 조회 (데이터가 비어있으면 기본값 자동 시딩)
 */
export async function getCharteredTruckFares(): Promise<CharteredTruckFareItem[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "CharteredTruckMaster" ORDER BY "order" ASC, "minDistanceKm" ASC
    `)

    if (rows && rows.length > 0) {
      return rows.map(r => ({
        id: r.id,
        distanceName: r.distanceName,
        minDistanceKm: Number(r.minDistanceKm),
        maxDistanceKm: Number(r.maxDistanceKm),
        cost1TonCargo: Number(r.cost1TonCargo),
        cost1TonTop: Number(r.cost1TonTop),
        cost2_5TonCargo: Number(r.cost2_5TonCargo),
        cost2_5TonTop: Number(r.cost2_5TonTop),
        cost5TonCargo: Number(r.cost5TonCargo),
        cost5TonTop: Number(r.cost5TonTop),
        note: r.note || '',
        order: Number(r.order) || 0
      }))
    }

    // 데이터가 없으면 기본 데이터 자동 시딩
    await seedDefaultCharteredTruckFares()
    return await getCharteredTruckFares()
  } catch (err) {
    console.error('getCharteredTruckFares error:', err)
    return []
  }
}

/**
 * 기본 표준 용차 운임표 시딩
 */
export async function seedDefaultCharteredTruckFares() {
  for (const item of DEFAULT_CHARTERED_TRUCK_FARES) {
    const id = `chartered_${item.order}`
    await prisma.$executeRawUnsafe(`
      INSERT INTO "CharteredTruckMaster" ("id", "distanceName", "minDistanceKm", "maxDistanceKm", "cost1TonCargo", "cost1TonTop", "cost2_5TonCargo", "cost2_5TonTop", "cost5TonCargo", "cost5TonTop", "note", "order", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT ("id") DO UPDATE SET
        "distanceName" = EXCLUDED."distanceName",
        "minDistanceKm" = EXCLUDED."minDistanceKm",
        "maxDistanceKm" = EXCLUDED."maxDistanceKm",
        "cost1TonCargo" = EXCLUDED."cost1TonCargo",
        "cost1TonTop" = EXCLUDED."cost1TonTop",
        "cost2_5TonCargo" = EXCLUDED."cost2_5TonCargo",
        "cost2_5TonTop" = EXCLUDED."cost2_5TonTop",
        "cost5TonCargo" = EXCLUDED."cost5TonCargo",
        "cost5TonTop" = EXCLUDED."cost5TonTop",
        "note" = EXCLUDED."note",
        "order" = EXCLUDED."order",
        "updatedAt" = NOW()
    `, id, item.distanceName, item.minDistanceKm, item.maxDistanceKm, item.cost1TonCargo, item.cost1TonTop, item.cost2_5TonCargo, item.cost2_5TonTop, item.cost5TonCargo, item.cost5TonTop, item.note || '', item.order)
  }
}

/**
 * 새 거리 구간 등록
 */
export async function createCharteredTruckFare(formData: FormData) {
  const distanceName = (formData.get('distanceName') as string)?.trim()
  const minDistanceKm = Number(formData.get('minDistanceKm')) || 0
  const maxDistanceKm = Number(formData.get('maxDistanceKm')) || minDistanceKm
  const cost1TonCargo = Number(formData.get('cost1TonCargo')) || 0
  const cost1TonTop = Number(formData.get('cost1TonTop')) || 0
  const cost2_5TonCargo = Number(formData.get('cost2_5TonCargo')) || 0
  const cost2_5TonTop = Number(formData.get('cost2_5TonTop')) || 0
  const cost5TonCargo = Number(formData.get('cost5TonCargo')) || 0
  const cost5TonTop = Number(formData.get('cost5TonTop')) || 0
  const note = (formData.get('note') as string)?.trim() || ''
  const order = Number(formData.get('order')) || 99

  if (!distanceName) return { error: '거리 구간 명칭을 입력하세요 (예: 400km 이상).' }

  try {
    const id = `chartered_${Date.now()}`
    await prisma.$executeRawUnsafe(`
      INSERT INTO "CharteredTruckMaster" ("id", "distanceName", "minDistanceKm", "maxDistanceKm", "cost1TonCargo", "cost1TonTop", "cost2_5TonCargo", "cost2_5TonTop", "cost5TonCargo", "cost5TonTop", "note", "order", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    `, id, distanceName, minDistanceKm, maxDistanceKm, cost1TonCargo, cost1TonTop, cost2_5TonCargo, cost2_5TonTop, cost5TonCargo, cost5TonTop, note, order)

    revalidatePath('/chartered-trucks')
    return { success: true }
  } catch (error) {
    console.error('createCharteredTruckFare error:', error)
    return { error: '등록에 실패했습니다.' }
  }
}

/**
 * 용차 운임표 일괄 수정
 */
export async function batchUpdateCharteredTruckFares(items: CharteredTruckFareItem[]) {
  try {
    for (const item of items) {
      await prisma.$executeRawUnsafe(`
        UPDATE "CharteredTruckMaster"
        SET
          "distanceName" = $1,
          "minDistanceKm" = $2,
          "maxDistanceKm" = $3,
          "cost1TonCargo" = $4,
          "cost1TonTop" = $5,
          "cost2_5TonCargo" = $6,
          "cost2_5TonTop" = $7,
          "cost5TonCargo" = $8,
          "cost5TonTop" = $9,
          "note" = $10,
          "order" = $11,
          "updatedAt" = NOW()
        WHERE "id" = $12
      `, item.distanceName, item.minDistanceKm, item.maxDistanceKm, item.cost1TonCargo, item.cost1TonTop, item.cost2_5TonCargo, item.cost2_5TonTop, item.cost5TonCargo, item.cost5TonTop, item.note || '', item.order, item.id)
    }

    revalidatePath('/chartered-trucks')
    return { success: true }
  } catch (error) {
    console.error('batchUpdateCharteredTruckFares error:', error)
    return { error: '저장에 실패했습니다.' }
  }
}

/**
 * 기본 표준 요금표로 리셋
 */
export async function resetCharteredTruckFaresToDefault() {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "CharteredTruckMaster"`)
    await seedDefaultCharteredTruckFares()
    revalidatePath('/chartered-trucks')
    return { success: true }
  } catch (error) {
    console.error('resetCharteredTruckFaresToDefault error:', error)
    return { error: '초기화에 실패했습니다.' }
  }
}

/**
 * 거리 구간 삭제
 */
export async function deleteCharteredTruckFare(id: string) {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "CharteredTruckMaster" WHERE "id" = $1`, id)
    revalidatePath('/chartered-trucks')
    return { success: true }
  } catch (error) {
    console.error('deleteCharteredTruckFare error:', error)
    return { error: '삭제에 실패했습니다.' }
  }
}

/**
 * 특정 거리와 차종, 차형(카고/탑차)에 맞는 용차 운임 계산
 */
export async function getCharteredFareByDistance(distanceKm: number, tonnage: '1' | '2.5' | '5', isTopTruck: boolean = false): Promise<number> {
  try {
    const fares = await getCharteredTruckFares()
    if (fares.length === 0) return 0

    // 해당 거리 구간 매칭
    const matched = fares.find(f => distanceKm >= f.minDistanceKm && distanceKm <= f.maxDistanceKm) 
      || fares[fares.length - 1] // 구간 초과 시 최장거리 구간

    if (!matched) return 0

    if (tonnage === '1') {
      return isTopTruck ? matched.cost1TonTop : matched.cost1TonCargo
    } else if (tonnage === '2.5') {
      return isTopTruck ? matched.cost2_5TonTop : matched.cost2_5TonCargo
    } else {
      return isTopTruck ? matched.cost5TonTop : matched.cost5TonCargo
    }
  } catch {
    return 0
  }
}
