'use client'

import { useActionState } from 'react'
import { createUser } from '@/app/actions/users'

export function UserRegisterForm() {
  const [state, formAction, isPending] = useActionState(createUser, null)

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <h2 className="text-xl font-bold mb-4">신규 사용자 등록</h2>
      <p className="text-sm text-gray-500 mb-6">초기 비밀번호는 아이디와 동일하게 설정되며, 최초 로그인 시 변경해야 합니다.</p>
      
      <form action={formAction} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
          <input 
            type="text" 
            name="name" 
            required 
            className="w-full border rounded-lg px-3 py-2" 
            placeholder="홍길동"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
          <input 
            type="text" 
            name="userId" 
            required 
            className="w-full border rounded-lg px-3 py-2" 
            placeholder="admin123"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">역할 (Role)</label>
            <input 
              type="text" 
              name="role" 
              defaultValue="ADMIN"
              className="w-full border rounded-lg px-3 py-2" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">레벨 (Level)</label>
            <input 
              type="number" 
              name="level" 
              defaultValue="1"
              min="1" max="99"
              className="w-full border rounded-lg px-3 py-2" 
            />
          </div>
        </div>

        {state?.error && (
          <p className="text-sm text-red-600 font-medium">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-sm text-green-600 font-medium">사용자가 성공적으로 등록되었습니다.</p>
        )}

        <button 
          type="submit" 
          disabled={isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isPending ? '등록 중...' : '등록하기'}
        </button>
      </form>
    </div>
  )
}
