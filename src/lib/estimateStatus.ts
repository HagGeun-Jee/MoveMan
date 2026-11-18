/**
 * 견적 상태 유틸리티 (예약취소 / 견적작업 전 판별)
 * - 예약취소 정보는 Estimate.environment JSON 의 `cancelInfo` 에 보관 (DB 스키마 변경 없음)
 */

export interface EstimateCancelInfo {
  cancelled: boolean
  at: string
  by: string
  reason?: string
}

function safeParse(str: unknown): any {
  if (!str || typeof str !== 'string') return null
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

export function getEstimateCancelInfo(estimate: {
  environment?: string | null
}): EstimateCancelInfo | null {
  const env = safeParse(estimate?.environment)
  const info = env?.cancelInfo
  if (info && info.cancelled) return info as EstimateCancelInfo
  return null
}

export function isEstimateCancelled(estimate: { environment?: string | null }): boolean {
  return getEstimateCancelInfo(estimate) !== null
}

/**
 * 견적작업 전 여부: 수량이 입력된 물품이 없고, 이사비용/가산/보관비용이 모두 0이며,
 * 계약금·중도금·잔금 입금 및 고객 서명이 없는 건 (방문견적 예약만 접수된 상태)
 */
export function isEstimatePreWork(estimate: {
  cbmItems?: string | null
  movingCost?: number | null
  additionalCost?: number | null
  storageCost?: number | null
  paymentPlan?: string | null
  signature?: string | null
}): boolean {
  const items = safeParse(estimate?.cbmItems)
  const hasItems =
    Array.isArray(items) &&
    items.some((it: any) => (Number(it?.quantity) || 0) > 0)
  if (hasItems) return false

  if (
    (estimate?.movingCost || 0) > 0 ||
    (estimate?.additionalCost || 0) > 0 ||
    (estimate?.storageCost || 0) > 0
  ) {
    return false
  }

  const pay = safeParse(estimate?.paymentPlan)
  if (pay?.downPaymentPaid || pay?.intermediatePaymentPaid || pay?.balancePaid) {
    return false
  }
  if (estimate?.signature) return false

  return true
}
