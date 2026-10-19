'use client'

import { useEffect } from 'react'

/**
 * Android WebView / React Controlled Component 한글 IME 커서 튐 방지 전역 패치
 * 
 * 원인:
 * 안드로이드 웹뷰(Chromium)에서 기존 텍스트가 있는 입력창의 앞쪽이나 중간에 커서를 두고
 * 한글을 입력하면, React가 onChange -> setState -> input.value = newValue를 실행합니다.
 * 이 때 브라우저의 기본 동작으로 인해 커서(selection)가 무조건 문자열 맨 끝으로 튕겨 나갑니다.
 * 
 * 해결:
 * HTMLInputElement 및 HTMLTextAreaElement의 prototype 'value' setter를 가로채어,
 * 현재 포커스된 입력 요소에서 앞쪽/중간 입력 중이었을 경우
 * 원래 입력 위치(oldStart + 길이 변화분)로 커서를 유지시킵니다.
 */
export function AndroidImeFix() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const patchPrototype = (proto: any) => {
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
      if (!descriptor || !descriptor.set) return

      const originalSet = descriptor.set

      descriptor.set = function (this: HTMLInputElement | HTMLTextAreaElement, newValue: any) {
        const isFocused = document.activeElement === this
        const tag = this.tagName
        const type = (this as HTMLInputElement).type || 'text'

        // 포커스 상태가 아니거나, 텍스트 입력창이 아닌 경우(체크박스, 라디오, 버튼 등)는 원본 그대로 적용
        if (!isFocused || (tag === 'INPUT' && !['text', 'search', 'tel', 'url', 'email', ''].includes(type))) {
          return originalSet.call(this, newValue)
        }

        const oldStart = this.selectionStart
        const oldEnd = this.selectionEnd
        const oldVal = this.value
        const newStr = String(newValue ?? '')

        // 원본 setter 실행
        originalSet.call(this, newValue)

        // 기존 텍스트가 있었고, 커서가 맨 끝이 아닌 앞쪽/중간에 위치했던 경우
        if (
          oldStart !== null && 
          oldEnd !== null && 
          oldStart === oldEnd && 
          oldVal !== newStr &&
          oldVal.length > 0
        ) {
          const isAtEnd = oldStart >= oldVal.length
          if (!isAtEnd) {
            // 새로 입력된 글자 수 차이만큼 커서 위치를 정확히 유지
            const diff = newStr.length - oldVal.length
            const newPos = Math.max(0, Math.min(newStr.length, oldStart + (diff > 0 ? diff : 0)))
            
            try {
              this.setSelectionRange(newPos, newPos)
            } catch (_) {}

            // 다음 프레임(Blink 렌더링 직후)에도 한 번 더 보호
            requestAnimationFrame(() => {
              if (document.activeElement === this) {
                try {
                  const cur = this.selectionStart
                  // 커서가 엉뚱하게 맨 끝으로 튕겨나갔을 때만 원위치 복원
                  if (cur !== null && cur > newPos && cur === newStr.length && newPos < newStr.length) {
                    this.setSelectionRange(newPos, newPos)
                  }
                } catch (_) {}
              }
            })
          }
        }
      }

      Object.defineProperty(proto, 'value', descriptor)
    }

    try {
      patchPrototype(HTMLInputElement.prototype)
      patchPrototype(HTMLTextAreaElement.prototype)
    } catch (e) {
      console.warn('[AndroidImeFix] 패치 실패:', e)
    }
  }, [])

  return null
}
