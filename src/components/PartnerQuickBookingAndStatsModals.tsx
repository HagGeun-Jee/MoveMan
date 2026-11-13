'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  getPartnerCompanies,
  createPartnerCompany,
  updatePartnerCompany,
  deletePartnerCompany,
  createQuickVisitEstimate,
  getQuickVisitSmsTemplates,
  saveQuickVisitSmsTemplates,
  type PartnerCompanyItem,
  type PartnerBadgeColor,
  type QuickVisitSmsTemplateItem
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
  ClipboardPaste,
  MessageSquareText,
  Send,
  Copy,
  Settings2,
  RotateCcw,
  CheckCircle2,
  Navigation
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

const QUICK_VISIT_SMS_STORAGE_KEY = 'meman_quick_visit_sms_templates_v1'

const DEFAULT_QUICK_VISIT_SMS_TEMPLATES: QuickVisitSmsTemplateItem[] = [
  {
    id: 'tpl_visit_confirm',
    title: '기본 방문예약 안내',
    isDefault: true,
    content: `안녕하세요, {고객명} 고객님!
이사 방문견적 예약 안내드립니다.

■ 방문일시 : {방문일시}
■ 방문주소 : {방문지}
■ 이사종류 : {이사종류} (이사예정일: {이사예정일})

약속드린 시간에 맞춰 찾아뵙겠습니다.
방문 출발 전 미리 연락드리겠습니다. 감사합니다!`
  },
  {
    id: 'tpl_platform_assign',
    title: '플랫폼/의뢰처 배정 안내',
    isDefault: false,
    content: `안녕하세요, {고객명} 고객님!
{의뢰업체} 통해 배정받은 방문견적 담당자입니다.

■ 방문일시 : {방문일시}
■ 방문주소 : {방문지}
■ 이사예정일 : {이사예정일} ({이사종류})

예약해주신 일정에 방문하여 꼼꼼하고 합리적인 견적 안내드리겠습니다.
일정 조정이 필요하시면 편하게 연락 주세요. 감사합니다!`
  },
  {
    id: 'tpl_before_depart',
    title: '방문 출발 전 안내',
    isDefault: false,
    content: `안녕하세요, {고객명} 고객님!
금일 {방문시간} 방문견적 예약 관련 안내드립니다.

■ 방문주소 : {방문지}

약속된 시간에 맞춰 출발 예정입니다.
주차 안내나 현관 호출 방법 등 참고사항이 있으시면 편하게 문자 남겨주세요. 감사합니다!`
  }
]

const SMS_PLACEHOLDER_CHIPS: { token: string; label: string }[] = [
  { token: '{고객명}', label: '고객명' },
  { token: '{방문일시}', label: '방문일시' },
  { token: '{방문일자}', label: '방문일자' },
  { token: '{방문시간}', label: '방문시간' },
  { token: '{방문지}', label: '방문지' },
  { token: '{도착지}', label: '도착지' },
  { token: '{이사예정일}', label: '이사예정일' },
  { token: '{이사종류}', label: '이사종류' },
  { token: '{의뢰업체}', label: '의뢰업체' },
  { token: '{특이사항}', label: '특이사항' }
]

function formatYmdKor(ymd?: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '미정'
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  if (isNaN(dt.getTime())) return ymd
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']
  return `${y}년 ${String(m).padStart(2, '0')}월 ${String(d).padStart(2, '0')}일(${weekDays[dt.getDay()]})`
}

function formatTimeKor(hm?: string): string {
  if (!hm || !/^\d{1,2}:\d{2}$/.test(hm)) return ''
  const [hStr, mStr] = hm.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (isNaN(h) || isNaN(m)) return hm
  const ampm = h < 12 ? '오전' : '오후'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m > 0 ? `${ampm} ${h12}시 ${m}분` : `${ampm} ${h12}시`
}

function cleanCustomerBaseName(raw: string): string {
  return (raw || '')
    .trim()
    .replace(/\s*(?:고객님|고객|선생님|사장님|님)$/, '')
    .trim()
}

function substituteVisitSmsTemplate(
  rawTemplate: string,
  params: {
    customerName: string
    contact: string
    movingType: 'P' | 'G' | 'K'
    visitDatePart: string
    visitTimePart: string
    movingDatePart: string
    fromAddress: string
    toAddress: string
    partnerName: string
    specialNotes: string
  }
): string {
  if (!rawTemplate) return ''
  const cleanCust = cleanCustomerBaseName(params.customerName)
  const visitDateKor = formatYmdKor(params.visitDatePart)
  const visitTimeKor = formatTimeKor(params.visitTimePart)
  const visitDateTimeKor = [visitDateKor !== '미정' ? visitDateKor : '', visitTimeKor]
    .filter(Boolean)
    .join(' ') || '일정 협의'
  const movingDateKor = params.movingDatePart ? formatYmdKor(params.movingDatePart) : '미정'
  const movingTypeLabel =
    params.movingType === 'P' ? '포장이사' : params.movingType === 'G' ? '일반이사' : '보관이사'
  const fromAddrLabel = params.fromAddress.trim() || '방문 시 상세확인'
  const toAddrLabel = params.toAddress.trim() || '방문 시 확인'
  const partnerLabel = params.partnerName.trim() || '저희 이사업체'
  const notesLabel = params.specialNotes.trim() || '-'

  let out = rawTemplate

  // 고객명 치환 (미입력 시 '고객 고객님' 중복 방지 -> '고객님'으로 자연스럽게 처리)
  if (cleanCust) {
    out = out.replace(/\{고객명\}/g, cleanCust)
  } else {
    out = out
      .replace(/\{고객명\}\s*고객님/g, '고객님')
      .replace(/\{고객명\}\s*님/g, '고객님')
      .replace(/\{고객명\}/g, '고객님')
  }

  out = out
    .replace(/\{방문일시\}/g, visitDateTimeKor)
    .replace(/\{방문일자\}/g, visitDateKor)
    .replace(/\{방문시간\}/g, visitTimeKor || '시간 협의')
    .replace(/\{방문지\}/g, fromAddrLabel)
    .replace(/\{출발지\}/g, fromAddrLabel)
    .replace(/\{도착지\}/g, toAddrLabel)
    .replace(/\{이사예정일\}/g, movingDateKor)
    .replace(/\{이사일자\}/g, movingDateKor)
    .replace(/\{이사종류\}/g, movingTypeLabel)
    .replace(/\{의뢰업체\}/g, partnerLabel)
    .replace(/\{연락처\}/g, params.contact.trim() || '-')
    .replace(/\{특이사항\}/g, notesLabel)

  return out
}

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

  // 방문예약 등록 완료 상태 (등록 완료 후 문자 발송 스텝 지원)
  const [registeredBookingId, setRegisteredBookingId] = useState<string | null>(null)

  // 방문예약 안내 문자 템플릿 상태
  const [smsTemplates, setSmsTemplates] = useState<QuickVisitSmsTemplateItem[]>(
    DEFAULT_QUICK_VISIT_SMS_TEMPLATES
  )
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    DEFAULT_QUICK_VISIT_SMS_TEMPLATES[0].id
  )
  const [isSmsManualEdited, setIsSmsManualEdited] = useState(false)
  const [manualSmsText, setManualSmsText] = useState('')
  const [smsCopied, setSmsCopied] = useState(false)

  // 템플릿 관리(추가/수정/삭제) 인라인 패널 상태
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false)
  const [editingTplId, setEditingTplId] = useState<string>('')
  const [tplFormTitle, setTplFormTitle] = useState('')
  const [tplFormContent, setTplFormContent] = useState('')
  const [tplFormIsDefault, setTplFormIsDefault] = useState(false)
  const [savingTemplates, setSavingTemplates] = useState(false)
  const [tplSavedNotice, setTplSavedNotice] = useState<string | null>(null)
  const tplTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const prevCleanCustNameRef = useRef<string>('')

  // 거래처 및 문자 템플릿 로드 (로컬 캐시 즉시 반영 + 서버 DB 최신화)
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

    // 1) localStorage 즉시 로드
    try {
      const cached = localStorage.getItem(QUICK_VISIT_SMS_STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSmsTemplates(parsed)
          const def = parsed.find((t: QuickVisitSmsTemplateItem) => t.isDefault) || parsed[0]
          if (def) setSelectedTemplateId(def.id)
        }
      }
    } catch {
      // ignore storage parse error
    }

    // 2) 서버 DB 저장 템플릿 동기화
    getQuickVisitSmsTemplates().then(serverList => {
      if (serverList && serverList.length > 0) {
        setSmsTemplates(serverList)
        const def = serverList.find(t => t.isDefault) || serverList[0]
        setSelectedTemplateId(prev =>
          serverList.some(t => t.id === prev) ? prev : def.id
        )
        try {
          localStorage.setItem(QUICK_VISIT_SMS_STORAGE_KEY, JSON.stringify(serverList))
        } catch {
          // ignore
        }
      }
    })
  }, [isOpen])

  const activeTemplate = useMemo(() => {
    return (
      smsTemplates.find(t => t.id === selectedTemplateId) ||
      smsTemplates.find(t => t.isDefault) ||
      smsTemplates[0] ||
      DEFAULT_QUICK_VISIT_SMS_TEMPLATES[0]
    )
  }, [smsTemplates, selectedTemplateId])

  // 입력값(고객명, 방문일시, 방문지 등) 변경 시 실시간 자동 완성되는 문자 문구
  const renderedTemplateText = useMemo(() => {
    return substituteVisitSmsTemplate(activeTemplate?.content || '', {
      customerName,
      contact,
      movingType,
      visitDatePart,
      visitTimePart,
      movingDatePart,
      fromAddress,
      toAddress,
      partnerName: selectedPartnerName,
      specialNotes
    })
  }, [
    activeTemplate,
    customerName,
    contact,
    movingType,
    visitDatePart,
    visitTimePart,
    movingDatePart,
    fromAddress,
    toAddress,
    selectedPartnerName,
    specialNotes
  ])

  // 사용자가 미리보기 문구를 직접 일부 수정한 상태라도, '고객명' 입력값이 바뀌면 문자 내 고객명도 즉시 자동 갱신!
  useEffect(() => {
    const nextClean = cleanCustomerBaseName(customerName)
    const prevClean = prevCleanCustNameRef.current

    if (isSmsManualEdited && prevClean !== nextClean) {
      setManualSmsText(prevText => {
        if (!prevText) return renderedTemplateText
        if (prevText.includes('{고객명}')) {
          return nextClean
            ? prevText.replace(/\{고객명\}/g, nextClean)
            : prevText
                .replace(/\{고객명\}\s*고객님/g, '고객님')
                .replace(/\{고객명\}\s*님/g, '고객님')
                .replace(/\{고객명\}/g, '고객님')
        }
        if (prevClean && nextClean && prevText.includes(prevClean)) {
          return prevText.split(prevClean).join(nextClean)
        }
        if (prevClean && !nextClean && prevText.includes(`${prevClean} 고객님`)) {
          return prevText.split(`${prevClean} 고객님`).join('고객님')
        }
        if (!prevClean && nextClean && prevText.includes('고객님')) {
          return prevText.replace('고객님', `${nextClean} 고객님`)
        }
        return prevText
      })
    }

    prevCleanCustNameRef.current = nextClean
  }, [customerName, isSmsManualEdited, renderedTemplateText])

  const effectiveSmsText = isSmsManualEdited ? manualSmsText : renderedTemplateText

  if (!isOpen) return null

  // 수신 문자/카톡 텍스트에서 플랫폼(의뢰업체), 고객명, 연락처, 이사종류, 이사예정일, 방문견적시간, 출발지, 도착지, 특이사항 지능형 추출
  const handleParseSmsText = (text: string) => {
    setSmsRawText(text)
    setIsSmsManualEdited(false)
    if (!text.trim()) {
      setParseFeedback(null)
      return
    }

    const extractedItems: string[] = []
    const now = new Date()
    const currentYear = now.getFullYear()

    // 줄 단위 전처리 ('[Web발신]', '전달:' 등 접두어 제거)
    const rawLines = text
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map(line =>
        line
          .replace(/^\[(?:Web발신|웹발신|국제발신)\]\s*/i, '')
          .replace(/^(?:전달|FW|Fwd)\s*[:：]\s*/i, '')
          .trim()
      )
      .filter(Boolean)

    const normalizedText = rawLines.join('\n')

    // 1. 의뢰 이사업체 / 이사 플랫폼 자동 감지
    const KNOWN_PLATFORMS = [
      '모두이사',
      '위매치다이사',
      '다이사',
      '짐싸',
      '이사모아',
      '24번가',
      '국민이사',
      '미소',
      '숨고',
      '통인이사',
      '통인익스프레스',
      '영구크린',
      '예스2424',
      'YES2424',
      'KGB이사',
      '로젠이사',
      '옐로우캡',
      '파란이사',
      '매직익스프레스',
      '한솔익스프레스',
      '일통익스프레스'
    ]

    let detectedPlatformName = ''

    // 1-A. 기등록된 거래처와 매칭 확인
    for (const p of partners) {
      if (
        (p.name && normalizedText.includes(p.name)) ||
        (p.shortName && p.shortName.length >= 2 && normalizedText.includes(p.shortName))
      ) {
        setSelectedPartnerId(p.id)
        setSelectedPartnerName(p.name)
        setSelectedPartnerShortName(p.shortName || p.name.slice(0, 4))
        setSelectedPartnerColor(p.color)
        detectedPlatformName = p.name
        extractedItems.push(`의뢰업체(${p.name})`)
        break
      }
    }

    // 1-B. 기등록 거래처에 없더라도 주요 이사 플랫폼 및 인사말('[OO]', '안녕하세요 OO 입니다') 패턴 감지
    if (!detectedPlatformName) {
      for (const kw of KNOWN_PLATFORMS) {
        if (normalizedText.includes(kw)) {
          detectedPlatformName = kw
          break
        }
      }
    }

    if (!detectedPlatformName) {
      for (const line of rawLines.slice(0, 3)) {
        const greetMatch = line.match(
          /(?:안녕하세요\.?\s*)?([가-힣A-Za-z0-9]{2,12}?)\s*입니다/
        )
        if (greetMatch && !/^(?:고객|담당자|기사|팀장|소장)$/.test(greetMatch[1])) {
          detectedPlatformName = greetMatch[1].trim()
          break
        }
        const bracketMatch = line.match(/^\[([가-힣A-Za-z0-9\s]{2,12})\]/)
        if (
          bracketMatch &&
          !/^(?:Web발신|웹발신|광고|안내|공지|전달|긴급|방문견적|이사견적)$/i.test(
            bracketMatch[1].trim()
          )
        ) {
          detectedPlatformName = bracketMatch[1].trim()
          break
        }
        const labelPartnerMatch = line.match(
          /^(?:업체명|플랫폼|거래처|의뢰업체)\s*[:：\-]\s*([가-힣A-Za-z0-9\s]{2,12})$/
        )
        if (labelPartnerMatch) {
          detectedPlatformName = labelPartnerMatch[1].trim()
          break
        }
      }
    }

    if (detectedPlatformName && !extractedItems.some(it => it.startsWith('의뢰업체('))) {
      const matchedExisting = partners.find(
        p =>
          p.name.replace(/\s+/g, '') === detectedPlatformName.replace(/\s+/g, '') ||
          (p.shortName && p.shortName.replace(/\s+/g, '') === detectedPlatformName.replace(/\s+/g, ''))
      )
      if (matchedExisting) {
        setSelectedPartnerId(matchedExisting.id)
        setSelectedPartnerName(matchedExisting.name)
        setSelectedPartnerShortName(matchedExisting.shortName || matchedExisting.name.slice(0, 4))
        setSelectedPartnerColor(matchedExisting.color)
        extractedItems.push(`의뢰업체(${matchedExisting.name})`)
      } else {
        setSelectedPartnerId('')
        setSelectedPartnerName(detectedPlatformName)
        setSelectedPartnerShortName(detectedPlatformName.slice(0, 4))
        setSelectedPartnerColor('indigo')
        extractedItems.push(`플랫폼(${detectedPlatformName})`)
      }
    }

    // 2. 전화번호 추출 (010-XXXX-XXXX, 010XXXXXXXX, 050X-XXXX-XXXX 안심번호 포함)
    const phoneMatch = normalizedText.match(
      /((?:01[016789]|050\d)[-\s.]?\d{3,4}[-\s.]?\d{4})/
    )
    if (phoneMatch) {
      const digits = phoneMatch[1].replace(/[^0-9]/g, '')
      const cleanPhone =
        digits.startsWith('050') && digits.length === 12
          ? `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`
          : formatPhoneNumber(digits)
      setContact(cleanPhone)
      extractedItems.push(`연락처(${cleanPhone})`)
    }

    // 3. 고객명 추출 (1순위: 명시적 라벨 -> 2순위: 'OO 고객님/님' 호칭 -> 3순위: 단독 성명 줄)
    const NON_NAME_STOPWORDS = new Set([
      '전달',
      '안녕하세요',
      '안녕하십니까',
      '입니다',
      '모두이사',
      '위매치',
      '위매치다이사',
      '다이사',
      '짐싸',
      '이사모아',
      '국민이사',
      '미소',
      '숨고',
      '영구크린',
      '통인이사',
      '로젠이사',
      '파란이사',
      '옐로우캡',
      '포장이사',
      '일반이사',
      '보관이사',
      '가정이사',
      '반포장이사',
      '원룸이사',
      '사무실이사',
      '가정',
      '포장',
      '일반',
      '보관',
      '원룸',
      '사무실',
      '오피스텔',
      '아파트',
      '빌라',
      '주택',
      '방문견적',
      '방문요망',
      '방문예약',
      '견적요청',
      '견적',
      '방문',
      '연락처',
      '전화번호',
      '휴대폰',
      '핸드폰',
      '출발지',
      '도착지',
      '출발',
      '도착',
      '현주소',
      '상차지',
      '하차지',
      '이사일',
      '이사날짜',
      '이사예정일',
      '견적일',
      '방문일',
      '방문시간',
      '시간',
      '오전',
      '오후',
      '오늘',
      '내일',
      '모레',
      '고객님',
      '고객',
      '선생님',
      '사장님',
      '담당자',
      '서울시',
      '경기도',
      '인천시',
      '부산시',
      '대구시',
      '대전시',
      '광주시',
      '울산시',
      '세종시',
      '강원도',
      '충청도',
      '전라도',
      '경상도',
      '제주도'
    ])
    if (detectedPlatformName) {
      NON_NAME_STOPWORDS.add(detectedPlatformName.replace(/\s+/g, ''))
    }

    let extractedCustomerName = ''

    // 3-A. '고객명: 김영은', '성함 : 홍길동 고객님' 등 라벨 패턴
    for (const line of rawLines) {
      const labelMatch = line.match(
        /^(?:고객명|고객성함|성함|이름|성명|의뢰인|신청인|계약자|고객)\s*[:：\-]\s*([가-힣]{2,5}?)(?:\s*(?:고객님|고객|님|선생님|사장님))?(?=\s|$|[(,/])/
      )
      if (labelMatch && !NON_NAME_STOPWORDS.has(labelMatch[1])) {
        extractedCustomerName = labelMatch[1]
        break
      }
    }

    // 3-B. '김영은 고객님', '김영은고객님', '김영은 님' 등 호칭 접미 패턴
    if (!extractedCustomerName) {
      for (const line of rawLines) {
        if (/^(?:출발|도착|현주소|상차|하차)/.test(line)) continue
        const honorificMatch = line.match(
          /(?:^|[\s:：([\],/])([가-힣]{2,4})\s*(?:고객님|고객|선생님|사장님|님)(?=\s|$|[),/])/
        )
        if (honorificMatch) {
          const candidate = honorificMatch[1].trim()
          if (!NON_NAME_STOPWORDS.has(candidate) && !candidate.endsWith('시') && !candidate.endsWith('군') && !candidate.endsWith('구')) {
            extractedCustomerName = candidate
            break
          }
        }
      }
    }

    // 3-C. 단독 줄 성명 ('김영은') 또는 전화번호 옆 성명
    if (!extractedCustomerName) {
      for (const line of rawLines) {
        if (/^(?:출발|도착|연락처|전화|주소|이사|견적|방문)/.test(line)) continue
        const cleanLine = line
          .replace(/(?:01[016789]|050\d)[-\s.]?\d{3,4}[-\s.]?\d{4}/g, ' ')
          .replace(/님$/, '')
          .trim()
        if (/^[가-힣]{2,4}$/.test(cleanLine) && !NON_NAME_STOPWORDS.has(cleanLine)) {
          extractedCustomerName = cleanLine
          break
        }
      }
    }

    if (extractedCustomerName) {
      setCustomerName(extractedCustomerName)
      extractedItems.push(`고객명(${extractedCustomerName})`)
    }

    // 4. 출발지 / 도착지 주소 추출
    let foundFromAddr = ''
    let foundToAddr = ''

    for (const line of rawLines) {
      const fromLabelMatch = line.match(
        /^(?:\[?\s*(?:출발지|출발주소|출발|현주소|상차지|이사전)\s*\]?)\s*[:：\-]\s*(.+)$/
      )
      if (fromLabelMatch && !foundFromAddr) {
        foundFromAddr = fromLabelMatch[1].trim()
        continue
      }

      const toLabelMatch = line.match(
        /^(?:\[?\s*(?:도착지|도착주소|도착|하차지|이사후|이사갈곳)\s*\]?)\s*[:：\-]\s*(.+)$/
      )
      if (toLabelMatch && !foundToAddr) {
        foundToAddr = toLabelMatch[1].trim()
        continue
      }

      // '출발지주소 -> 도착지주소' 화살표 패턴
      if (!foundFromAddr && /(?:->|→|➔|=>)/.test(line)) {
        const parts = line.split(/(?:->|→|➔|=>)/).map(s => s.trim()).filter(Boolean)
        if (parts.length >= 2 && /(?:서울|경기|인천|부산|대구|대전|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주|[가-힣]{2,4}[시군구동읍면로길])/.test(parts[0])) {
          foundFromAddr = parts[0]
          foundToAddr = parts[1]
        }
      }
    }

    // 라벨이 없는 경우 지역명으로 시작하는 주소 줄 탐색
    if (!foundFromAddr) {
      const regionRegex =
        /^((?:서울|경기|인천|부산|대구|대전|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주|서울특별시|경기도|인천광역시|부산광역시|대구광역시|대전광역시|광주광역시|울산광역시|세종특별자치시|강원특별자치도|전북특별자치도|[가-힣]{2,4}[시군구])\s+[가-힣0-9\s\-(),.~]{3,60})$/
      const addrLines: string[] = []
      for (const line of rawLines) {
        if (/^(?:출발|도착|연락처|고객|이사|방문|견적)/.test(line)) continue
        const m = line.match(regionRegex)
        if (m) {
          addrLines.push(m[1].trim())
        }
      }
      if (addrLines.length >= 1) foundFromAddr = addrLines[0]
      if (addrLines.length >= 2 && !foundToAddr) foundToAddr = addrLines[1]
    }

    if (foundFromAddr) {
      setFromAddress(foundFromAddr)
      extractedItems.push('출발지')
    }
    if (foundToAddr) {
      setToAddress(foundToAddr)
      extractedItems.push('도착지')
    }

    // 5. 날짜(이사 예정일 vs 방문 견적일) 및 방문 견적시간('3시견적', '오후 3시', '15:00' 등) 추출
    const formatYmd = (y: number, m: number, d: number) =>
      `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

    const parseDateToken = (str: string): string | null => {
      // YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD, YY-MM-DD
      const fullMatch = str.match(/(?:(20\d{2}|\d{2})\s*[-./년]\s*)(\d{1,2})\s*[-./월]\s*(\d{1,2})\s*일?/)
      if (fullMatch) {
        let y = parseInt(fullMatch[1], 10)
        if (y < 100) y += 2000
        const m = parseInt(fullMatch[2], 10)
        const d = parseInt(fullMatch[3], 10)
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          return formatYmd(y, m, d)
        }
      }
      // MM월 DD일 또는 MM/DD (단, 동/호수 제외)
      const mdMatch = str.match(/(?:^|\s)(\d{1,2})\s*(?:월\s*(\d{1,2})\s*일|\/\s*(\d{1,2})(?=\s|$|\(|요일))/)
      if (mdMatch) {
        const m = parseInt(mdMatch[1], 10)
        const d = parseInt(mdMatch[2] || mdMatch[3], 10)
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          return formatYmd(currentYear, m, d)
        }
      }
      return null
    }

    let extractedMovingDate = ''
    let extractedVisitDate = ''
    let extractedVisitTime = ''
    let visitTimeRawLabel = ''

    for (const line of rawLines) {
      // 주소 줄은 날짜/시간 파싱에서 제외 (예: 952, 405동 1402호 등 오인 방지)
      if (/^(?:\[?\s*(?:출발|도착|현주소|상차|하차))/.test(line)) continue
      // 전화번호가 포함된 토큰 제거 후 검사
      const lineWithoutPhone = line.replace(/(?:01[016789]|050\d)[-\s.]?\d{3,4}[-\s.]?\d{4}/g, '')

      const isVisitLine = /(?:방문|견적|예약|요망)/.test(lineWithoutPhone) && !/^(?:안녕하세요|전달)/.test(lineWithoutPhone)
      const isMovingDateLabelLine = /(?:이사일|이사날짜|이사예정일|이사희망일|상차일|작업일)/.test(lineWithoutPhone)

      // 상대적 방문일자 ('오늘', '내일', '모레') 감지
      if (isVisitLine || /(?:오늘|내일|모레)\s*(?:오전|오후|\d{1,2}\s*시)/.test(lineWithoutPhone)) {
        if (lineWithoutPhone.includes('오늘')) {
          extractedVisitDate = formatYmd(now.getFullYear(), now.getMonth() + 1, now.getDate())
        } else if (lineWithoutPhone.includes('내일')) {
          const tmr = new Date(now)
          tmr.setDate(tmr.getDate() + 1)
          extractedVisitDate = formatYmd(tmr.getFullYear(), tmr.getMonth() + 1, tmr.getDate())
        } else if (lineWithoutPhone.includes('모레')) {
          const dayAfter = new Date(now)
          dayAfter.setDate(dayAfter.getDate() + 2)
          extractedVisitDate = formatYmd(dayAfter.getFullYear(), dayAfter.getMonth() + 1, dayAfter.getDate())
        }
      }

      // 날짜 추출
      const parsedDate = parseDateToken(lineWithoutPhone)
      if (parsedDate) {
        if (isMovingDateLabelLine) {
          extractedMovingDate = parsedDate
        } else if (isVisitLine) {
          extractedVisitDate = parsedDate
        } else if (!extractedMovingDate) {
          // 플랫폼 문자에서 별도 라벨 없이 단독으로 적힌 날짜(예: '2026-11-25')는 이사 예정일
          extractedMovingDate = parsedDate
        }
      }

      // 방문 시간 추출 ('3시견적', '오후 3시', '3시 30분 견적', '3시반', '15:00' 등)
      if (!extractedVisitTime) {
        const korTimeMatch = lineWithoutPhone.match(
          /(?:(오전|오후|아침|낮|저녁|밤|AM|PM)\s*)?(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*(반))?\s*(?:방문견적|방문|견적|예약|요망)?/i
        )
        // 도시명('용인시', '파주시')은 앞에 숫자가 없으므로 (\d{1,2})\s*시 에 매칭되지 않으나, 주소 줄이 아닌 경우에만 적용
        if (
          korTimeMatch &&
          (isVisitLine ||
            Boolean(korTimeMatch[1]) ||
            /^\d{1,2}\s*시/.test(lineWithoutPhone.trim()) ||
            /(?:시간|방문|견적)/.test(lineWithoutPhone))
        ) {
          const ampm = (korTimeMatch[1] || '').toUpperCase()
          let hour = parseInt(korTimeMatch[2], 10)
          const minute = korTimeMatch[4]
            ? 30
            : korTimeMatch[3]
            ? parseInt(korTimeMatch[3], 10)
            : 0

          if (hour >= 0 && hour <= 23 && minute >= 0 && minute < 60) {
            if (ampm === '오후' || ampm === '낮' || ampm === '저녁' || ampm === '밤' || ampm === 'PM') {
              if (hour >= 1 && hour <= 11) hour += 12
            } else if (ampm === '오전' || ampm === '아침' || ampm === 'AM') {
              if (hour === 12) hour = 0
            } else {
              // 오전/오후 표기가 없는 현장 문자(예: '3시견적', '4시방문')는 1시~7시를 오후(13:00~19:00)로 스마트 변환
              if (hour >= 1 && hour <= 7) {
                hour += 12
              }
            }
            extractedVisitTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
            visitTimeRawLabel = korTimeMatch[0].trim()
          }
        } else {
          const colonTimeMatch = lineWithoutPhone.match(/(?:(오전|오후)\s*)?(\d{1,2}):(\d{2})/)
          if (colonTimeMatch && (isVisitLine || /(?:시간|방문|견적)/.test(lineWithoutPhone))) {
            let hour = parseInt(colonTimeMatch[2], 10)
            const minute = parseInt(colonTimeMatch[3], 10)
            if (colonTimeMatch[1] === '오후' && hour >= 1 && hour <= 11) hour += 12
            if (!colonTimeMatch[1] && hour >= 1 && hour <= 7) hour += 12
            if (hour >= 0 && hour <= 23 && minute >= 0 && minute < 60) {
              extractedVisitTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
              visitTimeRawLabel = colonTimeMatch[0].trim()
            }
          }
        }
      }
    }

    if (extractedMovingDate) {
      setMovingDatePart(extractedMovingDate)
      extractedItems.push(`이사예정일(${extractedMovingDate})`)
    }
    if (extractedVisitDate) {
      setVisitDatePart(extractedVisitDate)
      extractedItems.push(`방문일자(${extractedVisitDate})`)
    }
    if (extractedVisitTime) {
      setVisitTimePart(extractedVisitTime)
      extractedItems.push(`방문시간(${extractedVisitTime})`)
    }

    // 6. 이사 종류('가정', '포장이사', '일반이사', '보관이사' 등) 및 특이사항 메모 추출
    const noteFragments: string[] = []
    for (const line of rawLines) {
      if (
        /^(?:보관이사|보관)$/.test(line) ||
        /(?:이사\s*종류|이사\s*형태|구분)\s*[:：\-]?\s*보관/.test(line)
      ) {
        setMovingType('K')
        extractedItems.push('보관이사(K)')
        noteFragments.push(line)
      } else if (
        /^(?:일반이사|일반|용달이사|용달)$/.test(line) ||
        /(?:이사\s*종류|이사\s*형태|구분)\s*[:：\-]?\s*(?:일반|용달)/.test(line)
      ) {
        setMovingType('G')
        extractedItems.push('일반이사(G)')
        noteFragments.push(line)
      } else if (
        /^(?:가정|가정이사|포장|포장이사|반포장|반포장이사|원룸포장|원룸이사|사무실이사)$/.test(line) ||
        /(?:이사\s*종류|이사\s*형태|구분)\s*[:：\-]?\s*(?:가정|포장|반포장|원룸|사무실)/.test(line)
      ) {
        setMovingType('P')
        extractedItems.push(`포장이사(${line})`)
        noteFragments.push(line === '가정' ? '가정이사' : line)
      } else {
        const memoLabelMatch = line.match(/^(?:메모|특이사항|비고|요청사항|참고)\s*[:：\-]\s*(.+)$/)
        if (memoLabelMatch) {
          noteFragments.push(memoLabelMatch[1].trim())
        }
      }
    }

    if (visitTimeRawLabel && !noteFragments.includes(visitTimeRawLabel)) {
      noteFragments.push(visitTimeRawLabel)
    }

    if (noteFragments.length > 0) {
      setSpecialNotes(noteFragments.join(' / '))
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

  const resetFormFields = () => {
    const now = new Date()
    setSmsRawText('')
    setParseFeedback(null)
    setCustomerName('')
    setContact('')
    setMovingType('P')
    setVisitDatePart(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    )
    setVisitTimePart('14:00')
    setMovingDatePart('')
    setFromAddress('')
    setToAddress('')
    setSpecialNotes('')
    setRegisteredBookingId(null)
    setIsSmsManualEdited(false)
    setManualSmsText('')
    setIsTemplateManagerOpen(false)
    prevCleanCustNameRef.current = ''
  }

  const handleCloseModal = () => {
    if (registeredBookingId) {
      resetFormFields()
    }
    onClose()
  }

  const cleanPhoneDigits = contact.replace(/[^0-9+]/g, '')
  const hasValidContact = cleanPhoneDigits.replace(/[^0-9]/g, '').length >= 8
  const trimmedFromAddr = fromAddress.trim()
  const trimmedToAddr = toAddress.trim()

  const handleTriggerSendSms = () => {
    if (!hasValidContact) {
      alert('문자를 보낼 고객 연락처를 먼저 입력해주세요.')
      return
    }
    const bodyText = (effectiveSmsText || renderedTemplateText || '').trim()
    if (!bodyText) {
      alert('발송할 문자 내용이 비어있습니다.')
      return
    }
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : ''
    const isIos = /iphone|ipad|ipod/.test(ua)
    const sep = isIos ? '&' : '?'
    window.location.href = `sms:${cleanPhoneDigits}${sep}body=${encodeURIComponent(bodyText)}`
  }

  const handleCopySmsText = async () => {
    const bodyText = (effectiveSmsText || renderedTemplateText || '').trim()
    if (!bodyText) return
    try {
      await navigator.clipboard.writeText(bodyText)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = bodyText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setSmsCopied(true)
    setTimeout(() => setSmsCopied(false), 2000)
  }

  const persistTemplatesEverywhere = async (nextList: QuickVisitSmsTemplateItem[], toastMsg?: string) => {
    setSmsTemplates(nextList)
    try {
      localStorage.setItem(QUICK_VISIT_SMS_STORAGE_KEY, JSON.stringify(nextList))
    } catch {
      // ignore local storage error
    }
    setSavingTemplates(true)
    try {
      await saveQuickVisitSmsTemplates(nextList)
      if (toastMsg) {
        setTplSavedNotice(toastMsg)
        setTimeout(() => setTplSavedNotice(null), 2800)
      }
    } finally {
      setSavingTemplates(false)
    }
  }

  const openTemplateManager = (targetTpl?: QuickVisitSmsTemplateItem) => {
    const tpl = targetTpl || activeTemplate
    setEditingTplId(tpl.id)
    setTplFormTitle(tpl.title)
    setTplFormContent(tpl.content)
    setTplFormIsDefault(Boolean(tpl.isDefault))
    setIsTemplateManagerOpen(true)
  }

  const startCreateNewTemplate = () => {
    setEditingTplId('NEW')
    setTplFormTitle('')
    setTplFormContent(
      `안녕하세요, {고객명} 고객님!\n방문견적 예약 안내드립니다.\n\n■ 방문일시 : {방문일시}\n■ 방문주소 : {방문지}\n\n약속된 시간에 방문드리겠습니다. 감사합니다!`
    )
    setTplFormIsDefault(false)
    setIsTemplateManagerOpen(true)
  }

  const handleInsertPlaceholderToken = (token: string) => {
    const el = tplTextareaRef.current
    if (!el) {
      setTplFormContent(prev => `${prev}${token}`)
      return
    }
    const start = el.selectionStart ?? tplFormContent.length
    const end = el.selectionEnd ?? tplFormContent.length
    const next = tplFormContent.slice(0, start) + token + tplFormContent.slice(end)
    setTplFormContent(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  const handleSaveTemplateForm = async () => {
    const title = tplFormTitle.trim()
    const content = tplFormContent.trim()
    if (!title) {
      alert('템플릿 이름을 입력해주세요.')
      return
    }
    if (!content) {
      alert('템플릿 문자 내용을 입력해주세요.')
      return
    }

    let nextList: QuickVisitSmsTemplateItem[]
    let savedId = editingTplId

    if (editingTplId === 'NEW' || !smsTemplates.some(t => t.id === editingTplId)) {
      savedId = `tpl_${Date.now()}`
      const newItem: QuickVisitSmsTemplateItem = {
        id: savedId,
        title,
        content,
        isDefault: tplFormIsDefault
      }
      nextList = tplFormIsDefault
        ? [...smsTemplates.map(t => ({ ...t, isDefault: false })), newItem]
        : [...smsTemplates, newItem]
    } else {
      nextList = smsTemplates.map(t => {
        if (t.id === editingTplId) {
          return { ...t, title, content, isDefault: tplFormIsDefault ? true : t.isDefault }
        }
        return tplFormIsDefault ? { ...t, isDefault: false } : t
      })
    }

    if (!nextList.some(t => t.isDefault) && nextList.length > 0) {
      nextList[0] = { ...nextList[0], isDefault: true }
    }

    setSelectedTemplateId(savedId)
    setEditingTplId(savedId)
    setIsSmsManualEdited(false)
    await persistTemplatesEverywhere(nextList, `'${title}' 템플릿이 저장되었습니다.`)
  }

  const handleDeleteTemplate = async (targetId: string) => {
    if (smsTemplates.length <= 1) {
      alert('최소 1개 이상의 문자 템플릿은 유지되어야 합니다.')
      return
    }
    const target = smsTemplates.find(t => t.id === targetId)
    if (!confirm(`'${target?.title || '선택한 템플릿'}'을(를) 삭제하시겠습니까?`)) return

    const nextList = smsTemplates.filter(t => t.id !== targetId)
    if (!nextList.some(t => t.isDefault) && nextList.length > 0) {
      nextList[0] = { ...nextList[0], isDefault: true }
    }
    const fallback = nextList.find(t => t.isDefault) || nextList[0]
    setSelectedTemplateId(fallback.id)
    setEditingTplId(fallback.id)
    setTplFormTitle(fallback.title)
    setTplFormContent(fallback.content)
    setTplFormIsDefault(Boolean(fallback.isDefault))
    setIsSmsManualEdited(false)
    await persistTemplatesEverywhere(nextList, '템플릿이 삭제되었습니다.')
  }

  const handleResetDefaultTemplates = async () => {
    if (!confirm('문자 템플릿 목록을 초기 기본 템플릿 3종으로 복원하시겠습니까?')) return
    const defaults = DEFAULT_QUICK_VISIT_SMS_TEMPLATES.map(t => ({ ...t }))
    setSelectedTemplateId(defaults[0].id)
    setEditingTplId(defaults[0].id)
    setTplFormTitle(defaults[0].title)
    setTplFormContent(defaults[0].content)
    setTplFormIsDefault(true)
    setIsSmsManualEdited(false)
    await persistTemplatesEverywhere(defaults, '기본 템플릿으로 초기화되었습니다.')
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
      let finalPartnerId = selectedPartnerId
      let finalPartnerName = selectedPartnerName.trim()
      let finalPartnerShortName =
        (selectedPartnerShortName || finalPartnerName.slice(0, 4)).trim()
      let finalPartnerColor = selectedPartnerColor

      // 문자에서 자동 감지된 신규 플랫폼/이사업체인 경우 거래처 마스터에도 자동 등록
      if (
        finalPartnerName &&
        !finalPartnerId &&
        !partners.some(p => p.name === finalPartnerName)
      ) {
        const createdPtn = await createPartnerCompany({
          name: finalPartnerName,
          shortName: finalPartnerShortName,
          color: finalPartnerColor
        })
        if (createdPtn.partner) {
          finalPartnerId = createdPtn.partner.id
          finalPartnerName = createdPtn.partner.name
          finalPartnerShortName = createdPtn.partner.shortName
          finalPartnerColor = createdPtn.partner.color
          setPartners(prev => [...prev, createdPtn.partner!])
        }
      }

      // 한국 표준시(KST, +09:00) 오프셋을 명시하여 UTC 서버(Render)에서도 방문 시각이 밀리지 않도록 보장
      const visitDateIso = `${visitDatePart}T${visitTimePart || '14:00'}:00+09:00`
      const res = await createQuickVisitEstimate({
        partnerId: finalPartnerId,
        partnerName: finalPartnerName,
        partnerShortName: finalPartnerShortName,
        partnerColor: finalPartnerColor,
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
      router.refresh()

      if (openFullEstimateAfter && res.id) {
        resetFormFields()
        onClose()
        router.push(`/estimates/${res.id}/edit`)
      } else {
        // 방문예약 등록 완료 화면으로 전환하여 즉시 완성된 안내 문자를 보낼 수 있도록 제공
        setRegisteredBookingId(res.id || '등록완료')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // 공통 SMS 템플릿 선택·관리·미리보기·발송 블록 (등록 전 폼 화면 & 등록 완료 화면 모두에서 동일하게 실시간 동작)
  const renderSmsTemplateComposerSection = (isCompletionStep: boolean) => (
    <div
      className={`rounded-2xl border p-3.5 space-y-2.5 ${
        isCompletionStep
          ? 'bg-emerald-50/40 border-emerald-200'
          : 'bg-slate-50/90 border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <MessageSquareText
            className={`w-4 h-4 shrink-0 ${
              isCompletionStep ? 'text-emerald-600' : 'text-indigo-600'
            }`}
          />
          <span className="text-xs font-extrabold text-gray-900">
            {isCompletionStep
              ? '방문예약 안내 문자 발송 (고객명·방문일시 자동 적용)'
              : '방문예약 문자 템플릿 (고객명·일정 실시간 자동 완성)'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              isTemplateManagerOpen
                ? setIsTemplateManagerOpen(false)
                : openTemplateManager()
            }
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border flex items-center gap-1 transition-colors ${
              isTemplateManagerOpen
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{isTemplateManagerOpen ? '템플릿 관리 닫기' : '템플릿 관리'}</span>
          </button>
        </div>
      </div>

      {/* 저장된 템플릿 빠른 선택 탭 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {smsTemplates.map(tpl => {
          const isSelected = activeTemplate?.id === tpl.id
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                setSelectedTemplateId(tpl.id)
                setIsSmsManualEdited(false)
                if (isTemplateManagerOpen) {
                  setEditingTplId(tpl.id)
                  setTplFormTitle(tpl.title)
                  setTplFormContent(tpl.content)
                  setTplFormIsDefault(Boolean(tpl.isDefault))
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-all flex items-center gap-1 ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-indigo-50 hover:border-indigo-300'
              }`}
            >
              <span>{tpl.title}</span>
              {tpl.isDefault && (
                <span
                  className={`text-[9px] px-1 py-0.2 rounded ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  기본
                </span>
              )}
            </button>
          )
        })}
        <button
          type="button"
          onClick={startCreateNewTemplate}
          className="px-2 py-1 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-0.5"
        >
          <Plus className="w-3 h-3" />
          <span>새 템플릿</span>
        </button>
      </div>

      {/* 템플릿 관리 인라인 에디터 */}
      {isTemplateManagerOpen && (
        <div className="p-3 rounded-xl bg-white border-2 border-indigo-300 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-extrabold text-indigo-950">
              {editingTplId === 'NEW' ? '✨ 새 문자 템플릿 등록' : '✏️ 선택 템플릿 내용 편집'}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={startCreateNewTemplate}
                className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200"
              >
                + 새로 만들기
              </button>
              <button
                type="button"
                onClick={handleResetDefaultTemplates}
                className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] font-semibold"
                title="초기 기본 템플릿 3종으로 복원"
              >
                초기화
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="text"
              value={tplFormTitle}
              onChange={e => setTplFormTitle(e.target.value)}
              placeholder="템플릿 이름 (예: 방문예약 확정 문자)"
              className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-bold text-gray-900 outline-none focus:border-indigo-500"
            />
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={tplFormIsDefault}
                onChange={e => setTplFormIsDefault(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 w-3.5 h-3.5"
              />
              <span>기본 템플릿 지정</span>
            </label>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] font-bold text-gray-500 mr-0.5">
                자동 치환 변수 넣기:
              </span>
              {SMS_PLACEHOLDER_CHIPS.map(chip => (
                <button
                  key={chip.token}
                  type="button"
                  onClick={() => handleInsertPlaceholderToken(chip.token)}
                  className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-extrabold"
                >
                  +{chip.token}
                </button>
              ))}
            </div>
            <textarea
              ref={tplTextareaRef}
              rows={5}
              value={tplFormContent}
              onChange={e => setTplFormContent(e.target.value)}
              placeholder="예: 안녕하세요, {고객명} 고객님! {방문일시}에 방문견적 예정입니다."
              className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-xs text-gray-800 outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div>
              {editingTplId !== 'NEW' && smsTemplates.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteTemplate(editingTplId)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>삭제</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsTemplateManagerOpen(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={savingTemplates}
                onClick={handleSaveTemplateForm}
                className="px-3 py-1 rounded-lg text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{savingTemplates ? '저장 중...' : '템플릿 저장'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {tplSavedNotice && (
        <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{tplSavedNotice}</span>
        </p>
      )}

      {/* 실시간 완성 문자 미리보기 및 자유 수정 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-gray-600">
            발송될 완성 문자 내용{' '}
            <span className="text-indigo-700 font-extrabold">
              (고객명: {cleanCustomerBaseName(customerName) || '미입력 → 고객님'})
            </span>
          </span>
          {isSmsManualEdited && (
            <button
              type="button"
              onClick={() => {
                setIsSmsManualEdited(false)
                setManualSmsText('')
              }}
              className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>템플릿 자동문구로 복원</span>
            </button>
          )}
        </div>

        <textarea
          rows={isCompletionStep ? 6 : 4}
          value={effectiveSmsText}
          onChange={e => {
            setManualSmsText(e.target.value)
            setIsSmsManualEdited(true)
          }}
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 leading-relaxed"
        />

        <div className="flex flex-wrap items-center justify-end gap-2 pt-0.5">
          <button
            type="button"
            onClick={handleCopySmsText}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 flex items-center gap-1.5 shadow-2xs"
          >
            {smsCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-extrabold">복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-500" />
                <span>문자 복사</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleTriggerSendSms}
            className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>문자 보내기 (템플릿 완성본)</span>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl max-h-[93vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div
          className={`px-4 sm:px-5 py-3.5 text-white flex items-center justify-between shrink-0 ${
            registeredBookingId
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
              : 'bg-gradient-to-r from-indigo-700 to-blue-700'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {registeredBookingId ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-100 shrink-0" />
            ) : (
              <CalendarClock className="w-5 h-5 text-indigo-200 shrink-0" />
            )}
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold leading-tight truncate">
                {registeredBookingId
                  ? `방문견적 예약 등록 완료 (${registeredBookingId})`
                  : '방문견적 빠른 예약 접수 (문자 연동)'}
              </h2>
              <p className="text-[11px] text-white/85 truncate">
                {registeredBookingId
                  ? '예약 일정이 저장되었습니다. 고객님께 안내 문자를 바로 발송해보세요.'
                  : '의뢰업체로부터 받은 고객 성명·연락처와 방문일정을 빠르게 등록하고 안내 문자를 발송합니다.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            aria-label="닫기"
            className="p-1 text-white/80 hover:text-white rounded-lg shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {registeredBookingId ? (
          /* ================= 등록 완료 & 고객 안내문자 발송 화면 ================= */
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-extrabold">
                    예약등록 완료
                  </span>
                  <span className="font-mono font-bold text-emerald-900 text-xs sm:text-sm">
                    {registeredBookingId}
                  </span>
                </div>
                <span className="text-xs font-extrabold text-emerald-800">
                  방문일시: {formatYmdKor(visitDatePart)} {formatTimeKor(visitTimePart)}
                </span>
              </div>

              {/* 등록 완료 화면에서도 고객명 수정 시 아래 문자 템플릿에 즉시 반영 + 통화/문자/카카오맵 바로가기 */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-white p-3 rounded-xl border border-emerald-200/80">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    고객명 (변경 시 문자 즉시 반영)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 font-black text-gray-900 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    연락처 · 바로 연결
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="tel"
                      maxLength={14}
                      value={contact}
                      onFocus={handleSelectAllOnFocus}
                      onChange={e => handlePhoneInputChange(e, setContact)}
                      className="flex-1 min-w-0 rounded-lg border border-gray-300 px-2.5 py-1.5 font-bold text-gray-900 outline-none focus:border-emerald-500"
                    />
                    {hasValidContact ? (
                      <a
                        href={`tel:${cleanPhoneDigits}`}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1 shrink-0 whitespace-nowrap shadow-2xs"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>통화</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => alert('통화할 고객 연락처를 먼저 입력해주세요.')}
                        className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-400 border border-gray-200 text-xs font-bold flex items-center gap-1 shrink-0 whitespace-nowrap"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>통화</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleTriggerSendSms}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1 shrink-0 whitespace-nowrap shadow-2xs"
                    >
                      <MessageSquareText className="w-3.5 h-3.5" />
                      <span>문자</span>
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-12 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100">
                  <div className="text-xs text-gray-700 min-w-0">
                    <span className="font-bold text-gray-500 mr-1.5">방문지:</span>
                    <span className="font-semibold text-gray-900">
                      {trimmedFromAddr || '방문 시 상세확인'}
                    </span>
                  </div>
                  {trimmedFromAddr ? (
                    <a
                      href={`https://map.kakao.com/link/search/${encodeURIComponent(trimmedFromAddr)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-[#FEE500] hover:bg-[#FDD800] text-gray-900 border border-amber-300 text-xs font-extrabold flex items-center gap-1 shrink-0 whitespace-nowrap shadow-2xs"
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-900" />
                      <span>카카오맵</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        alert('카카오맵에서 조회할 방문지 주소를 먼저 입력해주세요.')
                      }
                      className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-400 border border-gray-200 text-xs font-bold flex items-center gap-1 shrink-0 whitespace-nowrap"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>카카오맵</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 템플릿 관리 및 예약완료 문자 발송 */}
            {renderSmsTemplateComposerSection(true)}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={resetFormFields}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>다른 고객 추가 접수</span>
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const targetId = registeredBookingId
                    resetFormFields()
                    onClose()
                    router.push(`/estimates/${targetId}/edit`)
                  }}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>견적서 작성 열기</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-gray-800 bg-gray-100 hover:bg-gray-200"
                >
                  확인 (닫기)
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= 방문견적 빠른 예약 접수 입력 화면 ================= */
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
            {/* 1. 수신 문자 붙여넣기 자동 추출 박스 */}
            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                  <ClipboardPaste className="w-4 h-4 text-indigo-600" />
                  <span>플랫폼/업체 문자 붙여넣기 (업체·성명·연락처·일정·출도착지 자동 인식)</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const clipText = await navigator.clipboard.readText()
                        if (clipText) handleParseSmsText(clipText)
                      } catch {
                        alert(
                          '클립보드 접근 권한이 없거나 지원되지 않습니다. 입력창을 길게 눌러 붙여넣기 해주세요.'
                        )
                      }
                    }}
                    className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    <span>클립보드 붙여넣기</span>
                  </button>
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
              </div>
              <textarea
                rows={3}
                value={smsRawText}
                onChange={e => handleParseSmsText(e.target.value)}
                placeholder={`예: 전달: 안녕하세요 모두이사 입니다.\n2026-11-25 / 김영은 고객님 / 연락처: 010-6432-3208 / 가정\n출발지: 경기 용인시 처인구... / 도착지: 경기 파주시... / 3시견적`}
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

                {selectedPartnerName &&
                  !partners.some(p => p.id === selectedPartnerId || p.name === selectedPartnerName) && (
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl text-xs font-extrabold border bg-indigo-600 text-white border-indigo-600 shadow-xs flex items-center gap-1.5"
                      title="문자에서 자동 감지된 업체입니다. 접수 완료 시 거래처 목록에 자동 추가됩니다."
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{selectedPartnerName} (자동감지)</span>
                    </button>
                  )}
              </div>
            </div>

            {/* 3. 고객명 · 연락처(+통화/문자 버튼) · 이사종류 */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-3">
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

              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  연락처 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="tel"
                    required
                    maxLength={14}
                    value={contact}
                    onFocus={handleSelectAllOnFocus}
                    onChange={e => handlePhoneInputChange(e, setContact)}
                    placeholder="010-0000-0000"
                    className="flex-1 min-w-0 rounded-xl border border-gray-300 px-3 py-2 font-bold text-gray-900 outline-none focus:border-blue-500"
                  />
                  {hasValidContact ? (
                    <a
                      href={`tel:${cleanPhoneDigits}`}
                      title="고객에게 전화 걸기"
                      className="px-2.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1 shrink-0 whitespace-nowrap shadow-2xs transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>통화</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => alert('통화할 고객 연락처를 먼저 입력해주세요.')}
                      title="연락처 입력 후 통화 가능"
                      className="px-2.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-400 border border-gray-200 text-xs font-bold flex items-center gap-1 shrink-0 whitespace-nowrap transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>통화</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleTriggerSendSms}
                    title="템플릿 완성 문자 바로 보내기"
                    className={`px-2.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 shrink-0 whitespace-nowrap transition-colors ${
                      hasValidContact
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-400 border border-gray-200'
                    }`}
                  >
                    <MessageSquareText className="w-3.5 h-3.5" />
                    <span>문자</span>
                  </button>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-gray-700 mb-1">이사 종류</label>
                <select
                  value={movingType}
                  onChange={e => setMovingType(e.target.value as 'P' | 'G' | 'K')}
                  className="w-full rounded-xl border border-gray-300 bg-white px-2.5 py-2 font-bold text-gray-800 outline-none focus:border-blue-500"
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

            {/* 5. 출발지(방문지 + 카카오맵) / 도착지 / 메모 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  방문지 (출발지 주소)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={fromAddress}
                    onChange={e => setFromAddress(e.target.value)}
                    placeholder="예: 서울시 송파구 잠실동 123-4"
                    className="flex-1 min-w-0 rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-blue-500"
                  />
                  {trimmedFromAddr ? (
                    <a
                      href={`https://map.kakao.com/link/search/${encodeURIComponent(trimmedFromAddr)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="카카오맵에서 방문지 위치 보기"
                      className="px-2.5 py-2 rounded-xl bg-[#FEE500] hover:bg-[#FDD800] text-gray-900 border border-amber-300 text-xs font-extrabold flex items-center gap-1 shrink-0 whitespace-nowrap shadow-2xs transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-900" />
                      <span>카카오맵</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        alert('카카오맵에서 조회할 방문지(출발지) 주소를 먼저 입력해주세요.')
                      }
                      title="방문지 주소 입력 후 카카오맵 열기 가능"
                      className="px-2.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-400 border border-gray-200 text-xs font-bold flex items-center gap-1 shrink-0 whitespace-nowrap transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>카카오맵</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    도착지 주소 (선택)
                  </label>
                  {trimmedFromAddr && trimmedToAddr && (
                    <a
                      href={`https://map.kakao.com/?sName=${encodeURIComponent(trimmedFromAddr)}&eName=${encodeURIComponent(trimmedToAddr)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-extrabold text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>카카오맵 경로보기</span>
                    </a>
                  )}
                </div>
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

            {/* 6. 방문예약 안내 문자 템플릿 선택·관리 및 완성 문자 발송 */}
            {renderSmsTemplateComposerSection(false)}

            {/* 하단 버튼 */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCloseModal}
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
                <span>{submitting ? '등록 중...' : '방문예약 등록 완료 (문자발송)'}</span>
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
        )}
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

/**
 * 대시보드 등 서버 컴포넌트에서 즉시 사용할 수 있는 [방문견적 빠른 접수] 버튼 + 모달 트리거
 */
export function QuickVisitBookingTrigger({
  initialPartners = []
}: {
  initialPartners?: PartnerCompanyItem[]
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-extrabold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap"
      >
        <CalendarClock className="w-4 h-4 shrink-0" />
        <span>방문견적 빠른 접수</span>
      </button>

      <QuickVisitBookingModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialPartners={initialPartners}
      />
    </>
  )
}


