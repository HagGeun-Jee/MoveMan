import 'server-only'
import prisma from '@/lib/prisma'
import { SMALL_ITEMS, type SmallItem } from './catalog'

export const SMALL_CATALOG_KEY = 'small_move_catalog'

// DB SystemKeyValue에 저장된 커스텀 카탈로그와 StandardItem CBM을 동기화하여 반환한다.
export async function getAllSyncedSmallItems(): Promise<{
  items: SmallItem[]
  isCustomized: boolean
}> {
  let baseList: SmallItem[] = SMALL_ITEMS
  let isCustomized = false

  try {
    const kv = await prisma.systemKeyValue.findUnique({
      where: { key: SMALL_CATALOG_KEY },
    })
    if (kv?.value) {
      const parsed = JSON.parse(kv.value)
      if (Array.isArray(parsed) && parsed.length > 0) {
        baseList = parsed
        isCustomized = true
      }
    }
  } catch {
    baseList = SMALL_ITEMS
  }

  try {
    const stds = await prisma.standardItem.findMany({
      select: { name: true, spec: true, defaultCbm: true, defaultInnerCbm: true },
    })
    const stdMap = new Map<string, { cbm: number; innerCbm: number }>()
    for (const s of stds) {
      stdMap.set(`${s.name}__${s.spec}`, { cbm: s.defaultCbm, innerCbm: s.defaultInnerCbm || 0 })
    }
    const items = baseList.map((item) => {
      if (!item.stdName) return item
      const synced = stdMap.get(`${item.stdName}__${item.stdSpec || ''}`)
      return synced !== undefined ? { ...item, cbm: synced.cbm, innerCbm: synced.innerCbm } : item
    })
    return { items, isCustomized }
  } catch {
    return { items: baseList, isCustomized }
  }
}

// 고객 접수·전화견적 빠른 선택용 (숨김 항목 제외)
export async function getSyncedSmallItems(): Promise<SmallItem[]> {
  const { items } = await getAllSyncedSmallItems()
  return items.filter((i) => !i.hidden)
}

// 견적 계산·상세 해석용 (과거 접수 호환을 위해 숨김 항목 포함)
export async function getSyncedSmallItemMap(): Promise<Record<string, SmallItem>> {
  const { items } = await getAllSyncedSmallItems()
  const merged: Record<string, SmallItem> = {}
  for (const d of SMALL_ITEMS) merged[d.id] = d
  for (const i of items) merged[i.id] = i
  return merged
}
