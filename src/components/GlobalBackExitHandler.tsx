'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AppExitConfirmModal } from './AppExitConfirmModal'

export function GlobalBackExitHandler() {
  const pathname = usePathname()
  const router = useRouter()
  const [isExitModalOpen, setIsExitModalOpen] = useState(false)
  const isExitModalOpenRef = useRef(isExitModalOpen)
  isExitModalOpenRef.current = isExitModalOpen

  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  // 전역 뒤로가기 액션 처리 함수
  const handleBackAction = useCallback(() => {
    // 1. 종료 확인 모달이 이미 열려있는 경우 -> 모달 닫기 (취소)
    if (isExitModalOpenRef.current) {
      setIsExitModalOpen(false)
      return true
    }

    // 2. 화면에 열려 있는 기타 모달이나 슬라이드 드로어가 있는지 확인하고 닫기
    const openModals = document.querySelectorAll('[role="dialog"], [aria-modal="true"]')
    if (openModals.length > 0) {
      // 닫기 버튼(X 아이콘 등)이 있으면 클릭 트리거
      const closeBtn = document.querySelector('[aria-label="닫기"], [aria-label="메뉴 닫기"], button:has(svg.lucide-x)') as HTMLElement
      if (closeBtn) {
        closeBtn.click()
        return true
      }
      // ESC 키 이벤트 전송
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }))
      return true
    }

    const currentPath = pathnameRef.current || '/'

    // 3. 최상위 루트 화면(메인 대시보드 '/')에 도달한 경우 -> 종료 확인 모달 표시!
    if (currentPath === '/' || currentPath === '') {
      setIsExitModalOpen(true)
      return true
    }

    // 4. 서브 화면인 경우 -> 이전 화면으로 뒤로가기
    // 뒤로가기를 계속 누르면 차례대로 이전 페이지를 거쳐 결국 루트('/')에 도달하게 됨
    if (typeof window !== 'undefined') {
      const historyIdx = (window.history.state as any)?.idx
      // 만약 히스토리가 없는 단독 진입 상태라면 메인 대시보드로 이동
      if (historyIdx === 0) {
        router.push('/')
        return true
      }
      
      window.history.back()
      return true
    }

    return true
  }, [router])

  useEffect(() => {
    // 1. Android 네이티브 MainActivity에서 호출할 수 있도록 전역 핸들러 노출
    if (typeof window !== 'undefined') {
      (window as any).handleAndroidBackButton = () => {
        handleBackAction()
        return true // 네이티브 백동작 소비 알림
      }

      // 2. 상단 헤더 < 버튼 및 커스텀 이벤트 수신
      const onCustomBack = () => {
        handleBackAction()
      }
      window.addEventListener('app:back', onCustomBack)

      // 3. Capacitor App 백버튼 리스너 등록
      let capListenerHandle: any = null
      const setupCapacitor = async () => {
        try {
          const { App: CapApp } = await import('@capacitor/app')
          capListenerHandle = await CapApp.addListener('backButton', () => {
            handleBackAction()
          })
        } catch (e) {
          // 브라우저 환경에서는 Capacitor App 플러그인 로드 무시
        }
      }
      setupCapacitor()

      return () => {
        window.removeEventListener('app:back', onCustomBack)
        if (capListenerHandle && typeof capListenerHandle.remove === 'function') {
          capListenerHandle.remove()
        }
      }
    }
  }, [handleBackAction])

  return (
    <AppExitConfirmModal 
      isOpen={isExitModalOpen} 
      onClose={() => setIsExitModalOpen(false)} 
    />
  )
}
