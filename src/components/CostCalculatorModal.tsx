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
  CloudRain,
  Navigation,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Sparkles
} from 'lucide-react'
import KoreanLunarCalendar from 'korean-lunar-calendar'
import { CostStandardData } from '@/app/actions/costStandards'
import { getCharteredTruckFares } from '@/app/actions/charteredTruck'
import type { CharteredTruckFareItem } from '@/types/charteredTruck'
import { calculate5TonTruckDuration } from '@/lib/distance'
import {
  resolveTonnageTierKey,
  calculateTonnageDistanceFare,
  adjustTollForHeavyTruck
} from '@/lib/distanceFare'

interface CostCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (calculatedCost: number) => void
  distanceKm: number
  tollFare: number // 카카오 편도 톨비 (1종 기본)
  roundTollFare?: number // 대당 왕복 톨게이트비
  tollFareByClass?: { class1: number; class2: number; class3: number } | null // 카카오 모빌리티 차종별(1종/2종/3종) 진입IC~진출TG 실경로 편도 통행료
  movingType: string
  movingDate?: Date | null
  menCount: number
  womenCount: number
  menUnitPrice?: number // 남성 일당 (기본 190,000)
  womenUnitPrice?: number // 여성 일당 (기본 170,000)
  vehicles?: { name: string; count: number; tonnage?: number }[] // 투입 차량 목록
  ladderTotalCost?: number
  waypointCount?: number // 경유 품목 수
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
  tollFareByClass = null,
  movingType,
  movingDate = null,
  menCount,
  womenCount,
  menUnitPrice = 190000,
  womenUnitPrice = 170000,
  vehicles = [],
  ladderTotalCost = 0,
  waypointCount = 0,
  costStandards
}: CostCalculatorModalProps) {
  // 대당 왕복 톨비 (전달된 왕복 톨비 우선, 없으면 편도 x 2)
  const perTruckRoundToll = initialRoundTollFare !== undefined && initialRoundTollFare > 0 
    ? initialRoundTollFare 
    : (tollFare * 2)
  const passedOneWayToll = Math.round(perTruckRoundToll / 2)

  // 사용자가 견적서에서 톨비를 수동으로 수정했는지 여부 (카카오 차종별 요금과 일치하면 차종별 실요금 테이블 사용)
  const hasMatchingKakaoClassToll = Boolean(
    tollFareByClass &&
      tollFareByClass.class1 > 0 &&
      (passedOneWayToll === tollFareByClass.class1 ||
        passedOneWayToll === tollFareByClass.class2 ||
        passedOneWayToll === tollFareByClass.class3)
  )

  // 차량 톤수별 한국도로공사 차종(종수) 라벨 반환
  const getVehicleClassLabel = (ton: 5 | 2.5 | 1): string => {
    if (ton === 5) return '3종(대형)'
    if (ton === 2.5) return '2종(중형)'
    return '1종(소형)'
  }

  // 차량 톤수(차종 종수)별 편도 고속도로 통행료 계산 (카카오 모빌리티 진입IC~진출TG 차종별 실경로 요금 우선 적용)
  // - 1톤 (1종 소형화물): 카카오맵 1종 통행료 (car_type=1)
  // - 2.5톤 (2종 중형화물): 카카오내비 2종 통행료 (car_type=2)
  // - 5톤 (3종 대형화물): 카카오내비 3종 통행료 (car_type=3)
  const getOneWayTollByTonnage = (ton: 5 | 2.5 | 1): number => {
    if (passedOneWayToll <= 0) return 0
    if (hasMatchingKakaoClassToll && tollFareByClass) {
      if (ton === 5) return tollFareByClass.class3
      if (ton === 2.5) return tollFareByClass.class2
      return tollFareByClass.class1
    }
    if (ton === 5) {
      return Math.round((passedOneWayToll * 1.05) / 100) * 100
    }
    return passedOneWayToll
  }

  // 개별 배차 차량의 톨비 계산: 자사운행('OWN')은 왕복(×2), 외주용차('CARGO'/'TOP')는 편도(×1)
  const calcSingleTruckToll = (truck: { tonnage: 5 | 2.5 | 1; operationType: 'OWN' | 'CARGO' | 'TOP' }): number => {
    const oneWay = getOneWayTollByTonnage(truck.tonnage)
    return truck.operationType === 'OWN' ? oneWay * 2 : oneWay
  }

  // 전체 배차 차량 리스트의 총 통행료 합산
  const calcTotalTollForTrucks = (truckList: { tonnage: 5 | 2.5 | 1; operationType: 'OWN' | 'CARGO' | 'TOP' }[]): number => {
    return truckList.reduce((sum, t) => sum + calcSingleTruckToll(t), 0)
  }

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

  // 개별 배차 차량 아이템 타입 (차량별 톤수 변경, 추가/삭제, 자사/용차 개별 지정 가능)
  interface DispatchedTruckItem {
    id: string
    tonnage: 5 | 2.5 | 1
    operationType: 'OWN' | 'CARGO' | 'TOP'
    fuelCost: number
    charteredCost: number
  }

  // 외주 용차 운임 시세 목록
  const [charteredFares, setCharteredFares] = useState<CharteredTruckFareItem[]>([])

  // 현재 거리에 해당하는 용차 기준 요금 매칭
  const currentMatchedFare = useMemo(() => {
    if (charteredFares.length === 0) return null
    return charteredFares.find(f => distanceKm >= f.minDistanceKm && distanceKm <= f.maxDistanceKm)
      || charteredFares[charteredFares.length - 1]
  }, [charteredFares, distanceKm])

  // 차종별 1대당 기본 왕복 유류비 계산
  const getDefaultFuelForTonnage = (ton: 5 | 2.5 | 1) => {
    const roundKm = distanceKm * 2
    if (ton === 5) return Math.round(roundKm * standards.fuelCostPerKm5Ton)
    if (ton === 2.5) return Math.round(roundKm * standards.fuelCostPerKm2_5Ton)
    return Math.round(roundKm * standards.fuelCostPerKm1Ton)
  }

  // 차종별·운행방식별 1대당 기본 외주 용차비 계산 (5톤 용차도 지원)
  const getDefaultCharteredCostForTonnage = (
    ton: 5 | 2.5 | 1,
    opType: 'CARGO' | 'TOP',
    fareObj?: CharteredTruckFareItem | null
  ) => {
    const matched = fareObj !== undefined ? fareObj : currentMatchedFare
    if (ton === 1) {
      return opType === 'CARGO' ? (matched?.cost1TonCargo ?? 70000) : (matched?.cost1TonTop ?? 90000)
    }
    if (ton === 2.5) {
      return opType === 'CARGO' ? (matched?.cost2_5TonCargo ?? 130000) : (matched?.cost2_5TonTop ?? 160000)
    }
    // 5톤 외주 용차: 기본운임(35만) + 거리할증 또는 2.5톤 시세의 약 1.8배 중 현실적 기준 적용
    const std5Calc = calculateTonnageDistanceFare({ tierKey: '5', distanceKm })
    const std5Total = std5Calc.rule.vehicleBaseFee + std5Calc.pureDistanceExtraCost
    if (opType === 'CARGO') {
      return Math.max(250000, Math.round((std5Total - 50000) / 10000) * 10000)
    }
    return Math.max(300000, Math.round(std5Total / 10000) * 10000)
  }

  // 견적서의 투입 차량 배열(vehicles)로부터 초기 개별 배차 차량 리스트 생성
  // 1호차는 자사 운행('OWN'), 2호차부터는 카고 용차('CARGO')를 기본 선택으로 세팅
  const buildInitialTruckList = (fareObj?: CharteredTruckFareItem | null): DispatchedTruckItem[] => {
    const list: DispatchedTruckItem[] = []
    let idx = 1

    vehicles.forEach(v => {
      const name = v.name || ''
      const count = Number(v.count) || 0
      if (count <= 0) return

      let ton: 5 | 2.5 | 1 = 5
      if (name.includes('5톤') || (v.tonnage && v.tonnage >= 5)) {
        ton = 5
      } else if (name.includes('2.5톤') || (v.tonnage && v.tonnage >= 2)) {
        ton = 2.5
      } else if (name.includes('1톤') || (v.tonnage && v.tonnage >= 1)) {
        ton = 1
      }

      for (let i = 0; i < count; i++) {
        const isFirstTruck = list.length === 0
        const opType: 'OWN' | 'CARGO' = isFirstTruck ? 'OWN' : 'CARGO'
        list.push({
          id: `truck_${idx++}_${Date.now()}`,
          tonnage: ton,
          operationType: opType,
          fuelCost: opType === 'OWN' ? getDefaultFuelForTonnage(ton) : 0,
          charteredCost: opType === 'OWN' ? 0 : getDefaultCharteredCostForTonnage(ton, opType, fareObj)
        })
      }
    })

    if (list.length === 0) {
      list.push({
        id: `truck_1_${Date.now()}`,
        tonnage: 5,
        operationType: 'OWN',
        fuelCost: getDefaultFuelForTonnage(5),
        charteredCost: 0
      })
    }

    return list
  }

  // 동적 배차 차량 리스트 상태
  const [dispatchedTrucks, setDispatchedTrucks] = useState<DispatchedTruckItem[]>(() => buildInitialTruckList())

  // 현재 배차 차량 리스트로부터 대수·톤수·자사/용차 실시간 집계
  const vehicleStats = useMemo(() => {
    let count5Ton = 0
    let count2_5Ton = 0
    let count1Ton = 0
    let ownCount = 0
    let charteredCount = 0

    dispatchedTrucks.forEach(t => {
      if (t.tonnage === 5) count5Ton += 1
      else if (t.tonnage === 2.5) count2_5Ton += 1
      else count1Ton += 1

      if (t.operationType === 'OWN') ownCount += 1
      else charteredCount += 1
    })

    const totalCount = dispatchedTrucks.length
    const totalTonnage = (count5Ton * 5) + (count2_5Ton * 2.5) + (count1Ton * 1)

    return { count5Ton, count2_5Ton, count1Ton, totalCount, totalTonnage, ownCount, charteredCount }
  }, [dispatchedTrucks])

  // 현재 배차 차량 구성에 맞는 톤수 규격 키 매칭 (1, 2.5, 5, 6, 7.5, 10)
  const matchedTierKey = useMemo(() => {
    const mapped = dispatchedTrucks.map(t => ({
      name: `${t.tonnage}톤`,
      count: 1,
      tonnage: t.tonnage
    }))
    return resolveTonnageTierKey(mapped)
  }, [dispatchedTrucks])

  // 차량 운임 산출 모드: 'ACTUAL_FUEL' (순수 왕복유류비 실비 원가) vs 'STANDARD_TABLE' (차량 고정기본료 + 구간별 초과거리 체감할증표)
  const [vehicleFareMode, setVehicleFareMode] = useState<'ACTUAL_FUEL' | 'STANDARD_TABLE'>('ACTUAL_FUEL')

  // 표준 차량운임 테이블 모드용 상태
  const [stdVehicleBaseFee, setStdVehicleBaseFee] = useState<number>(350000)
  const [stdDistanceExtraCost, setStdDistanceExtraCost] = useState<number>(0)
  const [stdUltraLongCost, setStdUltraLongCost] = useState<number>(0)
  const [includeWaypointFee, setIncludeWaypointFee] = useState<boolean>(waypointCount > 0)
  const [waypointFeeCost, setWaypointFeeCost] = useState<number>(waypointCount > 0 ? 70000 : 0)

  // 표준 단가표 기준 계산치 (전체 배차 톤수 기준)
  const standardTableCalc = useMemo(() => {
    return calculateTonnageDistanceFare({
      tierKey: matchedTierKey,
      distanceKm,
      includeUltraLongSurcharge: true,
      includeWaypointFee,
      waypointCount,
      customWaypointFee: waypointFeeCost
    })
  }, [matchedTierKey, distanceKm, includeWaypointFee, waypointCount, waypointFeeCost])

  // 자사 운행 차량만의 고정 기본료 및 초과거리 할증 계산 (용차 선택 차량은 고정기본료에서 자동 제외)
  const calcOwnStandardFromList = (truckList: DispatchedTruckItem[]) => {
    const ownTrucks = truckList.filter(t => t.operationType === 'OWN')
    const charteredTrucks = truckList.filter(t => t.operationType !== 'OWN')

    const getSingleBaseFee = (ton: 5 | 2.5 | 1) => (ton === 5 ? 350000 : ton === 2.5 ? 220000 : 120000)
    const ownBaseFee = ownTrucks.reduce((sum, t) => sum + getSingleBaseFee(t.tonnage), 0)
    const excludedBaseFee = charteredTrucks.reduce((sum, t) => sum + getSingleBaseFee(t.tonnage), 0)
    const totalTableBaseFee = ownBaseFee + excludedBaseFee

    if (ownTrucks.length === 0) {
      return {
        ownBaseFee: 0,
        excludedBaseFee,
        totalTableBaseFee,
        ownDistanceExtraCost: 0,
        ownShortExtraCost: 0,
        ownLongExtraCost: 0,
        ownTierLabel: '자사차 없음 (전량 용차)',
      }
    }

    const ownTierKey = resolveTonnageTierKey(
      ownTrucks.map(t => ({ name: `${t.tonnage}톤`, count: 1, tonnage: t.tonnage }))
    )
    const ownCalc = calculateTonnageDistanceFare({
      tierKey: ownTierKey,
      distanceKm,
      includeUltraLongSurcharge: true,
    })

    return {
      ownBaseFee,
      excludedBaseFee,
      totalTableBaseFee,
      ownDistanceExtraCost: ownCalc.pureDistanceExtraCost,
      ownShortExtraCost: ownCalc.shortExtraCost,
      ownLongExtraCost: ownCalc.longExtraCost,
      ownTierLabel: ownCalc.rule.label,
    }
  }

  const currentOwnStdFare = useMemo(
    () => calcOwnStandardFromList(dispatchedTrucks),
    [dispatchedTrucks, distanceKm]
  )

  // 톤수 초과 수당 기본값 계산 (6톤 1만, 7.5톤 2만, 10톤 3만)
  const getTonnageAllowanceForTon = (totalTon: number) => {
    if (totalTon >= 10) return standards.tonnageAllowance10Ton ?? 30000
    if (totalTon >= 7.5) return standards.tonnageAllowance7_5Ton ?? 20000
    if (totalTon >= 6.0) return standards.tonnageAllowance6Ton ?? 10000
    return 0
  }

  const defaultTonnageAllowanceRate = useMemo(
    () => getTonnageAllowanceForTon(vehicleStats.totalTonnage),
    [vehicleStats.totalTonnage, standards]
  )

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
  
  // 운전자 추가 수당 (자사운행 차량대수 x 20,000)
  const [driverCount, setDriverCount] = useState<number>(vehicleStats.ownCount)
  const [driverRate, setDriverRate] = useState<number>(standards.driverAllowance)

  // 톤수 초과 추가 수당 (6톤 1만, 7.5톤 2만, 10톤 3만 x 인원수)
  const [tonnageRate, setTonnageRate] = useState<number>(defaultTonnageAllowanceRate)

  // 장거리 추가 인건비 (인원수 x 구간수 x 10,000)
  const [distanceSteps, setDistanceSteps] = useState<number>(defaultDistanceStepCount)
  const [distanceRatePerPerson, setDistanceRatePerPerson] = useState<number>(standards.distanceAllowancePerPerson)

  // 식비 (총 인원 x 12,000)
  const [mealRate, setMealRate] = useState<number>(standards.mealCostPerPerson)

  // 왕복 톨게이트비 (편도 톨비 x 2 x 차량대수)
  const [roundTollFare, setRoundTollFare] = useState<number>(0)

  // 3. 일회성 자재비 (OPP 테이프)
  const [tapeUnitPrice, setTapeUnitPrice] = useState<number>(standards.tapeUnitPrice)
  const [tapeRolls, setTapeRolls] = useState<number>(0)

  // 4. 장비비 (사다리차 포함 여부)
  const [includeLadderCost, setIncludeLadderCost] = useState<boolean>(false)
  const [ladderCost, setLadderCost] = useState<number>(ladderTotalCost || 0)

  // 5. 캘린더 및 이사일정 할증 상태 (손 없는 날, 주말, 금요일, 월말, 공휴일)
  const [isSonEobNeunNal, setIsSonEobNeunNal] = useState<boolean>(false)
  const [isWeekend, setIsWeekend] = useState<boolean>(false)
  const [isFriday, setIsFriday] = useState<boolean>(false)
  const [isMonthEnd, setIsMonthEnd] = useState<boolean>(false)

  const [applySonEobNeunNal, setApplySonEobNeunNal] = useState<boolean>(false)
  const [sonEobNeunNalCost, setSonEobNeunNalCost] = useState<number>(150000)

  const [applyWeekend, setApplyWeekend] = useState<boolean>(false)
  const [weekendCost, setWeekendCost] = useState<number>(100000)

  const [applyFriday, setApplyFriday] = useState<boolean>(false)
  const [fridayCost, setFridayCost] = useState<number>(50000)

  const [applyMonthEnd, setApplyMonthEnd] = useState<boolean>(false)
  const [monthEndCost, setMonthEndCost] = useState<number>(50000)

  const [applyHoliday, setApplyHoliday] = useState<boolean>(false)
  const [holidayCost, setHolidayCost] = useState<number>(100000)

  // 6. 목표 마진율 (%)
  const [marginRate, setMarginRate] = useState<number>(standards.defaultMarginRate || 20.0)
  const [roundToTenThousand, setRoundToTenThousand] = useState<boolean>(true) // 만원 단위 올림 여부

  // 용차 기준정보 로드 및 기존 배차 차량의 용차비 자동 동기화
  useEffect(() => {
    if (isOpen) {
      getCharteredTruckFares()
        .then(data => {
          setCharteredFares(data)
          const matched =
            data.find(f => distanceKm >= f.minDistanceKm && distanceKm <= f.maxDistanceKm) ||
            data[data.length - 1] ||
            null
          if (matched) {
            setDispatchedTrucks(prev =>
              prev.map(t =>
                t.operationType === 'OWN'
                  ? t
                  : {
                      ...t,
                      charteredCost: getDefaultCharteredCostForTonnage(t.tonnage, t.operationType, matched),
                    }
              )
            )
          }
        })
        .catch(() => {})
    }
  }, [isOpen, distanceKm])

  // 배차 차량 리스트가 변경될 때 연관된 인건비(운전자수, 톤수수당), 차량기본료/할증, 톨비, 테이프 롤수 동기화
  const syncDependentStatesWithTrucks = (nextTrucks: DispatchedTruckItem[]) => {
    setDispatchedTrucks(nextTrucks)

    let c5 = 0
    let c25 = 0
    let c1 = 0
    let ownCnt = 0
    nextTrucks.forEach(t => {
      if (t.tonnage === 5) c5 += 1
      else if (t.tonnage === 2.5) c25 += 1
      else c1 += 1
      if (t.operationType === 'OWN') ownCnt += 1
    })

    const totalCnt = nextTrucks.length
    const totalTon = c5 * 5 + c25 * 2.5 + c1 * 1

    // 1) 자사 운전자 수 갱신 (단가 20,000원 유지)
    setDriverCount(ownCnt)
    if (driverRate === 0) {
      setDriverRate(standards.driverAllowance)
    }

    // 2) 톤수 초과 인건비 단가 갱신
    setTonnageRate(getTonnageAllowanceForTon(totalTon))

    // 3) 표준 차량 고정 기본료 & 초과거리 할증 갱신 (자사차만 반영, 용차 제외)
    const nextOwnStd = calcOwnStandardFromList(nextTrucks)
    setStdVehicleBaseFee(nextOwnStd.ownBaseFee)
    setStdDistanceExtraCost(nextOwnStd.ownDistanceExtraCost)

    const nextTierKey = resolveTonnageTierKey(
      nextTrucks.map(t => ({ name: `${t.tonnage}톤`, count: 1, tonnage: t.tonnage }))
    )
    const nextFullCalc = calculateTonnageDistanceFare({
      tierKey: nextTierKey,
      distanceKm,
      includeUltraLongSurcharge: true,
    })
    setStdUltraLongCost(nextFullCalc.ultraLongSurcharge)

    // 4) 고속도로 통행료(자사 왕복 / 용차 편도 / 차종 종수별) & 테이프 롤수 갱신
    setRoundTollFare(calcTotalTollForTrucks(nextTrucks))
    const rolls = c5 * standards.tapeRolls5Ton + c25 * standards.tapeRolls2_5Ton + c1 * standards.tapeRolls1Ton
    setTapeRolls(rolls > 0 ? rolls : 3)
  }

  // 개별 차량 추가 (1톤 / 2.5톤 / 5톤) — 1호차는 자사운행('OWN'), 2호차부터는 카고용차('CARGO') 기본 선택
  const handleAddTruck = (ton: 5 | 2.5 | 1, opType?: 'OWN' | 'CARGO' | 'TOP') => {
    const resolvedOpType: 'OWN' | 'CARGO' | 'TOP' =
      opType ?? (dispatchedTrucks.length >= 1 ? 'CARGO' : 'OWN')
    const newTruck: DispatchedTruckItem = {
      id: `truck_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tonnage: ton,
      operationType: resolvedOpType,
      fuelCost: resolvedOpType === 'OWN' ? getDefaultFuelForTonnage(ton) : 0,
      charteredCost: resolvedOpType === 'OWN' ? 0 : getDefaultCharteredCostForTonnage(ton, resolvedOpType),
    }
    syncDependentStatesWithTrucks([...dispatchedTrucks, newTruck])
  }

  // 개별 차량 삭제
  const handleRemoveTruck = (id: string) => {
    if (dispatchedTrucks.length <= 1) return
    syncDependentStatesWithTrucks(dispatchedTrucks.filter(t => t.id !== id))
  }

  // 개별 차량 톤수 변경 (예: 6톤 기본 5톤+1톤에서 1톤 -> 2.5톤 -> 5톤으로 변경)
  const handleChangeTruckTonnage = (id: string, newTon: 5 | 2.5 | 1) => {
    const next = dispatchedTrucks.map(t => {
      if (t.id !== id) return t
      return {
        ...t,
        tonnage: newTon,
        fuelCost: t.operationType === 'OWN' ? getDefaultFuelForTonnage(newTon) : 0,
        charteredCost:
          t.operationType === 'OWN'
            ? 0
            : getDefaultCharteredCostForTonnage(newTon, t.operationType),
      }
    })
    syncDependentStatesWithTrucks(next)
  }

  // 개별 차량 운용 방식 변경 (자사 운행 / 카고 용차 / 우천 탑차)
  const handleChangeTruckOperation = (id: string, opType: 'OWN' | 'CARGO' | 'TOP') => {
    const next = dispatchedTrucks.map(t => {
      if (t.id !== id) return t
      return {
        ...t,
        operationType: opType,
        fuelCost: opType === 'OWN' ? getDefaultFuelForTonnage(t.tonnage) : 0,
        charteredCost: opType === 'OWN' ? 0 : getDefaultCharteredCostForTonnage(t.tonnage, opType),
      }
    })
    syncDependentStatesWithTrucks(next)
  }

  // 빠른 배차 프리셋 적용 (1톤, 2.5톤, 5톤, 6톤[5+1], 7.5톤[5+2.5], 10톤[5+5])
  // 1호차(idx===0)는 자사운행('OWN'), 2호차부터(idx>=1)는 카고용차('CARGO')로 자동 지정
  const handleApplyTruckPreset = (tons: (5 | 2.5 | 1)[]) => {
    const next: DispatchedTruckItem[] = tons.map((ton, idx) => {
      const opType: 'OWN' | 'CARGO' = idx === 0 ? 'OWN' : 'CARGO'
      return {
        id: `preset_${idx}_${Date.now()}`,
        tonnage: ton,
        operationType: opType,
        fuelCost: opType === 'OWN' ? getDefaultFuelForTonnage(ton) : 0,
        charteredCost: opType === 'OWN' ? 0 : getDefaultCharteredCostForTonnage(ton, opType),
      }
    })
    syncDependentStatesWithTrucks(next)
  }

  // 초기 상태 자동 세팅
  const resetToRecommended = () => {
    setMenNum(menCount !== undefined ? menCount : 3)
    setMenRate(menUnitPrice || standards.maleLaborCost || 190000)
    setWomenNum(womenCount !== undefined ? womenCount : 1)
    setWomenRate(womenUnitPrice || standards.femaleLaborCost || 170000)

    const initialTrucks = buildInitialTruckList()
    setDispatchedTrucks(initialTrucks)

    const c5 = initialTrucks.filter(t => t.tonnage === 5).length
    const c25 = initialTrucks.filter(t => t.tonnage === 2.5).length
    const c1 = initialTrucks.filter(t => t.tonnage === 1).length
    const totalCnt = initialTrucks.length
    const ownCnt = initialTrucks.filter(t => t.operationType === 'OWN').length
    const totalTon = c5 * 5 + c25 * 2.5 + c1 * 1

    setDriverCount(ownCnt)
    setDriverRate(standards.driverAllowance)
    setTonnageRate(getTonnageAllowanceForTon(totalTon))

    // 이사일자 기반 캘린더 할증 해당 여부 판정 (명목별 기본 금액은 항상 표시하고, 체크 시 소계/제안가에 적용)
    setSonEobNeunNalCost(150000)
    setWeekendCost(100000)
    setFridayCost(50000)
    setMonthEndCost(50000)
    setHolidayCost(100000)

    if (movingDate) {
      const d = new Date(movingDate)
      const dayOfWeek = d.getDay() // 0: 일, 5: 금, 6: 토
      const dateNum = d.getDate()

      try {
        const korCal = new KoreanLunarCalendar()
        korCal.setSolarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
        const korLunar = korCal.getLunarCalendar()
        const isSon = korLunar.day % 10 === 9 || korLunar.day % 10 === 0
        setIsSonEobNeunNal(isSon)
      } catch {
        setIsSonEobNeunNal(false)
      }

      const isWk = dayOfWeek === 0 || dayOfWeek === 6
      const isFri = dayOfWeek === 5
      setIsWeekend(isWk)
      setIsFriday(isFri)

      const isEnd = dateNum >= 25
      setIsMonthEnd(isEnd)
    } else {
      setIsSonEobNeunNal(false)
      setIsWeekend(false)
      setIsFriday(false)
      setIsMonthEnd(false)
    }
    setApplySonEobNeunNal(false)
    setApplyWeekend(false)
    setApplyFriday(false)
    setApplyMonthEnd(false)
    setApplyHoliday(false)

    setDistanceSteps(defaultDistanceStepCount)
    setDistanceRatePerPerson(standards.distanceAllowancePerPerson)
    setMealRate(standards.mealCostPerPerson)

    // 표준 차량 기본운임 & 초과거리 할증표 값 세팅
    const initTierKey = resolveTonnageTierKey(
      initialTrucks.map(t => ({ name: `${t.tonnage}톤`, count: 1, tonnage: t.tonnage }))
    )
    const stdCalc = calculateTonnageDistanceFare({
      tierKey: initTierKey,
      distanceKm,
      includeUltraLongSurcharge: true,
      includeWaypointFee: waypointCount > 0,
      waypointCount
    })
    const initOwnStd = calcOwnStandardFromList(initialTrucks)
    setStdVehicleBaseFee(initOwnStd.ownBaseFee)
    setStdDistanceExtraCost(initOwnStd.ownDistanceExtraCost)
    setStdUltraLongCost(stdCalc.ultraLongSurcharge)
    setIncludeWaypointFee(waypointCount > 0)
    setWaypointFeeCost(waypointCount > 0 ? 70000 : 0)

    // 고속도로 통행료 (자사운행 왕복 + 외주용차 편도, 차종 종수별 자동 합산)
    const toll = calcTotalTollForTrucks(initialTrucks)
    setRoundTollFare(toll)

    // OPP 테이프 롤수
    const rolls = (c5 * standards.tapeRolls5Ton) +
                  (c25 * standards.tapeRolls2_5Ton) +
                  (c1 * standards.tapeRolls1Ton)
    setTapeRolls(rolls > 0 ? rolls : 3)
    setTapeUnitPrice(standards.tapeUnitPrice)

    setIncludeLadderCost(false)
    setLadderCost(ladderTotalCost || 0)
    setMarginRate(standards.defaultMarginRate || 20.0)
  }

  const excludedCharteredCount = vehicleStats.charteredCount

  useEffect(() => {
    if (isOpen) {
      resetToRecommended()
    }
  }, [isOpen, distanceKm, tollFare, perTruckRoundToll, tollFareByClass, vehicles, standards, menCount, womenCount, menUnitPrice, womenUnitPrice, ladderTotalCost, waypointCount, movingDate])

  // 총 인원 수
  const totalWorkers = menNum + womenNum

  // 1. 인건비 합계 계산
  const baseLaborCost = (menNum * menRate) + (womenNum * womenRate)
  const totalDriverAllowance = driverCount * driverRate
  const totalTonnageAllowance = totalWorkers * tonnageRate
  // 표준 차량운임표 모드에서는 초과거리 단가 내에 이미 이동 대기 인건비가 포함되어 있으므로 중복 산입 제외
  const totalDistanceAllowance = vehicleFareMode === 'STANDARD_TABLE'
    ? 0
    : (distanceSteps * distanceRatePerPerson * totalWorkers)
  const totalMealCost = totalWorkers * mealRate
  const totalLaborCost = baseLaborCost + totalDriverAllowance + totalTonnageAllowance + totalDistanceAllowance + totalMealCost

  // 2. 차량비 합계 계산 (자사 유류비/고정기본료 + 외주 용차비 + 왕복 톨비 + 경유 수고비 모두 차량비 소계로 통합!)
  const totalFuelCost = dispatchedTrucks
    .filter(t => t.operationType === 'OWN')
    .reduce((sum, t) => sum + (Number(t.fuelCost) || 0), 0)
  const totalCharteredCost = dispatchedTrucks
    .filter(t => t.operationType !== 'OWN')
    .reduce((sum, t) => sum + (Number(t.charteredCost) || 0), 0)
  const effectiveWaypointCost = includeWaypointFee ? waypointFeeCost : 0

  const totalVehicleCost = vehicleFareMode === 'STANDARD_TABLE'
    ? (stdVehicleBaseFee + stdDistanceExtraCost + stdUltraLongCost + totalCharteredCost + roundTollFare + effectiveWaypointCost)
    : (totalFuelCost + totalCharteredCost + roundTollFare + effectiveWaypointCost)

  // 3. 자재비 합계 계산
  const totalMaterialCost = tapeRolls * tapeUnitPrice

  // 4. 장비비 (사다리차 전용 — 외주 용차비는 2번 차량비로 완전 통합)
  const totalEquipmentCost = includeLadderCost ? ladderCost : 0

  // 5. 캘린더 및 이사일정 할증 합계 계산 (손 없는 날, 주말, 금요일, 월말, 공휴일)
  const totalCalendarSurcharge =
    (applySonEobNeunNal ? sonEobNeunNalCost : 0) +
    (applyWeekend ? weekendCost : 0) +
    (applyFriday ? fridayCost : 0) +
    (applyMonthEnd ? monthEndCost : 0) +
    (applyHoliday ? holidayCost : 0)

  // 6. 총 원가 (소요비용 합계)
  const totalCost = totalLaborCost + totalVehicleCost + totalMaterialCost + totalEquipmentCost

  // 7. 마진액 및 일정 할증 포함 최종 제안 판매가
  const marginAmount = Math.round(totalCost * (marginRate / 100))
  const rawSellingPrice = totalCost + marginAmount + totalCalendarSurcharge

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
                  실비원가 & 톤수별 표준운임·거리할증 통합
                </span>
              </h2>
              <p className="text-xs text-amber-100/90">
                주행거리 {distanceKm}km, 차량 {vehicleStats.totalCount}대({standardTableCalc.rule.label}), 작업원 {totalWorkers}명 기준 자동 추천
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
              <span className="text-[11px] text-gray-500">고속도로 톨게이트비 (종수·편/왕복):</span>
              <p className="font-bold text-gray-900 text-sm">
                {roundTollFare > 0 ? (
                  <>
                    총 {roundTollFare.toLocaleString()}원{' '}
                    <span className="text-[11px] font-semibold text-blue-600">
                      (자사 {vehicleStats.ownCount}대 왕복 · 용차 {vehicleStats.charteredCount}대 편도)
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400 font-normal">통행료 없음 (0원)</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-gray-500">투입 차량 ({standardTableCalc.rule.label}):</span>
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
              {/* 기본 일당 (소계 합산 시 프레임 강조) */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-lg transition-all ${
                baseLaborCost > 0
                  ? 'border-2 border-blue-400 bg-blue-50/40 ring-2 ring-blue-400/15 shadow-2xs'
                  : 'border border-dashed border-gray-200 bg-gray-50/50 opacity-70'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-800 font-bold">남성 작업원:</span>
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
                  <span className="text-xs text-gray-800 font-bold">여성 작업원:</span>
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

              {/* 추가 수당 4종 (소계에 합산되는 > 0원 항목만 프레임 강조) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                {/* 운전자 추가수당 */}
                <div className={`p-2.5 rounded-lg space-y-1 transition-all ${
                  totalDriverAllowance > 0
                    ? 'border-2 border-blue-400 bg-blue-50/40 ring-2 ring-blue-400/15 shadow-2xs'
                    : 'border border-dashed border-gray-200 bg-gray-50/50 opacity-70'
                }`}>
                  <div className="flex items-center justify-between font-bold text-gray-800">
                    <span className="flex items-center gap-1">
                      운전자 추가 수당
                      {excludedCharteredCount > 0 && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                          용차 제외
                        </span>
                      )}
                    </span>
                    <span className={totalDriverAllowance > 0 ? 'text-blue-700 font-extrabold' : 'text-gray-400 font-bold'}>
                      {totalDriverAllowance.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1">
                    <span>운전자:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={driverCount}
                        onChange={(e) => setDriverCount(parseInt(e.target.value, 10) || 0)}
                        className="w-10 px-1 py-0.5 text-center font-bold bg-white border border-gray-200 rounded text-gray-800"
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
                  <div className="flex items-center justify-between pt-0.5">
                    <p className="text-[10px] text-gray-500">
                      {excludedCharteredCount > 0
                        ? `외주 용차(${excludedCharteredCount}대) 제외 · 자사 운전자 ${driverCount}명분만 반영`
                        : `자사운행 차량 1대당 1명 지급`}
                    </p>
                  </div>
                </div>

                {/* 톤수 초과 추가수당 (6톤 1만, 7.5톤 2만, 10톤 3만) */}
                <div className={`p-2.5 rounded-lg space-y-1 transition-all ${
                  totalTonnageAllowance > 0
                    ? 'border-2 border-blue-400 bg-blue-50/40 ring-2 ring-blue-400/15 shadow-2xs'
                    : 'border border-dashed border-gray-200 bg-gray-50/50 opacity-70'
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
                    <span className={totalTonnageAllowance > 0 ? 'text-blue-700 font-extrabold' : 'text-gray-400 font-bold'}>
                      {totalTonnageAllowance.toLocaleString()}원
                    </span>
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
                <div className={`p-2.5 rounded-lg space-y-1 transition-all ${
                  totalDistanceAllowance > 0
                    ? 'border-2 border-blue-400 bg-blue-50/40 ring-2 ring-blue-400/15 shadow-2xs'
                    : 'border border-dashed border-gray-200 bg-gray-50/50 opacity-70'
                }`}>
                  <div className="flex items-center justify-between font-bold text-gray-800">
                    <span>장거리 추가 인건비</span>
                    <span className={totalDistanceAllowance > 0 ? 'text-blue-700 font-extrabold' : 'text-gray-400 font-bold'}>
                      {totalDistanceAllowance.toLocaleString()}원
                    </span>
                  </div>
                  {vehicleFareMode === 'STANDARD_TABLE' ? (
                    <p className="text-[10px] text-gray-500 font-medium pt-1">
                      ✓ 하단 [표준 차량운임·초과거리 할증] 단가에 이미 포함되어 중복 제외됨
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1">
                        <span>초과 구간(회):</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={distanceSteps}
                            onChange={(e) => setDistanceSteps(parseInt(e.target.value, 10) || 0)}
                            className="w-10 px-1 py-0.5 text-center font-bold bg-white border border-gray-200 rounded"
                          />
                          <span>구간 × {distanceRatePerPerson.toLocaleString()}원</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        {baseDistance}km 초과 시 매 {stepDistance}km당 인원수 곱 적용
                      </p>
                    </>
                  )}
                </div>

                {/* 식대 */}
                <div className={`p-2.5 rounded-lg space-y-1 transition-all ${
                  totalMealCost > 0
                    ? 'border-2 border-blue-400 bg-blue-50/40 ring-2 ring-blue-400/15 shadow-2xs'
                    : 'border border-dashed border-gray-200 bg-gray-50/50 opacity-70'
                }`}>
                  <div className="flex items-center justify-between font-bold text-gray-800">
                    <span>작업원 식대</span>
                    <span className={totalMealCost > 0 ? 'text-blue-700 font-extrabold' : 'text-gray-400 font-bold'}>
                      {totalMealCost.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1">
                    <span>1인당 식비:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="1000"
                        value={mealRate}
                        onChange={(e) => setMealRate(parseInt(e.target.value, 10) || 0)}
                        className="w-16 px-1 py-0.5 text-right font-bold bg-white border border-gray-200 rounded"
                      />
                      <span>원 × {totalWorkers}명</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">1인당 점심 식대 (기본 12,000원)</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. 차량비 세부 내역 (실비 유류비 모드 vs 톤수별 기본운임·초과거리 할증표 모드) */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="px-4 py-2.5 bg-emerald-50/70 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-emerald-900">2. 차량비 및 거리·경유 운임</span>
                {/* 차량비 산출 모드 전환 세그먼트 */}
                <div className="inline-flex rounded-lg bg-white p-0.5 border border-emerald-200 text-[11px] font-bold shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setVehicleFareMode('ACTUAL_FUEL')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      vehicleFareMode === 'ACTUAL_FUEL'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-gray-600 hover:text-emerald-700'
                    }`}
                  >
                    ① 순수 왕복유류비 원가
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehicleFareMode('STANDARD_TABLE')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      vehicleFareMode === 'STANDARD_TABLE'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-gray-600 hover:text-indigo-700'
                    }`}
                  >
                    ② 톤수별 기본운임 + 거리할증표
                  </button>
                </div>
              </div>
              <span className="font-extrabold text-emerald-700 text-sm">
                소계: {totalVehicleCost.toLocaleString()} 원
              </span>
            </div>

            <div className="p-3.5 space-y-3">
              {/* 모드 비교 안내 배너 */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-slate-900">
                    [{standardTableCalc.rule.label} ({ distanceKm }km) 기준 비교]
                  </span>
                  <span>
                    자사 왕복유류비: <strong className="text-emerald-700">{totalFuelCost.toLocaleString()}원</strong>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span>
                    표준 차량기본료({(stdVehicleBaseFee / 10000).toFixed(0)}만{currentOwnStdFare.excludedBaseFee > 0 ? '·용차제외' : ''}) + 거리할증: <strong className="text-indigo-700">{(stdVehicleBaseFee + stdDistanceExtraCost + stdUltraLongCost).toLocaleString()}원</strong>
                  </span>
                  {totalCharteredCost > 0 && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span>
                        외주 용차비({vehicleStats.charteredCount}대): <strong className="text-blue-700">+{totalCharteredCost.toLocaleString()}원</strong>
                      </span>
                    </>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  * 상단 탭 버튼으로 원가 산출 방식을 즉시 전환할 수 있습니다
                </span>
              </div>

              {vehicleFareMode === 'STANDARD_TABLE' && (
                /* ② 차량 톤수별 고정 기본료 + 구간별 초과거리 체감할증표 패널 */
                <div className="p-3 rounded-xl border-2 border-indigo-400 bg-indigo-50/40 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-indigo-200/80 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Navigation className="w-4 h-4 text-indigo-600" />
                      <span className="font-extrabold text-indigo-950 text-xs sm:text-sm">
                        {standardTableCalc.rule.label} 표준 차량 기본운임 & 초과거리 체감할증표 적용
                      </span>
                      <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">
                        기본 {standardTableCalc.baseDistanceKm}km 이내 포함
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-800">
                      근거리({standardTableCalc.baseDistanceKm + 1}~100km) {standardTableCalc.shortExtraRate.toLocaleString()}원/km · 장거리(101km~) {standardTableCalc.longExtraRate.toLocaleString()}원/km
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {/* 1) 순수 차량 고정 기본료 (소계 합산 시에만 프레임 강조) */}
                    <div className={`p-2.5 rounded-lg space-y-1 transition-all ${
                      stdVehicleBaseFee > 0
                        ? 'border-2 border-indigo-500 bg-white ring-2 ring-indigo-500/20 shadow-2xs'
                        : 'border border-dashed border-gray-200 bg-gray-50/50 opacity-70'
                    }`}>
                      <div className="flex items-center justify-between font-bold text-gray-800">
                        <span className="flex items-center gap-1">
                          ① 순수 차량 고정 기본료
                          {currentOwnStdFare.excludedBaseFee > 0 && (
                            <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                              용차 제외
                            </span>
                          )}
                        </span>
                        <span className={stdVehicleBaseFee > 0 ? 'text-indigo-700 font-extrabold' : 'text-gray-400 font-bold'}>
                          {stdVehicleBaseFee.toLocaleString()}원
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1">
                        <span>{currentOwnStdFare.excludedBaseFee > 0 ? `${currentOwnStdFare.ownTierLabel} 기본료:` : `${standardTableCalc.rule.label} 기본료:`}</span>
                        <div className="flex items-center gap-1">
                          <FormattedModalNumberInput
                            value={stdVehicleBaseFee}
                            onChange={setStdVehicleBaseFee}
                            className="w-24 px-1.5 py-0.5 text-right font-bold bg-white border border-gray-300 rounded text-xs text-indigo-950"
                          />
                          <span>원</span>
                        </div>
                      </div>
                      <p className={`text-[10px] ${currentOwnStdFare.excludedBaseFee > 0 ? 'text-amber-800 font-medium' : 'text-gray-400'}`}>
                        {currentOwnStdFare.excludedBaseFee > 0
                          ? `전체 ${currentOwnStdFare.totalTableBaseFee.toLocaleString()}원에서 외주 용차 기본료(-${currentOwnStdFare.excludedBaseFee.toLocaleString()}원) 제외됨`
                          : `인건비 제외 순수 차량분 (${standardTableCalc.baseDistanceKm}km 이내 기본 운행비)`}
                      </p>
                    </div>

                    {/* 2) 구간별 초과 거리 할증 (소계 합산 시에만 프레임 강조) */}
                    <div className={`p-2.5 rounded-lg space-y-1 transition-all ${
                      stdDistanceExtraCost > 0
                        ? 'border-2 border-indigo-500 bg-white ring-2 ring-indigo-500/20 shadow-2xs'
                        : 'border border-dashed border-gray-200 bg-gray-50/50 opacity-70'
                    }`}>
                      <div className="flex items-center justify-between font-bold text-gray-800">
                        <span>② 초과 거리 체감 할증 ({standardTableCalc.extraDistanceKm}km)</span>
                        <span className={stdDistanceExtraCost > 0 ? 'text-indigo-700 font-extrabold' : 'text-gray-400 font-bold'}>
                          +{stdDistanceExtraCost.toLocaleString()}원
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1">
                        <span>{currentOwnStdFare.excludedBaseFee > 0 ? '자사차 할증:' : '할증 합계:'}</span>
                        <div className="flex items-center gap-1">
                          <FormattedModalNumberInput
                            value={stdDistanceExtraCost}
                            onChange={setStdDistanceExtraCost}
                            className="w-24 px-1.5 py-0.5 text-right font-bold bg-white border border-gray-300 rounded text-xs text-indigo-950"
                          />
                          <span>원</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        {currentOwnStdFare.excludedBaseFee > 0
                          ? `자사 운행(${currentOwnStdFare.ownTierLabel}) 기준 근거리(${currentOwnStdFare.ownShortExtraCost.toLocaleString()}원) + 장거리(${currentOwnStdFare.ownLongExtraCost.toLocaleString()}원)`
                          : `근거리 ${standardTableCalc.shortExtraKm}km(${standardTableCalc.shortExtraCost.toLocaleString()}원) + 장거리 ${standardTableCalc.longExtraKm}km(${standardTableCalc.longExtraCost.toLocaleString()}원)`}
                      </p>
                    </div>

                    {/* 3) 250km 이상 초장거리 야간/복귀 수당 (소계 합산 시에만 프레임 강조) */}
                    <div className={`p-2.5 rounded-lg space-y-1 transition-all ${
                      stdUltraLongCost > 0
                        ? 'border-2 border-indigo-500 bg-white ring-2 ring-indigo-500/20 shadow-2xs'
                        : 'border border-dashed border-gray-200 bg-gray-50/50 opacity-70'
                    }`}>
                      <div className="flex items-center justify-between font-bold text-gray-800">
                        <span>③ 250km+ 초장거리 수당</span>
                        <span className={stdUltraLongCost > 0 ? 'text-indigo-700 font-extrabold' : 'text-gray-400 font-bold'}>
                          +{stdUltraLongCost.toLocaleString()}원
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1">
                        <span>야간/복귀 수당:</span>
                        <div className="flex items-center gap-1">
                          <FormattedModalNumberInput
                            value={stdUltraLongCost}
                            onChange={setStdUltraLongCost}
                            className="w-24 px-1.5 py-0.5 text-right font-bold bg-white border border-gray-300 rounded text-xs"
                          />
                          <span>원</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 truncate" title={standardTableCalc.rule.ultraLongNote}>
                        {standardTableCalc.rule.ultraLongNote}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 배차 차량 구성 프리셋 & 개별 차량 추가 툴바 */}
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-extrabold text-gray-800 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-emerald-600" />
                      배차 차량 구성 ({vehicleStats.totalCount}대 · 총 {vehicleStats.totalTonnage}톤)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      자사 {vehicleStats.ownCount}대
                    </span>
                    {vehicleStats.charteredCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        외주용차 {vehicleStats.charteredCount}대 (+{totalCharteredCost.toLocaleString()}원 차량비 합산됨)
                      </span>
                    )}
                  </div>

                  {/* 차량 추가 버튼 (1톤 / 2.5톤 / 5톤 자유 추가 — 2호차부터는 카고용차 기본 선택) */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[11px] text-gray-500 font-semibold mr-0.5">차량 추가:</span>
                    {([1, 2.5, 5] as const).map(ton => (
                      <button
                        key={ton}
                        type="button"
                        onClick={() => handleAddTruck(ton)}
                        className="px-2 py-0.5 rounded-md bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 text-[11px] font-extrabold flex items-center gap-0.5 shadow-2xs transition-colors"
                        title="2호차부터는 카고 용차가 기본 선택으로 추가됩니다"
                      >
                        <Plus className="w-3 h-3" />
                        {ton}톤 추가
                      </button>
                    ))}
                  </div>
                </div>

                {/* 표준 톤수별 빠른 배차 조합 프리셋 버튼 */}
                <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-gray-200/70 text-[11px]">
                  <span className="text-gray-500 font-medium mr-1">빠른 조합:</span>
                  {[
                    { label: '1톤 (1대)', tons: [1] as (5 | 2.5 | 1)[] },
                    { label: '2.5톤 (1대)', tons: [2.5] as (5 | 2.5 | 1)[] },
                    { label: '5톤 (1대)', tons: [5] as (5 | 2.5 | 1)[] },
                    { label: '6톤 (5톤+1톤)', tons: [5, 1] as (5 | 2.5 | 1)[] },
                    { label: '7.5톤 (5톤+2.5톤)', tons: [5, 2.5] as (5 | 2.5 | 1)[] },
                    { label: '10톤 (5톤+5톤)', tons: [5, 5] as (5 | 2.5 | 1)[] },
                  ].map(preset => {
                    const isCurrentMatch =
                      dispatchedTrucks.length === preset.tons.length &&
                      preset.tons.every((t, i) => dispatchedTrucks[i]?.tonnage === t)
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleApplyTruckPreset(preset.tons)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all border ${
                          isCurrentMatch
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 동적 배차 차량 카드 목록 (실제 차량비 소계에 합산되는 카드만 프레임 강조) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                {dispatchedTrucks.map((truck, idx) => {
                  const isOwn = truck.operationType === 'OWN'
                  const isCargo = truck.operationType === 'CARGO'
                  // 현재 모드에서 이 차량 카드의 금액(유류비 또는 용차비)이 차량비 소계에 직접 합산되는지 여부
                  const isCardSummedInSubtotal = isOwn
                    ? (vehicleFareMode === 'ACTUAL_FUEL' && truck.fuelCost > 0)
                    : (truck.charteredCost > 0)

                  const kmFuelUnit =
                    truck.tonnage === 5
                      ? standards.fuelCostPerKm5Ton
                      : truck.tonnage === 2.5
                      ? standards.fuelCostPerKm2_5Ton
                      : standards.fuelCostPerKm1Ton

                  return (
                    <div
                      key={truck.id}
                      className={`p-2.5 rounded-xl space-y-2 transition-all ${
                        !isCardSummedInSubtotal
                          ? 'border border-dashed border-gray-300 bg-gray-50/60'
                          : isOwn
                          ? 'border-2 border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-sm'
                          : isCargo
                          ? 'border-2 border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-sm'
                          : 'border-2 border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-500/20 shadow-sm'
                      }`}
                    >
                      {/* 카드 상단: 호차 번호 + 톤수 변경 버튼(1톤/2.5톤/5톤) + 삭제 버튼 */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold text-white shadow-2xs ${
                              isOwn ? 'bg-emerald-600' : isCargo ? 'bg-blue-600' : 'bg-indigo-600'
                            }`}
                          >
                            {idx + 1}호차
                          </span>
                          {/* 톤수 즉시 변경 버튼 그룹 (1톤 ~ 5톤 자유 변경) */}
                          <div className="inline-flex rounded bg-white/90 p-0.5 border border-gray-300 shadow-2xs">
                            {([1, 2.5, 5] as const).map(tonOption => (
                              <button
                                key={tonOption}
                                type="button"
                                onClick={() => handleChangeTruckTonnage(truck.id, tonOption)}
                                className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold transition-all ${
                                  truck.tonnage === tonOption
                                    ? isOwn
                                      ? 'bg-emerald-600 text-white'
                                      : isCargo
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-indigo-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                                title={`${idx + 1}호차 규격을 ${tonOption}톤으로 변경`}
                              >
                                {tonOption}톤
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <span
                            className={`font-extrabold text-xs ${
                              !isCardSummedInSubtotal
                                ? 'text-gray-400 line-through'
                                : isOwn
                                ? 'text-emerald-800'
                                : 'text-blue-800'
                            }`}
                          >
                            {isOwn
                              ? `${truck.fuelCost.toLocaleString()}원`
                              : `${truck.charteredCost.toLocaleString()}원`}
                          </span>
                          {dispatchedTrucks.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTruck(truck.id)}
                              className="p-0.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="이 배차 차량 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 운행 방식 3단 선택 (자사 운행 / 카고 용차 / 우천 탑차) — 5톤 포함 전 차종 용차 지원 */}
                      <div className="grid grid-cols-3 gap-1 p-0.5 bg-gray-200/80 rounded-md text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => handleChangeTruckOperation(truck.id, 'OWN')}
                          className={`py-1 rounded transition-all ${
                            isOwn
                              ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          자사 운행
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangeTruckOperation(truck.id, 'CARGO')}
                          className={`py-1 rounded transition-all ${
                            isCargo
                              ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                              : 'text-gray-600 hover:text-blue-700'
                          }`}
                          title="맑은 날 일반 카고 용차 배차"
                        >
                          카고 용차
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangeTruckOperation(truck.id, 'TOP')}
                          className={`py-1 rounded transition-all ${
                            truck.operationType === 'TOP'
                              ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                              : 'text-gray-600 hover:text-indigo-700'
                          }`}
                          title="우천·악천후 시 침수 방지 탑차 용차 배차"
                        >
                          우천 탑차
                        </button>
                      </div>

                      {/* 금액 입력 영역: 자사 운행 시 유류비 / 용차 시 외주 용차비 직접 수정 (차량비 소계에 즉시 합산) */}
                      {isOwn ? (
                        <div className="space-y-1 pt-0.5">
                          {vehicleFareMode === 'STANDARD_TABLE' ? (
                            <div className="text-[10px] text-gray-500 bg-white/80 px-2 py-1 rounded border border-gray-200 flex items-center justify-between">
                              <span>상단 [① 차량 고정기본료·② 거리할증]에 반영됨</span>
                              <span className="font-semibold text-gray-400">유류비 미합산</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-[11px] text-gray-600">
                              <span className="font-medium">
                                왕복 {distanceKm * 2}km × {kmFuelUnit}원:
                              </span>
                              <div className="flex items-center gap-0.5">
                                <FormattedModalNumberInput
                                  value={truck.fuelCost}
                                  onChange={val => {
                                    setDispatchedTrucks(prev =>
                                      prev.map(item =>
                                        item.id === truck.id ? { ...item, fuelCost: val } : item
                                      )
                                    )
                                  }}
                                  className="w-22 px-1.5 py-0.5 text-right font-bold bg-white border border-emerald-400 text-emerald-950 rounded text-xs"
                                />
                                <span className="text-[10px] text-gray-500">원</span>
                              </div>
                            </div>
                          )}
                          {passedOneWayToll > 0 && (
                            <div className="text-[10px] text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded flex items-center justify-between border border-emerald-200">
                              <span>고속도로 톨비 ({getVehicleClassLabel(truck.tonnage)} · 자사 왕복)</span>
                              <span className="font-extrabold text-emerald-950">
                                {calcSingleTruckToll(truck).toLocaleString()}원
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1 pt-0.5">
                          <div className="flex items-center justify-between text-[11px] text-blue-900">
                            <span className="font-bold">
                              {truck.tonnage}톤 {isCargo ? '카고용차비' : '우천탑차비'}:
                            </span>
                            <div className="flex items-center gap-0.5">
                              <FormattedModalNumberInput
                                value={truck.charteredCost}
                                onChange={val => {
                                  setDispatchedTrucks(prev =>
                                    prev.map(item =>
                                      item.id === truck.id ? { ...item, charteredCost: val } : item
                                    )
                                  )
                                }}
                                className="w-22 px-1.5 py-0.5 text-right font-extrabold bg-white border border-blue-400 text-blue-950 rounded text-xs"
                              />
                              <span className="text-[10px] text-blue-700 font-bold">원</span>
                            </div>
                          </div>
                          <div className="text-[10px] text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded flex items-center justify-between border border-blue-200">
                            <span>
                              {passedOneWayToll > 0
                                ? `톨비(${getVehicleClassLabel(truck.tonnage)}·용차편도 ${calcSingleTruckToll(truck).toLocaleString()}원)`
                                : '유류비·고정기본료·운전자수당 제외'}
                            </span>
                            <span className="font-bold text-blue-950">소계 합산됨</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 왕복 톨게이트비 & 경유 상하차 수고비 (소계에 합산되는 > 0원 항목만 프레임 강조) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className={`flex flex-col justify-between p-2.5 rounded-lg gap-1.5 transition-all ${
                  roundTollFare > 0
                    ? 'border-2 border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/15 shadow-2xs'
                    : 'border border-dashed border-gray-200 bg-gray-50/50 opacity-70'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className={`w-4 h-4 shrink-0 ${roundTollFare > 0 ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <span className="font-bold text-gray-800">고속도로 통행료 (자사 왕복 · 용차 편도 · 차종별)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FormattedModalNumberInput
                        value={roundTollFare}
                        onChange={(val) => setRoundTollFare(val)}
                        className="w-24 px-2 py-0.5 text-right font-bold bg-white border border-gray-300 rounded-md text-xs text-emerald-900"
                      />
                      <span className="text-gray-600 font-semibold">원</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-gray-600">
                    <span>
                      {passedOneWayToll > 0
                        ? dispatchedTrucks
                            .map(
                              (t, idx) =>
                                `${idx + 1}호차(${t.tonnage}t·${getVehicleClassLabel(t.tonnage)} ${
                                  t.operationType === 'OWN' ? '왕복' : '용차편도'
                                } ${calcSingleTruckToll(t).toLocaleString()}원)`
                            )
                            .join(' + ')
                        : '고속도로 통행료 없음 (0원)'}
                    </span>
                    <div className="flex items-center gap-1">
                      {passedOneWayToll > 0 && (
                        <button
                          type="button"
                          onClick={() => setRoundTollFare(calcTotalTollForTrucks(dispatchedTrucks))}
                          className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold hover:bg-emerald-200"
                          title="배차 차량별 종수(1종/2종/3종) 및 운행방식(자사 왕복 / 용차 편도) 기준 자동 재계산"
                        >
                          종수·편/왕복 재계산
                        </button>
                      )}
                      {distanceKm <= 30 && roundTollFare > 0 && (
                        <button
                          type="button"
                          onClick={() => setRoundTollFare(0)}
                          className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-300 font-bold hover:bg-gray-200"
                          title="30km 이내 시내/근거리는 통행료를 기본 운임에 흡수"
                        >
                          30km이내 흡수(0원)
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 경유(중간 들름) 상·하차 수고비 */}
                <div className={`flex flex-col justify-between p-2.5 rounded-lg gap-1.5 transition-all ${
                  effectiveWaypointCost > 0
                    ? 'border-2 border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/15 shadow-2xs'
                    : 'border border-dashed border-gray-200 bg-gray-50/50 opacity-70'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-800">
                      <input
                        type="checkbox"
                        checked={includeWaypointFee}
                        onChange={e => {
                          setIncludeWaypointFee(e.target.checked)
                          if (e.target.checked && waypointFeeCost === 0) setWaypointFeeCost(70000)
                        }}
                        className="w-3.5 h-3.5 text-purple-600 rounded"
                      />
                      <span>경유(중간 들름) 상·하차 수고비</span>
                      {waypointCount > 0 && (
                        <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-extrabold">
                          경유 {waypointCount}건 감지
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-1">
                      <FormattedModalNumberInput
                        value={includeWaypointFee ? waypointFeeCost : 0}
                        onChange={(val) => {
                          setWaypointFeeCost(val)
                          if (val > 0) setIncludeWaypointFee(true)
                        }}
                        className="w-24 px-2 py-0.5 text-right font-bold bg-white border border-gray-300 rounded-md text-xs text-purple-900"
                      />
                      <span className="text-gray-600 font-semibold">원</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>처가·시댁·가구점 경유 시 기본 5~10만 원</span>
                    <div className="flex items-center gap-1">
                      {[50000, 70000, 100000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setIncludeWaypointFee(true)
                            setWaypointFeeCost(amt)
                          }}
                          className="px-1.5 py-0.2 rounded bg-white border border-purple-200 text-purple-700 font-bold hover:bg-purple-100"
                        >
                          {(amt / 10000).toFixed(0)}만
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. 자재비 & 4. 장비비 (소계에 합산될 때만 내부 카드 프레임 강조) */}
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
              <div className="p-3">
                <div className={`p-2.5 rounded-lg space-y-2 text-xs transition-all ${
                  totalMaterialCost > 0
                    ? 'border-2 border-amber-400 bg-amber-50/40 ring-2 ring-amber-400/15 shadow-2xs'
                    : 'border border-dashed border-gray-200 bg-gray-50/50 opacity-70'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">소모 롤수:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={tapeRolls}
                        onChange={(e) => setTapeRolls(parseInt(e.target.value, 10) || 0)}
                        className="w-12 px-1.5 py-0.5 text-center font-bold bg-white border border-gray-200 rounded"
                      />
                      <span>롤</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">롤당 단가:</span>
                    <div className="flex items-center gap-1">
                      <FormattedModalNumberInput
                        value={tapeUnitPrice}
                        onChange={(val) => setTapeUnitPrice(val)}
                        className="w-16 px-1.5 py-0.5 text-right font-bold bg-white border border-gray-200 rounded text-xs"
                      />
                      <span>원</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    * 5톤 8롤, 2.5톤 5롤, 1톤 3롤 기준 자동 계산
                  </p>
                </div>
              </div>
            </div>

            {/* 4. 장비비 (사다리차 전용 — 체크되어 소계에 합산될 때만 프레임 강조) */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
              <div className="px-3.5 py-2 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  <span className="font-bold text-purple-900 text-xs">4. 장비비 (사다리차)</span>
                </div>
                <span className="font-bold text-purple-800 text-xs">{totalEquipmentCost.toLocaleString()} 원</span>
              </div>
              <div className="p-3">
                <div className={`p-2.5 rounded-lg space-y-2 text-xs transition-all ${
                  totalEquipmentCost > 0
                    ? 'border-2 border-purple-500 bg-purple-50/50 ring-2 ring-purple-500/15 shadow-2xs'
                    : 'border border-dashed border-gray-200 bg-gray-50/50 opacity-70'
                }`}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeLadderCost}
                      onChange={(e) => setIncludeLadderCost(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                    />
                    <span className="font-bold text-gray-800">기본 이사원가에 사다리차 장비비 포함</span>
                  </label>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-gray-600">사다리차 운임 합계:</span>
                    <div className="flex items-center gap-1">
                      <FormattedModalNumberInput
                        value={ladderCost}
                        onChange={(val) => setLadderCost(val)}
                        className="w-24 px-1.5 py-0.5 text-right font-bold bg-white border border-gray-200 rounded text-xs"
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

          {/* 5. 캘린더 및 이사일정 할증 (손 없는 날, 주말, 금요일, 월말, 공휴일 — 체크되어 소계에 합산될 때만 프레임 강조) */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="px-4 py-2.5 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-indigo-900">5. 캘린더 및 이사일정 할증 (손 없는 날 · 주말 · 금요일 · 월말)</span>
                <span className="text-[11px] font-semibold text-indigo-700 bg-white/90 px-2 py-0.5 rounded-full border border-indigo-200">
                  이사일: {movingDate ? new Date(movingDate).toISOString().slice(0, 10) : '미지정'}
                </span>
              </div>
              <span className="font-extrabold text-indigo-700 text-sm">
                소계: +{totalCalendarSurcharge.toLocaleString()} 원
              </span>
            </div>

            <div className="p-3.5 space-y-3">
              {/* 이사일 캘린더 자동 판정 알림 배너 */}
              {movingDate && (
                <div
                  className={`p-2.5 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 ${
                    isSonEobNeunNal
                      ? 'bg-amber-50/90 border-amber-300 text-amber-900'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles
                      className={`w-4 h-4 shrink-0 ${
                        isSonEobNeunNal ? 'text-amber-600' : 'text-gray-400'
                      }`}
                    />
                    <span>
                      {isSonEobNeunNal ? (
                        <strong>
                          ★ 선택하신 이사일({new Date(movingDate).toISOString().slice(0, 10)})은 민속 손 없는 날입니다!
                        </strong>
                      ) : (
                        <span>선택하신 이사일은 손 없는 날이 아닙니다.</span>
                      )}
                      {isWeekend ? ' (주말 일정)' : isFriday ? ' (금요일 일정)' : ''}
                      {isMonthEnd ? ' (월말 일정)' : ''}
                    </span>
                  </div>
                  <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    항목 체크 시 할증 금액이 적용됩니다
                  </span>
                </div>
              )}

              {/* 할증 체크박스 카드 그리드 (명목별 금액은 항상 표시하고, 체크 시 소계 합산 및 프레임 강조) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                {/* 1) 손 없는 날 할증 */}
                <div
                  className={`p-2.5 rounded-lg flex items-center justify-between gap-2 transition-all ${
                    applySonEobNeunNal && sonEobNeunNalCost > 0
                      ? 'border-2 border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/15 shadow-2xs'
                      : 'border border-dashed border-gray-200 bg-gray-50/50 opacity-80'
                  }`}
                >
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={applySonEobNeunNal}
                      onChange={e => setApplySonEobNeunNal(e.target.checked)}
                      className="w-3.5 h-3.5 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span>손 없는 날</span>
                    {isSonEobNeunNal && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-extrabold">
                        해당일
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-1">
                    <span className={applySonEobNeunNal ? 'text-amber-700 font-bold' : 'text-gray-400'}>+</span>
                    <FormattedModalNumberInput
                      value={sonEobNeunNalCost}
                      onChange={val => setSonEobNeunNalCost(val)}
                      className={`w-20 px-1.5 py-0.5 text-right font-bold bg-white border rounded text-xs ${
                        applySonEobNeunNal
                          ? 'border-amber-400 text-amber-900 font-extrabold'
                          : 'border-gray-300 text-gray-700'
                      }`}
                    />
                    <span className="text-gray-600">원</span>
                  </div>
                </div>

                {/* 2) 주말(토/일) 할증 */}
                <div
                  className={`p-2.5 rounded-lg flex items-center justify-between gap-2 transition-all ${
                    applyWeekend && weekendCost > 0
                      ? 'border-2 border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/15 shadow-2xs'
                      : 'border border-dashed border-gray-200 bg-gray-50/50 opacity-80'
                  }`}
                >
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={applyWeekend}
                      onChange={e => setApplyWeekend(e.target.checked)}
                      className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span>주말(토/일)</span>
                    {isWeekend && (
                      <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.2 rounded font-extrabold">
                        해당일
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-1">
                    <span className={applyWeekend ? 'text-indigo-700 font-bold' : 'text-gray-400'}>+</span>
                    <FormattedModalNumberInput
                      value={weekendCost}
                      onChange={val => setWeekendCost(val)}
                      className={`w-20 px-1.5 py-0.5 text-right font-bold bg-white border rounded text-xs ${
                        applyWeekend
                          ? 'border-indigo-400 text-indigo-900 font-extrabold'
                          : 'border-gray-300 text-gray-700'
                      }`}
                    />
                    <span className="text-gray-600">원</span>
                  </div>
                </div>

                {/* 3) 금요일 선호 할증 */}
                <div
                  className={`p-2.5 rounded-lg flex items-center justify-between gap-2 transition-all ${
                    applyFriday && fridayCost > 0
                      ? 'border-2 border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/15 shadow-2xs'
                      : 'border border-dashed border-gray-200 bg-gray-50/50 opacity-80'
                  }`}
                >
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={applyFriday}
                      onChange={e => setApplyFriday(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span>금요일 선호</span>
                    {isFriday && (
                      <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded font-extrabold">
                        해당일
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-1">
                    <span className={applyFriday ? 'text-blue-700 font-bold' : 'text-gray-400'}>+</span>
                    <FormattedModalNumberInput
                      value={fridayCost}
                      onChange={val => setFridayCost(val)}
                      className={`w-20 px-1.5 py-0.5 text-right font-bold bg-white border rounded text-xs ${
                        applyFriday
                          ? 'border-blue-400 text-blue-900 font-extrabold'
                          : 'border-gray-300 text-gray-700'
                      }`}
                    />
                    <span className="text-gray-600">원</span>
                  </div>
                </div>

                {/* 4) 월말(25일~말일) 할증 */}
                <div
                  className={`p-2.5 rounded-lg flex items-center justify-between gap-2 transition-all ${
                    applyMonthEnd && monthEndCost > 0
                      ? 'border-2 border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/15 shadow-2xs'
                      : 'border border-dashed border-gray-200 bg-gray-50/50 opacity-80'
                  }`}
                >
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={applyMonthEnd}
                      onChange={e => setApplyMonthEnd(e.target.checked)}
                      className="w-3.5 h-3.5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span>월말(25일~)</span>
                    {isMonthEnd && (
                      <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.2 rounded font-extrabold">
                        해당일
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-1">
                    <span className={applyMonthEnd ? 'text-purple-700 font-bold' : 'text-gray-400'}>+</span>
                    <FormattedModalNumberInput
                      value={monthEndCost}
                      onChange={val => setMonthEndCost(val)}
                      className={`w-20 px-1.5 py-0.5 text-right font-bold bg-white border rounded text-xs ${
                        applyMonthEnd
                          ? 'border-purple-400 text-purple-900 font-extrabold'
                          : 'border-gray-300 text-gray-700'
                      }`}
                    />
                    <span className="text-gray-600">원</span>
                  </div>
                </div>

                {/* 5) 공휴일 / 성수기 수동 할증 */}
                <div
                  className={`p-2.5 rounded-lg flex items-center justify-between gap-2 transition-all ${
                    applyHoliday && holidayCost > 0
                      ? 'border-2 border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/15 shadow-2xs'
                      : 'border border-dashed border-gray-200 bg-gray-50/50 opacity-80'
                  }`}
                >
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={applyHoliday}
                      onChange={e => setApplyHoliday(e.target.checked)}
                      className="w-3.5 h-3.5 text-rose-600 rounded focus:ring-rose-500"
                    />
                    <span>공휴일/성수기</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <span className={applyHoliday ? 'text-rose-700 font-bold' : 'text-gray-400'}>+</span>
                    <FormattedModalNumberInput
                      value={holidayCost}
                      onChange={val => setHolidayCost(val)}
                      className={`w-20 px-1.5 py-0.5 text-right font-bold bg-white border rounded text-xs ${
                        applyHoliday
                          ? 'border-rose-400 text-rose-900 font-extrabold'
                          : 'border-gray-300 text-gray-700'
                      }`}
                    />
                    <span className="text-gray-600">원</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. 마진율 설정 및 총 원가 종합 카드 */}
          <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/60 p-4 rounded-2xl border-2 border-amber-300/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
              <div>
                <span className="text-xs text-amber-900 font-bold flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-amber-700" />
                  목표 마진율 설정 및 제안가 산출
                </span>
                <p className="text-[11px] text-amber-800">
                  총 원가: <strong className="font-bold">{totalCost.toLocaleString()}원</strong> (인건비 {totalLaborCost.toLocaleString()} + 차량·용차·거리 {totalVehicleCost.toLocaleString()} + 자재비 {totalMaterialCost.toLocaleString()}{totalEquipmentCost > 0 ? ` + 장비비 ${totalEquipmentCost.toLocaleString()}` : ''})
                  {totalCalendarSurcharge > 0 && (
                    <span className="text-indigo-800 font-bold ml-1">
                      | 일정할증 +{totalCalendarSurcharge.toLocaleString()}원
                    </span>
                  )}
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
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center pt-1">
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

              <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-200">
                <span className="text-[11px] text-gray-500 font-medium">캘린더·일정 할증</span>
                <p className="text-base font-extrabold text-indigo-700">
                  +{totalCalendarSurcharge.toLocaleString()} <span className="text-xs font-normal">원</span>
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
