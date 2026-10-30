// 한글 초성 추출, 초성/키워드 검색, 영타->한타(두벌식) 실시간 변환, 품목 중분류 자동 분류 유틸리티

export const CHOSUNG_BUTTONS = [
  '전체',
  'ㄱ',
  'ㄴ',
  'ㄷ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅅ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const

export type ChosungFilter = (typeof CHOSUNG_BUTTONS)[number]

export type ItemMidCategory = 'all' | 'selected' | 'box' | 'furniture' | 'appliance' | 'living'

export interface ItemMidCategoryMeta {
  key: ItemMidCategory
  label: string
  shortLabel: string
}

export const ITEM_MID_CATEGORIES: ItemMidCategoryMeta[] = [
  { key: 'all', label: '전체', shortLabel: '전체' },
  { key: 'selected', label: '✓ 선택됨', shortLabel: '✓ 선택됨' },
  { key: 'box', label: '📦 박스/포장', shortLabel: '📦 박스' },
  { key: 'furniture', label: '🛏️ 가구', shortLabel: '🛏️ 가구' },
  { key: 'appliance', label: '📺 가전', shortLabel: '📺 가전' },
  { key: 'living', label: '🪑 생활/기타', shortLabel: '🪑 생활' },
]

const CHOSUNG_TABLE = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
  'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]

const JUNGSUNG_TABLE = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ',
  'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
]

const JONGSUNG_TABLE = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ',
  'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ',
  'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]

// 두벌식 영문 키 -> 한글 자모 매핑
const ENG_TO_KOR_JAMO: Record<string, string> = {
  q: 'ㅂ', Q: 'ㅃ',
  w: 'ㅈ', W: 'ㅉ',
  e: 'ㄷ', E: 'ㄸ',
  r: 'ㄱ', R: 'ㄲ',
  t: 'ㅅ', T: 'ㅆ',
  y: 'ㅛ', Y: 'ㅛ',
  u: 'ㅕ', U: 'ㅕ',
  i: 'ㅑ', I: 'ㅑ',
  o: 'ㅐ', O: 'ㅒ',
  p: 'ㅔ', P: 'ㅖ',
  a: 'ㅁ', A: 'ㅁ',
  s: 'ㄴ', S: 'ㄴ',
  d: 'ㅇ', D: 'ㅇ',
  f: 'ㄹ', F: 'ㄹ',
  g: 'ㅎ', G: 'ㅎ',
  h: 'ㅗ', H: 'ㅗ',
  j: 'ㅓ', J: 'ㅓ',
  k: 'ㅏ', K: 'ㅏ',
  l: 'ㅣ', L: 'ㅣ',
  z: 'ㅋ', Z: 'ㅋ',
  x: 'ㅌ', X: 'ㅌ',
  c: 'ㅊ', C: 'ㅊ',
  v: 'ㅍ', V: 'ㅍ',
  b: 'ㅠ', B: 'ㅠ',
  n: 'ㅜ', N: 'ㅜ',
  m: 'ㅡ', M: 'ㅡ',
}

// 한글 단자모 -> 영문 소문자 역매핑 (한글 모드에서 'ㅠㅐㅌ' 입력 시 'box' 매칭용)
const KOR_JAMO_TO_ENG: Record<string, string> = {
  'ㅂ': 'q', 'ㅃ': 'q',
  'ㅈ': 'w', 'ㅉ': 'w',
  'ㄷ': 'e', 'ㄸ': 'e',
  'ㄱ': 'r', 'ㄲ': 'r',
  'ㅅ': 't', 'ㅆ': 't',
  'ㅛ': 'y',
  'ㅕ': 'u',
  'ㅑ': 'i',
  'ㅐ': 'o', 'ㅒ': 'o',
  'ㅔ': 'p', 'ㅖ': 'p',
  'ㅁ': 'a',
  'ㄴ': 's',
  'ㅇ': 'd',
  'ㄹ': 'f',
  'ㅎ': 'g',
  'ㅗ': 'h',
  'ㅓ': 'j',
  'ㅏ': 'k',
  'ㅣ': 'l',
  'ㅋ': 'z',
  'ㅌ': 'x',
  'ㅊ': 'c',
  'ㅍ': 'v',
  'ㅠ': 'b',
  'ㅜ': 'n',
  'ㅡ': 'm',
}

// 복합 모음 결합 규칙
const COMPOUND_VOWEL_MAP: Record<string, string> = {
  'ㅗㅏ': 'ㅘ',
  'ㅗㅐ': 'ㅙ',
  'ㅗㅣ': 'ㅚ',
  'ㅜㅓ': 'ㅝ',
  'ㅜㅔ': 'ㅞ',
  'ㅜㅣ': 'ㅟ',
  'ㅡㅣ': 'ㅢ',
}

const COMPOUND_VOWEL_DECOMPOSE: Record<string, [string, string]> = {
  'ㅘ': ['ㅗ', 'ㅏ'],
  'ㅙ': ['ㅗ', 'ㅐ'],
  'ㅚ': ['ㅗ', 'ㅣ'],
  'ㅝ': ['ㅜ', 'ㅓ'],
  'ㅞ': ['ㅜ', 'ㅔ'],
  'ㅟ': ['ㅜ', 'ㅣ'],
  'ㅢ': ['ㅡ', 'ㅣ'],
}

// 복합 받침(종성) 결합 규칙
const COMPOUND_JONGSUNG_MAP: Record<string, string> = {
  'ㄱㅅ': 'ㄳ',
  'ㄴㅈ': 'ㄵ',
  'ㄴㅎ': 'ㄶ',
  'ㄹㄱ': 'ㄺ',
  'ㄹㅁ': 'ㄻ',
  'ㄹㅂ': 'ㄼ',
  'ㄹㅅ': 'ㄽ',
  'ㄹㅌ': 'ㄾ',
  'ㄹㅍ': 'ㄿ',
  'ㄹㅎ': 'ㅀ',
  'ㅂㅅ': 'ㅄ',
}

const COMPOUND_JONGSUNG_DECOMPOSE: Record<string, [string, string]> = {
  'ㄳ': ['ㄱ', 'ㅅ'],
  'ㄵ': ['ㄴ', 'ㅈ'],
  'ㄶ': ['ㄴ', 'ㅎ'],
  'ㄺ': ['ㄹ', 'ㄱ'],
  'ㄻ': ['ㄹ', 'ㅁ'],
  'ㄼ': ['ㄹ', 'ㅂ'],
  'ㄽ': ['ㄹ', 'ㅅ'],
  'ㄾ': ['ㄹ', 'ㅌ'],
  'ㄿ': ['ㄹ', 'ㅍ'],
  'ㅀ': ['ㄹ', 'ㅎ'],
  'ㅄ': ['ㅂ', 'ㅅ'],
}

const isConsonant = (ch: string) => CHOSUNG_TABLE.includes(ch)
const isVowel = (ch: string) => JUNGSUNG_TABLE.includes(ch)

/**
 * 기존 한글 음절/자모와 새로 타이핑된 영문자를 기본 자모 배열로 분해
 */
function decomposeToBaseJamos(str: string): string[] {
  const result: string[] = []
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    // 1. 영문 알파벳이면 두벌식 자모로 변환
    if (ENG_TO_KOR_JAMO[ch]) {
      result.push(ENG_TO_KOR_JAMO[ch])
      continue
    }
    // 2. 완성형 한글 음절(가~힣)이면 초/중/종성으로 분해
    const code = ch.charCodeAt(0) - 0xac00
    if (code >= 0 && code <= 11171) {
      const choIdx = Math.floor(code / 588)
      const jungIdx = Math.floor((code % 588) / 28)
      const jongIdx = code % 28

      result.push(CHOSUNG_TABLE[choIdx])
      const jung = JUNGSUNG_TABLE[jungIdx]
      if (COMPOUND_VOWEL_DECOMPOSE[jung]) {
        result.push(...COMPOUND_VOWEL_DECOMPOSE[jung])
      } else {
        result.push(jung)
      }
      if (jongIdx > 0) {
        const jong = JONGSUNG_TABLE[jongIdx]
        if (COMPOUND_JONGSUNG_DECOMPOSE[jong]) {
          result.push(...COMPOUND_JONGSUNG_DECOMPOSE[jong])
        } else {
          result.push(jong)
        }
      }
      continue
    }
    // 3. 단독 복합 자모 분해
    if (COMPOUND_VOWEL_DECOMPOSE[ch]) {
      result.push(...COMPOUND_VOWEL_DECOMPOSE[ch])
      continue
    }
    if (COMPOUND_JONGSUNG_DECOMPOSE[ch]) {
      result.push(...COMPOUND_JONGSUNG_DECOMPOSE[ch])
      continue
    }
    result.push(ch)
  }
  return result
}

/**
 * 기본 자모 배열을 두벌식 오토마타 규칙에 따라 한글 문자열(초성 연속 또는 완성형 음절)로 조합
 */
function composeJamosToHangul(jamos: string[]): string {
  // 1단계: 연속된 단모음을 복합모음(ㅘ, ㅝ 등)으로 병합 (앞에 자음이 있거나 단독 모음일 때)
  const mergedVowels: string[] = []
  for (let i = 0; i < jamos.length; i++) {
    const cur = jamos[i]
    const next = jamos[i + 1]
    if (isVowel(cur) && isVowel(next) && COMPOUND_VOWEL_MAP[cur + next]) {
      mergedVowels.push(COMPOUND_VOWEL_MAP[cur + next])
      i++
    } else {
      mergedVowels.push(cur)
    }
  }

  let output = ''
  let i = 0
  while (i < mergedVowels.length) {
    const ch = mergedVowels[i]
    const next1 = mergedVowels[i + 1]

    // 초성(자음) + 중성(모음) 조합 시작
    if (isConsonant(ch) && next1 && isVowel(next1)) {
      const choIdx = CHOSUNG_TABLE.indexOf(ch)
      const jungIdx = JUNGSUNG_TABLE.indexOf(next1)
      let jongIdx = 0
      let step = 2

      const next2 = mergedVowels[i + 2]
      const next3 = mergedVowels[i + 3]
      const next4 = mergedVowels[i + 4]

      // 뒤에 자음이 오고, 그 다음이 모음이 아니면 종성(받침)으로 결합 가능
      if (next2 && isConsonant(next2)) {
        if (next3 && isVowel(next3)) {
          // next2는 다음 글자의 초성이므로 현재 글자는 받침 없음
          jongIdx = 0
          step = 2
        } else if (
          next3 &&
          isConsonant(next3) &&
          COMPOUND_JONGSUNG_MAP[next2 + next3] &&
          !(next4 && isVowel(next4))
        ) {
          // 겹받침(ㄳ, ㄺ, ㅄ 등)이고 그 뒤에 모음이 오지 않는 경우
          const compoundJong = COMPOUND_JONGSUNG_MAP[next2 + next3]
          const cIdx = JONGSUNG_TABLE.indexOf(compoundJong)
          if (cIdx > 0) {
            jongIdx = cIdx
            step = 4
          }
        } else {
          // 단일 받침
          const sIdx = JONGSUNG_TABLE.indexOf(next2)
          if (sIdx > 0) {
            jongIdx = sIdx
            step = 3
          }
        }
      }

      const syllableCode = 0xac00 + choIdx * 588 + jungIdx * 28 + jongIdx
      output += String.fromCharCode(syllableCode)
      i += step
    } else {
      output += ch
      i++
    }
  }

  return output
}

/**
 * 입력창에 영문 자판(예: 'ce' -> 'ㅊㄷ', 'claeo' -> '침대')이 입력되었을 때
 * 즉시 한글(초성 또는 완성형 음절)로 변환해주는 함수.
 * 이미 한글 모드여서 영문자가 전혀 없으면 원본 문자열을 그대로 반환하여 브라우저 한글 IME 조합을 방해하지 않음.
 */
export function convertEngInputToKor(input: string): string {
  if (!input || !/[a-zA-Z]/.test(input)) {
    return input
  }
  const jamos = decomposeToBaseJamos(input)
  return composeJamosToHangul(jamos)
}

/**
 * 한글 문자열을 영문 두벌식 키보드 타건열로 역변환 (예: 'ㅠㅐㅌ' -> 'box', 'ㅅㅍ' -> 'tv')
 */
export function convertKorToEngKeystrokes(str: string): string {
  if (!str) return ''
  const jamos = decomposeToBaseJamos(str)
  return jamos.map(j => KOR_JAMO_TO_ENG[j] || j).join('')
}

// 쌍자음 -> 단자음 정규화 (버튼 클릭 시 ㄲ->ㄱ, ㅆ->ㅅ 등 함께 매칭)
const NORMALIZED_CHOSUNG_MAP: Record<string, string> = {
  'ㄲ': 'ㄱ',
  'ㄸ': 'ㄷ',
  'ㅃ': 'ㅂ',
  'ㅆ': 'ㅅ',
  'ㅉ': 'ㅈ',
}

// 영문/외래어 대표 품목의 한글 초성 별칭 매핑 (예: BOX -> ㅂ, TV -> ㅌ, PC -> ㅍ/ㅋ)
const ALIAS_CHOSUNG_MAP: Array<{ pattern: RegExp; chosungs: string[]; keywords: string[] }> = [
  { pattern: /^box|박스/i, chosungs: ['ㅂ'], keywords: ['박스', 'ㅂㅅ', 'box', 'ㅠㅐㅌ'] },
  { pattern: /^tv|티비|텔레비전/i, chosungs: ['ㅌ'], keywords: ['티비', '텔레비전', 'ㅌㅂ', 'tv', 'ㅅㅍ'] },
  { pattern: /^pc|컴퓨터/i, chosungs: ['ㅍ', 'ㅋ'], keywords: ['컴퓨터', '피씨', 'ㅋㅍㅌ', 'ㅍㅆ', 'pc', 'ㅔㅊ'] },
]

/**
 * 단일 문자의 초성(정규화된 단자음 포함) 반환
 */
export function getCharChosung(char: string): string {
  if (!char) return ''
  const code = char.charCodeAt(0) - 0xac00
  if (code >= 0 && code <= 11171) {
    const chosungIdx = Math.floor(code / 588)
    const raw = CHOSUNG_TABLE[chosungIdx] || ''
    return NORMALIZED_CHOSUNG_MAP[raw] || raw
  }
  return NORMALIZED_CHOSUNG_MAP[char] || char
}

/**
 * 문자열 전체의 초성 문자열 반환 (예: "김치냉장고" -> "ㄱㅊㄴㅈㄱ")
 */
export function extractChosungString(str: string): string {
  if (!str) return ''
  let result = ''
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    const code = ch.charCodeAt(0) - 0xac00
    if (code >= 0 && code <= 11171) {
      const idx = Math.floor(code / 588)
      const raw = CHOSUNG_TABLE[idx] || ''
      result += NORMALIZED_CHOSUNG_MAP[raw] || raw
    } else {
      result += NORMALIZED_CHOSUNG_MAP[ch] || ch
    }
  }
  return result
}

/**
 * 품목명이 특정 초성 버튼(ㄱ~ㅎ)에 해당하는지 판별
 */
export function matchesChosungFilter(itemName: string, chosung: ChosungFilter): boolean {
  if (!chosung || chosung === '전체') return true
  const trimmed = (itemName || '').trim()
  if (!trimmed) return false

  // 영문 약어 별칭 우선 체크 (BOX -> ㅂ, TV -> ㅌ 등)
  for (const alias of ALIAS_CHOSUNG_MAP) {
    if (alias.pattern.test(trimmed) && alias.chosungs.includes(chosung)) {
      return true
    }
  }

  const firstChosung = getCharChosung(trimmed[0])
  return firstChosung === chosung
}

/**
 * 검색어(일반 텍스트, 초성 연속 입력 예: "ㅅㅍ", "침대", 또는 영문키 입력) 매칭 여부
 */
export function matchesKoreanSearch(itemName: string, spec: string | undefined, query: string): boolean {
  const rawQ = (query || '').trim().toLowerCase()
  if (!rawQ) return true

  // 영문으로 들어온 경우도 한글로 변환한 쿼리와 영문 역변환 쿼리를 모두 준비
  const korQ = convertEngInputToKor(rawQ).toLowerCase()
  const engQ = convertKorToEngKeystrokes(rawQ).toLowerCase()

  const nameLower = (itemName || '').toLowerCase()
  const specLower = (spec || '').toLowerCase()
  const combined = `${nameLower} ${specLower}`

  // 1. 일반 부분 문자열 포함 (원본, 한글변환, 영문역변환 모두 체크)
  if (combined.includes(rawQ) || combined.includes(korQ) || (engQ && combined.includes(engQ))) {
    return true
  }

  // 2. 영문/한글 별칭 매칭 (예: '박스'/'ㅠㅐㅌ' 검색 시 'BOX' 매칭, '티비' 검색 시 'TV' 매칭)
  for (const alias of ALIAS_CHOSUNG_MAP) {
    if (alias.pattern.test(nameLower)) {
      if (
        alias.keywords.some(
          k => k.includes(rawQ) || rawQ.includes(k) || k.includes(korQ) || korQ.includes(k)
        )
      ) {
        return true
      }
    }
  }

  // 3. 초성 검색 매칭 (예: 'ㅅㅍ' -> '소파', 'ㄱㅊㄴㅈ' -> '김치냉장고')
  const normalizedQuery = korQ
    .split('')
    .map(c => NORMALIZED_CHOSUNG_MAP[c] || c)
    .join('')
  const nameChosung = extractChosungString(nameLower)
  const specChosung = extractChosungString(specLower)

  if (nameChosung.includes(normalizedQuery) || specChosung.includes(normalizedQuery)) {
    return true
  }

  return false
}

const BOX_KEYWORDS = ['box', '박스', '바구니', '리빙박스', '아이스박스', '포장', '마대']

const APPLIANCE_KEYWORDS = [
  'tv', '티비', '텔레비전', '모니터', '냉장고', '김치냉장고', '세탁기', '건조기', '워시타워',
  '에어컨', '스타일러', '에어드레서', '전자레인지', '전자렌지', '오븐', '광파', '식기세척기',
  '정수기', '공기청정기', '가습기', '제습기', '선풍기', '써큘레이터', '히터', '난로', '온풍기',
  '안마의자', '컴퓨터', 'pc', '노트북', '프린터', '복합기', '스피커', '오디오', '홈시어터', '사운드바',
  '청소기', '로봇청소기', '밥솥', '인덕션', '하이라이트', '가스레인지', '가스렌지', '와인셀러',
  '냉동고', '비데', '런닝머신', '러닝머신', '워킹패드', '사이클', '헬스자전거', '커피머신', '에어프라이어',
  '김치통', '안마기', '반신욕기', '보일러', '온수기'
]

const FURNITURE_KEYWORDS = [
  '침대', '매트리스', '돌침대', '흙침대', '벙커침대', '이층침대', '2층침대', '모션베드', '패밀리침대',
  '장농', '장롱', '옷장', '붙박이', '이불장', '베이비장', '주니어장', '서랍장', '오단서랍장', '3단서랍장', '5단서랍장',
  '화장대', '소파', '쇼파', '카우치', '리클라이너', '벤치', '스툴',
  '거실장', 'tv장', '장식장', '진열장', '유리장', '수납장', '교구장', '교구대', '선반', '렉', '앵글', '철제렉',
  '책상', '책장', '책꽂이', '독서실책상', '의자', '듀오백', '시디즈', '게이밍의자',
  '식탁', '식탁의자', '아일랜드', '홈바', '렌지대', '레인지대', '밥솥다이', '주방장', '찬장',
  '행거', '시스템행거', '드레스룸', '신발장', '파티션', '테이블', '협탁', '티테이블', '교자상', '밥상', '좌탁', '문갑'
]

/**
 * 품목명 기반 중분류('box' | 'furniture' | 'appliance' | 'living') 자동 판별
 */
export function classifyItemMidCategory(itemName: string): Exclude<ItemMidCategory, 'all' | 'selected'> {
  const lower = (itemName || '').trim().toLowerCase()
  if (!lower) return 'living'

  if (BOX_KEYWORDS.some(k => lower.includes(k))) {
    return 'box'
  }
  // 가전 키워드 우선 체크
  if (APPLIANCE_KEYWORDS.some(k => lower.includes(k))) {
    return 'appliance'
  }
  if (FURNITURE_KEYWORDS.some(k => lower.includes(k))) {
    return 'furniture'
  }
  return 'living'
}
