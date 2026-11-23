// 소형이사 견적 산정 엔진 (서버 전용으로 사용)
// 기존 컨택이사 기준: TONNAGE_DISTANCE_FARE_TABLE(차량 기본료/거리 할증) + CostStandardMaster(인건비)를 재사용한다.
import {
  TONNAGE_DISTANCE_FARE_TABLE,
  calculateTonnageDistanceFare,
  type TonnageTierKey,
} from '@/lib/distanceFare'
import { SMALL_ITEM_MAP, fixVehicleLabel, resolveSmallMoveItem, type SmallItem, type SmallMoveItemEntry } from './catalog'

export interface SideInfo {
  floor: number // 층수 (지하는 0 이하 -> 1로 처리)
  elevator: boolean // 이용 가능한 엘리베이터 유무
  ladder: boolean // 사다리차 필요
  parkingFar: boolean // 차량 진입 불가/주차 후 도보 30m 초과
}

export interface QuoteInput {
  items: SmallMoveItemEntry[]
  from: SideInfo
  to: SideInfo
  distanceKm: number
  movingDate?: string | null // YYYY-MM-DD
  packingService: boolean
  airconCount: number
  laborCostPerPerson?: number // CostStandardMaster.maleLaborCost
  syncedMap?: Record<string, SmallItem>
}

export interface QuoteResult {
  totalCbm: number
  tierKey: TonnageTierKey
  vehicleLabel: string
  min: number
  max: number
  center: number
  consultRequired: boolean // 상담/현장확인 필요 (대형 물량, 피아노 등)
  consultReasons: string[]
  breakdown: { label: string; amount: number }[]
}

// 조정 가능한 상수 (추후 관리자 설정 화면으로 이동 예정)
const CBM_BUFFER_RATE = 0.1 // 미체크 소품 여유분 10%
const TIER_LIMITS: { key: TonnageTierKey; maxCbm: number; helpers: number; floorMult: number; ladderFee: number }[] = [
  { key: '1', maxCbm: 5.5, helpers: 1, floorMult: 1.0, ladderFee: 80000 },
  { key: '2.5', maxCbm: 12, helpers: 2, floorMult: 1.5, ladderFee: 110000 },
  { key: '5', maxCbm: 20, helpers: 3, floorMult: 2.0, ladderFee: 150000 },
]
const STAIR_FEE_PER_FLOOR = 10000 // 엘리베이터 없는 3층부터 층당(1톤 기준)
const PARKING_FAR_FEE = 20000
const WEEKEND_FEE = 30000
const END_OF_MONTH_FRIDAY_FEE = 20000
const PACKING_SERVICE_FEE = 80000
const RANGE_LOW = 0.93
const RANGE_HIGH = 1.12

function roundWon(n: number) {
  return Math.round(n / 1000) * 1000
}

function sideFee(side: SideInfo, tier: (typeof TIER_LIMITS)[number]) {
  if (side.ladder) return tier.ladderFee
  const floor = Math.max(1, side.floor || 1)
  if (!side.elevator && floor >= 3) {
    return Math.round(STAIR_FEE_PER_FLOOR * tier.floorMult * (floor - 2))
  }
  return 0
}

export function calculateSmallMoveQuote(input: QuoteInput): QuoteResult {
  const consultReasons: string[] = []

  let cbm = 0
  let hasPiano = false
  const map = input.syncedMap ?? SMALL_ITEM_MAP
  for (const it of input.items) {
    const resolved = resolveSmallMoveItem(it, map)
    const qty = Math.max(0, Math.min(resolved.max, Math.floor(it.qty || 0)))
    if (qty <= 0 || (!map[it.id] && it.cbm === undefined)) continue
    cbm += resolved.effectiveUnitCbm * qty
    if (it.id === 'piano' || resolved.name === '피아노') hasPiano = true
  }
  const totalCbm = Math.round(cbm * (1 + CBM_BUFFER_RATE) * 10) / 10

  const tier =
    TIER_LIMITS.find((t) => totalCbm <= t.maxCbm) || TIER_LIMITS[TIER_LIMITS.length - 1]
  const rule = { ...TONNAGE_DISTANCE_FARE_TABLE[tier.key], label: fixVehicleLabel(TONNAGE_DISTANCE_FARE_TABLE[tier.key].label) }

  if (totalCbm > TIER_LIMITS[TIER_LIMITS.length - 1].maxCbm) {
    consultReasons.push('물량이 많아 5톤 차량 1대로 부족할 수 있어 상담이 필요합니다.')
  }
  if (hasPiano) consultReasons.push('피아노는 전문 인력 투입이 필요해 별도 상담이 필요합니다.')
  if (input.distanceKm >= 100) consultReasons.push('장거리 이사로 현장 확인 후 확정됩니다.')
  if (totalCbm <= 0) consultReasons.push('선택된 물품이 없어 최소 요금으로 산정되었습니다.')

  const labor = input.laborCostPerPerson && input.laborCostPerPerson > 0 ? input.laborCostPerPerson : 190000
  const breakdown: { label: string; amount: number }[] = []

  breakdown.push({ label: `${rule.label} 기본 운임`, amount: rule.vehicleBaseFee })
  breakdown.push({ label: `작업 인원 ${tier.helpers}명`, amount: labor * tier.helpers })

  const dist = calculateTonnageDistanceFare({
    tierKey: tier.key,
    distanceKm: input.distanceKm,
  })
  if (dist.pureDistanceExtraCost > 0) {
    breakdown.push({ label: `거리 할증 (${Math.round(input.distanceKm)}km)`, amount: dist.pureDistanceExtraCost })
  }

  const fromFee = sideFee(input.from, tier)
  const toFee = sideFee(input.to, tier)
  if (fromFee > 0) breakdown.push({ label: input.from.ladder ? '출발지 사다리차' : '출발지 계단 작업', amount: fromFee })
  if (toFee > 0) breakdown.push({ label: input.to.ladder ? '도착지 사다리차' : '도착지 계단 작업', amount: toFee })
  const parking = (input.from.parkingFar ? 1 : 0) + (input.to.parkingFar ? 1 : 0)
  if (parking > 0) breakdown.push({ label: '차량 진입/도보 운반 할증', amount: PARKING_FAR_FEE * parking })

  if (input.movingDate && /^\d{4}-\d{2}-\d{2}$/.test(input.movingDate)) {
    const d = new Date(input.movingDate + 'T00:00:00Z')
    const day = d.getUTCDay()
    const dom = d.getUTCDate()
    if (day === 0 || day === 6) {
      breakdown.push({ label: '주말 할증', amount: WEEKEND_FEE })
    } else if (day === 5 || dom >= 25 || dom <= 2) {
      breakdown.push({ label: '금요일/월말·월초 할증', amount: END_OF_MONTH_FRIDAY_FEE })
    }
  }

  if (input.packingService) breakdown.push({ label: '포장 서비스(반포장)', amount: PACKING_SERVICE_FEE })
  // 에어컨은 고객 탈거 후 운송만 가능하므로 별도 탈거·설치 비용을 산정하지 않는다.

  const center = roundWon(breakdown.reduce((s, b) => s + b.amount, 0))
  return {
    totalCbm,
    tierKey: tier.key,
    vehicleLabel: rule.label,
    center,
    min: roundWon(center * RANGE_LOW),
    max: roundWon(center * RANGE_HIGH),
    consultRequired: consultReasons.length > 0,
    consultReasons,
    breakdown,
  }
}
