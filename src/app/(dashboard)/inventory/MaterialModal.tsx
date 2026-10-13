'use client'

import { useState } from 'react'
import { createMaterialItem, updateMaterialItem, deleteMaterialItem } from '@/app/actions/inventory'
import { X, Loader2, AlertCircle } from 'lucide-react'

interface MaterialModalProps {
  isOpen: boolean
  onClose: () => void
  materialToEdit?: any | null
  onSuccess: () => void
}

export function MaterialModal({ isOpen, onClose, materialToEdit, onSuccess }: MaterialModalProps) {
  const [code, setCode] = useState(materialToEdit?.code || '')
  const [name, setName] = useState(materialToEdit?.name || '')
  const [category, setCategory] = useState(materialToEdit?.category || 'REUSABLE')
  const [unit, setUnit] = useState(materialToEdit?.unit || '개')
  const [safetyStock, setSafetyStock] = useState(materialToEdit?.safetyStock || 0)
  const [unitPrice, setUnitPrice] = useState(materialToEdit?.unitPrice || 0)
  const [memo, setMemo] = useState(materialToEdit?.memo || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    let res: any
    if (materialToEdit?.id) {
      res = await updateMaterialItem(materialToEdit.id, {
        code,
        name,
        category,
        unit,
        safetyStock: Number(safetyStock) || 0,
        unitPrice: Number(unitPrice) || 0,
        memo
      })
    } else {
      res = await createMaterialItem({
        code,
        name,
        category,
        unit,
        safetyStock: Number(safetyStock) || 0,
        unitPrice: Number(unitPrice) || 0,
        memo
      })
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
            {materialToEdit ? '자재 품목 수정' : '신규 자재 품목 등록'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">자재 코드</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="예: MAT-BOX-01"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">자재 품명</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 이사용 바구니 (청색)"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium focus:border-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">구분</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium focus:border-blue-500 outline-none"
              >
                <option value="REUSABLE">회수용 자재 (반납/재사용)</option>
                <option value="CONSUMABLE">소모성 자재 (현장 소진)</option>
                <option value="TOOL">도구/장비</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">단위</label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="개, 롤, 매 등"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">안전 재고 수량</label>
              <input
                type="number"
                min="0"
                value={safetyStock}
                onChange={(e) => setSafetyStock(parseInt(e.target.value) || 0)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">단가 (원)</label>
              <input
                type="number"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseInt(e.target.value) || 0)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">비고 / 규격 메모</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="규격 또는 특이사항"
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
