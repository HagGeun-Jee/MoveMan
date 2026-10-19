'use client'

import { useEffect } from 'react'

/**
 * 전역 숫자 입력란 및 연락처 사용자 경험 강화 컴포넌트
 * - 숫자 및 전화번호 입력란 클릭/포커스 시 자동 전체 선택(Select All) 처리 (단, 사용자의 직접 커서 지정을 방해하지 않음)
 * - 삼성키보드 및 구글키보드 한글 IME 조합 입력 시 React 제어 컴포넌트에서 커서가 입력란 맨 뒤로 튕기는 현상(Symptom 1) 자동 보정
 */
export function GlobalInputEnhancer() {
  useEffect(() => {
    // 1. 포커스 시 숫자/금액/연락처 필드 안전한 전체 선택
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target
      if (!(target instanceof HTMLInputElement)) return

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
        try {
          if (document.activeElement === target && target.selectionStart === 0 && target.selectionEnd === target.value.length) {
            return
          }
          target.select()
        } catch (_) {}
      }
    }

    // 2. React 제어 컴포넌트에서 한글 입력(IME 조합) 중 커서 튕김 보정
    let pendingCaret: {
      element: HTMLInputElement | HTMLTextAreaElement
      pos: number
      valLen: number
    } | null = null

    const handleInput = (e: Event) => {
      const target = e.target
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return
      if (target.type === 'checkbox' || target.type === 'radio' || target.type === 'file') return

      const start = target.selectionStart
      if (start === null) return

      // 입력 시점의 커서 위치가 텍스트 전체 길이보다 앞쪽에 위치하는 경우 (앞쪽/중간에 한글 입력)
      if (start < target.value.length) {
        pendingCaret = {
          element: target,
          pos: start,
          valLen: target.value.length,
        }

        // React state 변경에 의한 DOM re-render 직후 커서가 맨 뒤로 튕기는 현상 검사 및 복원
        queueMicrotask(() => {
          if (
            pendingCaret &&
            pendingCaret.element === target &&
            document.activeElement === target
          ) {
            const currentStart = target.selectionStart
            // React가 value를 덮어씌워 커서가 맨 끝으로 강제 이동된 경우 원래 위치로 복원
            if (currentStart === target.value.length && pendingCaret.pos < target.value.length) {
              try {
                target.setSelectionRange(pendingCaret.pos, pendingCaret.pos)
              } catch (_) {}
            }
          }
        })
      } else {
        pendingCaret = null
      }
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('input', handleInput, { capture: true })

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('input', handleInput, { capture: true })
    }
  }, [])

  return null
}
