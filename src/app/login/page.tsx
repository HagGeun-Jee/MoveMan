'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions/auth'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">MOVEMAN</h1>
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
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">📱</span>
              <h3 className="font-bold text-blue-950 text-sm">현장용 안드로이드 앱 다운로드</h3>
            </div>
            <p className="text-xs text-blue-700 mb-3">
              인터넷이 불안정한 현장(지하, 탑차 등)에서도 오프라인 로컬 작성 및 서버 동기화가 지원됩니다.
            </p>
            <a 
              href="/moveman.apk" 
              download="moveman.apk"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
            >
              <span>📥 앱(APK) 다운로드 및 설치</span>
            </a>
            <p className="text-[11px] text-gray-500 mt-2 text-center">
              ※ 다운로드 후 스마트폰에서 터치하여 설치하세요. ('출처를 알 수 없는 앱 허용')
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
