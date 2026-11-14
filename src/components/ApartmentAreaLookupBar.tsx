'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Building2, Search, Sparkles, KeyRound, ExternalLink, Check, X, Loader2 } from 'lucide-react'
import {
  lookupApartmentUnitArea,
  saveBuildingApiKey,
} from '@/app/actions/buildingArea'
import {
  PRESET_SHORT_LABEL_MAP,
  extractDongHoFloorFromText,
  inferFloorFromHo,
  type AddressBjdMeta,
  type DongCandidateSummary,
  type UnitAreaInfo,
} from '@/lib/buildingAreaUtils'
import { handleSelectAllOnFocus } from '@/lib/format'

interface ApartmentAreaLookupBarProps {
  side: 'from' | 'to'
  address: string
  addressMeta?: Partial<AddressBjdMeta> | null
  dong: string
  ho: string
  onChangeDong: (val: string) => void
  onChangeHo: (val: string) => void
  onApplyDongHoToAddress?: (nextAddress: string) => void
  onInferredFloor: (floor: string) => void
  unitArea: UnitAreaInfo | null
  onChangeUnitArea: (info: UnitAreaInfo | null) => void
  onOpenRecommendedPreset?: (presetId: string) => void
}

export function ApartmentAreaLookupBar({
  side,
  address,
  addressMeta,
  dong,
  ho,
  onChangeDong,
  onChangeHo,
  onApplyDongHoToAddress,
  onInferredFloor,
  unitArea,
  onChangeUnitArea,
  onOpenRecommendedPreset,
}: ApartmentAreaLookupBarProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [needsApiKeySetup, setNeedsApiKeySetup] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [isSavingKey, setIsSavingKey] = useState(false)
  const [dongCandidates, setDongCandidates] = useState<DongCandidateSummary[]>([])
  const lastParsedAddressRef = useRef<string>('')

  // 주소 입력창에 "103동 1502호" 등을 직접 타이핑·붙여넣기한 경우 동/호/층수 자동 추출 연동
  useEffect(() => {
    const trimmed = (address || '').trim()
    if (!trimmed || trimmed === lastParsedAddressRef.current) return
    lastParsedAddressRef.current = trimmed

    const parsed = extractDongHoFloorFromText(trimmed)
    if (parsed.dong && parsed.dong !== dong) {
      onChangeDong(parsed.dong)
    }
    if (parsed.ho && parsed.ho !== ho) {
      onChangeHo(parsed.ho)
      if (parsed.floor) {
        onInferredFloor(parsed.floor)
      }
    }
  }, [address])

  const handleHoChange = (val: string) => {
    const cleaned = val.replace(/호$/g, '').trim()
    onChangeHo(val)
    const flr = inferFloorFromHo(cleaned)
    if (flr) {
      onInferredFloor(flr)
    }
  }

  const runLookup = async (overrideDong?: string, overrideHo?: string) => {
    const targetAddr = (address || '').trim()
    if (!targetAddr) {
      setErrorMsg(`${side === 'from' ? '출발지' : '도착지'} 주소를 먼저 입력하거나 검색해주세요.`)
      return
    }

    const effectiveDong = overrideDong !== undefined ? overrideDong : dong
    const effectiveHo = overrideHo !== undefined ? overrideHo : ho

    // 호수 입력 시 층수는 API 결과와 무관하게 즉시 선반영
    const localFloor = inferFloorFromHo(effectiveHo)
    if (localFloor) {
      onInferredFloor(localFloor)
    }

    setIsLoading(true)
    setErrorMsg(null)
    setDongCandidates([])

    try {
      const res = await lookupApartmentUnitArea({
        address: targetAddr,
        dong: effectiveDong,
        ho: effectiveHo,
        addressMeta,
      })

      if (res.inferredFloor) {
        onInferredFloor(res.inferredFloor)
      }

      if (!res.success) {
        if (res.errorCode === 'MISSING_API_KEY' || res.errorCode === 'INVALID_API_KEY') {
          setNeedsApiKeySetup(true)
        }
        setErrorMsg(res.error || '평형 정보를 조회하지 못했습니다.')
        return
      }

      setNeedsApiKeySetup(false)
      if (res.unitArea) {
        onChangeUnitArea(res.unitArea)
        if (res.unitArea.dongNm && !effectiveDong.trim()) {
          const cleanD = res.unitArea.dongNm.replace(/동$/g, '').trim()
          if (cleanD && cleanD !== '단일') onChangeDong(cleanD)
        }
      }
      if (res.needsDongSelection && res.dongCandidates && res.dongCandidates.length > 1) {
        setDongCandidates(res.dongCandidates)
      }
    } catch {
      setErrorMsg('평형 조회 중 통신 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveApiKeyAndRetry = async () => {
    const trimmed = apiKeyInput.trim()
    if (!trimmed) {
      alert('공공데이터포털 일반 인증키(Service Key)를 입력해주세요.')
      return
    }
    setIsSavingKey(true)
    try {
      const res = await saveBuildingApiKey(trimmed)
      if (!res.success) {
        alert(res.error || '인증키 저장에 실패했습니다.')
        return
      }
      setApiKeyInput('')
      setNeedsApiKeySetup(false)
      setErrorMsg(null)
      await runLookup()
    } finally {
      setIsSavingKey(false)
    }
  }

  // 주소 문자열에 현재 입력한 동/호가 아직 포함되어 있지 않은지 확인
  const cleanDong = dong.replace(/동$/g, '').trim()
  const cleanHo = ho.replace(/호$/g, '').trim()
  const canAppendDongHoToAddress =
    Boolean(onApplyDongHoToAddress && address.trim() && cleanHo) &&
    !address.includes(`${cleanHo}호`)

  const handleAppendToAddress = () => {
    if (!onApplyDongHoToAddress) return
    const suffix = `${cleanDong ? `${cleanDong}동 ` : ''}${cleanHo}호`
    const base = address.trim()
    onApplyDongHoToAddress(`${base} ${suffix}`)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="inline-flex items-center gap-1 text-indigo-800 font-extrabold text-xs whitespace-nowrap">
          <Building2 size={13} className="text-indigo-600 shrink-0" />
          <span>동·호수/평형:</span>
        </span>

        <div className="inline-flex items-center gap-1 shrink-0">
          <input
            type="text"
            value={dong}
            onChange={e => onChangeDong(e.target.value)}
            onFocus={handleSelectAllOnFocus}
            placeholder="101"
            className="w-13 sm:w-15 rounded-lg border border-gray-300 bg-white px-1.5 py-1 text-xs sm:text-sm text-center outline-none focus:border-indigo-500 shadow-2xs font-bold text-gray-800"
          />
          <span className="text-gray-600 text-xs font-semibold">동</span>
        </div>

        <div className="inline-flex items-center gap-1 shrink-0">
          <input
            type="text"
            value={ho}
            onChange={e => handleHoChange(e.target.value)}
            onFocus={handleSelectAllOnFocus}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                runLookup()
              }
            }}
            placeholder="1502"
            className="w-15 sm:w-18 rounded-lg border border-gray-300 bg-white px-1.5 py-1 text-xs sm:text-sm text-center outline-none focus:border-indigo-500 shadow-2xs font-bold text-gray-800"
          />
          <span className="text-gray-600 text-xs font-semibold">호</span>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => runLookup()}
          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-2xs transition-all active:scale-95 whitespace-nowrap"
          title="건축물대장·공동주택·공공임대 정보를 조회하여 평형대, 분양/임대 여부, 복도유형, 층수를 자동 산출합니다"
        >
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
          <span>{isLoading ? '조회중...' : '평형 조회'}</span>
        </button>

        <button
          type="button"
          onClick={() => setNeedsApiKeySetup(prev => !prev)}
          className="p-1.5 rounded-lg bg-white hover:bg-indigo-50 text-gray-500 hover:text-indigo-700 border border-gray-300 transition-colors shrink-0"
          title="공공데이터포털 통합 인증키 설정 및 무료 API 활용신청 안내"
        >
          <KeyRound size={12} />
        </button>

        {canAppendDongHoToAddress && (
          <button
            type="button"
            onClick={handleAppendToAddress}
            className="px-2 py-1 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-[11px] font-bold inline-flex items-center gap-0.5 transition-colors whitespace-nowrap"
            title="입력한 동·호수를 상단 주소란 끝에 자동으로 덧붙입니다"
          >
            <Check size={11} className="text-emerald-600" />
            <span>주소에 동·호 반영</span>
          </button>
        )}

        {/* 조회된 아파트/집합건물 평형대 · 분양/임대 구분 · 계단식/복도식 결과 배지 */}
        {unitArea && (
          <div
            title={`공급 ${unitArea.supplyAreaM2}㎡${unitArea.isEstimatedSupply ? '(추정)' : ''} · 전용 ${unitArea.exclusiveAreaM2}㎡ (실 ${unitArea.exclusivePyeong}평)${unitArea.totalHouseholds ? ` · 총 ${unitArea.totalHouseholds.toLocaleString()}세대` : ''}${unitArea.rentalSubType && unitArea.tenureCategory === 'MIXED' ? ` · 포함 임대유형: ${unitArea.rentalSubType}` : ''}`}
            className="inline-flex flex-wrap items-center gap-1.5 bg-indigo-50/90 border border-indigo-200 text-indigo-950 px-2.5 py-1 rounded-lg text-xs shadow-2xs"
          >
            <span className="font-black text-indigo-800 text-xs sm:text-sm whitespace-nowrap">
              🏢 {unitArea.pyeongType}평형
            </span>
            <span className="text-[11px] text-gray-700 font-semibold whitespace-nowrap">
              (전용 {unitArea.exclusiveAreaM2}㎡
              {!unitArea.tenureLabel && unitArea.mainPurpsNm ? ` · ${unitArea.mainPurpsNm}` : ''})
            </span>

            {unitArea.tenureLabel && (
              <>
                <span className="text-gray-400 font-bold">·</span>
                <span
                  className={`px-1.5 py-0.5 rounded font-extrabold text-[11px] border whitespace-nowrap ${
                    unitArea.tenureCategory === 'RENTAL'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : unitArea.tenureCategory === 'MIXED'
                        ? 'bg-purple-100 text-purple-900 border-purple-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  }`}
                >
                  [{unitArea.tenureLabel}]
                </span>
              </>
            )}

            {unitArea.hallType && (
              <>
                <span className="text-gray-400 font-bold">·</span>
                <span
                  className={`text-[11px] font-extrabold whitespace-nowrap ${
                    unitArea.hallType.includes('복도')
                      ? 'text-orange-700'
                      : 'text-slate-700'
                  }`}
                >
                  {unitArea.hallType}
                </span>
              </>
            )}

            {side === 'from' &&
              onOpenRecommendedPreset &&
              unitArea.recommendedPresetId && (
                <button
                  type="button"
                  onClick={() => onOpenRecommendedPreset(unitArea.recommendedPresetId!)}
                  className="ml-0.5 px-2 py-0.5 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 shadow-2xs transition-all active:scale-95 whitespace-nowrap"
                  title="조회된 평형대에 맞는 표준 이삿짐 물품 세트를 불러옵니다"
                >
                  <Sparkles size={11} className="text-amber-300" />
                  <span>
                    {PRESET_SHORT_LABEL_MAP[unitArea.recommendedPresetId] || `${unitArea.pyeongType}평형`} 템플릿
                  </span>
                </button>
              )}

            <button
              type="button"
              onClick={() => onChangeUnitArea(null)}
              className="text-gray-400 hover:text-gray-700 p-0.5"
              title="평형 조회 결과 지우기"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* 동 미입력 시 단지 내 복수 동 선택 가이드 */}
      {dongCandidates.length > 1 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-amber-900">
            단지 내 동일 호수가 여러 동에 있습니다. 해당 동을 선택하세요:
          </span>
          {dongCandidates.map(cand => (
            <button
              key={cand.dongNm}
              type="button"
              onClick={() => {
                const cleanD = cand.dongNm.replace(/동$/g, '').trim()
                onChangeDong(cleanD)
                runLookup(cleanD, ho)
              }}
              className="px-2 py-0.5 rounded-md bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 font-extrabold text-[11px] transition-colors"
            >
              {cand.dongNm} ({cand.pyeongType}평형 · 전용 {cand.exclusiveAreaM2}㎡)
            </button>
          ))}
        </div>
      )}

      {/* 일반 안내/오류 메시지 */}
      {errorMsg && !needsApiKeySetup && (
        <div className="text-[11px] font-semibold text-rose-600 flex items-center justify-between bg-rose-50/80 border border-rose-200 rounded-lg px-2.5 py-1">
          <span>⚠️ {errorMsg}</span>
          <button
            type="button"
            onClick={() => setNeedsApiKeySetup(true)}
            className="text-[10px] text-gray-500 hover:text-indigo-700 underline ml-2 shrink-0"
          >
            API 인증키 설정
          </button>
        </div>
      )}

      {/* 공공데이터포털 무료 통합 인증키 1회 등록 및 활용신청 안내 패널 */}
      {needsApiKeySetup && (
        <div className="bg-indigo-50/90 border border-indigo-200 rounded-xl p-2.5 sm:p-3 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-extrabold text-indigo-950 flex items-center gap-1.5">
              <KeyRound size={14} className="text-indigo-600 shrink-0" />
              <span>공공데이터포털 무료 인증키 1개 통합 등록 (평형 · 임대/분양 · 복도식)</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setNeedsApiKeySetup(false)
                setErrorMsg(null)
              }}
              className="text-gray-400 hover:text-gray-700 p-0.5"
              title="닫기"
            >
              <X size={14} />
            </button>
          </div>

          {errorMsg && <p className="text-[11px] text-rose-600 font-semibold">{errorMsg}</p>}

          <p className="text-[11px] text-indigo-900/90 leading-relaxed">
            공공데이터포털(<strong>data.go.kr</strong>) 계정 1개의 <strong>동일한 일반 인증키</strong>로 아래 무료 서비스에 활용신청만 추가하면 별도 키 발급 없이 모두 자동 연동됩니다.
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <a
              href="https://www.data.go.kr/data/15134735/openapi.do"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold text-[11px] transition-colors"
            >
              <span>① 건축물대장 (평형 필수)</span>
              <ExternalLink size={10} />
            </a>
            <a
              href="https://www.data.go.kr/tcs/dss/selectDataSetList.do?dType=API&keyword=%EA%B3%B5%EB%8F%99%EC%A3%BC%ED%83%9D+%EA%B8%B0%EB%B3%B8+%EC%A0%95%EB%B3%B4%EC%A0%9C%EA%B3%B5"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold text-[11px] transition-colors"
            >
              <span>② 공동주택 목록·기본정보 (분양/임대·복도식)</span>
              <ExternalLink size={10} />
            </a>
            <a
              href="https://www.data.go.kr/tcs/dss/selectDataSetList.do?dType=API&keyword=%EB%A7%88%EC%9D%B4%ED%99%88%ED%8F%AC%ED%84%B8+%EA%B3%B5%EA%B3%B5%EC%9E%84%EB%8C%80%EC%A3%BC%ED%83%9D+%EB%8B%A8%EC%A7%80%EC%A0%95%EB%B3%B4"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold text-[11px] transition-colors"
            >
              <span>③ 마이홈 공공임대 (국민·행복·영구임대)</span>
              <ExternalLink size={10} />
            </a>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="공공데이터포털 일반 인증키(Encoding 또는 Decoding) 1개 붙여넣기"
              autoComplete="off"
              className="flex-1 rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 text-xs font-mono text-gray-900 outline-none focus:border-indigo-600"
            />
            <button
              type="button"
              disabled={isSavingKey}
              onClick={handleSaveApiKeyAndRetry}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold text-xs whitespace-nowrap shadow-2xs"
            >
              {isSavingKey ? '저장중...' : '인증키 저장 후 바로 조회'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
