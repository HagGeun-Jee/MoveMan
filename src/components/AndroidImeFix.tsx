'use client'

import { useEffect } from 'react'

function patchValueSetter(proto: any) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value') as
      | (PropertyDescriptor & { _imePatched?: boolean })
      | undefined
    if (!descriptor || !descriptor.set || descriptor._imePatched) return

    const originalSet = descriptor.set
    const originalGet = descriptor.get

    const nextDescriptor: PropertyDescriptor & { _imePatched?: boolean } = {
      set(this: HTMLInputElement | HTMLTextAreaElement, val: any) {
        const stringVal = val === null || val === undefined ? '' : String(val)
        const prevVal = this.value || ''

        // 1. 이미 동일한 값이면 React가 렌더링 중 재대입한 것이므로 setter 생략
        //    (Android WebView가 커서를 맨 끝으로 강제 점프시키고 조합을 깨뜨리는 것을 원천 차단)
        if (prevVal === stringVal) {
          return
        }

        // 2. 현재 사용자가 타이핑 중인 엘리먼트인 경우 커서 위치 보존
        const isFocused = document.activeElement === this
        const hasSelection = isFocused && typeof this.selectionStart === 'number'
        const prevStart = hasSelection ? this.selectionStart : null
        const prevEnd = hasSelection ? this.selectionEnd : null
        const diff = stringVal.length - prevVal.length

        originalSet.call(this, val)

        // 3. 타이핑 중 하이픈(-)·콤마(,) 자동 삽입 등으로 길이가 늘어났을 때 diff만큼 보정
        if (isFocused && prevStart !== null && prevEnd !== null) {
          try {
            const nextStart =
              diff > 0 ? Math.min(stringVal.length, prevStart + diff) : Math.min(stringVal.length, prevStart)
            const nextEnd =
              diff > 0 ? Math.min(stringVal.length, prevEnd + diff) : Math.min(stringVal.length, prevEnd)
            this.setSelectionRange(nextStart, nextEnd)
          } catch {
            // number, email 등 selectionRange 미지원 타입 예외 무시
          }
        }
      },
      get: originalGet,
      configurable: true,
      enumerable: descriptor.enumerable,
    }

    Object.defineProperty(proto, 'value', nextDescriptor)

    // 중복 래핑 방지 마킹
    const applied = Object.getOwnPropertyDescriptor(proto, 'value')
    if (applied?.set) {
      ;(applied.set as any)._imePatched = true
    }
  } catch (e) {
    console.warn('[AndroidImeFix] Failed to patch value setter:', e)
  }
}

function ensureImePatched() {
  if (typeof window === 'undefined') return
  const checkAndPatch = (proto: any) => {
    const desc = Object.getOwnPropertyDescriptor(proto, 'value')
    if (!desc?.set || (desc.set as any)._imePatched) return
    patchValueSetter(proto)
  }
  checkAndPatch(HTMLInputElement.prototype)
  checkAndPatch(HTMLTextAreaElement.prototype)
}

// 클라이언트 모듈 평가 즉시 실행 (하이드레이션 이전 선제 패치)
if (typeof window !== 'undefined') {
  ensureImePatched()
}

export function AndroidImeFix() {
  useEffect(() => {
    ensureImePatched()
  }, [])

  return null
}

