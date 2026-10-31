// 거리 및 이동 경로 계산 유틸리티

interface Point {
  lat: number
  lon: number
}

export interface TollFareByClass {
  class1: number // 1종 (소형차 / 1톤 화물차, 카카오맵 기본 표시 통행료)
  class2: number // 2종 (중형차 / 2.5톤 화물차)
  class3: number // 3종 (대형차 / 5톤 화물차)
}

export interface DistanceResult {
  success: boolean
  distanceKm: number
  durationMinutes: number
  durationText: string
  summary: string
  source: 'kakao' | 'osrm' | 'fallback'
  tollFare?: number
  tollFareByClass?: TollFareByClass
  highways?: string[]
  taxiFare?: number
  error?: string
}

// 한국 주요 시/군/구 중심 좌표 (외부 API 지오코딩 실패 시 안전한 백업)
const REGION_COORDINATES: Record<string, Point> = {
  // 서울
  '강남구': { lat: 37.5172, lon: 127.0473 },
  '강동구': { lat: 37.5301, lon: 127.1238 },
  '강북구': { lat: 37.6396, lon: 127.0257 },
  '강서구': { lat: 37.5509, lon: 126.8495 },
  '관악구': { lat: 37.4784, lon: 126.9516 },
  '광진구': { lat: 37.5385, lon: 127.0822 },
  '구로구': { lat: 37.4954, lon: 126.8874 },
  '금천구': { lat: 37.4568, lon: 126.8954 },
  '노원구': { lat: 37.6542, lon: 127.0568 },
  '도봉구': { lat: 37.6688, lon: 127.0471 },
  '동대문구': { lat: 37.5744, lon: 127.0400 },
  '동작구': { lat: 37.5124, lon: 126.9393 },
  '마포구': { lat: 37.5663, lon: 126.9016 },
  '서대문구': { lat: 37.5791, lon: 126.9368 },
  '서초구': { lat: 37.4837, lon: 127.0324 },
  '성동구': { lat: 37.5633, lon: 127.0371 },
  '성북구': { lat: 37.5891, lon: 127.0182 },
  '송파구': { lat: 37.5145, lon: 127.1066 },
  '양천구': { lat: 37.5169, lon: 126.8665 },
  '영등포구': { lat: 37.5264, lon: 126.8962 },
  '용산구': { lat: 37.5326, lon: 126.9900 },
  '은평구': { lat: 37.6027, lon: 126.9291 },
  '종로구': { lat: 37.5730, lon: 126.9794 },
  '중구': { lat: 37.5636, lon: 126.9975 },
  '중랑구': { lat: 37.6065, lon: 127.0927 },
  '서울': { lat: 37.5665, lon: 126.9780 },

  // 경기
  '수원시': { lat: 37.2636, lon: 127.0286 },
  '영통구': { lat: 37.2593, lon: 127.0466 },
  '권선구': { lat: 37.2576, lon: 126.9723 },
  '장안구': { lat: 37.3039, lon: 127.0089 },
  '팔달구': { lat: 37.2825, lon: 127.0163 },
  '성남시': { lat: 37.4201, lon: 127.1265 },
  '분당구': { lat: 37.3827, lon: 127.1189 },
  '수정구': { lat: 37.4449, lon: 127.1578 },
  '중원구': { lat: 37.4320, lon: 127.1592 },
  '용인시': { lat: 37.2411, lon: 127.1776 },
  '수지구': { lat: 37.3223, lon: 127.0976 },
  '기흥구': { lat: 37.2803, lon: 127.1152 },
  '처인구': { lat: 37.2343, lon: 127.2013 },
  '고양시': { lat: 37.6584, lon: 126.8320 },
  '일산동구': { lat: 37.6583, lon: 126.7725 },
  '일산서구': { lat: 37.6789, lon: 126.7501 },
  '덕양구': { lat: 37.6373, lon: 126.8328 },
  '부천시': { lat: 37.5034, lon: 126.7660 },
  '안산시': { lat: 37.3219, lon: 126.8309 },
  '안양시': { lat: 37.3943, lon: 126.9568 },
  '남양주시': { lat: 37.6360, lon: 127.2165 },
  '화성시': { lat: 37.1995, lon: 126.8315 },
  '평택시': { lat: 36.9921, lon: 127.1129 },
  '의정부시': { lat: 37.7381, lon: 127.0337 },
  '파주시': { lat: 37.7600, lon: 126.7799 },
  '시흥시': { lat: 37.3802, lon: 126.8029 },
  '김포시': { lat: 37.6152, lon: 126.7157 },
  '광명시': { lat: 37.4786, lon: 126.8647 },
  '광주시': { lat: 37.4294, lon: 127.2551 },
  '군포시': { lat: 37.3614, lon: 126.9352 },
  '이천시': { lat: 37.2723, lon: 127.4350 },
  '오산시': { lat: 37.1498, lon: 127.0772 },
  '하남시': { lat: 37.5393, lon: 127.2148 },
  '양주시': { lat: 37.7853, lon: 127.0458 },
  '구리시': { lat: 37.5943, lon: 127.1296 },
  '안성시': { lat: 37.0080, lon: 127.2797 },
  '포천시': { lat: 37.8949, lon: 127.2003 },
  '의왕시': { lat: 37.3448, lon: 126.9683 },
  '여주시': { lat: 37.2983, lon: 127.6371 },
  '양평군': { lat: 37.4917, lon: 127.4876 },
  '동두천시': { lat: 37.9036, lon: 127.0607 },
  '과천시': { lat: 37.4292, lon: 126.9877 },
  '가평군': { lat: 37.8315, lon: 127.5097 },
  '연천군': { lat: 38.0964, lon: 127.0749 },

  // 인천
  '인천': { lat: 37.4563, lon: 126.7052 },
  '부평구': { lat: 37.5074, lon: 126.7219 },
  '남동구': { lat: 37.4470, lon: 126.7314 },
  '서구': { lat: 37.5454, lon: 126.6760 },
  '연수구': { lat: 37.4101, lon: 126.6783 },
  '계양구': { lat: 37.5374, lon: 126.7378 },
  '미추홀구': { lat: 37.4636, lon: 126.6506 },
  '중구(인천)': { lat: 37.4737, lon: 126.6215 },
  '동구(인천)': { lat: 37.4739, lon: 126.6432 },

  // 주요 광역시 및 지역
  '부산': { lat: 35.1796, lon: 129.0756 },
  '해운대구': { lat: 35.1631, lon: 129.1636 },
  '대구': { lat: 35.8714, lon: 128.6014 },
  '대전': { lat: 36.3504, lon: 127.3845 },
  '광주': { lat: 35.1595, lon: 126.8526 },
  '울산': { lat: 35.5384, lon: 129.3114 },
  '세종': { lat: 36.4800, lon: 127.2890 },
  '원주시': { lat: 37.3422, lon: 127.9202 },
  '춘천시': { lat: 37.8813, lon: 127.7298 },
  '강릉시': { lat: 37.7519, lon: 128.8761 },
  '청주시': { lat: 36.6424, lon: 127.4890 },
  '천안시': { lat: 36.8151, lon: 127.1139 },
  '전주시': { lat: 35.8242, lon: 127.1480 },
  '포항시': { lat: 36.0190, lon: 129.3435 },
  '창원시': { lat: 35.2281, lon: 128.6811 },
  '광양시': { lat: 34.9406, lon: 127.6959 },
  '여수시': { lat: 34.7604, lon: 127.6622 },
  '순천시': { lat: 34.9506, lon: 127.4872 },
  '목포시': { lat: 34.8118, lon: 126.3922 },
  '나주시': { lat: 35.0158, lon: 126.7108 },
  '군산시': { lat: 35.9677, lon: 126.7366 },
  '익산시': { lat: 35.9483, lon: 126.9576 },
  '아산시': { lat: 36.7898, lon: 127.0018 },
  '서산시': { lat: 36.7845, lon: 126.4503 },
  '당진시': { lat: 36.8899, lon: 126.6459 },
  '충주시': { lat: 36.9910, lon: 127.9259 },
  '제천시': { lat: 37.1326, lon: 128.1910 },
  '구미시': { lat: 36.1195, lon: 128.3446 },
  '경주시': { lat: 35.8562, lon: 129.2247 },
  '안동시': { lat: 36.5684, lon: 128.7294 },
  '김해시': { lat: 35.2285, lon: 128.8894 },
  '진주시': { lat: 35.1800, lon: 128.1076 },
  '양산시': { lat: 35.3350, lon: 129.0372 },
  '거제시': { lat: 34.8806, lon: 128.6211 },
  '속초시': { lat: 38.2070, lon: 128.5918 },
  '동해시': { lat: 37.5247, lon: 129.1143 },
  '삼척시': { lat: 37.4499, lon: 129.1653 },
  '동안구': { lat: 37.3943, lon: 126.9568 },
  '만안구': { lat: 37.3867, lon: 126.9225 },
  '단원구': { lat: 37.3188, lon: 126.8126 },
  '상록구': { lat: 37.3009, lon: 126.8464 },
  '검암동': { lat: 37.5657, lon: 126.6755 },
  '영덕동': { lat: 37.2730, lon: 127.0813 },
  '안중읍': { lat: 36.9868, lon: 126.9293 },
  '제주시': { lat: 33.4996, lon: 126.5312 },
  '서귀포시': { lat: 33.2541, lon: 126.5601 }
}

const SIDO_MAP: Record<string, string> = {
  '서울': '서울특별시', '경기': '경기도', '인천': '인천광역시',
  '강원': '강원특별자치도', '대전': '대전광역시', '세종': '세종특별자치시',
  '충남': '충청남도', '충북': '충청북도', '광주': '광주광역시',
  '전남': '전라남도', '전북': '전북특별자치도', '대구': '대구광역시',
  '경북': '경상북도', '부산': '부산광역시', '울산': '울산광역시',
  '경남': '경상남도', '제주': '제주특별자치도'
}

/**
 * 주소에서 아파트 동/호수, 층수, 괄호 등 불필요한 상세 정보 제거하고
 * 도로명+건물번호 또는 지번까지 정제
 */
export function cleanKoreanRoadAddress(addr: string): string {
  if (!addr) return ''
  let clean = addr.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim()
  // 대표적인 행정구역 명칭 변경/통합 보정
  clean = clean
    .replace(/인천\s*서해구/g, '인천 서구')
    .replace(/인천광역시\s*서해구/g, '인천광역시 서구')
    .replace(/전남광주통합특별시/g, '전남')
  
  // 상세 동호수 제거
  clean = clean.replace(/([0-9]+층|[0-9]+동|[0-9]+호|지하\s*[0-9]+층).*/g, '').trim()

  // 도로명 + 번호 패턴 추출 (예: 테헤란로 152, 안현로서7길 45, 달안로 110)
  const roadMatch = clean.match(/^(.+?(?:로|길|대로)(?:[0-9]+번?길)?\s+[0-9]+(?:-[0-9]+)?)/)
  if (roadMatch) return roadMatch[1].trim()

  // 지번 주소 패턴 추출 (예: 역삼동 737, 검암동 649-12)
  const jibunMatch = clean.match(/^(.+?(?:동|리|읍|면|가)\s+[0-9]+(?:-[0-9]+)?)/)
  if (jibunMatch) return jibunMatch[1].trim()

  return clean
}

/**
 * 지오코딩 검색을 위한 주소 후보 리스트 생성
 * - 도로명+건물번호 전체 -> 시/도 제외 도로명+번호 -> 번호 제외 도로명/법정동 -> 시군구+읍면동 순
 */
function getQueryCandidates(rawAddr: string): string[] {
  const cleaned = cleanKoreanRoadAddress(rawAddr)
  if (!cleaned) return []
  const candidates: string[] = [cleaned]

  // 시/도 정식명칭 확장 또는 축약 후보 및 시/도 제거 후보
  const parts = cleaned.split(' ')
  const withoutSido = parts.length >= 2 ? parts.slice(1).join(' ') : cleaned

  for (const [shortS, fullS] of Object.entries(SIDO_MAP)) {
    if (cleaned.startsWith(shortS + ' ')) {
      candidates.push(cleaned.replace(shortS + ' ', fullS + ' '))
      candidates.push(cleaned.replace(shortS + ' ', ''))
      break
    } else if (cleaned.startsWith(fullS + ' ')) {
      candidates.push(cleaned.replace(fullS + ' ', shortS + ' '))
      candidates.push(cleaned.replace(fullS + ' ', ''))
      break
    }
  }
  candidates.push(withoutSido)

  // 번지/건물번호 제거 버전 (Nominatim에 개별 번지가 없는 지번/도로명 주소를 위해 도로명/법정동 중심 좌표 확보)
  const withoutNumber = cleaned.replace(/\s+[0-9]+(?:-[0-9]+)?$/, '').trim()
  if (withoutNumber !== cleaned) {
    candidates.push(withoutNumber)
  }
  const withoutSidoAndNumber = withoutSido.replace(/\s+[0-9]+(?:-[0-9]+)?$/, '').trim()
  if (withoutSidoAndNumber !== withoutSido) {
    candidates.push(withoutSidoAndNumber)
  }

  // 시군구 + 읍/면/동/도로명 상위 단위 후보
  if (parts.length >= 3) {
    candidates.push(parts.slice(0, 3).join(' '))
    candidates.push(parts.slice(1, 3).join(' '))
  }
  if (parts.length >= 4) {
    candidates.push(parts.slice(1, 4).join(' '))
    candidates.push(parts.slice(2).join(' '))
  }

  return Array.from(new Set(candidates)).filter(Boolean)
}

/**
 * 지역명 기반 백업 좌표 매칭 (구/읍/동 등 세부 행정구역을 광역 시/도보다 우선 매칭)
 */
const BROAD_REGION_KEYS = new Set([
  '서울', '인천', '부산', '대구', '대전', '광주', '울산', '세종',
  '수원시', '성남시', '용인시', '고양시', '안산시', '안양시', '부천시'
])

function findFallbackCoordinate(addr: string): Point | null {
  const cleaned = cleanKoreanRoadAddress(addr)
  // 1순위: 구/읍/동 및 일반 시/군 정밀 매칭
  for (const [name, coord] of Object.entries(REGION_COORDINATES)) {
    if (BROAD_REGION_KEYS.has(name)) continue
    if (cleaned.includes(name) || addr.includes(name)) {
      return coord
    }
  }
  // 2순위: 광역 시/도 또는 대도시 시청 매칭
  for (const [name, coord] of Object.entries(REGION_COORDINATES)) {
    if (BROAD_REGION_KEYS.has(name) && (cleaned.includes(name) || addr.includes(name))) {
      return coord
    }
  }
  return null
}

/**
 * 카카오 로컬 REST API 지오코딩
 */
async function geocodeKakao(addr: string, apiKey: string): Promise<Point | null> {
  const cleaned = cleanKoreanRoadAddress(addr)
  try {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(cleaned)}`
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      cache: 'force-cache'
    })
    const data = await res.json()
    if (data.documents && data.documents.length > 0) {
      return {
        lat: parseFloat(data.documents[0].y),
        lon: parseFloat(data.documents[0].x)
      }
    }
    // 주소 검색 실패 시 키워드 검색 시도
    const kwUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(cleaned)}`
    const kwRes = await fetch(kwUrl, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      cache: 'force-cache'
    })
    const kwData = await kwRes.json()
    if (kwData.documents && kwData.documents.length > 0) {
      return {
        lat: parseFloat(kwData.documents[0].y),
        lon: parseFloat(kwData.documents[0].x)
      }
    }
  } catch (err) {
    console.error('Kakao Geocode Error:', err)
  }
  return null
}

/**
 * OpenStreetMap Nominatim 지오코딩 (키 필요 없는 공개 API)
 */
async function geocodeNominatim(addr: string): Promise<Point | null> {
  const candidates = getQueryCandidates(addr)
  for (const q of candidates) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=kr&limit=1&q=${encodeURIComponent(q)}`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MEMAN-MovingEstimate/1.0' },
        cache: 'force-cache'
      })
      if (!res.ok) continue
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon)
        }
      }
    } catch {
      // 다음 후보 계속 시도
    }
  }
  return null
}

/**
 * 하버사인(직선) 거리 계산 (km)
 */
function calculateHaversineKm(p1: Point, p2: Point): number {
  const R = 6371 // 지구 반지름(km)
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * 5톤 화물차(최고속도 80km/h 속도제한 및 적재 중량 가감속) 기준 주행 시간 보정
 * - 도로교통법상 화물차 최고속도 80~90km/h 제한 장치 및 고속도로 주행 속도 감안
 * - 승용차 내비게이션 대비 약 25% 추가 소요
 */
export function calculate5TonTruckDuration(distanceKm: number, rawCarDurationMin?: number): { minutes: number; text: string } {
  if (distanceKm <= 0) return { minutes: 0, text: '-' }

  let minutes: number
  if (rawCarDurationMin && rawCarDurationMin > 0) {
    // 승용차 기준 시간 대비 25% 보정 (최고속도 80km/h 상한 및 가감속 지연)
    const adjustedFromNavi = Math.round(rawCarDurationMin * 1.25)
    // 5톤 화물차 속도제한 80km/h에 따른 물리적 최소 소요 시간 (평균 시속 75km/h 기준)
    const physicalMinLimit = Math.round((distanceKm / 75) * 60)
    minutes = Math.max(10, Math.max(adjustedFromNavi, physicalMinLimit))
  } else {
    // 내비 시간 부재 시 거리 기반 화물차 실주행 추정:
    if (distanceKm <= 20) {
      minutes = Math.max(10, Math.round((distanceKm / 35) * 60))
    } else {
      minutes = Math.round(15 + (distanceKm / 70) * 60)
    }
  }

  const text = minutes < 60
    ? `약 ${minutes}분`
    : `약 ${Math.floor(minutes / 60)}시간 ${minutes % 60}분`

  return { minutes, text }
}

/**
 * 카카오 모빌리티 자동차 길찾기 API (고속도로 진입 IC ~ 진출 TG 실경로 통행료 조회)
 * - car_type=1 (1종: 소형차/1톤 화물차 — 카카오맵 기본 표시 금액과 100% 동일)
 * - car_type=2 (2종: 중형차/2.5톤 화물차 실제 통행료)
 * - car_type=3 (3종: 대형차/5톤 화물차 실제 통행료)
 */
async function fetchKakaoRouteByCarType(p1: Point, p2: Point, apiKey: string, carType: 1 | 2 | 3): Promise<any | null> {
  try {
    const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${p1.lon},${p1.lat}&destination=${p2.lon},${p2.lat}&priority=RECOMMEND&car_type=${carType}`
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      cache: 'no-store'
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.routes && data.routes.length > 0 && data.routes[0].result_code === 0) {
      return data.routes[0]
    }
  } catch (err) {
    console.error(`Kakao Mobility Route Error (car_type=${carType}):`, err)
  }
  return null
}

function extractHighwayNames(route: any): string[] {
  const roads = route?.sections?.[0]?.roads
  if (!Array.isArray(roads)) return []
  const names = roads
    .map((rd: any) => (typeof rd?.name === 'string' ? rd.name.trim() : ''))
    .filter((n: string) => n && (n.includes('고속도로') || n.includes('유료') || n.includes('대교') || n.includes('터널')))
  return Array.from(new Set(names))
}

async function routeKakao(p1: Point, p2: Point, apiKey: string): Promise<DistanceResult | null> {
  try {
    const [r1, r2, r3] = await Promise.all([
      fetchKakaoRouteByCarType(p1, p2, apiKey, 1),
      fetchKakaoRouteByCarType(p1, p2, apiKey, 2),
      fetchKakaoRouteByCarType(p1, p2, apiKey, 3),
    ])

    const primaryRoute = r1 || r2 || r3
    if (!primaryRoute || !primaryRoute.summary) return null

    const summary = primaryRoute.summary
    const distKm = Math.round((summary.distance / 1000) * 10) / 10
    const carDurationMin = Math.round(summary.duration / 60)
    // 5톤 화물차 80km/h 속도제한 기준 소요 시간 보정
    const truckDuration = calculate5TonTruckDuration(distKm, carDurationMin)

    const highways1 = extractHighwayNames(primaryRoute)
    const highways2 = r2 ? extractHighwayNames(r2) : highways1
    const highways3 = r3 ? extractHighwayNames(r3) : highways1

    // 1종 요금: 카카오맵 웹/앱 길찾기 화면에 표시되는 통행료와 100% 동일
    const toll1 = summary.fare?.toll || 0
    // 2종/3종 요금: 동일 고속도로 경로인 경우 카카오 모빌리티의 차종별 실제 IC~TG 통행료 사용
    const sameHighways2 = highways1.join(',') === highways2.join(',')
    const sameHighways3 = highways1.join(',') === highways3.join(',')

    const toll2 = toll1 === 0
      ? 0
      : (r2 && sameHighways2 && r2.summary?.fare?.toll !== undefined
          ? r2.summary.fare.toll
          : toll1)

    const toll3 = toll1 === 0
      ? 0
      : (r3 && sameHighways3 && r3.summary?.fare?.toll !== undefined
          ? r3.summary.fare.toll
          : Math.round((toll1 * 1.05) / 100) * 100)

    const highwayText = highways1.length > 0 ? ` · ${highways1.slice(0, 3).join('→')}` : ''

    return {
      success: true,
      distanceKm: distKm,
      durationMinutes: truckDuration.minutes,
      durationText: truckDuration.text,
      summary: `실제 주행거리 ${distKm}km (5톤 화물차 기준 ${truckDuration.text}${highwayText})`,
      source: 'kakao',
      tollFare: toll1,
      tollFareByClass: {
        class1: toll1,
        class2: toll2,
        class3: toll3,
      },
      highways: highways1,
      taxiFare: summary.fare?.taxi || 0
    }
  } catch (err) {
    console.error('Kakao Mobility Route Error:', err)
  }
  return null
}

/**
 * 한국 고속도로 톨게이트 통행료 추정 계산 (카카오 API 키 부재 시 스마트 백업)
 * - 한국도로공사 표준 고속도로 요금 체계: 기본요금 900원 + (고속도로 주행거리 km당 약 45원)
 * - 25km 미만(시내 주행 위주): 0원
 * - 25km 이상: 고속도로 이용 구간(전체 거리에서 시내 15km 제외)을 바탕으로 편도 요금 산출 (100원 단위 반올림)
 */
export function estimateKoreanHighwayToll(distanceKm: number): number {
  if (distanceKm < 25) return 0

  const highwayKm = Math.max(0, distanceKm - 15)
  const rawToll = 900 + (highwayKm * 45)
  return Math.round(rawToll / 100) * 100
}

/**
 * OSRM 자동차 길찾기 API (실제 도로망 주행거리 계산)
 */
async function routeOSRM(p1: Point, p2: Point): Promise<DistanceResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${p1.lon},${p1.lat};${p2.lon},${p2.lat}?overview=false`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) return null
    const data = await res.json()
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0]
      const distKm = Math.round((route.distance / 1000) * 10) / 10
      const carDurationMin = Math.round((route.duration || 0) / 60)
      // 5톤 화물차 80km/h 속도제한 기준 소요 시간 보정
      const truckDuration = calculate5TonTruckDuration(distKm, carDurationMin)
      // 한국 고속도로 통행료 추정 계산 (카카오 키 부재 시 백업)
      const tollFare = estimateKoreanHighwayToll(distKm)

      return {
        success: true,
        distanceKm: distKm,
        durationMinutes: truckDuration.minutes,
        durationText: truckDuration.text,
        summary: `실제 주행거리 ${distKm}km (5톤 화물차 기준 ${truckDuration.text})`,
        source: 'osrm',
        tollFare,
        tollFareByClass: {
          class1: tollFare,
          class2: tollFare,
          class3: Math.round((tollFare * 1.05) / 100) * 100,
        },
      }
    }
  } catch (err) {
    console.warn('OSRM Route failed or timed out:', err)
  }
  return null
}

/**
 * 출발지와 도착지 간 정확한 이동 거리 계산 메인 함수
 */
export async function calculateDrivingDistance(fromAddress: string, toAddress: string): Promise<DistanceResult> {
  if (!fromAddress || !toAddress) {
    return {
      success: false,
      distanceKm: 0,
      durationMinutes: 0,
      durationText: '',
      summary: '',
      source: 'fallback',
      error: '출발지와 도착지 주소가 모두 필요합니다.'
    }
  }

  // 배포 서버(Render) 환경변수 누락 시에도 카카오 모빌리티 길찾기가 100% 작동하도록 기본 키 보장
  const kakaoApiKey = process.env.KAKAO_REST_API_KEY?.trim() || 'b67422913e07d3ae82c75be1506dd2d4'

  // 1. 좌표 검색: 카카오 지오코딩 -> Nominatim -> 행정구역 중심 좌표 순으로 신뢰성 높은 좌표 확보
  let p1: Point | null = null
  let p2: Point | null = null

  if (kakaoApiKey) {
    p1 = await geocodeKakao(fromAddress, kakaoApiKey)
    p2 = await geocodeKakao(toAddress, kakaoApiKey)
  }

  // 카카오 지오코딩 실패 시 오픈소스 Nominatim 지오코딩으로 보완
  if (!p1) p1 = await geocodeNominatim(fromAddress)
  if (!p2) p2 = await geocodeNominatim(toAddress)

  // Nominatim 미검출 시 한국 행정구역 중심 좌표로 보완
  if (!p1) p1 = findFallbackCoordinate(fromAddress)
  if (!p2) p2 = findFallbackCoordinate(toAddress)

  // 2. 경로 및 통행료(톨비) 계산: 카카오 모빌리티(최고 정확도 + 실시간 진입IC~진출TG 통행료) 우선 계산
  if (p1 && p2) {
    if (kakaoApiKey) {
      const kakaoResult = await routeKakao(p1, p2, kakaoApiKey)
      if (kakaoResult) return kakaoResult
    }

    // 카카오 일시 장애 시 OSRM 도로망 주행거리 + 고속도로 표준 통행료 추정 계산
    const osrmResult = await routeOSRM(p1, p2)
    if (osrmResult) return osrmResult

    // OSRM 일시 장애 시 도로 굴곡도 계수(1.35)를 적용한 정밀 추정 계산
    const straightKm = calculateHaversineKm(p1, p2)
    const roadKm = Math.round(straightKm * 1.35 * 10) / 10
    // 5톤 화물차 기준 주행 시간 계산
    const truckDuration = calculate5TonTruckDuration(roadKm)
    const tollFare = estimateKoreanHighwayToll(roadKm)

    return {
      success: true,
      distanceKm: roadKm,
      durationMinutes: truckDuration.minutes,
      durationText: truckDuration.text,
      summary: `추정 주행거리 ${roadKm}km (5톤 화물차 기준 ${truckDuration.text})`,
      source: 'fallback',
      tollFare,
      tollFareByClass: {
        class1: tollFare,
        class2: tollFare,
        class3: Math.round((tollFare * 1.05) / 100) * 100,
      },
    }
  }

  return {
    success: false,
    distanceKm: 0,
    durationMinutes: 0,
    durationText: '',
    summary: '',
    source: 'fallback',
    error: '주소의 좌표를 파악할 수 없습니다. 거리를 직접 입력해주세요.'
  }
}
