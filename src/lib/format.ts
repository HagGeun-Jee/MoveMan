import React from 'react'

/**
 * 한국 전화번호 포맷터 (숫자 입력 시 자동으로 하이픈 대시 삽입)
 * - 휴대폰: 010-XXXX-XXXX, 01X-XXX-XXXX
 * - 서울 지역번호: 02-XXX-XXXX, 02-XXXX-XXXX
 * - 지방 지역번호 / 인터넷전화: 031-XXX-XXXX, 070-XXXX-XXXX 등
 * - 대표번호: 1588-XXXX, 1544-XXXX 등
 */
export function formatPhoneNumber(value: string | null | undefined): string {
  if (!value) return ''
  const clean = String(value).replace(/[^0-9]/g, '')
  if (!clean) return ''

  // 서울 지역번호 (02)
  if (clean.startsWith('02')) {
    if (clean.length <= 2) return clean
    if (clean.length <= 5) return `${clean.slice(0, 2)}-${clean.slice(2)}`
    if (clean.length <= 9) return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5)}`
    return `${clean.slice(0, 2)}-${clean.slice(2, 6)}-${clean.slice(6, 10)}`
  }

  // 전국 대표번호 (15xx, 16xx, 18xx 등 8자리)
  if (/^(15|16|18)\d{2}/.test(clean) && clean.length <= 8) {
    if (clean.length <= 4) return clean
    return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`
  }

  // 안심번호 등 050x 4자리 국번
  if (clean.startsWith('050') && clean.length >= 11) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 7)}-${clean.slice(7, 11)}`
  }

  // 일반 휴대폰 (010, 011...) 및 일반 지역번호 (031, 032, 051... 070...)
  if (clean.length <= 3) return clean
  if (clean.length <= 6) return `${clean.slice(0, 3)}-${clean.slice(3)}`
  if (clean.length <= 10) return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`
  return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7, 11)}`
}

/**
 * 숫자 및 입력란 포커스 시 전체 텍스트 자동 선택 (Select All)
 * 브라우저 mouseup에 의한 선택 풀림 현상을 방지하여 바로 타이핑하여 값을 변경할 수 있습니다.
 */
export const handleSelectAllOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  const target = e.target
  target.select()
  setTimeout(() => {
    try {
      target.select()
    } catch (_) {}
  }, 0)
}
