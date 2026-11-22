// 고객 회신 문자 문구 (관리자 미리보기와 실제 발송이 동일한 함수를 사용)
export const BRAND = '톡톡용달이사'

export function buildReplySms(p: {
  id: string
  status: string
  finalAmount: number | null
  comment: string
  siteUrl: string
}) {
  const head = p.status === 'QUOTED' ? '견적확정' : '견적안내'
  const amountText = p.finalAmount != null ? `확정 견적 ${p.finalAmount.toLocaleString('ko-KR')}원` : '견적 안내'
  return `[${BRAND}] ${head}\n접수번호 ${p.id}\n${amountText}${p.comment ? `\n${p.comment.slice(0, 200)}` : ''}\n조회: ${p.siteUrl}/s/check`
}

// 한글 2byte 기준 길이 (90byte 초과 시 LMS 장문)
export function smsBytes(text: string) {
  let n = 0
  for (const ch of text) n += ch.charCodeAt(0) > 127 ? 2 : 1
  return n
}
