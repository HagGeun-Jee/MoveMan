'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  Minus,
  Trash2,
  Sparkles,
  Search,
  X,
  PackagePlus,
  CheckCircle2,
  ArrowUpDown,
} from 'lucide-react'
import { isBoxItem, getItemEffectiveCbm, ensureItemUid } from './EstimateForm'
import { UnassignedBoxTooltip } from './UnassignedBoxTooltip'
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
import { ItemQuickAddModal } from './ItemQuickAddModal'

interface QuickTouchCbmPanelProps {
  categories: any[]
  availableCategoriesToAdd?: any[]
  onAddCategory?: (catId: string) => void
  onRemoveCategory?: (catId: string) => void
  items: any[]
  setItems: React.Dispatch<React.SetStateAction<any[]>>
  standardItems: any[]
  activeCategoryId?: string
  setActiveCategoryId?: (id: string) => void
}

export function QuickTouchCbmPanel({
  categories,
  availableCategoriesToAdd = [],
  onAddCategory,
  onRemoveCategory,
  items,
  setItems,
  standardItems,
  activeCategoryId: externalActiveId,
  setActiveCategoryId: externalSetActiveId,
}: QuickTouchCbmPanelProps) {
  // 공간 탭 (표시 대상 공간 목록)
  const [internalActiveId, setInternalActiveId] = useState<string>(categories[0]?.id || '')
  const activeCategoryId = externalActiveId !== undefined ? externalActiveId : internalActiveId
  const setActiveCategoryId = externalSetActiveId || setInternalActiveId

  // 필터 상태 (중분류 / 초성 / 검색어 / 선택우선정렬)
  const [midCategory, setMidCategory] = useState<ItemMidCategory>('all')
  const [chosung, setChosung] = useState<ChosungFilter>('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFirst, setSelectedFirst] = useState(false)
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false)

  // 활성 탭이 현재 카테고리 목록에 없으면 첫 번째 탭으로 자동 전환
  useEffect(() => {
    if (categories.length > 0 && !categories.some(c => c.id === activeCategoryId)) {
      setActiveCategoryId(categories[0].id)
    }
  }, [categories, activeCategoryId, setActiveCategoryId])

  const activeCategory =
    categories.find(c => c.id === activeCategoryId) || categories[0] || { id: '', name: '기타/미지정' }

  // 공간 변경 시 초성/검색어는 초기화하여 혼선 방지
  const handleSelectSpace = (catId: string) => {
    setActiveCategoryId(catId)
    setChosung('전체')
    setSearchQuery('')
    if (midCategory === 'selected') {
      setMidCategory('all')
    }
  }

  // 현재 공간의 품목들
  const currentCategoryItems = useMemo(
    () => items.filter(i => (i.locationId || '') === activeCategoryId),
    [items, activeCategoryId]
  )

  // 현재 공간에서 수량 > 0 인 품목 개수
  const selectedCountInSpace = useMemo(
    () => currentCategoryItems.filter(i => (Number(i.quantity) || 0) > 0).length,
    [currentCategoryItems]
  )

  // 현재 공간의 중분류별 품목 수 카운트
  const midCategoryCounts = useMemo(() => {
    const counts: Record<ItemMidCategory, number> = {
      all: currentCategoryItems.length,
      selected: selectedCountInSpace,
      box: 0,
      furniture: 0,
      appliance: 0,
      living: 0,
    }
    currentCategoryItems.forEach(it => {
      const cat = classifyItemMidCategory(it.name)
      counts[cat] = (counts[cat] || 0) + 1
    })
    return counts
  }, [currentCategoryItems, selectedCountInSpace])

  // 현재 공간에 존재하는 초성 집합 (버튼 시각적 활성 표시용)
  const availableChosungsInSpace = useMemo(() => {
    const set = new Set<string>(['전체'])
    currentCategoryItems.forEach(it => {
      CHOSUNG_BUTTONS.forEach(ch => {
        if (ch !== '전체' && matchesChosungFilter(it.name, ch)) {
          set.add(ch)
        }
      })
    })
    return set
  }, [currentCategoryItems])

  // 필터링된 현재 공간 품목 리스트
  const filteredCategoryItems = useMemo(() => {
    let list = currentCategoryItems.filter(it => {
      const qty = Number(it.quantity) || 0
      if (midCategory === 'selected' && qty <= 0) return false
      if (
        midCategory !== 'all' &&
        midCategory !== 'selected' &&
        classifyItemMidCategory(it.name) !== midCategory
      ) {
        return false
      }
      if (chosung !== '전체' && !matchesChosungFilter(it.name, chosung)) {
        return false
      }
      if (searchQuery.trim() && !matchesKoreanSearch(it.name, it.spec, searchQuery)) {
        return false
      }
      return true
    })

    if (selectedFirst) {
      list = [...list].sort((a, b) => {
        const aHas = (Number(a.quantity) || 0) > 0 ? 1 : 0
        const bHas = (Number(b.quantity) || 0) > 0 ? 1 : 0
        if (aHas !== bHas) return bHas - aHas
        return 0
      })
    }

    return list
  }, [currentCategoryItems, midCategory, chosung, searchQuery, selectedFirst])

  // 초성 또는 검색어가 입력되었을 때, 현재 공간 카드에는 없지만 전체 기준정보(standardItems)에 있는 품목 추천
  const extraStandardMatches = useMemo(() => {
    if (chosung === '전체' && !searchQuery.trim() && (midCategory === 'all' || midCategory === 'selected')) {
      return []
    }
    const existingNames = new Set(currentCategoryItems.map(i => i.name))
    const map = new Map<string, any>()
    standardItems.forEach(s => {
      if (existingNames.has(s.name)) return
      if (
        midCategory !== 'all' &&
        midCategory !== 'selected' &&
        classifyItemMidCategory(s.name) !== midCategory
      ) {
        return
      }
      if (chosung !== '전체' && !matchesChosungFilter(s.name, chosung)) return
      if (searchQuery.trim() && !matchesKoreanSearch(s.name, s.spec, searchQuery)) return
      if (!map.has(s.name)) {
        map.set(s.name, s)
      }
    })
    return Array.from(map.values()).slice(0, 12)
  }, [standardItems, currentCategoryItems, chosung, searchQuery, midCategory])

  // 현재 공간 총 CBM
  const currentCategoryCbm = currentCategoryItems.reduce((acc, it) => acc + getItemEffectiveCbm(it), 0)

  // 수량 변경 함수
  const handleUpdateQty = (itemUid: string, delta: number) => {
    setItems(prev => {
      return prev.map(it => {
        if (it._uid === itemUid) {
          const currentQty = Number(it.quantity) || 0
          const nextQty = Math.max(0, currentQty + delta)
          let nextCbm = Number(it.cbm) || 0
          let nextInnerCbm = Number(it.innerBoxCbm) || 0
          let nextSpec = it.spec || ''

          // 수량을 올리는데 cbm과 innerBoxCbm이 0이면 standardItems에서 자동 보강
          if (nextQty > 0 && nextCbm === 0 && nextInnerCbm === 0) {
            const matched =
              standardItems.find(
                s => s.name === it.name && (nextSpec ? (s.spec || '기본') === nextSpec : true)
              ) || standardItems.find(s => s.name === it.name)
            if (matched) {
              nextCbm = matched.defaultCbm
              nextInnerCbm = matched.defaultInnerCbm || 0
              if (!nextSpec) nextSpec = matched.spec || ''
            }
          }

          return {
            ...it,
            spec: nextSpec,
            cbm: nextCbm,
            innerBoxCbm: nextInnerCbm,
            quantity: nextQty,
          }
        }
        return it
      })
    })
  }

  // 규격 변경 함수
  const handleUpdateSpec = (itemUid: string, newSpec: string) => {
    setItems(prev => {
      return prev.map(it => {
        if (it._uid === itemUid) {
          const matched = standardItems.find(s => s.name === it.name && (s.spec || '기본') === newSpec)
          const newCbm = matched ? matched.defaultCbm : it.cbm
          const newInnerCbm = matched ? matched.defaultInnerCbm : it.innerBoxCbm
          return {
            ...it,
            spec: newSpec,
            cbm: newCbm,
            innerBoxCbm: newInnerCbm,
            quantity: it.quantity === 0 ? 1 : it.quantity,
          }
        }
        return it
      })
    })
  }

  // 처리옵션 변경 (이동 -> 폐기 -> 내림 -> 경유 -> 존치 -> 이동 순환)
  const handleCycleTreatment = (itemUid: string) => {
    const cycle: Record<string, string> = {
      이동: '폐기',
      폐기: '내림',
      내림: '경유',
      경유: '존치',
      존치: '이동',
    }
    setItems(prev => {
      return prev.map(it => {
        if (it._uid === itemUid) {
          const currentT = it.treatment || '이동'
          return { ...it, treatment: cycle[currentT] || '이동' }
        }
        return it
      })
    })
  }

  // 품목 삭제
  const handleDeleteItem = (itemUid: string) => {
    setItems(prev => prev.filter(it => it._uid !== itemUid))
  }

  // 기준품목 객체로 현재 공간에 추가 또는 수량 +1
  const handleAddFromStandardObj = (stdItem: any) => {
    if (!stdItem) return
    setItems(prev => {
      // 1. 동일 공간 + 동일 품목명 + 동일 규격이 이미 있는지 확인
      const exactIdx = prev.findIndex(
        it =>
          (it.locationId || '') === activeCategoryId &&
          it.name === stdItem.name &&
          (it.spec || '') === (stdItem.spec || '')
      )
      if (exactIdx >= 0) {
        const next = [...prev]
        const cur = next[exactIdx]
        next[exactIdx] = {
          ...cur,
          spec: stdItem.spec || cur.spec || '',
          cbm: stdItem.defaultCbm ?? cur.cbm,
          innerBoxCbm: stdItem.defaultInnerCbm ?? cur.innerBoxCbm ?? 0,
          quantity: (Number(cur.quantity) || 0) + 1,
        }
        return next
      }

      // 2. 동일 공간 + 동일 품목명인데 수량이 0인 기본 빈 카드가 있는지 확인
      const emptyIdx = prev.findIndex(
        it =>
          (it.locationId || '') === activeCategoryId &&
          it.name === stdItem.name &&
          (Number(it.quantity) || 0) === 0
      )
      if (emptyIdx >= 0) {
        const next = [...prev]
        const cur = next[emptyIdx]
        next[emptyIdx] = {
          ...cur,
          spec: stdItem.spec || '',
          cbm: stdItem.defaultCbm ?? 0,
          innerBoxCbm: stdItem.defaultInnerCbm ?? 0,
          quantity: 1,
        }
        return next
      }

      // 3. 없으면 신규 카드 추가
      return [
        ...prev,
        ensureItemUid({
          locationId: activeCategoryId,
          locationName: activeCategory?.name || '기타/미지정',
          name: stdItem.name,
          spec: stdItem.spec || '',
          quantity: 1,
          cbm: stdItem.defaultCbm ?? 0.5,
          innerBoxCbm: stdItem.defaultInnerCbm ?? 0,
          treatment: '이동',
        }),
      ]
    })
  }

  // 직접입력 품목 추가
  const handleAddCustomItem = (name: string, spec: string, cbm: number) => {
    setItems(prev => [
      ...prev,
      ensureItemUid({
        locationId: activeCategoryId,
        locationName: activeCategory?.name || '기타/미지정',
        name,
        spec,
        quantity: 1,
        cbm,
        innerBoxCbm: 0,
        treatment: '이동',
      }),
    ])
  }

  const isFiltering = midCategory !== 'all' || chosung !== '전체' || Boolean(searchQuery.trim())

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs space-y-3 p-3 sm:p-4">
      {/* 1. 상단 공간 선택 칩 바 (가로 스크롤) */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {categories.map(cat => {
            const catItems = items.filter(i => (i.locationId || '') === cat.id)
            const catCbm = catItems.reduce((acc, it) => acc + getItemEffectiveCbm(it), 0)
            const hasQty = catItems.some(it => (Number(it.quantity) || 0) > 0)
            const isSelected = activeCategoryId === cat.id

            return (
              <div key={cat.id} className="shrink-0 flex items-center">
                <button
                  type="button"
                  onClick={() => handleSelectSpace(cat.id)}
                  className={`flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                      : hasQty
                      ? 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100/80'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                  }`}
                >
                  <span>{cat.name}</span>
                  {catCbm > 0 && (
                    <span
                      className={`text-[10px] sm:text-[11px] font-extrabold px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-blue-200/80 text-blue-800'
                      }`}
                    >
                      {catCbm.toFixed(1)}
                    </span>
                  )}
                  {onRemoveCategory && categories.length > 1 && (
                    <span
                      onClick={e => {
                        e.stopPropagation()
                        onRemoveCategory(cat.id)
                      }}
                      title="이 공간 삭제 (비우기)"
                      className={`p-0.5 rounded-full hover:bg-black/10 transition-colors ml-0.5 ${
                        isSelected ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <Trash2 size={12} />
                    </span>
                  )}
                </button>
              </div>
            )
          })}

          {/* + 공간 추가 버튼 / 드롭다운 */}
          {onAddCategory && availableCategoriesToAdd.length > 0 && (
            <div className="shrink-0 relative">
              <select
                value=""
                onChange={e => {
                  if (e.target.value) {
                    onAddCategory(e.target.value)
                    handleSelectSpace(e.target.value)
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-white hover:bg-blue-50 text-blue-600 border-2 border-dashed border-blue-300 hover:border-blue-500 cursor-pointer outline-none transition-all shadow-2xs"
              >
                <option value="" disabled>
                  + 공간 추가 ▾
                </option>
                {availableCategoriesToAdd.map(c => (
                  <option key={c.id} value={c.id}>
                    + {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 현재 공간 요약 배지 */}
        <div className="shrink-0 text-right pl-2 hidden sm:block">
          <div className="text-xs text-gray-500 font-medium">현재 공간 합계</div>
          <div className="text-sm font-extrabold text-blue-700">{currentCategoryCbm.toFixed(2)} CBM</div>
        </div>
      </div>

      {/* 2. 스마트 필터 바 (중분류 탭 + 초성 ㄱ~ㅎ + 실시간 검색 + 빠른 품목 추가) */}
      <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-2 sm:p-2.5 space-y-2">
        {/* 상단 줄: 중분류 칩 + 검색창 + 빠른 추가 모달 버튼 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* 중분류 & 선택됨 필터 칩 */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {ITEM_MID_CATEGORIES.map(cat => {
              const count = midCategoryCounts[cat.key] || 0
              const isSelected = midCategory === cat.key
              const isSelectedTab = cat.key === 'selected'
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setMidCategory(cat.key)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1 border ${
                    isSelected
                      ? isSelectedTab
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : isSelectedTab && count > 0
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <span>{cat.shortLabel}</span>
                  <span
                    className={`text-[10px] px-1 py-0.1 rounded-full font-bold ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : isSelectedTab && count > 0
                        ? 'bg-emerald-200/80 text-emerald-900'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}

            {/* 선택된 품목 상단 정렬 토글 */}
            {selectedCountInSpace > 0 && midCategory !== 'selected' && (
              <button
                type="button"
                onClick={() => setSelectedFirst(prev => !prev)}
                title="수량이 입력된 품목을 맨 앞에 모아서 표시합니다"
                className={`px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 border ${
                  selectedFirst
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                }`}
              >
                <ArrowUpDown size={11} />
                <span>선택우선</span>
              </button>
            )}
          </div>

          {/* 우측: 빠른 검색창 + 전체 품목 검색 모달 버튼 */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto flex-1 sm:flex-initial justify-end">
            <div className="relative flex-1 sm:w-48 md:w-56">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
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
                placeholder="품목·초성 검색 (예: 침대, ㅊㄷ)"
                className="w-full pl-7 pr-6 py-1 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-800 outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsQuickAddModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1 shadow-2xs shrink-0 whitespace-nowrap active:scale-95 transition-all"
            >
              <PackagePlus size={13} />
              <span>+ 품목 검색추가</span>
            </button>
          </div>
        </div>

        {/* 하단 줄: 초성(ㄱ~ㅎ) 원터치 필터 바 */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {CHOSUNG_BUTTONS.map(ch => {
              const isSelected = chosung === ch
              const hasInSpace = availableChosungsInSpace.has(ch)
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChosung(prev => (prev === ch && ch !== '전체' ? '전체' : ch))}
                  className={`min-w-[26px] h-6 sm:h-7 px-1.5 rounded-md text-[11px] sm:text-xs font-extrabold transition-all shrink-0 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs scale-105'
                      : hasInSpace
                      ? 'bg-white text-gray-800 border-gray-300 hover:bg-indigo-50 hover:border-indigo-300'
                      : 'bg-gray-100/70 text-gray-400 border-gray-200 hover:bg-white hover:text-gray-600'
                  }`}
                >
                  {ch}
                </button>
              )
            })}
          </div>

          {isFiltering && (
            <button
              type="button"
              onClick={() => {
                setMidCategory('all')
                setChosung('전체')
                setSearchQuery('')
              }}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0 whitespace-nowrap"
            >
              필터 해제
            </button>
          )}
        </div>
      </div>

      {/* 공간 안내 및 요약 (모바일 CBM 표시 포함) */}
      {(!activeCategoryId || activeCategory?.name === '기타/미지정') && (
        <div className="flex items-center justify-between text-xs text-gray-600 bg-blue-50/60 px-3 py-1.5 rounded-lg border border-blue-100 flex-wrap gap-2">
          <UnassignedBoxTooltip variant="badge" />
          <div className="text-blue-700 font-bold sm:hidden">{currentCategoryCbm.toFixed(2)} CBM</div>
        </div>
      )}

      {/* 3. 카드 타일 그리드 */}
      {filteredCategoryItems.length === 0 ? (
        <div className="py-6 px-4 text-center bg-gray-50/70 rounded-xl border border-dashed border-gray-300 space-y-2">
          <p className="text-xs sm:text-sm font-bold text-gray-600">
            {midCategory === 'selected'
              ? `[${activeCategory?.name}]에 아직 수량이 입력된 물품이 없습니다.`
              : `[${activeCategory?.name}] 기본 목록에 조건과 일치하는 물품이 없습니다.`}
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {isFiltering && (
              <button
                type="button"
                onClick={() => {
                  setMidCategory('all')
                  setChosung('전체')
                  setSearchQuery('')
                }}
                className="px-3 py-1.5 rounded-lg bg-white text-gray-700 border border-gray-300 text-xs font-bold hover:bg-gray-100"
              >
                전체 목록 보기
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsQuickAddModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center gap-1"
            >
              <PackagePlus size={13} />
              <span>전체 품목에서 검색·추가</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
          {filteredCategoryItems.map(item => {
            const qty = Number(item.quantity) || 0
            const hasQty = qty > 0
            const isBox = isBoxItem(item.name)
            const availableSpecs = standardItems
              .filter(s => s.name === item.name)
              .sort((a, b) => (a.spec || '').localeCompare(b.spec || '', 'ko'))
            const effCbm = getItemEffectiveCbm(item)
            const treatment = item.treatment || '이동'

            return (
              <div
                key={item._uid}
                className={`relative flex flex-col justify-between p-2.5 sm:p-3 rounded-xl border-2 transition-all ${
                  hasQty
                    ? 'border-blue-500 bg-blue-50/30 shadow-xs ring-1 ring-blue-200'
                    : 'border-gray-200/90 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                {/* 상단: 품목명 & 처리옵션 */}
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs sm:text-sm text-gray-900 truncate">{item.name}</div>
                    {/* 규격 드롭다운 / 텍스트 */}
                    {availableSpecs.length > 1 ? (
                      <select
                        value={item.spec || ''}
                        onChange={e => handleUpdateSpec(item._uid, e.target.value)}
                        className="mt-0.5 text-[11px] font-medium text-gray-600 bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none cursor-pointer max-w-full"
                      >
                        <option value="">규격 선택</option>
                        {availableSpecs.map(s => (
                          <option key={s.id} value={s.spec || '기본'}>
                            {s.spec || '기본'} ({s.defaultCbm} CBM
                            {(s.defaultInnerCbm || 0) > 0 ? ` + 내품 ${s.defaultInnerCbm}` : ''})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                        {item.spec || availableSpecs[0]?.spec || '기본'}
                      </div>
                    )}
                  </div>

                  {/* 처리 상태 배지 (클릭 시 순환 변경) */}
                  <button
                    type="button"
                    onClick={() => handleCycleTreatment(item._uid)}
                    title="클릭하여 처리 변경 (이동 -> 폐기 -> 내림 -> 경유 -> 존치)"
                    className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold transition-all border ${
                      treatment === '폐기'
                        ? 'bg-red-100 text-red-700 border-red-200'
                        : treatment === '내림'
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : treatment === '경유'
                        ? 'bg-purple-100 text-purple-700 border-purple-200'
                        : treatment === '존치'
                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {treatment}
                  </button>
                </div>

                {/* 중단: CBM 단가 및 합계 */}
                <div className="my-2 flex items-center justify-between text-[11px] text-gray-500">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-semibold text-gray-700">
                      CBM:{' '}
                      {effCbm > 0
                        ? `${effCbm.toFixed(2)}`
                        : `${((Number(item.cbm) || 0) + (Number(item.innerBoxCbm) || 0)).toFixed(2)}`}
                    </span>
                    {(Number(item.innerBoxCbm) || 0) > 0 && (
                      <span
                        className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[9px] border border-amber-200"
                        title="내부 짐 포장 박스 CBM 가산"
                      >
                        내품 +{item.innerBoxCbm}
                      </span>
                    )}
                  </div>
                  {hasQty && (
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item._uid)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-0.5"
                      title="품목 삭제"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                {/* 하단: 원터치 수량 증감 버튼 바 */}
                {hasQty ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between bg-white rounded-lg border border-blue-300 p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item._uid, -1)}
                        className="w-8 h-8 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 flex items-center justify-center font-bold text-base active:scale-90 transition-all shrink-0"
                      >
                        <Minus size={14} className="stroke-[3]" />
                      </button>
                      <div className="flex-1 text-center font-extrabold text-blue-700 text-sm sm:text-base">
                        {qty}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item._uid, 1)}
                        className="w-8 h-8 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-bold text-base active:scale-90 transition-all shrink-0 shadow-2xs"
                      >
                        <Plus size={14} className="stroke-[3]" />
                      </button>
                    </div>

                    {/* 박스 등 대량 품목일 때 ±5 고속 버튼 */}
                    {isBox && (
                      <div className="grid grid-cols-2 gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item._uid, -5)}
                          className="py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[10px] text-center active:scale-95 transition-all border border-gray-200"
                        >
                          -5
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item._uid, 5)}
                          className="py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] text-center active:scale-95 transition-all border border-indigo-200"
                        >
                          +5
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUpdateQty(item._uid, 1)}
                    className="w-full py-2 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-extrabold text-xs border border-dashed border-gray-300 hover:border-blue-400 flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <Plus size={13} className="stroke-[3]" />
                    <span>추가 (1개)</span>
                  </button>
                )}
              </div>
            )
          })}

          {/* 품목 빠른 추가 카드 버튼 */}
          <button
            type="button"
            onClick={() => setIsQuickAddModalOpen(true)}
            className="relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/70 text-indigo-600 hover:text-indigo-800 font-extrabold text-xs transition-all min-h-[110px]"
          >
            <div className="w-8 h-8 rounded-full bg-white border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
              <PackagePlus size={16} />
            </div>
            <span>+ 새 품목 검색·추가</span>
          </button>
        </div>
      )}

      {/* 4. 초성/검색 필터 시 현재 공간 외 타 공간·미지정 기준품목 원터치 추가 추천 */}
      {extraStandardMatches.length > 0 && (
        <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-indigo-950 flex items-center gap-1">
              <Sparkles size={13} className="text-indigo-600" />
              <span>
                타 공간/미지정 기준품목 바로 추가 ({chosung !== '전체' ? `'${chosung}'` : ''}
                {searchQuery ? ` '${searchQuery}'` : ''})
              </span>
            </span>
            <span className="text-[11px] text-indigo-600">탭하면 [{activeCategory?.name}]에 즉시 1개 추가</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {extraStandardMatches.map(std => (
              <button
                key={std.id}
                type="button"
                onClick={() => handleAddFromStandardObj(std)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-600 text-indigo-900 hover:text-white border border-indigo-300 text-xs font-bold transition-all shadow-2xs flex items-center gap-1 active:scale-95"
              >
                <Plus size={12} />
                <span>{std.name}</span>
                {std.spec && <span className="text-[10px] opacity-75">({std.spec})</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 품목 빠른 검색·추가 모달 */}
      <ItemQuickAddModal
        isOpen={isQuickAddModalOpen}
        onClose={() => setIsQuickAddModalOpen(false)}
        categoryId={activeCategoryId}
        categoryName={activeCategory?.name || '기타/미지정'}
        standardItems={standardItems}
        currentCategoryItems={currentCategoryItems}
        onAddItem={handleAddFromStandardObj}
        onAddCustomItem={handleAddCustomItem}
      />
    </div>
  )
}
