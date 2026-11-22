// 소형이사 표시용 공용 포맷터 (서버/클라이언트 공용)

// 숫자만 저장된 연락처를 010-0000-0000 형식으로
export function formatPhone(v: string) {
  const d = (v || '').replace(/[^0-9]/g, '').slice(0, 11)
  if (d.length < 4) return d
  if (d.length < 8) return d.slice(0, 3) + '-' + d.slice(3)
  return d.slice(0, 3) + '-' + d.slice(3, d.length - 4) + '-' + d.slice(-4)
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

// 한국시간(KST) 기준 날짜 문자열 YYYY-MM-DD (서버가 UTC여도 하루 어긋나지 않도록)
export function kstDateStr(d: Date | string | null | undefined) {
  if (!d) return ''
  const t = new Date(typeof d === 'string' ? d : d.getTime())
  return new Date(t.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}

// 2026-11-21(토)
export function fmtMoveDate(d: Date | string | null | undefined) {
  const s = kstDateStr(d)
  if (!s) return '미정'
  const wd = new Date(s + 'T00:00:00Z').getUTCDay()
  return `${s}(${WEEK[wd]})`
}

export function fmtKstDateTime(d: Date | string | null | undefined) {
  if (!d) return '-'
  const t = new Date(typeof d === 'string' ? d : d.getTime())
  const k = new Date(t.getTime() + 9 * 3600 * 1000).toISOString()
  return `${k.slice(0, 10)} ${k.slice(11, 16)}`
}

// 작업 시작 시간 선택지 (24시간제, 30분 단위)
export const START_TIME_OPTIONS: string[] = (() => {
  const out: string[] = []
  for (let h = 6; h <= 20; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 20) out.push(`${String(h).padStart(2, '0')}:30`)
  }
  return out
})()

export const isValidStartTime = (v: unknown) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
