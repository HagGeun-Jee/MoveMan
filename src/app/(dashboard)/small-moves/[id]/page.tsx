import Link from 'next/link'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import {
  SMALL_ITEM_MAP,
  SMALL_CATEGORY_LABEL,
  STATUS_LABEL,
  HOME_TYPES,
  fixVehicleLabel,
  type SmallCategory,
} from '@/lib/smallMove/catalog'
import { formatPhone, fmtMoveDate, kstDateStr, fmtKstDateTime } from '@/lib/smallMove/format'
import { ItemIcon } from '@/lib/smallMove/ItemIcon'
import { getDistance } from '@/app/actions/distance'
import { ReplyForm } from './ReplyForm'

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
  const options = safeJson<any>(r.options, {})
  const fromInfo = safeJson<any>(r.fromInfo, {})
  const toInfo = safeJson<any>(r.toInfo, {})
  const rawCbm = Math.round(items.reduce((sum, i) => sum + (SMALL_ITEM_MAP[i.id]?.cbm ?? 0) * i.qty, 0) * 100) / 100
  const photoSrc = (path: string) => `/api/admin/small-move-photo?path=${encodeURIComponent(path)}`
  const startTime: string = options.startTime || ''
  const history: { at: string; by: string; fields: string[] }[] = Array.isArray(options.history) ? options.history : []
  let route: { km: number; toll?: number; byClass?: any; duration?: string } = {
    km: r.distanceKm,
    toll: options.tollFare,
    byClass: options.tollByClass,
    duration: options.durationText,
  }
  // 통행료가 저장되지 않은 접수(이전 접수)는 조회 시 경로를 다시 계산
  if (route.toll === undefined && !r.purgedAt) {
    try {
      const d = await getDistance(r.fromAddress, r.toAddress)
      if (d?.success) route = { km: d.distanceKm, toll: d.tollFare ?? 0, byClass: d.tollFareByClass, duration: d.durationText }
    } catch {
      /* 계산 실패 시 저장된 거리만 표시 */
    }
  }
  const tollClass = /2\.5/.test(r.vehicleLabel) ? 'class2' : /5톤/.test(r.vehicleLabel) ? 'class3' : 'class1'
  const tollForVehicle: number | undefined = route.byClass?.[tollClass] ?? route.toll
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
        <div className="flex gap-2">
          {!r.purgedAt && (
            <Link href={`/small-moves/${r.id}/edit`} className="text-sm font-bold bg-blue-600 text-white rounded-lg px-3 py-1.5">
              내용 수정
            </Link>
          )}
          <Link href="/small-moves" className="text-sm font-bold border border-gray-300 rounded-lg px-3 py-1.5">
          목록으로
        </Link>
        </div>
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
          <p>연락처: <b>{r.contact ? formatPhone(r.contact) : '-'}</b></p>
          <p>주거형태: {home} · 유입: {r.channel || '직접'}</p>
          <p>이사 희망일: <b>{fmtMoveDate(r.movingDate)}</b>{startTime ? <> · 작업시작 <b>{startTime}</b></> : <span className="text-gray-400"> · 작업시작 미정</span>}</p>
          <p>접수: {fmtKstDateTime(r.createdAt)}</p>
          <p className="text-xs text-gray-500">정리 예정일: {r.purgeAt ? kstDateStr(r.purgeAt) : '-'}</p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-1.5 text-sm">
          <h2 className="font-black mb-1">주소·작업환경</h2>
          <p>출발: {r.fromAddress}</p>
          <p className="text-xs text-gray-600 pl-3">{sideText(fromInfo)}</p>
          <p>도착: {r.toAddress}</p>
          <p className="text-xs text-gray-600 pl-3">{sideText(toInfo)}</p>
          <p>경로상 거리: <b>{Math.round(route.km * 10) / 10}km</b>{route.duration ? ` · 소요 ${route.duration}` : ''}</p>
          <p>
            통행료(출발→도착 편도):{' '}
            <b>{route.toll === undefined ? '-' : route.toll === 0 ? '없음 (0원)' : `${(tollForVehicle ?? 0).toLocaleString('ko-KR')}원`}</b>
            {route.toll ? <span className="text-xs text-gray-500"> ({fixVehicleLabel(r.vehicleLabel)} 차종 기준)</span> : null}
          </p>
          <p>옵션: {options.packingService ? '포장서비스 ' : ''}{options.airconCount ? `에어컨 ${options.airconCount}대` : ''}{!options.packingService && !options.airconCount ? '없음' : ''}</p>
          {r.memo && <p className="bg-gray-50 rounded-lg p-2 whitespace-pre-wrap">요청: {r.memo}</p>}
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-gray-200 p-4 text-sm">
        <h2 className="font-black mb-2">물품 (선택 합계 {rawCbm}㎥ → 여유분 10% 포함 {r.totalCbm}㎥ · 추천 {fixVehicleLabel(r.vehicleLabel)})</h2>
        <div className="space-y-3">
          {(Object.keys(SMALL_CATEGORY_LABEL) as SmallCategory[]).map((cat) => {
            const rows = items.filter((i) => SMALL_ITEM_MAP[i.id]?.category === cat)
            if (rows.length === 0) return null
            const sub = rows.reduce((sum, i) => sum + (SMALL_ITEM_MAP[i.id]?.cbm ?? 0) * i.qty, 0)
            return (
              <div key={cat}>
                <div className="flex justify-between items-center text-xs font-bold text-blue-900 bg-blue-100 border-l-4 border-blue-500 rounded-md px-2.5 py-1 mb-1.5">
                  <span>{SMALL_CATEGORY_LABEL[cat]} · {rows.length}종</span>
                  <span className="font-semibold text-blue-700">({sub.toFixed(2)}㎥)</span>
                </div>
                <ul className="grid sm:grid-cols-2 gap-1.5">
                  {rows.map((i) => {
                    const def = SMALL_ITEM_MAP[i.id]
                    return (
                      <li key={i.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-2.5 py-1.5">
                        <ItemIcon id={i.id} className="w-9 h-9 shrink-0" />
                        <div className="min-w-0 flex-1 text-xs font-bold truncate">
                          {def.name} <span className="font-normal text-gray-500">{def.spec}</span>
                        </div>
                        <div className="text-right text-xs shrink-0">
                          <b>× {i.qty}</b> <span className="text-gray-500">({(def.cbm * i.qty).toFixed(2)}㎥)</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>$1</section>

      <section className="bg-white rounded-2xl border border-gray-200 p-4 text-sm">
        <h2 className="font-black mb-2">사진 ({photos.length}장)</h2>
        {photos.length === 0 ? (
          <p className="text-gray-500">등록된 사진이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((p) => (
              <a key={p.path} href={photoSrc(p.path)} target="_blank" rel="noreferrer" className="relative block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoSrc(p.path)} alt={p.label} className="w-full aspect-square object-cover rounded-xl bg-gray-100" />
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
              <span className="text-gray-600">{fixVehicleLabel(b.label)}</span>
              <span className="font-bold">{won(b.amount)}</span>
            </li>
          ))}
        </ul>
      </section>

      {history.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-200 p-4 text-sm">
          <h2 className="font-black mb-2">수정 이력</h2>
          <ul className="space-y-1 text-xs text-gray-700">
            {history.slice().reverse().map((x, i) => (
              <li key={i}>
                <span className="text-gray-500">{fmtKstDateTime(x.at)}</span> · {x.by} · <b>{x.fields.join(', ')}</b> 수정
              </li>
            ))}
          </ul>
        </section>
      )}

      {!r.purgedAt && (
        <ReplyForm
          id={r.id}
          contact={r.contact}
          status={r.status}
          finalAmount={r.finalAmount}
          suggestedAmount={Math.round((r.estMin + r.estMax) / 2 / 1000) * 1000}
          adminComment={r.adminComment}
          siteUrl={process.env.NEXT_PUBLIC_SITE_URL || ''}
          startTime={startTime}
        />
      )}
    </div>
  )
}
