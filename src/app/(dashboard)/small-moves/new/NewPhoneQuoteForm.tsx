'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import DaumPostcodeEmbed from 'react-daum-postcode'
import { Search, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import {
  HOME_TYPES,
  SMALL_CATEGORY_LABEL,
  SMALL_MOVE_ACTIONS,
  inferSmallCategory,
  type SmallCategory,
  type SmallItem,
  type SmallMoveAction,
  type SmallMoveItemEntry,
} from '@/lib/smallMove/catalog'
import { ItemIconByName } from '@/lib/smallMove/ItemIcon'
import { START_TIME_OPTIONS, formatPhone } from '@/lib/smallMove/format'
import { matchesKoreanSearch } from '@/lib/itemFilterUtils'
import { createPhoneSmallMoveAction } from '@/app/actions/smallMove'

interface Side {
  address: string
  floor: number
  elevator: boolean
  ladder: boolean
  parkingFar: boolean
}

interface StandardItemOption {
  id: string
  name: string
  spec: string
  defaultCbm: number
  defaultInnerCbm: number
}

interface RowItem {
  id: string
  qty: number
  name: string
  spec: string
  cbm: number
  innerCbm: number
  action: SmallMoveAction
  category: SmallCategory
}

const emptySide = (): Side => ({ address: '', floor: 1, elevator: true, ladder: false, parkingFar: false })
const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm'
const CATEGORIES = Object.keys(SMALL_CATEGORY_LABEL) as SmallCategory[]
const PLATFORMS = ['전화:짐싸', '전화:숨고', '전화:미소', '전화:네이버', '전화:당근', '전화:직접']

const ACTION_BTN_STYLE: Record<SmallMoveAction, string> = {
  이동: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100',
  폐기: 'bg-red-600 text-white border-red-600',
  내림: 'bg-orange-500 text-white border-orange-500',
  존치: 'bg-purple-600 text-white border-purple-600',
}

const ACTION_ROW_STYLE: Record<SmallMoveAction, string> = {
  이동: 'border-gray-200 bg-gray-50/70',
  폐기: 'border-red-300 bg-red-50/50',
  내림: 'border-orange-300 bg-orange-50/50',
  존치: 'border-purple-300 bg-purple-50/50',
}

const effectiveUnit = (it: { cbm: number; innerCbm: number; action: SmallMoveAction }) =>
  it.action !== '이동' ? it.innerCbm : it.cbm + it.innerCbm

export function NewPhoneQuoteForm({
  standardItems,
  quickSmallItems,
}: {
  standardItems: StandardItemOption[]
  quickSmallItems: SmallItem[]
}) {
  const [channel, setChannel] = useState('전화:짐싸')
  const [customerName, setCustomerName] = useState('')
  const [contact, setContact] = useState('')
  const [homeType, setHomeType] = useState('ONE_ROOM')
  const [movingDate, setMovingDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [from, setFrom] = useState<Side>(emptySide())
  const [to, setTo] = useState<Side>(emptySide())
  const [items, setItems] = useState<RowItem[]>([])
  const [collapsedCats, setCollapsedCats] = useState<Partial<Record<SmallCategory, boolean>>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [quickCat, setQuickCat] = useState<SmallCategory>('APPLIANCE')
  const [packingService, setPackingService] = useState(false)
  const [memo, setMemo] = useState('')
  const [postcodeFor, setPostcodeFor] = useState<'from' | 'to' | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const specsByName = useMemo(() => {
    const map = new Map<string, StandardItemOption[]>()
    for (const std of standardItems) {
      const list = map.get(std.name) || []
      list.push(std)
      map.set(std.name, list)
    }
    return map
  }, [standardItems])

  const searchResults = useMemo(() => {
    const q = searchQuery.trim()
    if (!q) return []
    return standardItems.filter((s) => matchesKoreanSearch(s.name, s.spec, q)).slice(0, 24)
  }, [standardItems, searchQuery])

  const totalCbm = useMemo(
    () => items.reduce((s, it) => s + effectiveUnit(it) * (Number(it.qty) || 0), 0),
    [items]
  )

  const addQuickSmall = (si: SmallItem) => {
    const name = si.stdName || si.name
    const spec = si.stdSpec !== undefined ? si.stdSpec : si.spec
    setCollapsedCats((prev) => ({ ...prev, [si.category]: false }))
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.name === name && x.spec === spec && x.action === '이동')
      if (idx >= 0) return prev.map((x, i) => (i === idx ? { ...x, qty: Math.min(150, x.qty + 1) } : x))
      return [
        ...prev,
        {
          id: si.id,
          qty: 1,
          name,
          spec,
          cbm: si.cbm,
          innerCbm: si.innerCbm || 0,
          action: '이동',
          category: si.category,
        },
      ]
    })
  }

  const addStandardItem = (std: StandardItemOption) => {
    const cat = inferSmallCategory(std.name)
    setCollapsedCats((prev) => ({ ...prev, [cat]: false }))
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.name === std.name && x.spec === std.spec && x.action === '이동')
      if (idx >= 0) return prev.map((x, i) => (i === idx ? { ...x, qty: Math.min(150, x.qty + 1) } : x))
      return [
        ...prev,
        {
          id: `std:${std.id}`,
          qty: 1,
          name: std.name,
          spec: std.spec,
          cbm: std.defaultCbm,
          innerCbm: std.defaultInnerCbm || 0,
          action: '이동',
          category: cat,
        },
      ]
    })
  }

  const toggleCat = (cat: SmallCategory) =>
    setCollapsedCats((prev) => ({ ...prev, [cat]: !prev[cat] }))

  const expandAllCats = () => setCollapsedCats({})
  const collapseAllCats = () =>
    setCollapsedCats(Object.fromEntries(CATEGORIES.map((c) => [c, true])) as Record<SmallCategory, boolean>)

  const changeQty = (idx: number, delta: number) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, qty: Math.max(1, Math.min(150, it.qty + delta)) } : it)))

  const cycleAction = (idx: number) =>
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it
        const nextIdx = (SMALL_MOVE_ACTIONS.indexOf(it.action) + 1) % SMALL_MOVE_ACTIONS.length
        return { ...it, action: SMALL_MOVE_ACTIONS[nextIdx] }
      })
    )

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))

  const changeSpec = (idx: number, newSpec: string) =>
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it
        const std = (specsByName.get(it.name) || []).find((s) => s.spec === newSpec)
        if (!std) return { ...it, spec: newSpec }
        return { ...it, spec: std.spec, cbm: std.defaultCbm, innerCbm: std.defaultInnerCbm || 0 }
      })
    )

  const payloadItems: SmallMoveItemEntry[] = items
    .filter((i) => i.qty > 0)
    .map((i) => ({ id: i.id, qty: i.qty, name: i.name, spec: i.spec, cbm: i.cbm, innerCbm: i.innerCbm, action: i.action }))

  const payload = {
    channel,
    customerName,
    contact,
    homeType,
    movingDate,
    startTime,
    fromAddress: from.address,
    toAddress: to.address,
    fromInfo: from,
    toInfo: to,
    items: payloadItems,
    options: { packingService },
    memo,
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    let msg = ''
    if (!customerName.trim()) msg = '고객 이름을 입력해 주세요.'
    else if (!/^01[016789]-\d{3,4}-\d{4}$/.test(contact.trim())) msg = '휴대폰 번호를 010-0000-0000 형식으로 입력해 주세요.'
    else if (!from.address) msg = '출발지 주소를 입력/검색해 주세요.'
    else if (!to.address) msg = '도착지 주소를 입력/검색해 주세요.'
    else if (payload.items.length === 0) msg = '물품을 1개 이상 추가해 주세요.'
    setError(msg)
    if (msg) {
      e.preventDefault()
      return
    }
    setSaving(true)
  }

  const sideBox = (title: string, side: Side, set: (s: Side) => void, which: 'from' | 'to') => (
    <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2 text-sm">
      <h2 className="font-black">{title}</h2>
      <div className="flex gap-1.5">
        <input
          value={side.address}
          onChange={(e) => set({ ...side, address: e.target.value })}
          placeholder="주소 직접 입력 또는 오른쪽 검색"
          className={input}
        />
        <button type="button" onClick={() => setPostcodeFor(which)} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-xs font-bold shrink-0">
          검색
        </button>
      </div>
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
    <form action={createPhoneSmallMoveAction} onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      {/* 플랫폼(오더 출처) */}
      <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2.5 text-sm">
        <h2 className="font-black">오더 출처 (플랫폼)</h2>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setChannel(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                channel === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700'
              }`}
            >
              {p.replace('전화:', '')}
            </button>
          ))}
        </div>
        <input
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          placeholder="직접 입력 (예: 전화:짐싸)"
          maxLength={40}
          className={input}
        />
      </section>

      {/* 고객 · 일정 */}
      <section className="bg-white rounded-2xl border border-gray-200 p-4 grid sm:grid-cols-2 gap-3 text-sm">
        <h2 className="font-black sm:col-span-2">고객 · 일정</h2>
        <label className="space-y-1">
          <span className="font-bold">고객명 *</span>
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="이름" maxLength={30} className={input} />
        </label>
        <label className="space-y-1">
          <span className="font-bold">연락처 *</span>
          <input value={contact} onChange={(e) => setContact(formatPhone(e.target.value))} inputMode="tel" placeholder="010-0000-0000" maxLength={13} className={input} />
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
        {sideBox('📍 출발지 *', from, setFrom, 'from')}
        {sideBox('🏠 도착지 *', to, setTo, 'to')}
      </div>

      {/* 물품 입력 */}
      <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 text-sm">
        <div className="sticky top-11 z-10 bg-white/95 backdrop-blur-xs -mx-4 -mt-4 px-4 pt-3.5 pb-3 border-b border-gray-200 rounded-t-2xl space-y-2.5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-black">물품 입력 (빠른 선택 · 검색 추가 · 규격/폐기)</h2>
            <span className="text-xs font-bold text-blue-700">
              유효 합계 {totalCbm.toFixed(2)}㎥ <span className="text-gray-400 font-normal">(내품 포함)</span>
            </span>
          </div>

          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-2.5 space-y-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="물품정보에서 추가 검색 (예: 냉장고, 침대, ㄴㅈㄱ)"
                className="w-full rounded-lg border border-blue-200 bg-white pl-9 pr-3 py-2 text-xs sm:text-sm outline-none focus:border-blue-500"
              />
            </div>
            {searchQuery.trim() && (
              searchResults.length === 0 ? (
                <p className="text-xs text-gray-500 px-1">일치하는 물품정보가 없습니다.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pt-1">
                  {searchResults.map((std) => (
                    <button
                      key={std.id}
                      type="button"
                      onClick={() => addStandardItem(std)}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-600 text-gray-800 hover:text-white border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Plus size={12} className="shrink-0" />
                      <ItemIconByName name={std.name} spec={std.spec} className="w-5 h-5 shrink-0 bg-white rounded" />
                      <span>{std.name}</span>
                      {std.spec && <span className="text-[11px] opacity-75">({std.spec})</span>}
                      <span className="text-[10px] text-blue-600 font-semibold">
                        {std.defaultCbm}{std.defaultInnerCbm > 0 ? `+${std.defaultInnerCbm}` : ''}㎥
                      </span>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* 소형 주요 물품 원터치 추가 */}
        <div className="space-y-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setQuickCat(c)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  quickCat === c ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-gray-300 text-gray-600'
                }`}
              >
                {SMALL_CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickSmallItems
              .filter((si) => si.category === quickCat)
              .map((si) => (
                <button
                  key={si.id}
                  type="button"
                  onClick={() => addQuickSmall(si)}
                  className="px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 text-xs font-bold flex items-center gap-1.5"
                >
                  <ItemIconByName name={si.stdName || si.name} spec={si.stdSpec || si.spec} className="w-5 h-5 shrink-0" />
                  <span>{si.name}</span>
                  <span className="text-[10px] text-gray-500 font-normal">({si.spec})</span>
                </button>
              ))}
          </div>
        </div>

        {/* 담긴 물품 목록 */}
        {items.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-end gap-1.5">
              <button type="button" onClick={expandAllCats} className="px-2.5 py-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-[11px] font-bold text-gray-700">
                모두펼침
              </button>
              <button type="button" onClick={collapseAllCats} className="px-2.5 py-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-[11px] font-bold text-gray-700">
                모두접기
              </button>
            </div>
            {CATEGORIES.map((cat) => {
              const catRows = items.map((it, idx) => ({ it, idx })).filter(({ it }) => it.category === cat)
              if (catRows.length === 0) return null
              const catSub = catRows.reduce((s, { it }) => s + effectiveUnit(it) * it.qty, 0)
              const isCollapsed = Boolean(collapsedCats[cat])
              return (
                <div key={cat}>
                  <button
                    type="button"
                    onClick={() => toggleCat(cat)}
                    className="w-full flex justify-between items-center text-xs font-bold text-blue-900 bg-blue-100 hover:bg-blue-200/70 border-l-4 border-blue-500 rounded-md px-2.5 py-1.5 mb-1.5 transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      <span>{SMALL_CATEGORY_LABEL[cat]} · {catRows.length}종</span>
                    </span>
                    <span className="font-semibold text-blue-700">({catSub.toFixed(2)}㎥)</span>
                  </button>
                  {!isCollapsed && (
                  <ul className="space-y-2">
                    {catRows.map(({ it, idx }) => {
                      const stdSpecs = specsByName.get(it.name) || []
                      const hasCurrentSpec = stdSpecs.some((s) => s.spec === it.spec)
                      const rowEff = effectiveUnit(it) * it.qty
                      return (
                        <li key={`${it.id}_${idx}`} className={`flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-xl border px-3 py-2 ${ACTION_ROW_STYLE[it.action]}`}>
                          <ItemIconByName name={it.name} spec={it.spec} className="w-9 h-9 shrink-0" />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="font-black text-xs sm:text-sm text-gray-900 flex flex-wrap items-center gap-1.5">
                              <span>{it.name}</span>
                              {it.action !== '이동' && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${ACTION_BTN_STYLE[it.action]}`}>
                                  {it.action} (내품만)
                                </span>
                              )}
                              <span className={`text-[11px] font-bold ${it.action !== '이동' ? 'text-red-700' : 'text-blue-700'}`}>
                                ({rowEff.toFixed(2)}㎥)
                              </span>
                            </div>
                            {stdSpecs.length > 0 ? (
                              <select
                                value={it.spec}
                                onChange={(e) => changeSpec(idx, e.target.value)}
                                className="w-full sm:w-auto max-w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-800"
                              >
                                {!hasCurrentSpec && <option value={it.spec}>{it.spec || '기본'}</option>}
                                {stdSpecs.map((s) => (
                                  <option key={s.id} value={s.spec}>
                                    {s.spec || '기본'} ({s.defaultCbm}{s.defaultInnerCbm > 0 ? `+${s.defaultInnerCbm}` : ''}㎥)
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="text-xs text-gray-500">{it.spec || '기본'}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                            <button
                              type="button"
                              onClick={() => cycleAction(idx)}
                              title="클릭하여 처리 변경: 이동 → 폐기 → 내림 → 존치"
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${ACTION_BTN_STYLE[it.action]}`}
                            >
                              {it.action}
                            </button>
                            <button type="button" onClick={() => changeQty(idx, -1)} className="w-7 h-7 rounded-full border border-gray-300 bg-white font-black">−</button>
                            <span className="w-6 text-center font-black text-sm">{it.qty}</span>
                            <button type="button" onClick={() => changeQty(idx, 1)} className="w-7 h-7 rounded-full bg-blue-600 text-white font-black">+</button>
                            <button type="button" onClick={() => removeItem(idx)} className="ml-0.5 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 text-sm">
        <h2 className="font-black">옵션 · 오더장 메모</h2>
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" checked={packingService} onChange={(e) => setPackingService(e.target.checked)} className="w-4 h-4" />
          포장 서비스(반포장)
        </label>
        <p className="text-xs text-gray-500">❄️ 에어컨은 탈거 후 운송만 가능하며 별도 추가 비용은 없습니다. (재설치 불가)</p>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="플랫폼 오더장 문자 원문이나 통화 메모를 붙여넣어 보관하세요."
          className={input}
        />
      </section>

      {error && <p className="text-sm font-bold text-red-600">{error}</p>}

      <div className="flex gap-2 sticky bottom-0 bg-gray-100/90 backdrop-blur py-2">
        <Link href="/small-moves" className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white font-bold text-sm">
          취소
        </Link>
        <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white font-black rounded-xl py-2.5 disabled:opacity-60">
          {saving ? '견적 산정 중...' : '저장하고 전화견적 확인'}
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
