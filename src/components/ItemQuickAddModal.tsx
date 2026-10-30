'use client'

import React, { useState, useMemo } from 'react'
import { Search, X, Plus, Check, Sparkles, PackagePlus } from 'lucide-react'
import {
  CHOSUNG_BUTTONS,
  ChosungFilter,
  ITEM_MID_CATEGORIES,
  ItemMidCategory,
  matchesChosungFilter,
  matchesKoreanSearch,
  classifyItemMidCategory,
  convertEngInputToKor,
} from '@/lib/itemFilterUtils'
import { isBoxItem } from './EstimateForm'

interface ItemQuickAddModalProps {
  isOpen: boolean
  onClose: () => void
  categoryId: string
  categoryName: string
  standardItems: any[]
  currentCategoryItems: any[]
  onAddItem: (stdItem: any) => void
  onAddCustomItem?: (name: string, spec: string, cbm: number) => void
}

export function ItemQuickAddModal({
  isOpen,
  onClose,
  categoryId,
  categoryName,
  standardItems,
  currentCategoryItems,
  onAddItem,
  onAddCustomItem,
}: ItemQuickAddModalProps) {
  const [scope, setScope] = useState<'all' | 'matched'>('all')
  const [midCat, setMidCat] = useState<Exclude<ItemMidCategory, 'selected'>>('all')
  const [chosung, setChosung] = useState<ChosungFilter>('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [justAddedIds, setJustAddedIds] = useState<Record<string, number>>({})

  // 직접입력 폼 상태
  const [customName, setCustomName] = useState('')
  const [customSpec, setCustomSpec] = useState('')
  const [customCbm, setCustomCbm] = useState<string>('0.5')

  // 현재 공간에 이미 수량 > 0으로 담긴 품목+규격 카운트 맵
  const existingQtyMap = useMemo(() => {
    const map: Record<string, number> = {}
    currentCategoryItems.forEach(it => {
      const q = Number(it.quantity) || 0
      if (q > 0) {
        const key = `${it.name}__${it.spec || ''}`
        map[key] = (map[key] || 0) + q
        map[it.name] = (map[it.name] || 0) + q
      }
    })
    return map
  }, [currentCategoryItems])

  // 품목명별로 규격들을 그룹핑
  const groupedStandardItems = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string
        isMatchedLocation: boolean
        midCategory: Exclude<ItemMidCategory, 'all' | 'selected'>
        specs: any[]
      }
    >()

    standardItems.forEach(item => {
      const isMatched = categoryId
        ? Boolean(item.locations?.some((l: any) => l.id === categoryId))
        : !item.locations || item.locations.length === 0

      const existing = map.get(item.name)
      if (existing) {
        if (isMatched) existing.isMatchedLocation = true
        existing.specs.push(item)
      } else {
        map.set(item.name, {
          name: item.name,
          isMatchedLocation: isMatched,
          midCategory: classifyItemMidCategory(item.name),
          specs: [item],
        })
      }
    })

    const list = Array.from(map.values())
    list.forEach(group => {
      group.specs.sort((a, b) => (a.spec || '').localeCompare(b.spec || '', 'ko'))
    })

    // 정렬: 1순위 BOX, 2순위 현재 공간 지정 품목, 3순위 가나다순
    list.sort((a, b) => {
      const aBox = isBoxItem(a.name)
      const bBox = isBoxItem(b.name)
      if (aBox && !bBox) return -1
      if (!aBox && bBox) return 1
      if (a.isMatchedLocation && !b.isMatchedLocation) return -1
      if (!a.isMatchedLocation && b.isMatchedLocation) return 1
      return a.name.localeCompare(b.name, 'ko')
    })

    return list
  }, [standardItems, categoryId])

  // 필터링된 그룹 목록
  const filteredGroups = useMemo(() => {
    return groupedStandardItems.filter(group => {
      if (scope === 'matched' && !group.isMatchedLocation) return false
      if (midCat !== 'all' && group.midCategory !== midCat) return false
      if (chosung !== '전체' && !matchesChosungFilter(group.name, chosung)) return false
      if (searchQuery.trim()) {
        const matchesNameOrAnySpec =
          matchesKoreanSearch(group.name, '', searchQuery) ||
          group.specs.some(s => matchesKoreanSearch(group.name, s.spec, searchQuery))
        if (!matchesNameOrAnySpec) return false
      }
      return true
    })
  }, [groupedStandardItems, scope, midCat, chosung, searchQuery])

  if (!isOpen) return null

  const handleTapSpec = (stdItem: any) => {
    onAddItem(stdItem)
    setJustAddedIds(prev => ({
      ...prev,
      [stdItem.id]: (prev[stdItem.id] || 0) + 1,
    }))
  }

  const handleAddCustom = () => {
    if (!customName.trim() || !onAddCustomItem) return
    onAddCustomItem(customName.trim(), customSpec.trim(), parseFloat(customCbm) || 0)
    setCustomName('')
    setCustomSpec('')
    setCustomCbm('0.5')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <PackagePlus size={18} className="text-amber-300" />
            <div>
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-1.5">
                <span>[{categoryName || '기타/미지정'}] 품목 빠른 검색·추가</span>
              </h3>
              <p className="text-[11px] text-blue-100">
                초성(ㄱ~ㅎ)·분류·검색으로 원하는 물품 규격을 탭하면 즉시 1개씩 추가됩니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 상단 검색 및 필터 바 */}
        <div className="p-3 bg-gray-50 border-b border-gray-200 space-y-2 shrink-0">
          {/* 1열: 검색창 + 공간 범위 토글 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                lang="ko"
                inputMode="text"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                style={{ imeMode: 'active' } as React.CSSProperties}
                value={searchQuery}
                onChange={e => setSearchQuery(convertEngInputToKor(e.target.value))}
                placeholder="품목명 또는 초성 검색 (예: 침대, ㅊㄷ — 영타도 한글로 자동변환)"
                className="w-full pl-9 pr-8 py-1.5 sm:py-2 rounded-xl border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center bg-gray-200/80 p-0.5 rounded-xl border border-gray-300 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  scope === 'all' ? 'bg-white text-blue-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                전체 품목 ({groupedStandardItems.length})
              </button>
              <button
                type="button"
                onClick={() => setScope('matched')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  scope === 'matched' ? 'bg-white text-blue-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {categoryName} 지정만 ({groupedStandardItems.filter(g => g.isMatchedLocation).length})
              </button>
            </div>
          </div>

          {/* 2열: 중분류(박스/가구/가전/생활) 칩 */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {ITEM_MID_CATEGORIES.filter(c => c.key !== 'selected').map(cat => {
              const isSelected = midCat === cat.key
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setMidCat(cat.key as Exclude<ItemMidCategory, 'selected'>)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>

          {/* 3열: 초성(ㄱ~ㅎ) 원터치 버튼 */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
            {CHOSUNG_BUTTONS.map(ch => {
              const isSelected = chosung === ch
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChosung(ch)}
                  className={`min-w-[28px] h-7 px-1.5 rounded-md text-xs font-extrabold transition-all shrink-0 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-indigo-50 hover:border-indigo-300'
                  }`}
                >
                  {ch}
                </button>
              )
            })}
          </div>
        </div>

        {/* 중앙 품목 리스트 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
          {filteredGroups.length === 0 ? (
            <div className="py-10 text-center text-gray-500 text-xs sm:text-sm space-y-2">
              <p className="font-bold text-gray-700">조건에 맞는 기준 품목이 없습니다.</p>
              <p className="text-xs text-gray-400">
                검색어나 초성 필터를 해제하거나 아래 [직접입력 추가]를 이용해 주세요.
              </p>
              {(chosung !== '전체' || midCat !== 'all' || scope !== 'all' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setChosung('전체')
                    setMidCat('all')
                    setScope('all')
                    setSearchQuery('')
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200 hover:bg-blue-100"
                >
                  필터 전체 초기화
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredGroups.map(group => {
                const totalExistingQty = existingQtyMap[group.name] || 0
                return (
                  <div
                    key={group.name}
                    className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                      totalExistingQty > 0
                        ? 'border-blue-400 bg-blue-50/30 ring-1 ring-blue-100'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-extrabold text-gray-900 text-xs sm:text-sm truncate">
                          {group.name}
                        </span>
                        {group.isMatchedLocation && (
                          <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[10px] font-bold shrink-0">
                            {categoryName}
                          </span>
                        )}
                      </div>
                      {totalExistingQty > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold shrink-0">
                          현재 {totalExistingQty}개
                        </span>
                      )}
                    </div>

                    {/* 규격별 원터치 추가 버튼들 */}
                    <div className="flex flex-wrap gap-1.5">
                      {group.specs.map(specItem => {
                        const specLabel = specItem.spec || '기본'
                        const specKey = `${group.name}__${specItem.spec || ''}`
                        const specQty = existingQtyMap[specKey] || 0
                        const addedNow = justAddedIds[specItem.id] || 0

                        return (
                          <button
                            key={specItem.id}
                            type="button"
                            onClick={() => handleTapSpec(specItem)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 active:scale-95 ${
                              specQty > 0 || addedNow > 0
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-gray-50 hover:bg-blue-50 text-gray-800 hover:text-blue-700 border-gray-300 hover:border-blue-400'
                            }`}
                          >
                            <Plus size={12} className="stroke-[2.5] shrink-0" />
                            <span>{specLabel}</span>
                            <span
                              className={`text-[10px] font-normal ${
                                specQty > 0 || addedNow > 0 ? 'text-blue-100' : 'text-gray-500'
                              }`}
                            >
                              ({specItem.defaultCbm}
                              {(specItem.defaultInnerCbm || 0) > 0 ? `+${specItem.defaultInnerCbm}` : ''})
                            </span>
                            {specQty > 0 && (
                              <span className="ml-0.5 px-1 rounded bg-white text-blue-700 text-[10px] font-extrabold">
                                {specQty}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 하단: 기준정보에 없는 품목 직접 입력 추가 & 닫기 */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          {onAddCustomItem ? (
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              <span className="text-xs font-bold text-gray-700 whitespace-nowrap">직접입력:</span>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="품목명"
                className="w-28 sm:w-32 px-2 py-1 rounded-lg border border-gray-300 bg-white text-xs font-medium outline-none focus:border-blue-500"
              />
              <input
                type="text"
                value={customSpec}
                onChange={e => setCustomSpec(e.target.value)}
                placeholder="규격(선택)"
                className="w-24 sm:w-28 px-2 py-1 rounded-lg border border-gray-300 bg-white text-xs font-medium outline-none focus:border-blue-500"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={customCbm}
                  onChange={e => setCustomCbm(e.target.value)}
                  className="w-14 px-1.5 py-1 rounded-lg border border-gray-300 bg-white text-xs font-bold text-right outline-none focus:border-blue-500"
                />
                <span className="text-[11px] text-gray-500">CBM</span>
              </div>
              <button
                type="button"
                onClick={handleAddCustom}
                disabled={!customName.trim()}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xs font-bold transition-colors"
              >
                + 직접 추가
              </button>
            </div>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs sm:text-sm font-extrabold transition-colors shrink-0"
          >
            완료 / 닫기
          </button>
        </div>
      </div>
    </div>
  )
}

