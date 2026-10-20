'use client'

import React, { useState } from 'react'
import { ESTIMATE_PRESETS, type EstimatePreset, type PresetItem } from '@/lib/estimatePresets'
import { Zap, X, Check, ArrowRight, Layers, Sparkles, AlertTriangle } from 'lucide-react'

interface EstimatePresetModalProps {
  isOpen: boolean
  onClose: () => void
  onApplyPreset: (items: PresetItem[], mode: 'replace' | 'append') => void
  currentItemsCount: number
}

export function EstimatePresetModal({
  isOpen,
  onClose,
  onApplyPreset,
  currentItemsCount
}: EstimatePresetModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<EstimatePreset>(ESTIMATE_PRESETS[2]) // 기본값 24평
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>(currentItemsCount > 0 ? 'replace' : 'replace')
  const [showConfirm, setShowConfirm] = useState(false)

  if (!isOpen) return null

  const handleApply = () => {
    if (currentItemsCount > 0 && applyMode === 'replace') {
      setShowConfirm(true)
    } else {
      onApplyPreset(selectedPreset.items, applyMode)
      onClose()
    }
  }

  const handleConfirmReplace = () => {
    onApplyPreset(selectedPreset.items, 'replace')
    setShowConfirm(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-indigo-700 via-purple-700 to-blue-700 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <Zap size={18} className="text-amber-300 fill-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold flex items-center gap-1.5">
                <span>평형별 표준 템플릿</span>
                <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 border border-white/25">
                  현장 5초 셋업
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-white/80">
                주택 평형 및 가구 규모를 선택하면 표준 이삿짐이 각 방별로 자동 구성됩니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 본문 (스크롤) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* 평형 카드 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {ESTIMATE_PRESETS.map((preset) => {
              const isSelected = selectedPreset.id === preset.id
              const totalItems = preset.items.reduce((sum, it) => sum + it.quantity, 0)

              return (
                <div
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  className={`relative p-3.5 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 shadow-md ring-2 ring-indigo-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/70 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 text-gray-700 mb-1 border border-gray-200">
                        {preset.badge}
                      </span>
                      <h4 className="text-sm sm:text-base font-extrabold text-gray-900">
                        {preset.name}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="inline-block text-xs sm:text-sm font-extrabold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full border border-indigo-200">
                        {preset.estimatedCbm}
                      </span>
                      <div className="text-[11px] text-gray-500 font-semibold mt-0.5">
                        {preset.estimatedTonnage}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mt-2 font-medium">
                    {preset.targetDescription}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-gray-200/80 flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1 font-semibold text-gray-700">
                      <Layers size={13} className="text-indigo-600" />
                      총 {preset.items.length}개 품목 ({totalItems}점)
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-xs font-bold text-indigo-600">
                        <Check size={14} className="stroke-[3]" /> 선택됨
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 선택된 템플릿 세부 품목 미리보기 */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                선택된 템플릿 포함 품목 미리보기 ({selectedPreset.name})
              </span>
              <span className="text-xs text-gray-500 font-medium">
                총 {selectedPreset.items.length}종류 자동 배치
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded-lg border border-gray-200 text-xs">
              {selectedPreset.items.map((it, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-50 text-gray-800 border border-gray-200 text-[11px] sm:text-xs"
                >
                  <span className="font-bold text-indigo-700">[{it.locationName}]</span>
                  <span className="font-medium">{it.name}</span>
                  <span className="text-gray-400">({it.spec})</span>
                  <span className="font-extrabold text-blue-600">×{it.quantity}</span>
                </span>
              ))}
            </div>
          </div>

          {/* 적용 옵션 (기존 물품이 있을 때) */}
          {currentItemsCount > 0 && (
            <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="text-amber-900 font-medium">
                ⚠️ 현재 입력된 물품이 <strong className="font-extrabold">{currentItemsCount}개</strong> 있습니다. 어떻게 적용할까요?
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="inline-flex items-center gap-1 cursor-pointer font-bold text-gray-800">
                  <input
                    type="radio"
                    name="applyMode"
                    value="replace"
                    checked={applyMode === 'replace'}
                    onChange={() => setApplyMode('replace')}
                    className="accent-indigo-600"
                  />
                  <span>새로 덮어쓰기 (권장)</span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer font-bold text-gray-800">
                  <input
                    type="radio"
                    name="applyMode"
                    value="append"
                    checked={applyMode === 'append'}
                    onChange={() => setApplyMode('append')}
                    className="accent-indigo-600"
                  />
                  <span>기존 짐에 추가</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 하단 푸터 버튼 */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500 hidden sm:block">
            선택한 템플릿 적용 후 현장에서 특이 물품만 1~2개 가감하시면 즉시 견적이 완성됩니다.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-gray-600 bg-white hover:bg-gray-100 border border-gray-300 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Zap size={15} className="fill-white" />
              <span>{selectedPreset.name} 템플릿 적용</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* 덮어쓰기 재확인 모달 레이어 */}
        {showConfirm && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4 z-20">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-gray-200 text-center space-y-3 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
              <h4 className="text-base font-bold text-gray-900">
                기존 물품을 템플릿으로 초기화할까요?
              </h4>
              <p className="text-xs text-gray-600">
                기존에 입력된 짐 목록을 지우고 <strong>[{selectedPreset.name}]</strong> 표준 템플릿으로 완전히 새로 구성합니다.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReplace}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs"
                >
                  초기화 후 적용
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
