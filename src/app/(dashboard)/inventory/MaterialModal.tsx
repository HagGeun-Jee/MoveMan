'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createMaterialItem, updateMaterialItem } from '@/app/actions/inventory'
import { X, Loader2, AlertCircle, Copy, CheckCircle2 } from 'lucide-react'

interface MaterialModalProps {
  isOpen: boolean
  onClose: () => void
  materialToEdit?: any | null
  existingMaterials?: Array<{
    id: string
    code: string
    name: string
    category?: string
    unit?: string
    safetyStock?: number
    unitPrice?: number
    memo?: string | null
  }>
  onSuccess: () => void
}

export function MaterialModal({
  isOpen,
  onClose,
  materialToEdit,
  existingMaterials = [],
  onSuccess
}: MaterialModalProps) {
  const isCopyMode = Boolean(materialToEdit?._isCopy)
  const isEditMode = Boolean(materialToEdit?.id && !isCopyMode)

  // 텍스트 필드 DOM 직접 참조 (안드로이드 한글 입력 시 React Re-render로 인한 커서 튐 방지)
  const codeInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const unitInputRef = useRef<HTMLInputElement>(null)
  const memoInputRef = useRef<HTMLInputElement>(null)

  // 자재 품명 기본 가나다순 정렬
  const sortedExistingMaterials = useMemo(() => {
    return [...existingMaterials].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [existingMaterials])

  const [category, setCategory] = useState(materialToEdit?.category || 'REUSABLE')
  const [safetyStock, setSafetyStock] = useState(materialToEdit?.safetyStock || 0)
  const [unitPrice, setUnitPrice] = useState(materialToEdit?.unitPrice || 0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  // 수정 대상 또는 오픈 상태 변경 시 폼 필드 동기화
  useEffect(() => {
    if (materialToEdit) {
      if (codeInputRef.current) codeInputRef.current.value = materialToEdit.code || ''
      if (nameInputRef.current) nameInputRef.current.value = materialToEdit.name || ''
      setCategory(materialToEdit.category || 'REUSABLE')
      if (unitInputRef.current) unitInputRef.current.value = materialToEdit.unit || '개'
      setSafetyStock(materialToEdit.safetyStock ?? 0)
      setUnitPrice(materialToEdit.unitPrice ?? 0)
      if (memoInputRef.current) memoInputRef.current.value = materialToEdit.memo || ''
      setSelectedTemplateId(materialToEdit.id || '')
    } else {
      if (codeInputRef.current) codeInputRef.current.value = ''
      if (nameInputRef.current) nameInputRef.current.value = ''
      setCategory('REUSABLE')
      if (unitInputRef.current) unitInputRef.current.value = '개'
      setSafetyStock(0)
      setUnitPrice(0)
      if (memoInputRef.current) memoInputRef.current.value = ''
      setSelectedTemplateId('')
    }
    setError(null)
  }, [materialToEdit, isOpen])

  if (!isOpen) return null

  // 기존 자재 정보를 기초로 복사 채우기
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    if (!templateId) return
    const target = existingMaterials.find(m => m.id === templateId)
    if (target) {
      // DOM value 직접 갱신 (React state 리렌더링 없이 즉시 반영)
      if (codeInputRef.current) codeInputRef.current.value = `${target.code}-COPY`
      if (nameInputRef.current) nameInputRef.current.value = `${target.name} (복사본)`
      setCategory(target.category || 'REUSABLE')
      if (unitInputRef.current) unitInputRef.current.value = target.unit || '개'
      setSafetyStock(target.safetyStock ?? 0)
      setUnitPrice(target.unitPrice ?? 0)
      if (memoInputRef.current) memoInputRef.current.value = target.memo || ''
      setError(null)
    }
  }

  // 중복 검사 (코드 및 품목명)
  const validateDuplicate = () => {
    const trimmedCode = (codeInputRef.current?.value || '').trim()
    const trimmedName = (nameInputRef.current?.value || '').trim()

    if (!trimmedCode) return '자재 코드를 입력해 주세요.'
    if (!trimmedName) return '자재 품목명을 입력해 주세요.'

    const targetId = isEditMode ? materialToEdit?.id : undefined

    // 1. 코드 중복 체크
    const dupCode = existingMaterials.find(
      m => m.code.toLowerCase() === trimmedCode.toLowerCase() && m.id !== targetId
    )
    if (dupCode) {
      return `이미 등록된 자재 코드입니다. (${trimmedCode})`
    }

    // 2. 품목명 중복 체크
    const dupName = existingMaterials.find(
      m => m.name.toLowerCase() === trimmedName.toLowerCase() && m.id !== targetId
    )
    if (dupName) {
      return `이미 등록된 자재 품목명입니다. (${trimmedName})`
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 저장 전 코드/품목명 중복 검사
    const dupError = validateDuplicate()
    if (dupError) {
      setError(dupError)
      return
    }

    const codeVal = (codeInputRef.current?.value || '').trim()
    const nameVal = (nameInputRef.current?.value || '').trim()
    const unitVal = (unitInputRef.current?.value || '').trim()
    const memoVal = (memoInputRef.current?.value || '').trim()

    setLoading(true)

    let res: any
    if (isEditMode) {
      res = await updateMaterialItem(materialToEdit.id, {
        code: codeVal,
        name: nameVal,
        category,
        unit: unitVal,
        safetyStock: Number(safetyStock) || 0,
        unitPrice: Number(unitPrice) || 0,
        memo: memoVal
      })
    } else {
      res = await createMaterialItem({
        code: codeVal,
        name: nameVal,
        category,
        unit: unitVal,
        safetyStock: Number(safetyStock) || 0,
        unitPrice: Number(unitPrice) || 0,
        memo: memoVal
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
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            {isCopyMode ? (
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <Copy size={16} />
              </span>
            ) : null}
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isEditMode
                  ? '자재 품목 수정'
                  : isCopyMode
                  ? '자재 품목 복사 등록 (신규)'
                  : '신규 자재 품목 등록'}
              </h2>
              {isCopyMode && (
                <p className="text-[11px] text-blue-600 mt-0.5">
                  기존 자재 정보를 기초로 복사되었습니다. 코드 및 품목명을 수정해 주세요.
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="font-semibold">{error}</div>
            </div>
          )}

          {/* 신규 등록 모드일 때 기존 자재 정보 불러오기 드롭다운 */}
          {!isEditMode && existingMaterials.length > 0 && (
            <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-100 space-y-1">
              <label className="text-[11px] font-bold text-blue-800 flex items-center gap-1.5">
                <Copy size={13} />
                <span>기존 자재 기초로 복사 불러오기 (선택)</span>
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 font-medium outline-none focus:border-blue-500"
              >
                <option value="">-- 기존 자재 선택 시 정보가 복사됩니다 --</option>
                {sortedExistingMaterials.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code}) - {m.unit} | {(m.unitPrice ?? 0).toLocaleString()}원
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700">자재 코드</label>
              <span className="text-[10px] text-gray-400 font-normal">영문/숫자 고유 식별자</span>
            </div>
            <input
              ref={codeInputRef}
              type="text"
              required
              defaultValue={materialToEdit?.code || ''}
              placeholder="예: MAT-BOX-01"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-mono font-medium focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700">자재 품명</label>
              <span className="text-[10px] text-gray-400 font-normal">품목명 중복 불가</span>
            </div>
            <input
              ref={nameInputRef}
              type="text"
              required
              defaultValue={materialToEdit?.name || ''}
              placeholder="예: 이사용 바구니 (청색)"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
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
                ref={unitInputRef}
                type="text"
                required
                defaultValue={materialToEdit?.unit || '개'}
                placeholder="개, 롤, 매 등"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
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
              ref={memoInputRef}
              type="text"
              defaultValue={materialToEdit?.memo || ''}
              placeholder="규격 또는 특이사항"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              data-gramm="false"
              data-enable-grammarly="false"
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
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm shadow-blue-200"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <span>{isEditMode ? '수정 저장' : '등록 저장'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
