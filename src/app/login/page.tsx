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
      </div>
    </div>
  )
}
