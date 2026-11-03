'use client'

import React, { useState, useMemo } from 'react'
import { Package, RefreshCw, Plus, Trash2, CheckCircle2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import {
  PackingMaterialItem,
  RegisteredMaterialCatalogItem,
  DEFAULT_REGISTERED_MATERIALS,
  isExcludedMaterial,
} from '@/lib/packingMaterialCalculator'
import { CostStandardData } from '@/app/actions/costStandards'

interface PackingMaterialsSectionProps {
  packingMaterials: PackingMaterialItem[]
  onChange: (next: PackingMaterialItem[]) => void
  onRecalculate: () => void
  isAutoSync: boolean
  onToggleAutoSync: (val: boolean) => void
  registeredMaterials: RegisteredMaterialCatalogItem[]
  costStandards?: CostStandardData
  validItemCount: number
}

const CATEGORY_META: Record<
  PackingMaterialItem['category'],
  { title: string; shortLabel: string; badgeClass: string; icon: string }
> = {
  BOX: {
    title: '1. 포장박스 (단프라 의류/이불/대/중/소 · 옷걸이박스 미사용)',
    shortLabel: '포장박스',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: '📦',
  },
  BASKET: {
    title: '2. 바구니 · 아이스박스',
    shortLabel: '바구니·보냉',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: '🧺',
  },
  COVER: {
    title: '3. 가구 · 가전 · 침대 보호커버',
    shortLabel: '보호커버',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: '🛡️',
  },
  CONSUMABLE: {
    title: '4. 포장 소모품 (OPP 박스테이프 원가기준정보 연동 · 에어캡 · 랩 · 덧신)',
    shortLabel: '소모품',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: '🎗️',
  },
  PROTECTION: {
    title: '5. 현장 바닥보양재 · 운반 장비',
    shortLabel: '보양·장비',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: '🧰',
  },
}

export function PackingMaterialsSection({
  packingMaterials,
  onChange,
  onRecalculate,
  isAutoSync,
  onToggleAutoSync,
  registeredMaterials,
  costStandards,
  validItemCount,
}: PackingMaterialsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [selectedAddCode, setSelectedAddCode] = useState('')
  const [activeCategoryTab, setActiveCategoryTab] = useState<'ALL' | PackingMaterialItem['category']>('ALL')
  const [expandedCats, setExpandedCats] = useState<Record<PackingMaterialItem['category'], boolean>>({
    BOX: true,
    BASKET: false,
    COVER: false,
    CONSUMABLE: false,
    PROTECTION: false,
  })

  const toggleCatAccordion = (catKey: PackingMaterialItem['category']) => {
    setExpandedCats(prev => ({ ...prev, [catKey]: !prev[catKey] }))
  }

  const allCatsOpen = useMemo(() => {
    const activeKeys = (['BOX', 'BASKET', 'COVER', 'CONSUMABLE', 'PROTECTION'] as const).filter(k =>
      packingMaterials.some(m => m.category === k)
    )
    return activeKeys.length > 0 && activeKeys.every(k => expandedCats[k])
  }, [expandedCats, packingMaterials])

  const handleToggleAllCats = () => {
    const nextState = !allCatsOpen
    setExpandedCats({
      BOX: nextState,
      BASKET: nextState,
      COVER: nextState,
      CONSUMABLE: nextState,
      PROTECTION: nextState,
    })
  }

  // 옷걸이 박스를 제외한 전체 선택 가능 자재 목록
  const selectableCatalog = useMemo(() => {
    const map = new Map<string, RegisteredMaterialCatalogItem>()
    DEFAULT_REGISTERED_MATERIALS.forEach(m => {
      if (!isExcludedMaterial(m.code, m.name)) map.set(m.code, m)
    })
    registeredMaterials.forEach(m => {
      if (m.isActive !== false && !isExcludedMaterial(m.code, m.name)) {
        map.set(m.code, m)
      }
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [registeredMaterials])

  // 요약 지표 계산
  const summary = useMemo(() => {
    const boxTotal = packingMaterials
      .filter(m => m.category === 'BOX')
      .reduce((s, m) => s + (Number(m.quantity) || 0), 0)
    const basketTotal = packingMaterials
      .filter(m => m.category === 'BASKET')
      .reduce((s, m) => s + (Number(m.quantity) || 0), 0)
    const coverTotal = packingMaterials
      .filter(m => m.category === 'COVER')
      .reduce((s, m) => s + (Number(m.quantity) || 0), 0)
    const tapeItem = packingMaterials.find(m => m.code === 'MAT-TAPE-01' || m.name.includes('테이프'))
    return {
      boxTotal,
      basketTotal,
      coverTotal,
      tapeRolls: tapeItem ? tapeItem.quantity : 0,
    }
  }, [packingMaterials])

  const handleQtyChange = (code: string, nextQty: number) => {
    const safeQty = Math.max(0, Math.round(nextQty))
    onToggleAutoSync(false)
    if (safeQty === 0) {
      onChange(packingMaterials.filter(m => m.code !== code))
    } else {
      onChange(
        packingMaterials.map(m => (m.code === code ? { ...m, quantity: safeQty } : m))
      )
    }
  }

  const handleRemove = (code: string) => {
    onToggleAutoSync(false)
    onChange(packingMaterials.filter(m => m.code !== code))
  }

  const handleAddMaterial = (code: string) => {
    if (!code) return
    const found = selectableCatalog.find(c => c.code === code)
    if (!found) return

    onToggleAutoSync(false)
    const existing = packingMaterials.find(m => m.code === code)
    if (existing) {
      onChange(
        packingMaterials.map(m =>
          m.code === code ? { ...m, quantity: m.quantity + 1 } : m
        )
      )
    } else {
      const cat: PackingMaterialItem['category'] =
        found.category === 'BOX'
          ? 'BOX'
          : found.category === 'BASKET'
          ? 'BASKET'
          : found.category === 'COVER'
          ? 'COVER'
          : found.category === 'TOOL'
          ? 'PROTECTION'
          : 'CONSUMABLE'

      onChange([
        ...packingMaterials,
        {
          code: found.code,
          name: found.name,
          category: cat,
          unit: found.unit || '개',
          spec: found.memo || '',
          quantity: 1,
          reason: '수동 추가 자재',
          source: 'REGISTERED',
        },
      ])
    }
    setSelectedAddCode('')
  }

  const tape5T = costStandards?.tapeRolls5Ton ?? 8
  const tape2_5T = costStandards?.tapeRolls2_5Ton ?? 5
  const tape1T = costStandards?.tapeRolls1Ton ?? 3

  return (
    <div className="pt-3 border-t border-gray-100">
      <div className="bg-slate-50/70 rounded-xl border border-slate-200/90 overflow-hidden">
        {/* 헤더 바 */}
        <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-white border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs shrink-0">
              <Package size={15} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-extrabold text-gray-900 text-xs sm:text-sm">
                  필요 포장자재 소요량 산출
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  자재마스터 + 원가기준정보 연동
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  옷걸이박스 제외
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                견적 물품·내품 CBM 및 투입차량 기준으로 자동 산출되며, OPP 박스테이프는 원가기준정보(5톤 {tape5T}롤 / 2.5톤 {tape2_5T}롤 / 1톤 {tape1T}롤)를 참조합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => {
                onToggleAutoSync(true)
                onRecalculate()
              }}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-all active:scale-95 whitespace-nowrap cursor-pointer"
              title="현재 입력된 물품과 차량/인력 기준으로 포장자재 소요량을 다시 계산합니다"
            >
              <RefreshCw size={12} />
              <span>물품·차량 기준 자동산출</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              className="px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-0.5 border border-gray-300 whitespace-nowrap cursor-pointer"
            >
              <span>{isExpanded ? '접기' : '펼치기'}</span>
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* 분류별 필터 탭 & 요약 바 */}
        <div className="px-3 py-2 sm:px-4 bg-slate-100/70 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveCategoryTab('ALL')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
                activeCategoryTab === 'ALL'
                  ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>전체 분류</span>
              <span className="text-[11px] opacity-80">({packingMaterials.length}종)</span>
            </button>

            {(['BOX', 'BASKET', 'COVER', 'CONSUMABLE', 'PROTECTION'] as const).map(catKey => {
              const meta = CATEGORY_META[catKey]
              const catItems = packingMaterials.filter(m => m.category === catKey)
              const catSum = catItems.reduce((s, m) => s + (Number(m.quantity) || 0), 0)
              const isSelected = activeCategoryTab === catKey
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => {
                    setActiveCategoryTab(catKey)
                    setExpandedCats(prev => ({ ...prev, [catKey]: true }))
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-gray-800 border-gray-200 hover:border-blue-300 shadow-2xs'
                  }`}
                >
                  <span>{meta.icon} {meta.shortLabel}</span>
                  <strong className={isSelected ? 'text-white' : 'text-blue-700'}>
                    {catSum}{catItems[0]?.unit || '개'}
                  </strong>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            {activeCategoryTab === 'ALL' && packingMaterials.length > 0 && (
              <button
                type="button"
                onClick={handleToggleAllCats}
                className="px-2 py-0.5 rounded-md bg-white hover:bg-gray-100 text-gray-700 font-bold border border-gray-300 transition-colors cursor-pointer"
              >
                {allCatsOpen ? '분류 전체 접기 ▲' : '분류 전체 펼치기 ▼'}
              </button>
            )}
            {isAutoSync ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Sparkles size={11} />
                물품·차량 변경 시 실시간 자동산출 중
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <CheckCircle2 size={11} />
                수동 조정됨 ([물품·차량 기준 자동산출] 클릭 시 재계산)
              </span>
            )}
          </div>
        </div>

        {/* 상세 리스트 (종류별 아코디언) */}
        {isExpanded && (
          <div className="p-3 sm:p-4 space-y-2.5">
            {packingMaterials.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center space-y-2">
                <p className="text-xs sm:text-sm font-bold text-gray-600">
                  {validItemCount === 0
                    ? '위 물품 목록에서 이사할 물품 수량을 입력하면 필요한 포장자재 소요량이 자동으로 산출됩니다.'
                    : '산출된 포장자재 내역이 없습니다. 우측 상단 [물품·차량 기준 자동산출] 버튼을 눌러주세요.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {(['BOX', 'BASKET', 'COVER', 'CONSUMABLE', 'PROTECTION'] as const)
                  .filter(catKey => activeCategoryTab === 'ALL' || activeCategoryTab === catKey)
                  .map(catKey => {
                    const groupItems = packingMaterials.filter(m => m.category === catKey)
                    if (groupItems.length === 0) return null
                    const meta = CATEGORY_META[catKey]
                    const isCatOpen = activeCategoryTab === catKey || Boolean(expandedCats[catKey])

                    return (
                      <div key={catKey} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                        {/* 종류별 아코디언 헤더 */}
                        <button
                          type="button"
                          onClick={() => toggleCatAccordion(catKey)}
                          className={`w-full px-3 py-2 text-xs font-extrabold flex items-center justify-between transition-colors cursor-pointer ${
                            isCatOpen ? 'border-b' : ''
                          } ${meta.badgeClass}`}
                        >
                          <span className="flex items-center gap-1.5 text-left">
                            <span>{meta.icon}</span>
                            <span>{meta.title}</span>
                          </span>
                          <span className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-[11px] font-bold bg-white/80 px-2 py-0.5 rounded-full border border-current/20">
                              {groupItems.length}종 · 합계 {groupItems.reduce((s, i) => s + i.quantity, 0).toLocaleString()} {groupItems[0]?.unit || '개'}
                            </span>
                            {isCatOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </span>
                        </button>

                        {/* 접혀 있을 때 한 줄 요약 프리뷰 */}
                        {!isCatOpen && (
                          <div
                            onClick={() => toggleCatAccordion(catKey)}
                            className="px-3 py-2 bg-white hover:bg-gray-50/80 transition-colors cursor-pointer flex flex-wrap items-center gap-1.5"
                          >
                            {groupItems.map(item => (
                              <span
                                key={item.code}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-[11px] text-gray-700 font-semibold"
                              >
                                <span>{item.name}</span>
                                <strong className="text-blue-700 font-extrabold">
                                  {item.quantity}{item.unit}
                                </strong>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 펼쳐졌을 때 상세 편집 목록 */}
                        {isCatOpen && (
                          <div className="divide-y divide-gray-100">
                            {groupItems.map(item => (
                              <div
                                key={item.code}
                                className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50/70 transition-colors"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs sm:text-sm text-gray-900">
                                      {item.name}
                                    </span>
                                    {item.spec && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                                        {item.spec}
                                      </span>
                                    )}
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                        item.source === 'REGISTERED'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-amber-50 text-amber-800 border-amber-200'
                                      }`}
                                    >
                                      {item.source === 'REGISTERED' ? '등록자재' : '일반기준'}
                                    </span>
                                  </div>
                                  {item.reason && (
                                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                                      산출근거: {item.reason}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleQtyChange(item.code, item.quantity - 1)}
                                    className="w-6 h-6 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    value={item.quantity}
                                    onChange={e => handleQtyChange(item.code, parseInt(e.target.value, 10) || 0)}
                                    className="w-14 h-6 rounded border border-gray-300 bg-white px-1.5 text-right text-xs font-extrabold text-blue-700 outline-none focus:border-blue-500"
                                  />
                                  <span className="text-xs font-bold text-gray-600 w-6">
                                    {item.unit}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleQtyChange(item.code, item.quantity + 1)}
                                    className="w-6 h-6 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center cursor-pointer"
                                  >
                                    +
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemove(item.code)}
                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                                    title="자재 제외"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}

            {/* 등록 자재 수동 추가 드롭다운 */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 shrink-0">
                <Plus size={13} className="text-blue-600" />
                <span>자재 추가:</span>
              </div>
              <select
                value={selectedAddCode}
                onChange={e => handleAddMaterial(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">+ 자재 마스터 목록에서 포장자재 선택 추가 (옷걸이박스 제외)...</option>
                {selectableCatalog.map(m => (
                  <option key={m.code} value={m.code}>
                    {m.name} {m.memo ? `[${m.memo}]` : ''} ({m.unit})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 서버 및 오프라인 DB 저장을 위한 hidden input */}
      <input type="hidden" name="materials" value={JSON.stringify(packingMaterials)} />
    </div>
  )
}
