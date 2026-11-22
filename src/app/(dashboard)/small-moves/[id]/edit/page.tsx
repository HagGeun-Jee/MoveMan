import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { kstDateStr } from '@/lib/smallMove/format'
import { EditForm, type EditSide } from './EditForm'

export const dynamic = 'force-dynamic'

function safeJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T
  } catch {
    return fallback
  }
}

const side = (info: any, address: string): EditSide => ({
  address,
  floor: Number(info?.floor) || 1,
  elevator: Boolean(info?.elevator),
  ladder: Boolean(info?.ladder),
  parkingFar: Boolean(info?.parkingFar),
})

export default async function SmallMoveEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await prisma.smallMoveRequest.findUnique({ where: { id } })
  if (!r) notFound()
  if (r.purgedAt) redirect(`/small-moves/${id}`)

  const items = safeJson<{ id: string; qty: number }[]>(r.items, [])
  const options = safeJson<any>(r.options, {})

  return (
    <div className="space-y-3 max-w-4xl">
      <div className="bg-white px-4 py-3 rounded-2xl border border-gray-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-black">접수 내용 수정</h1>
          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">{r.id}</span>
        </div>
        <Link href={`/small-moves/${r.id}`} className="text-sm font-bold border border-gray-300 rounded-lg px-3 py-1.5">
          상세로
        </Link>
      </div>
      <p className="text-xs text-gray-500 px-1">고객과 통화·문자 소통 중 변경된 내용을 반영합니다. 저장하면 상세 화면으로 돌아가며, 수정 이력이 남습니다.</p>
      <EditForm
        init={{
          id: r.id,
          customerName: r.customerName,
          contact: r.contact,
          homeType: r.homeType,
          movingDate: r.movingDate ? kstDateStr(r.movingDate) : '',
          startTime: options.startTime || '',
          from: side(safeJson<any>(r.fromInfo, {}), r.fromAddress),
          to: side(safeJson<any>(r.toInfo, {}), r.toAddress),
          qty: Object.fromEntries(items.map((i) => [i.id, i.qty])),
          packingService: Boolean(options.packingService),
          airconCount: Number(options.airconCount) || 0,
          memo: r.memo,
          hasFinalAmount: r.finalAmount != null,
        }}
      />
    </div>
  )
}
