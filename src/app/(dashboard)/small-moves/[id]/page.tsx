import Link from 'next/link'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { SMALL_ITEM_MAP, STATUS_LABEL, HOME_TYPES } from '@/lib/smallMove/catalog'
import { signedUrls } from '@/lib/smallMove/storage'
import { updateSmallMoveAction } from '@/app/actions/smallMove'

export const dynamic = 'force-dynamic'
const won = (n: number) => n.toLocaleString('ko-KR') + '원'

function safeJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T
  } catch {
    return fallback
  }
}

export default async function SmallMoveDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await prisma.smallMoveRequest.findUnique({ where: { id } })
  if (!r) notFound()

  const items = safeJson<{ id: string; qty: number }[]>(r.items, [])
  const photos = safeJson<{ path: string; label: string }[]>(r.photos, [])
  const breakdown = safeJson<{ label: string; amount: number }[]>(r.estBreakdown, [])
  const options = safeJson<{ packingService?: boolean; airconCount?: number }>(r.options, {})
  const fromInfo = safeJson<any>(r.fromInfo, {})
  const toInfo = safeJson<any>(r.toInfo, {})
  const urls = await signedUrls(photos.map((p) => p.path))
  const home = HOME_TYPES.find((h) => h.id === r.homeType)?.label || r.homeType

  const sideText = (s: any) =>
    `${s.floor ?? '-'}층 · ${s.ladder ? '사다리차' : s.elevator ? '엘리베이터 O' : '엘리베이터 X'}${s.parkingFar ? ' · 진입/도보 불리' : ''}`

  return (
    <div className="space-y-3 max-w-4xl">
      <div className="bg-white px-4 py-3 rounded-2xl border border-gray-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-black">소형이사 접수 상세</h1>
          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">{r.id}</span>
        </div>
        <Link href="/small-moves" className="text-sm font-bold border border-gray-300 rounded-lg px-3 py-1.5">
          목록으로
        </Link>
      </div>

      {r.purgedAt && (
        <div className="bg-gray-100 border border-gray-300 rounded-xl p-3 text-sm text-gray-700">
          개인정보 보관 기간이 지나 사진과 연락처가 정리(마스킹)된 접수입니다.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-1.5 text-sm">
          <h2 className="font-black mb-1">고객 정보</h2>
          <p>이름: <b>{r.customerName}</b></p>
          <p>연락처: <b>{r.contact || '-'}</b></p>
          <p>주거형태: {home} · 유입: {r.channel || '직접'}</p>
          <p>이사 희망일: {r.movingDate ? r.movingDate.toISOString().slice(0, 10) : '미정'}</p>
          <p>접수: {r.createdAt.toLocaleString('ko-KR')}</p>
          <p className="text-xs text-gray-500">정리 예정일: {r.purgeAt ? r.purgeAt.toISOString().slice(0, 10) : '-'}</p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-1.5 text-sm">
          <h2 className="font-black mb-1">주소·작업환경</h2>
          <p>출발: {r.fromAddress}</p>
          <p className="text-xs text-gray-600 pl-3">{sideText(fromInfo)}</p>
          <p>도착: {r.toAddress}</p>
          <p className="text-xs text-gray-600 pl-3">{sideText(toInfo)}</p>
          <p>거리: {Math.round(r.distanceKm)}km</p>
          <p>옵션: {options.packingService ? '포장서비스 ' : ''}{options.airconCount ? `에어컨 ${options.airconCount}대` : ''}{!options.packingService && !options.airconCount ? '없음' : ''}</p>
          {r.memo && <p className="bg-gray-50 rounded-lg p-2 whitespace-pre-wrap">요청: {r.memo}</p>}
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-gray-200 p-4 text-sm">
        <h2 className="font-black mb-2">물품 ({r.totalCbm}㎥ · 추천 {r.vehicleLabel})</h2>
        <div className="flex flex-wrap gap-1.5">
          {items.map((i) => {
            const def = SMALL_ITEM_MAP[i.id]
            return (
              <span key={i.id} className="bg-gray-100 rounded-full px-2.5 py-1 text-xs font-bold">
                {def?.icon} {def?.name} {def?.spec ? `(${def.spec})` : ''} × {i.qty}
              </span>
            )
          })}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 p-4 text-sm">
        <h2 className="font-black mb-2">사진 ({photos.length}장)</h2>
        {photos.length === 0 ? (
          <p className="text-gray-500">등록된 사진이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((p) => (
              <a key={p.path} href={urls[p.path]} target="_blank" rel="noreferrer" className="relative block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urls[p.path]} alt={p.label} className="w-full aspect-square object-cover rounded-xl bg-gray-100" />
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 rounded">{p.label}</span>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 p-4 text-sm space-y-2">
        <h2 className="font-black">자동 산정 ({won(r.estMin)} ~ {won(r.estMax)})</h2>
        {r.consultRequired && <p className="text-amber-700 font-bold text-xs">상담/현장확인이 필요한 접수입니다.</p>}
        <ul className="space-y-1">
          {breakdown.map((b) => (
            <li key={b.label} className="flex justify-between">
              <span className="text-gray-600">{b.label}</span>
              <span className="font-bold">{won(b.amount)}</span>
            </li>
          ))}
        </ul>
      </section>

      {!r.purgedAt && (
        <form action={updateSmallMoveAction} className="bg-white rounded-2xl border-2 border-blue-200 p-4 space-y-3 text-sm">
          <h2 className="font-black">견적 확정 / 회신</h2>
          <input type="hidden" name="id" value={r.id} />
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="font-bold">상태</span>
              <select name="status" defaultValue={r.status} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-bold">확정 금액(원)</span>
              <input
                name="finalAmount"
                inputMode="numeric"
                defaultValue={r.finalAmount ?? Math.round((r.estMin + r.estMax) / 2 / 1000) * 1000}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="font-bold">고객 안내 코멘트 (고객 조회 화면·문자에 표시)</span>
            <textarea name="adminComment" rows={3} defaultValue={r.adminComment} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </label>
          <label className="flex items-center gap-2 font-bold">
            <input type="checkbox" name="sendSms" className="w-4 h-4" /> 저장 후 고객에게 문자 발송
          </label>
          <button type="submit" className="w-full bg-blue-600 text-white font-black rounded-xl py-2.5">
            저장
          </button>
        </form>
      )}
    </div>
  )
}
