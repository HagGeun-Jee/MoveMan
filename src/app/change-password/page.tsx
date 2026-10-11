'use client'

import { useActionState } from 'react'
import { changePassword } from '@/app/actions/users'

export default function ChangePasswordPage() {
  const [state, formAction, isPending] = useActionState(changePassword, null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">비밀번호 변경 안내</h1>
          <p className="text-sm text-gray-500">
            초기 비밀번호를 사용 중입니다.<br />
            보안을 위해 새로운 비밀번호로 변경해 주세요.
          </p>
        </div>
        
        <form action={formAction} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
            <input 
              name="newPassword" 
              type="password" 
              required 
              minLength={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-blue-500 outline-none transition-colors"
              placeholder="새로운 비밀번호를 입력하세요"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
            <input 
              name="confirmPassword" 
              type="password" 
              required 
              minLength={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-blue-500 outline-none transition-colors"
              placeholder="비밀번호를 다시 한 번 입력하세요"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600 font-medium">{state.error}</p>
          )}

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isPending}
              className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {isPending ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
