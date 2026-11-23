import Link from 'next/link'
import prisma from '@/lib/prisma'
import { STATUS_LABEL } from '@/lib/smallMove/catalog'
import { fmtMoveDate } from '@/lib/smallMove/format'

export const dynamic = 'force-dynamic'

const won = (n: number) => n.toLocaleString('ko-KR') + '원'
const TABS = ['ALL', 'RECEIVED', 'REVIEWING', 'QUOTED', 'BOOKED', 'CANCELED']

export default async function SmallMovesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const filter = status && TABS.includes(status) && status !== 'ALL' ? status : undefined

  const [list, counts] = await Promise.all([
    prisma.smallMoveRequest.findMany({
      where: filter ? { status: filter } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.smallMoveRequest.groupBy({ by: ['status'], _count: { _all: true } }),
  ])
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count._all]))
  const total = counts.reduce((a, c) => a + c._count._all, 0)

  return (
    <div className="space-y-3 max-w-5xl">
      <div className="bg-white px-4 py-3 rounded-2xl border border-gray-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-black">소형이사 접수</h1>
          <span className="text-xs text-gray-500">고객 직접 접수 링크: /s (유입 채널 ?utm_source=값)</span>
        </div>
        <Link
          href="/small-moves/new"
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition-colors shrink-0"
        >
          + 소형전화견적 등록
        </Link>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => {
          const active = (filter || 'ALL') === t
          const n = t === 'ALL' ? total : countMap[t] || 0
          return (
            <Link
              key={t}
              href={t === 'ALL' ? '/small-moves' : `/small-moves?status=${t}`}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700'
              }`}
            >
              {t === 'ALL' ? '전체' : STATUS_LABEL[t]} {n}
            </Link>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {list.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">접수 내역이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.map((r) => (
              <li key={r.id}>
                <Link href={`/small-moves/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono font-bold text-blue-700">{r.id}</span>
                      <span className="font-bold">{r.customerName}</span>
                      {r.channel.startsWith('전화') && (
                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                          {r.channel}
                        </span>
                      )}
                      {r.consultRequired && <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">상담필요</span>}
                      {r.purgedAt && <span className="text-[10px] font-black bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">정리됨</span>}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {r.fromAddress} → {r.toAddress}
                    </div>
                  </div>
                  <div className="text-right text-xs shrink-0">
                    <div className="font-black text-sm">
                      {r.finalAmount != null ? won(r.finalAmount) : `${won(r.estMin)}~`}
                    </div>
                    <div className="text-gray-500">
                      {STATUS_LABEL[r.status]} · {r.movingDate ? fmtMoveDate(r.movingDate).slice(5) : '일정미정'}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
