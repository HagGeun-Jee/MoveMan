'use client'

import { useState } from 'react'
import { resetUserPassword } from '@/app/actions/users'
import { RotateCcw, Loader2 } from 'lucide-react'

interface ResetPasswordButtonProps {
  adminId: string
  userName: string
  userId: string
}

export function ResetPasswordButton({ adminId, userName, userId }: ResetPasswordButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleReset = async () => {
    const isConfirmed = window.confirm(
      `'${userName}' (${userId}) 관리자의 비밀번호를 아이디와 동일하게 초기화하시겠습니까?\n\n초기화 후 해당 사용자는 다음 로그인 시 비밀번호 변경 안내를 받게 됩니다.`
    )

    if (!isConfirmed) return

    setLoading(true)
    try {
      const res = await resetUserPassword(adminId)
      if (res.success) {
        window.alert(res.message || '비밀번호가 아이디와 동일하게 초기화되었습니다.')
      } else {
        window.alert(res.error || '비밀번호 초기화 실패')
      }
    } catch (err) {
      console.error(err)
      window.alert('비밀번호 초기화 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
      title={`${userName} 계정 비밀번호 초기화`}
    >
      {loading ? (
        <>
          <Loader2 size={13} className="animate-spin text-amber-600" />
          <span>초기화 중...</span>
        </>
      ) : (
        <>
          <RotateCcw size={13} className="text-amber-600" />
          <span>비번 초기화</span>
        </>
      )}
    </button>
  )
}
