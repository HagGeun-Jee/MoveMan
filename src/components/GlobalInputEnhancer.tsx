'use client'

import { useEffect } from 'react'

/**
 * 전역 숫자 입력란 및 연락처 사용자 경험 강화 컴포넌트
 * - 숫자 및 전화번호 입력란 클릭/포커스 시 자동으로 전체 선택(select all)되어 즉시 새 값으로 덮어쓸 수 있도록 지원합니다.
 */
export function GlobalInputEnhancer() {
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target
      if (!(target instanceof HTMLInputElement)) return

      // 숫자 타입, 연락처 타입, 금액 입력란 또는 숫자 관련 필드 감지
      const isSelectAllTarget = 
        target.type === 'number' || 
        target.type === 'tel' ||
        target.inputMode === 'numeric' ||
        target.dataset.selectOnFocus === 'true' ||
        target.classList.contains('select-on-focus') ||
        target.name?.toLowerCase().includes('cost') ||
        target.name?.toLowerCase().includes('price') ||
        target.name?.toLowerCase().includes('amount') ||
        target.name?.toLowerCase().includes('floor') ||
        target.name?.toLowerCase().includes('cbm') ||
        target.name?.toLowerCase().includes('count') ||
        target.name?.toLowerCase().includes('quantity') ||
        target.name === 'contact'

      if (isSelectAllTarget) {
        target.select()
        // 마우스 클릭 시 브라우저 기본 mouseup에 의한 선택 풀림 현상 방지
        setTimeout(() => {
          try {
            target.select()
          } catch (_) {}
        }, 0)
      }
    }

    document.addEventListener('focusin', handleFocusIn)
    return () => {
      document.removeEventListener('focusin', handleFocusIn)
    }
  }, [])

  return null
}
