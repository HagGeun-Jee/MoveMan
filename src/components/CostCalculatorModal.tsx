'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Calculator,
  Coins,
  Truck,
  Users,
  Package,
  TrendingUp,
  RotateCcw,
  Check,
  Fuel,
  CreditCard,
  Layers,
  ChevronDown,
  Info
} from 'lucide-react'
import { CostStandardData } from '@/app/actions/costStandards'

interface CostCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (calculatedCost: number) => void
  distanceKm: number
  tollFare: number // 카카오 편도 톨비
  movingType: string
  menCount: number
  womenCount: number
  menUnitPrice?: number // 남성 일당 (기본 180,000)
  womenUnitPrice?: number // 여성 일당 (기본 140,000)
  vehicles?: { name: string; count: number; tonnage?: number }[] // 투입 차량 목록
  ladderTotalCost?: number
  costStandards?: CostStandardData
}

export function CostCalculatorModal({
  isOpen,
  onClose,
  onApply,
  distanceKm,
  tollFare,
  movingType,
  menCount,
  womenCount,
  menUnitPrice = 180000,
  womenUnitPrice = 140000,
  vehicles = [],
  ladderTotalCost = 0,
  costStandards
}: CostCalculatorModalProps) {
  // 기준값 (DB 마스터값 또는 기본 fallback)
  const standards: CostStandardData = useMemo(() => {
    return costStandards || {
      id: 'default_cost_standard',
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
    }
  }, [costStandards])

  // 투입 차량 파싱 (5톤, 2.5톤, 1톤 대수 집계)
  const vehicleStats = useMemo(() => {
    let count5Ton = 0
    let count2_5Ton = 0
    let count1Ton = 0
    let totalCount = 0

    vehicles.forEach(v => {
      const name = v.name || ''
      const count = Number(v.count) || 0
      totalCount += count

      if (name.includes('5톤') || (v.tonnage && v.tonnage >= 5)) {
        count5Ton += count
      } else if (name.includes('2.5톤') || (v.tonnage && v.tonnage >= 2)) {
        count2_5Ton += count
      } else if (name.includes('1톤') || (v.tonnage && v.tonnage >= 1)) {
        count1Ton += count
      } else {
        // 기타 차량은 기본 5톤 단가 적용
        count5Ton += count
      }
    })

    // 투입 차량이 전혀 없으면 1대로 가정
    if (totalCount === 0) {
      count5Ton = 1
      totalCount = 1
    }

    return { count5Ton, count2_5Ton, count1Ton, totalCount }
  }, [vehicles])

  // 장거리 초과 구간 계산 (기준거리 40km 초과 시 매 40km당 1구간)
  const baseDistance = standards.baseDistanceKm || 40
  const stepDistance = standards.distanceStepKm || 40
  const extraDistance = Math.max(0, distanceKm - baseDistance)
  const defaultDistanceStepCount = extraDistance > 0 ? Math.ceil(extraDistance / stepDistance) : 0

  // 1. 인건비 항목 상태 (기본값 자동 세팅 + 수동 수정 가능)
  const [menNum, setMenNum] = useState<number>(menCount || 3)
  const [menRate, setMenRate] = useState<number>(menUnitPrice || 180000)
  const [womenNum, setWomenNum] = useState<number>(womenCount || 1)
  const [womenRate, setWomenRate] = useState<number>(womenUnitPrice || 140000)
  
  // 운전자 추가 수당 (차량대수 x 20,000)
  const [driverCount, setDriverCount] = useState<number>(vehicleStats.totalCount)
  const [driverRate, setDriverRate] = useState<number>(standards.driverAllowance)

  // 장거리 추가 인건비 (인원수 x 구간수 x 10,000)
  const [distanceSteps, setDistanceSteps] = useState<number>(defaultDistanceStepCount)
  const [distanceRatePerPerson, setDistanceRatePerPerson] = useState<number>(standards.distanceAllowancePerPerson)

  // 식비 (총 인원 x 12,000)
  const [mealRate, setMealRate] = useState<number>(standards.mealCostPerPerson)

  // 2. 차량비 항목 상태
  const [fuel5TonCost, setFuel5TonCost] = useState<number>(0)
  const [fuel2_5TonCost, setFuel2_5TonCost] = useState<number>(0)
  const [fuel1TonCost, setFuel1TonCost] = useState<number>(0)
  
  // 왕복 톨게이트비 (편도 톨비 x 2 x 차량대수)
  const [roundTollFare, setRoundTollFare] = useState<number>(0)

  // 3. 일회성 자재비 (OPP 테이프)
  const [tapeUnitPrice, setTapeUnitPrice] = useState<number>(standards.tapeUnitPrice)
  const [tapeRolls, setTapeRolls] = useState<number>(0)

  // 4. 장비/외주비 (사다리차 포함 여부)
  const [includeLadderCost, setIncludeLadderCost] = useState<boolean>(false)
  const [ladderCost, setLadderCost] = useState<number>(ladderTotalCost || 0)

  // 5. 목표 마진율 (%)
  const [marginRate, setMarginRate] = useState<number>(standards.defaultMarginRate || 20.0)
  const [roundToTenThousand, setRoundToTenThousand] = useState<boolean>(true) // 만원 단위 올림 여부

  // 초기 상태 자동 세팅
  const resetToRecommended = () => {
    setMenNum(menCount || 3)
    setMenRate(menUnitPrice || 180000)
    setWomenNum(womenCount || 1)
    setWomenRate(womenUnitPrice || 140000)

    setDriverCount(vehicleStats.totalCount)
    setDriverRate(standards.driverAllowance)

    setDistanceSteps(defaultDistanceStepCount)
    setDistanceRatePerPerson(standards.distanceAllowancePerPerson)
    setMealRate(standards.mealCostPerPerson)

    // 유류비 (편도 거리 x km단가 x 대수)
    const f5 = Math.round(distanceKm * standards.fuelCostPerKm5Ton * vehicleStats.count5Ton)
    const f25 = Math.round(distanceKm * standards.fuelCostPerKm2_5Ton * vehicleStats.count2_5Ton)
    const f1 = Math.round(distanceKm * standards.fuelCostPerKm1Ton * vehicleStats.count1Ton)
    setFuel5TonCost(f5)
    setFuel2_5TonCost(f25)
    setFuel1TonCost(f1)

    // 왕복 톨비 (편도 톨비 x 2 x 차량대수)
    const toll = Math.round(tollFare * 2 * vehicleStats.totalCount)
    setRoundTollFare(toll)

    // OPP 테이프 롤수
    const rolls = (vehicleStats.count5Ton * standards.tapeRolls5Ton) +
                  (vehicleStats.count2_5Ton * standards.tapeRolls2_5Ton) +
                  (vehicleStats.count1Ton * standards.tapeRolls1Ton)
    setTapeRolls(rolls > 0 ? rolls : 3)
    setTapeUnitPrice(standards.tapeUnitPrice)

    setIncludeLadderCost(false)
    setLadderCost(ladderTotalCost || 0)
    setMarginRate(standards.defaultMarginRate || 20.0)
  }

  useEffect(() => {
    if (isOpen) {
      resetToRecommended()
    }
  }, [isOpen, distanceKm, tollFare, vehicleStats, standards, menCount, womenCount, menUnitPrice, womenUnitPrice, ladderTotalCost])

  // 총 인원 수
  const totalWorkers = menNum + womenNum

  // 1. 인건비 합계 계산
  const baseLaborCost = (menNum * menRate) + (womenNum * womenRate)
  const totalDriverAllowance = driverCount * driverRate
  const totalDistanceAllowance = distanceSteps * distanceRatePerPerson * totalWorkers
  const totalMealCost = totalWorkers * mealRate
  const totalLaborCost = baseLaborCost + totalDriverAllowance + totalDistanceAllowance + totalMealCost

  // 2. 차량비 합계 계산 (유류비 + 왕복 톨비)
  const totalFuelCost = fuel5TonCost + fuel2_5TonCost + fuel1TonCost
  const totalVehicleCost = totalFuelCost + roundTollFare

  // 3. 자재비 합계 계산
  const totalMaterialCost = tapeRolls * tapeUnitPrice

  // 4. 장비비 합계 계산
  const totalEquipmentCost = includeLadderCost ? ladderCost : 0

  // 5. 총 원가 (소요비용 합계)
  const totalCost = totalLaborCost + totalVehicleCost + totalMaterialCost + totalEquipmentCost

  // 6. 마진액 및 최종 제안 판매가
  const marginAmount = Math.round(totalCost * (marginRate / 100))
  let rawSellingPrice = totalCost + marginAmount

  // 만원 단위 올림 처리
  const finalSellingPrice = roundToTenThousand 
    ? Math.ceil(rawSellingPrice / 10000) * 10000 
    : rawSellingPrice

  // 이사비용 적용
  const handleApplyClick = () => {
    onApply(finalSellingPrice)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* 모달 헤더 */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Coins className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                원가 기반 이사비용 산출 시뮬레이터
                <span className="text-[11px] font-normal bg-amber-500/50 text-amber-100 px-2 py-0.5 rounded-full border border-amber-400/30">
                  방안 2 : 실시간 원가 + 마진율
                </span>
              </h2>
              <p className="text-xs text-amber-100/90">
                주행거리 {distanceKm}km, 차량 {vehicleStats.totalCount}대, 작업원 {totalWorkers}명 기준 자동 추천
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetToRecommended}
              className="px-2.5 py-1 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white rounded-lg transition-colors flex items-center gap-1"
              title="추천 기본값으로 다시 계산"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">재계산</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 모달 본문 (스크롤) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-gray-800 text-xs sm:text-sm">
          {/* 주요 기준 현황 요약 배너 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
            <div>
              <span className="text-[11px] text-gray-500">실제 주행거리:</span>
              <p className="font-bold text-gray-900 text-sm">
                {distanceKm} km{' '}
                <span className="text-[11px] font-normal text-amber-700">
                  ({distanceKm <= baseDistance ? `기준거리 ${baseDistance}km 이내` : `${(distanceKm - baseDistance).toFixed(1)}km 초과`})
                </span>
              </p>
            </div>
            <div>
              <span className="text-[11px] text-gray-500">카카오 톨게이트비:</span>
              <p className="font-bold text-gray-900 text-sm">
                {tollFare > 0 ? (
                  <>
                    편도 {tollFare.toLocaleString()}원{' '}
                    <span className="text-[11px] font-semibold text-blue-600">(왕복 {(tollFare * 2).toLocaleString()}원)</span>
                  </>
                ) : (
                  <span className="text-gray-400 font-normal">통행료 없음 (0원)</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-gray-500">투입 차량:</span>
              <p className="font-bold text-gray-900 text-sm">
                총 {vehicleStats.totalCount}대{' '}
                <span className="text-[11px] font-normal text-gray-600">
                  (5톤 {vehicleStats.count5Ton}, 2.5톤 {vehicleStats.count2_5Ton}, 1톤 {vehicleStats.count1Ton})
                </span>
              </p>
            </div>
            <div>
              <span className="text-[11px] text-gray-500">작업 인원:</span>
              <p className="font-bold text-gray-900 text-sm">
                총 {totalWorkers}명{' '}
                <span className="text-[11px] font-normal text-gray-600">(남 {menNum}, 여 {womenNum})</span>
              </p>
            </div>
          </div>

          {/* 1. 인건비 세부 내역 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="px-4 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-blue-900">1. 인건비 (기본일당 + 운전자수당 + 장거리수당 + 식대)</span>
              </div>
              <span className="font-extrabold text-blue-700 text-sm">
                소계: {totalLaborCost.toLocaleString()} 원
              </span>
            </div>

            <div className="p-3.5 space-y-3">
              {/* 기본 일당 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/60 p-2.5 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-700 font-medium">남성 작업원:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      value={menNum}
                      onChange={(e) => setMenNum(parseInt(e.target.value, 10) || 0)}
                      className="w-12 px-1.5 py-1 text-center font-bold bg-white border border-gray-300 rounded text-xs"
                    />
                    <span className="text-gray-500">명 ×</span>
                    <input
                      type="number"
                      step="5000"
                      value={menRate}
                      onChange={(e) => setMenRate(parseInt(e.target.value, 10) || 0)}
                      className="w-24 px-1.5 py-1 text-right font-semibold bg-white border border-gray-300 rounded text-xs"
                    />
                    <span className="text-gray-500">원</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-700 font-medium">여성 작업원:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      value={womenNum}
                      onChange={(e) => setWomenNum(parseInt(e.target.value, 10) || 0)}
                      className="w-12 px-1.5 py-1 text-center font-bold bg-white border border-gray-300 rounded text-xs"
                    />
                    <span className="text-gray-500">명 ×</span>
                    <input
                      type="number"
                      step="5000"
                      value={womenRate}
                      onChange={(e) => setWomenRate(parseInt(e.target.value, 10) || 0)}
                      className="w-24 px-1.5 py-1 text-right font-semibold bg-white border border-gray-300 rounded text-xs"
                    />
                    <span className="text-gray-500">원</span>
                  </div>
                </div>
              </div>

              {/* 추가 수당 3종 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* 운전자 추가수당 */}
                <div className="p-2.5 rounded-lg border border-gray-200 space-y-1 bg-white">
                  <div className="flex items-center justify-between font-bold text-gray-800">
                    <span>운전자 추가 수당</span>
                    <span className="text-blue-600 font-extrabold">{totalDriverAllowance.toLocaleString()}원</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1">
                    <span>운전자 인원:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={driverCount}
                        onChange={(e) => setDriverCount(parseInt(e.target.value, 10) || 0)}
                        className="w-10 px-1 py-0.5 text-center font-bold bg-gray-50 border border-gray-200 rounded"
                      />
                      <span>명 × {driverRate.toLocaleString()}원</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">차량 1대당 1명 지급 (기본 20,000원)</p>
                </div>

                {/* 장거리 추가인건비 */}
                <div className="p-2.5 rounded-lg border border-gray-200 space-y-1 bg-white">
                  <div className="flex items-center justify-between font-bold text-gray-800">
                    <span>장거리 추가 인건비</span>
                    <span className="text-blue-600 font-extrabold">{totalDistanceAllowance.toLocaleString()}원</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1">
                    <span>초과 구간(회):</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={distanceSteps}
                        onChange={(e) => setDistanceSteps(parseInt(e.target.value, 10) || 0)}
                        className="w-10 px-1 py-0.5 text-center font-bold bg-gray-50 border border-gray-200 rounded"
                      />
                      <span>구간 × {distanceRatePerPerson.toLocaleString()}원</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {baseDistance}km 초과 시 매 {stepDistance}km당 인원수 곱 적용
                  </p>
                </div>

                {/* 식대 */}
                <div className="p-2.5 rounded-lg border border-gray-200 space-y-1 bg-white">
                  <div className="flex items-center justify-between font-bold text-gray-800">
                    <span>작업원 식대</span>
                    <span className="text-blue-600 font-extrabold">{totalMealCost.toLocaleString()}원</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1">
                    <span>1인당 식비:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="1000"
                        value={mealRate}
                        onChange={(e) => setMealRate(parseInt(e.target.value, 10) || 0)}
                        className="w-16 px-1 py-0.5 text-right font-bold bg-gray-50 border border-gray-200 rounded"
                      />
                      <span>원 × {totalWorkers}명</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">1인당 점심 식대 (기본 12,000원)</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. 차량비 세부 내역 (유류비 + 톨비) */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="px-4 py-2.5 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-emerald-900">2. 차량비 (편도 유류비 + 왕복 고속도로 톨비)</span>
              </div>
              <span className="font-extrabold text-emerald-700 text-sm">
                소계: {totalVehicleCost.toLocaleString()} 원
              </span>
            </div>

            <div className="p-3.5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* 5톤 유류비 */}
                <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50/40 space-y-1">
                  <div className="flex items-center justify-between font-bold text-gray-800">
                    <span>5톤 유류비 ({vehicleStats.count5Ton}대)</span>
                    <span className="text-emerald-700 font-bold">{fuel5TonCost.toLocaleString()}원</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>편도 {distanceKm}km × 500원:</span>
                    <input
                      type="number"
                      value={fuel5TonCost}
                      onChange={(e) => setFuel5TonCost(parseInt(e.target.value, 10) || 0)}
                      className="w-20 px-1.5 py-0.5 text-right font-semibold bg-white border border-gray-200 rounded text-xs"
                    />
                  </div>
                </div>

                {/* 2.5톤 유류비 */}
                <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50/40 space-y-1">
                  <div className="flex items-center justify-between font-bold text-gray-800">
                    <span>2.5톤 유류비 ({vehicleStats.count2_5Ton}대)</span>
                    <span className="text-emerald-700 font-bold">{fuel2_5TonCost.toLocaleString()}원</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>편도 {distanceKm}km × 350원:</span>
                    <input
                      type="number"
                      value={fuel2_5TonCost}
                      onChange={(e) => setFuel2_5TonCost(parseInt(e.target.value, 10) || 0)}
                      className="w-20 px-1.5 py-0.5 text-right font-semibold bg-white border border-gray-200 rounded text-xs"
                    />
                  </div>
                </div>

                {/* 1톤 유류비 */}
                <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50/40 space-y-1">
                  <div className="flex items-center justify-between font-bold text-gray-800">
                    <span>1톤 유류비 ({vehicleStats.count1Ton}대)</span>
                    <span className="text-emerald-700 font-bold">{fuel1TonCost.toLocaleString()}원</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>편도 {distanceKm}km × 250원:</span>
                    <input
                      type="number"
                      value={fuel1TonCost}
                      onChange={(e) => setFuel1TonCost(parseInt(e.target.value, 10) || 0)}
                      className="w-20 px-1.5 py-0.5 text-right font-semibold bg-white border border-gray-200 rounded text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 왕복 톨게이트비 */}
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/40 rounded-lg border border-emerald-100 text-xs">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-gray-800">왕복 고속도로 통행료 (톨게이트비)</span>
                    <p className="text-[11px] text-gray-500">
                      편도 {tollFare.toLocaleString()}원 × 왕복(2회) × 투입차량 {vehicleStats.totalCount}대
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={roundTollFare}
                    onChange={(e) => setRoundTollFare(parseInt(e.target.value, 10) || 0)}
                    className="w-24 px-2 py-1 text-right font-bold bg-white border border-emerald-300 rounded-md text-xs text-emerald-900 focus:outline-emerald-500"
                  />
                  <span className="text-gray-600 font-semibold">원</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. 자재비 & 장비비 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* OPP 테이프 소모비 */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
              <div className="px-3.5 py-2 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-bold text-amber-900 text-xs">3. 일회성 자재비 (OPP 테이프)</span>
                </div>
                <span className="font-bold text-amber-800 text-xs">{totalMaterialCost.toLocaleString()} 원</span>
              </div>
              <div className="p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">소모 롤수:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={tapeRolls}
                      onChange={(e) => setTapeRolls(parseInt(e.target.value, 10) || 0)}
                      className="w-12 px-1.5 py-0.5 text-center font-bold bg-gray-50 border border-gray-200 rounded"
                    />
                    <span>롤</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">롤당 단가:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={tapeUnitPrice}
                      onChange={(e) => setTapeUnitPrice(parseInt(e.target.value, 10) || 0)}
                      className="w-16 px-1.5 py-0.5 text-right font-bold bg-gray-50 border border-gray-200 rounded"
                    />
                    <span>원</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">
                  * 5톤 8롤, 2.5톤 5롤, 1톤 3롤 기준 자동 계산
                </p>
              </div>
            </div>

            {/* 사다리차 외주비 (선택 옵션) */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
              <div className="px-3.5 py-2 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  <span className="font-bold text-purple-900 text-xs">4. 사다리차 장비 외주비 (선택)</span>
                </div>
                <span className="font-bold text-purple-800 text-xs">{totalEquipmentCost.toLocaleString()} 원</span>
              </div>
              <div className="p-3 space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLadderCost}
                    onChange={(e) => setIncludeLadderCost(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <span className="font-medium text-gray-700">기본 이사원가에 사다리차 비용 포함</span>
                </label>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-gray-500 text-[11px]">사다리차 운임 합계:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      disabled={!includeLadderCost}
                      value={ladderCost}
                      onChange={(e) => setLadderCost(parseInt(e.target.value, 10) || 0)}
                      className="w-24 px-1.5 py-0.5 text-right font-bold bg-gray-50 disabled:bg-gray-100 border border-gray-200 rounded text-xs"
                    />
                    <span>원</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">
                  * 사다리차를 가산비용으로 별도 청구할 경우 체크 해제 유지
                </p>
              </div>
            </div>
          </div>

          {/* 4. 마진율 설정 및 총 원가 종합 카드 */}
          <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/60 p-4 rounded-2xl border-2 border-amber-300/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
              <div>
                <span className="text-xs text-amber-900 font-bold flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-amber-700" />
                  목표 마진율 설정 및 제안가 산출
                </span>
                <p className="text-[11px] text-amber-800">
                  총 원가: <strong className="font-bold">{totalCost.toLocaleString()}원</strong> (인건비 {totalLaborCost.toLocaleString()} + 차량비 {totalVehicleCost.toLocaleString()} + 자재비 {totalMaterialCost.toLocaleString()}{includeLadderCost ? ` + 장비비 ${totalEquipmentCost.toLocaleString()}` : ''})
                </p>
              </div>

              {/* 마진율 선택 버튼 및 인풋 */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-gray-700">마진율:</span>
                {[15, 18, 20, 22, 25, 30].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setMarginRate(rate)}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                      marginRate === rate
                        ? 'bg-amber-700 text-white shadow-2xs'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-amber-100'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
                <div className="flex items-center ml-1">
                  <input
                    type="number"
                    step="0.5"
                    value={marginRate}
                    onChange={(e) => setMarginRate(parseFloat(e.target.value) || 0)}
                    className="w-12 px-1 py-0.5 text-center font-bold bg-white border border-amber-400 rounded text-xs"
                  />
                  <span className="text-xs text-amber-900 font-bold ml-0.5">%</span>
                </div>
              </div>
            </div>

            {/* 최종 산출 금액 요약 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-1">
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
                <span className="text-[11px] text-gray-500 font-medium">총 소요 원가</span>
                <p className="text-base font-extrabold text-gray-800">
                  {totalCost.toLocaleString()} <span className="text-xs font-normal">원</span>
                </p>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
                <span className="text-[11px] text-gray-500 font-medium">회사 마진액 ({marginRate}%)</span>
                <p className="text-base font-extrabold text-emerald-700">
                  +{marginAmount.toLocaleString()} <span className="text-xs font-normal">원</span>
                </p>
              </div>

              <div className="bg-amber-600 text-white p-3 rounded-xl shadow-md flex items-center justify-between sm:justify-center sm:flex-col">
                <span className="text-xs text-amber-100 font-medium">최종 제안 기본 이사비용</span>
                <p className="text-lg sm:text-xl font-black tracking-tight">
                  {finalSellingPrice.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-amber-200">원</span>
                </p>
              </div>
            </div>

            {/* 만원 단위 올림 옵션 */}
            <div className="flex items-center justify-between text-xs text-amber-900 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roundToTenThousand}
                  onChange={(e) => setRoundToTenThousand(e.target.checked)}
                  className="w-3.5 h-3.5 text-amber-600 rounded"
                />
                <span className="text-[11px]">만원 단위로 올림하여 단수 정리 ({rawSellingPrice.toLocaleString()}원 ➔ {finalSellingPrice.toLocaleString()}원)</span>
              </label>
            </div>
          </div>
        </div>

        {/* 모달 푸터 버튼 */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
          >
            취소
          </button>

          <button
            type="button"
            onClick={handleApplyClick}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-xs sm:text-sm active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>기본 이사비용에 적용 ({finalSellingPrice.toLocaleString()}원)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
