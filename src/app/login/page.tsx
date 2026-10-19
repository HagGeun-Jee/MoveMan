'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
import { APP_RELEASE_INFO } from '@/lib/appRelease'
import { AppDownloadButton } from '@/components/AppDownloadButton'

import { useState, useEffect } from 'react'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null)
  const [installedAppVersion, setInstalledAppVersion] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let attempts = 0
    const maxAttempts = 20 // 100ms * 20 = 최대 2초간 네이티브 인터페이스 주입 대기

    const checkVersion = () => {
      const androidApp = (window as any).AndroidApp
      const isCapacitor = Boolean(
        (window as any).Capacitor?.isNativePlatform?.() || 
        navigator.userAgent.includes('MoveMan')
      )

      if (androidApp && typeof androidApp.getNativeVersion === 'function') {
        try {
          const ver = androidApp.getNativeVersion()
          if (ver) {
            setInstalledAppVersion(`v${ver}`)
            return true
          }
        } catch (_) {}
      }

      // AndroidApp 객체는 이미 주입되었으나 getNativeVersion 메서드가 아예 없는 과거 구버전 바이너리인 경우
      if (androidApp && typeof androidApp.getNativeVersion !== 'function') {
        setInstalledAppVersion('이전 버전')
        return true
      }

      attempts++
      if (attempts >= maxAttempts) {
        // 2초가 지나도 AndroidApp 인터페이스가 없는데 네이티브 앱 환경인 경우
        if (isCapacitor) {
          setInstalledAppVersion('이전 버전')
        }
        return true
      }

      return false
    }

    if (!checkVersion()) {
      const timer = setInterval(() => {
        if (checkVersion()) {
          clearInterval(timer)
        }
      }, 100)
      return () => clearInterval(timer)
    }
  }, [])

  const isUpToDate = installedAppVersion 
    ? installedAppVersion.replace(/^v/, '').trim() === APP_RELEASE_INFO.version.replace(/^v/, '').trim()
    : true

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">MOVEMAN</h1>
            {installedAppVersion ? (
              isUpToDate ? (
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {installedAppVersion} (최신)
                </span>
              ) : (
                <a
                  href="/api/download/apk"
                  download="moveman.apk"
                  className="text-xs font-mono font-bold text-amber-950 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full hover:bg-amber-100 transition-colors flex items-center gap-1.5 shadow-2xs"
                  title="최신 버전 다운로드"
                >
                  <span className="text-gray-600 font-sans">현재 버전:</span>
                  <span className="text-amber-900 bg-amber-200/80 px-1.5 py-0.2 rounded font-bold">{installedAppVersion}</span>
                  <span className="text-amber-700 font-sans">➔</span>
                  <span className="text-white bg-blue-600 hover:bg-blue-700 px-2 py-0.2 rounded shadow-2xs font-sans">설치할 버전: {APP_RELEASE_INFO.version} 다운로드</span>
                </a>
              )
            ) : (
              <span className="text-xs font-mono font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full">
                {APP_RELEASE_INFO.version}
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-2">이사견적 관리 시스템 로그인</p>
        </div>
        
        <form action={formAction} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">관리자 아이디</label>
            <input 
              name="userId" 
              type="text" 
              required 
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500 outline-none transition-colors"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">비밀번호</label>
            <input 
              name="password" 
              type="password" 
              required 
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500 outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>
          
          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <button 
            type="submit" 
            disabled={isPending}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isPending ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 모바일 앱 다운로드 배너 */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 text-left shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">📱</span>
                <h3 className="font-bold text-blue-950 text-sm">현장용 안드로이드 앱</h3>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                {APP_RELEASE_INFO.version}
              </span>
            </div>
            <p className="text-xs text-blue-700 mb-2.5">
              인터넷이 불안정한 현장(지하, 탑차 등)에서도 오프라인 로컬 작성 및 서버 동기화가 지원됩니다.
            </p>

            {/* 최근 릴리즈 일시 및 용량 안내 */}
            <div className="flex items-center justify-between text-[11px] bg-white/90 px-3 py-1.5 rounded-lg border border-blue-100 mb-3 shadow-2xs">
              <span className="text-gray-600">
                최근 릴리즈: <strong className="text-blue-900 font-bold">{APP_RELEASE_INFO.releaseDate}</strong>
              </span>
              <span className="text-gray-500">
                용량: <strong className="text-gray-700 font-medium">{APP_RELEASE_INFO.fileSize}</strong>
              </span>
            </div>

            <AppDownloadButton variant="login" />
          </div>
        </div>
      </div>
    </div>
  )
}
