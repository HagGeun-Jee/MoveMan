'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import {
  DEFAULT_SPACE_DEFINITIONS,
  buildOrderMapFromNames,
  getEffectiveSpaceItemOrders,
  insertOrUpdateItemOrderMap,
  parseItemOrders,
  syncItemOrderMapWithConnectedNames,
} from '@/lib/spaceOrderUtils'

function isBoxItemName(name?: string | null): boolean {
  const upper = (name || '').trim().toUpperCase()
  return upper === 'BOX' || upper.startsWith('BOX') || upper === '박스'
}

/**
 * 대상 위치 카테고리들의 itemOrders JSON을 현재 실제 연결된 StandardItem 목록과 정합성 있게 동기화
 */
async function reconcileCategoryItemOrders(
  categoryIds: string[],
  requestedOrdersByCatId?: Record<string, { itemName: string; order?: number | null }>
) {
  const uniqueIds = Array.from(new Set(categoryIds.filter(Boolean)))
  if (uniqueIds.length === 0) return

  for (const catId of uniqueIds) {
    const cat = await prisma.locationCategory.findUnique({
      where: { id: catId },
      include: { items: { select: { id: true, name: true } } },
    })
    if (!cat) continue

    const connectedNonBoxNames = Array.from(
      new Set(
        cat.items
          .map(it => (it.name || '').trim())
          .filter(n => Boolean(n) && !isBoxItemName(n))
      )
    )

    // 기존 itemOrders가 있으면 파싱하여 사용, 비어있으면 기본값 참조
    const rawParsed = parseItemOrders(cat.itemOrders)
    const baseMap =
      Object.keys(rawParsed).length > 0 ? rawParsed : getEffectiveSpaceItemOrders(cat)

    const req = requestedOrdersByCatId?.[catId]
    let nextMap: Record<string, number>

    if (req && req.itemName && connectedNonBoxNames.includes(req.itemName.trim())) {
      nextMap = insertOrUpdateItemOrderMap(
        baseMap,
        connectedNonBoxNames,
        req.itemName.trim(),
        req.order
      )
    } else {
      nextMap = syncItemOrderMapWithConnectedNames(baseMap, connectedNonBoxNames)
    }

    const nextJson = JSON.stringify(nextMap)
    if (cat.itemOrders !== nextJson) {
      await prisma.locationCategory.update({
        where: { id: catId },
        data: { itemOrders: nextJson },
      })
    }
  }
}

/**
 * 전체 위치 카테고리의 order 값을 1..N 연속 정수로 정규화
 */
async function normalizeAllCategoryOrders() {
  const allCats = await prisma.locationCategory.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })
  for (let i = 0; i < allCats.length; i++) {
    const targetOrder = i + 1
    if (allCats[i].order !== targetOrder) {
      await prisma.locationCategory.update({
        where: { id: allCats[i].id },
        data: { order: targetOrder },
      })
    }
  }
}

export async function createStandardItem(formData: FormData) {
  const name = ((formData.get('name') as string) || '').trim()
  const spec = ((formData.get('spec') as string) || '').trim()
  const defaultCbm = parseFloat(formData.get('defaultCbm') as string)
  const defaultInnerCbm = parseFloat(formData.get('defaultInnerCbm') as string)
  const locationCategoryIds = (formData.getAll('locationCategoryIds') as string[]).filter(Boolean)
  const locationItemOrdersRaw = (formData.get('locationItemOrders') as string) || '{}'
  const syncSameNameLocations = formData.get('syncSameNameLocations') === 'true'

  if (!name) return { error: '물품명을 입력해주세요.' }

  let parsedOrders: Record<string, number> = {}
  try {
    parsedOrders = JSON.parse(locationItemOrdersRaw) || {}
  } catch {
    parsedOrders = {}
  }

  try {
    const affectedCatIds = new Set<string>(locationCategoryIds)

    await prisma.standardItem.create({
      data: {
        name,
        spec,
        defaultCbm: isNaN(defaultCbm) ? 0 : defaultCbm,
        defaultInnerCbm: isNaN(defaultInnerCbm) ? 0 : defaultInnerCbm,
        locations: {
          connect: locationCategoryIds.map(id => ({ id })),
        },
      },
    })

    if (syncSameNameLocations) {
      const siblings = await prisma.standardItem.findMany({
        where: { name },
        include: { locations: { select: { id: true } } },
      })
      for (const sib of siblings) {
        sib.locations.forEach(l => affectedCatIds.add(l.id))
        await prisma.standardItem.update({
          where: { id: sib.id },
          data: {
            locations: {
              set: locationCategoryIds.map(id => ({ id })),
            },
          },
        })
      }
    }

    const reqMap: Record<string, { itemName: string; order?: number | null }> = {}
    locationCategoryIds.forEach(catId => {
      reqMap[catId] = {
        itemName: name,
        order: parsedOrders[catId] ? Number(parsedOrders[catId]) : null,
      }
    })

    await reconcileCategoryItemOrders(Array.from(affectedCatIds), reqMap)

    revalidatePath('/items')
    revalidatePath('/estimates/new')
    return { success: true }
  } catch (error) {
    return { error: '물품 등록 중 오류가 발생했습니다. 품목명과 규격 조합이 이미 존재할 수 있습니다.' }
  }
}

export async function deleteStandardItem(id: string) {
  try {
    const existing = await prisma.standardItem.findUnique({
      where: { id },
      include: { locations: { select: { id: true } } },
    })
    const prevCatIds = existing ? existing.locations.map(l => l.id) : []

    await prisma.standardItem.delete({
      where: { id },
    })

    if (prevCatIds.length > 0) {
      await reconcileCategoryItemOrders(prevCatIds)
    }

    revalidatePath('/items')
    revalidatePath('/estimates/new')
    return { success: true }
  } catch (error) {
    return { error: '삭제 중 오류가 발생했습니다.' }
  }
}

export async function updateStandardItem(id: string, formData: FormData) {
  const name = ((formData.get('name') as string) || '').trim()
  const spec = ((formData.get('spec') as string) || '').trim()
  const defaultCbm = parseFloat(formData.get('defaultCbm') as string)
  const defaultInnerCbm = parseFloat(formData.get('defaultInnerCbm') as string)
  const locationCategoryIds = (formData.getAll('locationCategoryIds') as string[]).filter(Boolean)
  const locationItemOrdersRaw = (formData.get('locationItemOrders') as string) || '{}'
  const syncSameNameLocations = formData.get('syncSameNameLocations') === 'true'

  if (!name) return { error: '물품명을 입력해주세요.' }

  let parsedOrders: Record<string, number> = {}
  try {
    parsedOrders = JSON.parse(locationItemOrdersRaw) || {}
  } catch {
    parsedOrders = {}
  }

  try {
    const prevItem = await prisma.standardItem.findUnique({
      where: { id },
      include: { locations: { select: { id: true } } },
    })
    const affectedCatIds = new Set<string>(locationCategoryIds)
    prevItem?.locations.forEach(l => affectedCatIds.add(l.id))

    await prisma.standardItem.update({
      where: { id },
      data: {
        name,
        spec,
        defaultCbm: isNaN(defaultCbm) ? 0 : defaultCbm,
        defaultInnerCbm: isNaN(defaultInnerCbm) ? 0 : defaultInnerCbm,
        locations: {
          set: [],
          connect: locationCategoryIds.map(locId => ({ id: locId })),
        },
      },
    })

    if (syncSameNameLocations) {
      const siblings = await prisma.standardItem.findMany({
        where: { name, id: { not: id } },
        include: { locations: { select: { id: true } } },
      })
      for (const sib of siblings) {
        sib.locations.forEach(l => affectedCatIds.add(l.id))
        await prisma.standardItem.update({
          where: { id: sib.id },
          data: {
            locations: {
              set: locationCategoryIds.map(locId => ({ id: locId })),
            },
          },
        })
      }
    }

    const reqMap: Record<string, { itemName: string; order?: number | null }> = {}
    locationCategoryIds.forEach(catId => {
      reqMap[catId] = {
        itemName: name,
        order: parsedOrders[catId] ? Number(parsedOrders[catId]) : null,
      }
    })

    await reconcileCategoryItemOrders(Array.from(affectedCatIds), reqMap)

    revalidatePath('/items')
    revalidatePath('/estimates/new')
    return { success: true }
  } catch (error) {
    return { error: '수정 중 오류가 발생했습니다. 품목명과 규격 조합이 중복되었을 수 있습니다.' }
  }
}

let isLocationAndStandLampSeededV9 = false

export async function ensureStandLampItems() {
  if (isLocationAndStandLampSeededV9) return
  try {
    // 0. 신규 컬럼(isDefault, itemOrders) 자동 보장 (무중단 배포 DDL 호환)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "LocationCategory"
      ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT true;
    `)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "LocationCategory"
      ADD COLUMN IF NOT EXISTS "itemOrders" TEXT NOT NULL DEFAULT '{}';
    `)

    const existingLocations = await prisma.locationCategory.findMany({
      include: { items: { select: { id: true, name: true } } },
      orderBy: { order: 'asc' },
    })

    // 이미 공간별 초기 물품 순서값이 세팅된 적 있는지 확인 (사용자 커스텀 영구 보존)
    const hasInitializedSpaceOrders = existingLocations.some(
      loc => Boolean(loc.itemOrders) && loc.itemOrders.trim() !== '' && loc.itemOrders.trim() !== '{}'
    )

    if (!hasInitializedSpaceOrders) {
      // [최초 1회 초기화] 비표준/중복 품목 정리 및 구 방 명칭 전환
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
        where: { name: { in: duplicateItemNames } },
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
            spec: { in: group.specs },
          },
        })
      }

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
              data: { name: to },
            })
          }
        }
      }

      // 기본 12개 공간 생성 보장
      for (const def of DEFAULT_SPACE_DEFINITIONS) {
        const found = await prisma.locationCategory.findUnique({ where: { name: def.name } })
        if (!found) {
          await prisma.locationCategory.create({
            data: {
              name: def.name,
              order: def.order,
              isDefault: def.isDefault,
              itemOrders: JSON.stringify(buildOrderMapFromNames(def.initialItems)),
            },
          })
        }
      }

      // 전체 표준 품목 및 위치 재조회 후 현재 공간별 초기 물품 및 순서값(1..N) 세팅
      const allStandardItems = await prisma.standardItem.findMany({
        select: { id: true, name: true },
      })
      const currentLocations = await prisma.locationCategory.findMany({
        include: { items: { select: { id: true, name: true } } },
        orderBy: { order: 'asc' },
      })

      let extraOrder = DEFAULT_SPACE_DEFINITIONS.length + 1
      for (const loc of currentLocations) {
        const def = DEFAULT_SPACE_DEFINITIONS.find(d => d.name === loc.name)
        if (def) {
          const targetNameSet = new Set(def.initialItems)
          const preservedBoxIds = loc.items
            .filter(it => isBoxItemName(it.name))
            .map(it => it.id)
          const matchedStdIds = allStandardItems
            .filter(it => targetNameSet.has(it.name))
            .map(it => it.id)
          const mergedIds = Array.from(new Set([...matchedStdIds, ...preservedBoxIds]))
          const orderMap = buildOrderMapFromNames(def.initialItems)

          await prisma.locationCategory.update({
            where: { id: loc.id },
            data: {
              order: def.order,
              isDefault: def.isDefault,
              itemOrders: JSON.stringify(orderMap),
              items: {
                set: mergedIds.map(id => ({ id })),
              },
            },
          })
        } else {
          // 사용자 추가 공간인 경우 기존 연결 물품의 가나다순으로 초기 순서 부여
          const connectedNames = Array.from(
            new Set(
              loc.items
                .map(it => (it.name || '').trim())
                .filter(n => Boolean(n) && !isBoxItemName(n))
            )
          ).sort((a, b) => a.localeCompare(b, 'ko'))

          await prisma.locationCategory.update({
            where: { id: loc.id },
            data: {
              order: extraOrder++,
              isDefault: false,
              itemOrders: JSON.stringify(buildOrderMapFromNames(connectedNames)),
            },
          })
        }
      }

      // 기존 견적서(Estimate.cbmItems) 내 구 방 명칭 자동 마이그레이션
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
    }

    isLocationAndStandLampSeededV9 = true
  } catch (err) {
    console.warn('ensureStandLampItems warning:', err)
  }
}

export async function getStandardItems() {
  await ensureStandLampItems()
  return await prisma.standardItem.findMany({
    include: {
      locations: {
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      },
    },
    orderBy: [{ name: 'asc' }, { spec: 'asc' }],
  })
}

export async function getLocationCategories() {
  await ensureStandLampItems()
  return await prisma.locationCategory.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function createLocationCategory(formData: FormData) {
  const name = ((formData.get('name') as string) || '').trim()
  const rawOrder = formData.get('order')
  const isDefault = formData.get('isDefault') !== 'false'

  if (!name) return { error: '위치 카테고리명을 입력해주세요.' }

  try {
    const dup = await prisma.locationCategory.findUnique({ where: { name } })
    if (dup) {
      return { error: `'${name}' 위치 카테고리가 이미 존재합니다.` }
    }

    const allCats = await prisma.locationCategory.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })

    let targetOrder = allCats.length + 1
    if (rawOrder !== null && rawOrder !== '' && !isNaN(Number(rawOrder))) {
      targetOrder = Math.max(1, Math.min(allCats.length + 1, Math.floor(Number(rawOrder))))
    }

    const created = await prisma.locationCategory.create({
      data: {
        name,
        order: targetOrder,
        isDefault,
        itemOrders: '{}',
      },
    })

    // 삽입 위치 기준으로 전체 1..N 재정렬
    const reordered = [...allCats]
    reordered.splice(targetOrder - 1, 0, created)
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].order !== i + 1) {
        await prisma.locationCategory.update({
          where: { id: reordered[i].id },
          data: { order: i + 1 },
        })
      }
    }

    revalidatePath('/items')
    revalidatePath('/estimates/new')
    return { success: true, category: created }
  } catch (error) {
    return { error: '위치 카테고리 등록 중 오류가 발생했습니다.' }
  }
}

export async function updateLocationCategoriesBulk(
  updates: Array<{
    id: string
    name: string
    order: number
    isDefault: boolean
  }>
) {
  if (!Array.isArray(updates) || updates.length === 0) {
    return { success: true }
  }

  const trimmedNames = updates.map(u => (u.name || '').trim())
  if (trimmedNames.some(n => !n)) {
    return { error: '위치 카테고리명은 비워둘 수 없습니다.' }
  }
  const uniqueNames = new Set(trimmedNames)
  if (uniqueNames.size !== trimmedNames.length) {
    return { error: '중복된 위치 카테고리명이 있습니다. 서로 다른 이름을 입력해주세요.' }
  }

  try {
    // 사용자가 지정한 order 오름차순으로 정렬 후 1..N 정규화
    const sorted = updates
      .map((u, idx) => ({
        ...u,
        name: u.name.trim(),
        order: !isNaN(Number(u.order)) && Number(u.order) > 0 ? Math.floor(Number(u.order)) : idx + 1,
        _idx: idx,
      }))
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order
        return a._idx - b._idx
      })

    // 이름 스왑 시 unique 제약 충돌 방지를 위해 이름이 변경된 항목은 임시 이름을 거친 후 반영
    const existingCats = await prisma.locationCategory.findMany({
      select: { id: true, name: true },
    })
    const existingMap = new Map(existingCats.map(c => [c.id, c.name]))
    const renamedItems = sorted.filter(u => existingMap.get(u.id) !== u.name)

    for (const item of renamedItems) {
      await prisma.locationCategory.update({
        where: { id: item.id },
        data: { name: `__TMP_${item.id}_${Date.now()}` },
      })
    }

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i]
      await prisma.locationCategory.update({
        where: { id: item.id },
        data: {
          name: item.name,
          order: i + 1,
          isDefault: Boolean(item.isDefault),
        },
      })
    }

    revalidatePath('/items')
    revalidatePath('/estimates/new')
    return { success: true }
  } catch (error) {
    return { error: '위치 카테고리 순서 및 설정 저장 중 오류가 발생했습니다.' }
  }
}

export async function deleteLocationCategory(id: string) {
  try {
    await prisma.locationCategory.delete({
      where: { id },
    })
    await normalizeAllCategoryOrders()
    revalidatePath('/items')
    revalidatePath('/estimates/new')
    return { success: true }
  } catch (error) {
    return { error: '위치 카테고리 삭제 중 오류가 발생했습니다.' }
  }
}

/**
 * 특정 공간(및 선택 시 추가 공간들)의 연결 물품 목록과 물품 디스플레이 순서(1..N)를 일괄 저장
 */
export async function updateSpaceItemOrders(params: {
  categoryId: string
  orderedItemNames: string[]
  alsoApplyToCategoryIds?: string[]
}) {
  const { categoryId, orderedItemNames, alsoApplyToCategoryIds = [] } = params
  if (!categoryId) return { error: '대상 위치를 선택해주세요.' }

  try {
    const cleanOrderedNames = Array.from(
      new Set((orderedItemNames || []).map(n => (n || '').trim()).filter(n => Boolean(n) && !isBoxItemName(n)))
    )
    const orderMap = buildOrderMapFromNames(cleanOrderedNames)
    const targetNameSet = new Set(cleanOrderedNames)

    const allStandardItems = await prisma.standardItem.findMany({
      select: { id: true, name: true },
    })
    const matchedStdIds = allStandardItems
      .filter(it => targetNameSet.has((it.name || '').trim()))
      .map(it => it.id)

    const targetCategoryIds = Array.from(
      new Set([categoryId, ...alsoApplyToCategoryIds].filter(Boolean))
    )

    for (const catId of targetCategoryIds) {
      const cat = await prisma.locationCategory.findUnique({
        where: { id: catId },
        include: { items: { select: { id: true, name: true } } },
      })
      if (!cat) continue

      const preservedBoxIds = cat.items
        .filter(it => isBoxItemName(it.name))
        .map(it => it.id)
      const nextIds = Array.from(new Set([...matchedStdIds, ...preservedBoxIds]))

      await prisma.locationCategory.update({
        where: { id: catId },
        data: {
          itemOrders: JSON.stringify(orderMap),
          items: {
            set: nextIds.map(id => ({ id })),
          },
        },
      })
    }

    revalidatePath('/items')
    revalidatePath('/estimates/new')
    return { success: true }
  } catch (error) {
    return { error: '공간별 물품 순서 저장 중 오류가 발생했습니다.' }
  }
}
