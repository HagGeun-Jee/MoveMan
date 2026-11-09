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

let isLocationAndStandLampSeededV3 = false

export async function ensureStandLampItems() {
  if (isLocationAndStandLampSeededV3) return
  try {
    // 1. 현장 친화적 방 명칭 전환 (방1->입구방, 방2->작은방1, 방3->작은방2)
    const roomRenameMap: Array<{ from: string; to: string }> = [
      { from: '방1', to: '입구방' },
      { from: '방2', to: '작은방1' },
      { from: '방3', to: '작은방2' },
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

    // 2. '드레스룸/서재'(또는 '방4')의 등록 물품을 '드레스룸'으로 이전 (중복 시 스킵) 후 '서재'로 명칭 변경
    const sourceDressStudyCat =
      (await prisma.locationCategory.findUnique({
        where: { name: '드레스룸/서재' },
        include: { items: true }
      })) ||
      (await prisma.locationCategory.findUnique({
        where: { name: '방4' },
        include: { items: true }
      }))

    let dressroomCat = await prisma.locationCategory.findUnique({
      where: { name: '드레스룸' },
      include: { items: true }
    })

    if (!dressroomCat) {
      dressroomCat = await prisma.locationCategory.create({
        data: { name: '드레스룸', order: 7 },
        include: { items: true }
      })
    }

    if (sourceDressStudyCat) {
      const existingDressroomItemIds = new Set(dressroomCat.items.map(i => i.id))
      const itemsToCopyToDressroom = sourceDressStudyCat.items.filter(
        i => !existingDressroomItemIds.has(i.id)
      )

      if (itemsToCopyToDressroom.length > 0) {
        await prisma.locationCategory.update({
          where: { id: dressroomCat.id },
          data: {
            items: {
              connect: itemsToCopyToDressroom.map(i => ({ id: i.id }))
            }
          }
        })
      }

      // 이후 '드레스룸/서재'(또는 '방4')를 '서재'로 수정
      const existingStudyCat = await prisma.locationCategory.findUnique({
        where: { name: '서재' },
        include: { items: true }
      })

      if (!existingStudyCat) {
        await prisma.locationCategory.update({
          where: { id: sourceDressStudyCat.id },
          data: { name: '서재' }
        })
      } else if (existingStudyCat.id !== sourceDressStudyCat.id) {
        // 만약 '서재'가 이미 별도로 존재한다면 물품 병합 후 중복 '드레스룸/서재' 삭제
        const existingStudyItemIds = new Set(existingStudyCat.items.map(i => i.id))
        const itemsToMergeToStudy = sourceDressStudyCat.items.filter(
          i => !existingStudyItemIds.has(i.id)
        )
        if (itemsToMergeToStudy.length > 0) {
          await prisma.locationCategory.update({
            where: { id: existingStudyCat.id },
            data: {
              items: {
                connect: itemsToMergeToStudy.map(i => ({ id: i.id }))
              }
            }
          })
        }
        await prisma.locationCategory.delete({
          where: { id: sourceDressStudyCat.id }
        })
      }
    }

    // 3. 스탠드등 5종 등록 및 공간 연결
    const allLocationsAfterRename = await prisma.locationCategory.findMany()
    const lampTargetLocNames = ['거실', '안방', '입구방', '작은방1', '작은방2', '드레스룸', '서재']
    const lampMatchedLocs = allLocationsAfterRename.filter(loc =>
      lampTargetLocNames.includes(loc.name)
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
            set: lampMatchedLocs.map(l => ({ id: l.id }))
          }
        },
        create: {
          name: lamp.name,
          spec: lamp.spec,
          defaultCbm: lamp.defaultCbm,
          defaultInnerCbm: lamp.defaultInnerCbm,
          locations: {
            connect: lampMatchedLocs.map(l => ({ id: l.id }))
          }
        }
      })
    }

    // 4. '서재' 및 '드레스룸'에 연결 가능한 표준 물품 자동 연결 (중복 시 스킵)
    const studyCat = await prisma.locationCategory.findUnique({
      where: { name: '서재' },
      include: { items: true }
    })
    const refreshedDressroomCat = await prisma.locationCategory.findUnique({
      where: { name: '드레스룸' },
      include: { items: true }
    })
    const allStandardItems = await prisma.standardItem.findMany()

    if (studyCat) {
      // 서재에 적합한 물품 키워드 (책상, 책장, 의자, 서랍장, 장식장, 스탠드등, 소파, 컴퓨터/가전, 피아노 등)
      const studyKeywords = [
        '책상', '책장', '책꽂이', '의자', '스탠드등', '서랍장', '장식장', '진열장', '수납장',
        '선반', '앵글', '컴퓨터', 'PC', '모니터', '프린터', '복합기', '소파', '쇼파',
        '공기청정기', '에어컨', '안마의자', '안마', '피아노', '침대', 'TV', '금고', '테이블', '협탁'
      ]
      const existingStudyIds = new Set(studyCat.items.map(i => i.id))
      const studyConnectItems = allStandardItems.filter(
        item =>
          !existingStudyIds.has(item.id) &&
          studyKeywords.some(kw => item.name.toLowerCase().includes(kw.toLowerCase()))
      )
      if (studyConnectItems.length > 0) {
        await prisma.locationCategory.update({
          where: { id: studyCat.id },
          data: {
            items: {
              connect: studyConnectItems.map(i => ({ id: i.id }))
            }
          }
        })
      }
    }

    if (refreshedDressroomCat) {
      // 드레스룸에 적합한 물품 키워드 (장농, 옷장, 행거, 서랍장, 화장대, 스타일러, 거울, 선반, 앵글 등)
      const dressroomKeywords = [
        '장농', '장롱', '옷장', '행거', '시스템', '서랍장', '화장대', '스타일러', '에어드레서',
        '거울', '수납장', '선반', '앵글', '스탠드등', '공기청정기', '제습기'
      ]
      const existingDressIds = new Set(refreshedDressroomCat.items.map(i => i.id))
      const dressConnectItems = allStandardItems.filter(
        item =>
          !existingDressIds.has(item.id) &&
          dressroomKeywords.some(kw => item.name.toLowerCase().includes(kw.toLowerCase()))
      )
      if (dressConnectItems.length > 0) {
        await prisma.locationCategory.update({
          where: { id: refreshedDressroomCat.id },
          data: {
            items: {
              connect: dressConnectItems.map(i => ({ id: i.id }))
            }
          }
        })
      }
    }

    // 4-2. '청소기' 품목에 '주방' 및 '베란다' 공간 연결 보장 + '수납선반 2단(60)' 베란다 연결 보장
    const kitchenVerandaLocs = allLocationsAfterRename.filter(loc =>
      ['거실', '주방', '베란다'].includes(loc.name)
    )
    if (kitchenVerandaLocs.length > 0) {
      const vacuumItems = allStandardItems.filter(item => item.name === '청소기')
      for (const vItem of vacuumItems) {
        await prisma.standardItem.update({
          where: { id: vItem.id },
          data: {
            locations: {
              connect: kitchenVerandaLocs.map(l => ({ id: l.id }))
            }
          }
        })
      }
    }

    const shelfTargetLocs = allLocationsAfterRename.filter(loc =>
      ['베란다', '팬트리', '주방', '드레스룸', '서재'].includes(loc.name)
    )
    if (shelfTargetLocs.length > 0) {
      const existingShelf = allStandardItems.find(
        item => item.name === '수납선반' && item.spec === '2단(60)'
      )
      if (existingShelf) {
        await prisma.standardItem.update({
          where: { id: existingShelf.id },
          data: {
            locations: {
              connect: shelfTargetLocs.map(l => ({ id: l.id }))
            }
          }
        })
      } else {
        await prisma.standardItem.create({
          data: {
            name: '수납선반',
            spec: '2단(60)',
            defaultCbm: 0.2,
            defaultInnerCbm: 0.1,
            locations: {
              connect: shelfTargetLocs.map(l => ({ id: l.id }))
            }
          }
        })
      }
    }

    // 5. 작업 동선 기준 공간 정렬 순서(order) 일괄 보정
    const preferredOrder = [
      '안방',
      '거실',
      '주방',
      '입구방',
      '작은방1',
      '작은방2',
      '드레스룸',
      '서재',
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

    // 6. 기존 견적서(Estimate.cbmItems) 내 구 방 명칭('방1'~'방4', '드레스룸/서재') 자동 마이그레이션
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

    isLocationAndStandLampSeededV3 = true
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
