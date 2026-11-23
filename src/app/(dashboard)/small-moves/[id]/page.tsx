import Link from 'next/link'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import {
  SMALL_CATEGORY_LABEL,
  STATUS_LABEL,
  HOME_TYPES,
  fixVehicleLabel,
  resolveSmallMoveItem,
  type SmallCategory,
  type SmallMoveItemEntry,
} from '@/lib/smallMove/catalog'
import { getSyncedSmallItemMap } from '@/lib/smallMove/syncCatalog'
import { formatPhone, fmtMoveDate, kstDateStr, fmtKstDateTime } from '@/lib/smallMove/format'
import { ItemIconByName } from '@/lib/smallMove/ItemIcon'
import { getDistance } from '@/app/actions/distance'
import { PrintButton } from '@/components/PrintButton'
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
  const [r, syncedMap] = await Promise.all([
    prisma.smallMoveRequest.findUnique({ where: { id } }),
    getSyncedSmallItemMap(),
  ])
  if (!r) notFound()

  const rawItems = safeJson<SmallMoveItemEntry[]>(r.items, [])
  const resolvedItems = rawItems.map((entry) => resolveSmallMoveItem(entry, syncedMap))
  const photos = safeJson<{ path: string; label: string }[]>(r.photos, [])
  const breakdown = safeJson<{ label: string; amount: number }[]>(r.estBreakdown, [])
  const options = safeJson<any>(r.options, {})
  const fromInfo = safeJson<any>(r.fromInfo, {})
  const toInfo = safeJson<any>(r.toInfo, {})
  const rawCbm = Math.round(resolvedItems.reduce((sum, i) => sum + i.effectiveUnitCbm * i.qty, 0) * 100) / 100
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

  const optText = [
    options.packingService ? '포장서비스(반포장)' : '',
  ]
    .filter(Boolean)
    .join(' · ') || '없음'

  return (
    <>
      {/* ───── 화면용 관리자 뷰 (인쇄 시 숨김) ───── */}
      <div className="space-y-3 max-w-4xl print:hidden">
        <div className="bg-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-gray-200/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base sm:text-lg font-black truncate">소형이사 접수 상세</h1>
            <span className="text-[11px] sm:text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 shrink-0">
              {r.id}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap">
            <PrintButton />
            {!r.purgedAt && (
              <Link href={`/small-moves/${r.id}/edit`} className="text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-2.5 sm:px-3 py-1.5">
                내용 수정
              </Link>
            )}
            <Link href="/small-moves" className="text-xs sm:text-sm font-bold border border-gray-300 hover:bg-gray-50 rounded-xl px-2.5 sm:px-3 py-1.5">
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
            <p>옵션: {optText}</p>
            {r.memo && <p className="bg-gray-50 rounded-lg p-2 whitespace-pre-wrap">요청: {r.memo}</p>}
          </section>
        </div>

        <section className="bg-white rounded-2xl border border-gray-200 p-4 text-sm">
          <h2 className="font-black mb-2">물품 (선택 합계 {rawCbm}㎥ → 여유분 10% 포함 {r.totalCbm}㎥ · 추천 {fixVehicleLabel(r.vehicleLabel)})</h2>
          <div className="space-y-3">
            {(Object.keys(SMALL_CATEGORY_LABEL) as SmallCategory[]).map((cat) => {
              const rows = resolvedItems.filter((i) => i.category === cat)
              if (rows.length === 0) return null
              const sub = rows.reduce((sum, i) => sum + i.effectiveUnitCbm * i.qty, 0)
              return (
                <div key={cat}>
                  <div className="flex justify-between items-center text-xs font-bold text-blue-900 bg-blue-100 border-l-4 border-blue-500 rounded-md px-2.5 py-1 mb-1.5">
                    <span>{SMALL_CATEGORY_LABEL[cat]} · {rows.length}종</span>
                    <span className="font-semibold text-blue-700">({sub.toFixed(2)}㎥)</span>
                  </div>
                  <ul className="grid sm:grid-cols-2 gap-1.5">
                    {rows.map((i, idx) => (
                      <li
                        key={`${i.id}_${idx}`}
                        className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 ${
                          i.excludeBase ? 'bg-red-50/70 border border-red-200' : 'bg-gray-50'
                        }`}
                      >
                        <ItemIconByName name={i.name} spec={i.spec} className="w-9 h-9 shrink-0" />
                        <div className="min-w-0 flex-1 text-xs font-bold truncate">
                          {i.displayName}{' '}
                          <span className="font-normal text-gray-500">{i.displaySpec}</span>
                          {i.excludeBase && (
                            <span
                              className={`ml-1 px-1 py-0.2 rounded text-white text-[10px] font-black ${
                                i.action === '폐기' ? 'bg-red-600' : i.action === '내림' ? 'bg-orange-500' : 'bg-purple-600'
                              }`}
                            >
                              {i.action}
                            </span>
                          )}
                        </div>
                        <div className="text-right text-xs shrink-0">
                          <b>× {i.qty}</b>{' '}
                          <span className={i.excludeBase ? 'text-red-700 font-bold' : 'text-gray-500'}>
                            ({(i.effectiveUnitCbm * i.qty).toFixed(2)}㎥
                            {!i.excludeBase && i.innerCbm > 0 ? ` · 내품+${(i.innerCbm * i.qty).toFixed(2)}` : ''})
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
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

      {/* ───── A4 인쇄/PDF 전용 견적서 양식 ───── */}
      <div className="hidden print:block text-black bg-white text-[10.5pt] leading-snug">
        {/* 상단 타이틀 & 발행 정보 */}
        <div className="flex items-end justify-between border-b-2 border-gray-900 pb-3 mb-4">
          <div>
            <p className="text-[9pt] font-bold text-blue-700 tracking-wider">톡톡용달이사 · 소형이사</p>
            <h1 className="text-[20pt] font-black tracking-tight">소 형 이 사 견 적 서</h1>
          </div>
          <div className="text-right text-[9.5pt] space-y-0.5">
            <p>견적번호: <span className="font-mono font-bold">{r.id}</span></p>
            <p>접수일시: {fmtKstDateTime(r.createdAt)}</p>
            <p>진행상태: <b>{STATUS_LABEL[r.status] || r.status}</b></p>
          </div>
        </div>

        {/* 고객 · 일정 · 운송 정보 표 */}
        <table className="w-full border-collapse border border-gray-400 mb-4 text-[9.5pt]">
          <tbody>
            <tr>
              <th className="w-24 bg-gray-100 border border-gray-400 px-2.5 py-1.5 text-left font-bold">고객명</th>
              <td className="border border-gray-400 px-2.5 py-1.5 font-bold">{r.customerName}</td>
              <th className="w-24 bg-gray-100 border border-gray-400 px-2.5 py-1.5 text-left font-bold">연락처</th>
              <td className="border border-gray-400 px-2.5 py-1.5">{r.contact ? formatPhone(r.contact) : '-'}</td>
            </tr>
            <tr>
              <th className="bg-gray-100 border border-gray-400 px-2.5 py-1.5 text-left font-bold">이사 희망일</th>
              <td className="border border-gray-400 px-2.5 py-1.5 font-bold">
                {fmtMoveDate(r.movingDate)}{startTime ? ` · 시작 ${startTime}` : ''}
              </td>
              <th className="bg-gray-100 border border-gray-400 px-2.5 py-1.5 text-left font-bold">주거/차량</th>
              <td className="border border-gray-400 px-2.5 py-1.5">
                {home} · <b>{fixVehicleLabel(r.vehicleLabel)}</b> ({r.totalCbm}㎥)
              </td>
            </tr>
            <tr>
              <th className="bg-gray-100 border border-gray-400 px-2.5 py-1.5 text-left font-bold">출발지</th>
              <td colSpan={3} className="border border-gray-400 px-2.5 py-1.5">
                {r.fromAddress} <span className="text-[8.5pt] text-gray-600">({sideText(fromInfo)})</span>
              </td>
            </tr>
            <tr>
              <th className="bg-gray-100 border border-gray-400 px-2.5 py-1.5 text-left font-bold">도착지</th>
              <td colSpan={3} className="border border-gray-400 px-2.5 py-1.5">
                {r.toAddress} <span className="text-[8.5pt] text-gray-600">({sideText(toInfo)})</span>
              </td>
            </tr>
            <tr>
              <th className="bg-gray-100 border border-gray-400 px-2.5 py-1.5 text-left font-bold">거리·통행료</th>
              <td className="border border-gray-400 px-2.5 py-1.5">
                약 {Math.round(route.km * 10) / 10}km{route.duration ? ` (${route.duration})` : ''} / 편도 통행료 {route.toll === undefined ? '-' : route.toll === 0 ? '0원' : won(tollForVehicle ?? 0)}
              </td>
              <th className="bg-gray-100 border border-gray-400 px-2.5 py-1.5 text-left font-bold">추가 옵션</th>
              <td className="border border-gray-400 px-2.5 py-1.5">{optText}</td>
            </tr>
            {r.memo && (
              <tr>
                <th className="bg-gray-100 border border-gray-400 px-2.5 py-1.5 text-left font-bold">요청사항</th>
                <td colSpan={3} className="border border-gray-400 px-2.5 py-1.5 whitespace-pre-wrap">{r.memo}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 물품 명세표 */}
        <h2 className="text-[11pt] font-black mb-1.5">1. 운송 물품 내역 (총 {resolvedItems.reduce((s, i) => s + i.qty, 0)}점 · 선택 {rawCbm}㎥ / 여유분 포함 {r.totalCbm}㎥)</h2>
        <table className="w-full border-collapse border border-gray-400 mb-4 text-[9pt]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-1 text-left w-24">구분</th>
              <th className="border border-gray-400 px-2 py-1 text-left">품목</th>
              <th className="border border-gray-400 px-2 py-1 text-left">규격</th>
              <th className="border border-gray-400 px-2 py-1 text-right w-14">수량</th>
              <th className="border border-gray-400 px-2 py-1 text-right w-20">단위 CBM</th>
              <th className="border border-gray-400 px-2 py-1 text-right w-20">소계 CBM</th>
            </tr>
          </thead>
          <tbody>
            {resolvedItems.map((i, idx) => (
              <tr key={`${i.id}_p_${idx}`}>
                <td className="border border-gray-400 px-2 py-1 text-gray-700">{SMALL_CATEGORY_LABEL[i.category]}</td>
                <td className="border border-gray-400 px-2 py-1 font-bold">
                  {i.displayName}
                  {i.excludeBase && <span className="ml-1 text-[8pt] text-red-700 font-black">[{i.action}·내품만]</span>}
                </td>
                <td className="border border-gray-400 px-2 py-1 text-gray-700">{i.displaySpec || '기본'}</td>
                <td className="border border-gray-400 px-2 py-1 text-right font-bold">{i.qty}</td>
                <td className="border border-gray-400 px-2 py-1 text-right">
                  {i.excludeBase ? (
                    <>
                      <span className="line-through text-gray-400">{i.cbm.toFixed(2)}</span>{' '}
                      <span>+{i.innerCbm.toFixed(2)}</span>
                    </>
                  ) : (
                    <>
                      {i.cbm.toFixed(2)}
                      {i.innerCbm > 0 ? `+${i.innerCbm.toFixed(2)}` : ''}
                    </>
                  )}
                </td>
                <td className="border border-gray-400 px-2 py-1 text-right font-bold">
                  {(i.effectiveUnitCbm * i.qty).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 견적 산정 내역 및 확정 금액 */}
        <div className="print-avoid-break">
          <h2 className="text-[11pt] font-black mb-1.5">2. 견적 금액 산정 내역</h2>
          <table className="w-full border-collapse border border-gray-400 mb-3 text-[9.5pt]">
            <tbody>
              {breakdown.map((b) => (
                <tr key={b.label}>
                  <td className="border border-gray-400 px-2.5 py-1">{fixVehicleLabel(b.label)}</td>
                  <td className="border border-gray-400 px-2.5 py-1 text-right font-bold w-36">{won(b.amount)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td className="border border-gray-400 px-2.5 py-1.5 font-bold">자동 산정 예상 범위</td>
                <td className="border border-gray-400 px-2.5 py-1.5 text-right font-bold">{won(r.estMin)} ~ {won(r.estMax)}</td>
              </tr>
              <tr className="bg-blue-50">
                <td className="border border-gray-400 px-2.5 py-2 font-black text-[11pt]">최종 확정 견적 금액 (VAT 별도)</td>
                <td className="border border-gray-400 px-2.5 py-2 text-right font-black text-[12pt] text-blue-800">
                  {r.finalAmount != null ? won(r.finalAmount) : '협의 확정 대기'}
                </td>
              </tr>
            </tbody>
          </table>

          {r.adminComment && (
            <div className="border border-gray-400 rounded p-2.5 mb-3 text-[9.5pt] bg-gray-50">
              <p className="font-bold mb-0.5">담당자 안내사항</p>
              <p className="whitespace-pre-wrap">{r.adminComment}</p>
            </div>
          )}

          <p className="text-[8.5pt] text-gray-600 text-center border-t border-gray-300 pt-2 mt-4">
            톡톡용달이사 · 본 견적서는 접수 내용 및 사진 확인 기준이며, 현장 작업환경·물품 변동 시 추가 비용이 발생할 수 있습니다.
          </p>
        </div>
      </div>
    </>
  )
}
