export interface DefaultSpaceDefinition {
  name: string
  order: number
  isDefault: boolean
  initialItems: string[]
}

export const LEGACY_SPACE_NAME_MAP: Record<string, string> = {
  방1: '입구방',
  방2: '작은방1',
  방3: '작은방2',
  방4: '서재',
  '드레스룸/서재': '서재',
  입구장: '입구방',
  현관: '신발장',
}

export function normalizeSpaceName(name?: string | null): string {
  if (!name) return ''
  const trimmed = name.trim()
  return LEGACY_SPACE_NAME_MAP[trimmed] || trimmed
}

const BEDROOM_INITIAL_ITEMS = [
  '장농',
  '침대',
  '화장대',
  '서랍장',
  '책상',
  '의자',
  '책장',
  'TV',
  'TV장',
  '행거',
  '붙박이장',
  '에어컨',
]

export const DEFAULT_SPACE_DEFINITIONS: DefaultSpaceDefinition[] = [
  { name: '안방', order: 1, isDefault: true, initialItems: BEDROOM_INITIAL_ITEMS },
  { name: '입구방', order: 2, isDefault: true, initialItems: BEDROOM_INITIAL_ITEMS },
  { name: '작은방1', order: 3, isDefault: true, initialItems: BEDROOM_INITIAL_ITEMS },
  { name: '작은방2', order: 4, isDefault: true, initialItems: BEDROOM_INITIAL_ITEMS },
  {
    name: '거실',
    order: 5,
    isDefault: true,
    initialItems: [
      'TV',
      'TV장',
      '소파',
      '소파 테이블',
      '장식장',
      '수납장/교구장',
      '책상',
      '의자',
      '책장',
      '앵글',
      '화장대',
      '에어컨',
      '리빙박스',
      '운동기구',
      '스타일러',
      '안마의자',
      '피아노',
    ],
  },
  {
    name: '주방',
    order: 6,
    isDefault: true,
    initialItems: [
      '냉장고',
      '김치냉장고',
      '식탁',
      '의자',
      '수납장/교구장',
      '식기세척기',
      '앵글',
      '주방가전',
      '싱크대살림',
    ],
  },
  {
    name: '베란다',
    order: 7,
    isDefault: true,
    initialItems: [
      '냉장고',
      '김치냉장고',
      '건조기',
      '세탁기',
      '화분',
      '항아리',
      '앵글',
      '캠핑/생활기타',
      '자전거',
    ],
  },
  {
    name: '팬트리',
    order: 8,
    isDefault: true,
    initialItems: ['팬트리선반', '캠핑/생활기타', '계절가전', '청소기'],
  },
  {
    name: '신발장',
    order: 9,
    isDefault: true,
    initialItems: ['신발장', '유모차', '자전거', '운동기구', '앵글'],
  },
  {
    name: '화장실',
    order: 10,
    isDefault: true,
    initialItems: ['욕실용품', '수납장/교구장'],
  },
  {
    name: '드레스룸',
    order: 11,
    isDefault: false,
    initialItems: ['장농', '행거', '붙박이장', '서랍장', '화장대', '전신거울', '스타일러', '에어컨'],
  },
  {
    name: '서재',
    order: 12,
    isDefault: false,
    initialItems: ['책상', '의자', '책장', '서랍장', '컴퓨터', '모니터', '소파', '에어컨'],
  },
]

export function buildOrderMapFromNames(names: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  let seq = 1
  names.forEach(raw => {
    const trimmed = (raw || '').trim()
    if (!trimmed) return
    if (map[trimmed] === undefined) {
      map[trimmed] = seq++
    }
  })
  return map
}

export function getDefaultItemOrderMapForSpaceName(spaceName?: string | null): Record<string, number> {
  const norm = normalizeSpaceName(spaceName)
  const found = DEFAULT_SPACE_DEFINITIONS.find(d => d.name === norm)
  if (found) {
    return buildOrderMapFromNames(found.initialItems)
  }
  if (norm.startsWith('작은방') || norm.startsWith('침실') || /^방\d*$/.test(norm)) {
    return buildOrderMapFromNames(BEDROOM_INITIAL_ITEMS)
  }
  return {}
}

export function parseItemOrders(
  raw?: string | Record<string, number> | null
): Record<string, number> {
  if (!raw) return {}
  if (typeof raw === 'object') {
    const clean: Record<string, number> = {}
    Object.entries(raw).forEach(([k, v]) => {
      const n = Number(v)
      if (k && !isNaN(n) && n > 0) clean[k] = Math.floor(n)
    })
    return clean
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed || trimmed === '{}') return {}
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const clean: Record<string, number> = {}
        Object.entries(parsed).forEach(([k, v]) => {
          const n = Number(v)
          if (k && !isNaN(n) && n > 0) clean[k] = Math.floor(n)
        })
        return clean
      }
    } catch {
      return {}
    }
  }
  return {}
}

export function getEffectiveSpaceItemOrders(
  category?: { name?: string | null; itemOrders?: string | Record<string, number> | null } | null
): Record<string, number> {
  if (!category) return {}
  const parsed = parseItemOrders(category.itemOrders)
  if (Object.keys(parsed).length > 0) {
    return parsed
  }
  return getDefaultItemOrderMapForSpaceName(category.name)
}

export function getItemOrderInSpace(
  category: { name?: string | null; itemOrders?: string | Record<string, number> | null } | null | undefined,
  itemName: string,
  fallbackOrder = 9999
): number {
  if (!category || !itemName) return fallbackOrder
  const map = getEffectiveSpaceItemOrders(category)
  const val = map[itemName.trim()]
  return typeof val === 'number' && val > 0 ? val : fallbackOrder
}

export function sortCategoriesByDisplayOrder<
  T extends { id?: string; name?: string; order?: number | null }
>(categories: T[]): T[] {
  if (!Array.isArray(categories)) return []
  return [...categories].sort((a, b) => {
    const isAUnassigned = a.id === '' || a.name === '기타/미지정'
    const isBUnassigned = b.id === '' || b.name === '기타/미지정'
    if (isAUnassigned && !isBUnassigned) return 1
    if (!isAUnassigned && isBUnassigned) return -1
    if (isAUnassigned && isBUnassigned) return 0

    const orderA = typeof a.order === 'number' && a.order > 0 ? a.order : 999
    const orderB = typeof b.order === 'number' && b.order > 0 ? b.order : 999
    if (orderA !== orderB) return orderA - orderB

    const defIdxA = DEFAULT_SPACE_DEFINITIONS.findIndex(
      d => d.name === normalizeSpaceName(a.name)
    )
    const defIdxB = DEFAULT_SPACE_DEFINITIONS.findIndex(
      d => d.name === normalizeSpaceName(b.name)
    )
    const rankA = defIdxA >= 0 ? defIdxA + 1 : 999
    const rankB = defIdxB >= 0 ? defIdxB + 1 : 999
    if (rankA !== rankB) return rankA - rankB

    return (a.name || '').localeCompare(b.name || '', 'ko')
  })
}

export function getOrderedItemNamesForSpace(
  category: { id?: string; name?: string; itemOrders?: string | Record<string, number> | null },
  standardItems: any[],
  isBoxFn: (name: string) => boolean
): string[] {
  const list = Array.isArray(standardItems) ? standardItems : []
  const orderMap = getEffectiveSpaceItemOrders(category)
  const catId = category?.id || ''

  if (catId) {
    const anyHasLocations = list.some(s => Array.isArray(s?.locations) && s.locations.length > 0)
    if (anyHasLocations) {
      const connectedNames = Array.from(
        new Set(
          list
            .filter(
              (s: any) =>
                !isBoxFn(s.name || '') &&
                Array.isArray(s.locations) &&
                s.locations.some((l: any) => l.id === catId)
            )
            .map((s: any) => String(s.name).trim())
            .filter(Boolean)
        )
      )
      return connectedNames.sort((a, b) => {
        const oa = orderMap[a] ?? 9999
        const ob = orderMap[b] ?? 9999
        if (oa !== ob) return oa - ob
        return a.localeCompare(b, 'ko')
      })
    }
  }

  // 오프라인 등 위치 매핑 배열이 비어있는 경우 itemOrders 키 순서 폴백
  const fallbackNames = Object.keys(orderMap).filter(n => !isBoxFn(n))
  return fallbackNames.sort((a, b) => (orderMap[a] ?? 9999) - (orderMap[b] ?? 9999))
}

/**
 * 특정 공간의 품목 순서 맵에 품목을 원하는 순서(targetOrder)로 삽입/갱신하고 1..N 연속 번호로 정규화
 */
export function insertOrUpdateItemOrderMap(
  currentMap: Record<string, number>,
  connectedItemNames: string[],
  targetItemName: string,
  requestedOrder?: number | null
): Record<string, number> {
  const cleanTarget = targetItemName.trim()
  const allNames = Array.from(
    new Set([...connectedItemNames.map(n => n.trim()).filter(Boolean), cleanTarget])
  )

  // 기존 순서대로 정렬 (본인 제외)
  const others = allNames
    .filter(n => n !== cleanTarget)
    .sort((a, b) => {
      const oa = currentMap[a] ?? 9999
      const ob = currentMap[b] ?? 9999
      if (oa !== ob) return oa - ob
      return a.localeCompare(b, 'ko')
    })

  let insertIndex = others.length
  if (requestedOrder !== undefined && requestedOrder !== null && !isNaN(Number(requestedOrder)) && Number(requestedOrder) > 0) {
    insertIndex = Math.max(0, Math.min(others.length, Math.floor(Number(requestedOrder)) - 1))
  } else if (currentMap[cleanTarget] && currentMap[cleanTarget] > 0) {
    insertIndex = Math.max(0, Math.min(others.length, currentMap[cleanTarget] - 1))
  }

  const nextOrdered = [...others]
  nextOrdered.splice(insertIndex, 0, cleanTarget)
  return buildOrderMapFromNames(nextOrdered)
}

/**
 * 특정 공간에서 더 이상 연결되지 않은 품목명을 순서 맵에서 제거하고 1..N 정규화
 */
export function syncItemOrderMapWithConnectedNames(
  currentMap: Record<string, number>,
  connectedItemNames: string[]
): Record<string, number> {
  const uniqueNames = Array.from(
    new Set(connectedItemNames.map(n => (n || '').trim()).filter(Boolean))
  )
  uniqueNames.sort((a, b) => {
    const oa = currentMap[a] ?? 9999
    const ob = currentMap[b] ?? 9999
    if (oa !== ob) return oa - ob
    return a.localeCompare(b, 'ko')
  })
  return buildOrderMapFromNames(uniqueNames)
}

