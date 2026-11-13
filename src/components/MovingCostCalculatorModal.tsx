'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  X,
  Calculator,
  Calendar as CalendarIcon,
  Sparkles,
  CheckCircle2,
  Truck,
  Plus,
  Trash2,
  Users,
  Layers,
  Navigation,
  Sun,
} from 'lucide-react'
import KoreanLunarCalendar from 'korean-lunar-calendar'
import {
  calculateTonnageDistanceFare,
  extractBaseTruckSpecs,
  type TonnageTierKey,
} from '@/lib/distanceFare'
import {
  SEASON_OPTIONS,
  detectSeasonByMovingDate,
  computeLadderFeeFromFares,
  type SeasonOptionKey,
} from '@/lib/movingSeason'
import type { CostStandardData } from '@/app/actions/costStandards'
import type { LadderFareItem } from '@/types/ladder'

// 1. CBM별 표준 가이드 구간 정의
export interface CbmTierGuide {
  id: string
  tierKey: TonnageTierKey
  name: string
  tonnage: string
  minCbm: number
  maxCbm: number
  recommendedWorkers: string
  guidePriceRange: string
  defaultPrice: number
  vehicleBaseFee: number
  baseDistanceKm: number
  shortExtraRate: number
  longExtraRate: number
  description: string
}

export const CBM_TIER_GUIDES: CbmTierGuide[] = [
  {
    id: '1ton',
    tierKey: '1',
    name: '소형 / 원룸 이사',
    tonnage: '1톤 1대',
    minCbm: 0,
    maxCbm: 7.0,
    recommendedWorkers: '남 1~2명',
    guidePriceRange: '400,000 ~ 550,000원',
    defaultPrice: 450000,
    vehicleBaseFee: 120000,
    baseDistanceKm: 20,
    shortExtraRate: 1000,
    longExtraRate: 900,
    description: '원룸, 오피스텔 및 소형 짐 (20km 이내 기본)',
  },
  {
    id: '2.5ton',
    tierKey: '2.5',
    name: '투룸 / 소형가구',
    tonnage: '2.5톤 1대',
    minCbm: 7.01,
    maxCbm: 15.0,
    recommendedWorkers: '남 2명 + 여 1명',
    guidePriceRange: '700,000 ~ 900,000원',
    defaultPrice: 800000,
    vehicleBaseFee: 220000,
    baseDistanceKm: 25,
    shortExtraRate: 1400,
    longExtraRate: 1200,
    description: '투룸, 신혼부부 소형 아파트 (25km 이내 기본)',
  },
  {
    id: '5ton',
    tierKey: '5',
    name: '표준 가정 이사',
    tonnage: '5톤 1대',
    minCbm: 15.01,
    maxCbm: 31.0,
    recommendedWorkers: '남 3명 + 여 1명',
    guidePriceRange: '1,100,000 ~ 1,300,000원',
    defaultPrice: 1200000,
    vehicleBaseFee: 350000,
    baseDistanceKm: 25,
    shortExtraRate: 1800,
    longExtraRate: 1500,
    description: '20 ~ 30평형 표준 가정집 (25km 이내 기본)',
  },
  {
    id: '6ton',
    tierKey: '6',
    name: '중대형 이사 (짐 많음)',
    tonnage: '5톤 1대 + 1톤 1대',
    minCbm: 31.01,
    maxCbm: 38.0,
    recommendedWorkers: '남 3~4명 + 여 1명',
    guidePriceRange: '1,400,000 ~ 1,600,000원',
    defaultPrice: 1500000,
    vehicleBaseFee: 470000,
    baseDistanceKm: 25,
    shortExtraRate: 2600,
    longExtraRate: 2200,
    description: '32 ~ 34평형 표준 세대 (25km 이내 기본)',
  },
  {
    id: '7.5ton',
    tierKey: '7.5',
    name: '대형 평형 이사',
    tonnage: '5톤 1대 + 2.5톤 1대',
    minCbm: 38.01,
    maxCbm: 46.0,
    recommendedWorkers: '남 4~5명 + 여 1명',
    guidePriceRange: '1,700,000 ~ 2,000,000원',
    defaultPrice: 1850000,
    vehicleBaseFee: 570000,
    baseDistanceKm: 25,
    shortExtraRate: 3000,
    longExtraRate: 2600,
    description: '34평 짐 많음 / 40평형대 세대 (25km 이내 기본)',
  },
  {
    id: '10ton',
    tierKey: '10',
    name: '초대형 / 복층 이사',
    tonnage: '5톤 2대',
    minCbm: 46.01,
    maxCbm: 999.0,
    recommendedWorkers: '남 5~6명 + 여 2명',
    guidePriceRange: '2,200,000 ~ 2,600,000원~',
    defaultPrice: 2400000,
    vehicleBaseFee: 700000,
    baseDistanceKm: 25,
    shortExtraRate: 3600,
    longExtraRate: 3000,
    description: '45평형 이상 대형 주택 및 복층 (25km 이내 기본)',
  },
]

export type EquipmentApplyMode = 'MOVING_COST' | 'ADDITIONAL_COST' | 'NONE'

interface ExtraEquipmentItem {
  id: string
  name: string
  checked: boolean
  cost: number
}

const LADDER_TONNAGE_OPTIONS: { value: string; label: string }[] = [
  { value: '1', label: '1톤' },
  { value: '2.5', label: '2.5톤' },
  { value: '5', label: '5톤' },
  { value: '6', label: '6톤' },
  { value: '7.5', label: '7.5톤' },
  { value: '10', label: '10톤' },
]

interface MovingCostCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
  currentCbm: number
  rawCbm?: number
  deadSpaceRatio?: number
  recommendedTierKey?: TonnageTierKey
  recommendedSummary?: string
  standardVehicles?: any[]
  movingDate: Date | null
  currentMovingCost: number
  distanceKm?: number
  roundTollFare?: number
  vehicleCount?: number
  waypointCount?: number
  costStandards?: CostStandardData
  // 장비비(사다리차 등) 연동 props
  fromFloor?: string
  toFloor?: string
  isFromLadder?: boolean
  isToLadder?: boolean
  ladderTonnage?: string
  isLadderTonnageExplicit?: boolean
  ladderFares?: LadderFareItem[]
  appliedLadderCost?: number
  onApply: (
    calculatedMovingCost: number,
    details: {
      baseCost: number
      distanceSurcharge?: number
      seasonCost?: number
      seasonLabel?: string
      calendarSurcharge: number
      equipmentCost: number
      equipmentApplyMode: EquipmentApplyMode
      totalSimulatedQuote: number
      summaryText: string
      ladderTonnage?: string
    }
  ) => void
}

export function MovingCostCalculatorModal({
  isOpen,
  onClose,
  currentCbm,
  rawCbm,
  deadSpaceRatio = 0,
  recommendedTierKey,
  recommendedSummary,
  standardVehicles,
  movingDate,
  currentMovingCost,
  distanceKm = 0,
  roundTollFare = 0,
  vehicleCount = 1,
  waypointCount = 0,
  costStandards,
  fromFloor = '',
  toFloor = '',
  isFromLadder = false,
  isToLadder = false,
  ladderTonnage = '5',
  isLadderTonnageExplicit = false,
  ladderFares = [],
  appliedLadderCost = 0,
  onApply,
}: MovingCostCalculatorModalProps) {
  // 차량 기준정보(VehicleMaster) 제원과 100% 일치하는 동적 CBM 구간 가이드 생성
  const tierGuides = useMemo<CbmTierGuide[]>(() => {
    const { bounds } = extractBaseTruckSpecs(standardVehicles)
    const round2 = (n: number) => Math.round(n * 100) / 100
    return CBM_TIER_GUIDES.map(g => {
      if (g.tierKey === '1') return { ...g, minCbm: 0, maxCbm: bounds.c1 }
      if (g.tierKey === '2.5') return { ...g, minCbm: round2(bounds.c1 + 0.01), maxCbm: bounds.c25 }
      if (g.tierKey === '5') return { ...g, minCbm: round2(bounds.c25 + 0.01), maxCbm: bounds.c5 }
      if (g.tierKey === '6') return { ...g, minCbm: round2(bounds.c5 + 0.01), maxCbm: bounds.c6 }
      if (g.tierKey === '7.5') return { ...g, minCbm: round2(bounds.c6 + 0.01), maxCbm: bounds.c75 }
      return { ...g, minCbm: round2(bounds.c75 + 0.01), maxCbm: 999.0 }
    })
  }, [standardVehicles])
  // 로컬 날짜 YYYY-MM-DD 포맷 헬퍼
  const formatLocalYMD = (dateVal?: Date | string | null): string => {
    if (!dateVal) return ''
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
      return dateVal.trim()
    }
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // 대한민국 법정 공휴일 판별 헬퍼
  const detectKoreanHolidayName = (d: Date): string | null => {
    const sMonth = d.getMonth() + 1
    const sDay = d.getDate()
    const sKey = `${sMonth}-${sDay}`
    const solarHolidays: Record<string, string> = {
      '1-1': '신정',
      '3-1': '삼일절',
      '5-5': '어린이날',
      '6-6': '현충일',
      '8-15': '광복절',
      '10-3': '개천절',
      '10-9': '한글날',
      '12-25': '성탄절',
    }
    if (solarHolidays[sKey]) return solarHolidays[sKey]

    try {
      const korCal = new KoreanLunarCalendar()
      korCal.setSolarDate(d.getFullYear(), sMonth, sDay)
      const lunar = korCal.getLunarCalendar() as {
        year: number
        month: number
        day: number
        isLeap?: boolean
        intercalation?: boolean
      }
      if (!lunar.isLeap && !lunar.intercalation) {
        const lKey = `${lunar.month}-${lunar.day}`
        if (lKey === '1-1') return '설날'
        if (lKey === '1-2') return '설날 연휴'
        if (lKey === '4-8') return '부처님오신날'
        if (lKey === '8-14') return '추석 연휴'
        if (lKey === '8-15') return '추석'
        if (lKey === '8-16') return '추석 연휴'
      }

      const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
      const nextCal = new KoreanLunarCalendar()
      nextCal.setSolarDate(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate())
      const nextLunar = nextCal.getLunarCalendar() as {
        year: number
        month: number
        day: number
        isLeap?: boolean
        intercalation?: boolean
      }
      if (!nextLunar.isLeap && !nextLunar.intercalation && nextLunar.month === 1 && nextLunar.day === 1) {
        return '설날 연휴'
      }
    } catch {
      // ignore
    }
    return null
  }

  // 1. 선택된 CBM 티어 및 기본운임
  const [selectedTierId, setSelectedTierId] = useState<string>('5ton')
  const [baseCost, setBaseCost] = useState<number>(1200000)

  // 2. 차량 톤수별 초과 거리 할증 및 초장거리/톨비/경유/운전자거리수당 상태
  const [includeDistanceInCalc, setIncludeDistanceInCalc] = useState<boolean>(false)
  const [simDistanceKm, setSimDistanceKm] = useState<number>(distanceKm)
  const [applyUltraLong, setApplyUltraLong] = useState<boolean>(true)
  const [customUltraLongFee, setCustomUltraLongFee] = useState<number | undefined>(undefined)
  const [includeTollOver30Km, setIncludeTollOver30Km] = useState<boolean>(distanceKm > 30)
  const [applyWaypointFee, setApplyWaypointFee] = useState<boolean>(waypointCount > 0)
  const [waypointFeeAmount, setWaypointFeeAmount] = useState<number>(70000)
  const [applyDriverDistanceExtra, setApplyDriverDistanceExtra] = useState<boolean>(true)
  const [roundDistanceToTenThousand, setRoundDistanceToTenThousand] = useState<boolean>(true)

  // 3-A. 시뮬레이션 이사일자 & 시즌별(성수기/비수기) 옵션 비용 상태
  const [simMovingDateStr, setSimMovingDateStr] = useState<string>(() => formatLocalYMD(movingDate))
  const [selectedSeasonKey, setSelectedSeasonKey] = useState<SeasonOptionKey>('NONE')
  const [seasonSign, setSeasonSign] = useState<1 | -1>(1) // 1: +할증, -1: -할인
  const [seasonAbsCost, setSeasonAbsCost] = useState<number>(0)

  // 3-B. 일자별 캘린더 할증 상태
  const [isSonEobNeunNal, setIsSonEobNeunNal] = useState<boolean>(false)
  const [isWeekend, setIsWeekend] = useState<boolean>(false)
  const [isFriday, setIsFriday] = useState<boolean>(false)
  const [isMonthEnd, setIsMonthEnd] = useState<boolean>(false)
  const [isHoliday, setIsHoliday] = useState<boolean>(false)
  const [holidayName, setHolidayName] = useState<string | null>(null)

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

  // 4. 장비비 내역 (출발지·도착지 사다리차 및 기타 장비) 상태
  const [equipmentApplyMode, setEquipmentApplyMode] = useState<EquipmentApplyMode>('MOVING_COST')
  const [simLadderTonnage, setSimLadderTonnage] = useState<string>(ladderTonnage || '5')
  const [useFromLadder, setUseFromLadder] = useState<boolean>(isFromLadder)
  const [simFromFloor, setSimFromFloor] = useState<string>(fromFloor)
  const [simFromLadderCost, setSimFromLadderCost] = useState<number>(0)
  const [simFromLadderTier, setSimFromLadderTier] = useState<string>('')

  const [useToLadder, setUseToLadder] = useState<boolean>(isToLadder)
  const [simToFloor, setSimToFloor] = useState<string>(toFloor)
  const [simToLadderCost, setSimToLadderCost] = useState<number>(0)
  const [simToLadderTier, setSimToLadderTier] = useState<string>('')

  const [extraEquipments, setExtraEquipments] = useState<ExtraEquipmentItem[]>([])
  const [newEquipName, setNewEquipName] = useState<string>('')
  const [newEquipCost, setNewEquipCost] = useState<number>(100000)

  // 날짜 문자열 기준 캘린더 요일/음력/공휴일 일괄 평가 헬퍼
  const applyCalendarFlagsForDateStr = (ymdStr: string) => {
    if (!ymdStr || !/^\d{4}-\d{1,2}-\d{1,2}$/.test(ymdStr)) {
      setIsSonEobNeunNal(false)
      setIsWeekend(false)
      setIsFriday(false)
      setIsMonthEnd(false)
      setIsHoliday(false)
      setHolidayName(null)
      setApplySonEobNeunNal(false)
      setApplyWeekend(false)
      setApplyFriday(false)
      setApplyMonthEnd(false)
      setApplyHoliday(false)
      return
    }

    const [y, m, day] = ymdStr.split('-').map(Number)
    const d = new Date(y, m - 1, day)
    const dayOfWeek = d.getDay()
    const dateNum = d.getDate()

    try {
      const korCal = new KoreanLunarCalendar()
      korCal.setSolarDate(y, m, day)
      const korLunar = korCal.getLunarCalendar()
      const isSon = korLunar.day % 10 === 9 || korLunar.day % 10 === 0
      setIsSonEobNeunNal(isSon)
      setApplySonEobNeunNal(isSon)
    } catch {
      setIsSonEobNeunNal(false)
      setApplySonEobNeunNal(false)
    }

    const isWk = dayOfWeek === 0 || dayOfWeek === 6
    const isFri = dayOfWeek === 5
    setIsWeekend(isWk)
    setIsFriday(isFri)
    setApplyWeekend(isWk)
    setApplyFriday(isFri)

    const isEnd = dateNum >= 25
    setIsMonthEnd(isEnd)
    setApplyMonthEnd(isEnd)

    const detectedHoliday = detectKoreanHolidayName(d)
    const isHol = Boolean(detectedHoliday)
    setIsHoliday(isHol)
    setHolidayName(detectedHoliday)
    setApplyHoliday(isHol)
  }

  // 모달 열릴 때 초기화 및 최적 차량 추천 톤수 · 사다리차(톤수×층수) 연동
  useEffect(() => {
    if (!isOpen) return

    const matchedByRecommended = recommendedTierKey
      ? tierGuides.find(t => t.tierKey === recommendedTierKey)
      : undefined
    const matched =
      matchedByRecommended ||
      tierGuides.find(t => currentCbm >= t.minCbm && currentCbm <= t.maxCbm) ||
      (currentCbm > 0 ? tierGuides[tierGuides.length - 1] : tierGuides[2])

    setSelectedTierId(matched.id)
    setBaseCost(matched.defaultPrice)
    setSimDistanceKm(distanceKm)
    setIncludeTollOver30Km(distanceKm > 30)
    setApplyWaypointFee(waypointCount > 0)
    setCustomUltraLongFee(undefined)

    // 이사일자 및 캘린더/시즌 초기화
    const initYmd = formatLocalYMD(movingDate)
    setSimMovingDateStr(initYmd)
    applyCalendarFlagsForDateStr(initYmd)
    setSelectedSeasonKey('NONE')
    setSeasonSign(1)
    setSeasonAbsCost(0)

    // 장비비(사다리차) 초기화: 수동 지정한 톤수가 없으면 최적 차량 추천 톤수(matched.tierKey)에 자동 연동
    const effectiveTon =
      isLadderTonnageExplicit && ladderTonnage ? ladderTonnage : matched.tierKey || '5'
    setSimLadderTonnage(effectiveTon)
    setUseFromLadder(isFromLadder)
    setUseToLadder(isToLadder)
    setSimFromFloor(fromFloor || '')
    setSimToFloor(toFloor || '')

    const fromFee = computeLadderFeeFromFares(fromFloor || '', effectiveTon, ladderFares)
    const toFee = computeLadderFeeFromFares(toFloor || '', effectiveTon, ladderFares)
    setSimFromLadderCost(fromFee.cost)
    setSimFromLadderTier(fromFee.tier)
    setSimToLadderCost(toFee.cost)
    setSimToLadderTier(toFee.tier)
    setExtraEquipments([])
    setNewEquipName('')
    setNewEquipCost(100000)

    // 기존 견적서의 가산비용 칸에 사다리차가 이미 반영되어 있으면 '가산비용 별도 반영'을 기본 선택하여 중복 청구 방지
    setEquipmentApplyMode(appliedLadderCost > 0 ? 'ADDITIONAL_COST' : 'MOVING_COST')
  }, [
    isOpen,
    currentCbm,
    recommendedTierKey,
    tierGuides,
    movingDate,
    currentMovingCost,
    distanceKm,
    waypointCount,
    fromFloor,
    toFloor,
    isFromLadder,
    isToLadder,
    ladderTonnage,
    isLadderTonnageExplicit,
    ladderFares,
    appliedLadderCost,
  ])

  const selectedTier = useMemo(() => {
    return tierGuides.find(t => t.id === selectedTierId) || tierGuides[2]
  }, [tierGuides, selectedTierId])

  // 선택된 차량 톤수 구간에 맞는 배차 대수 산출 (원가기반 시뮬레이터와 대수 일치)
  const effectiveVehicleCount = useMemo(() => {
    if (recommendedTierKey && selectedTier.tierKey === recommendedTierKey && vehicleCount > 0) {
      return vehicleCount
    }
    return ['6', '7.5', '10'].includes(selectedTier.tierKey) ? 2 : 1
  }, [selectedTier.tierKey, recommendedTierKey, vehicleCount])

  // 이사일자 기반 시즌 자동 감지 결과
  const detectedSeason = useMemo(() => {
    return detectSeasonByMovingDate(simMovingDateStr || movingDate)
  }, [simMovingDateStr, movingDate])

  // 시즌 옵션 선택 핸들러
  const handleSelectSeasonOption = (key: SeasonOptionKey, customDefaultAmt?: number) => {
    setSelectedSeasonKey(key)
    if (key === 'NONE') {
      setSeasonSign(1)
      setSeasonAbsCost(0)
      return
    }
    const found = SEASON_OPTIONS.find(o => o.key === key)
    const amt = customDefaultAmt !== undefined ? customDefaultAmt : (found?.defaultAmount ?? 0)
    setSeasonSign(amt < 0 ? -1 : 1)
    setSeasonAbsCost(Math.abs(amt))
  }

  // 시뮬레이터 내 이사일자 변경 시 캘린더 할증도 실시간 재판정
  const handleSimMovingDateChange = (nextYmd: string) => {
    setSimMovingDateStr(nextYmd)
    applyCalendarFlagsForDateStr(nextYmd)
  }

  // 사다리차 기준 톤수 변경 시 출발지/도착지 사다리차 표준운임(톤수×층수) 자동 갱신
  const handleChangeLadderTonnage = (nextTon: string) => {
    setSimLadderTonnage(nextTon)
    const fCalc = computeLadderFeeFromFares(simFromFloor, nextTon, ladderFares)
    const tCalc = computeLadderFeeFromFares(simToFloor, nextTon, ladderFares)
    setSimFromLadderCost(fCalc.cost)
    setSimFromLadderTier(fCalc.tier)
    setSimToLadderCost(tCalc.cost)
    setSimToLadderTier(tCalc.tier)
  }

  // 출발지 층수 변경 시 사다리차 운임 자동 재계산
  const handleChangeFromFloor = (val: string) => {
    setSimFromFloor(val)
    const fCalc = computeLadderFeeFromFares(val, simLadderTonnage, ladderFares)
    setSimFromLadderCost(fCalc.cost)
    setSimFromLadderTier(fCalc.tier)
    if (fCalc.floorNum >= 2 && fCalc.cost > 0) {
      setUseFromLadder(true)
    }
  }

  // 도착지 층수 변경 시 사다리차 운임 자동 재계산
  const handleChangeToFloor = (val: string) => {
    setSimToFloor(val)
    const tCalc = computeLadderFeeFromFares(val, simLadderTonnage, ladderFares)
    setSimToLadderCost(tCalc.cost)
    setSimToLadderTier(tCalc.tier)
    if (tCalc.floorNum >= 2 && tCalc.cost > 0) {
      setUseToLadder(true)
    }
  }

  // 기타 장비 추가/토글/금액수정/삭제
  const handleAddExtraEquipment = (presetName?: string, presetCost?: number) => {
    const name = (presetName ?? newEquipName).trim()
    const cost = presetCost !== undefined ? presetCost : Number(newEquipCost) || 0
    if (!name) return
    setExtraEquipments(prev => [
      ...prev,
      {
        id: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        checked: true,
        cost,
      },
    ])
    if (!presetName) {
      setNewEquipName('')
      setNewEquipCost(100000)
    }
  }

  const handleToggleExtraEquipment = (id: string) => {
    setExtraEquipments(prev =>
      prev.map(eq => (eq.id === id ? { ...eq, checked: !eq.checked } : eq))
    )
  }

  const handleChangeExtraEquipmentCost = (id: string, cost: number) => {
    setExtraEquipments(prev =>
      prev.map(eq => (eq.id === id ? { ...eq, cost: Math.max(0, cost), checked: cost > 0 ? true : eq.checked } : eq))
    )
  }

  const handleRemoveExtraEquipment = (id: string) => {
    setExtraEquipments(prev => prev.filter(eq => eq.id !== id))
  }

  // 차량 톤수별 거리 할증 계산 결과
  const distanceCalc = useMemo(() => {
    const totalRoundToll = (Number(roundTollFare) || 0) * Math.max(1, effectiveVehicleCount)
    return calculateTonnageDistanceFare({
      tierKey: selectedTier.tierKey,
      distanceKm: simDistanceKm,
      includeUltraLongSurcharge: applyUltraLong,
      customUltraLongSurcharge: customUltraLongFee,
      includeTollWhenOver30Km: includeTollOver30Km,
      totalRoundTollFare: totalRoundToll,
      includeWaypointFee: applyWaypointFee,
      waypointCount,
      customWaypointFee: waypointFeeAmount,
    })
  }, [
    selectedTier.tierKey,
    simDistanceKm,
    applyUltraLong,
    customUltraLongFee,
    includeTollOver30Km,
    roundTollFare,
    effectiveVehicleCount,
    applyWaypointFee,
    waypointCount,
    waypointFeeAmount,
  ])

  // 운전자 거리 초과 추가 수당 계산
  const driverBaseDistKm = costStandards?.driverBaseDistanceKm ?? 40
  const driverStepDistKm = costStandards?.driverDistanceStepKm ?? 40
  const driverStepAllowance = costStandards?.driverDistanceAllowance ?? 10000
  const driverExtraDistKm = Math.max(0, simDistanceKm - driverBaseDistKm)
  const driverExtraSteps = driverExtraDistKm > 0 ? Math.ceil(driverExtraDistKm / driverStepDistKm) : 0
  const driverDistanceExtraCost = applyDriverDistanceExtra
    ? driverExtraSteps * driverStepAllowance * Math.max(1, effectiveVehicleCount)
    : 0

  const rawDistancePlusDriverCost = distanceCalc.totalExtraCost + driverDistanceExtraCost

  const finalDistanceSurcharge = useMemo(() => {
    if (!includeDistanceInCalc) return 0
    const raw = rawDistancePlusDriverCost
    if (raw <= 0) return 0
    return roundDistanceToTenThousand ? Math.round(raw / 10000) * 10000 : raw
  }, [includeDistanceInCalc, rawDistancePlusDriverCost, roundDistanceToTenThousand])

  // CBM 티어 변경 시 기준운임 및 사다리차 톤수 연동
  const handleSelectTier = (tier: CbmTierGuide) => {
    setSelectedTierId(tier.id)
    setBaseCost(tier.defaultPrice)
    setCustomUltraLongFee(undefined)
    handleChangeLadderTonnage(tier.tierKey)
  }

  // 시즌 옵션 비용 (양수: 할증, 음수: 비수기 할인)
  const effectiveSeasonCost = selectedSeasonKey === 'NONE' ? 0 : seasonSign * (Number(seasonAbsCost) || 0)

  const selectedSeasonLabel = useMemo(() => {
    if (selectedSeasonKey === 'NONE' || effectiveSeasonCost === 0) return ''
    const found = SEASON_OPTIONS.find(o => o.key === selectedSeasonKey)
    return found ? found.shortLabel : effectiveSeasonCost > 0 ? '시즌 할증' : '비수기 할인'
  }, [selectedSeasonKey, effectiveSeasonCost])

  // 일자별 캘린더 할증 합계
  const totalCalendarSurcharge =
    (applySonEobNeunNal ? sonEobNeunNalCost : 0) +
    (applyWeekend ? weekendCost : 0) +
    (applyFriday ? fridayCost : 0) +
    (applyMonthEnd ? monthEndCost : 0) +
    (applyHoliday ? holidayCost : 0)

  const totalScheduleDelta = effectiveSeasonCost + totalCalendarSurcharge

  // 장비비 합계 계산
  const rawEquipmentCost =
    (useFromLadder ? Number(simFromLadderCost) || 0 : 0) +
    (useToLadder ? Number(simToLadderCost) || 0 : 0) +
    extraEquipments.filter(eq => eq.checked).reduce((sum, eq) => sum + (Number(eq.cost) || 0), 0)

  const effectiveEquipmentCost = equipmentApplyMode === 'NONE' ? 0 : rawEquipmentCost

  // 순수 이사운임 합계 (기준운임 + 거리할증 + 시즌옵션 + 캘린더할증)
  const pureMovingFare = Math.max(
    0,
    (Number(baseCost) || 0) + finalDistanceSurcharge + effectiveSeasonCost + totalCalendarSurcharge
  )

  // 기본 이사비용 칸에 들어갈 금액 (장비비를 '기본 이사비용에 합산' 선택한 경우 포함)
  const movingCostToApply =
    equipmentApplyMode === 'MOVING_COST' ? pureMovingFare + effectiveEquipmentCost : pureMovingFare

  // 총 견적 산출합계 (시뮬레이터 전체 공급가 기준)
  const totalSimulatedQuote = pureMovingFare + effectiveEquipmentCost

  // 견적서에 적용 핸들러
  const handleApplyToEstimate = () => {
    const breakdownItems: string[] = []
    if (selectedTier) {
      breakdownItems.push(`기준: ${selectedTier.tonnage} (${baseCost.toLocaleString()}원)`)
    }
    if (finalDistanceSurcharge > 0) {
      breakdownItems.push(`거리·경유(${simDistanceKm}km) +${finalDistanceSurcharge.toLocaleString()}원`)
    }
    if (effectiveSeasonCost !== 0) {
      breakdownItems.push(
        `${selectedSeasonLabel} ${effectiveSeasonCost > 0 ? '+' : ''}${effectiveSeasonCost.toLocaleString()}원`
      )
    }
    if (applySonEobNeunNal) breakdownItems.push(`손없는날 +${sonEobNeunNalCost.toLocaleString()}원`)
    if (applyWeekend) breakdownItems.push(`주말 +${weekendCost.toLocaleString()}원`)
    if (applyFriday) breakdownItems.push(`금요일 +${fridayCost.toLocaleString()}원`)
    if (applyMonthEnd) breakdownItems.push(`월말 +${monthEndCost.toLocaleString()}원`)
    if (applyHoliday) breakdownItems.push(`공휴일 +${holidayCost.toLocaleString()}원`)

    if (effectiveEquipmentCost > 0) {
      const eqParts: string[] = []
      if (useFromLadder && simFromLadderCost > 0) {
        eqParts.push(`출발사다리(${simFromFloor || '-'}층) ${simFromLadderCost.toLocaleString()}원`)
      }
      if (useToLadder && simToLadderCost > 0) {
        eqParts.push(`도착사다리(${simToFloor || '-'}층) ${simToLadderCost.toLocaleString()}원`)
      }
      extraEquipments
        .filter(e => e.checked && e.cost > 0)
        .forEach(e => eqParts.push(`${e.name} ${e.cost.toLocaleString()}원`))
      const modeTag = equipmentApplyMode === 'MOVING_COST' ? '기본합산' : '가산별도'
      breakdownItems.push(`장비비[${modeTag}](${eqParts.join(', ')}) +${effectiveEquipmentCost.toLocaleString()}원`)
    }

    onApply(movingCostToApply, {
      baseCost,
      distanceSurcharge: finalDistanceSurcharge,
      seasonCost: effectiveSeasonCost,
      seasonLabel: selectedSeasonLabel,
      calendarSurcharge: totalCalendarSurcharge,
      equipmentCost: effectiveEquipmentCost,
      equipmentApplyMode,
      totalSimulatedQuote,
      summaryText: breakdownItems.join(' / '),
      ladderTonnage: simLadderTonnage,
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* 상단 모달 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-linear-to-r from-blue-50/80 to-indigo-50/50">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Calculator size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-gray-900">
                  이사비용 산출 시뮬레이터
                </h2>
                <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  최적 차량 추천 톤수 · 거리할증 · 시즌 · 사다리(톤수×층수) 통합
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                최적 차량 추천 톤수({selectedTier.tonnage}, {effectiveVehicleCount}대) 기준 기본운임, 거리할증, 시즌 옵션 및 차량톤수·층수별 사다리비용을 종합 산출합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 모달 본문 (스크롤 영역) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 divide-y divide-gray-100">
          {/* 1. CBM별 물량 가이드 및 기준 이사비용 선택 */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Truck size={16} className="text-blue-600" />
                  <span>최적 차량 추천 톤수 · CBM별 기본운임 가이드</span>
                </h3>
              </div>

              {/* 현재 산출 CBM 및 최적 차량 추천 연동 뱃지 */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                <span className="text-gray-500 font-medium">필요 적재물량:</span>
                <span className="font-black text-blue-700">{currentCbm.toFixed(2)} CBM</span>
                {deadSpaceRatio > 0 && rawCbm !== undefined && (
                  <span className="text-[10px] text-gray-500">
                    (순수 {rawCbm.toFixed(1)} + 여유 {deadSpaceRatio}%)
                  </span>
                )}
                {recommendedSummary && (
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    최적추천: {recommendedSummary}
                  </span>
                )}
                {(currentCbm > 0 || recommendedTierKey) && (
                  <button
                    type="button"
                    onClick={() => {
                      const matched =
                        (recommendedTierKey
                          ? tierGuides.find(t => t.tierKey === recommendedTierKey)
                          : undefined) ||
                        tierGuides.find(t => currentCbm >= t.minCbm && currentCbm <= t.maxCbm) ||
                        tierGuides[tierGuides.length - 1]
                      if (matched) handleSelectTier(matched)
                    }}
                    className="ml-0.5 text-[11px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded hover:bg-blue-700 transition-colors"
                  >
                    최적 추천톤수 매칭
                  </button>
                )}
              </div>
            </div>

            {/* CBM 톤수별 6개 구간 카드 그리드 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {tierGuides.map(tier => {
                const isSelected = selectedTierId === tier.id
                const isCurrentRange = recommendedTierKey
                  ? tier.tierKey === recommendedTierKey && currentCbm > 0
                  : currentCbm > 0 && currentCbm >= tier.minCbm && currentCbm <= tier.maxCbm

                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => handleSelectTier(tier)}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                    }`}
                  >
                    {isCurrentRange && (
                      <span className="absolute -top-2 right-2 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                        최적 차량 추천
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-900">{tier.name}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {tier.tonnage}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        권장 구간:{' '}
                        {tier.minCbm === 0
                          ? `${tier.maxCbm} CBM 이하`
                          : `${tier.minCbm}~${tier.maxCbm > 100 ? '이상' : tier.maxCbm} CBM`}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Users size={12} className="text-gray-400" />
                          {tier.recommendedWorkers}
                        </span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                          기본 {tier.baseDistanceKm}km 이내
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-gray-500 flex items-center justify-between bg-white/80 px-1.5 py-0.5 rounded border border-gray-100">
                        <span>
                          차량 고정기본료:{' '}
                          <strong className="text-gray-800">
                            {(tier.vehicleBaseFee / 10000).toLocaleString()}만
                          </strong>
                        </span>
                        <span>
                          초과:{' '}
                          <strong className="text-blue-700">
                            {tier.shortExtraRate.toLocaleString()}원/km
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">포장이사 표준가</span>
                      <span
                        className={`text-xs font-black ${
                          isSelected ? 'text-blue-700' : 'text-gray-800'
                        }`}
                      >
                        {tier.defaultPrice.toLocaleString()}원
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 선택된 기본 운임 직접 수정 인풋 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 gap-2">
              <div className="text-xs text-gray-700">
                <span className="font-bold text-gray-900">
                  선택된 기준 이사비용 ({selectedTier.tonnage} · 기본 {selectedTier.baseDistanceKm}km 포함):{' '}
                </span>
                <span className="text-gray-500">
                  순수 차량 고정기본료 {selectedTier.vehicleBaseFee.toLocaleString()}원 + 표준 인건비 포함
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-gray-600">기준운임:</span>
                <input
                  type="text"
                  value={baseCost === 0 ? '' : baseCost.toLocaleString()}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, '')
                    setBaseCost(raw ? Number(raw) : 0)
                  }}
                  className="w-36 px-3 py-1.5 text-sm font-black text-right rounded-lg border border-gray-300 bg-white focus:border-blue-500 outline-none"
                />
                <span className="text-xs font-bold text-gray-700">원</span>
              </div>
            </div>
          </div>

          {/* 2. 차량 톤수별 초과 거리(km) 체감 할증 & 초장거리/경유 산출 */}
          <div className="pt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-black flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Navigation size={16} className="text-sky-600" />
                  <span>차량 톤수별 초과 거리(km) 할증 및 초장거리·경유 산출</span>
                </h3>
                <span className="text-[10px] font-bold bg-sky-50 text-sky-800 px-2 py-0.5 rounded-full border border-sky-200">
                  {distanceCalc.rule.label} 기준 (기본 {distanceCalc.baseDistanceKm}km 공제)
                </span>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-extrabold text-sky-900 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                <input
                  type="checkbox"
                  checked={includeDistanceInCalc}
                  onChange={e => setIncludeDistanceInCalc(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <span>
                  기본 이사비용에 거리할증 합산 반영 (+{finalDistanceSurcharge.toLocaleString()}원)
                </span>
              </label>
            </div>

            <div
              className={`p-3.5 rounded-xl border space-y-3 transition-all ${
                includeDistanceInCalc
                  ? 'bg-sky-50/50 border-sky-300 shadow-2xs'
                  : 'bg-gray-50/70 border-gray-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-gray-700">편도 실주행거리:</span>
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-sky-300">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={simDistanceKm === 0 ? '' : simDistanceKm}
                      onChange={e => {
                        const v = parseFloat(e.target.value) || 0
                        setSimDistanceKm(v)
                        if (v > distanceCalc.baseDistanceKm) setIncludeDistanceInCalc(true)
                      }}
                      placeholder="0.0"
                      className="w-16 text-right font-black text-sky-800 outline-none text-xs sm:text-sm"
                    />
                    <span className="font-bold text-gray-700">km</span>
                  </div>
                  <span className="text-gray-500">
                    (기본 <strong className="text-gray-800">{distanceCalc.baseDistanceKm}km</strong> 공제 ➔ 초과{' '}
                    <strong className="text-sky-700">{distanceCalc.extraDistanceKm}km</strong>)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-700">
                    근거리({distanceCalc.baseDistanceKm + 1}~100km):{' '}
                    <strong className="text-sky-700">
                      {distanceCalc.shortExtraRate.toLocaleString()}원/km
                    </strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-700">
                    장거리(101km~):{' '}
                    <strong className="text-indigo-700">
                      {distanceCalc.longExtraRate.toLocaleString()}원/km
                    </strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-white border border-gray-200 space-y-1">
                  <div className="flex items-center justify-between font-bold text-gray-800">
                    <span>① 근거리 초과 ({distanceCalc.baseDistanceKm + 1}~100km)</span>
                    <span className="text-sky-700 font-extrabold">
                      +{distanceCalc.shortExtraCost.toLocaleString()}원
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {distanceCalc.shortExtraKm}km × {distanceCalc.shortExtraRate.toLocaleString()}원/km
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-gray-200 space-y-1">
                  <div className="flex items-center justify-between font-bold text-gray-800">
                    <span>② 장거리 체감 (101km~)</span>
                    <span className="text-indigo-700 font-extrabold">
                      +{distanceCalc.longExtraCost.toLocaleString()}원
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {distanceCalc.longExtraKm}km × {distanceCalc.longExtraRate.toLocaleString()}원/km
                  </p>
                </div>

                <div
                  className={`p-2.5 rounded-lg border space-y-1 ${
                    distanceCalc.isUltraLong && applyUltraLong
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-gray-800">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyUltraLong}
                        onChange={e => setApplyUltraLong(e.target.checked)}
                        className="w-3.5 h-3.5 text-amber-600 rounded"
                      />
                      <span>③ 250km+ 초장거리 수당</span>
                    </label>
                    <span className="text-amber-700 font-extrabold">
                      +{distanceCalc.ultraLongSurcharge.toLocaleString()}원
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 truncate" title={distanceCalc.rule.ultraLongNote}>
                    {distanceCalc.isUltraLong
                      ? distanceCalc.rule.ultraLongNote
                      : '250km 이상 시 야간/복귀 수당 자동 적용'}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-gray-200 space-y-1">
                  <div className="flex items-center justify-between font-bold text-gray-800">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeTollOver30Km}
                        onChange={e => setIncludeTollOver30Km(e.target.checked)}
                        className="w-3.5 h-3.5 text-indigo-600 rounded"
                      />
                      <span>④ 30km+ 왕복톨비·경유</span>
                    </label>
                    <span className="text-purple-700 font-extrabold">
                      +{(distanceCalc.effectiveRoundToll + distanceCalc.waypointFee).toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>톨비: {distanceCalc.effectiveRoundToll.toLocaleString()}원</span>
                    <label className="flex items-center gap-1 cursor-pointer text-purple-700 font-bold">
                      <input
                        type="checkbox"
                        checked={applyWaypointFee}
                        onChange={e => setApplyWaypointFee(e.target.checked)}
                        className="w-3 h-3 rounded"
                      />
                      <span>경유(+{(waypointFeeAmount / 10000).toFixed(0)}만)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div
                className={`px-3 py-2 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-xs transition-all ${
                  driverExtraSteps > 0 && applyDriverDistanceExtra
                    ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                <label className="flex items-center gap-1.5 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={applyDriverDistanceExtra}
                    onChange={e => setApplyDriverDistanceExtra(e.target.checked)}
                    className="w-3.5 h-3.5 text-amber-600 rounded"
                  />
                  <span>
                    ⑤ 운전자 거리 초과 수당 (편도 {driverBaseDistKm}km 초과 매 {driverStepDistKm}km마다 +
                    {driverStepAllowance.toLocaleString()}원)
                  </span>
                  {driverExtraSteps > 0 && (
                    <span className="text-[10px] bg-amber-200 text-amber-950 px-1.5 py-0.2 rounded font-extrabold">
                      +{driverExtraSteps}구간 × 차량 {Math.max(1, effectiveVehicleCount)}대
                    </span>
                  )}
                </label>
                <span
                  className={`font-extrabold ${
                    driverDistanceExtraCost > 0 ? 'text-amber-800' : 'text-gray-400'
                  }`}
                >
                  +{driverDistanceExtraCost.toLocaleString()}원
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-gray-600">
                <span>
                  * 거리 할증 단가에는 이미 <strong>왕복 유류비 원가 + 이동 중 작업자 대기 인건비</strong>가 모두 포함되어 있습니다.
                </span>
                <label className="flex items-center gap-1 cursor-pointer font-bold text-sky-900">
                  <input
                    type="checkbox"
                    checked={roundDistanceToTenThousand}
                    onChange={e => setRoundDistanceToTenThousand(e.target.checked)}
                    className="w-3.5 h-3.5 text-sky-600 rounded"
                  />
                  <span>
                    1만 원 단위 반올림 ({rawDistancePlusDriverCost.toLocaleString()}원 ➔{' '}
                    {finalDistanceSurcharge.toLocaleString()}원)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* 3. 이사일자 기반 시즌별(성수기·비수기) 옵션 비용 & 캘린더 할증 */}
          <div className="pt-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <CalendarIcon size={16} className="text-indigo-600" />
                  <span>이사일자 시즌별(성수기·비수기) 옵션 및 캘린더 할증</span>
                </h3>
              </div>

              {/* 시뮬레이션 이사일자 직접 변경 & 소계 */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 bg-indigo-50/70 px-2.5 py-1 rounded-lg border border-indigo-200">
                  <span className="font-bold text-indigo-900">이사일자:</span>
                  <input
                    type="date"
                    value={simMovingDateStr}
                    onChange={e => handleSimMovingDateChange(e.target.value)}
                    className="bg-white px-2 py-0.5 rounded border border-indigo-200 text-xs font-extrabold text-gray-900 outline-none focus:border-indigo-500"
                  />
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg font-extrabold border ${
                    totalScheduleDelta > 0
                      ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      : totalScheduleDelta < 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  시즌·일정 소계: {totalScheduleDelta > 0 ? '+' : ''}
                  {totalScheduleDelta.toLocaleString()}원
                </span>
              </div>
            </div>

            {/* 3-A. 시즌별(성수기 / 준성수기 / 비수기) 옵션 선택 박스 */}
            <div className="p-3.5 rounded-xl border border-amber-200/90 bg-amber-50/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-950">
                  <Sun size={15} className="text-amber-600" />
                  <span>이사일자 기준 성수기 · 비수기 시즌 옵션</span>
                  {detectedSeason ? (
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-white border border-amber-300 text-amber-900">
                      자동판정: {detectedSeason.seasonTitle} (
                      {detectedSeason.defaultAmount >= 0 ? '+' : ''}
                      {detectedSeason.defaultAmount.toLocaleString()}원)
                    </span>
                  ) : (
                    <span className="ml-1 text-[11px] font-normal text-gray-500">
                      (이사일자를 선택하면 해당 시즌이 자동 안내됩니다)
                    </span>
                  )}
                </div>

                {detectedSeason && (
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectSeasonOption(
                        detectedSeason.recommendedKey,
                        detectedSeason.defaultAmount
                      )
                    }
                    className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-colors"
                  >
                    이사일 추천시즌 자동적용 (
                    {detectedSeason.defaultAmount >= 0 ? '+' : ''}
                    {(detectedSeason.defaultAmount / 10000).toLocaleString()}만)
                  </button>
                )}
              </div>

              {/* 시즌 옵션 6종 카드 그리드 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {SEASON_OPTIONS.map(opt => {
                  const isSelected = selectedSeasonKey === opt.key
                  const isRecommended =
                    Boolean(detectedSeason) && detectedSeason?.recommendedKey === opt.key
                  const isDiscount = opt.defaultAmount < 0

                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleSelectSeasonOption(opt.key)}
                      className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-1 ${
                        isSelected
                          ? isDiscount
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xs'
                            : opt.key === 'NONE'
                              ? 'bg-gray-100 border-gray-500 ring-2 ring-gray-400/20'
                              : 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-2xs'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {isRecommended && (
                        <span
                          className={`absolute -top-2 right-1.5 text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-2xs text-white ${
                            isDiscount ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        >
                          이사일 해당
                        </span>
                      )}
                      <div>
                        <div className="text-xs font-extrabold text-gray-900">{opt.shortLabel}</div>
                        <div className="text-[10px] text-gray-500 leading-tight mt-0.5">
                          {opt.periodDesc}
                        </div>
                      </div>
                      <div
                        className={`text-xs font-black pt-1 border-t border-gray-100 ${
                          opt.defaultAmount > 0
                            ? 'text-rose-700'
                            : opt.defaultAmount < 0
                              ? 'text-emerald-700'
                              : 'text-gray-600'
                        }`}
                      >
                        {opt.defaultAmount > 0
                          ? `+${opt.defaultAmount.toLocaleString()}원`
                          : opt.defaultAmount < 0
                            ? `${opt.defaultAmount.toLocaleString()}원`
                            : '0원 (기본)'}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* 선택된 시즌 옵션 금액 세부 조정 바 */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-amber-200 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-700">시즌 옵션 직접 조정:</span>
                  <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setSeasonSign(1)
                        if (selectedSeasonKey === 'NONE') setSelectedSeasonKey('CUSTOM')
                      }}
                      className={`px-2.5 py-1 text-xs font-extrabold transition-colors ${
                        seasonSign === 1
                          ? 'bg-rose-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      + 성수기 할증
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSeasonSign(-1)
                        if (selectedSeasonKey === 'NONE') setSelectedSeasonKey('CUSTOM')
                      }}
                      className={`px-2.5 py-1 text-xs font-extrabold transition-colors border-l border-gray-300 ${
                        seasonSign === -1
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      - 비수기 할인
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {[50000, 100000, 150000, 200000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          if (selectedSeasonKey === 'NONE') setSelectedSeasonKey('CUSTOM')
                          setSeasonAbsCost(amt)
                        }}
                        className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px]"
                      >
                        {(amt / 10000).toFixed(0)}만
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-black text-sm ${
                      effectiveSeasonCost > 0
                        ? 'text-rose-600'
                        : effectiveSeasonCost < 0
                          ? 'text-emerald-600'
                          : 'text-gray-400'
                    }`}
                  >
                    {seasonSign === 1 ? '+' : '-'}
                  </span>
                  <input
                    type="text"
                    value={seasonAbsCost === 0 ? '' : seasonAbsCost.toLocaleString()}
                    placeholder="0"
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      const num = raw ? Number(raw) : 0
                      setSeasonAbsCost(num)
                      if (num > 0 && selectedSeasonKey === 'NONE') {
                        setSelectedSeasonKey('CUSTOM')
                      } else if (num === 0) {
                        setSelectedSeasonKey('NONE')
                      }
                    }}
                    className="w-28 px-2.5 py-1 text-xs font-black text-right rounded-lg border border-gray-300 bg-white focus:border-amber-500 outline-none"
                  />
                  <span className="text-gray-700 font-bold">원</span>
                  {selectedSeasonKey !== 'NONE' && (
                    <button
                      type="button"
                      onClick={() => handleSelectSeasonOption('NONE')}
                      className="ml-1 px-2 py-1 rounded text-[11px] font-bold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200"
                    >
                      초기화
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 3-B. 손없는날 알림 배너 & 일자별 캘린더 할증 체크 */}
            {simMovingDateStr && (
              <div
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                  isSonEobNeunNal || isWeekend || isFriday || isMonthEnd || isHoliday
                    ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles
                    size={15}
                    className={
                      isSonEobNeunNal || isWeekend || isFriday || isMonthEnd || isHoliday
                        ? 'text-amber-600 shrink-0'
                        : 'text-gray-400 shrink-0'
                    }
                  />
                  <span>
                    {isSonEobNeunNal ? (
                      <strong>★ 이사일({simMovingDateStr})은 민속 손 없는 날입니다!</strong>
                    ) : (
                      <span>이사일({simMovingDateStr})은 손 없는 날이 아닙니다.</span>
                    )}
                    {isHoliday && holidayName ? ` [공휴일: ${holidayName}]` : ''}
                    {isWeekend ? ' (주말 일정)' : isFriday ? ' (금요일 일정)' : ''}
                    {isMonthEnd ? ' (월말 일정)' : ''}
                  </span>
                </div>
                <span className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 shrink-0">
                  {isSonEobNeunNal || isWeekend || isFriday || isMonthEnd || isHoliday
                    ? '캘린더 자동 체크됨'
                    : '캘린더 할증 없음'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {/* 1) 손 없는 날 */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                  applySonEobNeunNal ? 'bg-amber-50/50 border-amber-300' : 'bg-white border-gray-200'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="checkbox"
                    checked={applySonEobNeunNal}
                    onChange={e => setApplySonEobNeunNal(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span>손 없는 날</span>
                  {isSonEobNeunNal && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                      해당일
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">+</span>
                  <input
                    type="text"
                    disabled={!applySonEobNeunNal}
                    value={sonEobNeunNalCost === 0 ? '' : sonEobNeunNalCost.toLocaleString()}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      setSonEobNeunNalCost(raw ? Number(raw) : 0)
                    }}
                    className="w-20 px-2 py-1 text-xs font-bold text-right rounded border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400 outline-none"
                  />
                  <span className="text-xs text-gray-600">원</span>
                </div>
              </div>

              {/* 2) 주말(토/일) */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                  applyWeekend ? 'bg-indigo-50/50 border-indigo-300' : 'bg-white border-gray-200'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="checkbox"
                    checked={applyWeekend}
                    onChange={e => setApplyWeekend(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>주말(토/일)</span>
                  {isWeekend && (
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                      해당일
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">+</span>
                  <input
                    type="text"
                    disabled={!applyWeekend}
                    value={weekendCost === 0 ? '' : weekendCost.toLocaleString()}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      setWeekendCost(raw ? Number(raw) : 0)
                    }}
                    className="w-20 px-2 py-1 text-xs font-bold text-right rounded border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400 outline-none"
                  />
                  <span className="text-xs text-gray-600">원</span>
                </div>
              </div>

              {/* 3) 금요일 선호 */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                  applyFriday ? 'bg-blue-50/50 border-blue-300' : 'bg-white border-gray-200'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="checkbox"
                    checked={applyFriday}
                    onChange={e => setApplyFriday(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>금요일 선호</span>
                  {isFriday && (
                    <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                      해당일
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">+</span>
                  <input
                    type="text"
                    disabled={!applyFriday}
                    value={fridayCost === 0 ? '' : fridayCost.toLocaleString()}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      setFridayCost(raw ? Number(raw) : 0)
                    }}
                    className="w-20 px-2 py-1 text-xs font-bold text-right rounded border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400 outline-none"
                  />
                  <span className="text-xs text-gray-600">원</span>
                </div>
              </div>

              {/* 4) 월말(25일~말일) */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                  applyMonthEnd ? 'bg-purple-50/50 border-purple-300' : 'bg-white border-gray-200'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="checkbox"
                    checked={applyMonthEnd}
                    onChange={e => setApplyMonthEnd(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>월말(25일~말일)</span>
                  {isMonthEnd && (
                    <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                      해당일
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">+</span>
                  <input
                    type="text"
                    disabled={!applyMonthEnd}
                    value={monthEndCost === 0 ? '' : monthEndCost.toLocaleString()}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      setMonthEndCost(raw ? Number(raw) : 0)
                    }}
                    className="w-20 px-2 py-1 text-xs font-bold text-right rounded border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400 outline-none"
                  />
                  <span className="text-xs text-gray-600">원</span>
                </div>
              </div>

              {/* 5) 법정 공휴일 할증 */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors sm:col-span-2 ${
                  applyHoliday ? 'bg-rose-50/50 border-rose-300' : 'bg-white border-gray-200'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="checkbox"
                    checked={applyHoliday}
                    onChange={e => setApplyHoliday(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded"
                  />
                  <span>법정 공휴일 특별 할증</span>
                  {isHoliday && (
                    <span className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                      {holidayName ? `해당일(${holidayName})` : '해당일'}
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">+</span>
                  <input
                    type="text"
                    disabled={!applyHoliday}
                    value={holidayCost === 0 ? '' : holidayCost.toLocaleString()}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      setHolidayCost(raw ? Number(raw) : 0)
                    }}
                    className="w-20 px-2 py-1 text-xs font-bold text-right rounded border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400 outline-none"
                  />
                  <span className="text-xs text-gray-600">원</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. 장비비 내역 (출발지·도착지 사다리차 및 스카이차 등 기타 장비) */}
          <div className="pt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-black flex items-center justify-center">
                  4
                </span>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Layers size={16} className="text-purple-600" />
                  <span>장비비 내역 (사다리차 · 스카이차 등)</span>
                </h3>
                <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  장비 소계: +{effectiveEquipmentCost.toLocaleString()}원
                </span>
              </div>

              {/* 장비비 반영 방식 선택 탭 */}
              <div className="inline-flex rounded-xl border border-purple-200 bg-purple-50/60 p-0.5 text-[11px] font-extrabold">
                <button
                  type="button"
                  onClick={() => setEquipmentApplyMode('MOVING_COST')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    equipmentApplyMode === 'MOVING_COST'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-purple-900 hover:bg-purple-100/70'
                  }`}
                >
                  기본 이사비용에 합산
                </button>
                <button
                  type="button"
                  onClick={() => setEquipmentApplyMode('ADDITIONAL_COST')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    equipmentApplyMode === 'ADDITIONAL_COST'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-purple-900 hover:bg-purple-100/70'
                  }`}
                >
                  가산비용 칸에 별도 반영
                </button>
                <button
                  type="button"
                  onClick={() => setEquipmentApplyMode('NONE')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    equipmentApplyMode === 'NONE'
                      ? 'bg-gray-700 text-white shadow-2xs'
                      : 'text-gray-600 hover:bg-gray-200/70'
                  }`}
                >
                  미포함
                </button>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-xl border space-y-3 transition-all ${
                equipmentApplyMode !== 'NONE' && rawEquipmentCost > 0
                  ? 'bg-purple-50/40 border-purple-300 shadow-2xs'
                  : 'bg-gray-50/70 border-gray-200'
              }`}
            >
              {/* 사다리차 기준 톤수 선택 바 (차량 톤수 자동 연동) */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-gray-700">사다리차 차량 톤수:</span>
                  {LADDER_TONNAGE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleChangeLadderTonnage(opt.value)}
                      className={`px-2 py-0.5 rounded-md font-bold transition-all border ${
                        simLadderTonnage === opt.value
                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  {simLadderTonnage === selectedTier.tierKey ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      차량 톤수({selectedTier.tierKey}톤) 자동연동됨
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleChangeLadderTonnage(selectedTier.tierKey)}
                      className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200"
                    >
                      차량 톤수({selectedTier.tierKey}톤)로 맞추기
                    </button>
                  )}
                </div>
                {appliedLadderCost > 0 && (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    현재 견적서 가산비용에 사다리차 +{appliedLadderCost.toLocaleString()}원 반영 중 (중복 자동방지)
                  </span>
                )}
              </div>

              {/* 출발지 / 도착지 사다리차 2열 카드 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {/* 출발지 사다리차 */}
                <div
                  className={`p-3 rounded-xl border space-y-2 transition-colors ${
                    useFromLadder && equipmentApplyMode !== 'NONE'
                      ? 'bg-white border-purple-400 shadow-2xs'
                      : 'bg-white/80 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-extrabold text-gray-900">
                      <input
                        type="checkbox"
                        checked={useFromLadder}
                        onChange={e => {
                          const checked = e.target.checked
                          setUseFromLadder(checked)
                          if (checked && simFromLadderCost === 0 && simFromFloor) {
                            const fCalc = computeLadderFeeFromFares(simFromFloor, simLadderTonnage, ladderFares)
                            setSimFromLadderCost(fCalc.cost)
                            setSimFromLadderTier(fCalc.tier)
                          }
                        }}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span>출발지 사다리차</span>
                      {simFromLadderTier && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                          {simLadderTonnage}톤 · {simFromLadderTier}
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-500">층수:</span>
                      <input
                        type="text"
                        value={simFromFloor}
                        onChange={e => handleChangeFromFloor(e.target.value)}
                        placeholder="예: 14"
                        className="w-12 px-1.5 py-0.5 text-center font-bold rounded border border-gray-300 bg-white outline-none focus:border-purple-500"
                      />
                      <span className="text-[11px] text-gray-600">층</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                    <span className="text-[11px] text-gray-500">
                      {parseInt(String(simFromFloor || '').replace(/[^0-9]/g, ''), 10) >= 2
                        ? `${simLadderTonnage}톤 × ${simFromFloor}층 표준단가 자동산출`
                        : '2층 이상 입력 시 차량톤수·층수별 자동산출'}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">+</span>
                      <input
                        type="text"
                        disabled={!useFromLadder}
                        value={simFromLadderCost === 0 ? '' : simFromLadderCost.toLocaleString()}
                        placeholder="0"
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9]/g, '')
                          setSimFromLadderCost(raw ? Number(raw) : 0)
                        }}
                        className="w-24 px-2 py-1 text-xs font-black text-right rounded border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400 outline-none"
                      />
                      <span className="text-gray-600 font-bold">원</span>
                    </div>
                  </div>
                </div>

                {/* 도착지 사다리차 */}
                <div
                  className={`p-3 rounded-xl border space-y-2 transition-colors ${
                    useToLadder && equipmentApplyMode !== 'NONE'
                      ? 'bg-white border-purple-400 shadow-2xs'
                      : 'bg-white/80 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-extrabold text-gray-900">
                      <input
                        type="checkbox"
                        checked={useToLadder}
                        onChange={e => {
                          const checked = e.target.checked
                          setUseToLadder(checked)
                          if (checked && simToLadderCost === 0 && simToFloor) {
                            const tCalc = computeLadderFeeFromFares(simToFloor, simLadderTonnage, ladderFares)
                            setSimToLadderCost(tCalc.cost)
                            setSimToLadderTier(tCalc.tier)
                          }
                        }}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span>도착지 사다리차</span>
                      {simToLadderTier && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                          {simLadderTonnage}톤 · {simToLadderTier}
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-500">층수:</span>
                      <input
                        type="text"
                        value={simToFloor}
                        onChange={e => handleChangeToFloor(e.target.value)}
                        placeholder="예: 10"
                        className="w-12 px-1.5 py-0.5 text-center font-bold rounded border border-gray-300 bg-white outline-none focus:border-purple-500"
                      />
                      <span className="text-[11px] text-gray-600">층</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                    <span className="text-[11px] text-gray-500">
                      {parseInt(String(simToFloor || '').replace(/[^0-9]/g, ''), 10) >= 2
                        ? `${simLadderTonnage}톤 × ${simToFloor}층 표준단가 자동산출`
                        : '2층 이상 입력 시 차량톤수·층수별 자동산출'}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">+</span>
                      <input
                        type="text"
                        disabled={!useToLadder}
                        value={simToLadderCost === 0 ? '' : simToLadderCost.toLocaleString()}
                        placeholder="0"
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9]/g, '')
                          setSimToLadderCost(raw ? Number(raw) : 0)
                        }}
                        className="w-24 px-2 py-1 text-xs font-black text-right rounded border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400 outline-none"
                      />
                      <span className="text-gray-600 font-bold">원</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 추가된 기타 장비 목록 */}
              {extraEquipments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {extraEquipments.map(eq => (
                    <div
                      key={eq.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                        eq.checked && equipmentApplyMode !== 'NONE'
                          ? 'bg-white border-purple-300'
                          : 'bg-white/70 border-gray-200'
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-900 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={eq.checked}
                          onChange={() => handleToggleExtraEquipment(eq.id)}
                          className="w-4 h-4 text-purple-600 rounded shrink-0"
                        />
                        <span className="truncate">{eq.name}</span>
                      </label>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-gray-400">+</span>
                        <input
                          type="text"
                          disabled={!eq.checked}
                          value={eq.cost === 0 ? '' : eq.cost.toLocaleString()}
                          onChange={e => {
                            const raw = e.target.value.replace(/[^0-9]/g, '')
                            handleChangeExtraEquipmentCost(eq.id, raw ? Number(raw) : 0)
                          }}
                          className="w-24 px-2 py-1 text-xs font-bold text-right rounded border border-gray-300 bg-white disabled:bg-gray-100 outline-none"
                        />
                        <span className="text-gray-600">원</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraEquipment(eq.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="장비 항목 삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 기타 장비 빠른 추가 & 직접 입력 바 */}
              <div className="p-2.5 bg-white rounded-xl border border-dashed border-purple-200 space-y-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-gray-600">빠른 장비 추가:</span>
                  {[
                    { name: '스카이차 장비', cost: 250000 },
                    { name: '곤돌라 / 윈치 장비', cost: 200000 },
                    { name: '엘리베이터 사용료', cost: 50000 },
                    { name: '중량물 특수운반 장비', cost: 150000 },
                  ].map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleAddExtraEquipment(preset.name, preset.cost)}
                      className="px-2 py-0.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-[11px] transition-colors"
                    >
                      + {preset.name} ({(preset.cost / 10000).toFixed(0)}만)
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    placeholder="기타 장비명 직접 입력 (예: 출발지 스카이차, 크레인 등)"
                    value={newEquipName}
                    onChange={e => setNewEquipName(e.target.value)}
                    className="flex-1 w-full sm:w-auto px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white outline-none focus:border-purple-500 font-medium"
                  />
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="장비 금액"
                      value={newEquipCost === 0 ? '' : newEquipCost.toLocaleString()}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9]/g, '')
                        setNewEquipCost(raw ? Number(raw) : 0)
                      }}
                      className="w-28 px-2.5 py-1.5 text-xs font-bold text-right rounded-lg border border-gray-300 bg-white outline-none focus:border-purple-500"
                    />
                    <span className="text-gray-600">원</span>
                    <button
                      type="button"
                      onClick={() => handleAddExtraEquipment()}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1"
                    >
                      <Plus size={14} />
                      <span>장비 추가</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 고정 액션 바 */}
        <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* 금액 상세 요약 */}
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-medium">기준운임:</span>
              <strong className="text-gray-900">{baseCost.toLocaleString()}원</strong>
            </div>
            {finalDistanceSurcharge > 0 && (
              <div className="flex items-center gap-1 text-sky-700">
                <span className="font-medium">+ 거리·경유:</span>
                <strong className="font-black">+{finalDistanceSurcharge.toLocaleString()}원</strong>
              </div>
            )}
            {effectiveSeasonCost !== 0 && (
              <div
                className={`flex items-center gap-1 ${
                  effectiveSeasonCost > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                <span className="font-medium">
                  {effectiveSeasonCost > 0 ? '+ 시즌할증' : '- 비수기할인'}:
                </span>
                <strong className="font-black">
                  {effectiveSeasonCost > 0 ? '+' : ''}
                  {effectiveSeasonCost.toLocaleString()}원
                </strong>
              </div>
            )}
            {totalCalendarSurcharge > 0 && (
              <div className="flex items-center gap-1 text-indigo-700">
                <span className="font-medium">+ 캘린더:</span>
                <strong className="font-black">+{totalCalendarSurcharge.toLocaleString()}원</strong>
              </div>
            )}
            {effectiveEquipmentCost > 0 && (
              <div className="flex items-center gap-1 text-purple-700">
                <span className="font-medium">
                  + 장비비({equipmentApplyMode === 'MOVING_COST' ? '기본합산' : '가산별도'}):
                </span>
                <strong className="font-black">+{effectiveEquipmentCost.toLocaleString()}원</strong>
              </div>
            )}
            <div className="flex items-center gap-1 text-sm sm:text-base font-black text-blue-700 ml-auto sm:ml-2">
              <span className="text-xs text-gray-500 font-normal">총 산출합계:</span>
              <span>{totalSimulatedQuote.toLocaleString()} 원</span>
            </div>
          </div>

          {/* 적용 버튼 */}
          <div className="flex items-center gap-2 shrink-0 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleApplyToEstimate}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm shadow-blue-300 transition-all active:scale-95"
            >
              <CheckCircle2 size={16} />
              <span>
                {equipmentApplyMode === 'ADDITIONAL_COST' && effectiveEquipmentCost > 0
                  ? `견적서 적용 (기본 ${movingCostToApply.toLocaleString()} + 가산장비 ${effectiveEquipmentCost.toLocaleString()}원)`
                  : `견적서 기본 이사비용에 적용 (${movingCostToApply.toLocaleString()}원)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
