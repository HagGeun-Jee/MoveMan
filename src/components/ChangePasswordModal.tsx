'use client'

import { useState, useEffect, useActionState } from 'react'
import { changePasswordModal } from '@/app/actions/users'
import { KeyRound, X, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [state, formAction, isPending] = useActionState(changePasswordModal, null)
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [successClosed, setSuccessClosed] = useState(false)

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isPending) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isPending, onClose])

  // 모달이 열릴 때 폼 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setNewPassword('')
      setConfirmPassword('')
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      setSuccessClosed(false)
    }
  }, [isOpen])

  // 성공 시 1.5초 후 자동 닫기
  useEffect(() => {
    if (state?.success) {
      setSuccessClosed(true)
      const timer = setTimeout(() => {
        onClose()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [state?.success, onClose])

  if (!isOpen) return null

  // 실시간 비밀번호 일치 및 길이 검증
  const isMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword
  const isMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) {
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-modal-title"
    >
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 id="password-modal-title" className="text-lg font-bold text-gray-900">
                비밀번호 변경
              </h2>
              <p className="text-xs text-gray-500">
                새로운 비밀번호를 설정해주세요
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* 성공 완료 화면 */}
        {state?.success && successClosed ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto animate-in zoom-in">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">비밀번호 변경 완료</h3>
              <p className="text-sm text-gray-500 mt-1">
                비밀번호가 성공적으로 변경되었습니다.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        ) : (
          /* 변경 입력 폼 */
          <form action={formAction} className="p-5 space-y-4">
            {/* 에러 메시지 표시 */}
            {state?.error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-medium">
                <AlertCircle size={16} className="shrink-0 text-red-600" />
                <span>{state.error}</span>
              </div>
            )}

            {/* 현재 비밀번호 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                현재 비밀번호
              </label>
              <div className="relative">
                <input
                  name="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  placeholder="현재 비밀번호를 입력하세요"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 pr-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  tabIndex={-1}
                  aria-label={showCurrentPassword ? '비밀번호 가리기' : '비밀번호 보기'}
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* 새 비밀번호 */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  새 비밀번호
                </label>
                <span className="text-[11px] text-gray-400">최소 4자 이상</span>
              </div>
              <div className="relative">
                <input
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새로운 비밀번호를 입력하세요"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 pr-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  tabIndex={-1}
                  aria-label={showNewPassword ? '비밀번호 가리기' : '비밀번호 보기'}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* 새 비밀번호 확인 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                새 비밀번호 확인
              </label>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호를 다시 한 번 입력하세요"
                  className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm outline-none transition-all placeholder:text-gray-400 ${
                    isMismatch 
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100' 
                      : isMatch 
                      ? 'border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-100' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? '비밀번호 가리기' : '비밀번호 보기'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {/* 비밀번호 일치 상태 피드백 */}
              {isMatch && (
                <p className="flex items-center gap-1 text-[11px] text-green-600 font-medium mt-1.5">
                  <CheckCircle2 size={12} />
                  <span>비밀번호가 일치합니다.</span>
                </p>
              )}
              {isMismatch && (
                <p className="flex items-center gap-1 text-[11px] text-red-500 font-medium mt-1.5">
                  <AlertCircle size={12} />
                  <span>비밀번호가 일치하지 않습니다.</span>
                </p>
              )}
            </div>

            {/* 하단 버튼 */}
            <div className="flex gap-2.5 pt-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isPending || (confirmPassword.length > 0 && !isMatch)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>변경 중...</span>
                  </>
                ) : (
                  <span>비밀번호 변경</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
