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

/**
 * 층수 문자열과 톤수 기준 사다리차 표준 요금 산출
 */
export function computeLadderFeeFromFares(
  floorStr: string,
  tonnage: string | number,
  ladderFares: LadderFareItem[] = []
): { cost: number; tier: string; floorNum: number } {
  const floorNum = parseInt(String(floorStr || '').replace(/[^0-9]/g, ''), 10) || 0
  if (floorNum <= 1) return { cost: 0, tier: '', floorNum }

  const ton = typeof tonnage === 'number' ? tonnage : parseFloat(String(tonnage)) || 5

  if (ladderFares.length > 0) {
    const matched =
      ladderFares.find(f => floorNum >= f.minFloor && floorNum <= f.maxFloor) ||
      ladderFares.find(f => floorNum <= f.maxFloor) ||
      ladderFares[ladderFares.length - 1]

    if (matched) {
      let cost = matched.cost5Ton
      if (ton <= 1.0) cost = matched.cost1Ton
      else if (ton <= 2.5) cost = matched.cost2_5Ton
      else if (ton <= 5.0) cost = matched.cost5Ton
      else if (ton <= 6.0) cost = matched.cost6Ton
      else if (ton <= 7.5) cost = matched.cost7_5Ton
      else cost = matched.cost10Ton

      return { cost, tier: matched.floorName, floorNum }
    }
  }

  // DB 운임표 미로드 시 표준 사다리차 기본 가이드 폴백
  const base5Ton =
    floorNum <= 5
      ? 120000
      : floorNum <= 7
        ? 130000
        : floorNum <= 10
          ? 150000
          : floorNum <= 13
            ? 170000
            : floorNum <= 16
              ? 190000
              : floorNum <= 20
                ? 220000
                : 250000
  const mult = ton <= 1 ? 0.75 : ton <= 2.5 ? 0.85 : ton <= 5 ? 1.0 : ton <= 6 ? 1.15 : ton <= 7.5 ? 1.3 : 1.6
  return {
    cost: Math.round((base5Ton * mult) / 10000) * 10000,
    tier: `${floorNum}층 기준`,
    floorNum,
  }
}

