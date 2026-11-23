import Link from 'next/link'
import prisma from '@/lib/prisma'
import { getSyncedSmallItems } from '@/lib/smallMove/syncCatalog'
import { NewPhoneQuoteForm } from './NewPhoneQuoteForm'

export const dynamic = 'force-dynamic'

export default async function NewSmallMovePhoneQuotePage() {
  const [standardItems, syncedSmallItems] = await Promise.all([
    prisma.standardItem.findMany({
      select: { id: true, name: true, spec: true, defaultCbm: true, defaultInnerCbm: true },
      orderBy: [{ name: 'asc' }, { spec: 'asc' }],
    }),
    getSyncedSmallItems(),
  ])

  return (
    <div className="space-y-3 max-w-4xl">
      <div className="bg-white px-4 py-3 rounded-2xl border border-gray-200/80 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black">소형전화견적 등록</h1>
          <p className="text-xs text-gray-500">플랫폼 오더장 문자를 보고 기본정보를 입력·저장하면 즉시 견적을 산정합니다.</p>
        </div>
        <Link href="/small-moves" className="text-sm font-bold border border-gray-300 rounded-lg px-3 py-1.5 shrink-0">
          목록으로
        </Link>
      </div>
      <NewPhoneQuoteForm standardItems={standardItems} quickSmallItems={syncedSmallItems} />
    </div>
  )
}
