'use client'

import { useActionState, useState } from 'react'
import { createUser } from '@/app/actions/users'

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

export function UserRegisterForm() {
  const [state, formAction, isPending] = useActionState(createUser, null)
  const [phone, setPhone] = useState('')

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <h2 className="text-xl font-bold mb-4">신규 사용자 등록</h2>
      <p className="text-sm text-gray-500 mb-6">초기 비밀번호는 아이디와 동일하게 설정되며, 최초 로그인 시 변경해야 합니다.</p>
      
      <form action={formAction} className="space-y-4 max-w-xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <input 
              type="text" 
              name="name" 
              required 
              className="w-full border rounded-lg px-3 py-2 text-sm" 
              placeholder="홍길동"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
            <input 
              type="text" 
              name="userId" 
              required 
              className="w-full border rounded-lg px-3 py-2 text-sm" 
              placeholder="admin123"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
            <input 
              type="tel" 
              name="phone" 
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm" 
              placeholder="010-1234-5678"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">역할 (Role)</label>
            <input 
              type="text" 
              name="role" 
              defaultValue="ADMIN"
              className="w-full border rounded-lg px-3 py-2 text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">레벨 (Level)</label>
            <input 
              type="number" 
              name="level" 
              defaultValue="1"
              min="1" max="99"
              className="w-full border rounded-lg px-3 py-2 text-sm" 
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
