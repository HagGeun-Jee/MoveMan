/**
 * 한국 표준시(KST, Asia/Seoul, UTC+09:00) 기준 날짜·시간 파싱 및 포맷 유틸리티
 * - Render/Vercel 등 UTC 서버 환경과 브라우저(KST) 간 타임존 불일치로 인해
 *   방문 견적일정(visitDate) 등이 저장 시마다 +9시간/-9시간씩 밀리는 문제를 원천 차단합니다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/**
 * 날짜+시간 문자열(또는 Date)을 KST 기준 정확한 Date(UTC 타임스탬프)로 변환
 * - 이미 'Z' 또는 '+09:00' 등 타임존 오프셋이 포함된 ISO 문자열은 그대로 파싱
 * - 타임존 오프셋이 없는 'YYYY-MM-DDTHH:mm(:ss)' 또는 'YYYY-MM-DD HH:mm(:ss)' 문자열은
 *   서버의 로컬 타임존(UTC)과 무관하게 항상 한국 시간(KST, UTC+9)으로 해석
 */
export function parseKstDateTime(raw?: string | Date | null): Date | null {
  if (!raw) return null
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw
  }

  const str = String(raw).trim()
  if (!str || str === 'null' || str === 'undefined') return null

  // 1. 명시적 타임존(Z 또는 ±HH:mm / ±HHmm)이 있는 경우 정확한 절대 시각으로 파싱
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(str)) {
    const parsed = new Date(str)
    return isNaN(parsed.getTime()) ? null : parsed
  }

  // 2. 타임존이 없는 날짜+시간 포맷 ('2026-11-25T15:00', '2026-11-25 15:00:00' 등) -> KST로 해석
  const dtMatch = str.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.(\d{1,3}))?$/
  )
  if (dtMatch) {
    const year = Number(dtMatch[1])
    const month = Number(dtMatch[2])
    const day = Number(dtMatch[3])
    const hour = Number(dtMatch[4])
    const minute = Number(dtMatch[5])
    const second = dtMatch[6] ? Number(dtMatch[6]) : 0
    const ms = dtMatch[7] ? Number(dtMatch[7].padEnd(3, '0')) : 0

    const utcMs = Date.UTC(year, month - 1, day, hour, minute, second, ms) - KST_OFFSET_MS
    return new Date(utcMs)
  }

  // 3. 날짜만 있는 포맷 ('2026-11-25') -> KST 당일 09:00 (= UTC 00:00)으로 안전하게 파싱
  const dMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (dMatch) {
    const year = Number(dMatch[1])
    const month = Number(dMatch[2])
    const day = Number(dMatch[3])
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  }

  const fallback = new Date(str)
  return isNaN(fallback.getTime()) ? null : fallback
}

/**
 * 날짜 전용 필드(접수일, 이사일, 정리일)를 안전하게 파싱
 * - 'YYYY-MM-DD' 입력 시 UTC 00:00 (= KST 09:00)으로 저장하여 UTC/KST 모두 동일 날짜 유지
 */
export function parseKstDateOnly(raw?: string | Date | null): Date | null {
  if (!raw) return null
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw
  }

  const str = String(raw).trim()
  if (!str || str === 'null' || str === 'undefined') return null

  const dMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (dMatch) {
    const year = Number(dMatch[1])
    const month = Number(dMatch[2])
    const day = Number(dMatch[3])
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  }

  return parseKstDateTime(str)
}

/**
 * Date 또는 ISO 문자열에서 항상 한국 표준시(KST) 기준 연/월/일/시/분 추출
 * (서버 TZ=UTC 환경에서도 100% 한국 시간 반환)
 */
export function getKstParts(input?: string | Date | null) {
  const d = input instanceof Date ? input : parseKstDateTime(input)
  if (!d || isNaN(d.getTime())) return null

  const kst = new Date(d.getTime() + KST_OFFSET_MS)
  const year = kst.getUTCFullYear()
  const month = kst.getUTCMonth() + 1
  const day = kst.getUTCDate()
  const hour = kst.getUTCHours()
  const minute = kst.getUTCMinutes()
  const second = kst.getUTCSeconds()

  const yyyy = String(year)
  const MM = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  const HH = String(hour).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')

  return { year, month, day, hour, minute, second, yyyy, MM, dd, HH, mm }
}

/** KST 기준 'YYYY-MM-DD' 반환 */
export function formatKstDate(input?: string | Date | null): string {
  const p = getKstParts(input)
  if (!p) return ''
  return `${p.yyyy}-${p.MM}-${p.dd}`
}

/** KST 기준 'YYYY-MM-DD HH:mm' 반환 */
export function formatKstDateTime(input?: string | Date | null): string {
  const p = getKstParts(input)
  if (!p) return ''
  return `${p.yyyy}-${p.MM}-${p.dd} ${p.HH}:${p.mm}`
}

/** KST 기준 'MM-DD HH:mm' 반환 */
export function formatKstShortDateTime(input?: string | Date | null): string {
  const p = getKstParts(input)
  if (!p) return ''
  return `${p.MM}-${p.dd} ${p.HH}:${p.mm}`
}

/** KST 기준 'HH:mm' 반환 */
export function formatKstTime(input?: string | Date | null): string {
  const p = getKstParts(input)
  if (!p) return ''
  return `${p.HH}:${p.mm}`
}

/** KST 기준 해당 월의 시작(1일 00:00:00.000 KST)과 끝(말일 23:59:59.999 KST) UTC Date 반환 */
export function getKstMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - KST_OFFSET_MS)
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999) - KST_OFFSET_MS)
  return { start, end }
}

