'use client'

import { useState, useEffect } from 'react'
import { recordStockIn, recordStockOut } from '@/app/actions/inventory'
import { X, Plus, Trash2, Loader2, AlertCircle, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

interface StockInOutModalProps {
  isOpen: boolean
  onClose: () => void
  locations: any[]
  materials: any[]
  onSuccess: () => void
}

export function StockInOutModal({ isOpen, onClose, locations, materials, onSuccess }: StockInOutModalProps) {
  const [type, setType] = useState<'IN' | 'OUT'>('IN')
  const [targetLocationId, setTargetLocationId] = useState('')
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [items, setItems] = useState<{ materialId: string; quantity: number }[]>([
    { materialId: '', quantity: 10 }
  ])

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      const defaultLoc = locations.find(l => l.type === 'WAREHOUSE')?.id || locations[0]?.id || ''
      setTargetLocationId(defaultLoc)
      setItems([{ materialId: '', quantity: 10 }])
      setMemo('')
      setError(null)
    }
  }, [isOpen, locations])

  if (!isOpen) return null

  const handleAddItem = () => {
    setItems(prev => [...prev, { materialId: '', quantity: 1 }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: 'materialId' | 'quantity', val: any) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: val } : item))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!targetLocationId) {
      setError(type === 'IN' ? '입고할 위치를 선택해주세요.' : '출고(폐기)할 위치를 선택해주세요.')
      return
    }

    const validItems = items.filter(it => it.materialId && it.materialId.trim() !== '' && it.quantity > 0)
    if (validItems.length === 0) {
      setError(type === 'IN' ? '입고할 자재를 선택하고 수량을 입력해주세요.' : '출고할 자재를 선택하고 수량을 입력해주세요.')
      return
    }

    setLoading(true)
    let res: any
    if (type === 'IN') {
      res = await recordStockIn({
        targetLocId: targetLocationId,
        items: validItems,
        memo
      })
    } else {
      res = await recordStockOut({
        sourceLocId: targetLocationId,
        items: validItems,
        memo
      })
    }
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else {
      alert(type === 'IN' ? '신규 자재 입고가 완료되었습니다.' : '자재 출고(폐기) 처리가 완료되었습니다.')
      onSuccess()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 및 타입 선택 */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {type === 'IN' ? '신규 자재 구매 입고' : '자재 폐기 / 손망실 출고'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {type === 'IN' ? '새로 구입한 자재를 창고나 차량에 등록합니다.' : '파손되거나 분실된 자재를 재고에서 정리합니다.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* 탭 전환 버튼 */}
          <div className="flex bg-gray-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { setType('IN'); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                type === 'IN' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowDownToLine size={15} />
              <span>자재 입고 (재고 증가)</span>
            </button>
            <button
              type="button"
              onClick={() => { setType('OUT'); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                type === 'OUT' ? 'bg-white text-rose-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowUpFromLine size={15} />
              <span>손망실/폐기 출고 (재고 차감)</span>
            </button>
          </div>
        </div>

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 대상 위치 선택 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {type === 'IN' ? '입고 대상 위치' : '출고 대상 위치'}
            </label>
            <select
              value={targetLocationId}
              onChange={(e) => setTargetLocationId(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 outline-none font-medium"
            >
              <option value="">위치 선택</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  [{loc.type === 'WAREHOUSE' ? '창고' : '차량'}] {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* 품목 목록 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-gray-700">품목 및 수량</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Plus size={14} />
                <span>품목 추가</span>
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <select
                        value={item.materialId}
                        onChange={(e) => handleItemChange(idx, 'materialId', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium focus:border-blue-500 outline-none"
                      >
                        <option value="">-- 자재를 선택하세요 --</option>
                        {materials.map(m => {
                          const stockQty = targetLocationId ? (m.stocks?.[targetLocationId] ?? 0) : null
                          return (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.unit}){stockQty !== null ? ` [보유: ${stockQty}${m.unit}]` : ''}
                            </option>
                          )
                        })}
                      </select>

                      {targetLocationId && item.materialId && (
                        <p className="text-[11px] text-gray-500 mt-1 ml-1 font-medium">
                          해당 위치 보유: <span className="font-bold text-blue-600">{materials.find(m => m.id === item.materialId)?.stocks?.[targetLocationId] || 0}</span>개
                        </p>
                      )}
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity || ''}
                        disabled={!item.materialId}
                        onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                        placeholder="수량"
                        className="w-full text-center rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-bold text-gray-800 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 사유 메모 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">처리 사유 / 메모</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={type === 'IN' ? '예: 정기 박스 및 테이프 구매 입고' : '예: 파손된 바구니 폐기, 테이프 현장 소진'}
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
              className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 ${
                type === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>처리 중...</span>
                </>
              ) : (
                <span>{type === 'IN' ? '입고 완료' : '출고(폐기) 완료'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
