'use client'

import { useState, useEffect } from 'react'
import { recordAuditAndAdjust } from '@/app/actions/inventory'
import { X, CheckCircle2, AlertTriangle, Loader2, AlertCircle, ClipboardCheck } from 'lucide-react'

interface StockAuditModalProps {
  isOpen: boolean
  onClose: () => void
  locations: any[]
  materials: any[]
  onSuccess: () => void
}

export function StockAuditModal({ isOpen, onClose, locations, materials, onSuccess }: StockAuditModalProps) {
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 실사 품목 상태: { materialId, materialName, unit, systemQty, actualQty, reason }
  const [auditRows, setAuditRows] = useState<{
    materialId: string
    materialName: string
    unit: string
    systemQty: number
    actualQty: number
    reason: string
  }[]>([])

  // 위치 선택 시 해당 위치의 전산 수량으로 기본 세팅
  useEffect(() => {
    if (selectedLocationId) {
      const rows = materials.map(m => {
        const sysQty = m.stocks?.[selectedLocationId] || 0
        return {
          materialId: m.id,
          materialName: m.name,
          unit: m.unit,
          systemQty: sysQty,
          actualQty: sysQty, // 기본값은 전산 수량으로 채워줌
          reason: ''
        }
      })
      setAuditRows(rows)
    } else {
      setAuditRows([])
    }
  }, [selectedLocationId, materials])

  if (!isOpen) return null

  const handleActualQtyChange = (matId: string, val: number) => {
    setAuditRows(prev => prev.map(r => r.materialId === matId ? { ...r, actualQty: Math.max(0, val) } : r))
  }

  const handleReasonChange = (matId: string, reason: string) => {
    setAuditRows(prev => prev.map(r => r.materialId === matId ? { ...r, reason } : r))
  }

  // 전체 오차 개수 집계
  const diffCount = auditRows.filter(r => r.actualQty !== r.systemQty).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedLocationId) {
      setError('실사 대상 위치를 선택해주세요.')
      return
    }

    if (diffCount > 0) {
      const confirmProceed = window.confirm(
        `전산 수량과 차이가 있는 품목이 ${diffCount}건 있습니다.\n실사 수량으로 해당 위치의 전산 재고를 일괄 보정하시겠습니까?`
      )
      if (!confirmProceed) return
    }

    setLoading(true)
    const payloadItems = auditRows.map(r => ({
      materialId: r.materialId,
      systemQty: r.systemQty,
      actualQty: r.actualQty,
      reason: r.reason || (r.actualQty !== r.systemQty ? '실사 차이 보정' : '')
    }))

    const res = await recordAuditAndAdjust({
      locationId: selectedLocationId,
      auditItems: payloadItems,
      memo
    })
    setLoading(false)

    if (res.error) {
      setError(res.error)
    } else {
      alert('재고 실사가 완료되었으며, 전산 재고가 실사 수량으로 보정되었습니다.')
      onSuccess()
      onClose()
    }
  }

  const selectedLocObj = locations.find(l => l.id === selectedLocationId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">현장 재고 실사 및 오차 보정</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                실제 현장 재고를 카운트하여 전산 재고와 대조하고 차이를 자동 보정합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 위치 선택 */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4 bg-purple-50/40 rounded-xl border border-purple-100">
            <div className="w-full sm:w-72">
              <label className="block text-xs font-bold text-gray-700 mb-1">실사 대상 위치 (창고/차량)</label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 outline-none font-bold"
              >
                <option value="">실사할 위치를 선택하세요</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    [{loc.type === 'WAREHOUSE' ? '창고' : '차량'}] {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedLocObj && (
              <div className="text-right">
                <span className="text-xs text-gray-500 block">오차 발생 품목</span>
                <span className={`text-base font-black ${diffCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {diffCount}건 불일치
                </span>
              </div>
            )}
          </div>

          {/* 실사 품목 테이블 */}
          {selectedLocationId ? (
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2.5">자재명</th>
                      <th className="px-3 py-2.5 text-center w-20">전산 수량</th>
                      <th className="px-3 py-2.5 text-center w-28">실사 수량 (실제)</th>
                      <th className="px-3 py-2.5 text-center w-20">차이(오차)</th>
                      <th className="px-3 py-2.5 w-40">오차 사유</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditRows.map((row) => {
                      const diff = row.actualQty - row.systemQty
                      return (
                        <tr key={row.materialId} className={`hover:bg-gray-50/80 transition-colors ${diff !== 0 ? 'bg-amber-50/30' : ''}`}>
                          <td className="px-3 py-2 font-bold text-gray-900">
                            {row.materialName} <span className="text-[11px] font-normal text-gray-500">({row.unit})</span>
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-gray-600">
                            {row.systemQty}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={row.actualQty}
                              onChange={(e) => handleActualQtyChange(row.materialId, parseInt(e.target.value) || 0)}
                              className="w-20 text-center rounded-lg border border-gray-300 py-1 px-1.5 text-xs font-bold text-gray-900 focus:border-purple-500 outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-center font-bold">
                            {diff === 0 ? (
                              <span className="text-emerald-600 flex items-center justify-center gap-1">
                                <CheckCircle2 size={13} /> 0
                              </span>
                            ) : diff > 0 ? (
                              <span className="text-blue-600">+{diff} (초과)</span>
                            ) : (
                              <span className="text-rose-600 flex items-center justify-center gap-0.5">
                                <AlertTriangle size={13} /> {diff} (부족)
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.reason}
                              onChange={(e) => handleReasonChange(row.materialId, e.target.value)}
                              placeholder={diff !== 0 ? "사유 입력 (예: 분실, 파손)" : "특이사항"}
                              className="w-full text-xs rounded-lg border border-gray-200 px-2 py-1 outline-none focus:border-purple-400 placeholder:text-gray-400"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs">
              위치를 먼저 선택하시면 해당 위치의 자재 목록 및 전산 재고가 로딩됩니다.
            </div>
          )}

          {/* 비고 메모 */}
          {selectedLocationId && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">실사 총평 / 메모</label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="예: 10월 정기 월말 실사 완료"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-purple-500 outline-none"
              />
            </div>
          )}

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
              disabled={loading || !selectedLocationId}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>실사 반영 중...</span>
                </>
              ) : (
                <span>실사 확정 및 재고 반영</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
