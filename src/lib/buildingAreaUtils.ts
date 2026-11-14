// 아파트·집합건물 동·호수 파싱, 층수 추론, 공급/전용 평형 환산 유틸리티

export interface AddressBjdMeta {
  bcode: string       // 10자리 법정동코드 (sigunguCd 5자리 + bjdongCd 5자리)
  platGbCd: string    // '0': 대지, '1': 산, '2': 블록
  bun: string         // 4자리 본번 (예: '0123')
  ji: string          // 4자리 부번 (예: '0004')
  buildingName?: string
  jibunAddress?: string
  roadAddress?: string
}

export interface DongCandidateSummary {
  dongNm: string
  pyeongType: number
  supplyAreaM2: number
  exclusiveAreaM2: number
}

export type ComplexTenureCategory = 'SALE' | 'RENTAL' | 'MIXED'

export interface UnitAreaInfo {
  pyeongType: number            // 대표 평형대 (예: 34 -> 34평형)
  supplyPyeong: number          // 공급평형 소수 1자리 (예: 33.9)
  exclusivePyeong: number       // 전용평수 소수 1자리 (예: 25.7)
  supplyAreaM2: number          // 공급면적 ㎡ (전용 + 주거공용)
  exclusiveAreaM2: number       // 전용면적 ㎡
  residentialCommonM2: number   // 주거공용면적 ㎡ (계단·복도·홀·벽체 등)
  otherCommonM2: number         // 기타공용면적 ㎡ (지하주차장·관리실·경로당 등)
  buildingName?: string         // 건물/단지명
  dongNm?: string               // 건축물대장 동 명칭 (예: 101동)
  hoNm?: string                 // 건축물대장 호 명칭 (예: 1502호)
  floor?: string                // 층수 (예: 15, B1)
  mainPurpsNm?: string          // 주용도 (예: 아파트, 오피스텔, 다세대주택)
  isEstimatedSupply?: boolean   // 대장에 공용면적이 분리 기재되지 않아 전용면적 기준으로 추정한 경우
  recommendedPresetId?: string  // 추천 평형별 표준 템플릿 ID
  // 공동주택 분양/임대 구분 및 복도 유형 (K-APT + 마이홈포털 + 건물명 교차 판별)
  tenureCategory?: ComplexTenureCategory // 'SALE': 분양단지, 'RENTAL': 임대단지, 'MIXED': 분양+임대 혼합단지
  tenureLabel?: string          // 예: '공공임대: 국민임대', '분양단지', '분양+임대 혼합단지'
  rentalSubType?: string        // 예: '국민임대', '행복주택', '영구임대', '장기전세'
  hallType?: string             // 예: '계단식', '복도식', '혼합식'
  totalHouseholds?: number      // 단지 총 세대수
}

export const M2_PER_PYEONG = 3.305785

/**
 * 호수 문자열(예: "1502호", "304", "B102호", "지하01호")에서 층수를 자동 추론
 */
export function inferFloorFromHo(rawHo?: string): string {
  if (!rawHo) return ''
  const trimmed = rawHo.trim()
  if (!trimmed) return ''

  // 지하 호실 패턴 (B01, B101, 지102, 지하201 등)
  const basementMatch = trimmed.match(/^(?:지하|지|B|b)\s*([0-9]{1,4})/)
  if (basementMatch) {
    const digits = basementMatch[1]
    if (digits.length >= 3) {
      const bFloor = parseInt(digits.slice(0, digits.length - 2), 10)
      return bFloor > 0 ? `B${bFloor}` : 'B1'
    }
    return 'B1'
  }

  const numMatch = trimmed.match(/([0-9]{2,5})/)
  if (!numMatch) return ''
  const digits = numMatch[1]
  const n = parseInt(digits, 10)
  if (!Number.isFinite(n) || n <= 0) return ''

  // 3~4자리 표준 호수 (예: 101 -> 1층, 1502 -> 15층, 3204 -> 32층)
  if (digits.length === 3 || digits.length === 4) {
    const floorPart = parseInt(digits.slice(0, digits.length - 2), 10)
    const unitPart = parseInt(digits.slice(-2), 10)
    if (floorPart >= 1 && floorPart <= 99 && unitPart >= 0 && unitPart <= 99) {
      return String(floorPart)
    }
  }

  // 5자리 초고층 또는 동결합 아닌 순수 호수 (예: 10102 -> 101층은 드물지만 방어 처리)
  if (digits.length === 5) {
    const floorPart = parseInt(digits.slice(0, 2), 10)
    if (floorPart >= 1 && floorPart <= 80) {
      return String(floorPart)
    }
  }

  return ''
}

/**
 * 건물 '동' 토큰이 법정동/행정동(예: 역삼동, 잠실동, 정자1동)이 아닌 실제 건물 동(예: 101동, A동, 가동, 본동)인지 판별
 */
function isLikelyBuildingDongToken(token: string): boolean {
  const clean = token.replace(/^제\s*/, '').trim()
  if (!clean) return false
  // 순수 숫자 또는 숫자+영문 (101, 1, 102A, A1 등)
  if (/^[0-9]{1,4}[A-Za-z가-힣]?$/.test(clean)) return true
  // 영문 동 (A, B, C, AB 등)
  if (/^[A-Za-z]{1,3}[0-9]{0,2}$/.test(clean)) return true
  // 한글 단일 글자 동 (가, 나, 다, 라, 마, 바, 사, 아, 본, 별, 신, 구, 동, 서, 남, 북)
  if (/^[가나다라마바사아자차카타파하본별신구동서남북]$/.test(clean)) return true
  // '1차', '2차', '본관', '별관', '타워', '오피스텔' 포함
  if (/(?:[0-9]+차|본관|별관|타워|상가)$/.test(clean)) return true
  return false
}

/**
 * 주소 문자열에서 아파트/집합건물 동·호수 및 추론 층수를 추출
 */
export function extractDongHoFloorFromText(rawText?: string): {
  dong: string
  ho: string
  floor: string
} {
  if (!rawText) return { dong: '', ho: '', floor: '' }

  // 괄호 안의 도로명 참고항목 (예: "(잠실동, 잠실엘스)") 제거하여 법정동 오인식 방지
  const textWithoutParens = rawText.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()

  let dong = ''
  let ho = ''

  // 1순위: 명시적 "OO동 OO호" 패턴 (뒤쪽 상세주소 영역 우선 매칭)
  const dongHoRegex = /(?:^|[\s,])(?:제\s*)?([가-힣A-Za-z0-9]{1,6})\s*동[\s,-]*(?:제\s*)?((?:지하|지|B|b)?\s*[0-9]{2,5})\s*호/g
  let match: RegExpExecArray | null
  while ((match = dongHoRegex.exec(textWithoutParens)) !== null) {
    const candDong = match[1].trim()
    const candHo = match[2].replace(/\s+/g, '')
    if (isLikelyBuildingDongToken(candDong)) {
      dong = candDong
    }
    ho = candHo
  }

  // 2순위: 호수 단독 ("1502호", "B02호") + 별도 건물 동 ("103동")
  if (!ho) {
    const hoRegex = /(?:^|[\s,-])(?:제\s*)?((?:지하|지|B|b)?\s*[0-9]{2,5})\s*호(?=$|[\s,.)])/g
    while ((match = hoRegex.exec(textWithoutParens)) !== null) {
      ho = match[1].replace(/\s+/g, '')
    }
  }
  if (!dong) {
    const dongOnlyRegex = /(?:^|[\s,])(?:제\s*)?([0-9]{3,4}|[A-Za-z])\s*동(?=$|[\s,.-])/g
    while ((match = dongOnlyRegex.exec(textWithoutParens)) !== null) {
      dong = match[1].trim()
    }
  }

  // 3순위: 주소 말미의 "103-1502" 형태 (3~4자리 동 - 3~4자리 호수)
  if (!ho) {
    const tailHyphen = textWithoutParens.match(/(?:^|\s)([1-9][0-9]{2,3})\s*-\s*([1-9][0-9]{2,3})$/)
    if (tailHyphen) {
      const dNum = parseInt(tailHyphen[1], 10)
      const hDigits = tailHyphen[2]
      const unitPart = parseInt(hDigits.slice(-2), 10)
      // 번지(예: 737-12)와 구분하기 위해 동이 101 이상이고 호수 끝 두 자리가 01~30인 경우만 동-호로 인정
      if (dNum >= 101 && unitPart >= 1 && unitPart <= 30) {
        dong = tailHyphen[1]
        ho = hDigits
      }
    }
  }

  const floor = inferFloorFromHo(ho)
  return { dong, ho, floor }
}

/**
 * 지번주소 문자열(예: "서울 강남구 역삼동 산 12-3", "경기 수원시 영통구 이의동 1350")에서 대지구분/본번/부번 4자리 코드 추출
 */
export function parseJibunAddressParts(jibunAddr?: string): {
  platGbCd: string
  bun: string
  ji: string
} | null {
  if (!jibunAddr) return null
  const cleaned = jibunAddr.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
  // "OO동/리/읍/면/가/로 (산) 123(-45)" 패턴
  const m = cleaned.match(/(?:동|리|읍|면|가|[0-9]+가)\s+(산\s+)?([0-9]{1,4})(?:-([0-9]{1,4}))?(?:\s|$)/)
  if (!m) {
    const fallback = cleaned.match(/(산\s+)?([0-9]{1,4})(?:-([0-9]{1,4}))?$/)
    if (!fallback) return null
    return {
      platGbCd: fallback[1] ? '1' : '0',
      bun: fallback[2].padStart(4, '0'),
      ji: (fallback[3] || '0').padStart(4, '0'),
    }
  }
  return {
    platGbCd: m[1] ? '1' : '0',
    bun: m[2].padStart(4, '0'),
    ji: (m[3] || '0').padStart(4, '0'),
  }
}

/**
 * 건축물대장 동/호 문자열 정규화 비교용 (예: "제101동" -> "101", "A동" -> "A", "1502호" -> "1502")
 */
export function normalizeDongKey(raw?: string): string {
  if (!raw) return ''
  return raw
    .trim()
    .replace(/^제\s*/, '')
    .replace(/동$/g, '')
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/^0+([1-9])/, '$1')
}

export function normalizeHoKey(raw?: string): string {
  if (!raw) return ''
  return raw
    .trim()
    .replace(/^제\s*/, '')
    .replace(/호$/g, '')
    .replace(/^지하\s*/, 'B')
    .replace(/^지\s*/, 'B')
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/^0+([1-9])/, '$1')
}

/**
 * 평형대 및 전용면적에 맞는 표준 물품 프리셋 ID 추천
 */
export function recommendPresetIdForPyeong(supplyPyeong: number, exclusiveAreaM2: number): string {
  if (exclusiveAreaM2 > 0 && exclusiveAreaM2 < 33) return 'preset_studio'
  if (supplyPyeong < 14) return 'preset_studio'
  if (supplyPyeong < 22 || (exclusiveAreaM2 >= 33 && exclusiveAreaM2 < 50)) return 'preset_two_room'
  if (supplyPyeong < 30 || (exclusiveAreaM2 >= 50 && exclusiveAreaM2 < 72)) return 'preset_three_room_24'
  if (supplyPyeong < 39 || (exclusiveAreaM2 >= 72 && exclusiveAreaM2 < 102)) return 'preset_four_room_34'
  return 'preset_large_45'
}

export const PRESET_SHORT_LABEL_MAP: Record<string, string> = {
  preset_studio: '원룸/오피스텔',
  preset_two_room: '15~20평 투룸',
  preset_three_room_24: '24~26평 표준',
  preset_four_room_34: '32~34평 표준',
  preset_large_45: '40평형+ 대형',
}
