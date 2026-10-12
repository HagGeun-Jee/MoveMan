// 거리 및 이동 경로 계산 유틸리티

interface Point {
  lat: number
  lon: number
}

export interface DistanceResult {
  success: boolean
  distanceKm: number
  durationMinutes: number
  durationText: string
  summary: string
  source: 'kakao' | 'osrm' | 'fallback'
  tollFare?: number
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
  
  // 도로명 + 번호 패턴 추출 (예: 테헤란로 152, 세종대로 110, 매영로 345)
  const roadMatch = clean.match(/^(.+?(?:로|길|대로)\s+[0-9]+(?:-[0-9]+)?)/)
  if (roadMatch) return roadMatch[1].trim()

  // 지번 주소 패턴 추출 (예: 역삼동 737, 매탄동 123-4)
  const jibunMatch = clean.match(/^(.+?(?:동|리|읍|면)\s+[0-9]+(?:-[0-9]+)?)/)
  if (jibunMatch) return jibunMatch[1].trim()

  // 상세 동호수 제거
  clean = clean.replace(/([0-9]+층|[0-9]+동|[0-9]+호|지하\s*[0-9]+층).*/g, '').trim()
  return clean
}

/**
 * 지오코딩 검색을 위한 주소 후보 리스트 생성
 */
function getQueryCandidates(rawAddr: string): string[] {
  const cleaned = cleanKoreanRoadAddress(rawAddr)
  const candidates: string[] = [cleaned]

  // 시/도 정식명칭 확장 또는 축약 후보
  for (const [shortS, fullS] of Object.entries(SIDO_MAP)) {
    if (cleaned.startsWith(shortS + ' ')) {
      candidates.push(cleaned.replace(shortS + ' ', fullS + ' '))
      candidates.push(cleaned.replace(shortS + ' ', '')) // 시/도 제외 (시/군/구부터)
      break
    } else if (cleaned.startsWith(fullS + ' ')) {
      candidates.push(cleaned.replace(fullS + ' ', shortS + ' '))
      candidates.push(cleaned.replace(fullS + ' ', ''))
      break
    }
  }

  // 띄어쓰기 기준 시군구+도로명 등
  const parts = cleaned.split(' ')
  if (parts.length >= 3) {
    candidates.push(parts.slice(1).join(' '))
  }
  if (parts.length >= 4) {
    candidates.push(parts.slice(2).join(' '))
  }

  return Array.from(new Set(candidates)).filter(Boolean)
}

/**
 * 지역명 기반 백업 좌표 매칭
 */
function findFallbackCoordinate(addr: string): Point | null {
  for (const [name, coord] of Object.entries(REGION_COORDINATES)) {
    if (addr.includes(name)) {
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
 * 카카오 모빌리티 자동차 길찾기 API
 */
async function routeKakao(p1: Point, p2: Point, apiKey: string): Promise<DistanceResult | null> {
  try {
    const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${p1.lon},${p1.lat}&destination=${p2.lon},${p2.lat}&priority=RECOMMEND`
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` }
    })
    const data = await res.json()
    if (data.routes && data.routes.length > 0 && data.routes[0].result_code === 0) {
      const summary = data.routes[0].summary
      const distKm = Math.round((summary.distance / 1000) * 10) / 10
      const durationMin = Math.round(summary.duration / 60)
      return {
        success: true,
        distanceKm: distKm,
        durationMinutes: durationMin,
        durationText: durationMin < 60 ? `약 ${durationMin}분` : `약 ${Math.floor(durationMin / 60)}시간 ${durationMin % 60}분`,
        summary: `실제 주행거리 ${distKm}km (약 ${durationMin}분 소요)`,
        source: 'kakao',
        tollFare: summary.fare?.toll || 0,
        taxiFare: summary.fare?.taxi || 0
      }
    }
  } catch (err) {
    console.error('Kakao Mobility Route Error:', err)
  }
  return null
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
      const durationMin = Math.round((route.duration || 0) / 60)
      return {
        success: true,
        distanceKm: distKm,
        durationMinutes: durationMin,
        durationText: durationMin < 60 ? `약 ${durationMin}분` : `약 ${Math.floor(durationMin / 60)}시간 ${durationMin % 60}분`,
        summary: `실제 주행거리 ${distKm}km (약 ${durationMin}분 소요)`,
        source: 'osrm'
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

  const kakaoApiKey = process.env.KAKAO_REST_API_KEY?.trim()

  // 1. 카카오 API 키가 있는 경우 우선 카카오 모빌리티로 계산 (최고 정밀도)
  if (kakaoApiKey) {
    const p1 = await geocodeKakao(fromAddress, kakaoApiKey)
    const p2 = await geocodeKakao(toAddress, kakaoApiKey)
    if (p1 && p2) {
      const kakaoResult = await routeKakao(p1, p2, kakaoApiKey)
      if (kakaoResult) return kakaoResult
    }
  }

  // 2. 오픈소스 정밀 지오코딩 + OSRM 실제 도로망 주행거리 계산
  let p1 = await geocodeNominatim(fromAddress)
  let p2 = await geocodeNominatim(toAddress)

  // Nominatim 미검출 시 한국 행정구역 중심 좌표로 보완
  if (!p1) p1 = findFallbackCoordinate(fromAddress)
  if (!p2) p2 = findFallbackCoordinate(toAddress)

  if (p1 && p2) {
    // 실제 도로망 주행거리 계산
    const osrmResult = await routeOSRM(p1, p2)
    if (osrmResult) return osrmResult

    // OSRM 일시 장애 시 도로 굴곡도 계수(1.35)를 적용한 정밀 추정 계산
    const straightKm = calculateHaversineKm(p1, p2)
    const roadKm = Math.round(straightKm * 1.35 * 10) / 10
    // 화물차 평균 주행 속도 시속 45km 기준
    const durationMin = Math.max(10, Math.round((roadKm / 45) * 60))

    return {
      success: true,
      distanceKm: roadKm,
      durationMinutes: durationMin,
      durationText: durationMin < 60 ? `약 ${durationMin}분` : `약 ${Math.floor(durationMin / 60)}시간 ${durationMin % 60}분`,
      summary: `추정 주행거리 ${roadKm}km (약 ${durationMin}분 소요)`,
      source: 'fallback'
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
