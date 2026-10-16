'use client'

import React, { useState } from 'react'
import { LogOut, AlertCircle, X, Loader2 } from 'lucide-react'

interface AppExitConfirmModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AppExitConfirmModal({ isOpen, onClose }: AppExitConfirmModalProps) {
  const [isExiting, setIsExiting] = useState(false)

  if (!isOpen) return null

  const handleConfirmExit = async () => {
    setIsExiting(true)
    try {
      // 1. 서버 세션 쿠키 삭제 (로그아웃)
      await fetch('/api/auth/logout', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (err) {
      console.error('Logout request error:', err)
    }

    // 2. 로컬 브라우저 세션 및 캐시 정리
    try {
      sessionStorage.clear()
    } catch (e) {
      // ignore
    }

    // 3. 앱 종료 (안드로이드 네이티브 앱 또는 브라우저 리다이렉트)
    try {
      // 3-1. Android WebView JavascriptInterface를 통한 완전 종료
      if (typeof window !== 'undefined' && (window as any).AndroidApp?.exitApp) {
        (window as any).AndroidApp.exitApp()
        return
      }

      // 3-2. Capacitor App 플러그인을 통한 앱 종료
      const { App: CapApp } = await import('@capacitor/app')
      await CapApp.exitApp()
    } catch (err) {
      console.warn('Native exitApp not available, redirecting to login:', err)
      // 3-3. 일반 웹 브라우저 환경인 경우 로그인 페이지로 이동
      window.location.href = '/login'
    }
  }

  return (
    <div 
      className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더 바 */}
        <div className="bg-red-50 border-b border-red-100 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-100 rounded-xl text-red-600">
              <LogOut size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">시스템 종료</h3>
              <p className="text-[11px] text-red-600 font-medium">안전 로그아웃 및 앱 종료</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isExiting}
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* 본문 메시지 */}
        <div className="p-5 sm:p-6 space-y-3">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold">종료하시겠습니까?</span>
              <p className="mt-1 text-gray-600">
                종료하시면 현재 계정이 <strong className="text-red-600 font-semibold">안전하게 로그아웃</strong>된 후 프로그램이 종료됩니다.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 pt-1">
            다시 사용하시려면 재실행 후 로그인해 주세요.
          </p>
        </div>

        {/* 하단 액션 버튼 */}
        <div className="bg-gray-50 px-5 py-3.5 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isExiting}
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-white hover:bg-gray-100 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl border border-gray-300 shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50"
          >
            취소 (계속 사용)
          </button>
          
          <button
            type="button"
            disabled={isExiting}
            onClick={handleConfirmExit}
            className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isExiting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>종료 처리 중...</span>
              </>
            ) : (
              <>
                <LogOut size={16} />
                <span>종료 및 로그아웃</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
