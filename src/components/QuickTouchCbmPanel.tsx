'use client'

import React, { useState } from 'react'
import { Plus, Minus, Trash2, Box, Layers, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react'
import { isBoxItem, getItemEffectiveCbm, ensureItemUid } from './EstimateForm'

interface QuickTouchCbmPanelProps {
  categories: any[]
  items: any[]
  setItems: React.Dispatch<React.SetStateAction<any[]>>
  standardItems: any[]
}

export function QuickTouchCbmPanel({
  categories,
  items,
  setItems,
  standardItems,
}: QuickTouchCbmPanelProps) {
  // 공간 탭 (categories + 기타/미지정)
  const allCategories = [...categories, { id: '', name: '기타/미지정' }]
  const [activeCategoryId, setActiveCategoryId] = useState<string>(categories[0]?.id || '')
  const [showAddDropdown, setShowAddDropdown] = useState(false)
  const [selectedAddName, setSelectedAddName] = useState('')

  const activeCategory = allCategories.find(c => c.id === activeCategoryId) || allCategories[0]

  // 현재 공간의 품목들
  const currentCategoryItems = items.filter(i => (i.locationId || '') === activeCategoryId)

  // 현재 공간 총 CBM
  const currentCategoryCbm = currentCategoryItems.reduce((acc, it) => acc + getItemEffectiveCbm(it), 0)

  // 수량 변경 함수
  const handleUpdateQty = (itemUid: string, delta: number) => {
    setItems(prev => {
      return prev.map(it => {
        if (it._uid === itemUid) {
          const currentQty = Number(it.quantity) || 0
          const nextQty = Math.max(0, currentQty + delta)
          return { ...it, quantity: nextQty }
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
            quantity: it.quantity === 0 ? 1 : it.quantity
          }
        }
        return it
      })
    })
  }

  // 처리옵션 변경 (이동 -> 폐기 -> 내림 -> 경유 -> 이동 순환)
  const handleCycleTreatment = (itemUid: string) => {
    const cycle: Record<string, string> = {
      '이동': '폐기',
      '폐기': '내림',
      '내림': '경유',
      '경유': '이동'
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

  // 신규 품목 추가
  const handleAddStandardItem = (name: string, spec?: string) => {
    if (!name) return
    const matched = standardItems.find(s => s.name === name && (spec ? (s.spec || '기본') === spec : true))
    const newItem = ensureItemUid({
      locationId: activeCategoryId,
      locationName: activeCategory?.name || '기타/미지정',
      name: name,
      spec: spec || (matched?.spec || ''),
      quantity: 1,
      cbm: matched ? matched.defaultCbm : 0.5,
      innerBoxCbm: matched ? matched.defaultInnerCbm : 0,
      treatment: '이동'
    })

    setItems(prev => [...prev, newItem])
    setSelectedAddName('')
    setShowAddDropdown(false)
  }

  // 고유 품목명 목록 (추가용)
  const uniqueStandardNames = Array.from(new Set(standardItems.map(i => i.name)))
    .sort((a, b) => a.localeCompare(b, 'ko'))

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs space-y-3 p-3 sm:p-4">
      {/* 1. 상단 공간 선택 칩 바 (가로 스크롤) */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {allCategories.map(cat => {
            const catItems = items.filter(i => (i.locationId || '') === cat.id)
            const catCbm = catItems.reduce((acc, it) => acc + getItemEffectiveCbm(it), 0)
            const hasQty = catItems.some(it => (Number(it.quantity) || 0) > 0)
            const isSelected = activeCategoryId === cat.id

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryId(cat.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                    : hasQty
                    ? 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100/80'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                }`}
              >
                <span>{cat.name}</span>
                {catCbm > 0 && (
                  <span className={`text-[10px] sm:text-[11px] font-extrabold px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-blue-200/80 text-blue-800'
                  }`}>
                    {catCbm.toFixed(1)}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 현재 공간 요약 배지 */}
        <div className="shrink-0 text-right pl-2 hidden sm:block">
          <div className="text-xs text-gray-500 font-medium">현재 공간 합계</div>
          <div className="text-sm font-extrabold text-blue-700">
            {currentCategoryCbm.toFixed(2)} CBM
          </div>
        </div>
      </div>

      {/* 공간 안내 및 원터치 팁 */}
      <div className="flex items-center justify-between text-xs text-gray-600 bg-blue-50/60 px-3 py-1.5 rounded-lg border border-blue-100">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-blue-600 shrink-0" />
          <span className="font-semibold text-gray-800">
            <strong>[{activeCategory?.name}]</strong> 공간을 둘러보며 카드를 탭하여 수량을 가감하세요.
          </span>
        </div>
        <div className="text-blue-700 font-bold sm:hidden">
          {currentCategoryCbm.toFixed(2)} CBM
        </div>
      </div>

      {/* 2. 카드 타일 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
        {currentCategoryItems.map(item => {
          const qty = Number(item.quantity) || 0
          const hasQty = qty > 0
          const isBox = isBoxItem(item.name)
          const availableSpecs = standardItems.filter(s => s.name === item.name)
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
              {/* 상단: 품목명 & 삭제 */}
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                    {item.name}
                  </div>
                  {/* 규격 드롭다운 / 텍스트 */}
                  {availableSpecs.length > 1 ? (
                    <select
                      value={item.spec || ''}
                      onChange={e => handleUpdateSpec(item._uid, e.target.value)}
                      className="mt-0.5 text-[11px] font-medium text-gray-600 bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none cursor-pointer max-w-full"
                    >
                      {availableSpecs.map(s => (
                        <option key={s.id} value={s.spec || '기본'}>
                          {s.spec || '기본'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                      {item.spec || '기본'}
                    </div>
                  )}
                </div>

                {/* 처리 상태 배지 (클릭 시 순환 변경) */}
                <button
                  type="button"
                  onClick={() => handleCycleTreatment(item._uid)}
                  title="클릭하여 처리 변경 (이동 -> 폐기 -> 내림 -> 경유)"
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold transition-all border ${
                    treatment === '폐기'
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : treatment === '내림'
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : treatment === '경유'
                      ? 'bg-purple-100 text-purple-700 border-purple-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {treatment}
                </button>
              </div>

              {/* 중단: CBM 단가 및 합계 */}
              <div className="my-2 flex items-center justify-between text-[11px] text-gray-500">
                <span>CBM: {effCbm > 0 ? `${effCbm.toFixed(2)}` : `${((Number(item.cbm) || 0) + (Number(item.innerBoxCbm) || 0)).toFixed(2)}`}</span>
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

        {/* 품목 추가 카드 버튼 */}
        <div className="relative flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/30 transition-all min-h-[110px]">
          {showAddDropdown ? (
            <div className="w-full space-y-2 animate-in fade-in duration-150">
              <div className="text-[11px] font-bold text-gray-800 text-center">
                + 품목 바로 추가
              </div>
              <select
                value={selectedAddName}
                onChange={e => handleAddStandardItem(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white p-1.5 text-xs font-medium text-gray-800 outline-none focus:border-blue-500 cursor-pointer shadow-xs"
              >
                <option value="">품목 선택...</option>
                {uniqueStandardNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddDropdown(false)}
                className="w-full py-1 text-[11px] font-bold text-gray-500 hover:text-gray-700 bg-white rounded border border-gray-200"
              >
                닫기
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddDropdown(true)}
              className="flex flex-col items-center justify-center gap-1.5 text-gray-500 hover:text-blue-600 font-bold text-xs w-full h-full"
            >
              <div className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 shadow-2xs">
                <Plus size={16} className="stroke-[2.5]" />
              </div>
              <span>새 품목 추가</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
