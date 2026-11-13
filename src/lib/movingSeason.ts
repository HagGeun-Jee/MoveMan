import type { LadderFareItem } from '@/types/ladder'

export type SeasonOptionKey =
  | 'NONE'
  | 'SUPER_PEAK'
  | 'PEAK'
  | 'SEMI_PEAK'
  | 'OFF_LIGHT'
  | 'OFF_DEEP'
  | 'CUSTOM'

export interface SeasonOptionItem {
  key: SeasonOptionKey
  label: string
  shortLabel: string
  periodDesc: string
  defaultAmount: number // 양수(+): 성수기 할증, 음수(-): 비수기 할인
  tone: 'gray' | 'rose' | 'amber' | 'indigo' | 'teal' | 'emerald' | 'purple'
}

export const SEASON_OPTIONS: SeasonOptionItem[] = [
  {
    key: 'NONE',
    label: '평수기 (미적용)',
    shortLabel: '평수기(0원)',
    periodDesc: '시즌 추가/할인 없음',
    defaultAmount: 0,
    tone: 'gray',
  },
  {
    key: 'SUPER_PEAK',
    label: '극성수기 할증',
    shortLabel: '극성수기',
    periodDesc: '2월 말~3월 초 집중철 · 입주장',
    defaultAmount: 200000,
    tone: 'rose',
  },
  {
    key: 'PEAK',
    label: '성수기 할증',
    shortLabel: '봄·가을 성수기',
    periodDesc: '봄(2.15~4월) · 가을(9~10월)',
    defaultAmount: 100000,
    tone: 'amber',
  },
  {
    key: 'SEMI_PEAK',
    label: '준성수기 할증',
    shortLabel: '준성수기',
    periodDesc: '5~6월 · 11월 선호 시즌',
    defaultAmount: 50000,
    tone: 'indigo',
  },
  {
    key: 'OFF_LIGHT',
    label: '비수기 평일 특가',
    shortLabel: '비수기 특가',
    periodDesc: '겨울(12~2월 초) · 평일 한산기',
    defaultAmount: -50000,
    tone: 'teal',
  },
  {
    key: 'OFF_DEEP',
    label: '비수기 특별 할인',
    shortLabel: '여름·혹한 비수기',
    periodDesc: '여름 장마·폭염(7~8월) 비수기',
    defaultAmount: -100000,
    tone: 'emerald',
  },
]

export interface DetectedSeasonInfo {
  recommendedKey: SeasonOptionKey
  seasonTitle: string
  periodDesc: string
  defaultAmount: number
  month: number
  day: number
}

/**
 * 이사일자(Date 또는 'YYYY-MM-DD')로부터 성수기/준성수기/비수기 추천 옵션을 판정
 */
export function detectSeasonByMovingDate(dateVal?: Date | string | null): DetectedSeasonInfo | null {
  if (!dateVal) return null

  let month = 0
  let day = 0

  if (typeof dateVal === 'string') {
    const m = dateVal.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (m) {
      month = Number(m[2])
      day = Number(m[3])
    } else {
      const d = new Date(dateVal)
      if (isNaN(d.getTime())) return null
      month = d.getMonth() + 1
      day = d.getDate()
    }
  } else if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return null
    month = dateVal.getMonth() + 1
    day = dateVal.getDate()
  }

  if (!month || !day) return null

  // 1) 신학기 집중 극성수기: 2월 20일 ~ 3월 5일
  if ((month === 2 && day >= 20) || (month === 3 && day <= 5)) {
    return {
      recommendedKey: 'SUPER_PEAK',
      seasonTitle: '신학기 집중 극성수기 (2월 말~3월 초)',
      periodDesc: '연중 이사 수요가 가장 집중되는 극성수기 구간입니다.',
      defaultAmount: 200000,
      month,
      day,
    }
  }

  // 2) 봄 이사 성수기: 2월 15일 ~ 4월 30일
  if ((month === 2 && day >= 15) || month === 3 || month === 4) {
    return {
      recommendedKey: 'PEAK',
      seasonTitle: '봄 이사 성수기 (2월 중순~4월)',
      periodDesc: '봄철 신학기·결혼·입주 수요가 높은 성수기 구간입니다.',
      defaultAmount: 100000,
      month,
      day,
    }
  }

  // 3) 가을 이사 성수기: 9월 ~ 10월
  if (month === 9 || month === 10) {
    return {
      recommendedKey: 'PEAK',
      seasonTitle: '가을 이사 성수기 (9월~10월)',
      periodDesc: '가을철 결혼·이주 수요가 집중되는 성수기 구간입니다.',
      defaultAmount: 100000,
      month,
      day,
    }
  }

  // 4) 준성수기: 5월 ~ 6월, 11월
  if (month === 5 || month === 6 || month === 11) {
    return {
      recommendedKey: 'SEMI_PEAK',
      seasonTitle: '준성수기 · 선호 시즌 (5~6월 / 11월)',
      periodDesc: '기후가 양호하여 이사 선호도가 꾸준한 준성수기 구간입니다.',
      defaultAmount: 50000,
      month,
      day,
    }
  }

  // 5) 여름 장마·폭염 비수기: 7월 ~ 8월
  if (month === 7 || month === 8) {
    return {
      recommendedKey: 'OFF_DEEP',
      seasonTitle: '여름 장마·혹서기 비수기 (7월~8월)',
      periodDesc: '장마·폭염으로 수요가 완만한 여름 비수기 할인 구간입니다.',
      defaultAmount: -100000,
      month,
      day,
    }
  }

  // 6) 겨울철 한산기 비수기: 12월 ~ 2월 14일
  return {
    recommendedKey: 'OFF_LIGHT',
    seasonTitle: '겨울철 한산기 비수기 (12월~2월 초)',
    periodDesc: '동절기 한산 시즌으로 비수기 특가 옵션을 적용할 수 있습니다.',
    defaultAmount: -50000,
    month,
    day,
  }
}

// 사다리차 기준정보 미로드/오프라인 대비 표준 사다리차 운임 폴백 테이블 (LadderTruckMaster 동일 단가)
export const STANDARD_LADDER_FARES_FALLBACK: Omit<LadderFareItem, 'id'>[] = [
  { floorName: '2~5층', minFloor: 2, maxFloor: 5, cost1Ton: 120000, cost2_5Ton: 130000, cost5Ton: 150000, cost6Ton: 180000, cost7_5Ton: 210000, cost10Ton: 240000, order: 1, note: '저층 기본요금' },
  { floorName: '6~7층', minFloor: 6, maxFloor: 7, cost1Ton: 130000, cost2_5Ton: 140000, cost5Ton: 160000, cost6Ton: 190000, cost7_5Ton: 220000, cost10Ton: 250000, order: 2, note: '' },
  { floorName: '8~9층', minFloor: 8, maxFloor: 9, cost1Ton: 140000, cost2_5Ton: 150000, cost5Ton: 170000, cost6Ton: 200000, cost7_5Ton: 230000, cost10Ton: 260000, order: 3, note: '' },
  { floorName: '10~11층', minFloor: 10, maxFloor: 11, cost1Ton: 150000, cost2_5Ton: 160000, cost5Ton: 180000, cost6Ton: 210000, cost7_5Ton: 240000, cost10Ton: 270000, order: 4, note: '' },
  { floorName: '12~13층', minFloor: 12, maxFloor: 13, cost1Ton: 160000, cost2_5Ton: 170000, cost5Ton: 190000, cost6Ton: 220000, cost7_5Ton: 250000, cost10Ton: 280000, order: 5, note: '' },
  { floorName: '14층', minFloor: 14, maxFloor: 14, cost1Ton: 170000, cost2_5Ton: 180000, cost5Ton: 200000, cost6Ton: 230000, cost7_5Ton: 260000, cost10Ton: 290000, order: 6, note: '38m 장비' },
  { floorName: '15층', minFloor: 15, maxFloor: 15, cost1Ton: 180000, cost2_5Ton: 190000, cost5Ton: 210000, cost6Ton: 240000, cost7_5Ton: 270000, cost10Ton: 300000, order: 7, note: '' },
  { floorName: '16층', minFloor: 16, maxFloor: 16, cost1Ton: 190000, cost2_5Ton: 200000, cost5Ton: 220000, cost6Ton: 250000, cost7_5Ton: 280000, cost10Ton: 310000, order: 8, note: '45m 장비' },
  { floorName: '17층', minFloor: 17, maxFloor: 17, cost1Ton: 200000, cost2_5Ton: 210000, cost5Ton: 230000, cost6Ton: 260000, cost7_5Ton: 290000, cost10Ton: 320000, order: 9, note: '' },
  { floorName: '18층', minFloor: 18, maxFloor: 18, cost1Ton: 220000, cost2_5Ton: 230000, cost5Ton: 250000, cost6Ton: 280000, cost7_5Ton: 310000, cost10Ton: 340000, order: 10, note: '' },
  { floorName: '19층', minFloor: 19, maxFloor: 19, cost1Ton: 230000, cost2_5Ton: 240000, cost5Ton: 260000, cost6Ton: 290000, cost7_5Ton: 320000, cost10Ton: 350000, order: 11, note: '' },
  { floorName: '20층', minFloor: 20, maxFloor: 20, cost1Ton: 250000, cost2_5Ton: 260000, cost5Ton: 280000, cost6Ton: 310000, cost7_5Ton: 340000, cost10Ton: 370000, order: 12, note: '54m 고층장비' },
  { floorName: '21층', minFloor: 21, maxFloor: 21, cost1Ton: 280000, cost2_5Ton: 290000, cost5Ton: 310000, cost6Ton: 340000, cost7_5Ton: 370000, cost10Ton: 400000, order: 13, note: '고층 특수작업' },
  { floorName: '22층', minFloor: 22, maxFloor: 22, cost1Ton: 310000, cost2_5Ton: 320000, cost5Ton: 340000, cost6Ton: 370000, cost7_5Ton: 400000, cost10Ton: 430000, order: 14, note: '고층 특수작업' },
  { floorName: '23층', minFloor: 23, maxFloor: 23, cost1Ton: 340000, cost2_5Ton: 350000, cost5Ton: 370000, cost6Ton: 400000, cost7_5Ton: 430000, cost10Ton: 460000, order: 15, note: '65m 초고층장비' },
  { floorName: '24층', minFloor: 24, maxFloor: 24, cost1Ton: 370000, cost2_5Ton: 380000, cost5Ton: 400000, cost6Ton: 430000, cost7_5Ton: 460000, cost10Ton: 490000, order: 16, note: '초고층' },
  { floorName: '25층', minFloor: 25, maxFloor: 25, cost1Ton: 400000, cost2_5Ton: 420000, cost5Ton: 440000, cost6Ton: 480000, cost7_5Ton: 520000, cost10Ton: 550000, order: 17, note: '초고층' },
  { floorName: '26층 이상', minFloor: 26, maxFloor: 99, cost1Ton: 450000, cost2_5Ton: 480000, cost5Ton: 500000, cost6Ton: 550000, cost7_5Ton: 600000, cost10Ton: 650000, order: 18, note: '현장 협의 / 70m급' },
]

/**
 * 층수 문자열과 차량 톤수 기준 사다리차 표준 요금 산출
 * - 1톤 / 2.5톤 / 5톤 / 6톤 / 7.5톤 / 10톤 × 2~26층+ 전 구간 정밀 매칭
 */
export function computeLadderFeeFromFares(
  floorStr: string,
  tonnage: string | number,
  ladderFares: LadderFareItem[] = []
): { cost: number; tier: string; floorNum: number } {
  const raw = String(floorStr || '').trim()
  if (!raw || /^(b|지하|-)/i.test(raw)) {
    return { cost: 0, tier: '', floorNum: 0 }
  }

  const floorNum = parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0
  if (floorNum <= 1) return { cost: 0, tier: '', floorNum }

  const ton = typeof tonnage === 'number' ? tonnage : parseFloat(String(tonnage)) || 5
  const table: Omit<LadderFareItem, 'id'>[] =
    ladderFares && ladderFares.length > 0 ? ladderFares : STANDARD_LADDER_FARES_FALLBACK

  const matched =
    table.find(f => floorNum >= f.minFloor && floorNum <= f.maxFloor) ||
    table.find(f => floorNum <= f.maxFloor) ||
    table[table.length - 1]

  if (!matched) return { cost: 0, tier: '', floorNum }

  let cost = matched.cost5Ton
  if (ton <= 1.5) cost = matched.cost1Ton
  else if (ton <= 3.5) cost = matched.cost2_5Ton
  else if (ton <= 5.4) cost = matched.cost5Ton
  else if (ton <= 6.5) cost = matched.cost6Ton
  else if (ton <= 8.5) cost = matched.cost7_5Ton
  else cost = matched.cost10Ton

  return { cost, tier: matched.floorName, floorNum }
}

