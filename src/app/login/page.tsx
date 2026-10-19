'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
import { APP_RELEASE_INFO } from '@/lib/appRelease'
import { AppDownloadButton } from '@/components/AppDownloadButton'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">MOVEMAN</h1>
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              {APP_RELEASE_INFO.version}
            </span>
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
