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
  Info,
  Sun,
  CloudRain
} from 'lucide-react'
import { CostStandardData } from '@/app/actions/costStandards'
import { getCharteredTruckFares } from '@/app/actions/charteredTruck'
import type { CharteredTruckFareItem } from '@/types/charteredTruck'
import { calculate5TonTruckDuration } from '@/lib/distance'

interface CostCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (calculatedCost: number) => void
  distanceKm: number
  tollFare: number // 카카오 편도 톨비
  roundTollFare?: number // 대당 왕복 톨게이트비
  movingType: string
  menCount: number
  womenCount: number
  menUnitPrice?: number // 남성 일당 (기본 190,000)
  womenUnitPrice?: number // 여성 일당 (기본 170,000)
  vehicles?: { name: string; count: number; tonnage?: number }[] // 투입 차량 목록
  ladderTotalCost?: number
  costStandards?: CostStandardData
}

function FormattedModalNumberInput({
  value,
  onChange,
  className = '',
  placeholder = '0'
}: {
  value: number
  onChange: (val: number) => void
  className?: string
  placeholder?: string
}) {
  const [displayValue, setDisplayValue] = useState<string>(
    value !== undefined && value !== null ? value.toLocaleString('ko-KR') : '0'
  )

  useEffect(() => {
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
      setDisplayValue('0')
      onChange(0)
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={(e) => e.target.select()}
      placeholder={placeholder}
      className={className}
    />
  )
}

export function CostCalculatorModal({
  isOpen,
  onClose,
  onApply,
  distanceKm,
  tollFare,
  roundTollFare: initialRoundTollFare,
  movingType,
  menCount,
  womenCount,
  menUnitPrice = 190000,
  womenUnitPrice = 170000,
  vehicles = [],
  ladderTotalCost = 0,
  costStandards
}: CostCalculatorModalProps) {
  // 대당 왕복 톨비 (전달된 왕복 톨비 우선, 없으면 편도 x 2)
  const perTruckRoundToll = initialRoundTollFare !== undefined && initialRoundTollFare > 0 
    ? initialRoundTollFare 
    : (tollFare * 2)

  // 기준값 (DB 마스터값 또는 기본 fallback)
  const standards: CostStandardData = useMemo(() => {
    return costStandards || {
      id: 'default_cost_standard',
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

    // 총 톤수 계산 (5톤 x 대수 + 2.5톤 x 대수 + 1톤 x 대수)
    const totalTonnage = (count5Ton * 5) + (count2_5Ton * 2.5) + (count1Ton * 1)

    return { count5Ton, count2_5Ton, count1Ton, totalCount, totalTonnage }
  }, [vehicles])

  // 톤수 초과 수당 기본값 계산 (6톤 1만, 7.5톤 2만, 10톤 3만)
  const defaultTonnageAllowanceRate = useMemo(() => {
    if (vehicleStats.totalTonnage >= 10) return standards.tonnageAllowance10Ton ?? 30000
    if (vehicleStats.totalTonnage >= 7.5) return standards.tonnageAllowance7_5Ton ?? 20000
    if (vehicleStats.totalTonnage >= 6.0) return standards.tonnageAllowance6Ton ?? 10000
    return 0
  }, [vehicleStats.totalTonnage, standards])

  // 장거리 초과 구간 계산 (기준거리 40km 초과 시 매 40km당 1구간)
  const baseDistance = standards.baseDistanceKm || 40
  const stepDistance = standards.distanceStepKm || 40
  const extraDistance = Math.max(0, distanceKm - baseDistance)
  const defaultDistanceStepCount = extraDistance > 0 ? Math.ceil(extraDistance / stepDistance) : 0

  // 1. 인건비 항목 상태 (기본값 자동 세팅 + 수동 수정 가능)
  const [menNum, setMenNum] = useState<number>(menCount !== undefined ? menCount : 3)
  const [menRate, setMenRate] = useState<number>(menUnitPrice || standards.maleLaborCost || 190000)
  const [womenNum, setWomenNum] = useState<number>(womenCount !== undefined ? womenCount : 1)
  const [womenRate, setWomenRate] = useState<number>(womenUnitPrice || standards.femaleLaborCost || 170000)
  
  // 운전자 추가 수당 (차량대수 x 20,000)
  const [driverCount, setDriverCount] = useState<number>(vehicleStats.totalCount)
  const [driverRate, setDriverRate] = useState<number>(standards.driverAllowance)

  // 톤수 초과 추가 수당 (6톤 1만, 7.5톤 2만, 10톤 3만 x 인원수)
  const [tonnageRate, setTonnageRate] = useState<number>(defaultTonnageAllowanceRate)

  // 장거리 추가 인건비 (인원수 x 구간수 x 10,000)
  const [distanceSteps, setDistanceSteps] = useState<number>(defaultDistanceStepCount)
  const [distanceRatePerPerson, setDistanceRatePerPerson] = useState<number>(standards.distanceAllowancePerPerson)

  // 식비 (총 인원 x 12,000)
  const [mealRate, setMealRate] = useState<number>(standards.mealCostPerPerson)

  // 2. 차량비 항목 상태
  const [fuel5TonCost, setFuel5TonCost] = useState<number>(0)
  const [fuel2_5TonCost, setFuel2_5TonCost] = useState<number>(0)
  const [fuel1TonCost, setFuel1TonCost] = useState<number>(0)

  // 외주 용차 운임 시세 목록 및 운용 선택 (자사 / 카고 / 우천 탑차)
  const [charteredFares, setCharteredFares] = useState<CharteredTruckFareItem[]>([])
  const [charteredType1Ton, setCharteredType1Ton] = useState<'OWN' | 'CARGO' | 'TOP'>('OWN')
  const [charteredCost1Ton, setCharteredCost1Ton] = useState<number>(0)
  const [charteredType2_5Ton, setCharteredType2_5Ton] = useState<'OWN' | 'CARGO' | 'TOP'>('OWN')
  const [charteredCost2_5Ton, setCharteredCost2_5Ton] = useState<number>(0)
  
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

  // 용차 기준정보 로드
  useEffect(() => {
    if (isOpen) {
      getCharteredTruckFares().then(data => setCharteredFares(data)).catch(() => {})
    }
  }, [isOpen])

  // 현재 거리에 해당하는 용차 기준 요금 매칭
  const currentMatchedFare = useMemo(() => {
    if (charteredFares.length === 0) return null
    return charteredFares.find(f => distanceKm >= f.minDistanceKm && distanceKm <= f.maxDistanceKm)
      || charteredFares[charteredFares.length - 1]
  }, [charteredFares, distanceKm])

  // 초기 상태 자동 세팅
  const resetToRecommended = () => {
    setMenNum(menCount !== undefined ? menCount : 3)
    setMenRate(menUnitPrice || standards.maleLaborCost || 190000)
    setWomenNum(womenCount !== undefined ? womenCount : 1)
    setWomenRate(womenUnitPrice || standards.femaleLaborCost || 170000)

    setDriverCount(vehicleStats.totalCount)
    setDriverRate(standards.driverAllowance)

    setTonnageRate(defaultTonnageAllowanceRate)

    setDistanceSteps(defaultDistanceStepCount)
    setDistanceRatePerPerson(standards.distanceAllowancePerPerson)
    setMealRate(standards.mealCostPerPerson)

    // 유류비 (차량 회송 고려: 왕복 거리(편도 x 2) x km단가 x 대수)
    const roundKm = distanceKm * 2
    const f5 = Math.round(roundKm * standards.fuelCostPerKm5Ton * vehicleStats.count5Ton)
    const f25 = Math.round(roundKm * standards.fuelCostPerKm2_5Ton * vehicleStats.count2_5Ton)
    const f1 = Math.round(roundKm * standards.fuelCostPerKm1Ton * vehicleStats.count1Ton)
    setFuel5TonCost(f5)
    setFuel2_5TonCost(f25)
    setFuel1TonCost(f1)

    // 용차 기본값 리셋 (자사 운행)
    setCharteredType1Ton('OWN')
    setCharteredCost1Ton(0)
    setCharteredType2_5Ton('OWN')
    setCharteredCost2_5Ton(0)

    // 왕복 톨비 (대당 왕복 톨비 x 차량대수)
    const toll = Math.round(perTruckRoundToll * vehicleStats.totalCount)
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

  // 외주 용차 대수 계산 (자사운행이 아닌 차량 대수)
  const calcExcludedCharteredCount = (
    type2_5: 'OWN' | 'CARGO' | 'TOP',
    type1: 'OWN' | 'CARGO' | 'TOP'
  ) => {
    const ch2_5 = type2_5 !== 'OWN' ? Math.max(1, vehicleStats.count2_5Ton) : 0
    const ch1 = type1 !== 'OWN' ? Math.max(1, vehicleStats.count1Ton) : 0
    return ch2_5 + ch1
  }

  const excludedCharteredCount = calcExcludedCharteredCount(charteredType2_5Ton, charteredType1Ton)

  // 1톤 운용 방식 변경 시 (자사 / 카고 / 우천탑차)
  const handleChartered1TonChange = (type: 'OWN' | 'CARGO' | 'TOP') => {
    setCharteredType1Ton(type)
    const roundKm = distanceKm * 2
    const truckCount = Math.max(1, vehicleStats.count1Ton)
    if (type === 'OWN') {
      setFuel1TonCost(Math.round(roundKm * standards.fuelCostPerKm1Ton * vehicleStats.count1Ton))
      setCharteredCost1Ton(0)
    } else if (type === 'CARGO') {
      setFuel1TonCost(0) // 유류비 제외
      const base = currentMatchedFare ? currentMatchedFare.cost1TonCargo : 70000
      setCharteredCost1Ton(base * truckCount)
    } else {
      setFuel1TonCost(0) // 유류비 제외
      const base = currentMatchedFare ? currentMatchedFare.cost1TonTop : 90000
      setCharteredCost1Ton(base * truckCount)
    }

    // 자사운행이 아닌 경우 운전자 추가 수당 인원 자동 변경 (외주 용차 대수 차감)
    const newExcluded = calcExcludedCharteredCount(charteredType2_5Ton, type)
    setDriverCount(Math.max(0, vehicleStats.totalCount - newExcluded))
  }

  // 2.5톤 운용 방식 변경 시 (자사 / 카고 / 우천탑차)
  const handleChartered2_5TonChange = (type: 'OWN' | 'CARGO' | 'TOP') => {
    setCharteredType2_5Ton(type)
    const roundKm = distanceKm * 2
    const truckCount = Math.max(1, vehicleStats.count2_5Ton)
    if (type === 'OWN') {
      setFuel2_5TonCost(Math.round(roundKm * standards.fuelCostPerKm2_5Ton * vehicleStats.count2_5Ton))
      setCharteredCost2_5Ton(0)
    } else if (type === 'CARGO') {
      setFuel2_5TonCost(0) // 유류비 제외
      const base = currentMatchedFare ? currentMatchedFare.cost2_5TonCargo : 130000
      setCharteredCost2_5Ton(base * truckCount)
    } else {
      setFuel2_5TonCost(0) // 유류비 제외
      const base = currentMatchedFare ? currentMatchedFare.cost2_5TonTop : 160000
      setCharteredCost2_5Ton(base * truckCount)
    }

    // 자사운행이 아닌 경우 운전자 추가 수당 인원 자동 변경 (외주 용차 대수 차감)
    const newExcluded = calcExcludedCharteredCount(type, charteredType1Ton)
    setDriverCount(Math.max(0, vehicleStats.totalCount - newExcluded))
  }

  useEffect(() => {
    if (isOpen) {
      resetToRecommended()
    }
  }, [isOpen, distanceKm, tollFare, perTruckRoundToll, vehicleStats, standards, menCount, womenCount, menUnitPrice, womenUnitPrice, ladderTotalCost])

  // 총 인원 수
  const totalWorkers = menNum + womenNum

  // 1. 인건비 합계 계산
  const baseLaborCost = (menNum * menRate) + (womenNum * womenRate)
  const totalDriverAllowance = driverCount * driverRate
  const totalTonnageAllowance = totalWorkers * tonnageRate
  const totalDistanceAllowance = distanceSteps * distanceRatePerPerson * totalWorkers
  const totalMealCost = totalWorkers * mealRate
  const totalLaborCost = baseLaborCost + totalDriverAllowance + totalTonnageAllowance + totalDistanceAllowance + totalMealCost

  // 2. 차량비 합계 계산 (유류비 + 왕복 톨비)
  const totalFuelCost = fuel5TonCost + fuel2_5TonCost + fuel1TonCost
  const totalVehicleCost = totalFuelCost + roundTollFare

  // 3. 자재비 합계 계산
  const totalMaterialCost = tapeRolls * tapeUnitPrice

  // 4. 장비 및 외주비 (외주 용차비 + 사다리차)
  const totalCharteredCost = (charteredType1Ton !== 'OWN' ? charteredCost1Ton : 0) +
                             (charteredType2_5Ton !== 'OWN' ? charteredCost2_5Ton : 0)
  const totalEquipmentCost = (includeLadderCost ? ladderCost : 0) + totalCharteredCost

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
              <span className="text-[11px] text-gray-500">실제 주행거리 / 시간:</span>
              <p className="font-bold text-gray-900 text-sm">
                {distanceKm} km{' '}
                <span className="text-[11px] font-normal text-amber-800">
                  (5톤 화물차 {calculate5TonTruckDuration(distanceKm).text})
                </span>
              </p>
            </div>
            <div>
              <span className="text-[11px] text-gray-500">고속도로 톨게이트비:</span>
              <p className="font-bold text-gray-900 text-sm">
                {perTruckRoundToll > 0 ? (
                  <>
                    대당 왕복 {perTruckRoundToll.toLocaleString()}원{' '}
                    <span className="text-[11px] font-semibold text-blue-600">
                      ({vehicleStats.totalCount}대 총 {(perTruckRoundToll * vehicleStats.totalCount).toLocaleString()}원)
                    </span>
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
                    <FormattedModalNumberInput
                      value={menRate}
                      onChange={(val) => setMenRate(val)}
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
                    <FormattedModalNumberInput
                      value={womenRate}
                      onChange={(val) => setWomenRate(val)}
                      className="w-24 px-1.5 py-1 text-right font-semibold bg-white border border-gray-300 rounded text-xs"
                    />
                    <span className="text-gray-500">원</span>
                  </div>
                </div>
              </div>

              {/* 추가 수당 4종 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                {/* 운전자 추가수당 */}
                <div className={`p-2.5 rounded-lg border space-y-1 transition-all ${
                  excludedCharteredCount > 0
                    ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400/30 shadow-2xs'
                    : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center justify-between font-bold text-gray-800">
                    <span className="flex items-center gap-1">
                      운전자 추가 수당
                      {excludedCharteredCount > 0 && (
                        <span className="text-[10px] bg-amber-200/90 text-amber-900 px-1.5 py-0.2 rounded font-extrabold">
                          용차 {excludedCharteredCount}대 제외
                        </span>
                      )}
                    </span>
                    <span className="text-blue-600 font-extrabold">{totalDriverAllowance.toLocaleString()}원</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1">
                    <span>운전자:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={driverCount}
                        onChange={(e) => setDriverCount(parseInt(e.target.value, 10) || 0)}
                        className={`w-10 px-1 py-0.5 text-center font-bold border rounded ${
                          excludedCharteredCount > 0
                            ? 'bg-white border-amber-400 text-amber-950'
                            : 'bg-gray-50 border-gray-200 text-gray-800'
                        }`}
                      />
                      <span>명 ×</span>
                      <FormattedModalNumberInput
                        value={driverRate}
                        onChange={(val) => setDriverRate(val)}
                        className="w-16 px-1 py-0.5 text-right font-bold bg-white border border-gray-200 rounded text-xs"
                      />
                      <span>원</span>
                    </div>
                  </div>
                  <p className={`text-[10px] ${excludedCharteredCount > 0 ? 'text-amber-800 font-semibold' : 'text-gray-400'}`}>
                    {excludedCharteredCount > 0
                      ? `외주 용차 ${excludedCharteredCount}대 제외 ➔ 자사운행 ${driverCount}대분 적용`
                      : `자사운행 차량 1대당 1명 지급 (기본 ${standards.driverAllowance.toLocaleString()}원)`}
                  </p>
                </div>

                {/* 톤수 초과 추가수당 (6톤 1만, 7.5톤 2만, 10톤 3만) */}
                <div className={`p-2.5 rounded-lg border space-y-1 ${
                  tonnageRate > 0 ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center justify-between font-bold text-gray-800">
                    <span className="flex items-center gap-1">
                      톤수 초과 인건비
                      {vehicleStats.totalTonnage > 5 && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-semibold">
                          {vehicleStats.totalTonnage}톤
                        </span>
                      )}
                    </span>
                    <span className="text-indigo-600 font-extrabold">{totalTonnageAllowance.toLocaleString()}원</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1">
                    <span>1인당 수당:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="5000"
                        min="0"
                        value={tonnageRate}
                        onChange={(e) => setTonnageRate(parseInt(e.target.value, 10) || 0)}
                        className="w-16 px-1 py-0.5 text-right font-bold bg-white border border-gray-200 rounded"
                      />
                      <span>원 × {totalWorkers}명</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {vehicleStats.totalTonnage >= 10
                      ? '10톤 이상 물량 가산 (1인당 30,000원)'
                      : vehicleStats.totalTonnage >= 7.5
                      ? '7.5톤 물량 가산 (1인당 20,000원)'
                      : vehicleStats.totalTonnage >= 6.0
                      ? '6톤 물량 가산 (1인당 10,000원)'
                      : '5톤 이하 기본 (수당 없음)'}
                  </p>
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
                <span className="font-bold text-emerald-900">2. 차량비 (왕복 유류비 + 왕복 고속도로 톨비)</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                  왕복 {distanceKm * 2}km 기준 (편도 {distanceKm}km)
                </span>
              </div>
              <span className="font-extrabold text-emerald-700 text-sm">
                소계: {totalVehicleCost.toLocaleString()} 원
              </span>
            </div>

            <div className="p-3.5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* 5톤 차량 */}
                <div className={`p-2.5 rounded-xl space-y-1.5 transition-all ${
                  vehicleStats.count5Ton > 0
                    ? 'border-2 border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'border border-dashed border-gray-200 bg-gray-50/40 opacity-60'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                      <Truck className={`w-3.5 h-3.5 ${vehicleStats.count5Ton > 0 ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <span>5톤 차량</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                        vehicleStats.count5Ton > 0
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {vehicleStats.count5Ton > 0 ? `배차 ${vehicleStats.count5Ton}대` : '미배차 (0대)'}
                      </span>
                    </span>
                    <span className="text-emerald-800 font-extrabold text-xs">
                      {fuel5TonCost.toLocaleString()}원
                    </span>
                  </div>

                  {/* 5톤 운용 상태 표시 바 (2.5톤/1톤 카드와 높이 및 시각적 정렬 통일) */}
                  <div className={`py-1 px-2 rounded-md text-[10px] font-extrabold text-center ${
                    vehicleStats.count5Ton > 0
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-gray-200/80 text-gray-500'
                  }`}>
                    자사 운행 (기본 메인차량)
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-600 pt-0.5">
                    <span className="font-medium">왕복 {distanceKm * 2}km × {standards.fuelCostPerKm5Ton}원:</span>
                    <FormattedModalNumberInput
                      value={fuel5TonCost}
                      onChange={(val) => setFuel5TonCost(val)}
                      className={`w-20 px-1.5 py-0.5 text-right font-bold bg-white rounded text-xs ${
                        vehicleStats.count5Ton > 0 ? 'border border-emerald-400 text-emerald-950' : 'border border-gray-200 text-gray-500'
                      }`}
                    />
                  </div>
                </div>

                {/* 2.5톤 유류비 및 용차 선택 */}
                {(() => {
                  const isDispatched2_5 = vehicleStats.count2_5Ton > 0 || charteredType2_5Ton !== 'OWN'
                  const effectiveCount2_5 = charteredType2_5Ton !== 'OWN' ? Math.max(1, vehicleStats.count2_5Ton) : vehicleStats.count2_5Ton
                  return (
                    <div className={`p-2.5 rounded-xl space-y-1.5 transition-all ${
                      !isDispatched2_5
                        ? 'border border-dashed border-gray-200 bg-gray-50/40 opacity-60'
                        : charteredType2_5Ton === 'OWN'
                          ? 'border-2 border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-sm'
                          : charteredType2_5Ton === 'CARGO'
                            ? 'border-2 border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-sm'
                            : 'border-2 border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-500/20 shadow-sm'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                          <Truck className={`w-3.5 h-3.5 ${
                            !isDispatched2_5
                              ? 'text-gray-400'
                              : charteredType2_5Ton === 'OWN'
                                ? 'text-emerald-600'
                                : charteredType2_5Ton === 'CARGO'
                                  ? 'text-blue-600'
                                  : 'text-indigo-600'
                          }`} />
                          <span>2.5톤 차량</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                            !isDispatched2_5
                              ? 'bg-gray-200 text-gray-500'
                              : charteredType2_5Ton === 'OWN'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : charteredType2_5Ton === 'CARGO'
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'bg-indigo-600 text-white shadow-2xs'
                          }`}>
                            {!isDispatched2_5
                              ? '미배차 (0대)'
                              : charteredType2_5Ton === 'OWN'
                                ? `배차 ${effectiveCount2_5}대`
                                : `용차 ${effectiveCount2_5}대`}
                          </span>
                        </span>
                        <span className={`font-extrabold text-xs ${
                          charteredType2_5Ton === 'OWN' ? 'text-emerald-800' : 'text-blue-700'
                        }`}>
                          {charteredType2_5Ton === 'OWN' ? `${fuel2_5TonCost.toLocaleString()}원` : '외주 용차 산입'}
                        </span>
                      </div>

                      {/* 운용 모드 3단 선택 버튼 */}
                      <div className="grid grid-cols-3 gap-1 p-0.5 bg-gray-200/80 rounded-md text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => handleChartered2_5TonChange('OWN')}
                          className={`py-1 rounded transition-all ${
                            charteredType2_5Ton === 'OWN'
                              ? isDispatched2_5
                                ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                                : 'bg-white text-gray-800 shadow-2xs font-extrabold'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          자사 운행
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChartered2_5TonChange('CARGO')}
                          className={`py-1 rounded transition-all ${
                            charteredType2_5Ton === 'CARGO'
                              ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                              : 'text-gray-600 hover:text-blue-700'
                          }`}
                          title="맑은 날 일반 카고 용차 배차"
                        >
                          카고 용차
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChartered2_5TonChange('TOP')}
                          className={`py-1 rounded transition-all ${
                            charteredType2_5Ton === 'TOP'
                              ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                              : 'text-gray-600 hover:text-indigo-700'
                          }`}
                          title="우천·악천후 시 침수 방지 탑차 배차"
                        >
                          우천 탑차
                        </button>
                      </div>

                      {charteredType2_5Ton === 'OWN' ? (
                        <div className="flex items-center justify-between text-[11px] text-gray-600 pt-0.5">
                          <span className="font-medium">왕복 {distanceKm * 2}km × {standards.fuelCostPerKm2_5Ton}원:</span>
                          <FormattedModalNumberInput
                            value={fuel2_5TonCost}
                            onChange={(val) => setFuel2_5TonCost(val)}
                            className={`w-20 px-1.5 py-0.5 text-right font-bold bg-white rounded text-xs ${
                              isDispatched2_5 ? 'border border-emerald-400 text-emerald-950' : 'border border-gray-200 text-gray-500'
                            }`}
                          />
                        </div>
                      ) : (
                        <div className="text-[10px] text-blue-700 bg-blue-100/80 px-2 py-1 rounded flex items-center justify-between border border-blue-200">
                          <span className="font-semibold text-blue-900">유류비 · 운전자수당 제외됨</span>
                          <span className="font-extrabold text-blue-950">+{charteredCost2_5Ton.toLocaleString()}원 (외주)</span>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* 1톤 유류비 및 용차 선택 */}
                {(() => {
                  const isDispatched1 = vehicleStats.count1Ton > 0 || charteredType1Ton !== 'OWN'
                  const effectiveCount1 = charteredType1Ton !== 'OWN' ? Math.max(1, vehicleStats.count1Ton) : vehicleStats.count1Ton
                  return (
                    <div className={`p-2.5 rounded-xl space-y-1.5 transition-all ${
                      !isDispatched1
                        ? 'border border-dashed border-gray-200 bg-gray-50/40 opacity-60'
                        : charteredType1Ton === 'OWN'
                          ? 'border-2 border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-sm'
                          : charteredType1Ton === 'CARGO'
                            ? 'border-2 border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-sm'
                            : 'border-2 border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-500/20 shadow-sm'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                          <Truck className={`w-3.5 h-3.5 ${
                            !isDispatched1
                              ? 'text-gray-400'
                              : charteredType1Ton === 'OWN'
                                ? 'text-emerald-600'
                                : charteredType1Ton === 'CARGO'
                                  ? 'text-blue-600'
                                  : 'text-indigo-600'
                          }`} />
                          <span>1톤 차량</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                            !isDispatched1
                              ? 'bg-gray-200 text-gray-500'
                              : charteredType1Ton === 'OWN'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : charteredType1Ton === 'CARGO'
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'bg-indigo-600 text-white shadow-2xs'
                          }`}>
                            {!isDispatched1
                              ? '미배차 (0대)'
                              : charteredType1Ton === 'OWN'
                                ? `배차 ${effectiveCount1}대`
                                : `용차 ${effectiveCount1}대`}
                          </span>
                        </span>
                        <span className={`font-extrabold text-xs ${
                          charteredType1Ton === 'OWN' ? 'text-emerald-800' : 'text-blue-700'
                        }`}>
                          {charteredType1Ton === 'OWN' ? `${fuel1TonCost.toLocaleString()}원` : '외주 용차 산입'}
                        </span>
                      </div>

                      {/* 운용 모드 3단 선택 버튼 */}
                      <div className="grid grid-cols-3 gap-1 p-0.5 bg-gray-200/80 rounded-md text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => handleChartered1TonChange('OWN')}
                          className={`py-1 rounded transition-all ${
                            charteredType1Ton === 'OWN'
                              ? isDispatched1
                                ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                                : 'bg-white text-gray-800 shadow-2xs font-extrabold'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          자사 운행
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChartered1TonChange('CARGO')}
                          className={`py-1 rounded transition-all ${
                            charteredType1Ton === 'CARGO'
                              ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                              : 'text-gray-600 hover:text-blue-700'
                          }`}
                          title="맑은 날 일반 카고 용차 배차"
                        >
                          카고 용차
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChartered1TonChange('TOP')}
                          className={`py-1 rounded transition-all ${
                            charteredType1Ton === 'TOP'
                              ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                              : 'text-gray-600 hover:text-indigo-700'
                          }`}
                          title="우천·악천후 시 침수 방지 탑차 배차"
                        >
                          우천 탑차
                        </button>
                      </div>

                      {charteredType1Ton === 'OWN' ? (
                        <div className="flex items-center justify-between text-[11px] text-gray-600 pt-0.5">
                          <span className="font-medium">왕복 {distanceKm * 2}km × {standards.fuelCostPerKm1Ton}원:</span>
                          <FormattedModalNumberInput
                            value={fuel1TonCost}
                            onChange={(val) => setFuel1TonCost(val)}
                            className={`w-20 px-1.5 py-0.5 text-right font-bold bg-white rounded text-xs ${
                              isDispatched1 ? 'border border-emerald-400 text-emerald-950' : 'border border-gray-200 text-gray-500'
                            }`}
                          />
                        </div>
                      ) : (
                        <div className="text-[10px] text-blue-700 bg-blue-100/80 px-2 py-1 rounded flex items-center justify-between border border-blue-200">
                          <span className="font-semibold text-blue-900">유류비 · 운전자수당 제외됨</span>
                          <span className="font-extrabold text-blue-950">+{charteredCost1Ton.toLocaleString()}원 (외주)</span>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* 왕복 톨게이트비 */}
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/40 rounded-lg border border-emerald-100 text-xs">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-gray-800">왕복 고속도로 통행료 (톨게이트비)</span>
                    <p className="text-[11px] text-gray-500">
                      대당 왕복 {perTruckRoundToll.toLocaleString()}원 (편도 {Math.round(perTruckRoundToll / 2).toLocaleString()}원) × 투입차량 {vehicleStats.totalCount}대
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <FormattedModalNumberInput
                    value={roundTollFare}
                    onChange={(val) => setRoundTollFare(val)}
                    className="w-24 px-2 py-1 text-right font-bold bg-white border border-emerald-300 rounded-md text-xs text-emerald-900 focus:outline-emerald-500"
                  />
                  <span className="text-gray-600 font-semibold">원</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. 자재비 & 장비/외주비 */}
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
                    <FormattedModalNumberInput
                      value={tapeUnitPrice}
                      onChange={(val) => setTapeUnitPrice(val)}
                      className="w-16 px-1.5 py-0.5 text-right font-bold bg-gray-50 border border-gray-200 rounded text-xs"
                    />
                    <span>원</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">
                  * 5톤 8롤, 2.5톤 5롤, 1톤 3롤 기준 자동 계산
                </p>
              </div>
            </div>

            {/* 외주비 및 장비비 (용차비 + 사다리차) */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
              <div className="px-3.5 py-2 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  <span className="font-bold text-purple-900 text-xs">4. 외주비 및 장비비 (용차/사다리)</span>
                </div>
                <span className="font-bold text-purple-800 text-xs">{totalEquipmentCost.toLocaleString()} 원</span>
              </div>
              <div className="p-3 space-y-2.5 text-xs">
                {/* 외주 용차비 표시 */}
                <div className="space-y-1 bg-purple-50/40 p-2 rounded-lg border border-purple-100/70">
                  <div className="flex items-center justify-between font-bold text-purple-950">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Truck className="w-3.5 h-3.5 text-purple-600" />
                      외주 용차비 소계:
                    </span>
                    <span className="text-purple-700 font-extrabold">{totalCharteredCost.toLocaleString()} 원</span>
                  </div>
                  {totalCharteredCost > 0 ? (
                    <div className="space-y-1 pt-1 text-[11px]">
                      {charteredType2_5Ton !== 'OWN' && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>• 2.5톤 {charteredType2_5Ton === 'CARGO' ? '카고용차' : '우천탑차'}:</span>
                          <div className="flex items-center gap-1">
                            <FormattedModalNumberInput
                              value={charteredCost2_5Ton}
                              onChange={(val) => setCharteredCost2_5Ton(val)}
                              className="w-20 px-1.5 py-0.5 text-right font-bold bg-white border border-purple-200 rounded text-xs text-purple-900"
                            />
                            <span>원</span>
                          </div>
                        </div>
                      )}
                      {charteredType1Ton !== 'OWN' && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>• 1톤 {charteredType1Ton === 'CARGO' ? '카고용차' : '우천탑차'}:</span>
                          <div className="flex items-center gap-1">
                            <FormattedModalNumberInput
                              value={charteredCost1Ton}
                              onChange={(val) => setCharteredCost1Ton(val)}
                              className="w-20 px-1.5 py-0.5 text-right font-bold bg-white border border-purple-200 rounded text-xs text-purple-900"
                            />
                            <span>원</span>
                          </div>
                        </div>
                      )}
                      <p className="text-[10px] text-purple-600/90 pt-0.5">
                        * {currentMatchedFare ? `${currentMatchedFare.distanceName} (${distanceKm}km) 표준 시세 반영` : '표준 시세 적용'} (금액 직접 수정 가능)
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400">
                      * 상단 차량비에서 [카고 용차] 또는 [우천 탑차] 선택 시 자동 산입
                    </p>
                  )}
                </div>

                {/* 사다리차 외주비 */}
                <div className="pt-0.5 space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeLadderCost}
                      onChange={(e) => setIncludeLadderCost(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                    />
                    <span className="font-medium text-gray-700">기본 이사원가에 사다리차 비용 포함</span>
                  </label>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-gray-500 text-[11px]">사다리차 운임 합계:</span>
                    <div className="flex items-center gap-1">
                      <FormattedModalNumberInput
                        value={ladderCost}
                        onChange={(val) => setLadderCost(val)}
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
                  총 원가: <strong className="font-bold">{totalCost.toLocaleString()}원</strong> (인건비 {totalLaborCost.toLocaleString()} + 차량비 {totalVehicleCost.toLocaleString()} + 자재비 {totalMaterialCost.toLocaleString()}{totalEquipmentCost > 0 ? ` + 외주장비비 ${totalEquipmentCost.toLocaleString()}` : ''})
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
