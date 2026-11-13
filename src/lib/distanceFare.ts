// 차량 톤수별 기본 운임 및 초과 거리(km) 구간별 체감 할증 단가표 및 산출 유틸리티

export type TonnageTierKey = '1' | '2.5' | '5' | '6' | '7.5' | '10'

export interface TonnageDistanceFareRule {
  key: TonnageTierKey
  label: string
  standardWorkers: string
  baseDistanceKm: number // 기본 포함 거리 (1톤 20km, 2.5톤 이상 25km)
  vehicleBaseFee: number // 순수 차량 고정 기본료 (인건비 제외 차량분)
  shortExtraRate: number // 근거리 초과 할증 (기본거리 초과 ~ 100km 이하 구간, 원/km)
  longExtraRate: number // 장거리 초과 할증 (101km 이상 구간, 원/km)
  ultraLongDistanceKm: number // 초장거리 기준 거리 (기본 250km)
  ultraLongSurcharge: number // 250km 이상 초장거리 야간작업/복귀 수당
  ultraLongNote: string
}

export const TONNAGE_DISTANCE_FARE_TABLE: Record<TonnageTierKey, TonnageDistanceFareRule> = {
  '1': {
    key: '1',
    label: '1톤 탑차',
    standardWorkers: '남 1~2',
    baseDistanceKm: 20,
    vehicleBaseFee: 120000,
    shortExtraRate: 1000,
    longExtraRate: 900,
    ultraLongDistanceKm: 250,
    ultraLongSurcharge: 0,
    ultraLongNote: '당일 복귀 가능 (톨비 별도)'
  },
  '2.5': {
    key: '2.5',
    label: '2.5톤 탑차',
    standardWorkers: '남2 / 여1',
    baseDistanceKm: 25,
    vehicleBaseFee: 220000,
    shortExtraRate: 1400,
    longExtraRate: 1200,
    ultraLongDistanceKm: 250,
    ultraLongSurcharge: 100000,
    ultraLongNote: '작업자 식대/야간수당 +10만 원'
  },
  '5': {
    key: '5',
    label: '5톤 탑차',
    standardWorkers: '남3 / 여1',
    baseDistanceKm: 25,
    vehicleBaseFee: 350000,
    shortExtraRate: 1800,
    longExtraRate: 1500,
    ultraLongDistanceKm: 250,
    ultraLongSurcharge: 160000,
    ultraLongNote: '야간작업/복귀 수당 +16만 원 (4인 팀 인당 4만 원)'
  },
  '6': {
    key: '6',
    label: '5톤 + 1톤 (6톤)',
    standardWorkers: '남3~4 / 여1',
    baseDistanceKm: 25,
    vehicleBaseFee: 470000,
    shortExtraRate: 2600,
    longExtraRate: 2200,
    ultraLongDistanceKm: 250,
    ultraLongSurcharge: 200000,
    ultraLongNote: '차량 2대분 톨비 + 장거리 수당 (+20만 원, 4~5인 팀)'
  },
  '7.5': {
    key: '7.5',
    label: '5톤 + 2.5톤 (7.5톤)',
    standardWorkers: '남4~5 / 여1',
    baseDistanceKm: 25,
    vehicleBaseFee: 570000,
    shortExtraRate: 3000,
    longExtraRate: 2600,
    ultraLongDistanceKm: 250,
    ultraLongSurcharge: 240000,
    ultraLongNote: '차량 2대분 톨비 + 장거리 수당 (+24만 원, 6인 팀)'
  },
  '10': {
    key: '10',
    label: '5톤 2대 (10톤)',
    standardWorkers: '남5~6 / 여2',
    baseDistanceKm: 25,
    vehicleBaseFee: 700000,
    shortExtraRate: 3600,
    longExtraRate: 3000,
    ultraLongDistanceKm: 250,
    ultraLongSurcharge: 320000,
    ultraLongNote: '차량 2대분 톨비 + 장거리 수당 (+32만 원, 8인 팀)'
  }
}

export const TONNAGE_DISTANCE_FARE_LIST: TonnageDistanceFareRule[] = [
  TONNAGE_DISTANCE_FARE_TABLE['1'],
  TONNAGE_DISTANCE_FARE_TABLE['2.5'],
  TONNAGE_DISTANCE_FARE_TABLE['5'],
  TONNAGE_DISTANCE_FARE_TABLE['6'],
  TONNAGE_DISTANCE_FARE_TABLE['7.5'],
  TONNAGE_DISTANCE_FARE_TABLE['10']
]

export interface BaseTruckSpec {
  id: string
  name: string
  defaultCost: number
  maxCbm: number
  tonnage: 1 | 2.5 | 5
}

export interface CbmTierBounds {
  c1: number
  c25: number
  c5: number
  c6: number
  c75: number
  c10: number
}

export interface RecommendedVehicleEntry {
  id: string
  name: string
  cost: number
  count: number
  maxCbm: number
  tonnage: number
}

export interface OptimalVehiclePlan {
  tierKey: TonnageTierKey
  totalTonnage: number
  totalCount: number
  totalProvidedCbm: number
  vehicles: RecommendedVehicleEntry[]
  summaryDesc: string
  bounds: CbmTierBounds
}

function inferSingleVehicleTonnage(v: { name?: string; tonnage?: number }): number {
  if (v.tonnage && Number(v.tonnage) > 0) return Number(v.tonnage)
  const name = v.name || ''
  if (name.includes('10톤')) return 10
  if (name.includes('7.5톤')) return 7.5
  if (name.includes('6톤')) return 6
  if (name.includes('5톤')) return 5
  if (name.includes('2.5톤')) return 2.5
  if (name.includes('1톤') && !name.includes('11톤')) return 1
  return 0
}

/**
 * 차량 기준정보(standardVehicles)에서 1톤, 2.5톤, 5톤 대표 스펙 및 구간 경계값 추출
 */
export function extractBaseTruckSpecs(standardVehicles?: any[]): {
  spec1: BaseTruckSpec
  spec25: BaseTruckSpec
  spec5: BaseTruckSpec
  bounds: CbmTierBounds
} {
  const list = Array.isArray(standardVehicles) ? standardVehicles : []

  const pickSpec = (
    targetTon: 1 | 2.5 | 5,
    fallback: BaseTruckSpec
  ): BaseTruckSpec => {
    const candidates = list.filter(v => {
      if (!v || (Number(v.maxCbm) || 0) <= 0) return false
      if (v.status && v.status !== 'ACTIVE') return false
      const ton = inferSingleVehicleTonnage(v)
      return Math.abs(ton - targetTon) < 0.1
    })
    if (candidates.length === 0) return fallback

    // STANDARD(표준 제원) 우선, 그 다음 이름에 해당 톤수가 명시된 항목 우선
    const preferred =
      candidates.find(v => v.ownership === 'STANDARD') ||
      candidates.find(v => (v.name || '').includes(`${targetTon}톤`)) ||
      candidates[0]

    return {
      id: preferred.id || fallback.id,
      name: preferred.name || fallback.name,
      defaultCost: Number(preferred.defaultCost ?? preferred.cost) || fallback.defaultCost,
      maxCbm: Number(preferred.maxCbm) || fallback.maxCbm,
      tonnage: targetTon,
    }
  }

  const spec1 = pickSpec(1, {
    id: 'std_vehicle_1t',
    name: '1톤 탑차',
    defaultCost: 150000,
    maxCbm: 7,
    tonnage: 1,
  })
  const spec25 = pickSpec(2.5, {
    id: 'std_vehicle_2_5t',
    name: '2.5톤 탑차',
    defaultCost: 250000,
    maxCbm: 15,
    tonnage: 2.5,
  })
  const spec5 = pickSpec(5, {
    id: 'std_vehicle_5t',
    name: '5톤 탑차',
    defaultCost: 400000,
    maxCbm: 31,
    tonnage: 5,
  })

  const c1 = spec1.maxCbm
  const c25 = Math.max(c1 + 1, spec25.maxCbm)
  const c5 = Math.max(c25 + 1, spec5.maxCbm)
  const c6 = Math.round((c5 + c1) * 100) / 100
  const c75 = Math.round((c5 + c25) * 100) / 100
  const c10 = Math.round(c5 * 2 * 100) / 100

  return {
    spec1,
    spec25,
    spec5,
    bounds: { c1, c25, c5, c6, c75, c10 },
  }
}

/**
 * 필요 적재 CBM(requiredCbm)에 따른 최적 차량 조합 및 표준 톤수 티어 산출 (단일 기준)
 * - 최적 차량 추천, 원가기반 이사비용 산출, 이사비용 산출 시뮬레이터 모두 동일하게 사용
 */
export function computeOptimalVehiclePlan(
  requiredCbm: number,
  standardVehicles?: any[]
): OptimalVehiclePlan {
  const { spec1, spec25, spec5, bounds } = extractBaseTruckSpecs(standardVehicles)
  const cbm = Math.max(0, Number(requiredCbm) || 0)

  if (cbm <= 0) {
    return {
      tierKey: '5',
      totalTonnage: 5,
      totalCount: 1,
      totalProvidedCbm: 0,
      vehicles: [],
      summaryDesc: '',
      bounds,
    }
  }

  const makeEntry = (spec: BaseTruckSpec, count: number): RecommendedVehicleEntry => ({
    id: spec.id,
    name: spec.name,
    cost: spec.defaultCost,
    count,
    maxCbm: spec.maxCbm,
    tonnage: spec.tonnage,
  })

  let vehicles: RecommendedVehicleEntry[] = []
  let tierKey: TonnageTierKey = '5'

  if (cbm <= bounds.c1) {
    vehicles = [makeEntry(spec1, 1)]
    tierKey = '1'
  } else if (cbm <= bounds.c25) {
    vehicles = [makeEntry(spec25, 1)]
    tierKey = '2.5'
  } else if (cbm <= bounds.c5) {
    vehicles = [makeEntry(spec5, 1)]
    tierKey = '5'
  } else if (cbm <= bounds.c6) {
    vehicles = [makeEntry(spec5, 1), makeEntry(spec1, 1)]
    tierKey = '6'
  } else if (cbm <= bounds.c75) {
    vehicles = [makeEntry(spec5, 1), makeEntry(spec25, 1)]
    tierKey = '7.5'
  } else if (cbm <= bounds.c10) {
    vehicles = [makeEntry(spec5, 2)]
    tierKey = '10'
  } else {
    const fiveCount = Math.floor(cbm / bounds.c5)
    const rem = Math.round((cbm - fiveCount * bounds.c5) * 100) / 100
    if (rem <= 0.001) {
      vehicles = [makeEntry(spec5, Math.max(2, fiveCount))]
    } else if (rem <= bounds.c1) {
      vehicles = [makeEntry(spec5, fiveCount), makeEntry(spec1, 1)]
    } else if (rem <= bounds.c25) {
      vehicles = [makeEntry(spec5, fiveCount), makeEntry(spec25, 1)]
    } else {
      vehicles = [makeEntry(spec5, fiveCount + 1)]
    }
    tierKey = '10'
  }

  const totalCount = vehicles.reduce((sum, v) => sum + v.count, 0)
  const totalTonnage = vehicles.reduce((sum, v) => sum + v.tonnage * v.count, 0)
  const totalProvidedCbm =
    Math.round(vehicles.reduce((sum, v) => sum + v.maxCbm * v.count, 0) * 100) / 100
  const summaryDesc = vehicles
    .map(v => `${v.name} ${v.count}대(${Math.round(v.maxCbm * v.count * 10) / 10} CBM)`)
    .join(' + ')

  return {
    tierKey,
    totalTonnage,
    totalCount,
    totalProvidedCbm,
    vehicles,
    summaryDesc,
    bounds,
  }
}

/**
 * 투입 차량 배열 또는 CBM으로부터 가장 적합한 차량 규격 키(TonnageTierKey) 추출
 */
export function resolveTonnageTierKey(
  vehicles?: { name?: string; count?: number; tonnage?: number }[],
  totalCbm?: number,
  standardVehicles?: any[]
): TonnageTierKey {
  if (vehicles && vehicles.length > 0) {
    let totalTon = 0
    let totalCount = 0
    vehicles.forEach(v => {
      const cnt = Number(v.count) || 0
      if (cnt <= 0) return
      totalCount += cnt
      const detected = inferSingleVehicleTonnage(v)
      totalTon += (detected > 0 ? detected : 5) * cnt
    })

    if (totalCount > 0) {
      if (totalTon <= 1.5) return '1'
      if (totalTon <= 3.5) return '2.5'
      if (totalTon <= 5.4) return '5'
      if (totalTon <= 6.5) return '6'
      if (totalTon <= 8.5) return '7.5'
      return '10'
    }
  }

  if (totalCbm !== undefined && totalCbm > 0) {
    return computeOptimalVehiclePlan(totalCbm, standardVehicles).tierKey
  }

  return '5'
}

export interface DistanceFareCalculationResult {
  tierKey: TonnageTierKey
  rule: TonnageDistanceFareRule
  distanceKm: number
  baseDistanceKm: number
  extraDistanceKm: number
  shortExtraKm: number // 기본거리 초과 ~ 100km 이하 구간 거리
  shortExtraRate: number
  shortExtraCost: number
  longExtraKm: number // 100km 초과 구간 거리
  longExtraRate: number
  longExtraCost: number
  pureDistanceExtraCost: number // 순수 거리 할증 합계 (근거리 + 장거리)
  isUltraLong: boolean // 250km 이상 여부
  ultraLongSurcharge: number // 초장거리 야간/복귀 수당
  includeTollInExtra: boolean // 30km 초과 시외 톨비 합산 여부
  effectiveRoundToll: number // 적용된 왕복 톨게이트비 (차량 대수 반영)
  waypointCount: number // 경유 품목 수
  waypointFee: number // 경유 상·하차 수고비
  totalExtraCost: number // 최종 거리+초장거리+톨비+경유 합산액
}

/**
 * 톤수별·거리 구간별 체감 할증 및 초장거리/톨비/경유 통합 계산
 */
export function calculateTonnageDistanceFare(params: {
  tierKey: TonnageTierKey
  distanceKm: number
  customBaseDistanceKm?: number
  customShortRate?: number
  customLongRate?: number
  includeUltraLongSurcharge?: boolean
  customUltraLongSurcharge?: number
  includeTollWhenOver30Km?: boolean
  totalRoundTollFare?: number
  includeWaypointFee?: boolean
  waypointCount?: number
  customWaypointFee?: number
}): DistanceFareCalculationResult {
  const rule = TONNAGE_DISTANCE_FARE_TABLE[params.tierKey] || TONNAGE_DISTANCE_FARE_TABLE['5']
  const dist = Math.max(0, Math.round((Number(params.distanceKm) || 0) * 10) / 10)
  const baseKm = params.customBaseDistanceKm !== undefined ? params.customBaseDistanceKm : rule.baseDistanceKm
  const shortRate = params.customShortRate !== undefined ? params.customShortRate : rule.shortExtraRate
  const longRate = params.customLongRate !== undefined ? params.customLongRate : rule.longExtraRate

  const extraDistanceKm = Math.max(0, Math.round((dist - baseKm) * 10) / 10)

  // 1구간: 기본거리 초과 ~ 100km 이하
  const shortUpperBound = Math.max(baseKm, 100)
  const shortExtraKm = dist > baseKm
    ? Math.max(0, Math.round((Math.min(dist, shortUpperBound) - baseKm) * 10) / 10)
    : 0
  const shortExtraCost = Math.round(shortExtraKm * shortRate)

  // 2구간: 100km 초과 구간
  const longExtraKm = dist > shortUpperBound
    ? Math.max(0, Math.round((dist - shortUpperBound) * 10) / 10)
    : 0
  const longExtraCost = Math.round(longExtraKm * longRate)

  const pureDistanceExtraCost = shortExtraCost + longExtraCost

  // 250km 이상 초장거리 야간/복귀 수당
  const isUltraLong = dist >= rule.ultraLongDistanceKm
  const defaultUltra = isUltraLong ? rule.ultraLongSurcharge : 0
  const ultraLongSurcharge = (!isUltraLong || params.includeUltraLongSurcharge === false)
    ? 0
    : (params.customUltraLongSurcharge !== undefined ? params.customUltraLongSurcharge : defaultUltra)

  // 30km 초과 시외 구간 왕복 톨게이트비 합산 옵션 (30km 이내는 기본운임 흡수)
  const includeToll = Boolean(params.includeTollWhenOver30Km && dist > 30)
  const effectiveRoundToll = includeToll ? (Number(params.totalRoundTollFare) || 0) : 0

  // 경유 상하차 수고비
  const wpCount = Number(params.waypointCount) || 0
  const waypointFee = params.includeWaypointFee
    ? (params.customWaypointFee !== undefined ? params.customWaypointFee : (wpCount > 0 ? 70000 : 0))
    : 0

  const totalExtraCost = pureDistanceExtraCost + ultraLongSurcharge + effectiveRoundToll + waypointFee

  return {
    tierKey: rule.key,
    rule,
    distanceKm: dist,
    baseDistanceKm: baseKm,
    extraDistanceKm,
    shortExtraKm,
    shortExtraRate: shortRate,
    shortExtraCost,
    longExtraKm,
    longExtraRate: longRate,
    longExtraCost,
    pureDistanceExtraCost,
    isUltraLong,
    ultraLongSurcharge,
    includeTollInExtra: includeToll,
    effectiveRoundToll,
    waypointCount: wpCount,
    waypointFee,
    totalExtraCost
  }
}

/**
 * 한국도로공사 3종(5톤 대형 화물차) 통행료 보정 (1종 승용차 대비 약 1.45배, 100원 단위 반올림)
 */
export function adjustTollForHeavyTruck(carOneWayToll: number, isHeavyTruck: boolean = true): number {
  if (!carOneWayToll || carOneWayToll <= 0) return 0
  if (!isHeavyTruck) return carOneWayToll
  return Math.round((carOneWayToll * 1.45) / 100) * 100
}
