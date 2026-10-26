'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  Calculator, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Wrench, 
  Truck, 
  Plus, 
  Trash2,
  Users,
  Layers,
  ArrowRight
} from 'lucide-react'
import KoreanLunarCalendar from 'korean-lunar-calendar'

// 1. CBM별 표준 가이드 구간 정의
export interface CbmTierGuide {
  id: string
  name: string
  tonnage: string
  minCbm: number
  maxCbm: number
  recommendedWorkers: string // 예: "남 3명 + 여 1명"
  guidePriceRange: string // 예: "1,100,000 ~ 1,300,000"
  defaultPrice: number // 기본 적용 추천가
  description: string
}

export const CBM_TIER_GUIDES: CbmTierGuide[] = [
  {
    id: '1ton',
    name: '소형 / 원룸 이사',
    tonnage: '1톤 1대',
    minCbm: 0,
    maxCbm: 6.99,
    recommendedWorkers: '남 1~2명',
    guidePriceRange: '400,000 ~ 550,000원',
    defaultPrice: 450000,
    description: '원룸, 오피스텔 및 소형 짐'
  },
  {
    id: '2.5ton',
    name: '투룸 / 소형가구',
    tonnage: '2.5톤 1대',
    minCbm: 7.0,
    maxCbm: 15.99,
    recommendedWorkers: '남 2명 + 여 1명',
    guidePriceRange: '700,000 ~ 900,000원',
    defaultPrice: 800000,
    description: '투룸, 신혼부부 소형 아파트'
  },
  {
    id: '5ton',
    name: '표준 가정 이사',
    tonnage: '5톤 1대',
    minCbm: 16.0,
    maxCbm: 25.99,
    recommendedWorkers: '남 3명 + 여 1명',
    guidePriceRange: '1,100,000 ~ 1,300,000원',
    defaultPrice: 1200000,
    description: '25 ~ 32평형 일반 가정집'
  },
  {
    id: '6ton',
    name: '중대형 이사 (짐 많음)',
    tonnage: '5톤 1대 + 1톤 1대',
    minCbm: 26.0,
    maxCbm: 30.99,
    recommendedWorkers: '남 4명 + 여 1명',
    guidePriceRange: '1,400,000 ~ 1,600,000원',
    defaultPrice: 1500000,
    description: '32 ~ 38평형 짐이 많은 세대'
  },
  {
    id: '7.5ton',
    name: '대형 평형 이사',
    tonnage: '5톤 1대 + 2.5톤 1대',
    minCbm: 31.0,
    maxCbm: 38.99,
    recommendedWorkers: '남 4~5명 + 여 1명',
    guidePriceRange: '1,700,000 ~ 2,000,000원',
    defaultPrice: 1850000,
    description: '40평형대 이상 가구/짐 다수'
  },
  {
    id: '10ton',
    name: '초대형 / 복층 이사',
    tonnage: '5톤 2대',
    minCbm: 39.0,
    maxCbm: 999.0,
    recommendedWorkers: '남 5~6명 + 여 2명',
    guidePriceRange: '2,200,000 ~ 2,600,000원~',
    defaultPrice: 2400000,
    description: '50평형 이상 대형 주택 및 복층'
  }
]

// 2. 특수물품 분해조립 기본 템플릿
interface SpecialItemOption {
  id: string
  name: string
  defaultPrice: number
  checked: boolean
  count: number
  price: number
}

const DEFAULT_SPECIAL_ITEMS: SpecialItemOption[] = [
  { id: 'tv', name: '벽걸이 TV 탈착 / 브라켓 시공', defaultPrice: 50000, checked: false, count: 1, price: 50000 },
  { id: 'ac', name: '에어컨 기본 탈착 / 배관 철거', defaultPrice: 80000, checked: false, count: 1, price: 80000 },
  { id: 'closet', name: '슬라이딩 / 붙박이장 분해조립', defaultPrice: 150000, checked: false, count: 1, price: 150000 },
  { id: 'stone_bed', name: '돌침대 / 흙침대 분해조립', defaultPrice: 120000, checked: false, count: 1, price: 120000 },
  { id: 'piano', name: '피아노 운반 (업라이트 등)', defaultPrice: 100000, checked: false, count: 1, price: 100000 },
  { id: 'bidet', name: '비데 / 정수기 / 식기세척기 탈착', defaultPrice: 30000, checked: false, count: 1, price: 30000 },
  { id: 'fridge_door', name: '대형 외제 냉장고 문짝 탈부착', defaultPrice: 50000, checked: false, count: 1, price: 50000 },
  { id: 'stairs_loft', name: '복층 / 계단 수작업 추가 인건비', defaultPrice: 80000, checked: false, count: 1, price: 80000 },
]

interface MovingCostCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
  currentCbm: number
  movingDate: Date | null
  currentMovingCost: number
  onApply: (calculatedCost: number, details: {
    baseCost: number
    calendarSurcharge: number
    specialItemCost: number
    summaryText: string
  }) => void
}

export function MovingCostCalculatorModal({
  isOpen,
  onClose,
  currentCbm,
  movingDate,
  currentMovingCost,
  onApply
}: MovingCostCalculatorModalProps) {
  // 1. 선택된 CBM 티어 및 기본운임
  const [selectedTierId, setSelectedTierId] = useState<string>('5ton')
  const [baseCost, setBaseCost] = useState<number>(1200000)

  // 2. 캘린더 할증 상태
  const [isSonEobNeunNal, setIsSonEobNeunNal] = useState<boolean>(false)
  const [isWeekend, setIsWeekend] = useState<boolean>(false)
  const [isFriday, setIsFriday] = useState<boolean>(false)
  const [isMonthEnd, setIsMonthEnd] = useState<boolean>(false)

  const [applySonEobNeunNal, setApplySonEobNeunNal] = useState<boolean>(false)
  const [sonEobNeunNalCost, setSonEobNeunNalCost] = useState<number>(150000)

  const [applyWeekend, setApplyWeekend] = useState<boolean>(false)
  const [weekendCost, setWeekendCost] = useState<number>(100000)

  const [applyFriday, setApplyFriday] = useState<boolean>(false)
  const [fridayCost, setFridayCost] = useState<number>(50000)

  const [applyMonthEnd, setApplyMonthEnd] = useState<boolean>(false)
  const [monthEndCost, setMonthEndCost] = useState<number>(50000)

  const [applyHoliday, setApplyHoliday] = useState<boolean>(false)
  const [holidayCost, setHolidayCost] = useState<number>(100000)

  // 3. 특수물품 분해조립 목록
  const [specialItems, setSpecialItems] = useState<SpecialItemOption[]>(DEFAULT_SPECIAL_ITEMS)
  const [customItemName, setCustomItemName] = useState<string>('')
  const [customItemPrice, setCustomItemPrice] = useState<number>(50000)

  // 모달 열릴 때 현재 CBM 및 이사일자 기반 자동 매칭
  useEffect(() => {
    if (!isOpen) return

    // CBM 기반 티어 자동 감지
    const matched = CBM_TIER_GUIDES.find(t => currentCbm >= t.minCbm && currentCbm <= t.maxCbm)
      || (currentCbm > 0 ? CBM_TIER_GUIDES[CBM_TIER_GUIDES.length - 1] : CBM_TIER_GUIDES[2])

    setSelectedTierId(matched.id)
    setBaseCost(currentMovingCost > 0 ? currentMovingCost : matched.defaultPrice)

    // 이사일자 기반 캘린더 할증 판정
    if (movingDate) {
      const d = new Date(movingDate)
      const dayOfWeek = d.getDay() // 0: 일, 5: 금, 6: 토
      const dateNum = d.getDate()

      // 손없는날 체크 (음력 9, 10, 19, 20, 29, 30일)
      try {
        const korCal = new KoreanLunarCalendar()
        korCal.setSolarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
        const korLunar = korCal.getLunarCalendar()
        const isSon = korLunar.day % 10 === 9 || korLunar.day % 10 === 0
        setIsSonEobNeunNal(isSon)
        setApplySonEobNeunNal(isSon)
      } catch {
        setIsSonEobNeunNal(false)
        setApplySonEobNeunNal(false)
      }

      // 주말 및 금요일
      const isWk = dayOfWeek === 0 || dayOfWeek === 6
      const isFri = dayOfWeek === 5
      setIsWeekend(isWk)
      setIsFriday(isFri)
      setApplyWeekend(isWk)
      setApplyFriday(isFri)

      // 월말 (25일 이상)
      const isEnd = dateNum >= 25
      setIsMonthEnd(isEnd)
      setApplyMonthEnd(isEnd)
    } else {
      setIsSonEobNeunNal(false)
      setIsWeekend(false)
      setIsFriday(false)
      setIsMonthEnd(false)
      setApplySonEobNeunNal(false)
      setApplyWeekend(false)
      setApplyFriday(false)
      setApplyMonthEnd(false)
    }
  }, [isOpen, currentCbm, movingDate, currentMovingCost])

  // CBM 티어 변경 시
  const handleSelectTier = (tier: CbmTierGuide) => {
    setSelectedTierId(tier.id)
    setBaseCost(tier.defaultPrice)
  }

  // 특수물품 토글 및 수량 변경
  const handleToggleSpecialItem = (id: string) => {
    setSpecialItems(prev => prev.map(item => {
      if (item.id === id) {
        const nextChecked = !item.checked
        return {
          ...item,
          checked: nextChecked,
          price: nextChecked ? (item.count || 1) * item.defaultPrice : 0
        }
      }
      return item
    }))
  }

  const handleChangeCount = (id: string, count: number) => {
    const validCount = Math.max(1, count)
    setSpecialItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          count: validCount,
          price: item.checked ? validCount * item.defaultPrice : 0
        }
      }
      return item
    }))
  }

  const handleChangeItemPrice = (id: string, unitPrice: number) => {
    setSpecialItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          defaultPrice: unitPrice,
          price: item.checked ? (item.count || 1) * unitPrice : 0
        }
      }
      return item
    }))
  }

  // 사용자 정의 특수 항목 추가
  const handleAddCustomItem = () => {
    if (!customItemName.trim()) return
    const newItem: SpecialItemOption = {
      id: `custom_${Date.now()}`,
      name: customItemName.trim(),
      defaultPrice: Number(customItemPrice) || 0,
      checked: true,
      count: 1,
      price: Number(customItemPrice) || 0
    }
    setSpecialItems(prev => [...prev, newItem])
    setCustomItemName('')
    setCustomItemPrice(50000)
  }

  const handleRemoveCustomItem = (id: string) => {
    setSpecialItems(prev => prev.filter(i => i.id !== id))
  }

  // 총 금액 계산
  const totalCalendarSurcharge = (
    (applySonEobNeunNal ? sonEobNeunNalCost : 0) +
    (applyWeekend ? weekendCost : 0) +
    (applyFriday ? fridayCost : 0) +
    (applyMonthEnd ? monthEndCost : 0) +
    (applyHoliday ? holidayCost : 0)
  )

  const totalSpecialItemCost = specialItems
    .filter(i => i.checked)
    .reduce((acc, cur) => acc + (cur.price || 0), 0)

  const finalTotalMovingCost = (Number(baseCost) || 0) + totalCalendarSurcharge + totalSpecialItemCost

  // 견적서에 적용 핸들러
  const handleApplyToEstimate = () => {
    const breakdownItems: string[] = []
    const selectedTier = CBM_TIER_GUIDES.find(t => t.id === selectedTierId)
    if (selectedTier) {
      breakdownItems.push(`기준: ${selectedTier.tonnage} (${baseCost.toLocaleString()}원)`)
    }
    if (applySonEobNeunNal) breakdownItems.push(`손없는날 +${sonEobNeunNalCost.toLocaleString()}원`)
    if (applyWeekend) breakdownItems.push(`주말 +${weekendCost.toLocaleString()}원`)
    if (applyFriday) breakdownItems.push(`금요일 +${fridayCost.toLocaleString()}원`)
    if (applyMonthEnd) breakdownItems.push(`월말 +${monthEndCost.toLocaleString()}원`)
    if (applyHoliday) breakdownItems.push(`공휴일 +${holidayCost.toLocaleString()}원`)

    const checkedSpecials = specialItems.filter(i => i.checked)
    if (checkedSpecials.length > 0) {
      const specialDesc = checkedSpecials.map(s => `${s.name}(${s.count}개)`).join(', ')
      breakdownItems.push(`특수작업(${specialDesc}) +${totalSpecialItemCost.toLocaleString()}원`)
    }

    onApply(finalTotalMovingCost, {
      baseCost,
      calendarSurcharge: totalCalendarSurcharge,
      specialItemCost: totalSpecialItemCost,
      summaryText: breakdownItems.join(' / ')
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* 상단 모달 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-linear-to-r from-blue-50/80 to-indigo-50/50">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Calculator size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-gray-900">
                  이사비용 산출 시뮬레이터
                </h2>
                <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  CBM 가이드 & 할증 계산
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                물량(CBM) 구간별 권장 운임과 캘린더 할증, 특수물품 분해조립 비용을 종합하여 이사비용을 계산합니다.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 모달 본문 (스크롤 영역) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 divide-y divide-gray-100">

          {/* 1. CBM별 물량 가이드 및 기준 이사비용 선택 */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">1</span>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Truck size={16} className="text-blue-600" />
                  <span>CBM별 물량 기준운임 가이드</span>
                </h3>
              </div>

              {/* 현재 산출 CBM 뱃지 */}
              <div className="flex items-center gap-2 text-xs bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                <span className="text-gray-500 font-medium">현재 견적서 물량:</span>
                <span className="font-black text-blue-700">{currentCbm.toFixed(2)} CBM</span>
                {currentCbm > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const matched = CBM_TIER_GUIDES.find(t => currentCbm >= t.minCbm && currentCbm <= t.maxCbm)
                      if (matched) handleSelectTier(matched)
                    }}
                    className="ml-1 text-[11px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded hover:bg-blue-700 transition-colors"
                  >
                    현재 물량 자동매칭
                  </button>
                )}
              </div>
            </div>

            {/* CBM 톤수별 6개 구간 카드 그리드 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {CBM_TIER_GUIDES.map(tier => {
                const isSelected = selectedTierId === tier.id
                const isCurrentRange = currentCbm >= tier.minCbm && currentCbm <= tier.maxCbm

                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => handleSelectTier(tier)}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                    }`}
                  >
                    {isCurrentRange && (
                      <span className="absolute -top-2 right-2 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                        물량 적합
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-900">{tier.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {tier.tonnage}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        권장 구간: {tier.minCbm === 0 ? '6 CBM 이하' : `${tier.minCbm}~${tier.maxCbm > 100 ? '이상' : tier.maxCbm} CBM`}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-gray-600 mt-1">
                        <Users size={12} className="text-gray-400" />
                        <span>{tier.recommendedWorkers}</span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">가이드</span>
                      <span className={`text-xs font-black ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                        {tier.defaultPrice.toLocaleString()}원
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 선택된 기본 운임 직접 수정 인풋 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 gap-2">
              <div className="text-xs text-gray-700">
                <span className="font-bold text-gray-900">선택된 기준 이사비용: </span>
                <span className="text-gray-500">필요 시 현장 상황에 맞추어 직접 금액을 변경할 수 있습니다.</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-gray-600">기준운임:</span>
                <input
                  type="text"
                  value={baseCost === 0 ? '' : baseCost.toLocaleString()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '')
                    setBaseCost(raw ? Number(raw) : 0)
                  }}
                  className="w-36 px-3 py-1.5 text-sm font-black text-right rounded-lg border border-gray-300 bg-white focus:border-blue-500 outline-none"
                />
                <span className="text-xs font-bold text-gray-700">원</span>
              </div>
            </div>
          </div>

          {/* 2. 캘린더 할증 체크 (손없는날, 월말, 주말 등) */}
          <div className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">2</span>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <CalendarIcon size={16} className="text-indigo-600" />
                  <span>캘린더 및 이사일정 할증</span>
                </h3>
              </div>
              <div className="text-xs text-gray-500">
                이사일: <strong className="text-gray-900">{movingDate ? movingDate.toISOString().slice(0, 10) : '미지정'}</strong>
              </div>
            </div>

            {/* 손없는날 알림 배너 */}
            {movingDate && (
              <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                isSonEobNeunNal 
                  ? 'bg-amber-50/80 border-amber-300 text-amber-900' 
                  : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}>
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className={isSonEobNeunNal ? 'text-amber-600 shrink-0' : 'text-gray-400 shrink-0'} />
                  <span>
                    {isSonEobNeunNal ? (
                      <strong>★ 선택하신 이사일({movingDate.toISOString().slice(0, 10)})은 민속 손 없는 날입니다!</strong>
                    ) : (
                      <span>선택하신 이사일은 손 없는 날이 아닙니다.</span>
                    )}
                    {isWeekend ? ' (주말 일정)' : isFriday ? ' (금요일 일정)' : ''}
                    {isMonthEnd ? ' (월말 일정)' : ''}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400 font-medium">자동 체크 반영</span>
              </div>
            )}

            {/* 할증 옵션 체크박스 리스트 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 1) 손 없는 날 할증 */}
              <div className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                applySonEobNeunNal ? 'bg-amber-50/50 border-amber-300' : 'bg-white border-gray-200'
              }`}>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="checkbox"
                    checked={applySonEobNeunNal}
                    onChange={(e) => setApplySonEobNeunNal(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                  <span>손 없는 날 할증</span>
                  {isSonEobNeunNal && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-bold">해당일</span>
                  )}
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">+</span>
                  <input
                    type="text"
                    disabled={!applySonEobNeunNal}
                    value={sonEobNeunNalCost === 0 ? '' : sonEobNeunNalCost.toLocaleString()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      setSonEobNeunNalCost(raw ? Number(raw) : 0)
                    }}
                    className="w-24 px-2 py-1 text-xs font-bold text-right rounded border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400 outline-none"
                  />
                  <span className="text-xs text-gray-600">원</span>
                </div>
              </div>

              {/* 2) 주말(토/일) 할증 */}
              <div className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                applyWeekend ? 'bg-indigo-50/50 border-indigo-300' : 'bg-white border-gray-200'
              }`}>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="checkbox"
                    checked={applyWeekend}
                    onChange={(e) => setApplyWeekend(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span>주말(토/일) 할증</span>
                  {isWeekend && (
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.2 rounded font-bold">해당일</span>
                  )}
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">+</span>
                  <input
                    type="text"
                    disabled={!applyWeekend}
                    value={weekendCost === 0 ? '' : weekendCost.toLocaleString()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      setWeekendCost(raw ? Number(raw) : 0)
                    }}
                    className="w-24 px-2 py-1 text-xs font-bold text-right rounded border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400 outline-none"
                  />
                  <span className="text-xs text-gray-600">원</span>
                </div>
              </div>

              {/* 3) 금요일 이사 할증 */}
              <div className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                applyFriday ? 'bg-blue-50/50 border-blue-300' : 'bg-white border-gray-200'
              }`}>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="checkbox"
                    checked={applyFriday}
                    onChange={(e) => setApplyFriday(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span>금요일 선호 할증</span>
                  {isFriday && (
                    <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded font-bold">해당일</span>
                  )}
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">+</span>
                  <input
                    type="text"
                    disabled={!applyFriday}
                    value={fridayCost === 0 ? '' : fridayCost.toLocaleString()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      setFridayCost(raw ? Number(raw) : 0)
                    }}
                    className="w-24 px-2 py-1 text-xs font-bold text-right rounded border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400 outline-none"
                  />
                  <span className="text-xs text-gray-600">원</span>
                </div>
              </div>

              {/* 4) 월말(25일~말일) 할증 */}
              <div className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                applyMonthEnd ? 'bg-purple-50/50 border-purple-300' : 'bg-white border-gray-200'
              }`}>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="checkbox"
                    checked={applyMonthEnd}
                    onChange={(e) => setApplyMonthEnd(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span>월말(25일~말일) 할증</span>
                  {isMonthEnd && (
                    <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.2 rounded font-bold">해당일</span>
                  )}
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">+</span>
                  <input
                    type="text"
                    disabled={!applyMonthEnd}
                    value={monthEndCost === 0 ? '' : monthEndCost.toLocaleString()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      setMonthEndCost(raw ? Number(raw) : 0)
                    }}
                    className="w-24 px-2 py-1 text-xs font-bold text-right rounded border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400 outline-none"
                  />
                  <span className="text-xs text-gray-600">원</span>
                </div>
              </div>

              {/* 5) 공휴일/봄가을 성수기 할증 */}
              <div className={`p-3 rounded-xl border flex items-center justify-between transition-colors sm:col-span-2 ${
                applyHoliday ? 'bg-rose-50/50 border-rose-300' : 'bg-white border-gray-200'
              }`}>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-900">
                  <input
                    type="checkbox"
                    checked={applyHoliday}
                    onChange={(e) => setApplyHoliday(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                  />
                  <span>공휴일 / 봄·가을 이사 성수기 특별 할증</span>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">+</span>
                  <input
                    type="text"
                    disabled={!applyHoliday}
                    value={holidayCost === 0 ? '' : holidayCost.toLocaleString()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      setHolidayCost(raw ? Number(raw) : 0)
                    }}
                    className="w-24 px-2 py-1 text-xs font-bold text-right rounded border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400 outline-none"
                  />
                  <span className="text-xs text-gray-600">원</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. 특수물품 분해조립 및 특수작업 비용 가산 */}
          <div className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">3</span>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Wrench size={16} className="text-emerald-600" />
                  <span>특수물품 분해조립 및 부가작업 가산</span>
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-700">
                선택 합계: +{totalSpecialItemCost.toLocaleString()}원
              </span>
            </div>

            {/* 사전 정의 항목 리스트 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {specialItems.map(item => (
                <div
                  key={item.id}
                  className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                    item.checked ? 'bg-emerald-50/60 border-emerald-300 shadow-xs' : 'bg-white border-gray-200'
                  }`}
                >
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-900 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => handleToggleSpecialItem(item.id)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 shrink-0"
                    />
                    <span className="truncate">{item.name}</span>
                  </label>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* 수량 */}
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                      <span className="text-[10px] text-gray-400">수량</span>
                      <input
                        type="number"
                        min="1"
                        disabled={!item.checked}
                        value={item.count}
                        onChange={(e) => handleChangeCount(item.id, parseInt(e.target.value) || 1)}
                        className="w-10 text-xs text-center font-bold outline-none disabled:bg-transparent disabled:text-gray-400"
                      />
                    </div>

                    {/* 단가 */}
                    <div className="flex items-center gap-0.5">
                      <input
                        type="text"
                        disabled={!item.checked}
                        value={item.defaultPrice === 0 ? '' : item.defaultPrice.toLocaleString()}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '')
                          handleChangeItemPrice(item.id, raw ? Number(raw) : 0)
                        }}
                        className="w-20 px-1.5 py-1 text-xs font-bold text-right rounded border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400 outline-none"
                      />
                      <span className="text-[11px] text-gray-500">원</span>
                    </div>

                    {/* 사용자 직접 추가한 항목이면 삭제 버튼 */}
                    {item.id.startsWith('custom_') && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 사용자 직접 추가 인풋 */}
            <div className="p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300 flex flex-col sm:flex-row items-center gap-2">
              <span className="text-xs font-bold text-gray-700 whitespace-nowrap">+ 직접 추가:</span>
              <input
                type="text"
                placeholder="예: 안마의자 분해운반, 대형샹들리에 등"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                className="flex-1 w-full sm:w-auto px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white outline-none focus:border-blue-500 font-medium"
              />
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="단가"
                  value={customItemPrice === 0 ? '' : customItemPrice.toLocaleString()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '')
                    setCustomItemPrice(raw ? Number(raw) : 0)
                  }}
                  className="w-28 px-3 py-1.5 text-xs font-bold text-right rounded-lg border border-gray-300 bg-white outline-none focus:border-blue-500"
                />
                <span className="text-xs text-gray-600">원</span>
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  <Plus size={14} />
                  <span>추가</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* 하단 고정 액션 바 */}
        <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* 금액 상세 요약 */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-medium">기준운임:</span>
              <strong className="text-gray-900">{baseCost.toLocaleString()}원</strong>
            </div>
            {totalCalendarSurcharge > 0 && (
              <div className="flex items-center gap-1 text-indigo-700">
                <span className="font-medium">+ 캘린더할증:</span>
                <strong className="font-black">+{totalCalendarSurcharge.toLocaleString()}원</strong>
              </div>
            )}
            {totalSpecialItemCost > 0 && (
              <div className="flex items-center gap-1 text-emerald-700">
                <span className="font-medium">+ 특수작업:</span>
                <strong className="font-black">+{totalSpecialItemCost.toLocaleString()}원</strong>
              </div>
            )}
            <div className="flex items-center gap-1 text-sm sm:text-base font-black text-blue-700 ml-auto sm:ml-2">
              <span className="text-xs text-gray-500 font-normal">최종 산출합계:</span>
              <span>{finalTotalMovingCost.toLocaleString()} 원</span>
            </div>
          </div>

          {/* 적용 버튼 */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleApplyToEstimate}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm shadow-blue-300 transition-all active:scale-95"
            >
              <CheckCircle2 size={16} />
              <span>견적서 기본 이사비용에 적용 ({finalTotalMovingCost.toLocaleString()}원)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
