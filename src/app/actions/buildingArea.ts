'use server'

import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/session'
import { cleanKoreanRoadAddress } from '@/lib/distance'
import {
  M2_PER_PYEONG,
  extractDongHoFloorFromText,
  inferFloorFromHo,
  normalizeDongKey,
  normalizeHoKey,
  parseJibunAddressParts,
  recommendPresetIdForPyeong,
  type AddressBjdMeta,
  type ComplexTenureCategory,
  type DongCandidateSummary,
  type UnitAreaInfo,
} from '@/lib/buildingAreaUtils'

export interface LookupBuildingAreaRequest {
  address: string
  dong?: string
  ho?: string
  addressMeta?: Partial<AddressBjdMeta> | null
}

export interface LookupBuildingAreaResponse {
  success: boolean
  unitArea?: UnitAreaInfo
  inferredFloor?: string
  dongCandidates?: DongCandidateSummary[]
  needsDongSelection?: boolean
  errorCode?: 'UNAUTHORIZED' | 'MISSING_HO' | 'ADDRESS_NOT_FOUND' | 'MISSING_API_KEY' | 'INVALID_API_KEY' | 'UNIT_NOT_FOUND' | 'API_ERROR'
  error?: string
}

const APP_SETTING_KEY = 'DATA_GO_KR_API_KEY'
let appSettingTableEnsured = false
let cachedDbApiKey: string | null = null

async function verifyAuthenticatedUser(): Promise<{ userId: string } | null> {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get('session')?.value
    const session = await decrypt(cookie)
    if (!session?.userId) return null
    return { userId: String(session.userId) }
  } catch {
    return null
  }
}

async function ensureAppSettingTable(): Promise<void> {
  if (appSettingTableEnsured) return
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AppSetting" (
      "key" TEXT PRIMARY KEY,
      "value" TEXT NOT NULL,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  appSettingTableEnsured = true
}

async function resolveDataGoKrApiKey(): Promise<string> {
  const envKey = (
    process.env.DATA_GO_KR_API_KEY ||
    process.env.MOLIT_API_KEY ||
    process.env.PUBLIC_DATA_API_KEY ||
    ''
  ).trim()
  if (envKey) return envKey

  if (cachedDbApiKey) return cachedDbApiKey

  try {
    await ensureAppSettingTable()
    const rows = await prisma.$queryRawUnsafe<Array<{ value: string }>>(
      `SELECT "value" FROM "AppSetting" WHERE "key" = $1 LIMIT 1`,
      APP_SETTING_KEY
    )
    const val = rows?.[0]?.value?.trim() || ''
    if (val) {
      cachedDbApiKey = val
    }
    return val
  } catch {
    return ''
  }
}

export async function getBuildingApiKeyStatus(): Promise<{
  configured: boolean
  source: 'env' | 'db' | 'none'
}> {
  const user = await verifyAuthenticatedUser()
  if (!user) return { configured: false, source: 'none' }

  const envKey = (
    process.env.DATA_GO_KR_API_KEY ||
    process.env.MOLIT_API_KEY ||
    process.env.PUBLIC_DATA_API_KEY ||
    ''
  ).trim()
  if (envKey) return { configured: true, source: 'env' }

  const key = await resolveDataGoKrApiKey()
  return { configured: Boolean(key), source: key ? 'db' : 'none' }
}

export async function saveBuildingApiKey(rawKey: string): Promise<{
  success: boolean
  error?: string
}> {
  const user = await verifyAuthenticatedUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const trimmed = (rawKey || '').trim()
  if (!trimmed || trimmed.length < 16) {
    return { success: false, error: '유효한 공공데이터포털 인증키(Service Key)를 입력해주세요.' }
  }

  try {
    await ensureAppSettingTable()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AppSetting" ("key", "value", "updatedAt")
       VALUES ($1, $2, NOW())
       ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()`,
      APP_SETTING_KEY,
      trimmed
    )
    cachedDbApiKey = trimmed
    return { success: true }
  } catch (err: any) {
    console.error('saveBuildingApiKey error:', err)
    return { success: false, error: '인증키 저장 중 오류가 발생했습니다.' }
  }
}

/**
 * 카카오 로컬 API를 이용해 도로명/지번/단지명 주소에서 법정동코드 10자리 + 대지구분 + 본번/부번 4자리 추출
 */
async function resolveAddressToBjdMeta(
  rawAddress: string,
  hintMeta?: Partial<AddressBjdMeta> | null
): Promise<AddressBjdMeta | null> {
  if (
    hintMeta?.bcode &&
    hintMeta.bcode.length === 10 &&
    hintMeta.bun &&
    hintMeta.bun !== '0000'
  ) {
    return {
      bcode: hintMeta.bcode,
      platGbCd: hintMeta.platGbCd || '0',
      bun: hintMeta.bun.padStart(4, '0'),
      ji: (hintMeta.ji || '0000').padStart(4, '0'),
      buildingName: hintMeta.buildingName || '',
      jibunAddress: hintMeta.jibunAddress || '',
      roadAddress: hintMeta.roadAddress || cleanKoreanRoadAddress(rawAddress),
    }
  }

  // 지번 힌트가 있으면 파싱 시도
  if (hintMeta?.bcode && hintMeta.bcode.length === 10 && hintMeta.jibunAddress) {
    const parsed = parseJibunAddressParts(hintMeta.jibunAddress)
    if (parsed) {
      return {
        bcode: hintMeta.bcode,
        platGbCd: parsed.platGbCd,
        bun: parsed.bun,
        ji: parsed.ji,
        buildingName: hintMeta.buildingName || '',
        jibunAddress: hintMeta.jibunAddress,
        roadAddress: hintMeta.roadAddress || cleanKoreanRoadAddress(rawAddress),
      }
    }
  }

  const kakaoKey = (process.env.KAKAO_REST_API_KEY || '').trim()
  if (!kakaoKey) return null

  const cleanedAddr = cleanKoreanRoadAddress(rawAddress)
  const queries = Array.from(new Set([cleanedAddr, rawAddress.trim()].filter(Boolean)))

  for (const q of queries) {
    try {
      const addrRes = await fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}`,
        {
          headers: { Authorization: `KakaoAK ${kakaoKey}` },
          cache: 'no-store',
        }
      )
      if (addrRes.ok) {
        const data = await addrRes.json()
        const doc = data?.documents?.[0]
        if (doc) {
          const jibunObj = doc.address
          const roadObj = doc.road_address
          if (jibunObj?.b_code && jibunObj?.main_address_no) {
            return {
              bcode: String(jibunObj.b_code),
              platGbCd: jibunObj.mountain_yn === 'Y' ? '1' : '0',
              bun: String(jibunObj.main_address_no).padStart(4, '0'),
              ji: String(jibunObj.sub_address_no || '0').padStart(4, '0'),
              buildingName: roadObj?.building_name || hintMeta?.buildingName || '',
              jibunAddress: jibunObj.address_name || '',
              roadAddress: roadObj?.address_name || hintMeta?.roadAddress || cleanedAddr,
            }
          }
          // road_address만 있고 jibunObj가 비어있는 경우 좌표 역지오코딩으로 보강
          if (doc.x && doc.y) {
            const coordMeta = await reverseCoordToBjdMeta(doc.x, doc.y, kakaoKey, roadObj?.building_name)
            if (coordMeta) return coordMeta
          }
        }
      }
    } catch {}
  }

  // 단지명(예: "잠실엘스", "반포자이")만 입력된 경우 키워드 검색 -> 좌표 역지오코딩
  for (const q of queries) {
    try {
      const kwRes = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=3`,
        {
          headers: { Authorization: `KakaoAK ${kakaoKey}` },
          cache: 'no-store',
        }
      )
      if (kwRes.ok) {
        const kwData = await kwRes.json()
        const place = kwData?.documents?.[0]
        if (place?.x && place?.y) {
          const coordMeta = await reverseCoordToBjdMeta(
            place.x,
            place.y,
            kakaoKey,
            place.place_name || hintMeta?.buildingName
          )
          if (coordMeta) return coordMeta
        }
      }
    } catch {}
  }

  return null
}

async function reverseCoordToBjdMeta(
  x: string,
  y: string,
  kakaoKey: string,
  buildingName?: string
): Promise<AddressBjdMeta | null> {
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}`,
      {
        headers: { Authorization: `KakaoAK ${kakaoKey}` },
        cache: 'no-store',
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const doc = data?.documents?.[0]
    const addr = doc?.address
    const road = doc?.road_address
    if (!addr?.main_address_no) return null

    // coord2regioncode에서 10자리 법정동코드 조회
    const regRes = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}`,
      {
        headers: { Authorization: `KakaoAK ${kakaoKey}` },
        cache: 'no-store',
      }
    )
    if (!regRes.ok) return null
    const regData = await regRes.json()
    const bRegion = regData?.documents?.find((d: any) => d.region_type === 'B')
    if (!bRegion?.code) return null

    return {
      bcode: String(bRegion.code),
      platGbCd: addr.mountain_yn === 'Y' ? '1' : '0',
      bun: String(addr.main_address_no).padStart(4, '0'),
      ji: String(addr.sub_address_no || '0').padStart(4, '0'),
      buildingName: road?.building_name || buildingName || '',
      jibunAddress: addr.address_name || '',
      roadAddress: road?.address_name || '',
    }
  } catch {
    return null
  }
}

const OTHER_COMMON_PURPOSE_REGEX =
  /(주차|관리|노인|경로|보육|어린이|유치원|기계|전기|펌프|발전|변전|경비|주민공동|커뮤니티|문고|독서|도서|휘트니스|피트니스|체력|체육|골프|사우나|목욕|근린생활|상가|판매|창고|쓰레기|분리수거|저수조|물탱크|정화조|MDF|통신|방재)/i

interface RawAreaRow {
  dongNm?: string
  hoNm?: string
  bldNm?: string
  flrNo?: number | string
  flrGbCd?: string
  flrGbCdNm?: string
  mainAtchGbCd?: string
  exposPubuseGbCd?: string
  exposPubuseGbCdNm?: string
  mainPurpsCdNm?: string
  etcPurps?: string
  area?: number | string
}

async function fetchExposPubuseAreaRows(params: {
  serviceKey: string
  sigunguCd: string
  bjdongCd: string
  platGbCd: string
  bun: string
  ji: string
  dongNm?: string
  hoNm?: string
  numOfRows?: number
}): Promise<{ rows: RawAreaRow[]; authError?: string; apiError?: string }> {
  const { serviceKey, sigunguCd, bjdongCd, platGbCd, bun, ji, dongNm, hoNm, numOfRows = 200 } = params

  // 사용자가 Encoding 키(%포함)를 넣었든 Decoding 키(+/=포함)를 넣었든 모두 안전하게 호환 처리
  const keyCandidates = serviceKey.includes('%')
    ? [serviceKey, encodeURIComponent(serviceKey)]
    : [encodeURIComponent(serviceKey), serviceKey]

  let lastAuthError = ''

  for (const encodedKey of Array.from(new Set(keyCandidates))) {
    const qs = new URLSearchParams({
      sigunguCd,
      bjdongCd,
      platGbCd,
      bun,
      ji,
      numOfRows: String(numOfRows),
      pageNo: '1',
      _type: 'json',
    })
    if (dongNm) qs.set('dongNm', dongNm)
    if (hoNm) qs.set('hoNm', hoNm)

    const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodedKey}&${qs.toString()}`

    try {
      const res = await fetch(url, { cache: 'no-store' })
      const text = await res.text()

      // XML 에러(인증키 미등록/트래픽 초과 등) 판별
      if (text.trim().startsWith('<')) {
        if (
          text.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR') ||
          text.includes('UNREGISTERED_KEY') ||
          text.includes('INVALID_REQUEST_PARAMETER_ERROR') ||
          text.includes('SERVICE_ACCESS_DENIED_ERROR')
        ) {
          lastAuthError =
            "공공데이터포털 인증키가 유효하지 않거나 '국토교통부_건축HUB_건축물대장정보 서비스' 활용신청이 아직 반영되지 않았습니다. (발급 직후 최대 10~60분 소요)"
          continue
        }
        return { rows: [], apiError: '건축물대장 서버 응답을 해석할 수 없습니다.' }
      }

      const json = JSON.parse(text)
      const resultCode = json?.response?.header?.resultCode
      if (resultCode && resultCode !== '00') {
        const msg = json?.response?.header?.resultMsg || 'API 오류'
        if (String(msg).includes('KEY') || String(msg).includes('ACCESS')) {
          lastAuthError = `인증키 확인 필요 (${msg})`
          continue
        }
        return { rows: [], apiError: `건축물대장 조회 오류: ${msg}` }
      }

      const rawItems = json?.response?.body?.items?.item
      if (!rawItems) return { rows: [] }
      const arr: RawAreaRow[] = Array.isArray(rawItems) ? rawItems : [rawItems]
      return { rows: arr }
    } catch (e: any) {
      return { rows: [], apiError: e?.message || '건축물대장 서버 통신 실패' }
    }
  }

  if (lastAuthError) {
    return { rows: [], authError: lastAuthError }
  }
  return { rows: [] }
}

function buildUnitAreaFromRows(
  rows: RawAreaRow[],
  fallbackBuildingName: string,
  fallbackFloor: string
): UnitAreaInfo | null {
  if (!rows || rows.length === 0) return null

  let exclusiveAreaM2 = 0
  let residentialCommonM2 = 0
  let otherCommonM2 = 0
  let bldNm = fallbackBuildingName
  let dongNm = ''
  let hoNm = ''
  let mainPurpsNm = ''
  let detectedFloor = ''

  // 전유부분 중 주건축물(mainAtchGbCd === '0' 또는 미지정)이 존재하는지 체크
  const hasMainExclusive = rows.some(r => {
    const isEx = String(r.exposPubuseGbCd) === '1' || String(r.exposPubuseGbCdNm || '').includes('전유')
    return isEx && String(r.mainAtchGbCd || '0') !== '1'
  })

  for (const r of rows) {
    const areaVal = Number(r.area) || 0
    if (areaVal <= 0) continue

    if (!bldNm && r.bldNm && String(r.bldNm).trim()) bldNm = String(r.bldNm).trim()
    if (!dongNm && r.dongNm && String(r.dongNm).trim()) dongNm = String(r.dongNm).trim()
    if (!hoNm && r.hoNm && String(r.hoNm).trim()) hoNm = String(r.hoNm).trim()
    if (!mainPurpsNm && r.mainPurpsCdNm && String(r.mainPurpsCdNm).trim()) {
      mainPurpsNm = String(r.mainPurpsCdNm).trim()
    }

    const isExclusive =
      String(r.exposPubuseGbCd) === '1' || String(r.exposPubuseGbCdNm || '').includes('전유')
    const isCommon =
      String(r.exposPubuseGbCd) === '2' || String(r.exposPubuseGbCdNm || '').includes('공용')
    const isAttachedBld = String(r.mainAtchGbCd || '0') === '1'
    const purpsText = `${r.etcPurps || ''} ${r.mainPurpsCdNm || ''}`

    if (isExclusive) {
      if (!detectedFloor && r.flrNo) {
        const isBasement = String(r.flrGbCd) === '10' || String(r.flrGbCdNm || '').includes('지하')
        detectedFloor = isBasement ? `B${r.flrNo}` : String(r.flrNo)
      }
      if (r.etcPurps && String(r.etcPurps).trim() && (!mainPurpsNm || mainPurpsNm === '공동주택')) {
        const ep = String(r.etcPurps).trim()
        if (ep.includes('아파트') || ep.includes('오피스텔') || ep.includes('다세대') || ep.includes('연립')) {
          mainPurpsNm = ep
        }
      }
      if (!hasMainExclusive || !isAttachedBld) {
        exclusiveAreaM2 += areaVal
      } else {
        otherCommonM2 += areaVal
      }
    } else if (isCommon) {
      if (isAttachedBld || OTHER_COMMON_PURPOSE_REGEX.test(purpsText)) {
        otherCommonM2 += areaVal
      } else {
        residentialCommonM2 += areaVal
      }
    }
  }

  if (exclusiveAreaM2 <= 0) return null

  exclusiveAreaM2 = Math.round(exclusiveAreaM2 * 100) / 100
  residentialCommonM2 = Math.round(residentialCommonM2 * 100) / 100
  otherCommonM2 = Math.round(otherCommonM2 * 100) / 100

  let isEstimatedSupply = false
  let supplyAreaM2 = exclusiveAreaM2 + residentialCommonM2

  // 일부 구축 대장에 호별 공용면적이 누락되어 전유면적만 내려오는 경우 보정
  if (residentialCommonM2 <= 0) {
    isEstimatedSupply = true
    const isVilla = mainPurpsNm.includes('다세대') || mainPurpsNm.includes('연립')
    const ratio = isVilla ? 1.18 : 1.32
    supplyAreaM2 = Math.round(exclusiveAreaM2 * ratio * 100) / 100
  } else {
    supplyAreaM2 = Math.round(supplyAreaM2 * 100) / 100
  }

  const supplyPyeong = Math.round((supplyAreaM2 / M2_PER_PYEONG) * 10) / 10
  const exclusivePyeong = Math.round((exclusiveAreaM2 / M2_PER_PYEONG) * 10) / 10
  const pyeongType = Math.max(1, Math.round(supplyPyeong))
  const finalFloor = detectedFloor || fallbackFloor || inferFloorFromHo(hoNm)

  return {
    pyeongType,
    supplyPyeong,
    exclusivePyeong,
    supplyAreaM2,
    exclusiveAreaM2,
    residentialCommonM2,
    otherCommonM2,
    buildingName: bldNm || undefined,
    dongNm: dongNm || undefined,
    hoNm: hoNm || undefined,
    floor: finalFloor || undefined,
    mainPurpsNm: mainPurpsNm || undefined,
    isEstimatedSupply,
    recommendedPresetId: recommendPresetIdForPyeong(supplyPyeong, exclusiveAreaM2),
  }
}

interface ComplexTenureMetadata {
  tenureCategory?: ComplexTenureCategory
  tenureLabel?: string
  rentalSubType?: string
  hallType?: string
  totalHouseholds?: number
}

// 짧은 메모리 캐시 (동일 법정동/시군구 연속 조회 시 응답속도 극대화)
const kaptListCache = new Map<string, { expiresAt: number; items: Record<string, string>[] }>()
const myHomeListCache = new Map<string, { expiresAt: number; items: Record<string, string>[] }>()
const CACHE_TTL_MS = 10 * 60 * 1000

/**
 * 도로명주소에서 시군구 내 고유 식별키(도로명 + 건물본번-부번, 예: "올림픽로99", "동호로33길15") 추출
 */
function extractRoadNumberKey(addr?: string): string {
  if (!addr) return ''
  const cleaned = cleanKoreanRoadAddress(addr).replace(/\s+/g, ' ').trim()
  const matches = Array.from(
    cleaned.matchAll(/([가-힣0-9]+(?:로|길))\s*([0-9]+(?:-[0-9]+)?)/g)
  )
  if (matches.length === 0) return ''
  const last = matches[matches.length - 1]
  return `${last[1]}${last[2]}`.replace(/\s+/g, '')
}

/**
 * 아파트/단지명 비교용 정규화 (괄호, 공백, '아파트'/'공동주택' 접미사 제거)
 */
function normalizeComplexName(name?: string): string {
  if (!name) return ''
  return name
    .replace(/\([^)]*\)/g, '')
    .replace(/아파트|공동주택|주상복합|도시형생활주택/g, '')
    .replace(/[^가-힣A-Za-z0-9]/g, '')
    .toUpperCase()
}

/**
 * 공공데이터포털 JSON / XML 응답 범용 파서 (K-APT 및 마이홈포털 호환)
 */
function parsePublicDataItems(rawText: string): Record<string, string>[] | null {
  const trimmed = (rawText || '').trim()
  if (!trimmed) return null

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(trimmed)
      // 마이홈포털 HWSPR04 응답 구조 ({ code: "000", hsmpList: [...] })
      if (Array.isArray(json?.hsmpList)) {
        return json.hsmpList.map((row: any) => {
          const obj: Record<string, string> = {}
          for (const [k, v] of Object.entries(row || {})) {
            if (v !== null && v !== undefined) obj[k] = String(v).trim()
          }
          return obj
        })
      }

      const resultCode = json?.response?.header?.resultCode
      if (resultCode && resultCode !== '00' && resultCode !== '000') {
        return null
      }

      const rawItems =
        json?.response?.body?.items?.item ??
        json?.response?.body?.item ??
        json?.response?.body?.items
      if (!rawItems) return []
      const arr = Array.isArray(rawItems)
        ? rawItems
        : typeof rawItems === 'object'
          ? [rawItems]
          : []
      return arr.map((row: any) => {
        const obj: Record<string, string> = {}
        for (const [k, v] of Object.entries(row || {})) {
          if (v !== null && v !== undefined && typeof v !== 'object') {
            obj[k] = String(v).trim()
          }
        }
        return obj
      })
    } catch {
      return null
    }
  }

  // XML 응답인 경우 에러 코드 체크 후 <item> 또는 <body > 단일 객체 태그 파싱
  if (
    trimmed.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR') ||
    trimmed.includes('UNREGISTERED_KEY') ||
    trimmed.includes('SERVICE_ACCESS_DENIED_ERROR') ||
    trimmed.includes('APPLICATION_ERROR')
  ) {
    return null
  }

  const itemBlocks = Array.from(trimmed.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map(m => m[1])
  const blocksToParse =
    itemBlocks.length > 0
      ? itemBlocks
      : Array.from(trimmed.matchAll(/<body>([\s\S]*?)<\/body>/gi)).map(m => m[1])

  if (blocksToParse.length === 0) return null

  const parsed: Record<string, string>[] = []
  for (const block of blocksToParse) {
    const row: Record<string, string> = {}
    const tagRegex = /<([A-Za-z0-9_]+)>([^<]*)<\/\1>/g
    let m: RegExpExecArray | null
    while ((m = tagRegex.exec(block)) !== null) {
      row[m[1]] = m[2].trim()
    }
    if (Object.keys(row).length > 0) {
      parsed.push(row)
    }
  }
  return parsed
}

async function fetchDataGoKrItemsWithKeyFallback(
  endpointBaseUrl: string,
  serviceKey: string,
  params: Record<string, string>,
  timeoutMs = 3200
): Promise<Record<string, string>[] | null> {
  const keyCandidates = serviceKey.includes('%')
    ? [serviceKey, encodeURIComponent(serviceKey)]
    : [encodeURIComponent(serviceKey), serviceKey]

  for (const encodedKey of Array.from(new Set(keyCandidates))) {
    const qs = new URLSearchParams(params)
    const url = `${endpointBaseUrl}?serviceKey=${encodedKey}&${qs.toString()}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { cache: 'no-store', signal: controller.signal })
      clearTimeout(timer)
      if (!res.ok) continue
      const text = await res.text()
      const items = parsePublicDataItems(text)
      if (items !== null) return items
    } catch {
      clearTimeout(timer)
    }
  }
  return null
}

/**
 * 1) 국토교통부 K-APT 공동주택 단지 목록 조회 (버전 V4/V3/V2 자동 호환)
 */
async function fetchKaptListByBjd(
  serviceKey: string,
  bcode: string
): Promise<Record<string, string>[]> {
  const cached = kaptListCache.get(bcode)
  if (cached && cached.expiresAt > Date.now()) return cached.items

  const endpoints = [
    'https://apis.data.go.kr/1613000/AptListService3/getLegaldongAptList3',
    'https://apis.data.go.kr/1613000/AptListService4/getLegaldongAptList4',
    'https://apis.data.go.kr/1613000/AptListService2/getLegaldongAptList',
  ]

  for (const ep of endpoints) {
    const items = await fetchDataGoKrItemsWithKeyFallback(ep, serviceKey, {
      bjdCode: bcode,
      numOfRows: '200',
      pageNo: '1',
      _type: 'json',
    })
    if (items && items.length > 0) {
      kaptListCache.set(bcode, { expiresAt: Date.now() + CACHE_TTL_MS, items })
      return items
    }
  }
  return []
}

/**
 * 2) 국토교통부 K-APT 단지 기본정보 조회 (codeSaleNm: 분양/임대/혼합, codeHallNm: 계단식/복도식)
 */
async function fetchKaptBasisInfo(
  serviceKey: string,
  kaptCode: string
): Promise<Record<string, string> | null> {
  const endpoints = [
    'https://apis.data.go.kr/1613000/AptBasisInfoServiceV4/getAphusBassInfoV4',
    'https://apis.data.go.kr/1613000/AptBasisInfoServiceV3/getAphusBassInfoV3',
    'https://apis.data.go.kr/1613000/AptBasisInfoService1/getAphusBassInfo',
  ]

  for (const ep of endpoints) {
    const items = await fetchDataGoKrItemsWithKeyFallback(ep, serviceKey, {
      kaptCode,
      _type: 'json',
    })
    if (items && items.length > 0) return items[0]
  }
  return null
}

/**
 * 3) 국토교통부 마이홈포털 공공임대주택 단지정보 조회 (국민임대·행복주택·영구임대·장기전세 등 상세 유형)
 */
async function fetchMyHomeRentalListBySigungu(
  serviceKey: string,
  bcode: string
): Promise<Record<string, string>[]> {
  const sigunguCd = bcode.slice(0, 5)
  const cached = myHomeListCache.get(sigunguCd)
  if (cached && cached.expiresAt > Date.now()) return cached.items

  const brtcCode = sigunguCd.slice(0, 2)
  const signguCode = sigunguCd.slice(2, 5)

  const items = await fetchDataGoKrItemsWithKeyFallback(
    'https://apis.data.go.kr/1613000/HWSPR04/rentalHouseGwList',
    serviceKey,
    {
      brtcCode,
      signguCode,
      numOfRows: '300',
      pageNo: '1',
      _type: 'json',
    }
  )

  if (items && items.length > 0) {
    myHomeListCache.set(sigunguCd, { expiresAt: Date.now() + CACHE_TTL_MS, items })
    return items
  }
  return []
}

function normalizeHallTypeLabel(raw?: string): string | undefined {
  if (!raw) return undefined
  const t = raw.trim()
  if (!t) return undefined
  if (t.includes('복도')) return '복도식'
  if (t.includes('계단')) return '계단식'
  if (t.includes('혼합') || t.includes('타워')) return '혼합식'
  return t
}

/**
 * K-APT 기본정보 + 마이홈포털 공공임대 단지정보 + 건물명 키워드 보조 판별을 결합하여
 * [공공임대: 국민임대] / [분양단지] / [분양+임대 혼합단지] 및 계단식·복도식 정보를 산출
 */
async function resolveComplexTenureMetadata(params: {
  serviceKey: string
  bjdMeta: AddressBjdMeta
  rawAddress: string
  bldNmFromRegistry?: string
  dongNmFromRegistry?: string
  kaptListPromise: Promise<Record<string, string>[]>
  myHomeListPromise: Promise<Record<string, string>[]>
}): Promise<ComplexTenureMetadata> {
  const {
    serviceKey,
    bjdMeta,
    rawAddress,
    bldNmFromRegistry,
    dongNmFromRegistry,
    kaptListPromise,
    myHomeListPromise,
  } = params

  const targetRoadKey = extractRoadNumberKey(bjdMeta.roadAddress || rawAddress)
  const targetNames = Array.from(
    new Set(
      [bjdMeta.buildingName, bldNmFromRegistry]
        .map(n => normalizeComplexName(n))
        .filter(n => n.length >= 2)
    )
  )
  const mainBun = String(parseInt(bjdMeta.bun, 10) || '')
  const subJi = parseInt(bjdMeta.ji, 10)
  const jibunNumberToken = mainBun ? (subJi > 0 ? `${mainBun}-${subJi}` : mainBun) : ''

  const [kaptList, myHomeList] = await Promise.all([kaptListPromise, myHomeListPromise])

  // A. 마이홈포털 공공임대 매칭 (도로명번호 정확 일치 우선 -> 단지명 일치 보조)
  const matchedMyHomeRows = myHomeList.filter(item => {
    const itemRoadKey = extractRoadNumberKey(item.rnAdres || item.adres || '')
    if (targetRoadKey && itemRoadKey && targetRoadKey === itemRoadKey) {
      return true
    }
    if (!targetRoadKey && targetNames.length > 0) {
      const hsmpNorm = normalizeComplexName(item.hsmpNm)
      if (hsmpNorm.length >= 3 && targetNames.some(tn => tn === hsmpNorm || tn.includes(hsmpNorm) || hsmpNorm.includes(tn))) {
        return true
      }
    }
    return false
  })

  const myHomeSupplyTypes = Array.from(
    new Set(
      matchedMyHomeRows
        .map(r => (r.suplyTyNm || '').trim())
        .filter(Boolean)
    )
  )
  const myHomeHallType = normalizeHallTypeLabel(
    matchedMyHomeRows.find(r => r.buldStleNm)?.buldStleNm
  )

  // B. K-APT 단지 매칭 및 기본정보(codeSaleNm, codeHallNm) 조회
  let kaptSaleNm = ''
  let kaptHallType: string | undefined
  let kaptHouseholds: number | undefined

  if (kaptList.length > 0) {
    const scoredCandidates = kaptList
      .map(item => {
        const kName = normalizeComplexName(item.kaptName)
        let score = 0
        if (kName && targetNames.length > 0) {
          for (const tn of targetNames) {
            if (kName === tn) score = Math.max(score, 100)
            else if (kName.includes(tn) || tn.includes(kName)) score = Math.max(score, 75)
          }
        }
        const addrNorm = normalizeComplexName(rawAddress)
        if (score === 0 && kName.length >= 3 && addrNorm.includes(kName)) {
          score = 65
        }
        return { item, score }
      })
      .sort((a, b) => b.score - a.score)

    // 상위 후보(최대 3개)에 대해 기본정보를 조회하여 도로명/지번 또는 단지명으로 확정
    const topCandidates =
      scoredCandidates[0]?.score > 0
        ? scoredCandidates.filter(c => c.score > 0).slice(0, 3)
        : kaptList.length <= 5
          ? scoredCandidates.slice(0, 5)
          : []

    for (const cand of topCandidates) {
      const kaptCode = cand.item.kaptCode || cand.item.kaptcode
      if (!kaptCode) continue

      const basis = await fetchKaptBasisInfo(serviceKey, kaptCode)
      if (!basis) {
        if (cand.score >= 75 && cand.item.codeSaleNm) {
          kaptSaleNm = cand.item.codeSaleNm
          kaptHallType = normalizeHallTypeLabel(cand.item.codeHallNm)
          break
        }
        continue
      }

      const doroKey = extractRoadNumberKey(basis.doroJuso || '')
      const kaptAddr = basis.kaptAddr || ''
      const isRoadMatched = Boolean(targetRoadKey && doroKey && targetRoadKey === doroKey)
      const isJibunMatched = Boolean(
        jibunNumberToken &&
          new RegExp(`(?:^|\\s)${jibunNumberToken}(?:$|\\s)`).test(kaptAddr)
      )

      if (isRoadMatched || isJibunMatched || cand.score >= 75) {
        kaptSaleNm = basis.codeSaleNm || cand.item.codeSaleNm || ''
        kaptHallType = normalizeHallTypeLabel(basis.codeHallNm || cand.item.codeHallNm)
        const hh = parseInt(basis.kaptdaCnt || '', 10)
        if (hh > 0) kaptHouseholds = hh
        break
      }
    }
  }

  const finalHallType = kaptHallType || myHomeHallType
  const combinedNameText = `${bjdMeta.buildingName || ''} ${bldNmFromRegistry || ''} ${dongNmFromRegistry || ''} ${rawAddress || ''}`

  // C. K-APT 분양형태 + 마이홈포털 임대유형 + 건물명 키워드 통합 판정
  const rentalSubType = myHomeSupplyTypes.length > 0 ? myHomeSupplyTypes.slice(0, 2).join('·') : undefined

  if (kaptSaleNm) {
    const isMixed =
      kaptSaleNm.includes('혼합') || (kaptSaleNm.includes('분양') && kaptSaleNm.includes('임대'))
    const isRental = !isMixed && kaptSaleNm.includes('임대')
    const isSale = !isMixed && !isRental && kaptSaleNm.includes('분양')

    if (isMixed || (isSale && rentalSubType)) {
      return {
        tenureCategory: 'MIXED',
        tenureLabel: '분양+임대 혼합단지',
        rentalSubType,
        hallType: finalHallType,
        totalHouseholds: kaptHouseholds,
      }
    }

    if (isRental) {
      const isPrivateBrand = /(부영|사랑으로|뉴스테이|민간임대|청년안심)/.test(combinedNameText)
      const label = rentalSubType
        ? `공공임대: ${rentalSubType}`
        : isPrivateBrand
          ? '민간임대단지'
          : '임대단지'
      return {
        tenureCategory: 'RENTAL',
        tenureLabel: label,
        rentalSubType,
        hallType: finalHallType,
        totalHouseholds: kaptHouseholds,
      }
    }

    if (isSale) {
      return {
        tenureCategory: 'SALE',
        tenureLabel: '분양단지',
        hallType: finalHallType,
        totalHouseholds: kaptHouseholds,
      }
    }
  }

  // K-APT 미등록 소규모 공동주택이지만 마이홈포털 공공임대 단지로 확인된 경우 (예: 소규모 행복주택, 국민임대 등)
  if (rentalSubType) {
    return {
      tenureCategory: 'RENTAL',
      tenureLabel: `공공임대: ${rentalSubType}`,
      rentalSubType,
      hallType: finalHallType,
    }
  }

  // API 미신청 상태 또는 비의무관리 단지일 때 건물명/동명 기반 확실한 임대 키워드 보조 판별
  if (/행복주택/.test(combinedNameText)) {
    return { tenureCategory: 'RENTAL', tenureLabel: '공공임대: 행복주택', rentalSubType: '행복주택', hallType: finalHallType }
  }
  if (/국민임대/.test(combinedNameText)) {
    return { tenureCategory: 'RENTAL', tenureLabel: '공공임대: 국민임대', rentalSubType: '국민임대', hallType: finalHallType }
  }
  if (/영구임대/.test(combinedNameText)) {
    return { tenureCategory: 'RENTAL', tenureLabel: '공공임대: 영구임대', rentalSubType: '영구임대', hallType: finalHallType }
  }
  if (/장기전세|시프트/.test(combinedNameText)) {
    return { tenureCategory: 'RENTAL', tenureLabel: '공공임대: 장기전세', rentalSubType: '장기전세', hallType: finalHallType }
  }
  if (/청년안심주택|역세권청년주택/.test(combinedNameText)) {
    return { tenureCategory: 'RENTAL', tenureLabel: '임대단지: 청년주택', hallType: finalHallType }
  }
  if (/민간임대|뉴스테이/.test(combinedNameText)) {
    return { tenureCategory: 'RENTAL', tenureLabel: '민간임대단지', hallType: finalHallType }
  }
  if (/임대동|\(임대\)/.test(combinedNameText)) {
    return { tenureCategory: 'RENTAL', tenureLabel: '임대단지', hallType: finalHallType }
  }

  return { hallType: finalHallType, totalHouseholds: kaptHouseholds }
}

function mergeTenureIntoUnitArea(info: UnitAreaInfo, meta: ComplexTenureMetadata): UnitAreaInfo {
  return {
    ...info,
    tenureCategory: meta.tenureCategory || info.tenureCategory,
    tenureLabel: meta.tenureLabel || info.tenureLabel,
    rentalSubType: meta.rentalSubType || info.rentalSubType,
    hallType: meta.hallType || info.hallType,
    totalHouseholds: meta.totalHouseholds || info.totalHouseholds,
  }
}

export async function lookupApartmentUnitArea(
  req: LookupBuildingAreaRequest
): Promise<LookupBuildingAreaResponse> {
  const user = await verifyAuthenticatedUser()
  if (!user) {
    return { success: false, errorCode: 'UNAUTHORIZED', error: '로그인이 필요합니다.' }
  }

  const parsedFromAddr = extractDongHoFloorFromText(req.address)
  const rawDong = (req.dong?.trim() || parsedFromAddr.dong || '').trim()
  const rawHo = (req.ho?.trim() || parsedFromAddr.ho || '').trim()
  const normDong = normalizeDongKey(rawDong)
  const normHo = normalizeHoKey(rawHo)
  const inferredFloor = inferFloorFromHo(rawHo || parsedFromAddr.ho)

  if (!normHo) {
    return {
      success: false,
      errorCode: 'MISSING_HO',
      inferredFloor,
      error: '평형 조회를 위해 호수(예: 101동 1502호 또는 1502호)를 입력해주세요.',
    }
  }

  const serviceKey = await resolveDataGoKrApiKey()
  if (!serviceKey) {
    return {
      success: false,
      errorCode: 'MISSING_API_KEY',
      inferredFloor,
      error: '공공데이터포털 무료 일반 인증키 1회 등록이 필요합니다.',
    }
  }

  const bjdMeta = await resolveAddressToBjdMeta(req.address, req.addressMeta)
  if (!bjdMeta || bjdMeta.bcode.length !== 10) {
    return {
      success: false,
      errorCode: 'ADDRESS_NOT_FOUND',
      inferredFloor,
      error: '주소의 법정동·지번 코드를 찾을 수 없습니다. [검색] 버튼으로 정확한 주소를 먼저 선택해주세요.',
    }
  }

  // 건축물대장 면적 조회와 동시에 K-APT 단지목록 & 마이홈포털 공공임대 목록을 병렬 프리페치 (지연 최소화)
  const kaptListPromise = fetchKaptListByBjd(serviceKey, bjdMeta.bcode).catch(() => [])
  const myHomeListPromise = fetchMyHomeRentalListBySigungu(serviceKey, bjdMeta.bcode).catch(() => [])

  const sigunguCd = bjdMeta.bcode.slice(0, 5)
  const bjdongCd = bjdMeta.bcode.slice(5, 10)
  const { platGbCd, bun, ji } = bjdMeta

  // 건축물대장 동/호 표기 편차("101동" vs "101" vs "제101동", "1502호" vs "1502") 대응 다단계 조회
  const hoQueryCandidates = Array.from(new Set([`${normHo}호`, normHo]))
  let collectedRows: RawAreaRow[] = []

  if (normDong) {
    // 1차: 동+호 정확 지정 빠른 조회
    const dongVariants = Array.from(new Set([`${normDong}동`, normDong]))
    outer: for (const dVar of dongVariants) {
      for (const hVar of hoQueryCandidates) {
        const res = await fetchExposPubuseAreaRows({
          serviceKey,
          sigunguCd,
          bjdongCd,
          platGbCd,
          bun,
          ji,
          dongNm: dVar,
          hoNm: hVar,
          numOfRows: 100,
        })
        if (res.authError) {
          return { success: false, errorCode: 'INVALID_API_KEY', inferredFloor, error: res.authError }
        }
        if (res.rows.length > 0) {
          collectedRows = res.rows
          break outer
        }
      }
    }
  }

  // 2차: 1차에서 못 찾았거나("제101동" 등 표기 차이) 동을 미입력한 경우 호수만으로 전체 동 조회 후 정규화 매칭
  if (collectedRows.length === 0) {
    for (const hVar of hoQueryCandidates) {
      const res = await fetchExposPubuseAreaRows({
        serviceKey,
        sigunguCd,
        bjdongCd,
        platGbCd,
        bun,
        ji,
        hoNm: hVar,
        numOfRows: 400,
      })
      if (res.authError) {
        return { success: false, errorCode: 'INVALID_API_KEY', inferredFloor, error: res.authError }
      }
      if (res.rows.length > 0) {
        collectedRows = res.rows
        break
      }
    }
  }

  // 호수 정규화 일치 필터링
  const hoMatchedRows = collectedRows.filter(r => normalizeHoKey(r.hoNm) === normHo)
  if (hoMatchedRows.length === 0) {
    return {
      success: false,
      errorCode: 'UNIT_NOT_FOUND',
      inferredFloor,
      error: `건축물대장에서 [${rawDong ? `${rawDong}동 ` : ''}${rawHo}호] 세대 면적 정보를 찾지 못했습니다. 동·호수를 다시 확인해주세요.`,
    }
  }

  // 동(dongNm)별로 그룹화
  const byDong = new Map<string, RawAreaRow[]>()
  for (const r of hoMatchedRows) {
    const dLabel = (r.dongNm ? String(r.dongNm).trim() : '') || '단일동'
    if (!byDong.has(dLabel)) byDong.set(dLabel, [])
    byDong.get(dLabel)!.push(r)
  }

  // 사용자가 동을 입력한 경우 정규화 일치 동 우선 선택
  if (normDong) {
    let matchedRows: RawAreaRow[] | undefined
    for (const [dLabel, rows] of byDong.entries()) {
      const key = normalizeDongKey(dLabel)
      if (key === normDong || key.endsWith(normDong) || normDong.endsWith(key)) {
        matchedRows = rows
        break
      }
    }
    if (!matchedRows && byDong.size === 1) {
      matchedRows = Array.from(byDong.values())[0]
    }
    if (matchedRows) {
      const info = buildUnitAreaFromRows(matchedRows, bjdMeta.buildingName || '', inferredFloor)
      if (info) {
        const tenureMeta = await resolveComplexTenureMetadata({
          serviceKey,
          bjdMeta,
          rawAddress: req.address,
          bldNmFromRegistry: info.buildingName,
          dongNmFromRegistry: info.dongNm,
          kaptListPromise,
          myHomeListPromise,
        })
        const enriched = mergeTenureIntoUnitArea(info, tenureMeta)
        return { success: true, unitArea: enriched, inferredFloor: enriched.floor || inferredFloor }
      }
    }
  }

  // 동을 입력하지 않았거나 동 매칭 후보가 여러 개인 경우 각 동별 평형 계산
  const candidateInfos: Array<{ dongLabel: string; info: UnitAreaInfo }> = []
  for (const [dLabel, rows] of byDong.entries()) {
    const info = buildUnitAreaFromRows(rows, bjdMeta.buildingName || '', inferredFloor)
    if (info) {
      candidateInfos.push({ dongLabel: dLabel, info })
    }
  }

  if (candidateInfos.length === 0) {
    return {
      success: false,
      errorCode: 'UNIT_NOT_FOUND',
      inferredFloor,
      error: '해당 호수의 전용면적 정보를 산출할 수 없습니다.',
    }
  }

  const primaryInfo = candidateInfos[0].info
  const tenureMeta = await resolveComplexTenureMetadata({
    serviceKey,
    bjdMeta,
    rawAddress: req.address,
    bldNmFromRegistry: primaryInfo.buildingName,
    dongNmFromRegistry: primaryInfo.dongNm,
    kaptListPromise,
    myHomeListPromise,
  })
  const enrichedPrimary = mergeTenureIntoUnitArea(primaryInfo, tenureMeta)

  // 단일 동이거나 모든 동의 평형대가 동일한 경우 즉시 확정 반환
  const uniquePyeongs = new Set(candidateInfos.map(c => c.info.pyeongType))
  if (candidateInfos.length === 1 || uniquePyeongs.size === 1) {
    return {
      success: true,
      unitArea: enrichedPrimary,
      inferredFloor: enrichedPrimary.floor || inferredFloor,
    }
  }

  // 단지 내 여러 동에 같은 호수가 있고 동마다 평형대가 다른 경우 동 선택 후보 함께 제공
  const dongCandidates: DongCandidateSummary[] = candidateInfos
    .map(c => ({
      dongNm: c.dongLabel,
      pyeongType: c.info.pyeongType,
      supplyAreaM2: c.info.supplyAreaM2,
      exclusiveAreaM2: c.info.exclusiveAreaM2,
    }))
    .sort((a, b) => a.dongNm.localeCompare(b.dongNm, 'ko', { numeric: true }))

  return {
    success: true,
    unitArea: enrichedPrimary,
    inferredFloor: enrichedPrimary.floor || inferredFloor,
    dongCandidates,
    needsDongSelection: true,
  }
}
