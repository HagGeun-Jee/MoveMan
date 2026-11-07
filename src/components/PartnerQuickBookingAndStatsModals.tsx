'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  getPartnerCompanies,
  createPartnerCompany,
  updatePartnerCompany,
  deletePartnerCompany,
  createQuickVisitEstimate,
  type PartnerCompanyItem,
  type PartnerBadgeColor
} from '@/app/actions/partner'
import { formatPhoneNumber, handlePhoneInputChange, handleSelectAllOnFocus } from '@/lib/format'
import {
  Building2,
  CalendarClock,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  BarChart3,
  Phone,
  User,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ClipboardPaste
} from 'lucide-react'

export const PARTNER_COLOR_PALETTE: {
  key: PartnerBadgeColor
  label: string
  badgeClass: string
  activeBtnClass: string
  dotClass: string
}[] = [
  {
    key: 'blue',
    label: '블루',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    activeBtnClass: 'bg-blue-600 text-white border-blue-600',
    dotClass: 'bg-blue-600'
  },
  {
    key: 'indigo',
    label: '인디고',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    activeBtnClass: 'bg-indigo-600 text-white border-indigo-600',
    dotClass: 'bg-indigo-600'
  },
  {
    key: 'emerald',
    label: '에메랄드',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    activeBtnClass: 'bg-emerald-600 text-white border-emerald-600',
    dotClass: 'bg-emerald-600'
  },
  {
    key: 'purple',
    label: '퍼플',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    activeBtnClass: 'bg-purple-600 text-white border-purple-600',
    dotClass: 'bg-purple-600'
  },
  {
    key: 'amber',
    label: '앰버',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    activeBtnClass: 'bg-amber-500 text-white border-amber-500',
    dotClass: 'bg-amber-500'
  },
  {
    key: 'rose',
    label: '로즈',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    activeBtnClass: 'bg-rose-600 text-white border-rose-600',
    dotClass: 'bg-rose-600'
  },
  {
    key: 'cyan',
    label: '시안',
    badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    activeBtnClass: 'bg-cyan-600 text-white border-cyan-600',
    dotClass: 'bg-cyan-600'
  },
  {
    key: 'slate',
    label: '슬레이트',
    badgeClass: 'bg-slate-200 text-slate-800 border-slate-300',
    activeBtnClass: 'bg-slate-700 text-white border-slate-700',
    dotClass: 'bg-slate-700'
  }
]

export function getPartnerBadgeStyle(color?: string) {
  return (
    PARTNER_COLOR_PALETTE.find(c => c.key === color) || PARTNER_COLOR_PALETTE[0]
  )
}

const VISIT_TIME_PRESETS = [
  '09:00',
  '10:00',
  '11:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00'
]

/**
 * 1. 문자 수신 후 10초 만에 방문견적 예약을 등록하는 모달
 */
export function QuickVisitBookingModal({
  isOpen,
  onClose,
  initialPartners,
  onSaved
}: {
  isOpen: boolean
  onClose: () => void
  initialPartners?: PartnerCompanyItem[]
  onSaved?: () => void
}) {
  const router = useRouter()
  const [partners, setPartners] = useState<PartnerCompanyItem[]>(initialPartners || [])
  const [smsRawText, setSmsRawText] = useState('')
  const [parseFeedback, setParseFeedback] = useState<string | null>(null)

  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('')
  const [selectedPartnerName, setSelectedPartnerName] = useState<string>('')
  const [selectedPartnerShortName, setSelectedPartnerShortName] = useState<string>('')
  const [selectedPartnerColor, setSelectedPartnerColor] = useState<PartnerBadgeColor>('blue')

  // 인라인 새 업체 빠른 추가 상태
  const [isAddingNewPartner, setIsAddingNewPartner] = useState(false)
  const [newPartnerName, setNewPartnerName] = useState('')
  const [newPartnerColor, setNewPartnerColor] = useState<PartnerBadgeColor>('blue')
  const [creatingPartner, setCreatingPartner] = useState(false)

  // 고객 및 방문일정 입력 상태
  const [customerName, setCustomerName] = useState('')
  const [contact, setContact] = useState('')
  const [movingType, setMovingType] = useState<'P' | 'G' | 'K'>('P')
  const [visitDatePart, setVisitDatePart] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const [visitTimePart, setVisitTimePart] = useState('14:00')
  const [movingDatePart, setMovingDatePart] = useState('')
  const [fromAddress, setFromAddress] = useState('')
  const [toAddress, setToAddress] = useState('')
  const [specialNotes, setSpecialNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    getPartnerCompanies().then(list => {
      setPartners(list)
      if (list.length > 0 && !selectedPartnerName) {
        setSelectedPartnerId(list[0].id)
        setSelectedPartnerName(list[0].name)
        setSelectedPartnerShortName(list[0].shortName || list[0].name.slice(0, 4))
        setSelectedPartnerColor(list[0].color || 'blue')
      }
    })
  }, [isOpen])

  if (!isOpen) return null

  // 수신 문자 텍스트에서 연락처, 고객명, 주소, 의뢰업체 자동 추출
  const handleParseSmsText = (text: string) => {
    setSmsRawText(text)
    if (!text.trim()) {
      setParseFeedback(null)
      return
    }

    const extractedItems: string[] = []

    // 1. 전화번호 추출 (010-XXXX-XXXX 또는 010XXXXXXXX)
    const phoneMatch = text.match(/(01[016789][-\s.]?\d{3,4}[-\s.]?\d{4})/)
    if (phoneMatch) {
      const cleanPhone = formatPhoneNumber(phoneMatch[1].replace(/[^0-9]/g, ''))
      setContact(cleanPhone)
      extractedItems.push(`연락처(${cleanPhone})`)
    }

    // 2. 등록된 의뢰 이사업체명이 문자에 포함되어 있는지 확인
    for (const p of partners) {
      if (
        (p.name && text.includes(p.name)) ||
        (p.shortName && p.shortName.length >= 2 && text.includes(p.shortName))
      ) {
        setSelectedPartnerId(p.id)
        setSelectedPartnerName(p.name)
        setSelectedPartnerShortName(p.shortName || p.name.slice(0, 4))
        setSelectedPartnerColor(p.color)
        extractedItems.push(`의뢰업체(${p.name})`)
        break
      }
    }

    // 3. 고객명 추출 ("고객명: 홍길동", "이름: 홍길동", "성함: 홍길동" 또는 전화번호 앞/뒤 한글 2~4자)
    const labeledNameMatch = text.match(/(?:고객명|고객|성함|이름|성명|의뢰인)\s*[:：-]?\s*([가-힣]{2,4})/)
    if (labeledNameMatch) {
      setCustomerName(labeledNameMatch[1])
      extractedItems.push(`고객명(${labeledNameMatch[1]})`)
    } else if (phoneMatch) {
      // 전화번호를 제외한 토큰 중 한글 2~4자 성명 추정 (지역명/일반단어 제외)
      const excludeWords = new Set([
        '포장이사',
        '일반이사',
        '보관이사',
        '방문견적',
        '방문요망',
        '연락처',
        '출발지',
        '도착지',
        '이사일',
        '견적일',
        '서울시',
        '경기도',
        '인천시',
        '고객님'
      ])
      const tokens = text
        .replace(phoneMatch[1], ' ')
        .split(/[\s,/\n[\]()]+/)
        .map(t => t.replace(/님$/, '').trim())
        .filter(t => /^[가-힣]{2,4}$/.test(t) && !excludeWords.has(t))
      if (tokens.length > 0) {
        setCustomerName(tokens[0])
        extractedItems.push(`고객명(${tokens[0]})`)
      }
    }

    // 4. 주소 추출 (시/도/구/동/읍/면/로/길 패턴)
    const addrMatch = text.match(
      /((?:서울|경기|인천|부산|대구|대전|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주|[가-힣]{2,4}[시군구])\s+[가-힣0-9\s-]{3,35})/
    )
    if (addrMatch) {
      const addrClean = addrMatch[1].trim()
      setFromAddress(addrClean)
      extractedItems.push('출발지 주소')
    }

    if (extractedItems.length > 0) {
      setParseFeedback(`자동 추출 완료: ${extractedItems.join(' · ')}`)
    } else {
      setParseFeedback('문자 내용에서 연락처/성명을 찾지 못했습니다. 아래 칸에 직접 입력해주세요.')
    }
  }

  // 인라인 신규 업체 즉시 등록
  const handleQuickAddPartner = async () => {
    const trimmed = newPartnerName.trim()
    if (!trimmed) return
    setCreatingPartner(true)
    try {
      const res = await createPartnerCompany({
        name: trimmed,
        shortName: trimmed.slice(0, 4),
        color: newPartnerColor
      })
      if (res.error) {
        alert(res.error)
      } else if (res.partner) {
        const nextList = [...partners, res.partner]
        setPartners(nextList)
        setSelectedPartnerId(res.partner.id)
        setSelectedPartnerName(res.partner.name)
        setSelectedPartnerShortName(res.partner.shortName)
        setSelectedPartnerColor(res.partner.color)
        setNewPartnerName('')
        setIsAddingNewPartner(false)
      }
    } finally {
      setCreatingPartner(false)
    }
  }

  const handleSaveBooking = async (openFullEstimateAfter: boolean) => {
    if (!customerName.trim() || !contact.trim()) {
      alert('고객명과 연락처를 입력해주세요.')
      return
    }
    if (!visitDatePart) {
      alert('방문 견적일자를 선택해주세요.')
      return
    }

    setSubmitting(true)
    try {
      const visitDateIso = `${visitDatePart}T${visitTimePart || '14:00'}:00`
      const res = await createQuickVisitEstimate({
        partnerId: selectedPartnerId,
        partnerName: selectedPartnerName,
        partnerShortName: selectedPartnerShortName || selectedPartnerName.slice(0, 4),
        partnerColor: selectedPartnerColor,
        customerName: customerName.trim(),
        contact: contact.trim(),
        movingType,
        visitDate: visitDateIso,
        movingDate: movingDatePart || undefined,
        fromAddress: fromAddress.trim(),
        toAddress: toAddress.trim(),
        specialNotes: specialNotes.trim()
      })

      if (res.error) {
        alert(res.error)
        return
      }

      if (onSaved) onSaved()

      if (openFullEstimateAfter && res.id) {
        onClose()
        router.push(`/estimates/${res.id}/edit`)
      } else {
        alert(
          `방문견적 일정이 등록되었습니다! (식별코드: ${res.id})\n일정 캘린더 및 견적 목록에서 바로 확인하실 수 있습니다.`
        )
        onClose()
        router.refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-700 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-indigo-200" />
            <div>
              <h2 className="text-base font-extrabold leading-tight">
                방문견적 빠른 예약 접수 (문자 연동)
              </h2>
              <p className="text-[11px] text-indigo-100">
                의뢰업체로부터 받은 고객 성명·연락처와 방문일정을 먼저 등록합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* 1. 수신 문자 붙여넣기 자동 추출 박스 */}
          <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                <ClipboardPaste className="w-4 h-4 text-indigo-600" />
                <span>문자 내용 붙여넣기 (성명 · 연락처 · 주소 자동 추출)</span>
              </span>
              {smsRawText && (
                <button
                  type="button"
                  onClick={() => {
                    setSmsRawText('')
                    setParseFeedback(null)
                  }}
                  className="text-[11px] text-gray-500 hover:text-red-600 font-semibold"
                >
                  지우기
                </button>
              )}
            </div>
            <textarea
              rows={2}
              value={smsRawText}
              onChange={e => handleParseSmsText(e.target.value)}
              placeholder="예: [A익스프레스] 홍길동 010-1234-5678 서울시 강남구 역삼동 123-4 포장이사 방문요망"
              className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs text-gray-800 outline-none focus:border-indigo-500 resize-none"
            />
            {parseFeedback && (
              <p className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{parseFeedback}</span>
              </p>
            )}
          </div>

          {/* 2. 의뢰 이사업체 선택 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>의뢰 이사업체 (거래처) 선택</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingNewPartner(prev => !prev)}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingNewPartner ? '추가 닫기' : '새 의뢰업체 추가'}</span>
              </button>
            </div>

            {isAddingNewPartner && (
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={newPartnerName}
                  onChange={e => setNewPartnerName(e.target.value)}
                  placeholder="새 이사업체명 (예: 한진익스프레스)"
                  className="flex-1 min-w-[160px] rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-blue-500"
                />
                <div className="flex items-center gap-1">
                  {PARTNER_COLOR_PALETTE.slice(0, 6).map(c => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setNewPartnerColor(c.key)}
                      className={`w-5 h-5 rounded-full ${c.dotClass} ${
                        newPartnerColor === c.key ? 'ring-2 ring-offset-1 ring-gray-900' : 'opacity-60'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={creatingPartner}
                  onClick={handleQuickAddPartner}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold"
                >
                  {creatingPartner ? '등록중...' : '즉시 등록'}
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedPartnerId('')
                  setSelectedPartnerName('')
                  setSelectedPartnerShortName('')
                  setSelectedPartnerColor('slate')
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                  !selectedPartnerName
                    ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                }`}
              >
                자체 / 직접 오더
              </button>

              {partners.map(p => {
                const isSelected = selectedPartnerId === p.id || selectedPartnerName === p.name
                const style = getPartnerBadgeStyle(p.color)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPartnerId(p.id)
                      setSelectedPartnerName(p.name)
                      setSelectedPartnerShortName(p.shortName || p.name.slice(0, 4))
                      setSelectedPartnerColor(p.color)
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? `${style.activeBtnClass} shadow-xs scale-[1.02]`
                        : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-white' : style.dotClass
                      }`}
                    />
                    <span>{p.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. 고객명 · 연락처 · 이사종류 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                고객명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="홍길동"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 font-black text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                연락처 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                maxLength={13}
                value={contact}
                onFocus={handleSelectAllOnFocus}
                onChange={e => handlePhoneInputChange(e, setContact)}
                placeholder="010-0000-0000"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 font-bold text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">이사 종류</label>
              <select
                value={movingType}
                onChange={e => setMovingType(e.target.value as 'P' | 'G' | 'K')}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-bold text-gray-800 outline-none focus:border-blue-500"
              >
                <option value="P">포장이사 (P)</option>
                <option value="G">일반이사 (G)</option>
                <option value="K">보관이사 (K)</option>
              </select>
            </div>
          </div>

          {/* 4. 방문 견적일정 (날짜 + 시간 퀵선택) & 이사 희망일 */}
          <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-blue-950 mb-1">
                  방문 견적일자 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={visitDatePart}
                  onChange={e => setVisitDatePart(e.target.value)}
                  className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 font-bold text-gray-900 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-blue-950 mb-1">
                  방문 시간
                </label>
                <input
                  type="time"
                  value={visitTimePart}
                  onChange={e => setVisitTimePart(e.target.value)}
                  className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 font-bold text-blue-800 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  이사 예정일 (선택/미정 가능)
                </label>
                <input
                  type="date"
                  value={movingDatePart}
                  onChange={e => setMovingDatePart(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-semibold text-gray-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              <span className="text-[11px] font-bold text-gray-500 mr-1">시간 빠른선택:</span>
              {VISIT_TIME_PRESETS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setVisitTimePart(t)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all ${
                    visitTimePart === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 5. 출발지 / 도착지 / 메모 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                방문지 (출발지 주소)
              </label>
              <input
                type="text"
                value={fromAddress}
                onChange={e => setFromAddress(e.target.value)}
                placeholder="예: 서울시 송파구 잠실동 123-4 (미입력 시 추후입력)"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                도착지 주소 (선택)
              </label>
              <input
                type="text"
                value={toAddress}
                onChange={e => setToAddress(e.target.value)}
                placeholder="방문 시 확인 가능"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              통화 메모 / 특이사항 (선택)
            </label>
            <input
              type="text"
              value={specialNotes}
              onChange={e => setSpecialNotes(e.target.value)}
              placeholder="예: 34평 아파트, 피아노 있음, 방문 30분 전 연락 요망"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          {/* 하단 버튼 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
            >
              취소
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSaveBooking(false)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? '등록 중...' : '방문일정만 등록 완료'}</span>
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSaveBooking(true)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>등록 후 바로 견적서 열기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 2. 의뢰 이사업체별 월간/전체 실적 통계 및 업체 마스터 관리 모달
 */
export function PartnerStatsAndManageModal({
  isOpen,
  onClose,
  estimates,
  initialTab = 'STATS',
  onPartnersUpdated
}: {
  isOpen: boolean
  onClose: () => void
  estimates: any[]
  initialTab?: 'STATS' | 'MANAGE'
  onPartnersUpdated?: (list: PartnerCompanyItem[]) => void
}) {
  const [activeTab, setActiveTab] = useState<'STATS' | 'MANAGE'>(initialTab)
  const [partners, setPartners] = useState<PartnerCompanyItem[]>([])
  const [periodMode, setPeriodMode] = useState<'MONTH' | 'ALL'>('MONTH')
  const [selectedYm, setSelectedYm] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // 업체 등록/수정 폼 상태
  const [editingPartner, setEditingPartner] = useState<PartnerCompanyItem | null>(null)
  const [formName, setFormName] = useState('')
  const [formShortName, setFormShortName] = useState('')
  const [formColor, setFormColor] = useState<PartnerBadgeColor>('blue')
  const [formContactPerson, setFormContactPerson] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formFeeType, setFormFeeType] = useState<'NONE' | 'RATE' | 'FIXED'>('NONE')
  const [formFeeValue, setFormFeeValue] = useState<number>(0)
  const [formMemo, setFormMemo] = useState('')
  const [savingPartner, setSavingPartner] = useState(false)

  const loadPartners = async () => {
    const list = await getPartnerCompanies()
    setPartners(list)
    if (onPartnersUpdated) onPartnersUpdated(list)
  }

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      loadPartners()
    }
  }, [isOpen, initialTab])

  const handleMonthShift = (offset: number) => {
    const [y, m] = selectedYm.split('-').map(Number)
    const next = new Date(y, m - 1 + offset, 1)
    setSelectedYm(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  }

  // 통계 집계
  const partnerStats = useMemo(() => {
    const partnerMap = new Map<
      string,
      {
        key: string
        name: string
        shortName: string
        color: PartnerBadgeColor
        feeType: 'NONE' | 'RATE' | 'FIXED'
        feeValue: number
        totalLeads: number
        visitedCount: number
        contractedCount: number
        supplySum: number
        totalSum: number
        estimatedFeeSum: number
      }
    >()

    // 등록된 모든 업체를 기본 행으로 세팅
    partners.forEach(p => {
      partnerMap.set(p.name, {
        key: p.id,
        name: p.name,
        shortName: p.shortName || p.name.slice(0, 4),
        color: p.color,
        feeType: p.feeType,
        feeValue: p.feeValue,
        totalLeads: 0,
        visitedCount: 0,
        contractedCount: 0,
        supplySum: 0,
        totalSum: 0,
        estimatedFeeSum: 0
      })
    })

    // 자체/미지정 기본 행
    const DIRECT_KEY = '__DIRECT__'
    partnerMap.set(DIRECT_KEY, {
      key: DIRECT_KEY,
      name: '자체 / 직접 오더 (미지정)',
      shortName: '자체오더',
      color: 'slate',
      feeType: 'NONE',
      feeValue: 0,
      totalLeads: 0,
      visitedCount: 0,
      contractedCount: 0,
      supplySum: 0,
      totalSum: 0,
      estimatedFeeSum: 0
    })

    estimates.forEach(est => {
      // 기간 필터링 (접수일 estimateDate 또는 방문일 visitDate 기준)
      if (periodMode === 'MONTH') {
        const refDate = est.visitDate
          ? new Date(est.visitDate)
          : new Date(est.estimateDate)
        const ym = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}`
        if (ym !== selectedYm) return
      }

      let env: any = {}
      try {
        if (est.environment) env = JSON.parse(est.environment)
      } catch {}

      let pay: any = {}
      try {
        if (est.paymentPlan) pay = JSON.parse(est.paymentPlan)
      } catch {}

      const pName = (env.partnerName || '').trim()
      const mapKey = pName || DIRECT_KEY

      if (!partnerMap.has(mapKey)) {
        partnerMap.set(mapKey, {
          key: mapKey,
          name: pName,
          shortName: env.partnerShortName || pName.slice(0, 4),
          color: (env.partnerColor || 'blue') as PartnerBadgeColor,
          feeType: 'NONE',
          feeValue: 0,
          totalLeads: 0,
          visitedCount: 0,
          contractedCount: 0,
          supplySum: 0,
          totalSum: 0,
          estimatedFeeSum: 0
        })
      }

      const row = partnerMap.get(mapKey)!
      row.totalLeads += 1

      // 방문일정이 잡혀 있거나 견적 금액이 산출된 경우
      if (est.visitDate || (est.movingCost || 0) > 0 || (est.totalAmount || 0) > 0) {
        row.visitedCount += 1
      }

      // 계약 성사 판정: 계약금/중도금/잔금 중 하나라도 입금 완료되었거나 서명이 완료된 건
      const isContracted = Boolean(
        pay.downPaymentPaid || pay.intermediatePaymentPaid || pay.balancePaid || est.signature
      )

      const supplyAmt =
        (est.movingCost || 0) + (est.additionalCost || 0) + (est.storageCost || 0) ||
        Math.max(0, (est.totalAmount || 0) - (est.vat || 0))
      const totalAmt = est.totalAmount || supplyAmt

      if (isContracted) {
        row.contractedCount += 1
        row.supplySum += supplyAmt
        row.totalSum += totalAmt

        if (row.feeType === 'RATE' && row.feeValue > 0) {
          row.estimatedFeeSum += Math.round(supplyAmt * (row.feeValue / 100))
        } else if (row.feeType === 'FIXED' && row.feeValue > 0) {
          row.estimatedFeeSum += Math.round(row.feeValue)
        }
      }
    })

    const rows = Array.from(partnerMap.values()).filter(
      r => r.key !== DIRECT_KEY || r.totalLeads > 0
    )

    const totals = rows.reduce(
      (acc, r) => {
        acc.totalLeads += r.totalLeads
        acc.visitedCount += r.visitedCount
        acc.contractedCount += r.contractedCount
        acc.supplySum += r.supplySum
        acc.totalSum += r.totalSum
        acc.estimatedFeeSum += r.estimatedFeeSum
        return acc
      },
      {
        totalLeads: 0,
        visitedCount: 0,
        contractedCount: 0,
        supplySum: 0,
        totalSum: 0,
        estimatedFeeSum: 0
      }
    )

    return { rows, totals }
  }, [estimates, partners, periodMode, selectedYm])

  if (!isOpen) return null

  const resetPartnerForm = () => {
    setEditingPartner(null)
    setFormName('')
    setFormShortName('')
    setFormColor('blue')
    setFormContactPerson('')
    setFormPhone('')
    setFormFeeType('NONE')
    setFormFeeValue(0)
    setFormMemo('')
  }

  const startEditPartner = (p: PartnerCompanyItem) => {
    setEditingPartner(p)
    setFormName(p.name)
    setFormShortName(p.shortName)
    setFormColor(p.color)
    setFormContactPerson(p.contactPerson)
    setFormPhone(formatPhoneNumber(p.phone))
    setFormFeeType(p.feeType)
    setFormFeeValue(p.feeValue)
    setFormMemo(p.memo)
  }

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      alert('업체명을 입력해주세요.')
      return
    }
    setSavingPartner(true)
    try {
      const payload = {
        name: formName.trim(),
        shortName: formShortName.trim() || formName.trim().slice(0, 4),
        color: formColor,
        contactPerson: formContactPerson.trim(),
        phone: formPhone.trim(),
        feeType: formFeeType,
        feeValue: formFeeValue,
        memo: formMemo.trim()
      }
      const res = editingPartner
        ? await updatePartnerCompany(editingPartner.id, payload)
        : await createPartnerCompany(payload)
      if (res.error) {
        alert(res.error)
      } else {
        resetPartnerForm()
        await loadPartners()
      }
    } finally {
      setSavingPartner(false)
    }
  }

  const handleDeletePartner = async (p: PartnerCompanyItem) => {
    if (!confirm(`'${p.name}' 의뢰업체를 삭제하시겠습니까? (기존 견적서의 업체 기록은 유지됩니다)`)) {
      return
    }
    const res = await deletePartnerCompany(p.id)
    if (res.error) {
      alert(res.error)
    } else {
      await loadPartners()
    }
  }

  const overallConversionRate =
    partnerStats.totals.totalLeads > 0
      ? ((partnerStats.totals.contractedCount / partnerStats.totals.totalLeads) * 100).toFixed(1)
      : '0.0'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* 모달 헤더 */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-extrabold">
              의뢰 이사업체별 실적 통계 · 거래처 관리
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 상단 탭 전환 */}
        <div className="p-3 bg-gray-100 border-b border-gray-200 flex items-center justify-between gap-2">
          <div className="grid grid-cols-2 gap-1.5 bg-white p-1 rounded-xl border border-gray-200 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('STATS')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'STATS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>업체별 실적 · 계약 통계</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MANAGE')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'MANAGE'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>의뢰 이사업체 등록/관리 ({partners.length})</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1">
          {activeTab === 'STATS' ? (
            <div className="space-y-4">
              {/* 기간 선택 컨트롤 */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPeriodMode('MONTH')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${
                      periodMode === 'MONTH'
                        ? 'bg-slate-800 text-white'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    월별 조회
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodMode('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${
                      periodMode === 'ALL'
                        ? 'bg-slate-800 text-white'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    전체 누적 조회
                  </button>
                </div>

                {periodMode === 'MONTH' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleMonthShift(-1)}
                      className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-black text-gray-900 text-sm min-w-[95px] text-center">
                      {selectedYm.split('-')[0]}년 {Number(selectedYm.split('-')[1])}월
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMonthShift(1)}
                      className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 요약 카드 4종 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-gray-500">총 의뢰(접수) 건수</span>
                  <p className="text-xl font-black text-gray-900 mt-1">
                    {partnerStats.totals.totalLeads}건
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-gray-500">계약 성사 (계약금/서명)</span>
                  <p className="text-xl font-black text-emerald-700 mt-1">
                    {partnerStats.totals.contractedCount}건{' '}
                    <span className="text-xs font-extrabold text-blue-600">
                      ({overallConversionRate}%)
                    </span>
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-gray-500">계약 총액 (공급가액)</span>
                  <p className="text-lg font-black text-blue-700 mt-1">
                    {partnerStats.totals.supplySum.toLocaleString()}원
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-gray-500">예상 수수료 합계</span>
                  <p className="text-lg font-black text-purple-700 mt-1">
                    {partnerStats.totals.estimatedFeeSum.toLocaleString()}원
                  </p>
                </div>
              </div>

              {/* 업체별 비교 테이블 */}
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-800 border-b border-gray-200 text-xs">
                      <th className="py-2.5 px-3 font-bold">의뢰 이사업체</th>
                      <th className="py-2.5 px-3 font-bold text-center">총 의뢰</th>
                      <th className="py-2.5 px-3 font-bold text-center">계약 성사</th>
                      <th className="py-2.5 px-3 font-bold text-center">미계약/대기</th>
                      <th className="py-2.5 px-3 font-bold text-center">성사율(%)</th>
                      <th className="py-2.5 px-3 font-bold text-right">계약 공급가액 (VAT별도)</th>
                      <th className="py-2.5 px-3 font-bold text-right">계약 공급대가 (VAT포함)</th>
                      <th className="py-2.5 px-3 font-bold text-right">수수료 정산액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {partnerStats.rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-500">
                          집계된 의뢰 내역이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      partnerStats.rows.map(r => {
                        const rate =
                          r.totalLeads > 0
                            ? Number(((r.contractedCount / r.totalLeads) * 100).toFixed(1))
                            : 0
                        const pending = Math.max(0, r.totalLeads - r.contractedCount)
                        const style = getPartnerBadgeStyle(r.color)
                        return (
                          <tr key={r.key} className="hover:bg-gray-50">
                            <td className="py-2.5 px-3 font-bold">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-extrabold border ${style.badgeClass}`}
                              >
                                <span className={`w-2 h-2 rounded-full ${style.dotClass}`} />
                                {r.name}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-gray-900">
                              {r.totalLeads}건
                            </td>
                            <td className="py-2.5 px-3 text-center font-extrabold text-emerald-700">
                              {r.contractedCount}건
                            </td>
                            <td className="py-2.5 px-3 text-center font-medium text-gray-500">
                              {pending}건
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <div className="w-14 h-2 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                                  <div
                                    className="h-full bg-blue-600 rounded-full"
                                    style={{ width: `${Math.min(100, rate)}%` }}
                                  />
                                </div>
                                <span className="font-black text-blue-700">{rate}%</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-gray-900">
                              {r.supplySum.toLocaleString()}원
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-gray-600">
                              {r.totalSum.toLocaleString()}원
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-purple-700">
                              {r.estimatedFeeSum > 0 ? `${r.estimatedFeeSum.toLocaleString()}원` : '-'}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* 탭 2: 의뢰 이사업체 등록 및 관리 */
            <div className="space-y-4">
              <form
                onSubmit={handleSavePartner}
                className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-extrabold text-indigo-950">
                    {editingPartner ? `'${editingPartner.name}' 정보 수정` : '+ 신규 의뢰 이사업체 등록'}
                  </h3>
                  {editingPartner && (
                    <button
                      type="button"
                      onClick={resetPartnerForm}
                      className="text-xs font-bold text-gray-500 hover:text-gray-800"
                    >
                      신규 등록으로 전환
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      이사업체명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="예: 한진익스프레스"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 font-bold text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      캘린더 약칭 (2~4자)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formShortName}
                      onChange={e => setFormShortName(e.target.value)}
                      placeholder="예: 한진"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 font-bold text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      담당자명
                    </label>
                    <input
                      type="text"
                      value={formContactPerson}
                      onChange={e => setFormContactPerson(e.target.value)}
                      placeholder="예: 박소장"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      담당자 연락처
                    </label>
                    <input
                      type="tel"
                      maxLength={13}
                      value={formPhone}
                      onFocus={handleSelectAllOnFocus}
                      onChange={e => handlePhoneInputChange(e, setFormPhone)}
                      placeholder="010-0000-0000"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      배지 구분 색상
                    </label>
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-gray-300">
                      {PARTNER_COLOR_PALETTE.map(c => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setFormColor(c.key)}
                          className={`w-5 h-5 rounded-full ${c.dotClass} ${
                            formColor === c.key ? 'ring-2 ring-offset-1 ring-gray-900' : 'opacity-50'
                          }`}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      수수료(오더비) 정산 기준
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        value={formFeeType}
                        onChange={e => setFormFeeType(e.target.value as any)}
                        className="rounded-xl border border-gray-300 bg-white px-2 py-1.5 text-xs font-bold"
                      >
                        <option value="NONE">없음</option>
                        <option value="RATE">공급가액 비율(%)</option>
                        <option value="FIXED">계약 건당 정액(원)</option>
                      </select>
                      {formFeeType !== 'NONE' && (
                        <input
                          type="number"
                          step="0.1"
                          value={formFeeValue || ''}
                          onFocus={handleSelectAllOnFocus}
                          onChange={e => setFormFeeValue(Number(e.target.value) || 0)}
                          placeholder={formFeeType === 'RATE' ? '예: 10(%)' : '예: 50000(원)'}
                          className="w-28 rounded-xl border border-gray-300 bg-white px-2.5 py-1.5 font-bold"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formMemo}
                      onChange={e => setFormMemo(e.target.value)}
                      placeholder="비고/메모"
                      className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-1.5"
                    />
                    <button
                      type="submit"
                      disabled={savingPartner}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs whitespace-nowrap"
                    >
                      {savingPartner ? '저장중...' : editingPartner ? '수정 저장' : '+ 업체 등록'}
                    </button>
                  </div>
                </div>
              </form>

              {/* 등록된 의뢰업체 목록 */}
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 border-b border-gray-200 text-xs">
                      <th className="py-2.5 px-3 font-bold">업체명 (배지 미리보기)</th>
                      <th className="py-2.5 px-3 font-bold">캘린더 약칭</th>
                      <th className="py-2.5 px-3 font-bold">담당자 / 연락처</th>
                      <th className="py-2.5 px-3 font-bold">수수료 기준</th>
                      <th className="py-2.5 px-3 font-bold">메모</th>
                      <th className="py-2.5 px-3 font-bold text-center">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {partners.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">
                          등록된 협력/의뢰 이사업체가 없습니다. 위 입력창에서 업체를 추가해주세요.
                        </td>
                      </tr>
                    ) : (
                      partners.map(p => {
                        const style = getPartnerBadgeStyle(p.color)
                        return (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-extrabold border ${style.badgeClass}`}
                              >
                                <span className={`w-2 h-2 rounded-full ${style.dotClass}`} />
                                {p.name}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-gray-700">{p.shortName}</td>
                            <td className="py-2.5 px-3 text-gray-700">
                              {p.contactPerson || '-'}{' '}
                              {p.phone ? `(${formatPhoneNumber(p.phone)})` : ''}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-purple-700">
                              {p.feeType === 'RATE'
                                ? `공급가액의 ${p.feeValue}%`
                                : p.feeType === 'FIXED'
                                  ? `건당 ${p.feeValue.toLocaleString()}원`
                                  : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-gray-500">{p.memo || '-'}</td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => startEditPartner(p)}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePartner(p)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

