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

let isLocationAndStandLampSeededV8 = false

export async function ensureStandLampItems() {
  if (isLocationAndStandLampSeededV8) return
  try {
    // 0. 이전에 자동 시딩으로 추가되었던 비표준/중복 품목 및 규격 정리 (사용자 원본 물품정보 100% 보존)
    const duplicateItemNames = [
      '쇼파테이블',
      '테이블',
      '코너장',
      '콘솔',
      '정리함',
      '수납선반',
      '렌지대',
      '정수기',
      '전자레인지',
      '캠핑/생활기타(빨래건조대)',
      '캠핑/생활기타(캠핑용품)',
    ]
    await prisma.standardItem.deleteMany({
      where: { name: { in: duplicateItemNames } }
    })

    const duplicateItemSpecs: Array<{ name: string; specs: string[] }> = [
      { name: '계절가전', specs: ['선풍기/써큘레이터', '제습기/가습기', '온풍기/전기히터'] },
      { name: '식기세척기', specs: ['6인용(카운터탑)', '12~14인용(스탠드/빌트인)'] },
      { name: '자전거', specs: ['유아/아동용', '성인용(일반)', '성인용(전기자전거/MTB)'] },
      { name: '청소기', specs: ['유선(일반)', '로봇청소기(스테이션형)'] },
      { name: '캠핑/생활기타', specs: ['빨래건조대(일반 접이식)', '캠핑용품(소량/기본)', '캠핑용품(텐트/테이블세트)', '캐리어/여행가방'] },
      { name: '팬트리선반', specs: ['2단(60)', '3단', '4단', '5단(대형)'] },
      { name: '항아리', specs: ['소형', '중형', '대형'] },
      { name: '화분', specs: ['소형', '중형', '대형'] },
    ]
    for (const group of duplicateItemSpecs) {
      await prisma.standardItem.deleteMany({
        where: {
          name: group.name,
          spec: { in: group.specs }
        }
      })
    }

    // 1. 현장 친화적 방 명칭 전환 (방1->입구방, 방2->작은방1, 방3->작은방2, 현관->신발장)
    const roomRenameMap: Array<{ from: string; to: string }> = [
      { from: '방1', to: '입구방' },
      { from: '방2', to: '작은방1' },
      { from: '방3', to: '작은방2' },
      { from: '현관', to: '신발장' },
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

    // 2. 작업 동선 기준 공간 생성 보장 및 정렬 순서(order) 일괄 보정
    const preferredOrder = [
      '안방',
      '입구방',
      '작은방1',
      '작은방2',
      '거실',
      '주방',
      '베란다',
      '팬트리',
      '신발장',
      '화장실',
      '드레스룸',
      '서재',
    ]

    for (let i = 0; i < preferredOrder.length; i++) {
      const locName = preferredOrder[i]
      const existingLoc = await prisma.locationCategory.findUnique({ where: { name: locName } })
      if (!existingLoc) {
        await prisma.locationCategory.create({
          data: { name: locName, order: i + 1 }
        })
      }
    }

    const currentLocations = await prisma.locationCategory.findMany({
      include: { items: true }
    })
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

    // 3. 물품정보(StandardItem) 기준으로 각 공간별 필수 물품 연결 보장
    const allStandardItems = await prisma.standardItem.findMany()
    const spaceTargetItemsMap: Record<string, string[]> = {
      안방: ['장농', '침대', '화장대', '서랍장', '책상', '의자', '책장', 'TV', 'TV장', '행거', '붙박이장', '에어컨'],
      입구방: ['장농', '침대', '화장대', '서랍장', '책상', '의자', '책장', 'TV', 'TV장', '행거', '붙박이장', '에어컨'],
      작은방1: ['장농', '침대', '화장대', '서랍장', '책상', '의자', '책장', 'TV', 'TV장', '행거', '붙박이장', '에어컨'],
      작은방2: ['장농', '침대', '화장대', '서랍장', '책상', '의자', '책장', 'TV', 'TV장', '행거', '붙박이장', '에어컨'],
      거실: [
        'TV', 'TV장', '소파', '소파 테이블', '장식장', '수납장/교구장',
        '책상', '의자', '책장', '앵글', '화장대', '에어컨',
        '리빙박스', '운동기구', '스타일러', '안마의자', '피아노'
      ],
      주방: ['냉장고', '김치냉장고', '식탁', '의자', '수납장/교구장', '식기세척기', '앵글', '주방가전', '싱크대살림'],
      베란다: ['냉장고', '김치냉장고', '건조기', '세탁기', '화분', '항아리', '앵글', '캠핑/생활기타', '자전거'],
      팬트리: ['팬트리선반', '캠핑/생활기타', '계절가전', '청소기'],
      신발장: ['신발장', '유모차', '자전거', '운동기구', '앵글'],
      화장실: ['욕실용품', '수납장/교구장'],
      드레스룸: ['장농', '행거', '붙박이장', '서랍장', '화장대', '전신거울', '스타일러', '에어컨'],
      서재: ['책상', '의자', '책장', '서랍장', '컴퓨터', '모니터', '소파', '에어컨'],
    }

    for (const loc of currentLocations) {
      const targetNames = spaceTargetItemsMap[loc.name]
      if (!targetNames) continue
      const targetSet = new Set(targetNames)
      const existingIds = new Set(loc.items.map(i => i.id))
      const toConnect = allStandardItems.filter(
        it => targetSet.has(it.name) && !existingIds.has(it.id)
      )
      if (toConnect.length > 0) {
        await prisma.locationCategory.update({
          where: { id: loc.id },
          data: {
            items: {
              connect: toConnect.map(i => ({ id: i.id }))
            }
          }
        })
      }
    }

    // 4. 방들(안방, 입구방, 작은방1, 작은방2)의 연결 물품을 상호 동일하게 동기화
    const refreshedRoomCats = await prisma.locationCategory.findMany({
      where: { name: { in: ['안방', '입구방', '작은방1', '작은방2'] } },
      include: { items: true }
    })
    const unionRoomItemIds = new Set<string>()
    refreshedRoomCats.forEach(rc => rc.items.forEach(it => unionRoomItemIds.add(it.id)))

    for (const rc of refreshedRoomCats) {
      const existingIds = new Set(rc.items.map(i => i.id))
      const missingIds = Array.from(unionRoomItemIds).filter(id => !existingIds.has(id))
      if (missingIds.length > 0) {
        await prisma.locationCategory.update({
          where: { id: rc.id },
          data: {
            items: {
              connect: missingIds.map(id => ({ id }))
            }
          }
        })
      }
    }

    // 5. 기존 견적서(Estimate.cbmItems) 내 구 방 명칭('방1'~'방4', '드레스룸/서재') 자동 마이그레이션
    await prisma.$executeRawUnsafe(`
      UPDATE "Estimate"
      SET "cbmItems" = REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE("cbmItems", '"locationName":"방1"', '"locationName":"입구방"'),
              '"locationName":"방2"', '"locationName":"작은방1"'
            ),
            '"locationName":"방3"', '"locationName":"작은방2"'
          ),
          '"locationName":"방4"', '"locationName":"서재"'
        ),
        '"locationName":"드레스룸/서재"', '"locationName":"서재"'
      )
      WHERE "cbmItems" LIKE '%"locationName":"방%' OR "cbmItems" LIKE '%"locationName":"드레스룸/서재"%'
    `)

    isLocationAndStandLampSeededV8 = true
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
