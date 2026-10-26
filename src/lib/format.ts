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

  // 휴대폰 번호 (010, 011, 016, 017, 018, 019 등)
  // 특히 010은 100% 11자리 번호이므로, 8자리 이상 입력 시 항상 가운데 4자리를 고정(010-XXXX-X...)하여
  // 10자리(3-3-4) -> 11자리(3-4-4) 전환 시 하이픈이 춤추며 숫자 순서가 뒤바뀌는 버그를 원천 차단합니다.
  if (/^01[016789]/.test(clean)) {
    if (clean.length <= 3) return clean
    if (clean.length <= 7) return `${clean.slice(0, 3)}-${clean.slice(3)}`
    return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7, 11)}`
  }

  // 일반 지역번호 (031, 032, 051... 070...)
  if (clean.length <= 3) return clean
  if (clean.length <= 6) return `${clean.slice(0, 3)}-${clean.slice(3)}`
  if (clean.length <= 10) return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`
  return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7, 11)}`
}

/**
 * 전화번호 입력 시 하이픈(-) 자동 삽입과 함께 커서(Caret) 위치가 튀거나
 * 숫자가 뒤바뀌는 현상을 방지하는 정밀 입력 핸들러
 */
export function handlePhoneInputChange(
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (val: string) => void
) {
  const input = e.target
  const rawValue = input.value
  const selectionStart = input.selectionStart || 0

  // 1. 커서 직전까지의 순수 숫자 개수 카운트
  const digitsBeforeCursor = rawValue.slice(0, selectionStart).replace(/[^0-9]/g, '').length

  // 2. 포맷팅 적용 (최대 11자리)
  const formatted = formatPhoneNumber(rawValue)
  setter(formatted)

  // 3. 브라우저/모바일 IME 렌더링 직후 커서 위치를 정확한 숫자 뒤로 복원
  requestAnimationFrame(() => {
    if (!input) return
    let digitCount = 0
    let targetPos = 0

    if (digitsBeforeCursor === 0) {
      targetPos = 0
    } else {
      for (let i = 0; i < formatted.length; i++) {
        if (/[0-9]/.test(formatted[i])) {
          digitCount++
        }
        if (digitCount === digitsBeforeCursor) {
          targetPos = i + 1
          break
        }
      }
      if (digitCount < digitsBeforeCursor) {
        targetPos = formatted.length
      }
    }

    try {
      input.setSelectionRange(targetPos, targetPos)
    } catch (_) {}
  })
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
