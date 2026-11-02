'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createStandardItem(formData: FormData) {
  const name = formData.get('name') as string
  const spec = formData.get('spec') as string || ""
  const defaultCbm = parseFloat(formData.get('defaultCbm') as string)
  const defaultInnerCbm = parseFloat(formData.get('defaultInnerCbm') as string)
  const locationCategoryIds = formData.getAll('locationCategoryIds') as string[]

  if (!name) return { error: '물품명을 입력해주세요.' }

  try {
    await prisma.standardItem.create({
      data: {
        name,
        spec,
        defaultCbm: isNaN(defaultCbm) ? 0 : defaultCbm,
        defaultInnerCbm: isNaN(defaultInnerCbm) ? 0 : defaultInnerCbm,
        locations: {
          connect: locationCategoryIds.map(id => ({ id }))
        },
      }
    })
    revalidatePath('/items')
    revalidatePath('/estimates/new')
    return { success: true }
  } catch (error) {
    return { error: '물품 등록 중 오류가 발생했습니다. 이름이 중복되었을 수 있습니다.' }
  }
}

export async function deleteStandardItem(id: string) {
  try {
    await prisma.standardItem.delete({
      where: { id }
    })
    revalidatePath('/items')
    revalidatePath('/estimates/new')
    return { success: true }
  } catch (error) {
    return { error: '삭제 중 오류가 발생했습니다.' }
  }
}

export async function updateStandardItem(id: string, formData: FormData) {
  const name = formData.get('name') as string
  const spec = formData.get('spec') as string || ""
  const defaultCbm = parseFloat(formData.get('defaultCbm') as string)
  const defaultInnerCbm = parseFloat(formData.get('defaultInnerCbm') as string)
  const locationCategoryIds = formData.getAll('locationCategoryIds') as string[]

  if (!name) return { error: '물품명을 입력해주세요.' }

  try {
    await prisma.standardItem.update({
      where: { id },
      data: {
        name,
        spec,
        defaultCbm: isNaN(defaultCbm) ? 0 : defaultCbm,
        defaultInnerCbm: isNaN(defaultInnerCbm) ? 0 : defaultInnerCbm,
        locations: {
          set: [],
          connect: locationCategoryIds.map(locId => ({ id: locId }))
        },
      }
    })
    revalidatePath('/items')
    revalidatePath('/estimates/new')
    return { success: true }
  } catch (error) {
    return { error: '수정 중 오류가 발생했습니다. 이름이 중복되었을 수 있습니다.' }
  }
}

let isLocationAndStandLampSeededV2 = false

export async function ensureStandLampItems() {
  if (isLocationAndStandLampSeededV2) return
  try {
    // 1. 현장 친화적 방 명칭 전환 (기존 LocationCategory ID 및 연결 물품 100% 유지)
    const roomRenameMap: Array<{ from: string; to: string }> = [
      { from: '방1', to: '입구방' },
      { from: '방2', to: '작은방1' },
      { from: '방3', to: '작은방2' },
      { from: '방4', to: '드레스룸/서재' },
    ]

    for (const { from, to } of roomRenameMap) {
      const oldCat = await prisma.locationCategory.findUnique({ where: { name: from } })
      if (oldCat) {
        const existingTarget = await prisma.locationCategory.findUnique({ where: { name: to } })
        if (!existingTarget) {
          await prisma.locationCategory.update({
            where: { id: oldCat.id },
            data: { name: to }
          })
        }
      }
    }

    // 2. 작업 동선 기준 공간 정렬 순서(order) 일괄 보정
    const preferredOrder = [
      '안방',
      '거실',
      '주방',
      '입구방',
      '작은방1',
      '작은방2',
      '드레스룸/서재',
      '베란다',
      '팬트리',
      '화장실',
    ]
    const currentLocations = await prisma.locationCategory.findMany()
    for (const loc of currentLocations) {
      const idx = preferredOrder.indexOf(loc.name)
      const targetOrder = idx >= 0 ? idx + 1 : 99
      if (loc.order !== targetOrder) {
        await prisma.locationCategory.update({
          where: { id: loc.id },
          data: { order: targetOrder }
        })
      }
    }

    // 3. 기존 견적서(Estimate.cbmItems) 내 구 방 명칭('방1'~'방4') 자동 마이그레이션
    await prisma.$executeRawUnsafe(`
      UPDATE "Estimate"
      SET "cbmItems" = REPLACE(
        REPLACE(
          REPLACE(
            REPLACE("cbmItems", '"locationName":"방1"', '"locationName":"입구방"'),
            '"locationName":"방2"', '"locationName":"작은방1"'
          ),
          '"locationName":"방3"', '"locationName":"작은방2"'
        ),
        '"locationName":"방4"', '"locationName":"드레스룸/서재"'
      )
      WHERE "cbmItems" LIKE '%"locationName":"방%'
    `)

    // 4. 스탠드등 5종 등록 및 실제 시스템 위치(거실, 안방, 입구방, 작은방1, 작은방2, 드레스룸/서재) 연결
    const allLocations = await prisma.locationCategory.findMany()
    const targetLocNames = ['거실', '안방', '입구방', '작은방1', '작은방2', '드레스룸/서재']
    const matchedLocs = allLocations.filter(loc =>
      targetLocNames.includes(loc.name)
    )

    const standLamps = [
      { name: '스탠드등', spec: '단스탠드(소형/협탁용)', defaultCbm: 0.1, defaultInnerCbm: 0 },
      { name: '스탠드등', spec: '책상스탠드(자바라/LED)', defaultCbm: 0.1, defaultInnerCbm: 0 },
      { name: '스탠드등', spec: '장스탠드(일반 일자형)', defaultCbm: 0.3, defaultInnerCbm: 0 },
      { name: '스탠드등', spec: '장스탠드(선반형/다구형)', defaultCbm: 0.4, defaultInnerCbm: 0 },
      { name: '스탠드등', spec: '장스탠드(아치형/대형)', defaultCbm: 0.5, defaultInnerCbm: 0 },
    ]

    for (const lamp of standLamps) {
      await prisma.standardItem.upsert({
        where: {
          name_spec: {
            name: lamp.name,
            spec: lamp.spec,
          }
        },
        update: {
          defaultCbm: lamp.defaultCbm,
          defaultInnerCbm: lamp.defaultInnerCbm,
          locations: {
            set: matchedLocs.map(l => ({ id: l.id }))
          }
        },
        create: {
          name: lamp.name,
          spec: lamp.spec,
          defaultCbm: lamp.defaultCbm,
          defaultInnerCbm: lamp.defaultInnerCbm,
          locations: {
            connect: matchedLocs.map(l => ({ id: l.id }))
          }
        }
      })
    }
    isLocationAndStandLampSeededV2 = true
  } catch (err) {
    console.warn('ensureStandLampItems warning:', err)
  }
}

export async function getStandardItems() {
  await ensureStandLampItems()
  return await prisma.standardItem.findMany({
    include: { locations: true },
    orderBy: [
      { name: 'asc' },
      { spec: 'asc' }
    ]
  })
}

export async function getLocationCategories() {
  await ensureStandLampItems()
  return await prisma.locationCategory.findMany({
    orderBy: { order: 'asc' }
  })
}

export async function createLocationCategory(formData: FormData) {
  const name = formData.get('name') as string
  if (!name) return { error: '카테고리명을 입력해주세요.' }
  
  try {
    await prisma.locationCategory.create({
      data: { name }
    })
    revalidatePath('/items')
    return { success: true }
  } catch (error) {
    return { error: '카테고리 등록 중 오류가 발생했습니다.' }
  }
}

export async function deleteLocationCategory(id: string) {
  try {
    await prisma.locationCategory.delete({
      where: { id }
    })
    revalidatePath('/items')
    return { success: true }
  } catch (error) {
    return { error: '삭제 중 오류가 발생했습니다.' }
  }
}
