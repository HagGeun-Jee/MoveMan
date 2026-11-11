'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteEstimate } from '@/app/actions/estimate'

interface DeleteEstimateButtonProps {
  estimateId: string
  customerName?: string
  redirectAfter?: string
  onDeleted?: (id: string) => void
  variant?: 'header' | 'row'
}

export function DeleteEstimateButton({
  estimateId,
  customerName,
  redirectAfter,
  onDeleted,
  variant = 'header',
}: DeleteEstimateButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isDeleting) return

    const label = customerName ? `'${customerName}' (${estimateId})` : `'${estimateId}'`
    const confirmed = window.confirm(
      `정말 ${label} 견적서를 삭제하시겠습니까?\n\n삭제된 견적 데이터는 복구할 수 없습니다.`
    )
    if (!confirmed) return

    setIsDeleting(true)
    try {
      const res = await deleteEstimate(estimateId)
      if (!res.success) {
        window.alert(res.error || '견적 삭제에 실패했습니다.')
        setIsDeleting(false)
        return
      }

      // 로컬 캐시(IndexedDB) 및 수정 임시저장 Draft 정리
      try {
        const { localDB } = await import('@/lib/sync/db')
        await localDB?.estimates?.delete(estimateId)
      } catch {}
      try {
        window.localStorage.removeItem(`meman_estimate_draft_edit_${estimateId}`)
      } catch {}

      if (onDeleted) {
        onDeleted(estimateId)
      }

      if (redirectAfter) {
        router.push(redirectAfter)
        router.refresh()
      } else {
        router.refresh()
      }
    } catch (err) {
      console.error('DeleteEstimateButton error:', err)
      window.alert('견적 삭제 중 오류가 발생했습니다.')
      setIsDeleting(false)
    }
  }

  if (variant === 'row') {
    return (
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        title="견적 삭제 (admin 전용)"
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {isDeleting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Trash2 className="w-3.5 h-3.5" />
        )}
        <span>삭제</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      title="견적 삭제 (admin 전용)"
      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 whitespace-nowrap disabled:opacity-50"
    >
      {isDeleting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
      <span>삭제</span>
    </button>
  )
}
