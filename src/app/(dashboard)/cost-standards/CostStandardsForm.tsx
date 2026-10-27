'use client'

import React, { useState } from 'react'
import { CostStandardData, updateCostStandards } from '@/app/actions/costStandards'
import { Coins, Truck, Users, Package, TrendingUp, Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  initialData: CostStandardData
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
    fd.append('driverAllowance', formData.driverAllowance.toString())
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
        setMessage({ type: 'success', text: '원가 기준정보가 성공적으로 저장되었습니다.' })
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
    if (confirm('모든 원가 기준값을 기본 추천값으로 복원하시겠습니까?')) {
      setFormData({
        id: formData.id,
        driverAllowance: 20000,
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 상단 알림 메시지 */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span className="text-sm font-semibold">{message.text}</span>
        </div>
      )}

      {/* 1. 인건비 및 수당 기준 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">1. 인건비 추가 수당 및 식비 기준</h2>
              <p className="text-xs text-gray-500">운전자 추가 수당, 장거리 이동 수당, 인당 식대 기본값</p>
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 운전자 추가 수당 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>운전자 추가 수당</span>
              <span className="text-[11px] text-blue-600 font-normal">차량 1대당 지급</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.driverAllowance}
                onChange={(e) => handleChange('driverAllowance', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm font-semibold text-right pr-8 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">원</span>
            </div>
            <p className="text-[11px] text-gray-400">투입차량 1대당 운전자 1명에게 추가 지급되는 수당 (기본 20,000원)</p>
          </div>

          {/* 장거리 기준거리 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>장거리 기준거리</span>
              <span className="text-[11px] text-blue-600 font-normal">기본 운행 한도</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.baseDistanceKm}
                onChange={(e) => handleChange('baseDistanceKm', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm font-semibold text-right pr-8 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">km</span>
            </div>
            <p className="text-[11px] text-gray-400">이 거리까지는 기본 이사비용에 포함 (기본 40km)</p>
          </div>

          {/* 장거리 초과 단위거리 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>장거리 초과 단위거리</span>
              <span className="text-[11px] text-blue-600 font-normal">할증 부과 구간</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.distanceStepKm}
                onChange={(e) => handleChange('distanceStepKm', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm font-semibold text-right pr-8 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">km</span>
            </div>
            <p className="text-[11px] text-gray-400">기준거리 초과 시 할증을 부과하는 단위 (기본 매 40km 마다)</p>
          </div>

          {/* 초과 단위당 1인당 추가 수당 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>초과 구간당 1인 추가수당</span>
              <span className="text-[11px] text-blue-600 font-normal">전 작업원 1인당</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.distanceAllowancePerPerson}
                onChange={(e) => handleChange('distanceAllowancePerPerson', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm font-semibold text-right pr-8 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">원</span>
            </div>
            <p className="text-[11px] text-gray-400">매 40km 초과 시마다 전원에게 1인당 지급 (기본 10,000원)</p>
          </div>

          {/* 작업원 식대 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>작업원 식대</span>
              <span className="text-[11px] text-blue-600 font-normal">1인당 식비</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.mealCostPerPerson}
                onChange={(e) => handleChange('mealCostPerPerson', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm font-semibold text-right pr-8 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">원</span>
            </div>
            <p className="text-[11px] text-gray-400">투입 작업원 1인당 점심/식대 소요비용 (기본 12,000원)</p>
          </div>
        </div>
      </div>

      {/* 2. 차량 유류비 기준 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">2. 차종별 유류비 단가 기준 (km당)</h2>
              <p className="text-xs text-gray-500">실제 주행거리(편도)에 곱해질 km당 유류비 단가</p>
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 5톤 탑차 */}
          <div className="space-y-1.5 bg-emerald-50/30 p-3.5 rounded-xl border border-emerald-100">
            <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
              <span>5톤 탑차 유류비</span>
              <span className="text-[11px] text-emerald-700 font-medium">대형</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.fuelCostPerKm5Ton}
                onChange={(e) => handleChange('fuelCostPerKm5Ton', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-right pr-14 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">원 / km</span>
            </div>
            <p className="text-[11px] text-gray-500">5톤 차량 1km 주행 시 연료비 (기본 500원)</p>
          </div>

          {/* 2.5톤 탑차 */}
          <div className="space-y-1.5 bg-teal-50/30 p-3.5 rounded-xl border border-teal-100">
            <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
              <span>2.5톤 탑차 유류비</span>
              <span className="text-[11px] text-teal-700 font-medium">중형</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.fuelCostPerKm2_5Ton}
                onChange={(e) => handleChange('fuelCostPerKm2_5Ton', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-right pr-14 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">원 / km</span>
            </div>
            <p className="text-[11px] text-gray-500">2.5톤 차량 1km 주행 시 연료비 (기본 350원)</p>
          </div>

          {/* 1톤 탑차 */}
          <div className="space-y-1.5 bg-cyan-50/30 p-3.5 rounded-xl border border-cyan-100">
            <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
              <span>1톤 탑차 유류비</span>
              <span className="text-[11px] text-cyan-700 font-medium">소형</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.fuelCostPerKm1Ton}
                onChange={(e) => handleChange('fuelCostPerKm1Ton', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-right pr-14 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">원 / km</span>
            </div>
            <p className="text-[11px] text-gray-500">1톤 차량 1km 주행 시 연료비 (기본 250원)</p>
          </div>
        </div>
      </div>

      {/* 3. 소모성 자재비 기준 (OPP 테이프) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">3. 일회성 소모자재비 기준 (OPP 테이프)</h2>
              <p className="text-xs text-gray-500">박스 포장 등에 소모되는 OPP 테이프 단가 및 차종별 소모 롤수</p>
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 테이프 롤당 단가 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>테이프 롤당 단가</span>
              <span className="text-[11px] text-amber-600 font-normal">구입 단가</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.tapeUnitPrice}
                onChange={(e) => handleChange('tapeUnitPrice', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm font-semibold text-right pr-8 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">원</span>
            </div>
            <p className="text-[11px] text-gray-400">OPP 테이프 1롤당 단가 (기본 2,000원)</p>
          </div>

          {/* 1톤 투입 시 롤수 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>1톤차량 소모 롤수</span>
              <span className="text-[11px] text-gray-500 font-normal">1톤 1대당</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.tapeRolls1Ton}
                onChange={(e) => handleChange('tapeRolls1Ton', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm font-semibold text-right pr-8 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">롤</span>
            </div>
            <p className="text-[11px] text-gray-400">1톤 차량 투입 시 소모량 (기본 3롤 = 6,000원)</p>
          </div>

          {/* 2.5톤 투입 시 롤수 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>2.5톤차량 소모 롤수</span>
              <span className="text-[11px] text-gray-500 font-normal">2.5톤 1대당</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.tapeRolls2_5Ton}
                onChange={(e) => handleChange('tapeRolls2_5Ton', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm font-semibold text-right pr-8 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">롤</span>
            </div>
            <p className="text-[11px] text-gray-400">2.5톤 차량 투입 시 소모량 (기본 5롤 = 10,000원)</p>
          </div>

          {/* 5톤 투입 시 롤수 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>5톤차량 소모 롤수</span>
              <span className="text-[11px] text-gray-500 font-normal">5톤 1대당</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.tapeRolls5Ton}
                onChange={(e) => handleChange('tapeRolls5Ton', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm font-semibold text-right pr-8 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">롤</span>
            </div>
            <p className="text-[11px] text-gray-400">5톤 차량 투입 시 소모량 (기본 8롤 = 16,000원)</p>
          </div>
        </div>
      </div>

      {/* 4. 기본 목표 마진율 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">4. 기본 목표 마진율 (%)</h2>
              <p className="text-xs text-gray-500">원가 산출 시뮬레이터에서 기본으로 적용할 권장 마진율</p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="max-w-md space-y-3">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>기본 목표 마진율</span>
              <span className="text-xs text-purple-600 font-bold">{formData.defaultMarginRate}%</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                value={formData.defaultMarginRate}
                onChange={(e) => handleChange('defaultMarginRate', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-base font-bold text-purple-700 text-right pr-8 focus:bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-bold">%</span>
            </div>

            {/* 마진율 빠른 선택 버튼 */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-gray-400">빠른 설정:</span>
              {[15, 18, 20, 22, 25, 30].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleChange('defaultMarginRate', rate)}
                  className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${
                    formData.defaultMarginRate === rate
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 pt-1">
              * 총 원가 대비 회사 권장 마진율이며, 견적 작성 시 팝업에서 언제든 유연하게 수정할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 하단 고정 액션 바 */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleResetToDefault}
          className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          기본 추천값으로 복원
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? '저장 중...' : '원가 기준정보 저장하기'}
        </button>
      </div>
    </form>
  )
}
