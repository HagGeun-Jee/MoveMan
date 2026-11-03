'use client'

import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { PackingMaterialItem } from '@/lib/packingMaterialCalculator'

const GROUPS: Array<{
  key: PackingMaterialItem['category']
  title: string
  shortLabel: string
  icon: string
  headerClass: string
  badgeClass: string
}> = [
  {
    key: 'BOX',
    title: '1. 포장박스 (단프라 의류/이불/대/중/소)',
    shortLabel: '단프라박스',
    icon: '📦',
    headerClass: 'bg-blue-50/90 text-blue-900 border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-800',
  },
  {
    key: 'BASKET',
    title: '2. 바구니 · 아이스박스',
    shortLabel: '바구니·보냉',
    icon: '🧺',
    headerClass: 'bg-emerald-50/90 text-emerald-900 border-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-800',
  },
  {
    key: 'COVER',
    title: '3. 가구 · 가전 · 침대 보호커버',
    shortLabel: '보호커버',
    icon: '🛡️',
    headerClass: 'bg-indigo-50/90 text-indigo-900 border-indigo-200',
    badgeClass: 'bg-indigo-100 text-indigo-800',
  },
  {
    key: 'CONSUMABLE',
    title: '4. 포장 소모품 (OPP 박스테이프 · 에어캡 · 랩 · 덧신)',
    shortLabel: '소모품',
    icon: '🎗️',
    headerClass: 'bg-purple-50/90 text-purple-900 border-purple-200',
    badgeClass: 'bg-purple-100 text-purple-800',
  },
  {
    key: 'PROTECTION',
    title: '5. 현장 바닥보양재 · 운반 장비',
    shortLabel: '보양·장비',
    icon: '🧰',
    headerClass: 'bg-amber-50/90 text-amber-900 border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-800',
  },
]

export function EstimatePackingMaterialsView({
  packingMaterials,
}: {
  packingMaterials: PackingMaterialItem[]
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<PackingMaterialItem['category'], boolean>>({
    BOX: false,
    BASKET: false,
    COVER: false,
    CONSUMABLE: false,
    PROTECTION: false,
  })

  const activeGroups = useMemo(
    () =>
      GROUPS.map(g => ({
        ...g,
        items: packingMaterials.filter(m => m.category === g.key),
      })).filter(g => g.items.length > 0),
    [packingMaterials]
  )

  const allOpen = useMemo(
    () => activeGroups.length > 0 && activeGroups.every(g => expandedGroups[g.key]),
    [activeGroups, expandedGroups]
  )

  const toggleGroup = (key: PackingMaterialItem['category']) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleAll = () => {
    const next = !allOpen
    setExpandedGroups({
      BOX: next,
      BASKET: next,
      COVER: next,
      CONSUMABLE: next,
      PROTECTION: next,
    })
  }

  if (packingMaterials.length === 0) return null

  return (
    <div className="mt-3 bg-slate-50/80 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-2.5 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs sm:text-sm font-extrabold text-gray-900">
            📦 현장 필요 포장자재 소요량
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            자재마스터 · 원가기준정보 연동
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            옷걸이박스 제외
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          {activeGroups.map(g => {
            const totalQty = g.items.reduce((s, m) => s + m.quantity, 0)
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => toggleGroup(g.key)}
                className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 border border-gray-200 text-gray-800 transition-colors cursor-pointer"
              >
                {g.icon} {g.shortLabel} <strong className="text-blue-700">{totalQty}{g.items[0]?.unit || '개'}</strong>
              </button>
            )
          })}
          <button
            type="button"
            onClick={toggleAll}
            className="px-2.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
          >
            {allOpen ? '전체 접기 ▲' : '전체 펼치기 ▼'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {activeGroups.map(group => {
          const isOpen = Boolean(expandedGroups[group.key])
          const totalQty = group.items.reduce((sum, i) => sum + i.quantity, 0)

          return (
            <div key={group.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
              {/* 종류별 아코디언 헤더 */}
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className={`w-full px-3 py-1.5 flex items-center justify-between text-xs font-extrabold transition-colors cursor-pointer ${
                  isOpen ? 'border-b' : ''
                } ${group.headerClass}`}
              >
                <span className="flex items-center gap-1.5 text-left">
                  <span>{group.icon}</span>
                  <span>{group.title}</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${group.badgeClass}`}>
                    {group.items.length}종 · 합계 {totalQty.toLocaleString()}{group.items[0]?.unit || '개'}
                  </span>
                  {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </span>
              </button>

              {/* 접혀 있을 때 한 줄 요약 배지 프리뷰 */}
              {!isOpen && (
                <div
                  onClick={() => toggleGroup(group.key)}
                  className="px-3 py-1.5 bg-white hover:bg-gray-50/80 transition-colors cursor-pointer flex flex-wrap items-center gap-1.5"
                >
                  {group.items.map(mat => (
                    <span
                      key={mat.code}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-[11px] text-gray-700 font-semibold"
                    >
                      <span>{mat.name}</span>
                      <strong className="text-blue-700 font-extrabold">
                        {mat.quantity.toLocaleString()}{mat.unit}
                      </strong>
                    </span>
                  ))}
                </div>
              )}

              {/* 펼쳐졌을 때 상세 카드 그리드 */}
              {isOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 divide-y sm:divide-y-0 gap-px bg-gray-100">
                  {group.items.map(mat => (
                    <div
                      key={mat.code}
                      className="bg-white px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-bold text-xs text-gray-900 truncate">
                            {mat.name}
                          </span>
                          {mat.spec && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0">
                              {mat.spec}
                            </span>
                          )}
                          {mat.source === 'GENERAL' && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                              일반기준
                            </span>
                          )}
                        </div>
                        {mat.reason && (
                          <div className="text-[10px] text-gray-500 truncate mt-0.5" title={mat.reason}>
                            {mat.reason}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0 pl-1">
                        <span className="font-extrabold text-xs sm:text-sm text-blue-700">
                          {mat.quantity.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-600 ml-0.5">
                          {mat.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

