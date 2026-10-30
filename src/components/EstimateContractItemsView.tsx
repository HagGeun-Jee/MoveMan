'use client'

import React, { useState } from 'react'
import { FileText, Table } from 'lucide-react'

interface EstimateContractItemsViewProps {
  sortedGroupedItems: [string, any[]][]
  totalCbm: number
  treatmentSummary: Record<string, number>
}

const isBaseCbmExcluded = (treatment?: string): boolean =>
  treatment === '폐기' || treatment === '내림' || treatment === '존치'

const getItemEffectiveCbm = (item: any): number => {
  const qty = item.quantity !== undefined ? Number(item.quantity) : 1
  const baseCbm = isBaseCbmExcluded(item.treatment) ? 0 : (Number(item.cbm) || 0)
  const innerCbm = Number(item.innerBoxCbm) || 0
  return (baseCbm + innerCbm) * qty
}

export function EstimateContractItemsView({
  sortedGroupedItems,
  totalCbm,
  treatmentSummary,
}: EstimateContractItemsViewProps) {
  // 기본값: 스크롤 없이 한눈에 들어오는 'compact' (계약서 요약형)
  const [viewMode, setViewMode] = useState<'compact' | 'detail'>('compact')

  const totalItemCount = sortedGroupedItems.reduce(
    (sum, [, list]) => sum + list.reduce((s, it) => s + (Number(it.quantity) || 1), 0),
    0
  )

  return (
    <div className="space-y-2">
      {/* 헤더 바: 총 CBM + 특이 처리 배지 + 뷰 모드 전환 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base print:text-xs">
            산출 물품 명세
          </h3>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-extrabold print:bg-transparent print:border-gray-400 print:text-black">
            총 {totalCbm.toFixed(2)} CBM ({totalItemCount}개)
          </span>

          {/* 특이 처리 항목 (폐기, 내림, 경유, 존치) 요약 뱃지 */}
          {Object.keys(treatmentSummary).length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-xs font-black">
              {treatmentSummary['폐기'] && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 text-[11px] print:border-black print:text-black print:bg-transparent">
                  폐기 {treatmentSummary['폐기']}
                </span>
              )}
              {treatmentSummary['내림'] && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[11px] print:border-black print:text-black print:bg-transparent">
                  내림 {treatmentSummary['내림']}
                </span>
              )}
              {treatmentSummary['경유'] && (
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-300 text-[11px] print:border-black print:text-black print:bg-transparent">
                  경유 {treatmentSummary['경유']}
                </span>
              )}
              {treatmentSummary['존치'] && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-[11px] print:border-black print:text-black print:bg-transparent">
                  존치 {treatmentSummary['존치']}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 화면용 뷰 전환 스위치 (인쇄 시 숨김 -> 인쇄는 항상 계약서 1페이지 요약표 사용) */}
        <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-300 print:hidden">
          <button
            type="button"
            onClick={() => setViewMode('compact')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-extrabold transition-all ${
              viewMode === 'compact'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText size={12} />
            <span>계약서 요약형</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('detail')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-extrabold transition-all ${
              viewMode === 'detail'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Table size={12} />
            <span>상세 표 보기</span>
          </button>
        </div>
      </div>

      {/* 1. 계약서 요약형 뷰 (화면에서 compact 선택 시 표시 + 인쇄 시 무조건 이 표로 1장 출력) */}
      <div className={viewMode === 'compact' ? 'block' : 'hidden print:block'}>
        <div className="border border-gray-300 rounded-lg overflow-hidden print:rounded-none print:border-gray-400">
          <table className="w-full text-xs sm:text-sm border-collapse print:text-[11px]">
            <thead className="bg-gray-100 text-gray-800 border-b border-gray-300 print:bg-gray-100">
              <tr>
                <th className="border-r border-gray-300 px-2.5 py-1.5 print:px-2 print:py-1 text-left font-bold w-24 sm:w-28 print:w-20 whitespace-nowrap">
                  공간(위치)
                </th>
                <th className="border-r border-gray-300 px-2 py-1.5 print:px-1.5 print:py-1 text-right font-bold w-16 sm:w-20 print:w-14 whitespace-nowrap">
                  CBM
                </th>
                <th className="px-2.5 py-1.5 print:px-2 print:py-1 text-left font-bold">
                  산출 물품 내역 (품목 · 규격 · 수량)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 print:divide-gray-300 bg-white">
              {sortedGroupedItems.map(([locName, catItems]) => {
                const locCbm = catItems.reduce((acc, it) => acc + getItemEffectiveCbm(it), 0)
                return (
                  <tr key={locName} className="hover:bg-blue-50/20">
                    <td className="border-r border-gray-300 bg-blue-50/40 print:bg-gray-50 px-2.5 py-1.5 print:px-2 print:py-1 font-bold text-gray-900 align-top whitespace-nowrap">
                      {locName}
                    </td>
                    <td className="border-r border-gray-300 px-2 py-1.5 print:px-1.5 print:py-1 text-right font-bold text-blue-700 print:text-gray-900 align-top whitespace-nowrap">
                      {locCbm.toFixed(1)}
                    </td>
                    <td className="px-2.5 py-1.5 print:px-2 print:py-1 text-gray-900 leading-relaxed">
                      <div className="flex flex-wrap items-center gap-1.5 print:gap-1">
                        {catItems.map((item: any, idx: number) => {
                          const qty = item.quantity !== undefined ? Number(item.quantity) : 1
                          const treatment = item.treatment || '이동'
                          const isSpecial = treatment !== '이동'
                          const specText =
                            item.spec && item.spec !== '기본' && item.spec !== '-'
                              ? `(${item.spec})`
                              : ''

                          return (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs print:text-[10.5px] print:px-1.5 print:py-0 ${
                                treatment === '폐기'
                                  ? 'bg-red-50 border-red-200 text-red-900'
                                  : treatment === '내림'
                                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                                  : treatment === '경유'
                                  ? 'bg-purple-50 border-purple-200 text-purple-900'
                                  : treatment === '존치'
                                  ? 'bg-slate-100 border-slate-300 text-slate-700'
                                  : 'bg-gray-50 border-gray-200/90 text-gray-800 print:bg-transparent print:border-gray-300'
                              }`}
                            >
                              <span className="font-bold">{item.name}</span>
                              {specText && (
                                <span className="text-[11px] print:text-[10px] text-gray-500 font-medium">
                                  {specText}
                                </span>
                              )}
                              <span className="font-extrabold text-blue-700 print:text-black">
                                ×{qty}
                              </span>
                              {isSpecial && (
                                <span
                                  className={`px-1 py-0.1 rounded text-[10px] font-black ${
                                    treatment === '폐기'
                                      ? 'bg-red-200/80 text-red-800'
                                      : treatment === '내림'
                                      ? 'bg-amber-200/80 text-amber-900'
                                      : treatment === '경유'
                                      ? 'bg-purple-200/80 text-purple-800'
                                      : 'bg-slate-200 text-slate-800'
                                  } print:border print:border-black print:bg-transparent print:text-black`}
                                >
                                  {treatment}
                                </span>
                              )}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. 공간별 상세 테이블 뷰 (화면에서 '상세 표 보기' 선택 시에만 표시, 인쇄 시에는 숨김) */}
      {viewMode === 'detail' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 print:hidden">
          {sortedGroupedItems.map(([locName, catItems]: [string, any[]]) => (
            <div key={locName} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <div className="bg-blue-50/80 px-3 py-1.5 font-bold text-gray-900 flex justify-between items-center border-b border-blue-100 text-xs sm:text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-blue-600 rounded-sm inline-block"></span>
                  <span>{locName}</span>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-white/90 px-2 py-0.5 rounded-full border border-blue-200">
                  {catItems.reduce((acc: number, item: any) => acc + getItemEffectiveCbm(item), 0).toFixed(2)} CBM
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-2.5 py-1.5 whitespace-nowrap">품목</th>
                      <th className="px-2 py-1.5">규격</th>
                      <th className="px-2 py-1.5 text-right whitespace-nowrap">수량</th>
                      <th className="px-2 py-1.5 text-center whitespace-nowrap">처리</th>
                      <th className="px-2 py-1.5 text-right whitespace-nowrap">기본</th>
                      <th className="px-2 py-1.5 text-right whitespace-nowrap">내품</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {catItems.map((item: any, idx: number) => {
                      const treatment = item.treatment || '이동'
                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-gray-50 ${
                            treatment === '폐기'
                              ? 'bg-red-50/20'
                              : treatment === '내림'
                              ? 'bg-amber-50/20'
                              : treatment === '경유'
                              ? 'bg-purple-50/20'
                              : treatment === '존치'
                              ? 'bg-slate-50/40'
                              : ''
                          }`}
                        >
                          <td className="px-2.5 py-1.5 font-bold text-gray-900">{item.name}</td>
                          <td className="px-2 py-1.5 text-gray-700">{item.spec || '-'}</td>
                          <td className="px-2 py-1.5 text-right font-bold text-gray-900">
                            {item.quantity !== undefined ? item.quantity : 1}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {treatment !== '이동' && (
                              <span
                                className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                  treatment === '폐기'
                                    ? 'bg-red-100 text-red-700 border-red-300'
                                    : treatment === '내림'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : treatment === '경유'
                                    ? 'bg-purple-100 text-purple-700 border-purple-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                              >
                                {treatment}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {isBaseCbmExcluded(treatment) ? (
                              <span className="text-rose-400 line-through">{item.cbm}</span>
                            ) : (
                              <span>{item.cbm}</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right text-gray-700">{item.innerBoxCbm}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

