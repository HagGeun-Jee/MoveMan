'use client'

import React, { useState } from 'react'
import { CostStandardData, updateCostStandards } from '@/app/actions/costStandards'
import { Coins, Truck, Users, Package, TrendingUp, Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  initialData: CostStandardData
}

interface FormattedNumberInputProps {
  value: number
  onChange: (val: number) => void
  suffix?: string
  className?: string
  placeholder?: string
  min?: number
}

function FormattedNumberInput({
  value,
  onChange,
  suffix,
  className = '',
  placeholder = '0',
  min = 0
}: FormattedNumberInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(
    value !== undefined && value !== null ? value.toLocaleString('ko-KR') : '0'
  )

  React.useEffect(() => {
    setDisplayValue(value !== undefined && value !== null ? value.toLocaleString('ko-KR') : '0')
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9]/g, '')
    if (raw.length > 1 && raw.startsWith('0')) {
      raw = raw.replace(/^0+/, '')
      if (raw === '') raw = '0'
    }
    const num = raw === '' ? 0 : parseInt(raw, 10)
    setDisplayValue(raw === '' ? '' : num.toLocaleString('ko-KR'))
    onChange(num)
  }

  const handleBlur = () => {
    if (displayValue === '' || isNaN(parseInt(displayValue.replace(/,/g, ''), 10))) {
      setDisplayValue(min.toLocaleString('ko-KR'))
      onChange(min)
    }
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  return (
    <div className="relative w-full">
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={className}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium pointer-events-none select-none">
          {suffix}
        </span>
      )}
    </div>
  )
}

export default function CostStandardsForm({ initialData }: Props) {
  const [formData, setFormData] = useState<CostStandardData>(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChange = (field: keyof CostStandardData, value: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    const fd = new FormData()
    fd.append('maleLaborCost', formData.maleLaborCost.toString())
    fd.append('femaleLaborCost', formData.femaleLaborCost.toString())
    fd.append('driverAllowance', formData.driverAllowance.toString())
    fd.append('tonnageAllowance6Ton', formData.tonnageAllowance6Ton.toString())
    fd.append('tonnageAllowance7_5Ton', formData.tonnageAllowance7_5Ton.toString())
    fd.append('tonnageAllowance10Ton', formData.tonnageAllowance10Ton.toString())
    fd.append('baseDistanceKm', formData.baseDistanceKm.toString())
    fd.append('distanceStepKm', formData.distanceStepKm.toString())
    fd.append('distanceAllowancePerPerson', formData.distanceAllowancePerPerson.toString())
    fd.append('mealCostPerPerson', formData.mealCostPerPerson.toString())
    fd.append('fuelCostPerKm5Ton', formData.fuelCostPerKm5Ton.toString())
    fd.append('fuelCostPerKm2_5Ton', formData.fuelCostPerKm2_5Ton.toString())
    fd.append('fuelCostPerKm1Ton', formData.fuelCostPerKm1Ton.toString())
    fd.append('tapeUnitPrice', formData.tapeUnitPrice.toString())
    fd.append('tapeRolls1Ton', formData.tapeRolls1Ton.toString())
    fd.append('tapeRolls2_5Ton', formData.tapeRolls2_5Ton.toString())
    fd.append('tapeRolls5Ton', formData.tapeRolls5Ton.toString())
    fd.append('defaultMarginRate', formData.defaultMarginRate.toString())

    try {
      const res = await updateCostStandards(fd)
      if (res.success) {
        setMessage({ type: 'success', text: '원가 기준정보 및 인건비 마스터가 성공적으로 저장되었습니다.' })
        setTimeout(() => setMessage(null), 4000)
      } else {
        setMessage({ type: 'error', text: res.error || '저장에 실패했습니다.' })
      }
    } catch {
      setMessage({ type: 'error', text: '저장 처리 중 오류가 발생했습니다.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetToDefault = () => {
    if (confirm('모든 원가 기준값(인건비/유류비/마진율)을 기본 추천값으로 복원하시겠습니까?')) {
      setFormData({
        id: formData.id,
        maleLaborCost: 190000,
        femaleLaborCost: 170000,
        driverAllowance: 20000,
        tonnageAllowance6Ton: 10000,
        tonnageAllowance7_5Ton: 20000,
        tonnageAllowance10Ton: 30000,
        baseDistanceKm: 40,
        distanceStepKm: 40,
        distanceAllowancePerPerson: 10000,
        mealCostPerPerson: 12000,
        fuelCostPerKm5Ton: 500,
        fuelCostPerKm2_5Ton: 350,
        fuelCostPerKm1Ton: 250,
        tapeUnitPrice: 2000,
        tapeRolls1Ton: 3,
        tapeRolls2_5Ton: 5,
        tapeRolls5Ton: 8,
        defaultMarginRate: 20.0
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-5xl mx-auto pb-6">
      {/* 상단 알림 메시지 */}
      {message && (
        <div
          className={`p-2.5 rounded-xl flex items-center gap-2 transition-all text-xs sm:text-sm font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. 작업원 기본 일당 기준 (인건비) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-3.5 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Users className="w-3 h-3" />
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-gray-900">1. 작업원 기본 일당 기준 (1인 1일)</h2>
          </div>
          <span className="text-[11px] text-gray-500 hidden sm:inline">견적 및 원가 산출 시 자동 반영</span>
        </div>

        <div className="p-2.5 sm:p-3 grid grid-cols-2 gap-2 sm:gap-3">
          {/* 남성 작업원 기본 일당 */}
          <div className="p-2 rounded-lg bg-blue-50/40 border border-blue-100/80">
            <label className="text-xs font-semibold text-gray-800 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                남성 작업원 기본 일당
              </span>
              <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-1 rounded">팀장/남성</span>
            </label>
            <FormattedNumberInput
              value={formData.maleLaborCost}
              onChange={(val) => handleChange('maleLaborCost', val)}
              suffix="원"
              className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs sm:text-sm font-bold text-right pr-7 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-xs"
            />
          </div>

          {/* 여성 작업원 기본 일당 */}
          <div className="p-2 rounded-lg bg-rose-50/40 border border-rose-100/80">
            <label className="text-xs font-semibold text-gray-800 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                여성 작업원 기본 일당
              </span>
              <span className="text-[10px] text-rose-700 font-bold bg-rose-100 px-1 rounded">주방/정리</span>
            </label>
            <FormattedNumberInput
              value={formData.femaleLaborCost}
              onChange={(val) => handleChange('femaleLaborCost', val)}
              suffix="원"
              className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs sm:text-sm font-bold text-right pr-7 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* 2. 인건비 추가 수당 및 식비 기준 (4열 배치) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-3.5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Users className="w-3 h-3" />
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-gray-900">2. 인건비 추가 수당 및 식비 기준</h2>
          </div>
          <span className="text-[11px] text-gray-500 hidden sm:inline">물량·운전자·장거리 수당 및 식비</span>
        </div>

        <div className="p-2.5 sm:p-3 space-y-2">
          {/* 행 1: 물량(톤수) 및 운전자 추가 수당 4종 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* 운전자 추가 수당 */}
            <div className="p-2 rounded-lg bg-gray-50/70 border border-gray-200">
              <label className="block mb-1">
                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[11px]">
                  운전자 수당
                </span>
              </label>
              <FormattedNumberInput
                value={formData.driverAllowance}
                onChange={(val) => handleChange('driverAllowance', val)}
                suffix="원"
                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-right pr-6 focus:border-blue-500 outline-none"
              />
            </div>

            {/* 6톤 초과 수당 */}
            <div className="p-2 rounded-lg bg-blue-50/40 border border-blue-100">
              <label className="block mb-1">
                <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[11px]">
                  6톤 초과 수당
                </span>
              </label>
              <FormattedNumberInput
                value={formData.tonnageAllowance6Ton}
                onChange={(val) => handleChange('tonnageAllowance6Ton', val)}
                suffix="원"
                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-right pr-6 focus:border-blue-500 outline-none"
              />
            </div>

            {/* 7.5톤 초과 수당 */}
            <div className="p-2 rounded-lg bg-indigo-50/40 border border-indigo-100">
              <label className="block mb-1">
                <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[11px]">
                  7.5톤 초과 수당
                </span>
              </label>
              <FormattedNumberInput
                value={formData.tonnageAllowance7_5Ton}
                onChange={(val) => handleChange('tonnageAllowance7_5Ton', val)}
                suffix="원"
                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-right pr-6 focus:border-indigo-500 outline-none"
              />
            </div>

            {/* 10톤 이상 초과 수당 */}
            <div className="p-2 rounded-lg bg-purple-50/40 border border-purple-100">
              <label className="block mb-1">
                <span className="inline-block px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[11px]">
                  10톤 초과 수당
                </span>
              </label>
              <FormattedNumberInput
                value={formData.tonnageAllowance10Ton}
                onChange={(val) => handleChange('tonnageAllowance10Ton', val)}
                suffix="원"
                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-right pr-6 focus:border-purple-500 outline-none"
              />
            </div>
          </div>

          {/* 행 2: 장거리 및 식비 4종 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* 장거리 기준거리 */}
            <div className="p-2 rounded-lg bg-gray-50/70 border border-gray-200">
              <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between mb-1">
                <span>장거리 기준거리</span>
                <span className="text-[10px] text-blue-600 font-medium">기본한도</span>
              </label>
              <FormattedNumberInput
                value={formData.baseDistanceKm}
                onChange={(val) => handleChange('baseDistanceKm', val)}
                suffix="km"
                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-right pr-7 focus:border-blue-500 outline-none"
              />
            </div>

            {/* 초과 단위거리 */}
            <div className="p-2 rounded-lg bg-gray-50/70 border border-gray-200">
              <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between mb-1">
                <span>초과 단위거리</span>
                <span className="text-[10px] text-blue-600 font-medium">할증주기</span>
              </label>
              <FormattedNumberInput
                value={formData.distanceStepKm}
                onChange={(val) => handleChange('distanceStepKm', val)}
                suffix="km"
                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-right pr-7 focus:border-blue-500 outline-none"
              />
            </div>

            {/* 초과 구간당 1인 수당 */}
            <div className="p-2 rounded-lg bg-gray-50/70 border border-gray-200">
              <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between mb-1">
                <span>초과 구간 수당</span>
                <span className="text-[10px] text-blue-600 font-medium">인당</span>
              </label>
              <FormattedNumberInput
                value={formData.distanceAllowancePerPerson}
                onChange={(val) => handleChange('distanceAllowancePerPerson', val)}
                suffix="원"
                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-right pr-6 focus:border-blue-500 outline-none"
              />
            </div>

            {/* 작업원 식대 */}
            <div className="p-2 rounded-lg bg-gray-50/70 border border-gray-200">
              <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between mb-1">
                <span>작업원 식대</span>
                <span className="text-[10px] text-blue-600 font-medium">1인 점심</span>
              </label>
              <FormattedNumberInput
                value={formData.mealCostPerPerson}
                onChange={(val) => handleChange('mealCostPerPerson', val)}
                suffix="원"
                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-right pr-6 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. 차종별 유류비 기준 (3열 배치) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-3.5 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Truck className="w-3 h-3" />
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-gray-900">3. 차종별 유류비 단가 기준 (왕복 거리 곱 / km당)</h2>
          </div>
          <span className="text-[11px] text-gray-500 hidden sm:inline">실제 주행거리 × 2 기준</span>
        </div>

        <div className="p-2.5 sm:p-3 grid grid-cols-3 gap-2 sm:gap-2.5">
          {/* 5톤 탑차 */}
          <div className="p-2 rounded-lg bg-emerald-50/30 border border-emerald-100">
            <label className="text-[11px] font-bold text-gray-800 flex items-center justify-between mb-1">
              <span>5톤 탑차</span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1 rounded">대형</span>
            </label>
            <FormattedNumberInput
              value={formData.fuelCostPerKm5Ton}
              onChange={(val) => handleChange('fuelCostPerKm5Ton', val)}
              suffix="원 / km"
              className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs sm:text-sm font-semibold text-right pr-12 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* 2.5톤 탑차 */}
          <div className="p-2 rounded-lg bg-teal-50/30 border border-teal-100">
            <label className="text-[11px] font-bold text-gray-800 flex items-center justify-between mb-1">
              <span>2.5톤 탑차</span>
              <span className="text-[10px] text-teal-700 font-bold bg-teal-100 px-1 rounded">중형</span>
            </label>
            <FormattedNumberInput
              value={formData.fuelCostPerKm2_5Ton}
              onChange={(val) => handleChange('fuelCostPerKm2_5Ton', val)}
              suffix="원 / km"
              className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs sm:text-sm font-semibold text-right pr-12 focus:border-teal-500 outline-none"
            />
          </div>

          {/* 1톤 탑차 */}
          <div className="p-2 rounded-lg bg-cyan-50/30 border border-cyan-100">
            <label className="text-[11px] font-bold text-gray-800 flex items-center justify-between mb-1">
              <span>1톤 탑차</span>
              <span className="text-[10px] text-cyan-700 font-bold bg-cyan-100 px-1 rounded">소형</span>
            </label>
            <FormattedNumberInput
              value={formData.fuelCostPerKm1Ton}
              onChange={(val) => handleChange('fuelCostPerKm1Ton', val)}
              suffix="원 / km"
              className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs sm:text-sm font-semibold text-right pr-12 focus:border-cyan-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. 일회성 소모자재비 기준 (4열 배치) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-3.5 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Package className="w-3 h-3" />
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-gray-900">4. 일회성 소모자재비 기준 (OPP 테이프)</h2>
          </div>
          <span className="text-[11px] text-gray-500 hidden sm:inline">단가 및 차종별 소모 롤수</span>
        </div>

        <div className="p-2.5 sm:p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* 테이프 롤당 단가 */}
          <div className="p-2 rounded-lg bg-gray-50/70 border border-gray-200">
            <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between mb-1">
              <span>테이프 롤 단가</span>
              <span className="text-[10px] text-amber-600 font-normal">1롤</span>
            </label>
            <FormattedNumberInput
              value={formData.tapeUnitPrice}
              onChange={(val) => handleChange('tapeUnitPrice', val)}
              suffix="원"
              className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-right pr-6 focus:border-amber-500 outline-none"
            />
          </div>

          {/* 1톤 소모 롤수 */}
          <div className="p-2 rounded-lg bg-gray-50/70 border border-gray-200">
            <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between mb-1">
              <span>1톤차 소모량</span>
              <span className="text-[10px] text-gray-500 font-normal">대당</span>
            </label>
            <FormattedNumberInput
              value={formData.tapeRolls1Ton}
              onChange={(val) => handleChange('tapeRolls1Ton', val)}
              suffix="롤"
              className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-right pr-6 focus:border-amber-500 outline-none"
            />
          </div>

          {/* 2.5톤 소모 롤수 */}
          <div className="p-2 rounded-lg bg-gray-50/70 border border-gray-200">
            <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between mb-1">
              <span>2.5톤 소모량</span>
              <span className="text-[10px] text-gray-500 font-normal">대당</span>
            </label>
            <FormattedNumberInput
              value={formData.tapeRolls2_5Ton}
              onChange={(val) => handleChange('tapeRolls2_5Ton', val)}
              suffix="롤"
              className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-right pr-6 focus:border-amber-500 outline-none"
            />
          </div>

          {/* 5톤 소모 롤수 */}
          <div className="p-2 rounded-lg bg-gray-50/70 border border-gray-200">
            <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between mb-1">
              <span>5톤차 소모량</span>
              <span className="text-[10px] text-gray-500 font-normal">대당</span>
            </label>
            <FormattedNumberInput
              value={formData.tapeRolls5Ton}
              onChange={(val) => handleChange('tapeRolls5Ton', val)}
              suffix="롤"
              className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-right pr-6 focus:border-amber-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 5. 기본 목표 마진율 (인라인 가로 배치) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-3.5 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-3 h-3" />
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-gray-900">5. 기본 목표 마진율 (%)</h2>
          </div>
          <span className="text-[11px] text-gray-500 hidden sm:inline">원가 산출 시뮬레이터 기본 적용</span>
        </div>

        <div className="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">권장 마진율:</span>
            <div className="relative w-32 shrink-0">
              <input
                type="number"
                step="0.5"
                value={formData.defaultMarginRate}
                onChange={(e) => handleChange('defaultMarginRate', parseFloat(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                className="w-full px-2.5 py-1 bg-gray-50 border border-gray-300 rounded text-xs sm:text-sm font-bold text-purple-700 text-right pr-7 focus:bg-white focus:border-purple-500 outline-none shadow-xs"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">%</span>
            </div>
          </div>

          {/* 마진율 빠른 선택 버튼 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-gray-400 shrink-0">빠른 설정:</span>
            {[15, 18, 20, 22, 25, 30].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => handleChange('defaultMarginRate', rate)}
                className={`px-2 py-0.5 text-xs rounded font-semibold transition-all ${
                  formData.defaultMarginRate === rate
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {rate}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 고정 액션 바 */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleResetToDefault}
          className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          기본 추천값 복원
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5"
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? '저장 중...' : '원가 기준정보 저장'}
        </button>
      </div>
    </form>
  )
}

