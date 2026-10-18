'use client'

import { useState, useEffect, useRef } from 'react'
import { createInventoryLocation, updateInventoryLocation } from '@/app/actions/inventory'
import { X, Loader2, AlertCircle } from 'lucide-react'

interface LocationModalProps {
  isOpen: boolean
  onClose: () => void
  locationToEdit?: any | null
  onSuccess: () => void
}

export function LocationModal({ isOpen, onClose, locationToEdit, onSuccess }: LocationModalProps) {
  const nameInputRef = useRef<HTMLInputElement>(null)
  const memoInputRef = useRef<HTMLInputElement>(null)

  const [type, setType] = useState(locationToEdit?.type || 'WAREHOUSE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 수정 대상 또는 오픈 상태 변경 시 폼 필드 동기화
  useEffect(() => {
    if (locationToEdit) {
      if (nameInputRef.current) nameInputRef.current.value = locationToEdit.name || ''
      setType(locationToEdit.type || 'WAREHOUSE')
      if (memoInputRef.current) memoInputRef.current.value = locationToEdit.memo || ''
    } else {
      if (nameInputRef.current) nameInputRef.current.value = ''
      setType('WAREHOUSE')
      if (memoInputRef.current) memoInputRef.current.value = ''
    }
    setError(null)
  }, [locationToEdit, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const nameVal = (nameInputRef.current?.value || '').trim()
    const memoVal = (memoInputRef.current?.value || '').trim()

    if (!nameVal) {
      setError('위치명을 입력해 주세요.')
      return
    }

    setLoading(true)

    let res: any
    if (locationToEdit?.id) {
      res = await updateInventoryLocation(locationToEdit.id, { name: nameVal, type, memo: memoVal })
    } else {
      res = await createInventoryLocation({ name: nameVal, type, memo: memoVal })
    }
    setLoading(false)

    if (res.error) {
      setError(res.error)
    } else {
      onSuccess()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-bold text-gray-900">
            {locationToEdit ? '보관 위치 수정' : '신규 보관 위치 등록'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">위치 유형</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('WAREHOUSE')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  type === 'WAREHOUSE' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-2xs' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                🏢 창고 (고정 거점)
              </button>
              <button
                type="button"
                onClick={() => setType('VEHICLE')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  type === 'VEHICLE' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-2xs' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                🚚 차량 (이동식 적재)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">위치명</label>
            <input
              ref={nameInputRef}
              type="text"
              required
              defaultValue={locationToEdit?.name || ''}
              placeholder={type === 'WAREHOUSE' ? '예: 본사 제1창고, 분당 지점창고' : '예: 3호차 (서울12가3456)'}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">메모 / 담당</label>
            <input
              ref={memoInputRef}
              type="text"
              defaultValue={locationToEdit?.memo || ''}
              placeholder="예: 5톤 윙바디 담당 기사님"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <span>저장</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
