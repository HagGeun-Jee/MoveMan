import 'server-only'
import prisma from '@/lib/prisma'
import { SMALL_ITEMS, type SmallItem } from './catalog'

// DB 물품정보(StandardItem)와 1:1 매칭하여 소형이사 물품 목록의 기본/내품 CBM을 실시간 동기화한다.
export async function getSyncedSmallItems(): Promise<SmallItem[]> {
  try {
    const stds = await prisma.standardItem.findMany({
      select: { name: true, spec: true, defaultCbm: true, defaultInnerCbm: true },
    })
    const stdMap = new Map<string, { cbm: number; innerCbm: number }>()
    for (const s of stds) {
      stdMap.set(`${s.name}__${s.spec}`, { cbm: s.defaultCbm, innerCbm: s.defaultInnerCbm || 0 })
    }
    return SMALL_ITEMS.map((item) => {
      if (!item.stdName) return item
      const synced = stdMap.get(`${item.stdName}__${item.stdSpec || ''}`)
      return synced !== undefined ? { ...item, cbm: synced.cbm, innerCbm: synced.innerCbm } : item
    })
  } catch {
    return SMALL_ITEMS
  }
}

export async function getSyncedSmallItemMap(): Promise<Record<string, SmallItem>> {
  const list = await getSyncedSmallItems()
  return Object.fromEntries(list.map((i) => [i.id, i]))
}
