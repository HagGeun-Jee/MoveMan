'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  PhoneCall,
  CheckCircle2,
  FileSpreadsheet,
  Receipt,
  X,
  AlertCircle,
  Building2,
  Sparkles,
} from 'lucide-react'
import { saveEstimateTaxFiling } from '@/app/actions/estimate'
import { formatPhoneNumber } from '@/lib/format'

export type TaxFilingStatus = 'UNFILED' | 'CASH_RECEIPT' | 'TAX_INVOICE' | 'EXEMPT'

export interface TaxFilingInfo {
  status: TaxFilingStatus
  usageType?: 'INCOME_DEDUCTION' | 'EXPENSE_PROOF'
  calcMode?: 'TOTAL_STANDARD' | 'SUPPLY_INCLUSIVE' | 'CUSTOM'
  identityNum?: string
  supplyAmount?: number
  vatAmount?: number
  totalAmount?: number
  issuedDate?: string
  approvalNo?: string
  updatedAt?: string
}

export function getTaxFilingBadgeInfo(taxFiling?: TaxFilingInfo | null, isBalancePaid?: boolean) {
  const status = taxFiling?.status || 'UNFILED'
  if (status === 'CASH_RECEIPT') {
    return {
      status,
      label: '현금영수증 완료',
      shortLabel: '현금영수증',
      className: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    }
  }
  if (status === 'TAX_INVOICE') {
    return {
      status,
      label: '세금계산서 완료',
      shortLabel: '세금계산서',
      className: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    }
  }
  if (status === 'EXEMPT') {
    return {
      status,
      label: '발행제외',
      shortLabel: '발행제외',
      className: 'bg-gray-100 text-gray-600 border-gray-300',
    }
  }
  if (isBalancePaid) {
    return {
      status: 'UNFILED' as const,
      label: '손택스 발행대기',
      shortLabel: '발행대기',
      className: 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse',
    }
  }
  return {
    status: 'UNFILED' as const,
    label: '미신고',
    shortLabel: '미신고',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  }
}

/**
 * 단말기 환경(Android / iOS / PC)에 맞춰 손택스 앱 또는 홈택스 웹사이트를 실행
 */
export function launchSontaxAppOrWeb() {
  if (typeof window === 'undefined') return
  const ua = navigator.userAgent || ''
  const isAndroid = /Android/i.test(ua)
  const isIOS = /iPhone|iPad|iPod/i.test(ua)

  if (isAndroid) {
    // 국세청 손택스 공식 안드로이드 패키지명: kr.go.nts.android
    const intentUrl =
      'intent://main#Intent;scheme=sontax;package=kr.go.nts.android;S.browser_fallback_url=' +
      encodeURIComponent('https://play.google.com/store/apps/details?id=kr.go.nts.android') +
      ';end'
    window.location.href = intentUrl
    return
  }

  if (isIOS) {
    // iOS 손택스 앱스토어 또는 모바일 홈택스 연결
    window.open('https://apps.apple.com/kr/app/%EA%B5%AD%EC%84%B8%EC%B2%AD-%EC%86%90%ED%83%9D%EC%8A%A4/id495157796', '_blank')
    return
  }

  // PC 환경: 국세청 홈택스 새 탭 열기
  window.open('https://www.hometax.go.kr', '_blank', 'noopener,noreferrer')
}

export interface SontaxTargetEstimate {
  id: string
  customerName: string
  contact: string
  movingType: string
  movingDate?: Date | string | null
  estimateDate?: Date | string | null
  supplyAmount: number
  vat: number
  totalAmount: number
  paymentTarget?: 'supply' | 'total'
  balancePaid?: boolean
  balanceDate?: string | null
  partnerName?: string
  taxFiling?: TaxFilingInfo | null
}

/**
 * 개별 견적 건 [손택스/홈택스 원클릭 바로발행 도우미] 모달
 */
export function SontaxSingleFilingModal({
  isOpen,
  onClose,
  estimate,
  onSaved,
}: {
  isOpen: boolean
  onClose: () => void
  estimate: SontaxTargetEstimate | null
  onSaved?: (estimateId: string, updated: TaxFilingInfo) => void
}) {
  const cleanPhone = (estimate?.contact || '').replace(/[^0-9]/g, '')
  const existing = estimate?.taxFiling

  const defaultCalcMode: 'TOTAL_STANDARD' | 'SUPPLY_INCLUSIVE' | 'CUSTOM' =
    existing?.calcMode ||
    (estimate?.paymentTarget === 'supply' ? 'SUPPLY_INCLUSIVE' : 'TOTAL_STANDARD')

  const [usageType, setUsageType] = useState<'INCOME_DEDUCTION' | 'EXPENSE_PROOF'>(
    existing?.usageType || 'INCOME_DEDUCTION'
  )
  const [calcMode, setCalcMode] = useState<'TOTAL_STANDARD' | 'SUPPLY_INCLUSIVE' | 'CUSTOM'>(
    defaultCalcMode
  )
  const [identityNum, setIdentityNum] = useState<string>(existing?.identityNum || cleanPhone)

  const baseSupply = Number(estimate?.supplyAmount) || 0
  const baseVat = Number(estimate?.vat) || Math.floor(baseSupply * 0.1)
  const baseTotal = Number(estimate?.totalAmount) || baseSupply + baseVat

  const [supplyInput, setSupplyInput] = useState<number>(existing?.supplyAmount ?? baseSupply)
  const [vatInput, setVatInput] = useState<number>(existing?.vatAmount ?? baseVat)
  const [totalInput, setTotalInput] = useState<number>(existing?.totalAmount ?? baseTotal)

  const [issuedDate, setIssuedDate] = useState<string>(
    existing?.issuedDate || format(new Date(), 'yyyy-MM-dd')
  )
  const [approvalNo, setApprovalNo] = useState<string>(existing?.approvalNo || '')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [showArsGuide, setShowArsGuide] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 모달이 열리거나 대상 견적이 변경될 때 폼 초기값 동기화
  useEffect(() => {
    if (!isOpen || !estimate) return
    const phone = (estimate.contact || '').replace(/[^0-9]/g, '')
    const tf = estimate.taxFiling
    const mode: 'TOTAL_STANDARD' | 'SUPPLY_INCLUSIVE' | 'CUSTOM' =
      tf?.calcMode ||
      (estimate.paymentTarget === 'supply' ? 'SUPPLY_INCLUSIVE' : 'TOTAL_STANDARD')

    setUsageType(tf?.usageType || 'INCOME_DEDUCTION')
    setCalcMode(mode)
    setIdentityNum(tf?.identityNum || phone)
    setIssuedDate(tf?.issuedDate || format(new Date(), 'yyyy-MM-dd'))
    setApprovalNo(tf?.approvalNo || '')

    const bSupply = Number(estimate.supplyAmount) || 0
    const bVat = Number(estimate.vat) || Math.floor(bSupply * 0.1)
    if (tf?.totalAmount !== undefined && tf?.supplyAmount !== undefined) {
      setSupplyInput(tf.supplyAmount)
      setVatInput(tf.vatAmount ?? 0)
      setTotalInput(tf.totalAmount)
    } else if (mode === 'SUPPLY_INCLUSIVE') {
      const calcSup = Math.round(bSupply / 1.1)
      setSupplyInput(calcSup)
      setVatInput(bSupply - calcSup)
      setTotalInput(bSupply)
    } else {
      setSupplyInput(bSupply)
      setVatInput(bVat)
      setTotalInput(bSupply + bVat)
    }
  }, [isOpen, estimate?.id])

  useEffect(() => {
    if (!isOpen || !estimate) return
    if (calcMode === 'TOTAL_STANDARD') {
      setSupplyInput(baseSupply)
      setVatInput(baseVat)
      setTotalInput(baseSupply + baseVat)
    } else if (calcMode === 'SUPPLY_INCLUSIVE') {
      const inclusiveTotal = baseSupply
      const calcSup = Math.round(inclusiveTotal / 1.1)
      const calcVat = inclusiveTotal - calcSup
      setSupplyInput(calcSup)
      setVatInput(calcVat)
      setTotalInput(inclusiveTotal)
    }
  }, [calcMode, baseSupply, baseVat, isOpen])

  if (!isOpen || !estimate) return null

  const copyText = async (key: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = val
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    }
  }

  const handleCopyAndLaunchSontax = async () => {
    await copyText('launch', identityNum.replace(/[^0-9]/g, ''))
    launchSontaxAppOrWeb()
  }

  const handleSaveStatus = async (nextStatus: TaxFilingStatus) => {
    setIsSaving(true)
    try {
      const payload: TaxFilingInfo = {
        status: nextStatus,
        usageType,
        calcMode,
        identityNum: identityNum.replace(/[^0-9]/g, ''),
        supplyAmount: supplyInput,
        vatAmount: vatInput,
        totalAmount: totalInput,
        issuedDate: nextStatus === 'UNFILED' ? '' : issuedDate || format(new Date(), 'yyyy-MM-dd'),
        approvalNo: nextStatus === 'UNFILED' ? '' : approvalNo.trim(),
        updatedAt: new Date().toISOString(),
      }

      if (estimate.id) {
        const res = await saveEstimateTaxFiling(estimate.id, payload)
        if (!res.success) {
          alert(res.error || '저장에 실패했습니다.')
          return
        }
      }

      onSaved?.(estimate.id, payload)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const badge = getTaxFilingBadgeInfo(existing, estimate.balancePaid)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="text-sm sm:text-base font-black flex items-center gap-2">
                <span>손택스 · 홈택스 바로발행 도우미</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold border ${badge.className}`}>
                  {badge.label}
                </span>
              </h3>
              <p className="text-[11px] text-emerald-100 mt-0.5">
                {estimate.customerName} 고객님 ({estimate.id}) · 원클릭 번호/금액 복사 후 손택스 앱 즉시 연동
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-4 space-y-4 overflow-y-auto text-xs sm:text-sm">
          {/* 1. 발행 용도 및 금액 산정 기준 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 space-y-1.5">
              <label className="block text-[11px] font-extrabold text-gray-600">
                ① 현금영수증 / 계산서 용도
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setUsageType('INCOME_DEDUCTION')
                    if (!identityNum) setIdentityNum(cleanPhone)
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-extrabold border transition-all ${
                    usageType === 'INCOME_DEDUCTION'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  개인 소득공제
                </button>
                <button
                  type="button"
                  onClick={() => setUsageType('EXPENSE_PROOF')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-extrabold border transition-all ${
                    usageType === 'EXPENSE_PROOF'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  사업자 지출증빙
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 space-y-1.5">
              <label className="block text-[11px] font-extrabold text-gray-600">
                ② 발행 금액 산정 방식
              </label>
              <select
                value={calcMode}
                onChange={e => setCalcMode(e.target.value as any)}
                className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-extrabold text-gray-900 outline-none focus:border-emerald-600"
              >
                <option value="TOTAL_STANDARD">
                  공급대가 기준 ({baseTotal.toLocaleString()}원 = 공급가+VAT)
                </option>
                <option value="SUPPLY_INCLUSIVE">
                  실수령 공급가액 역산 ({baseSupply.toLocaleString()}원 내 VAT포함)
                </option>
                <option value="CUSTOM">직접 금액 입력</option>
              </select>
            </div>
          </div>

          {/* 2. 손택스 붙여넣기용 핵심 3대 복사 박스 */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                손택스 앱에 그대로 붙여넣을 정보
              </span>
              <span className="text-[11px] font-bold text-emerald-700">
                손택스 → [현금영수증 발급] → 총발행금액 입력 시 VAT 자동분리
              </span>
            </div>

            {/* 발급수단번호 (휴대폰 / 사업자번호) */}
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-gray-500">
                  {usageType === 'INCOME_DEDUCTION'
                    ? '소비자 휴대폰번호 (숫자만)'
                    : '사업자등록번호 / 휴대폰번호 (숫자만)'}
                </div>
                <input
                  type="text"
                  value={identityNum}
                  onChange={e => setIdentityNum(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="01012345678"
                  className="w-full mt-0.5 font-mono text-base sm:text-lg font-black text-gray-900 outline-none border-b border-dashed border-gray-300 focus:border-emerald-600"
                />
              </div>
              <button
                type="button"
                onClick={() => copyText('idNum', identityNum)}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1 shrink-0 shadow-2xs"
              >
                {copiedKey === 'idNum' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'idNum' ? '복사됨!' : '번호 복사'}</span>
              </button>
            </div>

            {/* 총 발행금액 / 공급가액 / 부가세 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="bg-white p-2.5 rounded-xl border-2 border-emerald-500 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-emerald-800">
                    총 발행금액 (손택스용)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText('total', String(totalInput))}
                    className="text-[11px] font-extrabold text-emerald-700 hover:underline flex items-center gap-0.5"
                  >
                    {copiedKey === 'total' ? '복사됨' : '복사'}
                  </button>
                </div>
                <input
                  type="number"
                  value={totalInput}
                  onChange={e => {
                    const tot = Number(e.target.value) || 0
                    const sup = Math.round(tot / 1.1)
                    setCalcMode('CUSTOM')
                    setTotalInput(tot)
                    setSupplyInput(sup)
                    setVatInput(tot - sup)
                  }}
                  className="mt-1 font-mono text-base font-black text-emerald-900 outline-none w-full"
                />
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500">공급가액 (계산서용)</span>
                  <button
                    type="button"
                    onClick={() => copyText('supply', String(supplyInput))}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    {copiedKey === 'supply' ? '복사됨' : '복사'}
                  </button>
                </div>
                <input
                  type="number"
                  value={supplyInput}
                  onChange={e => {
                    const sup = Number(e.target.value) || 0
                    const v = Math.floor(sup * 0.1)
                    setCalcMode('CUSTOM')
                    setSupplyInput(sup)
                    setVatInput(v)
                    setTotalInput(sup + v)
                  }}
                  className="mt-1 font-mono text-sm font-extrabold text-gray-800 outline-none w-full"
                />
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-gray-500">부가세 (10%)</span>
                <input
                  type="number"
                  value={vatInput}
                  onChange={e => {
                    const v = Number(e.target.value) || 0
                    setCalcMode('CUSTOM')
                    setVatInput(v)
                    setTotalInput(supplyInput + v)
                  }}
                  className="mt-1 font-mono text-sm font-extrabold text-gray-800 outline-none w-full"
                />
              </div>
            </div>

            {/* 손택스 앱 열기 & 126 ARS 버튼 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyAndLaunchSontax}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-emerald-400" />
                <span>번호 복사 후 손택스/홈택스 열기</span>
              </button>

              <button
                type="button"
                onClick={() => setShowArsGuide(v => !v)}
                className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors"
              >
                <PhoneCall className="w-4 h-4 text-emerald-600" />
                <span>국세청 126 ARS 전화발급 안내</span>
              </button>
            </div>

            {showArsGuide && (
              <div className="bg-white p-3 rounded-xl border border-emerald-300 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-900">
                    📞 국세청 126 ARS 현금영수증 30초 발급 순서
                  </span>
                  <a
                    href="tel:126"
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-extrabold text-xs"
                  >
                    126 전화걸기
                  </a>
                </div>
                <ol className="list-decimal list-inside text-gray-700 space-y-0.5 font-medium">
                  <li>
                    <strong>126</strong> 통화 연결 → <strong>1번</strong>(현금영수증) →{' '}
                    <strong>2번</strong>(가맹점 발급서비스)
                  </li>
                  <li>
                    사업자번호 10자리 + <strong>#</strong> →ARS 비밀번호 4자리 + <strong>#</strong> →{' '}
                    <strong>1번</strong>(발급)
                  </li>
                  <li>
                    휴대폰번호 <strong>{identityNum}</strong> + <strong>#</strong> 입력
                  </li>
                  <li>
                    구분(소득공제 <strong>1번</strong> / 지출증빙 <strong>2번</strong>) → 총금액{' '}
                    <strong>{totalInput}</strong> + <strong>#</strong> 입력하면 즉시 발급!
                  </li>
                </ol>
              </div>
            )}
          </div>

          {/* 3. 발행 완료 일자 및 승인번호 기록 */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2.5">
            <div className="text-xs font-extrabold text-gray-800">
              ③ 발행 완료 후 상태 기록 (중복 발행 방지 및 세무 집계 반영)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-0.5">발행일자</label>
                <input
                  type="date"
                  value={issuedDate}
                  onChange={e => setIssuedDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-900 outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-0.5">
                  승인번호 / 비고 (선택)
                </label>
                <input
                  type="text"
                  value={approvalNo}
                  onChange={e => setApprovalNo(e.target.value)}
                  placeholder="예: 손택스 발급완료 / 승인번호"
                  className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-900 outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveStatus('CASH_RECEIPT')}
                className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>현금영수증 발행완료 저장</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveStatus('TAX_INVOICE')}
                className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1 shadow-xs"
              >
                <Receipt className="w-4 h-4" />
                <span>세금계산서 발행완료 저장</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveStatus('EXEMPT')}
                className="py-2 px-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs"
              >
                발행제외
              </button>

              {existing?.status && existing.status !== 'UNFILED' && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveStatus('UNFILED')}
                  className="py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs"
                >
                  미신고로 초기화
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 견적 목록 상단 [손택스·홈택스 일괄신고 센터] 모달
 * - 잔금 수금 완료(정산완료) 건들의 미신고/신고완료 현황 관리
 * - 국세청 홈택스 현금영수증 일괄발급용 엑셀(CSV) 원클릭 다운로드
 */
export function SontaxBatchCenterModal({
  isOpen,
  onClose,
  estimates,
  onOpenSingleModal,
  onStatusUpdated,
}: {
  isOpen: boolean
  onClose: () => void
  estimates: SontaxTargetEstimate[]
  onOpenSingleModal: (est: SontaxTargetEstimate) => void
  onStatusUpdated: (estimateId: string, updated: TaxFilingInfo) => void
}) {
  const [monthFilter, setMonthFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNFILED' | 'FILED' | 'EXEMPT'>('UNFILED')
  const [onlyBalancePaid, setOnlyBalancePaid] = useState<boolean>(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  // 월 목록 추출
  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    estimates.forEach(e => {
      const d = e.movingDate || e.estimateDate
      if (d) {
        try {
          set.add(format(new Date(d), 'yyyy-MM'))
        } catch {}
      }
    })
    return Array.from(set).sort().reverse()
  }, [estimates])

  const filteredList = useMemo(() => {
    return estimates.filter(e => {
      if (onlyBalancePaid && !e.balancePaid) return false
      if (monthFilter !== 'ALL') {
        const d = e.movingDate || e.estimateDate
        if (!d) return false
        try {
          if (format(new Date(d), 'yyyy-MM') !== monthFilter) return false
        } catch {
          return false
        }
      }
      const st = e.taxFiling?.status || 'UNFILED'
      if (statusFilter === 'UNFILED' && st !== 'UNFILED') return false
      if (statusFilter === 'FILED' && st !== 'CASH_RECEIPT' && st !== 'TAX_INVOICE') return false
      if (statusFilter === 'EXEMPT' && st !== 'EXEMPT') return false
      return true
    })
  }, [estimates, onlyBalancePaid, monthFilter, statusFilter])

  const summary = useMemo(() => {
    const base = estimates.filter(e => (onlyBalancePaid ? e.balancePaid : true))
    const unfiled = base.filter(e => !e.taxFiling?.status || e.taxFiling.status === 'UNFILED')
    const filed = base.filter(
      e => e.taxFiling?.status === 'CASH_RECEIPT' || e.taxFiling?.status === 'TAX_INVOICE'
    )
    const filedTotalSum = filed.reduce(
      (acc, cur) => acc + (cur.taxFiling?.totalAmount || cur.totalAmount || 0),
      0
    )
    return {
      totalCount: base.length,
      unfiledCount: unfiled.length,
      filedCount: filed.length,
      filedTotalSum,
    }
  }, [estimates, onlyBalancePaid])

  if (!isOpen) return null

  // 홈택스 현금영수증 일괄발급 표준 양식(CSV) 다운로드
  const handleDownloadHometaxCsv = () => {
    if (filteredList.length === 0) {
      alert('다운로드할 대상 건이 없습니다.')
      return
    }

    const headers = [
      '순번',
      '발급수단번호(휴대폰/사업자번호)',
      '총거래금액(합계)',
      '공급가액',
      '부가가치세',
      '봉사료',
      '용도구분(0:소득공제,1:지출증빙)',
      '품목명',
      '고객성명',
      '이사일자',
      '견적번호',
      '의뢰업체',
      '신고상태',
    ]

    const rows = filteredList.map((e, idx) => {
      const tf = e.taxFiling
      const idNum = (tf?.identityNum || e.contact || '').replace(/[^0-9]/g, '')
      const isSupplyMode = e.paymentTarget === 'supply'
      const defaultTotal = isSupplyMode ? e.supplyAmount : e.totalAmount
      const defaultSupply = isSupplyMode ? Math.round(e.supplyAmount / 1.1) : e.supplyAmount
      const defaultVat = defaultTotal - defaultSupply

      const totalAmt = tf?.totalAmount ?? defaultTotal
      const supplyAmt = tf?.supplyAmount ?? defaultSupply
      const vatAmt = tf?.vatAmount ?? defaultVat
      const usageCode = tf?.usageType === 'EXPENSE_PROOF' ? '1' : '0'
      const itemName =
        e.movingType === 'P' ? '포장이사' : e.movingType === 'G' ? '일반이사' : '보관이사'
      const moveDateStr = e.movingDate ? format(new Date(e.movingDate), 'yyyy-MM-dd') : ''
      const badge = getTaxFilingBadgeInfo(tf, e.balancePaid)

      return [
        idx + 1,
        `"${idNum}"`,
        totalAmt,
        supplyAmt,
        vatAmt,
        0,
        usageCode,
        `"${itemName}"`,
        `"${(e.customerName || '').replace(/"/g, '""')}"`,
        moveDateStr,
        e.id,
        `"${(e.partnerName || '자체').replace(/"/g, '""')}"`,
        badge.label,
      ].join(',')
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `홈택스_현금영수증_일괄신고_${format(new Date(), 'yyyyMMdd')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleQuickMarkCashReceipt = async (e: SontaxTargetEstimate) => {
    setSavingId(e.id)
    try {
      const isSupplyMode = e.paymentTarget === 'supply'
      const totalAmt = isSupplyMode ? e.supplyAmount : e.totalAmount
      const supplyAmt = isSupplyMode ? Math.round(e.supplyAmount / 1.1) : e.supplyAmount
      const vatAmt = totalAmt - supplyAmt

      const payload: TaxFilingInfo = {
        status: 'CASH_RECEIPT',
        usageType: 'INCOME_DEDUCTION',
        calcMode: isSupplyMode ? 'SUPPLY_INCLUSIVE' : 'TOTAL_STANDARD',
        identityNum: (e.contact || '').replace(/[^0-9]/g, ''),
        supplyAmount: supplyAmt,
        vatAmount: vatAmt,
        totalAmount: totalAmt,
        issuedDate: format(new Date(), 'yyyy-MM-dd'),
        approvalNo: '손택스 발급완료',
        updatedAt: new Date().toISOString(),
      }
      const res = await saveEstimateTaxFiling(e.id, payload)
      if (res.success) {
        onStatusUpdated(e.id, payload)
      } else {
        alert(res.error || '처리 중 오류가 발생했습니다.')
      }
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* 상단 헤더 */}
        <div className="bg-gradient-to-r from-slate-900 to-emerald-900 text-white px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm sm:text-base font-black">
                손택스 · 홈택스 세무신고 관리 센터 (잔금수금 완료 연동)
              </h3>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                이사 및 잔금 수금이 완료된 건을 손택스 앱으로 즉시 발행하거나 홈택스 일괄발급 파일로 다운로드합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 요약 바 및 필터 */}
        <div className="p-3.5 bg-gray-50 border-b border-gray-200 space-y-3">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white p-2.5 rounded-xl border border-gray-200">
              <div className="text-[11px] font-bold text-gray-500">정산완료 대상</div>
              <div className="text-base sm:text-lg font-black text-gray-900">
                {summary.totalCount}건
              </div>
            </div>
            <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              <div className="text-[11px] font-extrabold text-rose-700">손택스 미신고 (발행대기)</div>
              <div className="text-base sm:text-lg font-black text-rose-800">
                {summary.unfiledCount}건
              </div>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              <div className="text-[11px] font-extrabold text-emerald-700">신고완료 합계</div>
              <div className="text-sm sm:text-base font-black text-emerald-900">
                {summary.filedCount}건 ({summary.filedTotalSum.toLocaleString()}원)
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <select
                value={monthFilter}
                onChange={e => setMonthFilter(e.target.value)}
                className="rounded-xl border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-extrabold text-gray-800 outline-none"
              >
                <option value="ALL">전체 기간</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {m}월
                  </option>
                ))}
              </select>

              {[
                { key: 'UNFILED', label: `발행대기 (${summary.unfiledCount})` },
                { key: 'FILED', label: `발행완료 (${summary.filedCount})` },
                { key: 'EXEMPT', label: '발행제외' },
                { key: 'ALL', label: '전체보기' },
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                    statusFilter === tab.key
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <label className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 ml-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyBalancePaid}
                  onChange={e => setOnlyBalancePaid(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>잔금 수금완료 건만 보기</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadHometaxCsv}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-2xs"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>홈택스 일괄발급 엑셀(CSV) 다운로드</span>
              </button>
            </div>
          </div>
        </div>

        {/* 목록 테이블 */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead className="bg-gray-100 border-b border-gray-200 text-gray-700 font-extrabold sticky top-0">
              <tr>
                <th className="p-3 whitespace-nowrap">식별번호</th>
                <th className="p-3 whitespace-nowrap">의뢰업체</th>
                <th className="p-3 whitespace-nowrap">고객명 / 휴대폰</th>
                <th className="p-3 whitespace-nowrap">이사일 / 잔금일</th>
                <th className="p-3 text-right whitespace-nowrap">공급가액</th>
                <th className="p-3 text-right whitespace-nowrap">공급대가(VAT포함)</th>
                <th className="p-3 text-center whitespace-nowrap">신고상태</th>
                <th className="p-3 text-center whitespace-nowrap">손택스 실행 / 완료처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-gray-500 font-bold">
                    해당 조건의 손택스 신고 대상 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredList.map(est => {
                  const badge = getTaxFilingBadgeInfo(est.taxFiling, est.balancePaid)
                  const isUnfiled = !est.taxFiling?.status || est.taxFiling.status === 'UNFILED'
                  return (
                    <tr key={est.id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-600 whitespace-nowrap">
                        {est.id}
                      </td>
                      <td className="p-3 font-bold text-gray-700 whitespace-nowrap">
                        {est.partnerName || '자체'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-extrabold text-gray-900">{est.customerName}</div>
                        <div className="text-xs font-mono text-gray-600">
                          {formatPhoneNumber(est.contact)}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap text-xs">
                        <div className="font-bold text-gray-800">
                          이사: {est.movingDate ? format(new Date(est.movingDate), 'yyyy-MM-dd') : '-'}
                        </div>
                        {est.balanceDate && (
                          <div className="text-emerald-700 font-semibold">
                            잔금: {est.balanceDate}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-gray-800 whitespace-nowrap">
                        {est.supplyAmount.toLocaleString()}원
                      </td>
                      <td className="p-3 text-right font-black text-blue-700 whitespace-nowrap">
                        {est.totalAmount.toLocaleString()}원
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        {est.taxFiling?.issuedDate && (
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {est.taxFiling.issuedDate}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenSingleModal(est)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1 shadow-2xs"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                            <span>손택스 발행</span>
                          </button>
                          {isUnfiled && (
                            <button
                              type="button"
                              disabled={savingId === est.id}
                              onClick={() => handleQuickMarkCashReceipt(est)}
                              className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-extrabold"
                              title="현금영수증 발행완료로 즉시 체크"
                            >
                              {savingId === est.id ? '...' : '✓ 완료체크'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/**
 * 견적 상세 페이지([id]/page.tsx) 상단 액션바에 부착하는 손택스 발행 트리거 버튼
 */
export function SontaxDetailTrigger({ estimate }: { estimate: SontaxTargetEstimate }) {
  const [open, setOpen] = useState(false)
  const [localTaxFiling, setLocalTaxFiling] = useState<TaxFilingInfo | null | undefined>(
    estimate.taxFiling
  )

  const badge = getTaxFilingBadgeInfo(localTaxFiling, estimate.balancePaid)
  const isFiled =
    localTaxFiling?.status === 'CASH_RECEIPT' || localTaxFiling?.status === 'TAX_INVOICE'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border shadow-xs shrink-0 whitespace-nowrap flex items-center gap-1 ${
          isFiled
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
            : estimate.balancePaid
            ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
        }`}
        title="손택스/홈택스 현금영수증·세금계산서 바로발행 도우미"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span>{isFiled ? badge.shortLabel : '손택스신고'}</span>
      </button>

      <SontaxSingleFilingModal
        isOpen={open}
        onClose={() => setOpen(false)}
        estimate={{ ...estimate, taxFiling: localTaxFiling }}
        onSaved={(_id, updated) => setLocalTaxFiling(updated)}
      />
    </>
  )
}

