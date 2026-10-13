'use client'

import { useState } from 'react'
import { transferStock } from '@/app/actions/inventory'
import { X, ArrowRight, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react'

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  locations: any[]
  materials: any[]
  onSuccess: () => void
}

export function TransferModal({ isOpen, onClose, locations, materials, onSuccess }: TransferModalProps) {
  const [sourceLocId, setSourceLocId] = useState('')
  const [targetLocId, setTargetLocId] = useState('')
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 이동할 품목 목록 [{ materialId, quantity }]
  const [items, setItems] = useState<{ materialId: string; quantity: number }[]>([
    { materialId: materials[0]?.id || '', quantity: 10 }
  ])

  if (!isOpen) return null

  const handleAddItem = () => {
    setItems(prev => [...prev, { materialId: materials[0]?.id || '', quantity: 1 }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: 'materialId' | 'quantity', val: any) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: val } : item))
  }

  // 선택한 출발 위치의 자재별 현재 재고 조회 함수
  const getAvailableStock = (matId: string) => {
    if (!sourceLocId) return 0
    const mat = materials.find(m => m.id === matId)
    return mat?.stocks?.[sourceLocId] || 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!sourceLocId || !targetLocId) {
      setError('출발 위치와 도착 위치를 모두 선택해주세요.')
      return
    }
    if (sourceLocId === targetLocId) {
      setError('출발 위치와 도착 위치가 같을 수 없습니다.')
      return
    }

    const validItems = items.filter(it => it.quantity > 0)
    if (validItems.length === 0) {
      setError('이동할 자재 수량을 1개 이상 입력해주세요.')
      return
    }

    setLoading(true)
    const res = await transferStock({
      sourceLocId,
      targetLocId,
      items: validItems,
      memo
    })
    setLoading(false)

    if (res.error) {
      setError(res.error)
    } else {
      alert(`자재 이고가 완료되었습니다. (전표: ${res.transferNo})`)
      onSuccess()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">자재 이고(재고 이동)</h2>
            <p className="text-xs text-gray-500 mt-0.5">창고 ↔ 차량 또는 차량 ↔ 차량 간 자재를 이동합니다.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 출발 / 도착 위치 선택 */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center p-3.5 bg-blue-50/40 rounded-xl border border-blue-100">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">출발 위치 (차감)</label>
              <select
                value={sourceLocId}
                onChange={(e) => setSourceLocId(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 outline-none font-medium"
              >
                <option value="">출발 위치 선택</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    [{loc.type === 'WAREHOUSE' ? '창고' : '차량'}] {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden sm:flex justify-center items-center text-blue-500 pt-5">
              <ArrowRight size={22} />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">도착 위치 (가산)</label>
              <select
                value={targetLocId}
                onChange={(e) => setTargetLocId(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 outline-none font-medium"
              >
                <option value="">도착 위치 선택</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id} disabled={loc.id === sourceLocId}>
                    [{loc.type === 'WAREHOUSE' ? '창고' : '차량'}] {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 이동 품목 목록 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-gray-700">이동할 자재 목록</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Plus size={14} />
                <span>품목 추가</span>
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const avail = getAvailableStock(item.materialId)
                return (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <select
                        value={item.materialId}
                        onChange={(e) => handleItemChange(idx, 'materialId', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium focus:border-blue-500 outline-none"
                      >
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.unit})
                          </option>
                        ))}
                      </select>
                      {sourceLocId && (
                        <p className="text-[11px] text-gray-500 mt-0.5 ml-1">
                          출발지 보유: <span className="font-bold text-blue-600">{avail}</span>개
                        </p>
                      )}
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        max={sourceLocId ? avail : 9999}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                        placeholder="수량"
                        className="w-full text-center rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-bold text-gray-800 focus:border-blue-500 outline-none"
                      />
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">메모 / 특이사항</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 1호차 현장 투입 전 박스/바구니 상차"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 outline-none"
            />
          </div>

          {/* 하단 버튼 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>이동 처리 중...</span>
                </>
              ) : (
                <span>이고(이동) 실행</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
