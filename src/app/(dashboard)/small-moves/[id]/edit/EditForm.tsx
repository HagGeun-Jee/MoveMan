'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import DaumPostcodeEmbed from 'react-daum-postcode'
import {
  SMALL_ITEMS,
  SMALL_CATEGORY_LABEL,
  HOME_TYPES,
  type SmallCategory,
} from '@/lib/smallMove/catalog'
import { ItemIcon } from '@/lib/smallMove/ItemIcon'
import { START_TIME_OPTIONS, formatPhone } from '@/lib/smallMove/format'
import { updateSmallMoveDetailsAction } from '@/app/actions/smallMove'

export interface EditSide {
  address: string
  floor: number
  elevator: boolean
  ladder: boolean
  parkingFar: boolean
}

export interface EditInitial {
  id: string
  customerName: string
  contact: string
  homeType: string
  movingDate: string
  startTime: string
  from: EditSide
  to: EditSide
  qty: Record<string, number>
  packingService: boolean
  airconCount: number
  memo: string
  hasFinalAmount: boolean
}

const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm'

export function EditForm({ init }: { init: EditInitial }) {
  const [customerName, setCustomerName] = useState(init.customerName)
  const [contact, setContact] = useState(formatPhone(init.contact))
  const [homeType, setHomeType] = useState(init.homeType)
  const [movingDate, setMovingDate] = useState(init.movingDate)
  const [startTime, setStartTime] = useState(init.startTime)
  const [from, setFrom] = useState<EditSide>(init.from)
  const [to, setTo] = useState<EditSide>(init.to)
  const [qty, setQty] = useState<Record<string, number>>(init.qty)
  const [packingService, setPackingService] = useState(init.packingService)
  const [airconCount, setAirconCount] = useState(init.airconCount)
  const [memo, setMemo] = useState(init.memo)
  const [recalc, setRecalc] = useState(true)
  const [postcodeFor, setPostcodeFor] = useState<'from' | 'to' | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const totalCbm = useMemo(
    () => SMALL_ITEMS.reduce((s, it) => s + it.cbm * (qty[it.id] || 0), 0),
    [qty]
  )

  const setQ = (id: string, delta: number, max = 20) =>
    setQty((q) => {
      const n = Math.max(0, Math.min(max, (q[id] || 0) + delta))
      const c = { ...q }
      if (n === 0) delete c[id]
      else c[id] = n
      return c
    })

  const payload = {
    customerName,
    contact,
    homeType,
    movingDate,
    startTime,
    fromAddress: from.address,
    toAddress: to.address,
    fromInfo: from,
    toInfo: to,
    items: Object.entries(qty).map(([id, q]) => ({ id, qty: q })),
    options: { packingService, airconCount },
    memo,
    recalc,
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    let msg = ''
    if (!customerName.trim()) msg = '이름을 입력해 주세요.'
    else if (!/^01[016789]-\d{3,4}-\d{4}$/.test(contact.trim())) msg = '휴대폰 번호를 010-0000-0000 형식으로 입력해 주세요.'
    else if (!from.address || !to.address) msg = '출발지와 도착지 주소를 입력해 주세요.'
    else if (payload.items.length === 0) msg = '물품을 1개 이상 선택해 주세요.'
    setError(msg)
    if (msg) {
      e.preventDefault()
      return
    }
    setSaving(true)
  }

  const sideBox = (title: string, side: EditSide, set: (s: EditSide) => void, which: 'from' | 'to') => (
    <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2 text-sm">
      <h2 className="font-black">{title}</h2>
      <button type="button" onClick={() => setPostcodeFor(which)} className={`${input} text-left bg-gray-50`}>
        {side.address || '🔍 주소 검색'}
      </button>
      <div className="flex items-center gap-2">
        <span className="font-bold w-12">층수</span>
        <input
          type="number"
          value={side.floor}
          min={-1}
          max={60}
          onChange={(e) => set({ ...side, floor: Number(e.target.value) })}
          className="w-24 border border-gray-300 rounded-lg px-3 py-1.5"
        />
      </div>
      {(
        [
          ['elevator', '엘리베이터 이용 가능'],
          ['ladder', '사다리차 필요'],
          ['parkingFar', '차량 진입 어려움 / 도보 30m 초과'],
        ] as const
      ).map(([k, label]) => (
        <label key={k} className="flex items-center gap-2">
          <input type="checkbox" checked={side[k]} onChange={(e) => set({ ...side, [k]: e.target.checked })} className="w-4 h-4" />
          {label}
        </label>
      ))}
    </section>
  )

  return (
    <form action={updateSmallMoveDetailsAction} onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={init.id} />
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <section className="bg-white rounded-2xl border border-gray-200 p-4 grid sm:grid-cols-2 gap-3 text-sm">
        <h2 className="font-black sm:col-span-2">고객 · 일정</h2>
        <label className="space-y-1">
          <span className="font-bold">이름</span>
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength={30} className={input} />
        </label>
        <label className="space-y-1">
          <span className="font-bold">연락처</span>
          <input value={contact} onChange={(e) => setContact(formatPhone(e.target.value))} inputMode="tel" maxLength={13} className={input} />
        </label>
        <label className="space-y-1">
          <span className="font-bold">주거형태</span>
          <select value={homeType} onChange={(e) => setHomeType(e.target.value)} className={input}>
            {HOME_TYPES.map((h) => (
              <option key={h.id} value={h.id}>{h.label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="font-bold">이사 희망일 (비우면 미정)</span>
          <input type="date" value={movingDate} onChange={(e) => setMovingDate(e.target.value)} className={input} />
        </label>
        <label className="space-y-1">
          <span className="font-bold">작업 시작 시간 (24시간)</span>
          <select value={startTime} onChange={(e) => setStartTime(e.target.value)} className={input}>
            <option value="">미정</option>
            {START_TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
      </section>

      <div className="grid md:grid-cols-2 gap-3">
        {sideBox('📍 출발지', from, setFrom, 'from')}
        {sideBox('🏠 도착지', to, setTo, 'to')}
      </div>

      <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-black">물품 수정</h2>
          <span className="text-xs font-bold text-blue-700">선택 합계 {totalCbm.toFixed(2)}㎥</span>
        </div>
        {(Object.keys(SMALL_CATEGORY_LABEL) as SmallCategory[]).map((cat) => (
          <div key={cat}>
            <div className="text-xs font-black text-gray-700 border-b border-gray-200 pb-1 mb-1.5">{SMALL_CATEGORY_LABEL[cat]}</div>
            <ul className="grid sm:grid-cols-2 gap-1.5">
              {SMALL_ITEMS.filter((i) => i.category === cat).map((it) => {
                const q = qty[it.id] || 0
                return (
                  <li key={it.id} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 border ${q > 0 ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                    <ItemIcon id={it.id} className="w-9 h-9 shrink-0" />
                    <div className="min-w-0 flex-1 text-xs font-bold truncate">
                      {it.name} <span className="font-normal text-gray-500">{it.spec}</span>
                      <div className="font-normal text-gray-400">{it.cbm}㎥</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button" onClick={() => setQ(it.id, -1, it.max)} className="w-7 h-7 rounded-full border border-gray-300 font-black">−</button>
                      <span className="w-5 text-center font-black text-sm">{q}</span>
                      <button type="button" onClick={() => setQ(it.id, 1, it.max)} className="w-7 h-7 rounded-full bg-blue-600 text-white font-black">+</button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 text-sm">
        <h2 className="font-black">옵션 · 요청사항</h2>
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" checked={packingService} onChange={(e) => setPackingService(e.target.checked)} className="w-4 h-4" />
          포장 서비스(반포장)
        </label>
        <div className="flex items-center gap-2">
          <span className="font-bold">에어컨 탈거·설치</span>
          <button type="button" onClick={() => setAirconCount((n) => Math.max(0, n - 1))} className="w-7 h-7 rounded-full border border-gray-300 font-black">−</button>
          <span className="w-5 text-center font-black">{airconCount}</span>
          <button type="button" onClick={() => setAirconCount((n) => Math.min(5, n + 1))} className="w-7 h-7 rounded-full bg-blue-600 text-white font-black">+</button>
          <span className="text-gray-500">대</span>
        </div>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} maxLength={1000} placeholder="요청사항 / 통화 내용" className={input} />
      </section>

      <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm space-y-1">
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" checked={recalc} onChange={(e) => setRecalc(e.target.checked)} className="w-4 h-4" />
          저장 시 예상 견적(범위·CBM·추천 차량) 자동 재산정
        </label>
        {init.hasFinalAmount && (
          <p className="text-xs text-amber-800">이미 입력된 확정 금액은 자동으로 바뀌지 않습니다. 저장 후 상세에서 확정 금액을 확인해 주세요.</p>
        )}
      </section>

      {error && <p className="text-sm font-bold text-red-600">{error}</p>}

      <div className="flex gap-2 sticky bottom-0 bg-gray-100/90 backdrop-blur py-2">
        <Link href={`/small-moves/${init.id}`} className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white font-bold text-sm">
          취소
        </Link>
        <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white font-black rounded-xl py-2.5 disabled:opacity-60">
          {saving ? '저장 중...' : '저장하고 상세 보기'}
        </button>
      </div>

      {postcodeFor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPostcodeFor(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-3 border-b">
              <b>주소 검색</b>
              <button type="button" onClick={() => setPostcodeFor(null)} className="text-gray-500">닫기</button>
            </div>
            <DaumPostcodeEmbed
              style={{ height: 460 }}
              onComplete={(d: { address: string; buildingName?: string }) => {
                const addr = d.address + (d.buildingName ? ` (${d.buildingName})` : '')
                if (postcodeFor === 'from') setFrom((s) => ({ ...s, address: addr }))
                else setTo((s) => ({ ...s, address: addr }))
                setPostcodeFor(null)
              }}
            />
          </div>
        </div>
      )}
    </form>
  )
}
