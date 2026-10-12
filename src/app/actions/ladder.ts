'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

import type { LadderFareItem } from '@/types/ladder'
export type { LadderFareItem } from '@/types/ladder'

// 한국 이사화물 사다리차 전국 표준 운임표 (사다리차 협회 및 협동조합 공식 표준단가)
const DEFAULT_LADDER_FARES: Omit<LadderFareItem, 'id'>[] = [
  { floorName: '2~5층', minFloor: 2, maxFloor: 5, cost1Ton: 120000, cost2_5Ton: 130000, cost5Ton: 150000, cost6Ton: 180000, cost7_5Ton: 210000, cost10Ton: 240000, order: 1, note: '저층 기본요금' },
  { floorName: '6~7층', minFloor: 6, maxFloor: 7, cost1Ton: 130000, cost2_5Ton: 140000, cost5Ton: 160000, cost6Ton: 190000, cost7_5Ton: 220000, cost10Ton: 250000, order: 2, note: '' },
  { floorName: '8~9층', minFloor: 8, maxFloor: 9, cost1Ton: 140000, cost2_5Ton: 150000, cost5Ton: 170000, cost6Ton: 200000, cost7_5Ton: 230000, cost10Ton: 260000, order: 3, note: '' },
  { floorName: '10~11층', minFloor: 10, maxFloor: 11, cost1Ton: 150000, cost2_5Ton: 160000, cost5Ton: 180000, cost6Ton: 210000, cost7_5Ton: 240000, cost10Ton: 270000, order: 4, note: '' },
  { floorName: '12~13층', minFloor: 12, maxFloor: 13, cost1Ton: 160000, cost2_5Ton: 170000, cost5Ton: 190000, cost6Ton: 220000, cost7_5Ton: 250000, cost10Ton: 280000, order: 5, note: '' },
  { floorName: '14층', minFloor: 14, maxFloor: 14, cost1Ton: 170000, cost2_5Ton: 180000, cost5Ton: 200000, cost6Ton: 230000, cost7_5Ton: 260000, cost10Ton: 290000, order: 6, note: '38m 장비' },
  { floorName: '15층', minFloor: 15, maxFloor: 15, cost1Ton: 180000, cost2_5Ton: 190000, cost5Ton: 210000, cost6Ton: 240000, cost7_5Ton: 270000, cost10Ton: 300000, order: 7, note: '' },
  { floorName: '16층', minFloor: 16, maxFloor: 16, cost1Ton: 190000, cost2_5Ton: 200000, cost5Ton: 220000, cost6Ton: 250000, cost7_5Ton: 280000, cost10Ton: 310000, order: 8, note: '45m 장비' },
  { floorName: '17층', minFloor: 17, maxFloor: 17, cost1Ton: 200000, cost2_5Ton: 210000, cost5Ton: 230000, cost6Ton: 260000, cost7_5Ton: 290000, cost10Ton: 320000, order: 9, note: '' },
  { floorName: '18층', minFloor: 18, maxFloor: 18, cost1Ton: 220000, cost2_5Ton: 230000, cost5Ton: 250000, cost6Ton: 280000, cost7_5Ton: 310000, cost10Ton: 340000, order: 10, note: '' },
  { floorName: '19층', minFloor: 19, maxFloor: 19, cost1Ton: 230000, cost2_5Ton: 240000, cost5Ton: 260000, cost6Ton: 290000, cost7_5Ton: 320000, cost10Ton: 350000, order: 11, note: '' },
  { floorName: '20층', minFloor: 20, maxFloor: 20, cost1Ton: 250000, cost2_5Ton: 260000, cost5Ton: 280000, cost6Ton: 310000, cost7_5Ton: 340000, cost10Ton: 370000, order: 12, note: '54m 고층장비' },
  { floorName: '21층', minFloor: 21, maxFloor: 21, cost1Ton: 280000, cost2_5Ton: 290000, cost5Ton: 310000, cost6Ton: 340000, cost7_5Ton: 370000, cost10Ton: 400000, order: 13, note: '고층 특수작업' },
  { floorName: '22층', minFloor: 22, maxFloor: 22, cost1Ton: 310000, cost2_5Ton: 320000, cost5Ton: 340000, cost6Ton: 370000, cost7_5Ton: 400000, cost10Ton: 430000, order: 14, note: '고층 특수작업' },
  { floorName: '23층', minFloor: 23, maxFloor: 23, cost1Ton: 340000, cost2_5Ton: 350000, cost5Ton: 370000, cost6Ton: 400000, cost7_5Ton: 430000, cost10Ton: 460000, order: 15, note: '65m 초고층장비' },
  { floorName: '24층', minFloor: 24, maxFloor: 24, cost1Ton: 370000, cost2_5Ton: 380000, cost5Ton: 400000, cost6Ton: 430000, cost7_5Ton: 460000, cost10Ton: 490000, order: 16, note: '초고층' },
  { floorName: '25층', minFloor: 25, maxFloor: 25, cost1Ton: 400000, cost2_5Ton: 420000, cost5Ton: 440000, cost6Ton: 480000, cost7_5Ton: 520000, cost10Ton: 550000, order: 17, note: '초고층' },
  { floorName: '26층 이상', minFloor: 26, maxFloor: 99, cost1Ton: 450000, cost2_5Ton: 480000, cost5Ton: 500000, cost6Ton: 550000, cost7_5Ton: 600000, cost10Ton: 650000, order: 18, note: '현장 협의 / 70m급' },
]


/**
 * 사다리차 운임표 전체 조회 (데이터가 비어있는 경우 기본 표준 운임 자동 초기화)
 */
export async function getLadderFares(): Promise<LadderFareItem[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "LadderTruckMaster" ORDER BY "order" ASC, "minFloor" ASC
    `)

    if (rows && rows.length > 0) {
      return rows.map(r => ({
        id: r.id,
        floorName: r.floorName,
        minFloor: Number(r.minFloor),
        maxFloor: Number(r.maxFloor),
        cost1Ton: Number(r.cost1Ton),
        cost2_5Ton: Number(r.cost2_5Ton),
        cost5Ton: Number(r.cost5Ton),
        cost6Ton: Number(r.cost6Ton),
        cost7_5Ton: Number(r.cost7_5Ton),
        cost10Ton: Number(r.cost10Ton),
        note: r.note || '',
        order: Number(r.order) || 0
      }))
    }

    // 데이터가 없으면 기본 데이터 자동 시딩
    await seedDefaultLadderFares()
    return await getLadderFares()
  } catch (err) {
    console.error('getLadderFares error:', err)
    return []
  }
}

/**
 * 기본 표준 사다리차 운임표 시딩
 */
export async function seedDefaultLadderFares() {
  for (const item of DEFAULT_LADDER_FARES) {
    const id = `ladder_${item.order}`
    await prisma.$executeRawUnsafe(`
      INSERT INTO "LadderTruckMaster" ("id", "floorName", "minFloor", "maxFloor", "cost1Ton", "cost2_5Ton", "cost5Ton", "cost6Ton", "cost7_5Ton", "cost10Ton", "note", "order", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT ("id") DO UPDATE SET
        "floorName" = EXCLUDED."floorName",
        "minFloor" = EXCLUDED."minFloor",
        "maxFloor" = EXCLUDED."maxFloor",
        "cost1Ton" = EXCLUDED."cost1Ton",
        "cost2_5Ton" = EXCLUDED."cost2_5Ton",
        "cost5Ton" = EXCLUDED."cost5Ton",
        "cost6Ton" = EXCLUDED."cost6Ton",
        "cost7_5Ton" = EXCLUDED."cost7_5Ton",
        "cost10Ton" = EXCLUDED."cost10Ton",
        "note" = EXCLUDED."note",
        "order" = EXCLUDED."order",
        "updatedAt" = NOW()
    `, id, item.floorName, item.minFloor, item.maxFloor, item.cost1Ton, item.cost2_5Ton, item.cost5Ton, item.cost6Ton, item.cost7_5Ton, item.cost10Ton, item.note || '', item.order)
  }
}

/**
 * 새 사다리차 층수 구간 등록
 */
export async function createLadderFare(formData: FormData) {
  const floorName = (formData.get('floorName') as string)?.trim()
  const minFloor = Number(formData.get('minFloor')) || 1
  const maxFloor = Number(formData.get('maxFloor')) || minFloor
  const cost1Ton = Number(formData.get('cost1Ton')) || 0
  const cost2_5Ton = Number(formData.get('cost2_5Ton')) || 0
  const cost5Ton = Number(formData.get('cost5Ton')) || 0
  const cost6Ton = Number(formData.get('cost6Ton')) || 0
  const cost7_5Ton = Number(formData.get('cost7_5Ton')) || 0
  const cost10Ton = Number(formData.get('cost10Ton')) || 0
  const note = (formData.get('note') as string)?.trim() || ''
  const order = Number(formData.get('order')) || 99

  if (!floorName) return { error: '층수 명칭을 입력하세요 (예: 26~27층).' }

  try {
    const id = `ladder_${Date.now()}`
    await prisma.$executeRawUnsafe(`
      INSERT INTO "LadderTruckMaster" ("id", "floorName", "minFloor", "maxFloor", "cost1Ton", "cost2_5Ton", "cost5Ton", "cost6Ton", "cost7_5Ton", "cost10Ton", "note", "order", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    `, id, floorName, minFloor, maxFloor, cost1Ton, cost2_5Ton, cost5Ton, cost6Ton, cost7_5Ton, cost10Ton, note, order)

    revalidatePath('/ladders')
    return { success: true }
  } catch (error) {
    console.error('createLadderFare error:', error)
    return { error: '등록 중 오류가 발생했습니다.' }
  }
}

/**
 * 단일 사다리차 구간 운임 업데이트
 */
export async function updateLadderFare(
  id: string,
  data: Partial<LadderFareItem>
) {
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE "LadderTruckMaster" SET
        "floorName" = COALESCE($2, "floorName"),
        "minFloor" = COALESCE($3, "minFloor"),
        "maxFloor" = COALESCE($4, "maxFloor"),
        "cost1Ton" = COALESCE($5, "cost1Ton"),
        "cost2_5Ton" = COALESCE($6, "cost2_5Ton"),
        "cost5Ton" = COALESCE($7, "cost5Ton"),
        "cost6Ton" = COALESCE($8, "cost6Ton"),
        "cost7_5Ton" = COALESCE($9, "cost7_5Ton"),
        "cost10Ton" = COALESCE($10, "cost10Ton"),
        "note" = COALESCE($11, "note"),
        "order" = COALESCE($12, "order"),
        "updatedAt" = NOW()
      WHERE "id" = $1
    `, 
      id, 
      data.floorName ?? null, 
      data.minFloor ?? null, 
      data.maxFloor ?? null, 
      data.cost1Ton ?? null, 
      data.cost2_5Ton ?? null, 
      data.cost5Ton ?? null, 
      data.cost6Ton ?? null, 
      data.cost7_5Ton ?? null, 
      data.cost10Ton ?? null, 
      data.note ?? null, 
      data.order ?? null
    )

    revalidatePath('/ladders')
    return { success: true }
  } catch (error) {
    console.error('updateLadderFare error:', error)
    return { error: '운임 수정 중 오류가 발생했습니다.' }
  }
}

/**
 * 전체 사다리차 운임표 일괄 업데이트 (그리드 저장)
 */
export async function batchUpdateLadderFares(fares: LadderFareItem[]) {
  try {
    for (const item of fares) {
      await prisma.$executeRawUnsafe(`
        UPDATE "LadderTruckMaster" SET
          "floorName" = $2,
          "minFloor" = $3,
          "maxFloor" = $4,
          "cost1Ton" = $5,
          "cost2_5Ton" = $6,
          "cost5Ton" = $7,
          "cost6Ton" = $8,
          "cost7_5Ton" = $9,
          "cost10Ton" = $10,
          "note" = $11,
          "order" = $12,
          "updatedAt" = NOW()
        WHERE "id" = $1
      `, 
        item.id, 
        item.floorName, 
        item.minFloor, 
        item.maxFloor, 
        item.cost1Ton, 
        item.cost2_5Ton, 
        item.cost5Ton, 
        item.cost6Ton, 
        item.cost7_5Ton, 
        item.cost10Ton, 
        item.note || '', 
        item.order
      )
    }

    revalidatePath('/ladders')
    return { success: true }
  } catch (error) {
    console.error('batchUpdateLadderFares error:', error)
    return { error: '일괄 저장 중 오류가 발생했습니다.' }
  }
}

/**
 * 사다리차 구간 삭제
 */
export async function deleteLadderFare(id: string) {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "LadderTruckMaster" WHERE "id" = $1`, id)
    revalidatePath('/ladders')
    return { success: true }
  } catch (error) {
    console.error('deleteLadderFare error:', error)
    return { error: '삭제 중 오류가 발생했습니다.' }
  }
}

/**
 * 표준 운임표로 전체 초기화
 */
export async function resetLadderFaresToDefault() {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "LadderTruckMaster"`)
    await seedDefaultLadderFares()
    revalidatePath('/ladders')
    return { success: true }
  } catch (error) {
    console.error('resetLadderFaresToDefault error:', error)
    return { error: '초기화 중 오류가 발생했습니다.' }
  }
}

/**
 * 층수와 톤수에 따른 사다리차 운임 계산
 * @param floor 층수 (예: 5)
 * @param tonnage 톤수 문자열 또는 숫자 (예: '5톤', '2.5톤', 5)
 */
export async function calculateLadderFee(
  floor: number | string,
  tonnage: string | number
): Promise<{ cost: number; matchedTier: string | null }> {
  const floorNum = typeof floor === 'number' ? floor : parseInt(String(floor || '0'), 10)
  if (!floorNum || isNaN(floorNum) || floorNum <= 1) {
    return { cost: 0, matchedTier: null }
  }

  const fares = await getLadderFares()
  if (!fares || fares.length === 0) {
    return { cost: 0, matchedTier: null }
  }
  
  // 층수 매칭 (minFloor <= floor && floor <= maxFloor)
  const matched = fares.find(f => floorNum >= f.minFloor && floorNum <= f.maxFloor)
    || (floorNum > fares[fares.length - 1].maxFloor ? fares[fares.length - 1] : fares[0])

  if (!matched) {
    return { cost: 0, matchedTier: null }
  }

  return { cost: getCostByTonnage(matched, tonnage), matchedTier: matched.floorName || null }
}

function getCostByTonnage(tier: LadderFareItem, tonnage: string | number): number {
  if (!tier) return 0
  const tonStr = String(tonnage || '5').replace(/[^0-9.]/g, '')
  const tonVal = parseFloat(tonStr) || 5

  if (tonVal <= 1.0) return Number(tier.cost1Ton) || 0
  if (tonVal <= 2.5) return Number(tier.cost2_5Ton) || 0
  if (tonVal <= 5.0) return Number(tier.cost5Ton) || 0
  if (tonVal <= 6.0) return Number(tier.cost6Ton) || 0
  if (tonVal <= 7.5) return Number(tier.cost7_5Ton) || 0
  return Number(tier.cost10Ton) || 0
}
