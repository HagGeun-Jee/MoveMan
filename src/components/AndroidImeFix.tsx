'use client'

import { useEffect } from 'react'

/**
 * Android WebView IME & Cursor Shield
 * 
 * [원인 분석]
 * 1. React 제어 컴포넌트는 키 입력 시마다 onChange -> setState -> input.value = val 재대입을 수행함.
 * 2. 일반 Chrome 브라우저는 동일 value 대입 시 커서 위치를 유지하지만,
 *    Android WebView는 JS로 input.value = ... 가 호출되면 커서 위치를 무조건 문자열 맨 끝으로 리셋함.
 * 3. 이로 인해 기존 텍스트 앞쪽에 커서를 두고 한글을 치면:
 *    - 첫 자모 입력 시 React가 value를 재대입 -> 커서가 맨 뒤로 점프 & 조합 버퍼 상실 (첫 글자 안 보임)
 *    - 두 번째 자모 입력 시 이미 커서가 맨 뒤에 있으므로 맨 뒤에 이어붙는 치명적 증상 발생.
 * 
 * [해결책]
 * HTMLInputElement 및 HTMLTextAreaElement의 prototype 'value' setter를 가로채어:
 * 대입하려는 값(val)이 이미 현재 DOM의 value와 동일하다면 setter 호출을 생략(return).
 * -> 불필요한 setter 호출을 건너뛰어 브라우저 네이티브 한글 IME 조합 및 커서 위치를 100% 온전히 보존!
 */
export function AndroidImeFix() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const patchValueSetter = (proto: any) => {
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
      if (!descriptor || !descriptor.set) return

      const originalSet = descriptor.set

      Object.defineProperty(proto, 'value', {
        set(val: any) {
          const stringVal = val === null || val === undefined ? '' : String(val)
          
          // 1. 이미 동일한 값이면 React가 렌더링 중 재대입한 것이므로 setter 생략!
          //    (Android WebView가 커서를 맨 끝으로 강제 점프시키고 조합을 깨뜨리는 것을 원천 차단)
          if (this.value === stringVal) {
            return
          }

          // 2. 현재 사용자가 타이핑 중인 엘리먼트인 경우 커서 위치 보존
          const isFocused = document.activeElement === this
          const hasSelection = isFocused && typeof this.selectionStart === 'number'
          const prevStart = hasSelection ? this.selectionStart : null
          const prevEnd = hasSelection ? this.selectionEnd : null

          // 원본 setter 실행
          originalSet.call(this, val)

          // 3. 타이핑 중 외부 상태 변경 등으로 값이 바뀌었을 때 커서 위치 안전 복원
          if (isFocused && prevStart !== null && prevEnd !== null) {
            try {
              if (prevStart <= stringVal.length && prevEnd <= stringVal.length) {
                this.setSelectionRange(prevStart, prevEnd)
              }
            } catch (_) {
              // number, email 등 selectionRange 미지원 타입 예외 무시
            }
          }
        },
        get: descriptor.get,
        configurable: true,
        enumerable: descriptor.enumerable,
      })
    }

    try {
      patchValueSetter(HTMLInputElement.prototype)
      patchValueSetter(HTMLTextAreaElement.prototype)
    } catch (e) {
      console.warn('[AndroidImeFix] Failed to patch value setter:', e)
    }
  }, [])

  return null
}

