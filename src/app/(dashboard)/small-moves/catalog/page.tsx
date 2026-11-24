import Link from 'next/link'
import prisma from '@/lib/prisma'
import { getAllSyncedSmallItems } from '@/lib/smallMove/syncCatalog'
import { CatalogManager } from './CatalogManager'

export const dynamic = 'force-dynamic'

export default async function SmallMoveCatalogPage() {
  const [{ items, isCustomized }, standardItems] = await Promise.all([
    getAllSyncedSmallItems(),
    prisma.standardItem.findMany({
      select: { id: true, name: true, spec: true, defaultCbm: true, defaultInnerCbm: true },
      orderBy: [{ name: 'asc' }, { spec: 'asc' }],
    }),
  ])

  return (
    <div className="space-y-3 max-w-5xl">
      <div className="bg-white px-4 py-3 rounded-2xl border border-gray-200/80 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-black">소형이사 표시 물품 설정</h1>
          <p className="text-xs text-gray-500">
            고객 접수(/s/request) 및 소형전화견적 빠른 선택에 노출되는 물품과 표시명(품목명 또는 규격명), 카테고리를 관리합니다.
          </p>
        </div>
        <Link href="/small-moves" className="text-sm font-bold border border-gray-300 rounded-lg px-3 py-1.5 shrink-0">
          목록으로
        </Link>
      </div>
      <CatalogManager initialItems={items} standardItems={standardItems} isCustomized={isCustomized} />
    </div>
  )
}
