'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Video,
  Camera,
  Upload,
  RefreshCw,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Key,
  ChevronDown,
  X,
  FileVideo,
  Layers,
  ArrowRight
} from 'lucide-react'
import { compressImageFile } from '@/lib/imageCompressor'

export interface AiIdentifiedItem {
  id?: string
  location: string
  name: string
  spec: string
  quantity: number
  cbm: number
  innerBoxCbm: number
  treatment: '이동' | '폐기' | '내림' | '경유' | '존치'
  confidence?: number
  description?: string
}

interface AiCbmEstimateModalProps {
  isOpen: boolean
  onClose: () => void
  locations: { id: string; name: string }[]
  standardItems: { id: string; name: string; spec: string; defaultCbm: number; defaultInnerCbm: number }[]
  onApplyToEstimate: (items: AiIdentifiedItem[], mode: 'append' | 'replace') => void
  onStartBackgroundAnalysis?: (task: { location: string; promise: Promise<any> }) => void
}

export function AiCbmEstimateModal({
  isOpen,
  onClose,
  locations,
  standardItems,
  onApplyToEstimate,
  onStartBackgroundAnalysis
}: AiCbmEstimateModalProps) {
  const [activeTab, setActiveTab] = useState<'video' | 'image'>('video')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [hintLocation, setHintLocation] = useState<string>('')
  const [applyMode, setApplyMode] = useState<'append' | 'replace'>('append')

  // API 키 설정
  const [customApiKey, setCustomApiKey] = useState<string>('')
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false)

  // 분석 상태
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [loadingStep, setLoadingStep] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 분석 결과 데이터
  const [analysisResult, setAnalysisResult] = useState<{
    summary?: any
    items: AiIdentifiedItem[]
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const activeAnalysisPromiseRef = useRef<{ location: string; promise: Promise<any> } | null>(null)

  // 로컬스토리지에서 커스텀 API 키 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('meman_gemini_api_key') || ''
      setCustomApiKey(savedKey)
    }
  }, [])

  // 파일 미리보기 URL 관리
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(selectedFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [selectedFile])

  // 모달 닫힐 때 상태 리셋
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null)
      setIsLoading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSaveApiKey = (key: string) => {
    setCustomApiKey(key)
    if (typeof window !== 'undefined') {
      localStorage.setItem('meman_gemini_api_key', key)
    }
    setShowKeyInput(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setErrorMessage(null)
      setAnalysisResult(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (activeTab === 'video' && !file.type.startsWith('video/')) {
        alert('동영상 파일을 드롭해주세요.')
        return
      }
      if (activeTab === 'image' && !file.type.startsWith('image/')) {
        alert('이미지 파일을 드롭해주세요.')
        return
      }
      setSelectedFile(file)
      setErrorMessage(null)
      setAnalysisResult(null)
    }
  }

  // AI 분석 요청
  const handleStartAnalysis = async () => {
    if (!selectedFile) {
      alert('분석할 영상 또는 사진을 선택해주세요.')
      return
    }

    if (!hintLocation) {
      const proceed = window.confirm(
        '촬영 공간이 선택되지 않았습니다.\n공간을 선택하지 않고 AI 자동 감지로 계속 진행하시겠습니까?\n\n(확인을 누르면 AI 자동 감지로 분석되며, 감지되지 않으면 "기타/미지정"으로 배정됩니다)'
      )
      if (!proceed) return
    }

    setIsLoading(true)
    setErrorMessage(null)
    setLoadingStep('미디어 파일 업로드 준비 중...')

    try {
      const execAnalysis = async () => {
        let fileToUpload = selectedFile
        if (activeTab === 'image' && selectedFile.type.startsWith('image/')) {
          setLoadingStep('사진을 AI 초고속 모드로 경량화 중...')
          try {
            fileToUpload = await compressImageFile(selectedFile)
          } catch (e) {
            console.warn('사진 압축 실패, 원본 사용:', e)
          }
        }

        const formData = new FormData()
        formData.append('file', fileToUpload)
        if (hintLocation) formData.append('hintLocation', hintLocation)
        if (customApiKey) formData.append('customApiKey', customApiKey)

        setLoadingStep(
          activeTab === 'video'
            ? 'AI 모델이 360도 공간과 가구·가전을 면밀히 식별하는 중입니다 (약 15~30초 소요)...'
            : 'AI 모델이 사진 속 물품을 식별하고 CBM을 매핑하는 중입니다 (약 2~4초)...'
        )

        const res = await fetch('/api/ai/analyze-media', {
          method: 'POST',
          body: formData
        })

        let data: any = {}
        try {
          data = await res.json()
        } catch {
          throw new Error(`서버 통신 실패 (HTTP ${res.status}): 잠시 후 다시 시도해주세요.`)
        }

        if (!res.ok) {
          if (data.error === 'GEMINI_API_KEY_MISSING') {
            setShowKeyInput(true)
          }
          throw new Error(data.message || `분석 실패 (코드: ${res.status})`)
        }

        return {
          summary: data.summary,
          items: (data.items || []).map((item: any, idx: number) => ({
            ...item,
            id: `ai_${Date.now()}_${idx}`
          }))
        }
      }

      const p = execAnalysis()
      activeAnalysisPromiseRef.current = {
        location: hintLocation || '기타/미지정',
        promise: p
      }

      const result = await p
      setAnalysisResult(result)
    } catch (err: any) {
      console.error('분석 에러:', err)
      setErrorMessage(err.message || '영상/사진 분석에 실패했습니다.')
    } finally {
      setIsLoading(false)
      setLoadingStep('')
      activeAnalysisPromiseRef.current = null
    }
  }

  // 결과 항목 수정 핸들러
  const handleItemChange = (index: number, field: keyof AiIdentifiedItem, value: any) => {
    if (!analysisResult) return
    const nextItems = [...analysisResult.items]
    nextItems[index] = { ...nextItems[index], [field]: value }

    // 마스터 품목 변경 시 CBM 자동 갱신
    if (field === 'name') {
      const matched = standardItems.find(s => s.name === value)
      if (matched) {
        nextItems[index].spec = matched.spec
        nextItems[index].cbm = matched.defaultCbm
        nextItems[index].innerBoxCbm = matched.defaultInnerCbm
      }
    }

    setAnalysisResult({
      ...analysisResult,
      items: nextItems
    })
  }

  const handleDeleteItem = (index: number) => {
    if (!analysisResult) return
    const nextItems = analysisResult.items.filter((_, i) => i !== index)
    setAnalysisResult({
      ...analysisResult,
      items: nextItems
    })
  }

  const handleAddItem = () => {
    if (!analysisResult) return
    const defaultLoc = hintLocation || ''
    const defaultStd = standardItems[0] || { name: '기타', spec: '', defaultCbm: 0.1, defaultInnerCbm: 0 }
    const newItem: AiIdentifiedItem = {
      id: `ai_${Date.now()}_${Math.random()}`,
      location: defaultLoc,
      name: defaultStd.name,
      spec: defaultStd.spec,
      quantity: 1,
      cbm: defaultStd.defaultCbm,
      innerBoxCbm: defaultStd.defaultInnerCbm,
      treatment: '이동',
      confidence: 1.0
    }
    setAnalysisResult({
      ...analysisResult,
      items: [...analysisResult.items, newItem]
    })
  }

  // 총 CBM 계산
  const calculatedTotalCbm = analysisResult
    ? analysisResult.items.reduce((acc, cur) => {
        const isExcluded = cur.treatment === '폐기' || cur.treatment === '내림' || cur.treatment === '존치'
        const base = isExcluded ? 0 : cur.cbm
        return acc + (base + cur.innerBoxCbm) * cur.quantity
      }, 0)
    : 0

  // 견적서에 적용
  const handleApply = () => {
    if (!analysisResult || analysisResult.items.length === 0) {
      alert('반영할 품목이 없습니다.')
      return
    }
    onApplyToEstimate(analysisResult.items, applyMode)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* 모달 상단 헤더 */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs border border-white/20 shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">AI 영상·사진 CBM 자동 견적</h3>
                <span className="text-[11px] font-semibold bg-white/20 text-blue-100 px-2 py-0.5 rounded-full border border-white/25">
                  Gemini Vision
                </span>
              </div>
              <p className="text-xs text-blue-100/90 hidden sm:block">
                스마트폰으로 현장을 둘러보며 촬영한 영상이나 사진을 AI가 분석하여 CBM과 물품을 자동 산출합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="px-2.5 py-1 text-xs rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center gap-1 transition-colors border border-white/20"
              title="Gemini API Key 설정"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">API 키</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* API Key 입력 팝업 바 */}
        {showKeyInput && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex flex-col sm:flex-row items-center gap-2 text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-1.5 font-bold shrink-0">
              <Key className="w-4 h-4 text-amber-600" />
              <span>Gemini API 키:</span>
            </div>
            <input
              type="password"
              placeholder="AI Studio에서 발급받은 API 키를 입력해주세요 (AIza...)"
              defaultValue={customApiKey}
              id="customApiKeyInput"
              className="flex-1 w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
            <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('customApiKeyInput') as HTMLInputElement
                  if (el) handleSaveApiKey(el.value.trim())
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors"
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => setShowKeyInput(false)}
                className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* 메인 스크롤 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 1. 업로드 및 촬영 섹션 */}
          <div className="bg-gray-50/80 rounded-2xl p-3.5 sm:p-4 border border-gray-200 space-y-3">
            {/* 상단 탭 및 공간 힌트 */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center bg-gray-200/80 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('video')
                    setSelectedFile(null)
                    setAnalysisResult(null)
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'video'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>동영상 촬영/업로드 (권장)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('image')
                    setSelectedFile(null)
                    setAnalysisResult(null)
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'image'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>사진 촬영/업로드</span>
                </button>
              </div>

              {/* 촬영 공간 선택 */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 font-medium">촬영 공간:</span>
                <select
                  value={hintLocation}
                  onChange={e => setHintLocation(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">AI 자동 감지 (전체)</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 업로드 & 카메라 드롭존 */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-4 sm:p-6 text-center transition-all ${
                selectedFile
                  ? 'border-blue-400 bg-blue-50/40'
                  : 'border-gray-300 hover:border-blue-400 bg-white hover:bg-blue-50/20'
              }`}
            >
              {selectedFile ? (
                <div className="space-y-3">
                  {activeTab === 'video' ? (
                    <div className="flex flex-col items-center justify-center">
                      {previewUrl ? (
                        <video
                          src={previewUrl}
                          controls
                          className="max-h-48 rounded-lg shadow-sm border border-gray-200 bg-black"
                        />
                      ) : (
                        <FileVideo className="w-12 h-12 text-blue-600" />
                      )}
                      <p className="mt-2 text-xs font-bold text-gray-800">
                        {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      {previewUrl && (
                        <img
                          src={previewUrl}
                          alt="선택된 사진"
                          className="max-h-48 rounded-lg shadow-sm border border-gray-200 object-contain"
                        />
                      )}
                      <p className="mt-2 text-xs font-bold text-gray-800">
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null)
                        setAnalysisResult(null)
                      }}
                      className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                    >
                      파일 변경
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleStartAnalysis}
                      className="px-5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isLoading ? '분석 중...' : 'AI 자동 분석 시작'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    {activeTab === 'video' ? <Video className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      {activeTab === 'video'
                        ? '현장 동영상을 촬영하거나 파일을 업로드하세요'
                        : '현장 사진을 촬영하거나 파일을 업로드하세요'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activeTab === 'video'
                        ? '방 중앙에서 천천히 360도 회전하며 10~30초 동안 촬영하면 정확도가 가장 높습니다.'
                        : '방 전체 가구와 가전이 잘 보이도록 전경 사진을 촬영해주세요.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {/* 모바일 직접 촬영 버튼 */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!hintLocation) {
                          const proceed = window.confirm(
                            '촬영 공간이 선택되지 않았습니다.\n공간을 선택하지 않고 AI 자동 감지로 촬영을 진행하시겠습니까?\n\n(확인을 누르면 AI 자동 감지로 진행되며, 감지되지 않으면 "기타/미지정"으로 배정됩니다)'
                          )
                          if (!proceed) return
                        }
                        cameraInputRef.current?.click()
                      }}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      <span>카메라로 즉시 촬영</span>
                    </button>
                    {/* 파일 선택 버튼 */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!hintLocation) {
                          const proceed = window.confirm(
                            '촬영 공간이 선택되지 않았습니다.\n공간을 선택하지 않고 AI 자동 감지로 파일을 선택하시겠습니까?\n\n(확인을 누르면 AI 자동 감지로 진행되며, 감지되지 않으면 "기타/미지정"으로 배정됩니다)'
                          )
                          if (!proceed) return
                        }
                        fileInputRef.current?.click()
                      }}
                      className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span>앨범/파일에서 선택</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 숨김 Input (파일 선택용) */}
              <input
                ref={fileInputRef}
                type="file"
                accept={activeTab === 'video' ? 'video/*' : 'image/*'}
                onChange={handleFileChange}
                className="hidden"
              />
              {/* 숨김 Input (카메라 즉시 촬영용) */}
              <input
                ref={cameraInputRef}
                type="file"
                accept={activeTab === 'video' ? 'video/*' : 'image/*'}
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* 에러 메시지 */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">분석 실패: </span>
                <span>{errorMessage}</span>
                {errorMessage.includes('API') && (
                  <button
                    type="button"
                    onClick={() => setShowKeyInput(true)}
                    className="ml-2 font-bold underline text-red-700 hover:text-red-900"
                  >
                    API 키 설정 열기
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 로딩 애니메이션 */}
          {isLoading && (
            <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-6 text-center space-y-3 animate-in fade-in">
              <div className="relative w-12 h-12 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                <Sparkles className="w-5 h-5 text-indigo-600 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">AI가 영상/사진 속 가구와 가전을 식별하고 있습니다</p>
                <p className="text-xs text-blue-700 mt-1">{loadingStep}</p>
              </div>

              {/* 백그라운드 전환 버튼 */}
              {onStartBackgroundAnalysis && activeAnalysisPromiseRef.current && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeAnalysisPromiseRef.current) {
                        onStartBackgroundAnalysis(activeAnalysisPromiseRef.current)
                        onClose()
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 shadow-2xs inline-flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <ArrowRight size={14} className="text-blue-600" />
                    <span>기다리지 않고 다른 방으로 이동 (백그라운드에서 분석 계속)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. 분석 결과 및 검토 영역 */}
          {analysisResult && (
            <div className="space-y-3.5 animate-in fade-in duration-300">
              {/* 분석 결과 상단 요약 카드 */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-sm text-gray-900">AI 분석 완료 (검토 및 수정)</h4>
                    <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      {analysisResult.items.length}개 품목 감지
                    </span>
                  </div>
                  {analysisResult.summary?.specialNotes && (
                    <p className="text-xs text-gray-600 mt-1">
                      💡 <span className="font-semibold text-gray-800">특이사항:</span> {analysisResult.summary.specialNotes}
                    </p>
                  )}
                </div>

                {/* 총 CBM 합계 강조 */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto bg-white/90 backdrop-blur-xs px-4 py-2 rounded-xl border border-indigo-200 shadow-2xs">
                  <span className="text-xs font-semibold text-gray-500">예상 산출 CBM</span>
                  <span className="text-lg font-black text-indigo-700">
                    {Math.round(calculatedTotalCbm * 10) / 10} <span className="text-xs font-normal text-gray-500">CBM</span>
                  </span>
                </div>
              </div>

              {/* 품목 목록 테이블 */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/90 border-b border-gray-200">
                  <span className="text-xs font-bold text-gray-700">감지된 물품 목록</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>품목 추가</span>
                  </button>
                </div>

                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50/60 text-gray-500 font-semibold border-b border-gray-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-2.5 w-24">공간</th>
                        <th className="py-2 px-2.5">품목명</th>
                        <th className="py-2 px-2.5 w-28">규격</th>
                        <th className="py-2 px-2.5 w-24 text-center">수량</th>
                        <th className="py-2 px-2.5 w-20 text-center">처리옵션</th>
                        <th className="py-2 px-2.5 w-20 text-right">CBM(단위)</th>
                        <th className="py-2 px-2 text-center w-10">삭제</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {analysisResult.items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-400">
                            감지된 품목이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        analysisResult.items.map((item, idx) => {
                          const isExcluded = item.treatment === '폐기' || item.treatment === '내림' || item.treatment === '존치'
                          return (
                            <tr key={item.id || idx} className="hover:bg-blue-50/30 transition-colors">
                              {/* 공간 드롭다운 */}
                              <td className="py-1.5 px-2.5">
                                <select
                                  value={item.location || ''}
                                  onChange={e => handleItemChange(idx, 'location', e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-200 rounded px-1.5 py-1 text-xs font-semibold text-gray-700 focus:bg-white"
                                >
                                  <option value="">기타/미지정</option>
                                  {locations.map(loc => (
                                    <option key={loc.id} value={loc.name}>
                                      {loc.name}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* 품목명 */}
                              <td className="py-1.5 px-2.5">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={e => handleItemChange(idx, 'name', e.target.value)}
                                  className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs font-bold text-gray-900 focus:border-blue-500"
                                />
                                {item.description && (
                                  <span className="text-[10px] text-gray-400 block truncate max-w-xs">
                                    {item.description}
                                  </span>
                                )}
                              </td>

                              {/* 규격 */}
                              <td className="py-1.5 px-2.5">
                                <input
                                  type="text"
                                  value={item.spec}
                                  onChange={e => handleItemChange(idx, 'spec', e.target.value)}
                                  className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 focus:border-blue-500"
                                />
                              </td>

                              {/* 수량 */}
                              <td className="py-1.5 px-2.5">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleItemChange(idx, 'quantity', Math.max(1, item.quantity - 1))}
                                    className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold flex items-center justify-center"
                                  >
                                    -
                                  </button>
                                  <span className="w-6 text-center font-bold text-gray-900">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleItemChange(idx, 'quantity', item.quantity + 1)}
                                    className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold flex items-center justify-center"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>

                              {/* 처리옵션 */}
                              <td className="py-1.5 px-2.5 text-center">
                                <select
                                  value={item.treatment}
                                  onChange={e => handleItemChange(idx, 'treatment', e.target.value)}
                                  className={`rounded px-1.5 py-1 text-[11px] font-bold border ${
                                    item.treatment === '폐기'
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : item.treatment === '내림'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : item.treatment === '경유'
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : item.treatment === '존치'
                                      ? 'bg-slate-50 text-slate-700 border-slate-300'
                                      : 'bg-gray-50 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  <option value="이동">이동</option>
                                  <option value="폐기">폐기</option>
                                  <option value="내림">내림</option>
                                  <option value="경유">경유</option>
                                  <option value="존치">존치</option>
                                </select>
                              </td>

                              {/* CBM */}
                              <td className="py-1.5 px-2.5 text-right font-mono">
                                <span className={isExcluded ? 'line-through text-gray-400' : 'font-bold text-gray-800'}>
                                  {item.cbm}
                                </span>
                                {item.innerBoxCbm > 0 && (
                                  <span className="text-[10px] text-blue-600 ml-1">+{item.innerBoxCbm}</span>
                                )}
                              </td>

                              {/* 삭제 */}
                              <td className="py-1.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(idx)}
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 모달 하단 액션 바 */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* 적용 옵션 (추가 vs 대체) */}
          {analysisResult && (
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-gray-600">견적서 반영 방식:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="applyMode"
                  value="append"
                  checked={applyMode === 'append'}
                  onChange={() => setApplyMode('append')}
                  className="text-blue-600"
                />
                <span className="font-medium text-gray-700">기존 목록에 추가 (권장)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="applyMode"
                  value="replace"
                  checked={applyMode === 'replace'}
                  onChange={() => setApplyMode('replace')}
                  className="text-blue-600"
                />
                <span className="font-medium text-gray-700">기존 물품 덮어쓰기</span>
              </label>
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl transition-colors"
            >
              닫기
            </button>
            {analysisResult && (
              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>견적서에 즉시 반영하기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
