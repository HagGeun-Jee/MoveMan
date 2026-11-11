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
  MapPin,
} from 'lucide-react'
import { isBoxItem, getItemEffectiveCbm, ensureItemUid, getAllStandardBoxSpecs, getMatchingStandardSpecs } from './EstimateForm'
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

  // 현재 공간의 품목들 (전체 / 일반물품 / 자재박스 분리)
  const currentCategoryItems = useMemo(
    () => items.filter(i => (i.locationId || '') === activeCategoryId),
    [items, activeCategoryId]
  )

  const currentNonBoxItems = useMemo(
    () => currentCategoryItems.filter(i => !isBoxItem(i.name)),
    [currentCategoryItems]
  )

  // 모든 공간에서 공통으로 사용할 하단 고정 자재박스(BOX) 규격 목록
  const allBoxSpecs = useMemo(() => getAllStandardBoxSpecs(standardItems), [standardItems])

  // 현재 공간에서 수량 > 0 인 품목 개수 (일반 물품 기준)
  const selectedCountInSpace = useMemo(
    () => currentNonBoxItems.filter(i => (Number(i.quantity) || 0) > 0).length,
    [currentNonBoxItems]
  )

  // 현재 공간의 중분류별 품목 수 카운트 (자재박스는 하단 고정 바에 상시 표시되므로 상단 카운트에서 제외)
  const midCategoryCounts = useMemo(() => {
    const counts: Record<ItemMidCategory, number> = {
      all: currentNonBoxItems.length,
      selected: selectedCountInSpace,
      box: currentCategoryItems.filter(i => isBoxItem(i.name) && (Number(i.quantity) || 0) > 0).length,
      furniture: 0,
      appliance: 0,
      living: 0,
    }
    currentNonBoxItems.forEach(it => {
      const cat = classifyItemMidCategory(it.name)
      counts[cat] = (counts[cat] || 0) + 1
    })
    return counts
  }, [currentNonBoxItems, currentCategoryItems, selectedCountInSpace])

  // 현재 공간에 존재하는 초성 집합 (버튼 시각적 활성 표시용)
  const availableChosungsInSpace = useMemo(() => {
    const set = new Set<string>(['전체'])
    currentNonBoxItems.forEach(it => {
      CHOSUNG_BUTTONS.forEach(ch => {
        if (ch !== '전체' && matchesChosungFilter(it.name, ch)) {
          set.add(ch)
        }
      })
    })
    return set
  }, [currentNonBoxItems])

  // 필터링된 현재 공간 일반 품목 리스트 (자재박스는 하단 고정 1줄 카드 영역에 전용 표시)
  const filteredCategoryItems = useMemo(() => {
    let list = currentNonBoxItems.filter(it => {
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
  }, [currentNonBoxItems, midCategory, chosung, searchQuery, selectedFirst])

  // 초성 또는 검색어가 입력되었을 때, 현재 공간 카드에는 없지만 전체 기준정보(standardItems)에 있는 품목 추천
  const extraStandardMatches = useMemo(() => {
    if (chosung === '전체' && !searchQuery.trim() && (midCategory === 'all' || midCategory === 'selected')) {
      return []
    }
    const existingNames = new Set(currentNonBoxItems.map(i => i.name))
    const map = new Map<string, any>()
    standardItems.forEach(s => {
      if (isBoxItem(s.name)) return
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
  }, [standardItems, currentNonBoxItems, chosung, searchQuery, midCategory])

  // 현재 공간 총 CBM (일반 물품 + 자재박스 합산)
  const currentCategoryCbm = currentCategoryItems.reduce((acc, it) => acc + getItemEffectiveCbm(it), 0)

  // 품목명 기준 규격 목록 조회 헬퍼 (TV장/쇼파/테이블/안마의자/콘솔 호환 포함)
  const findSpecsForItemName = (itemName: string) => {
    return getMatchingStandardSpecs(itemName, standardItems)
  }

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
            const candidates = findSpecsForItemName(it.name)
            const matched =
              candidates.find(s => (nextSpec ? (s.spec || '기본') === nextSpec : true)) ||
              candidates[0]
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
          if (!newSpec) {
            return {
              ...it,
              spec: '',
              cbm: 0,
              innerBoxCbm: 0,
              quantity: 0,
            }
          }
          const candidates = findSpecsForItemName(it.name)
          const matched = candidates.find(s => (s.spec || '기본') === newSpec)
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

  // 하단 고정 자재박스(BOX) 규격별 수량 증감 핸들러 (어느 공간에서든 즉시 추가·조절)
  const handleUpdateBoxSpecQty = (boxStd: any, delta: number) => {
    const specVal = boxStd.spec || ''
    setItems(prev => {
      const existingIdx = prev.findIndex(
        it =>
          (it.locationId || '') === activeCategoryId &&
          isBoxItem(it.name) &&
          (it.spec || '') === specVal
      )

      if (existingIdx >= 0) {
        const cur = prev[existingIdx]
        const nextQty = Math.max(0, (Number(cur.quantity) || 0) + delta)
        if (nextQty <= 0) {
          return prev.filter((_, idx) => idx !== existingIdx)
        }
        const next = [...prev]
        next[existingIdx] = {
          ...cur,
          quantity: nextQty,
          cbm: boxStd.defaultCbm ?? cur.cbm ?? 0.15,
          innerBoxCbm: boxStd.defaultInnerCbm ?? cur.innerBoxCbm ?? 0,
        }
        return next
      }

      if (delta <= 0) return prev

      return [
        ...prev,
        ensureItemUid({
          locationId: activeCategoryId,
          locationName: activeCategory?.name || '기타/미지정',
          name: boxStd.name || 'BOX',
          spec: specVal,
          quantity: delta,
          treatment: '이동',
          cbm: boxStd.defaultCbm ?? 0.15,
          innerBoxCbm: boxStd.defaultInnerCbm ?? 0,
        }),
      ]
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs space-y-2.5 p-2.5 sm:p-4">
      {/* 1. 상단 공간 선택 칩 바 (스크롤 시에도 상단 고정되어 현재 작업 위치를 항상 확인 가능) */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs -mx-2.5 sm:-mx-4 px-2.5 sm:px-4 pt-1 pb-2 border-b border-gray-200 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
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
                    className={`flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                        : hasQty
                        ? 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100/80'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                    }`}
                  >
                    {isSelected && <MapPin size={12} className="text-amber-300 shrink-0" />}
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
                  className="px-2.5 py-1 rounded-xl text-xs sm:text-sm font-bold bg-white hover:bg-blue-50 text-blue-600 border-2 border-dashed border-blue-300 hover:border-blue-500 cursor-pointer outline-none transition-all shadow-2xs"
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

          {/* 현재 작업 위치 및 공간 합계 배지 */}
          <div className="shrink-0 flex items-center gap-1.5 pl-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 text-xs font-extrabold">
              <MapPin size={12} className="text-rose-600 shrink-0" />
              <span>{activeCategory?.name}</span>
              <span className="text-blue-700 ml-0.5">{currentCategoryCbm.toFixed(2)} CBM</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. 스마트 필터 바 (중분류 탭 + 초성 ㄱ~ㅎ + 실시간 검색 + 빠른 품목 추가) */}
      <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-2 space-y-1.5">
        {/* 상단 줄: 중분류 칩 + 검색창 + 빠른 추가 모달 버튼 */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
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
                  className={`px-2 py-1 rounded-lg text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1 border ${
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
                placeholder={`[${activeCategory?.name}] 품목·규격·초성 검색 (예: 침대, ㅊㄷ)`}
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
              <span>+ [{activeCategory?.name}] 품목 검색추가</span>
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

      {/* 공간 안내 및 요약 */}
      {(!activeCategoryId || activeCategory?.name === '기타/미지정') && (
        <div className="flex items-center justify-between text-xs text-gray-600 bg-blue-50/60 px-3 py-1.5 rounded-lg border border-blue-100 flex-wrap gap-2">
          <UnassignedBoxTooltip variant="badge" />
        </div>
      )}

      {/* 3. 1품목 1줄 슬림 리스트 */}
      {filteredCategoryItems.length === 0 ? (
        <div className="py-5 px-4 text-center bg-gray-50/70 rounded-xl border border-dashed border-gray-300 space-y-2">
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
              <span>+ [{activeCategory?.name}]에 새 품목 검색·추가</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
          {filteredCategoryItems.map(item => {
            const qty = Number(item.quantity) || 0
            const hasQty = qty > 0
            const isBox = isBoxItem(item.name)
            const allSpecsForName = findSpecsForItemName(item.name)
            const locSpecsForName = allSpecsForName.filter(s =>
              activeCategoryId
                ? s.locations?.some((l: any) => l.id === activeCategoryId)
                : !s.locations || s.locations.length === 0
            )
            const availableSpecs =
              isBox && locSpecsForName.length > 0
                ? allSpecsForName.filter(
                    s =>
                      locSpecsForName.some(ls => ls.id === s.id) ||
                      (item.spec && (s.spec || '기본') === item.spec)
                  )
                : allSpecsForName
            const effCbm = getItemEffectiveCbm(item)
            const unitCbm = (Number(item.cbm) || 0) + (Number(item.innerBoxCbm) || 0)
            const displayCbm = hasQty ? effCbm : unitCbm
            const treatment = item.treatment || '이동'

            return (
              <div
                key={item._uid}
                className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${
                  hasQty
                    ? 'border-blue-500 bg-blue-50/40 shadow-2xs ring-1 ring-blue-200'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/40'
                }`}
              >
                {/* 좌측: 품목명 + 규격 선택(드롭다운/배지) + CBM */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {/* 품목명 */}
                  <div className="flex items-center gap-1 shrink-0 max-w-[115px] sm:max-w-[140px]">
                    <span className="font-extrabold text-xs sm:text-sm text-gray-900 truncate" title={item.name}>
                      {item.name}
                    </span>
                    {isBox && item.spec && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-300 text-slate-950 border border-amber-400 text-[10px] font-black shrink-0">
                        {item.spec}
                      </span>
                    )}
                  </div>

                  {/* 규격 선택 (드롭다운 또는 직접 입력 텍스트) */}
                  <div className="min-w-0 flex-1 max-w-[145px] sm:max-w-[185px]">
                    {availableSpecs.length > 0 ? (
                      <select
                        value={item.spec || ''}
                        onChange={e => handleUpdateSpec(item._uid, e.target.value)}
                        className={`w-full px-1.5 py-1 rounded-md text-[11px] sm:text-xs font-bold border outline-none cursor-pointer truncate transition-colors ${
                          item.spec
                            ? hasQty
                              ? 'bg-white text-blue-950 border-blue-400 focus:border-blue-600'
                              : 'bg-indigo-50/70 text-indigo-950 border-indigo-200 hover:border-indigo-400'
                            : 'bg-amber-50/80 text-amber-950 border-amber-300 hover:border-amber-400'
                        }`}
                      >
                        <option value="">▾ 규격 선택</option>
                        {availableSpecs.map(s => (
                          <option key={s.id} value={s.spec || '기본'}>
                            {s.spec || '기본'} ({s.defaultCbm}
                            {(s.defaultInnerCbm || 0) > 0 ? `+${s.defaultInnerCbm}` : ''})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div
                        title={item.spec || '규격 선택'}
                        className={`w-full px-1.5 py-1 rounded-md text-[11px] sm:text-xs font-bold truncate border ${
                          hasQty
                            ? 'bg-white text-blue-950 border-blue-300'
                            : 'bg-amber-50/80 text-amber-950 border-amber-300'
                        }`}
                      >
                        {item.spec || '▾ 규격 선택'}
                      </div>
                    )}
                  </div>

                  {/* CBM 및 내품 표시 */}
                  <div className="hidden xs:flex items-center gap-1 shrink-0 text-[11px]">
                    <span className={`font-bold ${hasQty ? 'text-blue-700' : 'text-gray-500'}`}>
                      {displayCbm.toFixed(2)}
                    </span>
                    {(Number(item.innerBoxCbm) || 0) > 0 && (
                      <span
                        className="px-1 py-0.1 rounded bg-amber-100 text-amber-800 font-bold text-[9px] border border-amber-200"
                        title="내부 짐 포장 박스 CBM 가산"
                      >
                        +{item.innerBoxCbm}
                      </span>
                    )}
                  </div>
                </div>

                {/* 우측: 처리옵션 + 원터치 수량 증감 + 삭제 */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* 처리 상태 배지 (클릭 시 순환 변경) */}
                  <button
                    type="button"
                    onClick={() => handleCycleTreatment(item._uid)}
                    title="클릭하여 처리 변경 (이동 -> 폐기 -> 내림 -> 경유 -> 존치)"
                    className={`px-1.5 py-1 rounded text-[10px] font-bold transition-all border shrink-0 ${
                      treatment === '폐기'
                        ? 'bg-red-100 text-red-700 border-red-200'
                        : treatment === '내림'
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : treatment === '경유'
                        ? 'bg-purple-100 text-purple-700 border-purple-200'
                        : treatment === '존치'
                        ? 'bg-slate-200 text-slate-800 border-slate-300'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {treatment}
                  </button>

                  {/* 인라인 수량 증감 컨트롤 (항상 1줄 내 고정 폭) */}
                  <div className="flex items-center bg-white rounded-md border border-gray-300 p-0.5 shadow-2xs">
                    <button
                      type="button"
                      disabled={!hasQty}
                      onClick={() => handleUpdateQty(item._uid, -1)}
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center font-bold transition-all shrink-0 ${
                        hasQty
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 active:scale-90'
                          : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <Minus size={12} className="stroke-[3]" />
                    </button>
                    <span
                      className={`w-6 sm:w-7 text-center font-extrabold text-xs sm:text-sm ${
                        hasQty ? 'text-blue-700' : 'text-gray-400'
                      }`}
                    >
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item._uid, 1)}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-bold active:scale-90 transition-all shrink-0"
                    >
                      <Plus size={12} className="stroke-[3]" />
                    </button>
                  </div>

                  {/* BOX 품목일 때 인라인 +5 고속 버튼 */}
                  {isBox && (
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item._uid, 5)}
                      className="h-7 px-1.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] border border-indigo-200 active:scale-90 transition-all shrink-0"
                      title="박스 5개씩 추가"
                    >
                      +5
                    </button>
                  )}

                  {/* 삭제 버튼 */}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item._uid)}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                    title="이 목록에서 품목 행 제거"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}

          {/* 품목 빠른 추가 1줄 슬림 버튼 */}
          <button
            type="button"
            onClick={() => setIsQuickAddModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/70 text-indigo-700 hover:text-indigo-900 font-extrabold text-xs transition-all"
          >
            <PackagePlus size={14} />
            <span>+ [{activeCategory?.name}]에 새 품목 검색·추가</span>
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
            <span className="text-[11px] font-bold text-indigo-700">
              탭하면 [{activeCategory?.name}]에 즉시 1개 추가
            </span>
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

      {/* 5. 하단 고정 자재박스(BOX) 1줄 카드 바 (어느 공간에서든 즉시 추가·증감, CBM 미표시) */}
      {allBoxSpecs.length > 0 && (
        <div className="sticky bottom-0 z-20 bg-amber-50/95 backdrop-blur-xs -mx-2.5 sm:-mx-4 px-2.5 sm:px-4 py-2 border-t-2 border-amber-300 rounded-b-xl shadow-sm space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-extrabold text-amber-950 flex items-center gap-1">
              <span>📦 자재박스 빠른 추가</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-200/90 text-amber-950 border border-amber-400 text-[11px] font-black">
                현재 위치: {activeCategory?.name}
              </span>
            </span>
            <span className="text-[11px] font-bold text-amber-800">
              어느 공간에서든 즉시 박스 수량 입력
            </span>
          </div>

          <div className="overflow-x-auto no-scrollbar pb-0.5">
            <div className="grid grid-cols-6 gap-1 sm:gap-1.5 min-w-[490px] sm:min-w-0">
              {allBoxSpecs.map(boxStd => {
                const specVal = boxStd.spec || '기본'
                const matchedItem = currentCategoryItems.find(
                  it => isBoxItem(it.name) && (it.spec || '기본') === specVal
                )
                const qty = matchedItem ? Number(matchedItem.quantity) || 0 : 0
                const hasQty = qty > 0

                return (
                  <div
                    key={boxStd.id || specVal}
                    className={`flex flex-col justify-between p-1.5 sm:p-2 rounded-lg border transition-all ${
                      hasQty
                        ? 'bg-white border-amber-500 ring-1 ring-amber-400 shadow-2xs'
                        : 'bg-white/90 border-amber-200 hover:border-amber-400'
                    }`}
                  >
                    {/* 상단: 박스 규격명 + +5 고속 버튼 (CBM 표시 생략) */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`text-xs sm:text-sm font-black truncate ${
                          hasQty ? 'text-amber-950' : 'text-gray-800'
                        }`}
                        title={`BOX (${specVal})`}
                      >
                        {specVal}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateBoxSpecQty(boxStd, 5)}
                        className="px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10px] font-extrabold active:scale-90 transition-all shrink-0"
                        title={`${specVal} 박스 5개 추가`}
                      >
                        +5
                      </button>
                    </div>

                    {/* 하단: [-] 수량 [+] 1줄 컨트롤 */}
                    <div className="flex items-center justify-between bg-slate-50 rounded-md border border-gray-200 p-0.5">
                      <button
                        type="button"
                        disabled={!hasQty}
                        onClick={() => handleUpdateBoxSpecQty(boxStd, -1)}
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center font-bold transition-all shrink-0 ${
                          hasQty
                            ? 'bg-white hover:bg-gray-200 text-gray-800 border border-gray-300 active:scale-90'
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        <Minus size={11} className="stroke-[3]" />
                      </button>
                      <span
                        className={`text-xs sm:text-sm font-extrabold px-1 text-center ${
                          hasQty ? 'text-blue-700' : 'text-gray-400'
                        }`}
                      >
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateBoxSpecQty(boxStd, 1)}
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center font-bold active:scale-90 transition-all shrink-0"
                      >
                        <Plus size={11} className="stroke-[3]" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 품목 빠른 검색·추가 모달 */}
      <ItemQuickAddModal
        isOpen={isQuickAddModalOpen}
        onClose={() => setIsQuickAddModalOpen(false)}
        categoryId={activeCategoryId}
        categoryName={activeCategory?.name || '기타/미지정'}
        categories={categories}
        onSelectCategory={handleSelectSpace}
        standardItems={standardItems}
        currentCategoryItems={currentCategoryItems}
        onAddItem={handleAddFromStandardObj}
        onAddCustomItem={handleAddCustomItem}
      />
    </div>
  )
}
