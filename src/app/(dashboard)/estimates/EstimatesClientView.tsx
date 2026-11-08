'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { EstimateRow } from './EstimateRow'
import { formatPhoneNumber } from '@/lib/format'
import { OfflineEstimatesNotice } from '@/components/OfflineEstimatesNotice'
import {
  QuickVisitBookingModal,
  PartnerStatsAndManageModal,
  getPartnerBadgeStyle
} from '@/components/PartnerQuickBookingAndStatsModals'
import {
  SontaxSingleFilingModal,
  SontaxBatchCenterModal,
  getTaxFilingBadgeInfo,
  type TaxFilingInfo,
  type SontaxTargetEstimate,
} from '@/components/SontaxFilingModal'
import type { PartnerCompanyItem } from '@/app/actions/partner'
import {
  CalendarClock,
  BarChart3,
  Building2,
  Plus,
  Search,
  Smartphone,
} from 'lucide-react'

export function EstimatesClientView({
  initialEstimates,
  initialPartners
}: {
  initialEstimates: any[]
  initialPartners: PartnerCompanyItem[]
}) {
  const [partners, setPartners] = useState<PartnerCompanyItem[]>(initialPartners)
  const [searchQuery, setSearchQuery] = useState('')
  const [movingTypeFilter, setMovingTypeFilter] = useState('')
  const [partnerFilter, setPartnerFilter] = useState<string>('ALL') // 'ALL' | '__DIRECT__' | partnerName

  const [isQuickVisitOpen, setIsQuickVisitOpen] = useState(false)
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false)
  const [partnerModalTab, setPartnerModalTab] = useState<'STATS' | 'MANAGE'>('STATS')
  const [isSontaxBatchOpen, setIsSontaxBatchOpen] = useState(false)
  const [sontaxSingleTarget, setSontaxSingleTarget] = useState<SontaxTargetEstimate | null>(null)
  const [localTaxFilingMap, setLocalTaxFilingMap] = useState<Record<string, TaxFilingInfo>>({})

  // 견적 데이터 전처리 (environment, paymentPlan 파싱 및 의뢰업체 매칭)
  const parsedEstimates = useMemo(() => {
    const partnerByName = new Map(partners.map(p => [p.name, p]))
    const partnerById = new Map(partners.map(p => [p.id, p]))

    return initialEstimates.map(est => {
      let payPlanObj: any = {}
      try {
        if (est.paymentPlan) payPlanObj = JSON.parse(est.paymentPlan)
      } catch {}

      let envObj: any = {}
      try {
        if (est.environment) envObj = JSON.parse(est.environment)
      } catch {}

      let historyCreator = ''
      if (est.adminHistory) {
        try {
          const hist = JSON.parse(est.adminHistory)
          if (Array.isArray(hist)) {
            historyCreator =
              hist.find((h: any) => h?.action === 'CREATE' || h?.action === 'CREATE_QUICK_VISIT')
                ?.by ||
              hist[hist.length - 1]?.by ||
              ''
          }
        } catch {}
      }

      const matchedPartner =
        (envObj.partnerId && partnerById.get(envObj.partnerId)) ||
        (envObj.partnerName && partnerByName.get(envObj.partnerName))

      const partnerName = (matchedPartner?.name || envObj.partnerName || '').trim()
      const partnerShortName = (
        matchedPartner?.shortName ||
        envObj.partnerShortName ||
        partnerName.slice(0, 4) ||
        ''
      ).trim()
      const partnerColor = matchedPartner?.color || envObj.partnerColor || 'blue'

      const supplyAmount =
        (est.movingCost || 0) + (est.additionalCost || 0) + (est.storageCost || 0) ||
        Math.max(0, (est.totalAmount || 0) - (est.vat || 0))

      const isContracted = Boolean(
        payPlanObj.downPaymentPaid ||
          payPlanObj.intermediatePaymentPaid ||
          payPlanObj.balancePaid ||
          est.signature
      )

      const taxFiling: TaxFilingInfo | null =
        localTaxFilingMap[est.id] || envObj.taxFiling || null

      return {
        ...est,
        payPlanObj,
        envObj,
        estimatorName: (envObj.estimatorName || historyCreator || '').trim(),
        estDistance: envObj.distance,
        partnerName,
        partnerShortName,
        partnerColor,
        supplyAmount,
        isContracted,
        taxFiling,
      }
    })
  }, [initialEstimates, partners, localTaxFilingMap])

  // 정산완료(잔금입금 완료) 건 중 손택스 미신고 건수 집계
  const unfiledBalancePaidCount = useMemo(() => {
    return parsedEstimates.filter(
      e =>
        Boolean(e.payPlanObj?.balancePaid) &&
        (!e.taxFiling?.status || e.taxFiling.status === 'UNFILED')
    ).length
  }, [parsedEstimates])

  // 업체별 건수 집계 (상단 필터 탭 표시용)
  const partnerTabs = useMemo(() => {
    const counts = new Map<string, { name: string; color: string; count: number }>()
    partners.forEach(p => {
      counts.set(p.name, { name: p.name, color: p.color, count: 0 })
    })
    let directCount = 0

    parsedEstimates.forEach(e => {
      if (e.partnerName) {
        const cur = counts.get(e.partnerName)
        if (cur) {
          cur.count += 1
        } else {
          counts.set(e.partnerName, {
            name: e.partnerName,
            color: e.partnerColor || 'blue',
            count: 1
          })
        }
      } else {
        directCount += 1
      }
    })

    return {
      list: Array.from(counts.values()),
      directCount
    }
  }, [parsedEstimates, partners])

  // 검색 및 필터링된 견적 목록
  const filteredEstimates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return parsedEstimates.filter(est => {
      if (movingTypeFilter && est.movingType !== movingTypeFilter) return false

      if (partnerFilter === '__DIRECT__') {
        if (est.partnerName) return false
      } else if (partnerFilter !== 'ALL') {
        if (est.partnerName !== partnerFilter) return false
      }

      if (q) {
        const hay = [
          est.id,
          est.customerName,
          est.contact,
          formatPhoneNumber(est.contact || ''),
          est.partnerName,
          est.estimatorName,
          est.fromAddress,
          est.toAddress
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }

      return true
    })
  }, [parsedEstimates, searchQuery, movingTypeFilter, partnerFilter])

  // 현재 필터된 목록의 요약 통계
  const filteredSummary = useMemo(() => {
    const total = filteredEstimates.length
    const contracted = filteredEstimates.filter(e => e.isContracted).length
    const supplySum = filteredEstimates
      .filter(e => e.isContracted)
      .reduce((acc, cur) => acc + (cur.supplyAmount || 0), 0)
    const rate = total > 0 ? ((contracted / total) * 100).toFixed(1) : '0.0'
    return { total, contracted, supplySum, rate }
  }, [filteredEstimates])

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 상단 타이틀 및 액션 버튼 그룹 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">견적 목록</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            의뢰 이사업체별 방문견적 접수 현황, 계약 상태 및 공급가액을 통합 관리합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsSontaxBatchOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors whitespace-nowrap"
          >
            <Smartphone className="w-4 h-4 text-emerald-700" />
            <span>손택스·세무신고</span>
            {unfiledBalancePaidCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black">
                {unfiledBalancePaidCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setPartnerModalTab('STATS')
              setIsPartnerModalOpen(true)
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors whitespace-nowrap"
          >
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>의뢰업체 통계·관리</span>
          </button>

          <button
            type="button"
            onClick={() => setIsQuickVisitOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors whitespace-nowrap"
          >
            <CalendarClock className="w-4 h-4" />
            <span>방문견적 빠른 접수</span>
          </button>

          <Link
            href="/estimates/new"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 bg-blue-600 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold hover:bg-blue-700 transition-colors shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>새 견적 작성</span>
          </Link>
        </div>
      </div>

      {/* 오프라인 저장된 미동기화 견적 배너 */}
      <OfflineEstimatesNotice />

      {/* 의뢰 이사업체별 빠른 필터 탭 바 */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-extrabold text-gray-600 flex items-center gap-1 mr-1">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>의뢰업체별:</span>
            </span>

            <button
              type="button"
              onClick={() => setPartnerFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                partnerFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              전체 ({parsedEstimates.length})
            </button>

            {partnerTabs.list.map(pt => {
              const isSelected = partnerFilter === pt.name
              const style = getPartnerBadgeStyle(pt.color)
              return (
                <button
                  key={pt.name}
                  type="button"
                  onClick={() => setPartnerFilter(pt.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-1.5 ${
                    isSelected
                      ? `${style.activeBtnClass} shadow-2xs`
                      : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSelected ? 'bg-white' : style.dotClass
                    }`}
                  />
                  <span>{pt.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isSelected ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {pt.count}
                  </span>
                </button>
              )
            })}

            <button
              type="button"
              onClick={() => setPartnerFilter('__DIRECT__')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                partnerFilter === '__DIRECT__'
                  ? 'bg-slate-700 text-white border-slate-700 shadow-2xs'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              자체/미지정 ({partnerTabs.directCount})
            </button>

            <button
              type="button"
              onClick={() => {
                setPartnerModalTab('MANAGE')
                setIsPartnerModalOpen(true)
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>추가</span>
            </button>
          </div>

          {/* 현재 선택된 조건 실시간 요약 */}
          <div className="flex items-center gap-3 text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span>
              조회: <strong className="text-gray-900">{filteredSummary.total}건</strong>
            </span>
            <span>·</span>
            <span>
              계약성사:{' '}
              <strong className="text-emerald-700">
                {filteredSummary.contracted}건 ({filteredSummary.rate}%)
              </strong>
            </span>
            <span>·</span>
            <span>
              계약 공급가액:{' '}
              <strong className="text-blue-700">
                {filteredSummary.supplySum.toLocaleString()}원
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* 검색창 및 목록 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-2.5 sm:gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="식별코드, 고객명, 연락처, 의뢰업체명, 주소 검색..."
              className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 py-2 text-xs sm:text-sm focus:border-blue-500 outline-none"
            />
          </div>
          <select
            value={movingTypeFilter}
            onChange={e => setMovingTypeFilter(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold focus:border-blue-500 outline-none"
          >
            <option value="">모든 이사종류</option>
            <option value="P">포장이사</option>
            <option value="G">일반이사</option>
            <option value="K">보관이사</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100/90 text-gray-800 text-xs sm:text-sm font-semibold border-b border-gray-200">
                <th className="p-3.5 font-bold whitespace-nowrap">식별코드</th>
                <th className="p-3.5 font-bold whitespace-nowrap">의뢰 이사업체</th>
                <th className="p-3.5 font-bold whitespace-nowrap">고객명</th>
                <th className="p-3.5 font-bold whitespace-nowrap">연락처</th>
                <th className="p-3.5 font-bold whitespace-nowrap">이사종류</th>
                <th className="p-3.5 font-bold whitespace-nowrap">견적작업자</th>
                <th className="p-3.5 font-bold whitespace-nowrap">방문견적일시</th>
                <th className="p-3.5 font-bold whitespace-nowrap">이사예정일</th>
                <th className="p-3.5 font-bold whitespace-nowrap">결제상태</th>
                <th className="p-3.5 font-bold text-right whitespace-nowrap">공급가액 (VAT별도)</th>
              </tr>
            </thead>
            <tbody>
              {filteredEstimates.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-600 font-medium text-sm">
                    조건에 해당하는 견적이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredEstimates.map(est => {
                  const payPlanObj = est.payPlanObj || {}
                  let paymentStatusText = '미입금'
                  let paymentStatusClass = 'bg-gray-100 text-gray-800 border border-gray-300'

                  if (payPlanObj.balancePaid) {
                    paymentStatusText = '정산완료'
                    paymentStatusClass = 'bg-green-100 text-green-800 border border-green-300'
                  } else if (payPlanObj.intermediatePaymentPaid) {
                    paymentStatusText = '중도금 완료'
                    paymentStatusClass = 'bg-blue-100 text-blue-800 border border-blue-300'
                  } else if (payPlanObj.downPaymentPaid) {
                    paymentStatusText = '계약금 완료'
                    paymentStatusClass = 'bg-amber-100 text-amber-900 border border-amber-300'
                  }

                  const pStyle = getPartnerBadgeStyle(est.partnerColor)

                  return (
                    <EstimateRow key={est.id} id={est.id}>
                      <td className="p-3.5 font-bold text-blue-600 whitespace-nowrap">{est.id}</td>
                      <td className="p-3.5 whitespace-nowrap">
                        {est.partnerName ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-extrabold border ${pStyle.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pStyle.dotClass}`} />
                            {est.partnerName}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                            자체/미지정
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-gray-900 whitespace-nowrap">
                        {est.customerName}
                      </td>
                      <td className="p-3.5 font-medium text-gray-900 whitespace-nowrap">
                        {formatPhoneNumber(est.contact)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-900 rounded-md text-xs font-bold border border-gray-200">
                            {est.movingType === 'P'
                              ? '포장이사'
                              : est.movingType === 'G'
                                ? '일반이사'
                                : '보관이사'}
                          </span>
                          {est.estDistance ? (
                            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {est.estDistance}km
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-3.5 font-semibold text-gray-800 whitespace-nowrap">
                        {est.estimatorName || '-'}
                      </td>
                      <td className="p-3.5 font-medium text-gray-900 whitespace-nowrap">
                        {est.visitDate ? (
                          <span className="text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {format(new Date(est.visitDate), 'yyyy-MM-dd HH:mm', { locale: ko })}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {format(new Date(est.estimateDate), 'yyyy-MM-dd', { locale: ko })} (접수)
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-medium text-gray-900 whitespace-nowrap">
                        {est.movingDate
                          ? format(new Date(est.movingDate), 'yyyy-MM-dd', { locale: ko })
                          : '-'}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${paymentStatusClass}`}>
                            {paymentStatusText}
                          </span>
                          {(payPlanObj.balancePaid ||
                            (est.taxFiling?.status && est.taxFiling.status !== 'UNFILED')) && (
                            <button
                              type="button"
                              onClick={ev => {
                                ev.stopPropagation()
                                setSontaxSingleTarget({
                                  id: est.id,
                                  customerName: est.customerName,
                                  contact: est.contact,
                                  movingType: est.movingType,
                                  movingDate: est.movingDate,
                                  estimateDate: est.estimateDate,
                                  supplyAmount: est.supplyAmount,
                                  vat: est.vat || Math.floor(est.supplyAmount * 0.1),
                                  totalAmount:
                                    est.totalAmount ||
                                    est.supplyAmount + (est.vat || Math.floor(est.supplyAmount * 0.1)),
                                  paymentTarget: payPlanObj.targetType === 'supply' ? 'supply' : 'total',
                                  balancePaid: Boolean(payPlanObj.balancePaid),
                                  balanceDate: payPlanObj.balanceDate || null,
                                  partnerName: est.partnerName,
                                  taxFiling: est.taxFiling,
                                })
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-extrabold border transition-colors ${
                                getTaxFilingBadgeInfo(est.taxFiling, Boolean(payPlanObj.balancePaid)).className
                              }`}
                              title="클릭하여 손택스/홈택스 바로발행 도우미 열기"
                            >
                              <Smartphone className="w-3 h-3" />
                              <span>
                                {
                                  getTaxFilingBadgeInfo(
                                    est.taxFiling,
                                    Boolean(payPlanObj.balancePaid)
                                  ).label
                                }
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-bold text-gray-900 whitespace-nowrap">
                        {est.supplyAmount.toLocaleString()}원
                      </td>
                    </EstimateRow>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 방문견적 빠른 예약 모달 */}
      <QuickVisitBookingModal
        isOpen={isQuickVisitOpen}
        onClose={() => setIsQuickVisitOpen(false)}
        initialPartners={partners}
      />

      {/* 의뢰업체별 통계 및 마스터 관리 모달 */}
      <PartnerStatsAndManageModal
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
        estimates={initialEstimates}
        initialTab={partnerModalTab}
        onPartnersUpdated={setPartners}
      />

      {/* 손택스 · 홈택스 일괄신고 관리 모달 */}
      <SontaxBatchCenterModal
        isOpen={isSontaxBatchOpen}
        onClose={() => setIsSontaxBatchOpen(false)}
        estimates={parsedEstimates.map(est => ({
          id: est.id,
          customerName: est.customerName,
          contact: est.contact,
          movingType: est.movingType,
          movingDate: est.movingDate,
          estimateDate: est.estimateDate,
          supplyAmount: est.supplyAmount,
          vat: est.vat || Math.floor(est.supplyAmount * 0.1),
          totalAmount:
            est.totalAmount ||
            est.supplyAmount + (est.vat || Math.floor(est.supplyAmount * 0.1)),
          paymentTarget: est.payPlanObj?.targetType === 'supply' ? 'supply' : 'total',
          balancePaid: Boolean(est.payPlanObj?.balancePaid),
          balanceDate: est.payPlanObj?.balanceDate || null,
          partnerName: est.partnerName,
          taxFiling: est.taxFiling,
        }))}
        onOpenSingleModal={target => setSontaxSingleTarget(target)}
        onStatusUpdated={(estimateId, updated) =>
          setLocalTaxFilingMap(prev => ({ ...prev, [estimateId]: updated }))
        }
      />

      {/* 개별 건 손택스 바로발행 도우미 모달 */}
      <SontaxSingleFilingModal
        isOpen={Boolean(sontaxSingleTarget)}
        onClose={() => setSontaxSingleTarget(null)}
        estimate={sontaxSingleTarget}
        onSaved={(estimateId, updated) =>
          setLocalTaxFilingMap(prev => ({ ...prev, [estimateId]: updated }))
        }
      />
    </div>
  )
}

