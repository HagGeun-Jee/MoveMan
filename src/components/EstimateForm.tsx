'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
const SignatureCanvas = dynamic(() => import('react-signature-canvas'), { ssr: false }) as any
import { getStandardItems, getLocationCategories } from '@/app/actions/item'
import { getVehicles } from '@/app/actions/vehicle'
import { getLabors } from '@/app/actions/labor'
import { getDistance } from '@/app/actions/distance'
import { getLadderFares } from '@/app/actions/ladder'
import type { LadderFareItem } from '@/types/ladder'
import DaumPostcodeEmbed from 'react-daum-postcode'
import { MapPin, Search, ChevronDown, ChevronUp, Navigation, RefreshCw, Car, AlertCircle, CheckCircle2, Calculator, Truck, Plus, FileText, Sparkles, Zap, Smartphone, Table, Trash2, Coins, CreditCard, PackagePlus, X } from 'lucide-react'
import { CustomDatePicker } from '@/components/CustomDatePicker'
import { format } from 'date-fns'
import { formatPhoneNumber, handlePhoneInputChange, handleSelectAllOnFocus } from '@/lib/format'
import { MovingCostCalculatorModal } from '@/components/MovingCostCalculatorModal'
import { CostCalculatorModal } from '@/components/CostCalculatorModal'
import { getCostStandards, CostStandardData } from '@/app/actions/costStandards'
import { AiCbmEstimateModal, type AiIdentifiedItem } from '@/components/AiCbmEstimateModal'
import { EstimatePresetModal } from '@/components/EstimatePresetModal'
import { QuickTouchCbmPanel } from '@/components/QuickTouchCbmPanel'
import { ItemQuickAddModal } from '@/components/ItemQuickAddModal'
import {
  CHOSUNG_BUTTONS,
  ChosungFilter,
  ITEM_MID_CATEGORIES,
  ItemMidCategory,
  matchesChosungFilter,
  matchesKoreanSearch,
  classifyItemMidCategory,
  convertEngInputToKor,
} from '@/lib/itemFilterUtils'
import { UnassignedBoxTooltip } from '@/components/UnassignedBoxTooltip'
import type { PresetItem } from '@/lib/estimatePresets'
import { calculate5TonTruckDuration } from '@/lib/distance'
import {
  TONNAGE_DISTANCE_FARE_TABLE,
  TONNAGE_DISTANCE_FARE_LIST,
  resolveTonnageTierKey,
  calculateTonnageDistanceFare,
  adjustTollForHeavyTruck,
  type TonnageTierKey,
} from '@/lib/distanceFare'

const NumberInput = ({ value, onChange, className, name }: { value: number, onChange: (val: number) => void, className?: string, name?: string }) => {
  const [localVal, setLocalVal] = useState(value === 0 ? '' : value.toLocaleString())
  
  useEffect(() => {
    setLocalVal(value === 0 ? '' : value.toLocaleString())
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9]/g, '')
    if (raw.length > 1 && raw.startsWith('0')) {
      raw = raw.replace(/^0+/, '')
      if (raw === '') raw = '0'
    }
    setLocalVal(raw ? Number(raw).toLocaleString() : '')
    onChange(raw ? Number(raw) : 0)
  }

  return (
    <input 
      type="text" 
      name={name}
      value={localVal}
      onChange={handleChange}
      onFocus={handleSelectAllOnFocus}
      className={className}
      data-select-on-focus="true"
    />
  )
}

export const isBoxItem = (name: string): boolean => {
  const upper = (name || '').trim().toUpperCase()
  return upper === 'BOX' || upper.startsWith('BOX') || upper === '박스'
}

export const isBaseCbmExcluded = (treatment?: string): boolean => 
  treatment === '폐기' || treatment === '내림' || treatment === '존치'

export const getItemEffectiveCbm = (item: any): number => {
  const qty = item.quantity !== undefined ? Number(item.quantity) : 1
  const baseCbm = isBaseCbmExcluded(item.treatment) ? 0 : (Number(item.cbm) || 0)
  const innerCbm = Number(item.innerBoxCbm) || 0
  return (baseCbm + innerCbm) * qty
}

const sortCbmItems = (list: any[]): any[] => {
  return [...list].sort((a: any, b: any) => {
    const nameComp = (a.name || '').localeCompare(b.name || '', 'ko')
    if (nameComp !== 0) return nameComp
    return (a.spec || '').localeCompare(b.spec || '', 'ko')
  })
}

const filterValidCbmItems = (itemsList: any[]): any[] => {
  if (!Array.isArray(itemsList)) return []
  const filtered = itemsList.filter((item: any) => {
    const qty = item.quantity !== undefined ? Number(item.quantity) : 1
    const unitCbm = (Number(item.cbm) || 0) + (Number(item.innerBoxCbm) || 0)
    return unitCbm > 0 && qty > 0
  }).map((item: any) => ({
    ...item,
    treatment: item.treatment || '이동'
  }))
  return sortCbmItems(filtered)
}

let globalItemSeq = 0
export const ensureItemUid = (item: any): any => {
  if (!item) return item
  if (!item._uid) {
    globalItemSeq += 1
    item._uid = `cbm_${Date.now()}_${globalItemSeq}_${Math.random().toString(36).substring(2, 7)}`
  }
  return item
}

const parseAndFilterCbmItems = (cbmItemsStr: string | null | undefined): any[] => {
  if (!cbmItemsStr) return []
  try {
    const parsed = JSON.parse(cbmItemsStr)
    return filterValidCbmItems(parsed).map(ensureItemUid)
  } catch {
    return []
  }
}

const safeJsonParse = (str: any, fallback: any = {}): any => {
  if (!str || str === 'null' || str === 'undefined') return fallback
  if (typeof str === 'object') return str
  try {
    const parsed = JSON.parse(str)
    return parsed && typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

export function EstimateForm({ 
  initialData, 
  action, 
  title = "새 견적 작성",
  costStandards: initialCostStandards
}: { 
  initialData?: any, 
  action: (formData: FormData) => Promise<void>,
  title?: string,
  costStandards?: CostStandardData
}) {
  const envObj = safeJsonParse(initialData?.environment, {})
  const payPlanObj = safeJsonParse(initialData?.paymentPlan, {})

  // 임시 저장 키 (신규 견적 작성 또는 특정 견적 수정 구분)
  const storageKey = initialData?.id 
    ? `meman_estimate_draft_edit_${initialData.id}` 
    : 'meman_estimate_draft_new'

  const [draftRestoredTime, setDraftRestoredTime] = useState<string | null>(null)
  const isDraftLoadedRef = useRef(false)

  const [movingCost, setMovingCost] = useState(initialData?.movingCost || 0)
  const [isCostModalOpen, setIsCostModalOpen] = useState(false)
  const [isCostCalculatorModalOpen, setIsCostCalculatorModalOpen] = useState(false)
  const [costStandardsData, setCostStandardsData] = useState<CostStandardData | undefined>(initialCostStandards)

  useEffect(() => {
    if (!initialCostStandards) {
      getCostStandards().then(data => setCostStandardsData(data)).catch(() => {})
    }
  }, [initialCostStandards])

  const [additionalCost, setAdditionalCost] = useState(initialData?.additionalCost || 0)
  const [storageCost, setStorageCost] = useState(initialData?.storageCost || 0)
  const [vat, setVat] = useState(initialData?.vat || 0)
  
  const supplyAmount = movingCost + additionalCost + storageCost
  const totalAmount = supplyAmount + vat

  const [isCostEdited, setIsCostEdited] = useState(false)

  useEffect(() => {
    if (!initialData || isCostEdited) {
      setVat(Math.floor(supplyAmount * 0.1))
    }
  }, [supplyAmount, isCostEdited, initialData])

  const [downPayment, setDownPayment] = useState(payPlanObj.downPayment || 0)
  const [downPaymentDate, setDownPaymentDate] = useState<Date | null>(payPlanObj.downPaymentDate ? new Date(payPlanObj.downPaymentDate) : null)
  const [downPaymentPaid, setDownPaymentPaid] = useState(payPlanObj.downPaymentPaid || false)
  
  const [intermediatePayment, setIntermediatePayment] = useState(payPlanObj.intermediatePayment || 0)
  const [intermediateDate, setIntermediateDate] = useState<Date | null>(payPlanObj.intermediateDate ? new Date(payPlanObj.intermediateDate) : null)
  const [intermediatePaymentPaid, setIntermediatePaymentPaid] = useState(payPlanObj.intermediatePaymentPaid || false)
  
  const [balance, setBalance] = useState(payPlanObj.balance || 0)
  const [balanceDate, setBalanceDate] = useState<Date | null>(payPlanObj.balanceDate ? new Date(payPlanObj.balanceDate) : null)
  const [balancePaid, setBalancePaid] = useState(payPlanObj.balancePaid || false)
  
  const [estimateDate, setEstimateDate] = useState<Date | null>(initialData?.estimateDate ? new Date(initialData.estimateDate) : new Date())
  const [visitDate, setVisitDate] = useState<Date | null>(initialData?.visitDate ? new Date(initialData.visitDate) : null)
  const [movingDate, setMovingDate] = useState<Date | null>(initialData?.movingDate ? new Date(initialData.movingDate) : null)
  const [organizeDate, setOrganizeDate] = useState<Date | null>(initialData?.organizeDate ? new Date(initialData.organizeDate) : null)

  // 이사날짜 경과 여부 판정 (오늘 자정 이전 날짜인지 검사)
  const isPastMovingDate = Boolean(
    movingDate && (() => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const mDate = new Date(movingDate)
      mDate.setHours(0, 0, 0, 0)
      return mDate < today
    })()
  )

  const handleOpenCostModal = () => {
    if (isPastMovingDate) {
      const formattedDate = movingDate ? format(movingDate, 'yyyy-MM-dd') : ''
      alert(`이사날짜(${formattedDate})가 이미 지난 견적 건은 이사비용 산출 기능을 사용할 수 없습니다.`)
      return
    }
    setIsCostModalOpen(true)
  }

  const [paymentTarget, setPaymentTarget] = useState<'supply' | 'total'>(payPlanObj.targetType || 'supply')
  const targetAmount = paymentTarget === 'supply' ? supplyAmount : totalAmount
  const paidAmount = downPayment + intermediatePayment + balance
  const remainingAmount = targetAmount - paidAmount

  const [fromAddress, setFromAddress] = useState(initialData?.fromAddress || '')
  const [toAddress, setToAddress] = useState(initialData?.toAddress || '')
  const [postcodeOpen, setPostcodeOpen] = useState(false)
  const [postcodeTarget, setPostcodeTarget] = useState<'from' | 'to'>('from')
  const [movingType, setMovingType] = useState(initialData?.movingType || 'P')
  const [customerName, setCustomerName] = useState(initialData?.customerName || '')
  const [contact, setContact] = useState(formatPhoneNumber(initialData?.contact || ''))
  const [organizeStatus, setOrganizeStatus] = useState<string>(envObj.organizeStatus || '')
  const [fromFloor, setFromFloor] = useState<string>(envObj.fromFloor || '')
  const [fromWorkTypes, setFromWorkTypes] = useState<string[]>(Array.isArray(envObj.fromWorkTypes) ? envObj.fromWorkTypes : [])
  const [toFloor, setToFloor] = useState<string>(envObj.toFloor || '')
  const [toWorkTypes, setToWorkTypes] = useState<string[]>(Array.isArray(envObj.toWorkTypes) ? envObj.toWorkTypes : [])

  // 거리 관련 상태
  const [distance, setDistance] = useState<number>(Number(envObj.distance) || 0)
  const [distanceDuration, setDistanceDuration] = useState<string>(envObj.distanceDuration || '')
  const [distanceDetail, setDistanceDetail] = useState<string>(envObj.distanceDetail || '')
  const [isCalculatingDistance, setIsCalculatingDistance] = useState<boolean>(false)
  const [distanceCalcError, setDistanceCalcError] = useState<string | null>(null)
  const [distanceNotice, setDistanceNotice] = useState<string | null>(null)
  
  // 사다리차 표준 운임표 관련 상태
  const [ladderFares, setLadderFares] = useState<LadderFareItem[]>([])
  const [ladderTonnage, setLadderTonnage] = useState<string>(envObj.ladderTonnage || '5')

  useEffect(() => {
    getLadderFares().then(setLadderFares)
  }, [])

  // 층수와 톤수에 따른 사다리차 요금 계산
  const calculateLadderFee = (floorStr: string, tonnage: string): { cost: number, tier: string } => {
    const floor = parseInt(floorStr) || 0
    if (floor <= 1 || ladderFares.length === 0) return { cost: 0, tier: '' }
    const ton = parseFloat(tonnage) || 5
    const matched = ladderFares.find(f => floor >= f.minFloor && floor <= f.maxFloor)
      || ladderFares.find(f => floor <= f.maxFloor)
      || ladderFares[ladderFares.length - 1]
    if (!matched) return { cost: 0, tier: '' }
    
    let cost = matched.cost5Ton
    if (ton <= 1.0) cost = matched.cost1Ton
    else if (ton <= 2.5) cost = matched.cost2_5Ton
    else if (ton <= 5.0) cost = matched.cost5Ton
    else if (ton <= 6.0) cost = matched.cost6Ton
    else if (ton <= 7.5) cost = matched.cost7_5Ton
    else cost = matched.cost10Ton

    return { cost, tier: matched.floorName }
  }

  const isFromLadder = fromWorkTypes.includes('사다리차')
  const isToLadder = toWorkTypes.includes('사다리차')
  const fromLadderCalc = isFromLadder ? calculateLadderFee(fromFloor, ladderTonnage) : { cost: 0, tier: '' }
  const toLadderCalc = isToLadder ? calculateLadderFee(toFloor, ladderTonnage) : { cost: 0, tier: '' }
  const totalLadderCost = fromLadderCalc.cost + toLadderCalc.cost

  const initialLadderApplied = (initialData?.additionalCost && Number(initialData.additionalCost) > 0 && Number(envObj.ladderTotalCost) > 0)
    ? Number(envObj.ladderTotalCost)
    : 0

  const initialDistanceApplied = (initialData?.additionalCost && Number(initialData.additionalCost) > 0 && Number(envObj.distanceExtraCost) > 0)
    ? Number(envObj.distanceExtraCost)
    : 0

  const [appliedLadderCost, setAppliedLadderCost] = useState<number>(initialLadderApplied)
  const [appliedDistanceCost, setAppliedDistanceCost] = useState<number>(initialDistanceApplied)

  const isLadderApplied = appliedLadderCost > 0 && appliedLadderCost === totalLadderCost

  const handleApplyLadderCost = () => {
    if (totalLadderCost <= 0) {
      if (appliedLadderCost > 0) {
        setAdditionalCost((prev: number) => Math.max(0, (Number(prev) || 0) - appliedLadderCost))
        setAppliedLadderCost(0)
        setIsCostEdited(true)
        alert('사다리차 작업이 해제되어 가산 비용에서 사다리차 운임이 제외되었습니다.')
        return
      }
      alert('사다리차 작업이 선택되지 않았거나 층수(2층 이상)가 입력되지 않았습니다.')
      return
    }

    if (appliedLadderCost === totalLadderCost) {
      alert(`이미 사다리차 표준운임 (${totalLadderCost.toLocaleString()}원)이 가산 비용에 반영되어 있습니다. (중복 가산되지 않습니다)`)
      return
    }

    const diff = totalLadderCost - appliedLadderCost
    setAdditionalCost((prev: number) => Math.max(0, (Number(prev) || 0) + diff))
    setAppliedLadderCost(totalLadderCost)
    setIsCostEdited(true)

    const detailMsg = [
      isFromLadder && fromLadderCalc.cost > 0 ? `출발지(${fromFloor}층): ${fromLadderCalc.cost.toLocaleString()}원` : null,
      isToLadder && toLadderCalc.cost > 0 ? `도착지(${toFloor}층): ${toLadderCalc.cost.toLocaleString()}원` : null,
    ].filter(Boolean).join(' + ')

    if (appliedLadderCost > 0) {
      alert(`사다리차 표준 운임이 변경되어 가산 비용에 갱신되었습니다!\n(기존: ${appliedLadderCost.toLocaleString()}원 → 변경: ${totalLadderCost.toLocaleString()}원 / 차액: ${diff > 0 ? '+' : ''}${diff.toLocaleString()}원)`)
    } else {
      alert(`사다리차 표준 운임 (${detailMsg} = 총 ${totalLadderCost.toLocaleString()}원)이 가산 비용에 반영되었습니다!`)
    }
  }

  const [items, setItems] = useState<any[]>(() => parseAndFilterCbmItems(initialData?.cbmItems))
  const [standardItems, setStandardItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [activeCategoryIds, setActiveCategoryIds] = useState<string[]>([])
  
  const [vehicles, setVehicles] = useState<any[]>(envObj.vehicles || [])
  const [standardVehicles, setStandardVehicles] = useState<any[]>([])

  // 이삿날 배차 호차 및 담당 팀장 상태
  const [dispatchInfo, setDispatchInfo] = useState<any>(() => ({
    assignedVehicles: Array.isArray(envObj.dispatch?.assignedVehicles) ? envObj.dispatch.assignedVehicles : [],
    teamLeader: envObj.dispatch?.teamLeader || '',
    leaderPhone: envObj.dispatch?.leaderPhone || '',
    dispatchStatus: envObj.dispatch?.dispatchStatus || 'UNASSIGNED',
    dispatchMemo: envObj.dispatch?.dispatchMemo || ''
  }))

  const [labors, setLabors] = useState<any[]>(envObj.labors || [])
  const [standardLabors, setStandardLabors] = useState<any[]>([])

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [selectedItemNames, setSelectedItemNames] = useState<Record<string, string>>({})

  // 차량 톤수별 거리 초과 운임 계산 설정 (기본 20/25km, 근거리 26~100km, 장거리 101km~, 초장거리 250km+)
  const initialDistanceTierKey = resolveTonnageTierKey(envObj.vehicles || [], 0)
  const initialDistanceSpec = TONNAGE_DISTANCE_FARE_TABLE[initialDistanceTierKey]
  const [distanceTierKey, setDistanceTierKey] = useState<TonnageTierKey>(
    (envObj.distanceTierKey as TonnageTierKey) || initialDistanceTierKey
  )
  const [baseDistanceKm, setBaseDistanceKm] = useState<number>(
    envObj.baseDistanceKm !== undefined ? Number(envObj.baseDistanceKm) : initialDistanceSpec.baseDistanceKm
  )
  const [ratePerKm, setRatePerKm] = useState<number>(
    envObj.ratePerKm !== undefined ? Number(envObj.ratePerKm) : initialDistanceSpec.shortExtraRate
  )
  const [longRatePerKm, setLongRatePerKm] = useState<number>(
    envObj.longRatePerKm !== undefined ? Number(envObj.longRatePerKm) : initialDistanceSpec.longExtraRate
  )
  const [applyUltraLong, setApplyUltraLong] = useState<boolean>(
    envObj.applyUltraLong !== undefined ? Boolean(envObj.applyUltraLong) : true
  )
  const [customUltraLongFee, setCustomUltraLongFee] = useState<number>(
    envObj.customUltraLongFee !== undefined ? Number(envObj.customUltraLongFee) : initialDistanceSpec.ultraLongSurcharge
  )

  // 경유 품목 자동 감지
  const waypointCount = useMemo(
    () => items.filter((i: any) => i.treatment === '경유' && Number(i.quantity) > 0).length,
    [items]
  )
  const [includeWaypointInDistance, setIncludeWaypointInDistance] = useState<boolean>(
    envObj.includeWaypointInDistance !== undefined ? Boolean(envObj.includeWaypointInDistance) : false
  )
  const [waypointFeeAmount, setWaypointFeeAmount] = useState<number>(
    envObj.waypointFeeAmount !== undefined ? Number(envObj.waypointFeeAmount) : 70000
  )

  useEffect(() => {
    if (waypointCount > 0) {
      setIncludeWaypointInDistance(true)
    }
  }, [waypointCount])

  const handleSelectDistanceTier = (key: TonnageTierKey) => {
    setDistanceTierKey(key)
    const spec = TONNAGE_DISTANCE_FARE_TABLE[key]
    setBaseDistanceKm(spec.baseDistanceKm)
    setRatePerKm(spec.shortExtraRate)
    setLongRatePerKm(spec.longExtraRate)
    setCustomUltraLongFee(spec.ultraLongSurcharge)
  }

  // 투입 차량이 변경되면 해당 차량 톤수 규격의 표준 거리 단가로 자동 연동
  useEffect(() => {
    if (vehicles && vehicles.length > 0) {
      const detectedKey = resolveTonnageTierKey(vehicles, 0)
      if (detectedKey !== distanceTierKey) {
        handleSelectDistanceTier(detectedKey)
      }
    }
  }, [vehicles])

  const [tollFare, setTollFare] = useState<number>(Number(envObj.tollFare) || 0)
  const [roundTollFare, setRoundTollFare] = useState<number>(
    envObj.roundTollFare !== undefined 
      ? Number(envObj.roundTollFare) 
      : (Number(envObj.tollFare) ? Number(envObj.tollFare) * 2 : 0)
  )

  const handleRoundTollFareChange = (val: number) => {
    setRoundTollFare(val)
    setTollFare(Math.round(val / 2))
  }

  // 특기사항 (내용이 없으면 조회/출력 시 숨김)
  const [specialNotes, setSpecialNotes] = useState<string>(envObj.specialNotes || '')

  // 주행거리 자동/수동 계산 함수
  const handleCalculateDistance = async (fromVal?: string, toVal?: string) => {
    const from = (fromVal !== undefined ? fromVal : fromAddress).trim()
    const to = (toVal !== undefined ? toVal : toAddress).trim()
    if (!from || !to) {
      setDistanceCalcError('출발지와 도착지 주소를 모두 입력해주세요.')
      return
    }
    setIsCalculatingDistance(true)
    setDistanceCalcError(null)
    try {
      const res = await getDistance(from, to)
      if (res.success) {
        setDistance(res.distanceKm)
        setDistanceDuration(res.durationText)
        setDistanceDetail(res.summary)
        const fare = res.tollFare !== undefined ? res.tollFare : 0
        // 5톤 화물차(3종 대형화물) 기준 약 1.45배 요금 보정 (1톤 제외)
        const isHeavyTruck = distanceTierKey !== '1'
        const adjustedOneWay = fare > 0 && isHeavyTruck ? adjustTollForHeavyTruck(fare, true) : fare
        setTollFare(adjustedOneWay)
        setRoundTollFare(adjustedOneWay * 2)
        const tollText = adjustedOneWay > 0 
          ? ` | 대당 왕복 톨비${isHeavyTruck ? '(3종화물 1.45배)' : ''}: ${(adjustedOneWay * 2).toLocaleString()}원 (편도 ${adjustedOneWay.toLocaleString()}원)` 
          : ' | 통행료 없음 (0원)'
        setDistanceNotice(`거리 계산 완료: ${res.distanceKm}km (${res.durationText})${tollText}`)
        setTimeout(() => setDistanceNotice(null), 5000)
      } else {
        setDistanceCalcError(res.error || '거리 계산에 실패했습니다. 거리를 직접 입력해주세요.')
      }
    } catch {
      setDistanceCalcError('거리 계산 중 오류가 발생했습니다.')
    } finally {
      setIsCalculatingDistance(false)
    }
  }

  const handleComplete = (data: any) => {
    const fullAddress = data.address
    if (postcodeTarget === 'from') {
      setFromAddress(fullAddress)
      if (toAddress) {
        handleCalculateDistance(fullAddress, toAddress)
      }
    } else {
      setToAddress(fullAddress)
      if (fromAddress) {
        handleCalculateDistance(fromAddress, fullAddress)
      }
    }
    setPostcodeOpen(false)
  }

  // 차량 톤수별 2단 체감 구간 + 250km 초장거리 + 경유 수고비 통합 산출
  const distanceFareResult = useMemo(() => {
    return calculateTonnageDistanceFare({
      tierKey: distanceTierKey,
      distanceKm: distance,
      customBaseDistanceKm: baseDistanceKm,
      customShortRate: ratePerKm,
      customLongRate: longRatePerKm,
      includeUltraLongSurcharge: applyUltraLong,
      customUltraLongSurcharge: customUltraLongFee,
      includeTollWhenOver30Km: false,
      includeWaypointFee: includeWaypointInDistance,
      waypointCount,
      customWaypointFee: waypointFeeAmount,
    })
  }, [
    distanceTierKey,
    distance,
    baseDistanceKm,
    ratePerKm,
    longRatePerKm,
    applyUltraLong,
    customUltraLongFee,
    includeWaypointInDistance,
    waypointCount,
    waypointFeeAmount,
  ])

  const extraDistanceKm = distanceFareResult.extraDistanceKm
  const calculatedExtraCost = distanceFareResult.totalExtraCost

  const isDistanceApplied = appliedDistanceCost > 0 && appliedDistanceCost === calculatedExtraCost

  const handleApplyDistanceCost = () => {
    if (calculatedExtraCost <= 0) {
      if (appliedDistanceCost > 0) {
        setAdditionalCost((prev: number) => Math.max(0, (Number(prev) || 0) - appliedDistanceCost))
        setAppliedDistanceCost(0)
        setIsCostEdited(true)
        alert('거리 초과 운임이 없으므로 가산 비용에서 이전 거리운임이 제외되었습니다.')
        return
      }
      alert(`기본 거리(${baseDistanceKm}km) 이하이며 추가 경유 수고비가 없으므로 추가 운임이 없습니다.`)
      return
    }

    if (appliedDistanceCost === calculatedExtraCost) {
      alert(`이미 거리 가산 운임 (${calculatedExtraCost.toLocaleString()}원)이 가산 비용에 반영되어 있습니다. (중복 가산되지 않습니다)`)
      return
    }

    const diff = calculatedExtraCost - appliedDistanceCost
    setAdditionalCost((prev: number) => Math.max(0, (Number(prev) || 0) + diff))
    setAppliedDistanceCost(calculatedExtraCost)
    setIsCostEdited(true)

    const breakdownParts: string[] = []
    if (distanceFareResult.shortExtraKm > 0) {
      breakdownParts.push(`근거리(${distanceFareResult.shortExtraKm}km×${ratePerKm.toLocaleString()}원=${distanceFareResult.shortExtraCost.toLocaleString()}원)`)
    }
    if (distanceFareResult.longExtraKm > 0) {
      breakdownParts.push(`장거리(${distanceFareResult.longExtraKm}km×${longRatePerKm.toLocaleString()}원=${distanceFareResult.longExtraCost.toLocaleString()}원)`)
    }
    if (distanceFareResult.ultraLongSurcharge > 0) {
      breakdownParts.push(`250km+초장거리(${distanceFareResult.ultraLongSurcharge.toLocaleString()}원)`)
    }
    if (distanceFareResult.waypointFee > 0) {
      breakdownParts.push(`경유수고비(${distanceFareResult.waypointFee.toLocaleString()}원)`)
    }

    if (appliedDistanceCost > 0) {
      alert(`거리 가산 운임이 변경되어 가산 비용에 갱신되었습니다!\n(기존: ${appliedDistanceCost.toLocaleString()}원 → 변경: ${calculatedExtraCost.toLocaleString()}원 / 차액: ${diff > 0 ? '+' : ''}${diff.toLocaleString()}원)`)
    } else {
      alert(`거리 가산 운임(${breakdownParts.join(' + ')} = 총 ${calculatedExtraCost.toLocaleString()}원)이 가산 비용에 반영되었습니다!`)
    }
  }

  const totalExtraCost = totalLadderCost + calculatedExtraCost
  const isAllApplied = (totalLadderCost > 0 ? isLadderApplied : true) && 
                       (calculatedExtraCost > 0 ? isDistanceApplied : true) && 
                       totalExtraCost > 0

  const handleApplyAllAdditionalCosts = () => {
    const totalExtra = totalLadderCost + calculatedExtraCost
    if (totalExtra <= 0) {
      alert('반영할 사다리차 운임이나 거리 초과 운임이 없습니다.')
      return
    }

    if (appliedLadderCost === totalLadderCost && appliedDistanceCost === calculatedExtraCost) {
      alert(`이미 사다리차 운임(${totalLadderCost.toLocaleString()}원) 및 거리가산운임(${calculatedExtraCost.toLocaleString()}원)이 가산 비용에 모두 반영되어 있습니다. (중복 가산되지 않습니다)`)
      return
    }

    const ladderDiff = totalLadderCost - appliedLadderCost
    const distanceDiff = calculatedExtraCost - appliedDistanceCost
    const totalDiff = ladderDiff + distanceDiff

    setAdditionalCost((prev: number) => Math.max(0, (Number(prev) || 0) + totalDiff))
    setAppliedLadderCost(totalLadderCost)
    setAppliedDistanceCost(calculatedExtraCost)
    setIsCostEdited(true)

    alert(`사다리차 운임(${totalLadderCost.toLocaleString()}원)과 거리가산운임(${calculatedExtraCost.toLocaleString()}원) 총 ${totalExtra.toLocaleString()}원이 가산 비용에 일괄 반영되었습니다!`)
  }

  // 전체 공간 목록 (기타/미지정 포함)
  const allCategoriesWithUnassigned = useMemo(() => {
    return [...categories, { id: '', name: '기타/미지정' }]
  }, [categories])

  // 화면에 노출될 활성화된 공간 목록 (활성 ID에 포함되었거나 실제 수량 > 0인 짐이 있는 공간)
  const displayedCategories = useMemo(() => {
    const list = allCategoriesWithUnassigned.filter((cat: any) => {
      if (activeCategoryIds.includes(cat.id)) return true
      const hasQty = items.some(i => (i.locationId || '') === cat.id && Number(i.quantity) > 0)
      if (hasQty) return true
      // 기타/미지정인데 짐(수량 > 0 또는 품목명 존재)이 있는 경우
      if (cat.id === '' && items.some(i => (i.locationId || '') === '' && (Number(i.quantity) > 0 || i.name))) {
        return true
      }
      return false
    })

    if (list.length > 0) return list

    // 활성 공간이 아직 없으면 '안방' (또는 첫 번째 공간)을 기본으로 노출
    const defaultCat = categories.find((c: any) => c.name === '안방') || categories[0]
    return defaultCat ? [defaultCat] : [{ id: '', name: '안방' }]
  }, [allCategoriesWithUnassigned, activeCategoryIds, items, categories])

  // 아직 화면에 추가되지 않은 나머지 공간 목록
  const availableCategoriesToAdd = useMemo(() => {
    const displayedIdSet = new Set(displayedCategories.map((c: any) => c.id))
    return allCategoriesWithUnassigned.filter((c: any) => !displayedIdSet.has(c.id))
  }, [allCategoriesWithUnassigned, displayedCategories])

  // 공간 추가 핸들러
  const handleAddCategory = (catId: string) => {
    const targetCat = allCategoriesWithUnassigned.find((c: any) => c.id === catId)
    if (!targetCat) return

    setActiveCategoryIds(prev => Array.from(new Set([...prev, catId])))

    // 해당 공간의 표준 물품들을 items에 추가 (수량 0)
    const catStandardItems = standardItems
      .filter((item: any) => catId ? item.locations?.some((l: any) => l.id === catId) : (!item.locations || item.locations.length === 0))
      .sort((a: any, b: any) => {
        const aBox = isBoxItem(a.name)
        const bBox = isBoxItem(b.name)
        if (aBox && !bBox) return -1
        if (!aBox && bBox) return 1
        return (a.name || '').localeCompare(b.name || '', 'ko')
      })

    setItems(prevItems => {
      const nextItems = [...prevItems]
      const existingNames = new Set(prevItems.filter(i => (i.locationId || '') === catId).map(i => i.name))

      catStandardItems.forEach((sItem: any) => {
        if (!existingNames.has(sItem.name)) {
          existingNames.add(sItem.name)
          nextItems.push(ensureItemUid({
            locationId: catId,
            locationName: targetCat.name,
            name: sItem.name,
            spec: '',
            quantity: 0,
            treatment: '이동',
            cbm: 0,
            innerBoxCbm: 0
          }))
        }
      })
      return nextItems
    })

    setExpandedCategories(prev => ({ ...prev, [catId]: true }))
  }

  // 공간 삭제 핸들러
  const handleRemoveCategory = (catId: string) => {
    const targetCat = allCategoriesWithUnassigned.find((c: any) => c.id === catId)
    const catItemsWithQty = items.filter(i => (i.locationId || '') === catId && Number(i.quantity) > 0)

    if (catItemsWithQty.length > 0) {
      if (!confirm(`[${targetCat?.name || '해당 공간'}]에 등록된 물품(${catItemsWithQty.length}개)이 모두 삭제됩니다. 정말 삭제하시겠습니까?`)) {
        return
      }
    }

    setItems(prev => prev.filter(i => (i.locationId || '') !== catId))
    setActiveCategoryIds(prev => prev.filter(id => id !== catId))
  }

  const [isCbmCalculatorOpen, setIsCbmCalculatorOpen] = useState(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false)
  const [cbmInputMode, setCbmInputMode] = useState<'touch' | 'table'>('touch')

  // 테이블 모드 필터 및 품목 빠른 추가 모달 상태
  const [tableMidCat, setTableMidCat] = useState<ItemMidCategory>('all')
  const [tableChosung, setTableChosung] = useState<ChosungFilter>('전체')
  const [tableSearch, setTableSearch] = useState('')
  const [quickAddModalCat, setQuickAddModalCat] = useState<{ id: string; name: string } | null>(null)

  const handleAddStandardItemToCategory = (catId: string, catName: string, stdItem: any) => {
    if (!stdItem) return
    setItems(prev => {
      const exactIdx = prev.findIndex(
        it =>
          (it.locationId || '') === catId &&
          it.name === stdItem.name &&
          (it.spec || '') === (stdItem.spec || '')
      )
      if (exactIdx >= 0) {
        const next = [...prev]
        const cur = next[exactIdx]
        next[exactIdx] = {
          ...cur,
          spec: stdItem.spec || cur.spec || '',
          cbm: stdItem.defaultCbm ?? cur.cbm,
          innerBoxCbm: stdItem.defaultInnerCbm ?? cur.innerBoxCbm ?? 0,
          quantity: (Number(cur.quantity) || 0) + 1,
        }
        return next
      }

      const emptyIdx = prev.findIndex(
        it =>
          (it.locationId || '') === catId &&
          it.name === stdItem.name &&
          (Number(it.quantity) || 0) === 0
      )
      if (emptyIdx >= 0) {
        const next = [...prev]
        const cur = next[emptyIdx]
        next[emptyIdx] = {
          ...cur,
          spec: stdItem.spec || '',
          cbm: stdItem.defaultCbm ?? 0,
          innerBoxCbm: stdItem.defaultInnerCbm ?? 0,
          quantity: 1,
        }
        return next
      }

      return [
        ...prev,
        ensureItemUid({
          locationId: catId,
          locationName: catName,
          name: stdItem.name,
          spec: stdItem.spec || '',
          quantity: 1,
          cbm: stdItem.defaultCbm ?? 0.5,
          innerBoxCbm: stdItem.defaultInnerCbm ?? 0,
          treatment: '이동',
        }),
      ]
    })
  }

  // 백그라운드 AI 분석 태스크 상태
  interface BackgroundAiTask {
    id: string
    location: string
    status: 'analyzing' | 'done' | 'error'
    items?: AiIdentifiedItem[]
    error?: string
  }
  const [backgroundAiTasks, setBackgroundAiTasks] = useState<BackgroundAiTask[]>([])

  const handleStartBackgroundAnalysis = ({ location, promise }: { location: string; promise: Promise<any> }) => {
    const taskId = `bg_${Date.now()}`
    setBackgroundAiTasks(prev => [...prev, { id: taskId, location, status: 'analyzing' }])

    promise
      .then(res => {
        setBackgroundAiTasks(prev =>
          prev.map(t => (t.id === taskId ? { ...t, status: 'done', items: res.items } : t))
        )
      })
      .catch(err => {
        setBackgroundAiTasks(prev =>
          prev.map(t => (t.id === taskId ? { ...t, status: 'error', error: err?.message || '분석 실패' } : t))
        )
      })
  }

  const handleApplyPreset = (presetItems: PresetItem[], mode: 'replace' | 'append') => {
    if (!presetItems || presetItems.length === 0) return

    setItems(prevItems => {
      let nextList = mode === 'replace' ? [] : [...prevItems]

      presetItems.forEach(pItem => {
        const locCat = categories.find(c => c.name === pItem.locationName)
        const locId = locCat ? locCat.id : ''
        const locName = locCat ? locCat.name : pItem.locationName

        // standardItems에서 해당 품목/규격의 최신 실측치(defaultCbm, defaultInnerCbm) 조회 (DB 실측치 우선 적용)
        const stdMatch = standardItems.find(
          s => s.name === pItem.name && (pItem.spec ? (s.spec || '기본') === pItem.spec : true)
        )
        const finalCbm = stdMatch
          ? stdMatch.defaultCbm
          : (pItem.cbm !== undefined ? pItem.cbm : 0)
        const finalInnerCbm = stdMatch
          ? (stdMatch.defaultInnerCbm || 0)
          : (pItem.innerBoxCbm !== undefined ? pItem.innerBoxCbm : 0)

        const existingIdx = nextList.findIndex(
          it => (it.locationId || '') === locId &&
                it.name === pItem.name &&
                (it.spec || '') === (pItem.spec || '')
        )

        if (existingIdx >= 0) {
          const cur = nextList[existingIdx]
          const currentQty = Number(cur.quantity) || 0
          const newQty = mode === 'replace' ? pItem.quantity : currentQty + pItem.quantity
          nextList[existingIdx] = {
            ...cur,
            quantity: newQty,
            cbm: finalCbm,
            innerBoxCbm: finalInnerCbm,
            treatment: pItem.treatment || cur.treatment || '이동'
          }
        } else {
          nextList.push(ensureItemUid({
            locationId: locId,
            locationName: locName,
            name: pItem.name,
            spec: pItem.spec || '',
            quantity: pItem.quantity,
            cbm: finalCbm,
            innerBoxCbm: finalInnerCbm,
            treatment: pItem.treatment || '이동'
          }))
        }
      })

      return nextList.map(ensureItemUid)
    })

    // 템플릿에 짐이 있는 공간들을 활성 공간 목록으로 설정 (짐이 없는 빈 공간은 화면에서 숨김)
    const presetLocIds = Array.from(new Set(
      presetItems
        .filter(p => Number(p.quantity) > 0)
        .map(p => {
          const locCat = categories.find(c => c.name === p.locationName)
          return locCat ? locCat.id : ''
        })
    )) as string[]

    if (mode === 'replace') {
      setActiveCategoryIds(presetLocIds)
    } else {
      setActiveCategoryIds(prev => Array.from(new Set([...prev, ...presetLocIds])))
    }

    setExpandedCategories({})
  }

  const [cbmLength, setCbmLength] = useState<number | ''>('')
  const [cbmWidth, setCbmWidth] = useState<number | ''>('')
  const [cbmHeight, setCbmHeight] = useState<number | ''>('')

  const [deadSpaceRatio, setDeadSpaceRatio] = useState(20)
  const totalCbm = items.reduce((acc, item) => acc + getItemEffectiveCbm(item), 0)
  const requiredCbm = totalCbm * (1 + deadSpaceRatio / 100)

  const handleApplyAiItems = (aiItems: AiIdentifiedItem[], mode: 'append' | 'replace') => {
    if (!aiItems || aiItems.length === 0) return

    const locationMap = new Map<string, string>()
    categories.forEach(c => locationMap.set(c.name, c.id))

    setItems(prevItems => {
      let nextList = mode === 'replace' ? [] : [...prevItems]

      aiItems.forEach(aiItem => {
        const locCat = categories.find(c => c.name === aiItem.location)
        const locId = locCat ? locCat.id : ''
        const locName = locCat ? locCat.name : (aiItem.location && aiItem.location !== '기타/미지정' ? aiItem.location : '기타/미지정')

        const existingIdx = nextList.findIndex(
          it => (it.locationId || '') === locId &&
                it.name === aiItem.name &&
                (it.spec || '') === (aiItem.spec || '')
        )

        if (existingIdx >= 0) {
          const cur = nextList[existingIdx]
          const currentQty = Number(cur.quantity) || 0
          const newQty = mode === 'replace' ? aiItem.quantity : (currentQty > 0 ? currentQty + aiItem.quantity : aiItem.quantity)
          nextList[existingIdx] = {
            ...cur,
            locationId: locId,
            locationName: locName,
            quantity: newQty,
            cbm: aiItem.cbm,
            innerBoxCbm: aiItem.innerBoxCbm,
            treatment: aiItem.treatment || cur.treatment || '이동'
          }
        } else {
          nextList.push(ensureItemUid({
            locationId: locId,
            locationName: locName,
            name: aiItem.name,
            spec: aiItem.spec || '',
            quantity: aiItem.quantity,
            cbm: aiItem.cbm,
            innerBoxCbm: aiItem.innerBoxCbm,
            treatment: aiItem.treatment || '이동'
          }))
        }
      })

      return nextList.map(ensureItemUid)
    })

    const touchedLocIds = aiItems.map(item => {
      const c = categories.find(cat => cat.name === item.location)
      return c ? c.id : ''
    })
    setActiveCategoryIds(prev => Array.from(new Set([...prev, ...touchedLocIds])))
    setExpandedCategories(prev => {
      const updated = { ...prev }
      touchedLocIds.forEach(id => {
        updated[id] = true
      })
      return updated
    })

    alert(`AI가 분석한 ${aiItems.length}개 품목이 견적서에 성공적으로 반영되었습니다!`)
  }

  const handleRecommendVehicles = () => {
    // 5톤, 2.5톤, 1톤 3종 차량을 우선 조합 대상으로 필터링
    let valid = standardVehicles.filter(v => 
      (v.name.includes('5톤') || v.name.includes('2.5톤') || v.name.includes('1톤')) && (v.maxCbm || 0) > 0
    )
    if (valid.length === 0) {
      valid = standardVehicles.filter(v => (v.maxCbm || 0) > 0)
    }
    if (valid.length === 0) {
      alert("차량 기초정보에 5톤, 2.5톤, 1톤 차량이 없습니다. 차량정보 관리에서 먼저 설정해주세요.")
      return
    }
    
    const target = Math.ceil(requiredCbm * 100)
    if (target <= 0) {
      setVehicles([])
      return
    }
    
    // DP: Find the combination of vehicles that minimizes total defaultCost while providing at least 'target' capacity
    const maxVehicleCap = Math.max(...valid.map(v => Math.ceil((v.maxCbm || 0) * 100)))
    const maxCapacity = target + maxVehicleCap
    
    // Safety check for extreme edge cases (e.g. requiredCbm > 1000)
    if (maxCapacity > 100000) {
      alert("산출 CBM이 너무 큽니다. 추천 기능을 사용할 수 없습니다.")
      return
    }
    
    const dp = new Array(maxCapacity + 1).fill(Infinity)
    const counts = new Array(maxCapacity + 1).fill(0)
    const choice = new Array(maxCapacity + 1).fill(null)
    
    dp[0] = 0
    
    for (let i = 0; i <= maxCapacity; i++) {
      if (dp[i] === Infinity) continue;
      for (const v of valid) {
        const cap = Math.ceil(v.maxCbm * 100)
        const nextCap = i + cap
        const cost = dp[i] + (v.defaultCost || 0)
        
        if (nextCap <= maxCapacity) {
          if (cost < dp[nextCap]) {
            dp[nextCap] = cost
            counts[nextCap] = counts[i] + 1
            choice[nextCap] = v
          } else if (cost === dp[nextCap] && counts[i] + 1 < counts[nextCap]) {
            // Tie-breaker: prefer fewer vehicles if costs are equal
            counts[nextCap] = counts[i] + 1
            choice[nextCap] = v
          }
        }
      }
    }
    
    // Find the min cost for any capacity >= target
    let bestCap = target
    let minCost = Infinity
    for (let i = target; i <= maxCapacity; i++) {
      if (dp[i] < minCost) {
        minCost = dp[i]
        bestCap = i
      } else if (dp[i] === minCost && counts[i] < counts[bestCap]) {
        bestCap = i
      }
    }
    
    if (minCost === Infinity) {
      alert("추천할 수 있는 차량 조합이 없습니다.")
      return
    }
    
    // Backtrack to find chosen vehicles
    const recommendationMap: Record<string, any> = {}
    let curr = bestCap
    while (curr > 0 && choice[curr]) {
      const v = choice[curr]
      if (!recommendationMap[v.id]) {
        recommendationMap[v.id] = { id: v.id, name: v.name, cost: v.defaultCost, count: 0, maxCbm: v.maxCbm }
      }
      recommendationMap[v.id].count += 1
      curr -= Math.ceil(v.maxCbm * 100)
    }
    
    setVehicles(Object.values(recommendationMap))
  }

  const [laborRecommendationReason, setLaborRecommendationReason] = useState<string>('')

  const handleRecommendLabors = () => {
    if (standardLabors.length === 0) {
      alert("인건비 기초정보에 등록된 인력이 없습니다. 인건비정보 관리에서 먼저 등록해주세요.")
      return
    }

    // 인원 산출 기준: 적재 대상 순수 물품 CBM (totalCbm)
    const cbm = totalCbm
    if (cbm <= 0) {
      setLabors([])
      setLaborRecommendationReason('적재 물품 CBM이 0이므로 작업 인원이 초기화되었습니다.')
      return
    }

    // 1. 기본 인원 산출 (적재 CBM 및 이사종류 기준 표준 매칭)
    const isPacking = movingType === 'P' || (movingType === 'K' && organizeStatus === '정리')
    let baseMale = 0
    let baseFemale = 0

    if (cbm < 6.0) {
      // 1톤 1대 (원룸 / 소형)
      baseMale = 1
      baseFemale = 0
    } else if (cbm < 14.0) {
      // 2.5톤 1대 (투룸 / 신혼)
      baseMale = 2
      baseFemale = isPacking ? 1 : 0
    } else if (cbm < 26.0) {
      // 5톤 1대 (20~28평형 표준 가정)
      baseMale = 3
      baseFemale = isPacking ? 1 : 0
    } else if (cbm < 32.0) {
      // 5톤 1대 + 1톤 1대 (32~34평형)
      baseMale = 4
      baseFemale = isPacking ? 1 : 0
    } else if (cbm < 40.0) {
      // 5톤 1대 + 2.5톤 1대 (34평 짐 많음 / 40평형)
      baseMale = 4
      baseFemale = isPacking ? 1 : 0
    } else if (cbm < 52.0) {
      // 5톤 2대 (40평형 이상 대형)
      baseMale = 5
      baseFemale = isPacking ? 2 : 1
    } else {
      // 5톤 2대 초과 초대형
      baseMale = 5 + Math.ceil((cbm - 52.0) / 15)
      baseFemale = isPacking ? 2 : 1
    }

    // 2. 작업환경(계단, 수작업, 층수 등) 가산 요인
    const hasStairsOrManualFrom = fromWorkTypes.includes('수작업') || fromWorkTypes.includes('계단')
    const hasStairsOrManualTo = toWorkTypes.includes('수작업') || toWorkTypes.includes('계단')
    const fromFloorNum = parseInt((fromFloor || '').replace(/[^0-9]/g, '')) || 0
    const toFloorNum = parseInt((toFloor || '').replace(/[^0-9]/g, '')) || 0

    let extraMale = 0
    const reasons: string[] = []

    if (hasStairsOrManualFrom || hasStairsOrManualTo) {
      extraMale += 1
      if (hasStairsOrManualFrom && hasStairsOrManualTo) {
        reasons.push('출발지·도착지 계단/수작업(+1명)')
      } else if (hasStairsOrManualFrom) {
        reasons.push('출발지 계단/수작업(+1명)')
      } else {
        reasons.push('도착지 계단/수작업(+1명)')
      }

      // 3층 이상 고층 계단/수작업이며 CBM이 18 이상인 경우 추가 인력
      if ((hasStairsOrManualFrom && fromFloorNum >= 3) || (hasStairsOrManualTo && toFloorNum >= 3)) {
        if (cbm >= 18) {
          extraMale += 1
          reasons.push('3층 이상 고층 계단/수작업 추가(+1명)')
        }
      }
    }

    // 사다리차 없이 엘리베이터로만 진행하는 대형 이사(35 CBM 이상) 동선 가산
    const isNoLadderAndElevator = (!fromWorkTypes.includes('사다리차') && fromWorkTypes.includes('엘리베이터')) || (!toWorkTypes.includes('사다리차') && toWorkTypes.includes('엘리베이터'))
    if (isNoLadderAndElevator && cbm >= 35 && extraMale === 0) {
      extraMale += 1
      reasons.push('사다리차 미사용 엘리베이터 동선 고려(+1명)')
    }

    const totalMale = baseMale + extraMale
    const totalFemale = baseFemale

    // standardLabors 매핑 (남성/여성 명칭 매칭 또는 순차 매칭)
    const maleLabor = standardLabors.find(l => l.name.includes('남')) || standardLabors[0]
    const femaleLabor = standardLabors.find(l => l.name.includes('여') || l.name.includes('주방')) || standardLabors.find(l => l.id !== maleLabor?.id)

    const recommended: any[] = []

    if (maleLabor && femaleLabor && maleLabor.id !== femaleLabor.id) {
      if (totalMale > 0) {
        recommended.push({
          id: maleLabor.id,
          name: maleLabor.name,
          cost: maleLabor.defaultCost,
          count: totalMale
        })
      }
      if (totalFemale > 0) {
        recommended.push({
          id: femaleLabor.id,
          name: femaleLabor.name,
          cost: femaleLabor.defaultCost,
          count: totalFemale
        })
      }
    } else {
      const singleLabor = maleLabor || standardLabors[0]
      const totalCount = totalMale + totalFemale
      if (singleLabor && totalCount > 0) {
        recommended.push({
          id: singleLabor.id,
          name: singleLabor.name,
          cost: singleLabor.defaultCost,
          count: totalCount
        })
      }
    }

    setLabors(recommended)

    const moveTypeName = movingType === 'P' ? '포장이사' : movingType === 'G' ? '일반이사' : '보관이사'
    let reasonText = `${moveTypeName} 적재 물량 ${cbm.toFixed(1)} CBM 기준 기본 남성 ${baseMale}명${baseFemale > 0 ? `, 여성 ${baseFemale}명` : ''}`
    if (reasons.length > 0) {
      reasonText += ` (환경 가산: ${reasons.join(', ')})`
    }
    reasonText += ` → 총 ${totalMale + totalFemale}명(남 ${totalMale}, 여 ${totalFemale}) 추천 완료`
    setLaborRecommendationReason(reasonText)
  }

  const sigCanvas = useRef<any>(null)
  const [signature, setSignature] = useState(initialData?.signature || '')
  const [isSigning, setIsSigning] = useState(!initialData?.signature)

  // 1. 컴포넌트 마운트 시 localStorage에서 작성 중이던 draft 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const draft = JSON.parse(saved)
        
        // 수정 모드인 경우: 서버 데이터가 드래프트보다 최신이거나 같으면 오래된 드래프트 삭제 후 서버 원본 사용
        if (initialData?.id && initialData?.updatedAt && draft?.savedAt) {
          const serverUpdatedTime = new Date(initialData.updatedAt).getTime()
          const draftSavedTime = new Date(draft.savedAt).getTime()
          if (serverUpdatedTime >= draftSavedTime) {
            localStorage.removeItem(storageKey)
            return
          }
        }

        const hasContent = Boolean(
          draft && (
            draft.customerName ||
            draft.contact ||
            draft.fromAddress ||
            draft.toAddress ||
            draft.movingCost > 0 ||
            draft.additionalCost > 0 ||
            (draft.items && draft.items.some((i: any) => (i.quantity || 0) > 0))
          )
        )

        if (hasContent) {
          if (draft.customerName !== undefined) setCustomerName(draft.customerName)
          if (draft.contact !== undefined) setContact(draft.contact)
          if (draft.movingType !== undefined) setMovingType(draft.movingType)
          if (draft.estimateDate) setEstimateDate(new Date(draft.estimateDate))
          if (draft.visitDate) setVisitDate(new Date(draft.visitDate))
          if (draft.movingDate) setMovingDate(new Date(draft.movingDate))
          if (draft.organizeDate) setOrganizeDate(new Date(draft.organizeDate))
          if (draft.organizeStatus !== undefined) setOrganizeStatus(draft.organizeStatus)

          if (draft.fromAddress !== undefined) setFromAddress(draft.fromAddress)
          if (draft.toAddress !== undefined) setToAddress(draft.toAddress)
          
          // 층수 및 작업조건: draft에 유효값이 있으면 우선 적용, 없으면 서버 DB값 유지
          if (draft.fromFloor !== undefined && draft.fromFloor !== '') setFromFloor(draft.fromFloor)
          else if (envObj.fromFloor) setFromFloor(envObj.fromFloor)

          if (Array.isArray(draft.fromWorkTypes) && draft.fromWorkTypes.length > 0) setFromWorkTypes(draft.fromWorkTypes)
          else if (Array.isArray(envObj.fromWorkTypes) && envObj.fromWorkTypes.length > 0) setFromWorkTypes(envObj.fromWorkTypes)

          if (draft.toFloor !== undefined && draft.toFloor !== '') setToFloor(draft.toFloor)
          else if (envObj.toFloor) setToFloor(envObj.toFloor)

          if (Array.isArray(draft.toWorkTypes) && draft.toWorkTypes.length > 0) setToWorkTypes(draft.toWorkTypes)
          else if (Array.isArray(envObj.toWorkTypes) && envObj.toWorkTypes.length > 0) setToWorkTypes(envObj.toWorkTypes)

          // 거리 정보
          if (Number(draft.distance) > 0) setDistance(Number(draft.distance))
          else if (Number(envObj.distance) > 0) setDistance(Number(envObj.distance))

          if (draft.distanceDuration) setDistanceDuration(draft.distanceDuration)
          else if (envObj.distanceDuration) setDistanceDuration(envObj.distanceDuration)

          if (draft.distanceDetail) setDistanceDetail(draft.distanceDetail)
          else if (envObj.distanceDetail) setDistanceDetail(envObj.distanceDetail)

          if (draft.baseDistanceKm !== undefined) setBaseDistanceKm(draft.baseDistanceKm)
          if (draft.ratePerKm !== undefined) setRatePerKm(draft.ratePerKm)
          if (draft.tollFare !== undefined) setTollFare(draft.tollFare)
          else if (envObj.tollFare !== undefined) setTollFare(Number(envObj.tollFare))
          if (draft.roundTollFare !== undefined) setRoundTollFare(draft.roundTollFare)
          else if (envObj.roundTollFare !== undefined) setRoundTollFare(Number(envObj.roundTollFare))
          else if (draft.tollFare) setRoundTollFare(draft.tollFare * 2)
          if (typeof draft.specialNotes === 'string') setSpecialNotes(draft.specialNotes)
          
          if (draft.ladderTonnage) setLadderTonnage(draft.ladderTonnage)
          else if (envObj.ladderTonnage) setLadderTonnage(envObj.ladderTonnage)

          if (draft.appliedLadderCost !== undefined) setAppliedLadderCost(draft.appliedLadderCost)
          if (draft.appliedDistanceCost !== undefined) setAppliedDistanceCost(draft.appliedDistanceCost)

          // 차량 및 인력: draft에 1개 이상 있으면 사용, 빈 배열이면 서버 DB값 유지
          if (Array.isArray(draft.vehicles) && draft.vehicles.length > 0) setVehicles(draft.vehicles)
          else if (Array.isArray(envObj.vehicles) && envObj.vehicles.length > 0) setVehicles(envObj.vehicles)

          if (Array.isArray(draft.labors) && draft.labors.length > 0) setLabors(draft.labors)
          else if (Array.isArray(envObj.labors) && envObj.labors.length > 0) setLabors(envObj.labors)

          if (draft.items && draft.items.length > 0) {
            setItems(draft.items.map((i: any) => ensureItemUid({ ...i, treatment: i.treatment || '이동' })))
          }
          if (draft.deadSpaceRatio !== undefined) setDeadSpaceRatio(draft.deadSpaceRatio)

          if (draft.movingCost !== undefined) setMovingCost(draft.movingCost)
          if (draft.additionalCost !== undefined) setAdditionalCost(draft.additionalCost)
          if (draft.storageCost !== undefined) setStorageCost(draft.storageCost)
          if (draft.vat !== undefined) setVat(draft.vat)
          if (draft.paymentTarget !== undefined) setPaymentTarget(draft.paymentTarget)

          if (draft.downPayment !== undefined) setDownPayment(draft.downPayment)
          if (draft.downPaymentDate) setDownPaymentDate(new Date(draft.downPaymentDate))
          if (draft.downPaymentPaid !== undefined) setDownPaymentPaid(draft.downPaymentPaid)

          if (draft.intermediatePayment !== undefined) setIntermediatePayment(draft.intermediatePayment)
          if (draft.intermediateDate) setIntermediateDate(new Date(draft.intermediateDate))
          if (draft.intermediatePaymentPaid !== undefined) setIntermediatePaymentPaid(draft.intermediatePaymentPaid)

          if (draft.balance !== undefined) setBalance(draft.balance)
          if (draft.balanceDate) setBalanceDate(new Date(draft.balanceDate))
          if (draft.balancePaid !== undefined) setBalancePaid(draft.balancePaid)

          if (draft.isCostEdited !== undefined) setIsCostEdited(draft.isCostEdited)
          if (draft.signature !== undefined) setSignature(draft.signature)

          if (draft.savedAt) {
            setDraftRestoredTime(format(new Date(draft.savedAt), 'yyyy-MM-dd HH:mm:ss'))
          } else {
            setDraftRestoredTime('이전 작업 내용')
          }
        }
      }
    } catch (e) {
      console.error('Draft restore error:', e)
    } finally {
      setTimeout(() => {
        isDraftLoadedRef.current = true
      }, 600)
    }
  }, [storageKey])

  useEffect(() => {
    Promise.all([
      getStandardItems(),
      getVehicles(),
      getLabors(),
      getLocationCategories(),
      getCostStandards()
    ]).then(([itemsRes, vehiclesRes, laborsRes, catsRes, costStandardsRes]) => {
      const sortedStandardItems = [...itemsRes].sort((a: any, b: any) => {
        const nameComp = (a.name || '').localeCompare(b.name || '', 'ko')
        if (nameComp !== 0) return nameComp
        return (a.spec || '').localeCompare(b.spec || '', 'ko')
      })
      setStandardItems(sortedStandardItems)
      setStandardVehicles(vehiclesRes)
      setStandardLabors(laborsRes)
      setCategories(catsRes)
      if (costStandardsRes) {
        setCostStandardsData(costStandardsRes)
      }

      const defaultCat = catsRes.find((c: any) => c.name === '안방') || catsRes[0]

      if (!initialData?.cbmItems) {
        const initialItems: any[] = []
        const grouped: Record<string, boolean> = {}

        // 기본 활성 공간(안방)의 표준 물품들만 초기 목록으로 세팅 (수량 0)
        if (defaultCat) {
          const catStandardItems = sortedStandardItems
            .filter((item: any) => item.locations && item.locations.some((l: any) => l.id === defaultCat.id))
            .sort((a: any, b: any) => {
              const aBox = isBoxItem(a.name)
              const bBox = isBoxItem(b.name)
              if (aBox && !bBox) return -1
              if (!aBox && bBox) return 1
              const nameComp = (a.name || '').localeCompare(b.name || '', 'ko')
              if (nameComp !== 0) return nameComp
              return (a.spec || '').localeCompare(b.spec || '', 'ko')
            })

          catStandardItems.forEach((item: any) => {
            const key = `${defaultCat.id}_${item.name}`
            if (!grouped[key]) {
              grouped[key] = true
              initialItems.push(ensureItemUid({
                locationId: defaultCat.id,
                locationName: defaultCat.name,
                name: item.name,
                spec: '',
                quantity: 0,
                treatment: '이동',
                cbm: 0,
                innerBoxCbm: 0
              }))
            }
          })
        }

        // draft items가 저장되어 있는지 검사하여 병합 (작성 중이던 수량 및 추가 품목 유지)
        let finalItems = initialItems
        let loadedActiveCats = defaultCat ? [defaultCat.id] : []

        try {
          const saved = localStorage.getItem(storageKey)
          if (saved) {
            const draft = JSON.parse(saved)
            if (draft.items && draft.items.length > 0) {
              finalItems = draft.items.map((i: any) => ensureItemUid({ ...i, treatment: i.treatment || '이동' }))
              const draftCatIds = Array.from(new Set(finalItems.map((i: any) => i.locationId || ''))) as string[]
              if (draftCatIds.length > 0) {
                loadedActiveCats = draftCatIds
              }
            }
          }
        } catch {}

        setItems(finalItems.map(ensureItemUid))
        setActiveCategoryIds(loadedActiveCats)

        const initialExpanded: Record<string, boolean> = {}
        catsRes.forEach((c: any) => {
          const catItems = finalItems.filter((i: any) => (i.locationId || '') === c.id)
          initialExpanded[c.id] = c.name === '안방' || catItems.some(i => (i.quantity || 0) > 0)
        })
        initialExpanded[''] = finalItems.some(i => !i.locationId && (i.quantity || 0) > 0)
        setExpandedCategories(initialExpanded)
      } else {
        const validItems = parseAndFilterCbmItems(initialData.cbmItems)
        
        let finalItems = validItems
        try {
          const saved = localStorage.getItem(storageKey)
          if (saved) {
            const draft = JSON.parse(saved)
            if (draft.items && draft.items.length > 0) {
              finalItems = draft.items.map((i: any) => ({ ...i, treatment: i.treatment || '이동' }))
            }
          }
        } catch {}

        setItems(finalItems.map(ensureItemUid))

        // 기존 견적의 짐이 있는 공간들을 활성화
        const existingCatIds = Array.from(new Set(
          finalItems.map((i: any) => i.locationId || '')
        )) as string[]
        setActiveCategoryIds(existingCatIds.length > 0 ? existingCatIds : (defaultCat ? [defaultCat.id] : []))

        const initialExpanded: Record<string, boolean> = {}
        catsRes.forEach((c: any) => {
          const catItems = finalItems.filter((i: any) => (i.locationId || '') === c.id)
          initialExpanded[c.id] = catItems.length > 0
        })
        initialExpanded[''] = finalItems.some(i => !i.locationId && (i.quantity || 0) > 0)
        setExpandedCategories(initialExpanded)
      }
    })
  }, [initialData, storageKey])

  // 2. 폼 값 변경 시 localStorage에 실시간 자동 저장 (Debounce 400ms)
  useEffect(() => {
    if (!isDraftLoadedRef.current) return

    const hasContent = Boolean(
      customerName || 
      contact || 
      fromAddress || 
      toAddress || 
      movingCost > 0 || 
      additionalCost > 0 ||
      specialNotes.trim() ||
      (items && items.some(i => (i.quantity || 0) > 0))
    )
    if (!hasContent) return

    const timer = setTimeout(() => {
      try {
        const draftData = {
          savedAt: new Date().toISOString(),
          customerName,
          contact,
          movingType,
          estimateDate: estimateDate ? estimateDate.toISOString() : null,
          visitDate: visitDate ? visitDate.toISOString() : null,
          movingDate: movingDate ? movingDate.toISOString() : null,
          organizeDate: organizeDate ? organizeDate.toISOString() : null,
          organizeStatus,
          fromAddress,
          toAddress,
          fromFloor,
          fromWorkTypes,
          toFloor,
          toWorkTypes,
          distance,
          distanceDuration,
          distanceDetail,
          baseDistanceKm,
          ratePerKm,
          tollFare,
          roundTollFare,
          specialNotes,
          ladderTonnage,
          appliedLadderCost,
          appliedDistanceCost,
          vehicles,
          labors,
          items,
          deadSpaceRatio,
          movingCost,
          additionalCost,
          storageCost,
          vat,
          paymentTarget,
          downPayment,
          downPaymentDate: downPaymentDate ? downPaymentDate.toISOString() : null,
          downPaymentPaid,
          intermediatePayment,
          intermediateDate: intermediateDate ? intermediateDate.toISOString() : null,
          intermediatePaymentPaid,
          balance,
          balanceDate: balanceDate ? balanceDate.toISOString() : null,
          balancePaid,
          isCostEdited,
          signature
        }
        localStorage.setItem(storageKey, JSON.stringify(draftData))
      } catch (e) {
        console.error('Auto-save draft error:', e)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [
    storageKey,
    customerName,
    contact,
    movingType,
    estimateDate,
    visitDate,
    movingDate,
    organizeDate,
    organizeStatus,
    fromAddress,
    toAddress,
    fromFloor,
    fromWorkTypes,
    toFloor,
    toWorkTypes,
    distance,
    distanceDuration,
    distanceDetail,
    baseDistanceKm,
    ratePerKm,
    tollFare,
    roundTollFare,
    specialNotes,
    ladderTonnage,
    appliedLadderCost,
    appliedDistanceCost,
    vehicles,
    labors,
    items,
    deadSpaceRatio,
    movingCost,
    additionalCost,
    storageCost,
    vat,
    paymentTarget,
    downPayment,
    downPaymentDate,
    downPaymentPaid,
    intermediatePayment,
    intermediateDate,
    intermediatePaymentPaid,
    balance,
    balanceDate,
    balancePaid,
    isCostEdited,
    signature
  ])

  // 작업 환경(인원, 차량, 사다리차, 거리, 배차 등) 통합 객체 직렬화
  const currentEnvironmentObj = {
    labors,
    vehicles,
    dispatch: {
      ...dispatchInfo,
      dispatchStatus:
        (Array.isArray(dispatchInfo.assignedVehicles) && dispatchInfo.assignedVehicles.length > 0) ||
        Boolean(dispatchInfo.teamLeader?.trim())
          ? 'CONFIRMED'
          : 'UNASSIGNED'
    },
    organizeStatus,
    fromFloor,
    fromWorkTypes,
    toFloor,
    toWorkTypes,
    distance,
    distanceDuration,
    distanceDetail,
    distanceTierKey,
    baseDistanceKm,
    ratePerKm,
    longRatePerKm,
    applyUltraLong,
    customUltraLongFee,
    includeWaypointInDistance,
    waypointFeeAmount,
    tollFare,
    roundTollFare,
    extraDistanceKm,
    distanceExtraCost: calculatedExtraCost,
    ladderTonnage,
    ladderFromCost: fromLadderCalc.cost,
    ladderToCost: toLadderCalc.cost,
    ladderTotalCost: totalLadderCost,
    specialNotes: specialNotes.trim(),
  }
  const currentEnvironmentStr = JSON.stringify(currentEnvironmentObj)

  // 임시 저장 삭제 및 초기화 (수정 모드 시 서버 원본 복원)
  const handleClearDraft = () => {
    const isEdit = Boolean(initialData?.id)
    const msg = isEdit 
      ? '작성 중이던 임시 저장 데이터를 비우고, 서버에 저장된 원래 견적 데이터로 다시 불러오시겠습니까?'
      : '작성 중이던 임시 저장 데이터를 모두 삭제하고 새로 작성하시겠습니까?'
    if (confirm(msg)) {
      try {
        localStorage.removeItem(storageKey)
      } catch {}
      window.location.reload()
    }
  }

  // 폼 제출 시 오프라인 감지 및 저장
  const handleFormSubmit = async (formData: FormData) => {
    try {
      localStorage.removeItem(storageKey)
    } catch {}

    const rawItems = filterValidCbmItems(items)
    const offlineData = {
      id: initialData?.id,
      customerName,
      contact,
      movingType,
      estimateDate: estimateDate ? estimateDate.toISOString() : new Date().toISOString(),
      visitDate: visitDate ? visitDate.toISOString() : null,
      movingDate: movingDate ? movingDate.toISOString() : null,
      organizeDate: organizeDate ? organizeDate.toISOString() : null,
      fromAddress,
      toAddress,
      cbmItems: JSON.stringify(rawItems),
      materials: (formData.get('materials') as string) || '{}',
      environment: currentEnvironmentStr,
      paymentPlan: (formData.get('paymentPlan') as string) || '{}',
      movingCost,
      additionalCost,
      storageCost,
      vat,
      totalAmount,
    }

    // 1. 단말기 오프라인 상태 시 자체 로컬 DB에 즉시 저장
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const { syncManager } = await import('@/lib/sync/syncManager')
        await syncManager.saveEstimateOffline(offlineData, !initialData?.id)
        alert('현재 인터넷 연결이 없어 단말기 자체 DB에 안전하게 저장되었습니다.\n네트워크가 연결되면 상단 [서버 동기화]를 통해 웹에 반영됩니다.')
        window.location.href = '/estimates'
        return
      } catch (offlineErr) {
        console.error('Offline save error:', offlineErr)
      }
    }

    // 2. 온라인 시 서버 액션 실행 (네트워크 장애 발생 시 로컬 DB로 자동 fallback)
    try {
      await action(formData)
    } catch (e: any) {
      // Next.js Server Action의 redirect()는 내부적으로 NEXT_REDIRECT 에러를 throw함.
      // 이는 정상적인 리다이렉트 흐름이므로 catch로 잡지 않고 다시 던져야 함!
      const isRedirect = 
        e?.message === 'NEXT_REDIRECT' || 
        e?.digest?.startsWith?.('NEXT_REDIRECT') ||
        (typeof e?.message === 'string' && e.message.includes('NEXT_REDIRECT'))
      
      if (isRedirect) {
        throw e
      }

      console.warn('Server action failed, saving to local DB:', e)
      if (typeof navigator !== 'undefined') {
        try {
          const { syncManager } = await import('@/lib/sync/syncManager')
          await syncManager.saveEstimateOffline(offlineData, !initialData?.id)
          alert('네트워크 통신 오류로 인해 단말기 자체 DB에 안전하게 보관되었습니다.\n통신이 원활해지면 상단 [서버 동기화]를 눌러주세요.')
          window.location.href = '/estimates'
          return
        } catch {}
      }
      throw e
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-3 sm:space-y-4 pb-20 px-1 sm:px-2 md:px-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
        {draftRestoredTime && (
          <button
            type="button"
            onClick={handleClearDraft}
            className="text-xs text-gray-500 hover:text-red-600 underline transition-colors"
          >
            {initialData?.id ? '임시저장 비우고 서버 원본 불러오기' : '임시 저장 비우고 새로 쓰기'}
          </button>
        )}
      </div>

      {/* 임시 저장 복원 알림 배너 */}
      {draftRestoredTime && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-amber-900 text-xs sm:text-sm">
            <span className="text-lg">💾</span>
            <div>
              <span className="font-bold">작성 중이던 데이터가 안전하게 유지/복원되었습니다.</span>
              <span className="block sm:inline sm:ml-1.5 text-amber-700 text-xs font-normal">
                (저장일시: {draftRestoredTime})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleClearDraft}
              className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-300 transition-colors shadow-2xs"
            >
              {initialData?.id ? '서버 원본으로 되돌리기' : '새로 작성 (입력 초기화)'}
            </button>
            <button
              type="button"
              onClick={() => setDraftRestoredTime(null)}
              className="p-1 text-amber-600 hover:text-amber-800 rounded text-xs"
              title="닫기"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      <form action={handleFormSubmit} className="space-y-3 sm:space-y-4">
        {initialData && <input type="hidden" name="id" value={initialData.id} />}
        
        {/* 기본 정보 */}
        <div className="bg-white p-3 sm:p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-base sm:text-lg font-bold text-blue-600">기본 정보</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
            {/* 고객명 */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <label className="whitespace-nowrap bg-gray-50 border-r border-gray-200 px-2.5 sm:px-3 py-2 text-left font-medium text-gray-700 w-24 sm:w-28 shrink-0 text-xs sm:text-sm">
                고객명 <span className="text-red-500">*</span>
              </label>
              <div className="flex-1 p-1 sm:p-1.5 min-w-0">
                <input 
                  type="text" 
                  name="customerName" 
                  value={customerName} 
                  onChange={e => setCustomerName(e.target.value)} 
                  required 
                  className="w-full rounded border border-gray-200 px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs sm:text-sm" 
                  placeholder="홍길동" 
                />
              </div>
            </div>

            {/* 연락처 */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <label className="whitespace-nowrap bg-gray-50 border-r border-gray-200 px-2.5 sm:px-3 py-2 text-left font-medium text-gray-700 w-24 sm:w-28 shrink-0 text-xs sm:text-sm">
                연락처 <span className="text-red-500">*</span>
              </label>
              <div className="flex-1 p-1 sm:p-1.5 min-w-0">
                <input 
                  type="tel" 
                  name="contact" 
                  value={contact} 
                  onChange={e => handlePhoneInputChange(e, setContact)} 
                  onFocus={handleSelectAllOnFocus}
                  maxLength={13}
                  autoComplete="tel"
                  required 
                  className="w-full rounded border border-gray-200 px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs sm:text-sm font-medium" 
                  placeholder="010-0000-0000" 
                />
              </div>
            </div>

            {/* 이사 종류 */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <label className="whitespace-nowrap bg-gray-50 border-r border-gray-200 px-2.5 sm:px-3 py-2 text-left font-medium text-gray-700 w-24 sm:w-28 shrink-0 text-xs sm:text-sm">
                이사 종류 <span className="text-red-500">*</span>
              </label>
              <div className="flex-1 p-1 sm:p-1.5 min-w-0">
                <select 
                  name="movingType" 
                  value={movingType} 
                  onChange={e => setMovingType(e.target.value)} 
                  className="w-full rounded border border-gray-200 px-2.5 py-1.5 outline-none focus:border-blue-500 bg-white text-xs sm:text-sm"
                >
                  <option value="P">포장이사 (P)</option>
                  <option value="G">일반이사 (G)</option>
                  <option value="K">보관이사 (K)</option>
                </select>
              </div>
            </div>

            {/* 접수일자 */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <label className="whitespace-nowrap bg-gray-50 border-r border-gray-200 px-2.5 sm:px-3 py-2 text-left font-medium text-gray-700 w-24 sm:w-28 shrink-0 text-xs sm:text-sm">
                접수일자 <span className="text-red-500">*</span>
              </label>
              <div className="flex-1 p-1 sm:p-1.5 min-w-0">
                <CustomDatePicker 
                  selected={estimateDate} 
                  onChange={setEstimateDate} 
                  name="estimateDate" 
                  required 
                  className="w-full rounded border border-gray-200 px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs sm:text-sm" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* 주소 및 일정 */}
        <div className="bg-white p-3 sm:p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-base sm:text-lg font-bold text-blue-600">주소 및 일정</h2>
            <div className="flex items-center gap-2">
              {distance > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 shadow-sm">
                  <Navigation size={13} className="text-blue-600" /> 주행거리: {distance}km
                </span>
              )}
              {fromAddress && toAddress && (
                <a 
                  href={`https://map.kakao.com/?sName=${encodeURIComponent(fromAddress)}&eName=${encodeURIComponent(toAddress)}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center gap-1 font-medium text-xs sm:text-sm shadow-sm"
                >
                  <MapPin size={15}/> 경로 길찾기
                </a>
              )}
            </div>
          </div>
          <div className="overflow-x-auto -mx-1 sm:mx-0 pb-1">
            <table className="w-full border-collapse border border-gray-200 text-xs sm:text-sm min-w-0">
              <tbody>
                <tr>
                  <th className="whitespace-nowrap bg-gray-50 border border-gray-200 px-2 sm:px-3 py-2 text-left font-medium text-gray-700 w-20 sm:w-24 md:w-28">
                    방문 견적일정
                  </th>
                  <td className="border border-gray-200 p-1.5 sm:p-2">
                    <CustomDatePicker 
                      selected={visitDate} 
                      onChange={setVisitDate} 
                      name="visitDate" 
                      showTimeSelect 
                      dateFormat="yyyy-MM-dd'T'HH:mm" 
                      className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 sm:py-2 outline-none focus:border-blue-500 text-xs sm:text-sm" 
                    />
                  </td>
                  <th className="whitespace-nowrap bg-gray-50 border border-gray-200 px-2 sm:px-3 py-2 text-left font-medium text-gray-700 w-20 sm:w-24 md:w-28">
                    이사 예정일
                  </th>
                  <td className="border border-gray-200 p-1.5 sm:p-2">
                    <CustomDatePicker 
                      selected={movingDate} 
                      onChange={setMovingDate} 
                      name="movingDate" 
                      className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 sm:py-2 outline-none focus:border-blue-500 text-xs sm:text-sm" 
                    />
                  </td>
                </tr>

                {movingType === 'K' && (
                  <tr>
                    <th className="whitespace-nowrap bg-gray-50 border border-gray-200 px-2 sm:px-3 py-2 text-left font-medium text-gray-700 w-20 sm:w-24 md:w-28">
                      정리 예정일 (보관)
                    </th>
                    <td className="border border-gray-200 p-1.5 sm:p-2">
                      <CustomDatePicker 
                        selected={organizeDate} 
                        onChange={setOrganizeDate} 
                        name="organizeDate" 
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 sm:py-2 outline-none focus:border-blue-500 text-xs sm:text-sm" 
                      />
                    </td>
                    <th className="whitespace-nowrap bg-gray-50 border border-gray-200 px-2 sm:px-3 py-2 text-left font-medium text-gray-700 w-20 sm:w-24 md:w-28">
                      정리 여부
                    </th>
                    <td className="border border-gray-200 p-1.5 sm:p-2">
                      <div className="flex gap-3 items-center h-full px-1">
                        <label className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-700 cursor-pointer">
                          <input 
                            type="radio" 
                            name="organizeStatus" 
                            checked={organizeStatus === '정리'} 
                            onChange={() => setOrganizeStatus('정리')} 
                            value="정리" 
                            className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-gray-300" 
                          />
                          정리
                        </label>
                        <label className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-700 cursor-pointer">
                          <input 
                            type="radio" 
                            name="organizeStatus" 
                            checked={organizeStatus === '미정리'} 
                            onChange={() => setOrganizeStatus('미정리')} 
                            value="미정리" 
                            className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-gray-300" 
                          />
                          미정리
                        </label>
                      </div>
                    </td>
                  </tr>
                )}

                {/* 출발지 */}
                <tr>
                  <th className="whitespace-nowrap bg-gray-50 border border-gray-200 px-2 sm:px-3 py-2 text-left font-medium text-gray-700 align-top w-20 sm:w-24 md:w-28">
                    출발지 <span className="text-red-500">*</span>
                  </th>
                  <td colSpan={3} className="border border-gray-200 p-2 sm:p-2.5 space-y-2">
                    <div className="flex gap-1.5 sm:gap-2">
                      <input 
                        type="text" 
                        name="fromAddress" 
                        value={fromAddress} 
                        onChange={e => setFromAddress(e.target.value)} 
                        required 
                        className="flex-1 min-w-0 rounded-lg border border-gray-300 px-2.5 py-1.5 sm:py-2 outline-none focus:border-blue-500 text-xs sm:text-sm" 
                        placeholder="출발지 주소를 검색하세요" 
                      />
                      <button 
                        type="button" 
                        onClick={() => { setPostcodeTarget('from'); setPostcodeOpen(true); }} 
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 flex items-center gap-1 font-medium text-xs sm:text-sm whitespace-nowrap shadow-xs transition-colors shrink-0"
                      >
                        <Search size={14}/> 검색
                      </button>
                      {fromAddress && (
                        <a 
                          href={`https://map.kakao.com/link/search/${fromAddress}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-1 font-medium text-xs sm:text-sm whitespace-nowrap shadow-xs transition-colors shrink-0"
                        >
                          <MapPin size={14}/> 지도
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-gray-50/80 p-2 sm:p-2.5 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-gray-700 font-bold text-xs sm:text-sm whitespace-nowrap">층수:</span>
                        <input 
                          type="text" 
                          value={fromFloor} 
                          onChange={e => setFromFloor(e.target.value)} 
                          onFocus={handleSelectAllOnFocus}
                          placeholder="예: 3" 
                          className="w-14 sm:w-16 rounded-lg border border-gray-300 bg-white px-1.5 py-1 text-xs sm:text-sm text-center outline-none focus:border-blue-500 shadow-xs font-bold text-gray-800" 
                        />
                        <span className="text-gray-600 text-xs sm:text-sm font-medium">층</span>
                      </div>

                      <div className="h-4 w-[1px] bg-gray-300 hidden sm:block" />

                      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                        <span className="text-gray-700 font-bold text-xs sm:text-sm whitespace-nowrap mr-0.5">작업조건:</span>
                        {['사다리차', '엘리베이터', '수작업', '계단'].map(type => {
                          const isChecked = fromWorkTypes.includes(type)
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                setFromWorkTypes(prev => 
                                  prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                                )
                              }}
                              className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm font-medium border transition-all flex items-center gap-1 shadow-xs whitespace-nowrap ${
                                isChecked 
                                  ? 'bg-blue-600 border-blue-600 text-white font-bold' 
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <span className={`w-3 h-3 rounded flex items-center justify-center text-[9px] font-bold ${
                                isChecked ? 'bg-white text-blue-600' : 'border border-gray-400'
                              }`}>
                                {isChecked ? '✓' : ''}
                              </span>
                              {type}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* 도착지 */}
                <tr>
                  <th className="whitespace-nowrap bg-gray-50 border border-gray-200 px-2 sm:px-3 py-2 text-left font-medium text-gray-700 align-top w-20 sm:w-24 md:w-28">
                    도착지 <span className="text-red-500">*</span>
                  </th>
                  <td colSpan={3} className="border border-gray-200 p-2 sm:p-2.5 space-y-2">
                    <div className="flex gap-1.5 sm:gap-2">
                      <input 
                        type="text" 
                        name="toAddress" 
                        value={toAddress} 
                        onChange={e => setToAddress(e.target.value)} 
                        required 
                        className="flex-1 min-w-0 rounded-lg border border-gray-300 px-2.5 py-1.5 sm:py-2 outline-none focus:border-blue-500 text-xs sm:text-sm" 
                        placeholder="도착지 주소를 검색하세요" 
                      />
                      <button 
                        type="button" 
                        onClick={() => { setPostcodeTarget('to'); setPostcodeOpen(true); }} 
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 flex items-center gap-1 font-medium text-xs sm:text-sm whitespace-nowrap shadow-xs transition-colors shrink-0"
                      >
                        <Search size={14}/> 검색
                      </button>
                      {toAddress && (
                        <a 
                          href={`https://map.kakao.com/link/search/${toAddress}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-1 font-medium text-xs sm:text-sm whitespace-nowrap shadow-xs transition-colors shrink-0"
                        >
                          <MapPin size={14}/> 지도
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-gray-50/80 p-2 sm:p-2.5 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-gray-700 font-bold text-xs sm:text-sm whitespace-nowrap">층수:</span>
                        <input 
                          type="text" 
                          value={toFloor} 
                          onChange={e => setToFloor(e.target.value)} 
                          onFocus={handleSelectAllOnFocus}
                          placeholder="예: 5" 
                          className="w-14 sm:w-16 rounded-lg border border-gray-300 bg-white px-1.5 py-1 text-xs sm:text-sm text-center outline-none focus:border-blue-500 shadow-xs font-bold text-gray-800" 
                        />
                        <span className="text-gray-600 text-xs sm:text-sm font-medium">층</span>
                      </div>

                      <div className="h-4 w-[1px] bg-gray-300 hidden sm:block" />

                      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                        <span className="text-gray-700 font-bold text-xs sm:text-sm whitespace-nowrap mr-0.5">작업조건:</span>
                        {['사다리차', '엘리베이터', '수작업', '계단'].map(type => {
                          const isChecked = toWorkTypes.includes(type)
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                setToWorkTypes(prev => 
                                  prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                                )
                              }}
                              className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm font-medium border transition-all flex items-center gap-1 shadow-xs whitespace-nowrap ${
                                isChecked 
                                  ? 'bg-blue-600 border-blue-600 text-white font-bold' 
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <span className={`w-3 h-3 rounded flex items-center justify-center text-[9px] font-bold ${
                                isChecked ? 'bg-white text-blue-600' : 'border border-gray-400'
                              }`}>
                                {isChecked ? '✓' : ''}
                              </span>
                              {type}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* 사다리차 표준 운임표 연동 및 계산 */}
                <tr className="bg-amber-50/20">
                  <th className="whitespace-nowrap bg-amber-50/80 border border-gray-200 px-2 sm:px-3 py-2 text-left font-bold text-amber-950 align-top w-20 sm:w-24 md:w-28">
                    <div className="flex items-center gap-1.5">
                      <Truck size={15} className="text-amber-600" />
                      <span>사다리차 운임</span>
                    </div>
                    <span className="block text-[10px] sm:text-[11px] font-normal text-amber-700 mt-0.5">표준운임 연동</span>
                  </th>
                  <td colSpan={3} className="border border-gray-200 p-2 sm:p-2.5 space-y-2">
                    <div className="bg-white rounded-xl border border-amber-200 p-2.5 sm:p-3 shadow-xs space-y-2.5">
                      {/* 톤수 선택 및 운임표 바로가기 */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">화물 기준 톤수:</span>
                          <div className="flex flex-wrap items-center gap-1">
                            {['1', '2.5', '5', '6', '7.5', '10'].map(ton => (
                              <button
                                key={ton}
                                type="button"
                                onClick={() => setLadderTonnage(ton)}
                                className={`px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-bold rounded-md border transition-all ${
                                  ladderTonnage === ton
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                                }`}
                              >
                                {ton}톤 {ton === '5' ? '(기본)' : ''}
                              </button>
                            ))}
                          </div>
                        </div>

                        <a 
                          href="/ladders" 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline whitespace-nowrap"
                        >
                          <span>사다리차 운임표 ↗</span>
                        </a>
                      </div>

                      {/* 출발지 / 도착지 사다리차 적용 현황 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                        {/* 출발지 */}
                        <div className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                          isFromLadder 
                            ? 'bg-amber-50/50 border-amber-200' 
                            : 'bg-gray-50 border-gray-200 text-gray-400'
                        }`}>
                          <div className="flex justify-between items-center font-bold">
                            <span className={isFromLadder ? 'text-amber-900' : 'text-gray-500'}>
                              출발지 사다리차 {isFromLadder ? '✓ 선택됨' : '(미선택)'}
                            </span>
                            {isFromLadder && fromFloor && (
                              <span className="text-gray-700 bg-white px-1.5 py-0.2 rounded border border-amber-200 font-bold">{fromFloor}층</span>
                            )}
                          </div>
                          {isFromLadder ? (
                            parseInt(fromFloor) >= 2 ? (
                              <div className="flex justify-between items-center pt-1 border-t border-amber-200/60 font-semibold text-gray-800">
                                <span>적용: {fromLadderCalc.tier} ({ladderTonnage}톤)</span>
                                <span className="font-extrabold text-amber-700 text-sm">
                                  {fromLadderCalc.cost.toLocaleString()} 원
                                </span>
                              </div>
                            ) : (
                              <p className="text-gray-500 pt-1">출발지 층수를 2층 이상 입력하면 자동 계산됩니다.</p>
                            )
                          ) : (
                            <p className="text-gray-400">출발지 작업조건에서 '사다리차'를 선택하면 자동 계산됩니다.</p>
                          )}
                        </div>

                        {/* 도착지 */}
                        <div className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                          isToLadder 
                            ? 'bg-amber-50/50 border-amber-200' 
                            : 'bg-gray-50 border-gray-200 text-gray-400'
                        }`}>
                          <div className="flex justify-between items-center font-bold">
                            <span className={isToLadder ? 'text-amber-900' : 'text-gray-500'}>
                              도착지 사다리차 {isToLadder ? '✓ 선택됨' : '(미선택)'}
                            </span>
                            {isToLadder && toFloor && (
                              <span className="text-gray-700 bg-white px-1.5 py-0.2 rounded border border-amber-200 font-bold">{toFloor}층</span>
                            )}
                          </div>
                          {isToLadder ? (
                            parseInt(toFloor) >= 2 ? (
                              <div className="flex justify-between items-center pt-1 border-t border-amber-200/60 font-semibold text-gray-800">
                                <span>적용: {toLadderCalc.tier} ({ladderTonnage}톤)</span>
                                <span className="font-extrabold text-amber-700 text-sm">
                                  {toLadderCalc.cost.toLocaleString()} 원
                                </span>
                              </div>
                            ) : (
                              <p className="text-gray-500 pt-1">도착지 층수를 2층 이상 입력하면 자동 계산됩니다.</p>
                            )
                          ) : (
                            <p className="text-gray-400">도착지 작업조건에서 '사다리차'를 선택하면 자동 계산됩니다.</p>
                          )}
                        </div>
                      </div>

                      {/* 합계 및 가산비용 반영 버튼 */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-gray-200 bg-gray-50/60 p-2 rounded-lg">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                          <span className="text-gray-600 font-medium">총 사다리차 운임:</span>
                          <span className="font-black text-amber-700 text-sm sm:text-base">
                            {totalLadderCost.toLocaleString()} 원
                          </span>
                          {(fromLadderCalc.cost > 0 && toLadderCalc.cost > 0) && (
                            <span className="text-gray-400 text-xs hidden md:inline">
                              (출발 {fromLadderCalc.cost.toLocaleString()} + 도착 {toLadderCalc.cost.toLocaleString()})
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleApplyLadderCost}
                          disabled={totalLadderCost <= 0}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 whitespace-nowrap ${
                            totalLadderCost <= 0
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : isLadderApplied
                              ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                              : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
                          }`}
                        >
                          {isLadderApplied ? <CheckCircle2 size={13} className="text-amber-700" /> : <Plus size={13} />}
                          <span>{isLadderApplied ? '운임 반영 완료' : '가산비용 반영'}</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>

                {/* 이동 거리 계산 및 표시 (견적금액 영향) */}
                <tr className="bg-blue-50/20">
                  <th className="whitespace-nowrap bg-blue-50/80 border border-gray-200 px-2 sm:px-3 py-2 text-left font-bold text-blue-950 align-top w-20 sm:w-24 md:w-28">
                    <div className="flex items-center gap-1.5">
                      <Navigation size={15} className="text-blue-600" />
                      <span>이동 거리</span>
                    </div>
                    <span className="block text-[10px] sm:text-[11px] font-normal text-blue-700 mt-0.5">견적금액 연동</span>
                  </th>
                  <td colSpan={3} className="border border-gray-200 p-2 sm:p-2.5 space-y-2">
                    <div className="bg-white rounded-xl border border-blue-200 p-2.5 sm:p-3 shadow-xs space-y-2.5">
                      {/* 1. 거리, 예상시간(5톤 화물차 기준), 왕복 톨게이트비 표시 및 조정 영역 */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          {/* 실제 주행거리 */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">실제 주행거리:</span>
                            <div className="flex items-center gap-1 bg-blue-50/60 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-blue-200">
                              <input 
                                type="number" 
                                step="0.1" 
                                min="0" 
                                value={distance === 0 ? '' : distance} 
                                onChange={e => {
                                  const val = parseFloat(e.target.value) || 0
                                  setDistance(val)
                                }} 
                                onFocus={handleSelectAllOnFocus}
                                placeholder="0.0" 
                                className="w-16 bg-transparent text-right font-black text-blue-700 text-sm sm:text-base outline-none focus:bg-white rounded px-0.5"
                              />
                              <span className="font-bold text-blue-900 text-xs sm:text-sm">km</span>
                            </div>
                          </div>

                          {/* 5톤 화물차 기준 예상시간 */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200" title="5톤 화물차 법정 속도제한(80km/h) 및 적재 중량 가감속을 반영한 현실적인 주행 소요 시간">
                            <span className="font-medium text-gray-700">화물차 주행시간:</span>
                            <span className="font-extrabold text-blue-900">
                              {distanceDuration || (distance > 0 ? calculate5TonTruckDuration(distance).text : '-')}
                            </span>
                            <span className="text-[10px] text-gray-500 font-normal bg-gray-200/60 px-1 py-0.5 rounded">
                              80km/h 제한
                            </span>
                          </div>

                          {/* 왕복 톨게이트비 입력/표시 */}
                          <div className="flex items-center gap-1.5 bg-indigo-50/70 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-indigo-200">
                            <CreditCard size={13} className="text-indigo-600 shrink-0" />
                            <span className="text-xs font-bold text-indigo-950 whitespace-nowrap">왕복 톨게이트비:</span>
                            <div className="flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded border border-indigo-300">
                              <input
                                type="text"
                                value={roundTollFare === 0 ? '' : roundTollFare.toLocaleString()}
                                onChange={e => {
                                  const raw = e.target.value.replace(/[^0-9]/g, '')
                                  handleRoundTollFareChange(raw ? parseInt(raw, 10) : 0)
                                }}
                                onFocus={handleSelectAllOnFocus}
                                placeholder="0"
                                className="w-18 bg-transparent text-right font-black text-indigo-900 text-xs sm:text-sm outline-none"
                              />
                              <span className="text-xs font-semibold text-indigo-900">원</span>
                            </div>
                            <span className="text-[11px] text-indigo-700 hidden md:inline whitespace-nowrap">
                              (대당 편도 {tollFare.toLocaleString()}원)
                            </span>
                          </div>
                        </div>

                        {/* 계산 버튼 & 안내 */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCalculateDistance()}
                            disabled={isCalculatingDistance || !fromAddress || !toAddress}
                            className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-all whitespace-nowrap ${
                              isCalculatingDistance
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : !fromAddress || !toAddress
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                            }`}
                          >
                            <RefreshCw size={12} className={isCalculatingDistance ? 'animate-spin' : ''} />
                            <span>{isCalculatingDistance ? '계산 중...' : '거리 재계산'}</span>
                          </button>

                          {fromAddress && toAddress && (
                            <a
                              href={`https://map.kakao.com/?sName=${encodeURIComponent(fromAddress)}&eName=${encodeURIComponent(toAddress)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 sm:px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors border border-gray-300 flex items-center gap-1 whitespace-nowrap"
                              title="카카오맵에서 실제 경로 및 지도 확인"
                            >
                              <MapPin size={12} /> 지도
                            </a>
                          )}
                        </div>
                      </div>

                      {/* 상태 알림 배지 */}
                      {distanceNotice && (
                        <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-200">
                          <CheckCircle2 size={12} className="text-green-600 shrink-0" />
                          <span>{distanceNotice}</span>
                        </div>
                      )}

                      {distanceCalcError && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <AlertCircle size={12} className="text-amber-600 shrink-0" />
                          <span>{distanceCalcError}</span>
                        </div>
                      )}

                      {/* 고속도로 통행료 종합 배지 (투입차량 전체 왕복 톨비 안내 + 5톤 3종 화물차 1.45배 보정) */}
                      {roundTollFare > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-indigo-900 bg-indigo-50/90 px-2.5 py-1.5 rounded-md border border-indigo-200/80">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <CreditCard size={13} className="text-indigo-600 shrink-0" />
                            <span className="font-semibold text-gray-700">고속도로 통행료:</span>
                            <span className="font-extrabold text-indigo-900">대당 왕복 {roundTollFare.toLocaleString()}원</span>
                            <span className="text-gray-400">|</span>
                            <span className="text-gray-600">편도 {tollFare.toLocaleString()}원</span>
                            <button
                              type="button"
                              onClick={() => handleRoundTollFareChange(adjustTollForHeavyTruck(roundTollFare, true))}
                              className="px-1.5 py-0.5 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded text-[11px] font-bold transition-colors"
                              title="한국도로공사 3종 대형화물(5톤) 통행료 약 1.45배 할증 적용"
                            >
                              3종 화물(×1.45)
                            </button>
                            {distance > 0 && distance <= 30 && (
                              <button
                                type="button"
                                onClick={() => handleRoundTollFareChange(0)}
                                className="px-1.5 py-0.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded text-[11px] font-bold transition-colors"
                                title="30km 이내 시내/근거리 통행료 기본운임 흡수 처리"
                              >
                                30km이내 흡수(0원)
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1 font-bold text-indigo-800">
                            <span>투입 {vehicles.reduce((sum, v) => sum + (Number(v.count) || 0), 0) || 1}대 총 왕복 톨비:</span>
                            <span className="text-sm font-black text-indigo-900 bg-white px-2 py-0.5 rounded border border-indigo-200">
                              {(roundTollFare * (vehicles.reduce((sum, v) => sum + (Number(v.count) || 0), 0) || 1)).toLocaleString()}원
                            </span>
                            <span className="text-[11px] text-indigo-600 font-normal">(원가/비용 산출 연동)</span>
                          </div>
                        </div>
                      )}

                      {/* 2. 견적금액 연동: 차량 톤수별 2단 구간 거리 가산 요금 산출 보조 섹션 */}
                      <div className="mt-1.5 pt-2 border-t border-dashed border-gray-200 bg-gray-50/70 p-2 sm:p-2.5 rounded-lg space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-800">
                            <Calculator size={14} className="text-blue-600" />
                            <span>톤수별 거리 가산 운임</span>
                            <span className="text-[10px] sm:text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              기본운임 {TONNAGE_DISTANCE_FARE_TABLE[distanceTierKey].vehicleBaseFee.toLocaleString()}원 기준
                            </span>
                          </div>

                          {/* 차량 톤수별 단가표 프리셋 선택 */}
                          <div className="flex flex-wrap items-center gap-1">
                            {TONNAGE_DISTANCE_FARE_LIST.map((spec) => (
                              <button
                                key={spec.key}
                                type="button"
                                onClick={() => handleSelectDistanceTier(spec.key)}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all border ${
                                  distanceTierKey === spec.key
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                                }`}
                              >
                                {spec.key}톤
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 기본거리 / 근거리(26~100km) / 장거리(101km~) / 250km+ 초장거리 설정 */}
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs bg-white p-2 rounded-md border border-gray-200/80">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600 font-semibold">기본포함:</span>
                            <input 
                              type="number" 
                              min="0" 
                              value={baseDistanceKm} 
                              onChange={e => setBaseDistanceKm(Number(e.target.value) || 0)} 
                              onFocus={handleSelectAllOnFocus}
                              className="w-11 text-center rounded border border-gray-300 bg-gray-50 py-0.5 px-1 font-bold text-gray-800 outline-none focus:border-blue-500 text-xs" 
                            />
                            <span className="text-gray-500">km</span>
                          </div>

                          <span className="text-gray-300">|</span>

                          <div className="flex items-center gap-1">
                            <span className="text-gray-600 font-semibold">근거리(~100km):</span>
                            <input 
                              type="number" 
                              min="0" 
                              step="100" 
                              value={ratePerKm} 
                              onChange={e => setRatePerKm(Number(e.target.value) || 0)} 
                              onFocus={handleSelectAllOnFocus}
                              className="w-14 text-right rounded border border-gray-300 bg-gray-50 py-0.5 px-1 font-bold text-blue-700 outline-none focus:border-blue-500 text-xs" 
                            />
                            <span className="text-gray-500">원/km</span>
                          </div>

                          <span className="text-gray-300">|</span>

                          <div className="flex items-center gap-1">
                            <span className="text-gray-600 font-semibold">장거리(101km~):</span>
                            <input 
                              type="number" 
                              min="0" 
                              step="100" 
                              value={longRatePerKm} 
                              onChange={e => setLongRatePerKm(Number(e.target.value) || 0)} 
                              onFocus={handleSelectAllOnFocus}
                              className="w-14 text-right rounded border border-gray-300 bg-gray-50 py-0.5 px-1 font-bold text-indigo-700 outline-none focus:border-blue-500 text-xs" 
                            />
                            <span className="text-gray-500">원/km</span>
                          </div>

                          {distance >= 250 && (
                            <>
                              <span className="text-gray-300">|</span>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={applyUltraLong}
                                  onChange={e => setApplyUltraLong(e.target.checked)}
                                  className="rounded text-amber-600"
                                />
                                <span className="font-bold text-amber-800">250km+ 초장거리 수당:</span>
                                <input
                                  type="number"
                                  step="10000"
                                  value={customUltraLongFee}
                                  onChange={e => setCustomUltraLongFee(Number(e.target.value) || 0)}
                                  onFocus={handleSelectAllOnFocus}
                                  className="w-18 text-right rounded border border-amber-300 bg-amber-50/60 py-0.5 px-1 font-bold text-amber-900 text-xs"
                                />
                                <span className="text-gray-500">원</span>
                              </label>
                            </>
                          )}

                          {(waypointCount > 0 || includeWaypointInDistance) && (
                            <>
                              <span className="text-gray-300">|</span>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={includeWaypointInDistance}
                                  onChange={e => setIncludeWaypointInDistance(e.target.checked)}
                                  className="rounded text-purple-600"
                                />
                                <span className="font-bold text-purple-800">
                                  경유 수고비{waypointCount > 0 ? `(경유품목 ${waypointCount}건)` : ''}:
                                </span>
                                <input
                                  type="number"
                                  step="10000"
                                  value={waypointFeeAmount}
                                  onChange={e => setWaypointFeeAmount(Number(e.target.value) || 0)}
                                  onFocus={handleSelectAllOnFocus}
                                  className="w-16 text-right rounded border border-purple-300 bg-purple-50/60 py-0.5 px-1 font-bold text-purple-900 text-xs"
                                />
                                <span className="text-gray-500">원</span>
                              </label>
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-gray-200/80">
                          <div className="text-xs text-gray-600 flex items-center gap-1.5 flex-wrap">
                            <span>총 초과: <strong className="text-gray-900">{extraDistanceKm}km</strong></span>
                            {distanceFareResult.shortExtraKm > 0 && (
                              <span className="text-[11px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">
                                근거리 {distanceFareResult.shortExtraKm}km (+{distanceFareResult.shortExtraCost.toLocaleString()}원)
                              </span>
                            )}
                            {distanceFareResult.longExtraKm > 0 && (
                              <span className="text-[11px] bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200">
                                장거리 {distanceFareResult.longExtraKm}km (+{distanceFareResult.longExtraCost.toLocaleString()}원)
                              </span>
                            )}
                            {distanceFareResult.ultraLongSurcharge > 0 && (
                              <span className="text-[11px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
                                250km+수당 (+{distanceFareResult.ultraLongSurcharge.toLocaleString()}원)
                              </span>
                            )}
                            {distanceFareResult.waypointFee > 0 && (
                              <span className="text-[11px] bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded border border-purple-200 font-semibold">
                                경유 (+{distanceFareResult.waypointFee.toLocaleString()}원)
                              </span>
                            )}
                            <span className="text-gray-300">|</span>
                            <span>합계:</span>
                            <span className="font-extrabold text-blue-700 text-xs sm:text-sm">+{calculatedExtraCost.toLocaleString()} 원</span>
                          </div>

                          <button
                            type="button"
                            onClick={handleApplyDistanceCost}
                            disabled={calculatedExtraCost <= 0}
                            className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs font-bold transition-all shadow-xs flex items-center gap-1 whitespace-nowrap ${
                              calculatedExtraCost <= 0
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : isDistanceApplied
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                            }`}
                          >
                            {isDistanceApplied ? <CheckCircle2 size={12} className="text-indigo-700" /> : <Plus size={12} />}
                            <span>{isDistanceApplied ? '운임 반영 완료' : '+ 가산비용 반영'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>

                {/* 특기사항 (선택 입력, 내용 없으면 조회/출력 시 미표시) */}
                <tr>
                  <th className="whitespace-nowrap bg-amber-50/80 border border-gray-200 px-2 sm:px-3 py-2 text-left font-bold text-amber-950 align-top w-20 sm:w-24 md:w-28">
                    <div className="flex items-center gap-1.5">
                      <FileText size={15} className="text-amber-600" />
                      <span>특기사항</span>
                    </div>
                    <span className="block text-[10px] sm:text-[11px] font-normal text-amber-700 mt-0.5">선택 입력</span>
                  </th>
                  <td colSpan={3} className="border border-gray-200 p-3">
                    <textarea
                      id="specialNotes"
                      name="specialNotes"
                      value={specialNotes}
                      onChange={e => setSpecialNotes(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder="예) 피아노 운반 주의, 고객 부재 시 관리실 연락, 엘리베이터 사용 예약 필요 등"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 resize-y"
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-gray-400">
                      <span>입력하지 않으면 견적 상세/PDF 출력에 표시되지 않습니다.</span>
                      <span>{specialNotes.length}/1000</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <input type="hidden" name="fromFloor" value={fromFloor} />
          <input type="hidden" name="fromWorkTypes" value={JSON.stringify(fromWorkTypes)} />
          <input type="hidden" name="toFloor" value={toFloor} />
          <input type="hidden" name="toWorkTypes" value={JSON.stringify(toWorkTypes)} />
          <input type="hidden" name="distance" value={distance} />
          <input type="hidden" name="distanceDuration" value={distanceDuration} />
          <input type="hidden" name="distanceDetail" value={distanceDetail} />
          <input type="hidden" name="baseDistanceKm" value={baseDistanceKm} />
          <input type="hidden" name="ratePerKm" value={ratePerKm} />
          <input type="hidden" name="extraDistanceKm" value={extraDistanceKm} />
          <input type="hidden" name="distanceExtraCost" value={calculatedExtraCost} />
          <input type="hidden" name="ladderTonnage" value={ladderTonnage} />
          <input type="hidden" name="ladderFromCost" value={fromLadderCalc.cost} />
          <input type="hidden" name="ladderToCost" value={toLadderCalc.cost} />
          <input type="hidden" name="ladderTotalCost" value={totalLadderCost} />
          <input type="hidden" name="tollFare" value={tollFare} />
          <input type="hidden" name="roundTollFare" value={roundTollFare} />
          <input type="hidden" name="environment" value={currentEnvironmentStr} />
        </div>

        {/* 물품 및 작업 환경 */}
        <div className="bg-white p-3.5 sm:p-5 md:p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-blue-600 border-b pb-2">물품 및 작업 환경</h2>
          
          <div className="space-y-3">
            {/* CBM 물품 목록 액션 바 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 bg-gray-50/80 p-2 sm:p-2.5 rounded-xl border border-gray-200">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="font-bold text-gray-900 text-xs sm:text-sm md:text-base mr-1">물품 목록 (CBM)</h3>
                
                {/* 1. 평형별 템플릿 원클릭 버튼 */}
                <button
                  type="button"
                  onClick={() => setIsPresetModalOpen(true)}
                  className="px-2 sm:px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs rounded-lg font-extrabold transition-all shadow-xs flex items-center gap-1 active:scale-95 whitespace-nowrap"
                  title="원룸, 24평, 34평 등 평형별 표준 이삿짐을 원클릭으로 자동 구성합니다"
                >
                  <Zap size={12} className="text-amber-300 fill-amber-300" />
                  <span>⚡ 평형 템플릿</span>
                </button>

                {/* 2. AI CBM 견적 버튼 */}
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(true)}
                  className="px-2 sm:px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs rounded-lg font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95 whitespace-nowrap"
                  title="촬영한 현장 영상이나 사진을 AI로 분석하여 CBM 물품을 자동 추출합니다"
                >
                  <Sparkles size={12} className="text-amber-300 animate-pulse" />
                  <span>AI 영상·사진</span>
                </button>

                {/* 3. CBM 계산기 */}
                <button 
                  type="button" 
                  onClick={() => setIsCbmCalculatorOpen(true)}
                  className="px-2 py-1 bg-white text-blue-700 hover:bg-blue-50 text-xs rounded-lg font-bold transition-colors border border-blue-200 shadow-2xs whitespace-nowrap"
                >
                  CBM 계산기
                </button>

                {/* 특이 처리 항목 (폐기, 내림, 경유, 존치) 요약 뱃지 */}
                {(() => {
                  const validItems = items.filter(it => {
                    const q = it.quantity !== undefined ? Number(it.quantity) : 1
                    const unitCbm = (Number(it.cbm) || 0) + (Number(it.innerBoxCbm) || 0)
                    return unitCbm > 0 && q > 0
                  })
                  const countBy = validItems.reduce((acc: any, it: any) => {
                    const t = it.treatment || '이동'
                    if (t !== '이동') {
                      acc[t] = (acc[t] || 0) + (Number(it.quantity) || 1)
                    }
                    return acc
                  }, {})
                  const entries = Object.entries(countBy)
                  if (entries.length === 0) return null
                  return (
                    <div className="flex flex-wrap items-center gap-1 text-xs font-bold">
                      {countBy['폐기'] && (
                        <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 border border-red-200 shadow-2xs text-[11px]">
                          폐기 {countBy['폐기']}
                        </span>
                      )}
                      {countBy['내림'] && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shadow-2xs text-[11px]">
                          내림 {countBy['내림']}
                        </span>
                      )}
                      {countBy['경유'] && (
                        <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs text-[11px]">
                          경유 {countBy['경유']}
                        </span>
                      )}
                      {countBy['존치'] && (
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs text-[11px]">
                          존치 {countBy['존치']}
                        </span>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* 우측: 뷰 모드 토글 (초고속 터치 모드 vs 상세 테이블) 및 총 합계 */}
              <div className="flex items-center justify-between w-full md:w-auto gap-2 shrink-0">
                {/* 뷰 모드 세그먼트 스위처 */}
                <div className="flex items-center bg-gray-200/80 p-0.5 rounded-lg border border-gray-300">
                  <button
                    type="button"
                    onClick={() => setCbmInputMode('touch')}
                    className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-xs font-extrabold transition-all whitespace-nowrap ${
                      cbmInputMode === 'touch'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Smartphone size={12} />
                    <span>⚡ 터치</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCbmInputMode('table')}
                    className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-xs font-extrabold transition-all whitespace-nowrap ${
                      cbmInputMode === 'table'
                        ? 'bg-white text-gray-900 shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Table size={12} />
                    <span>📋 테이블</span>
                  </button>
                </div>

                <div className="text-xs sm:text-sm font-extrabold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs shrink-0 whitespace-nowrap">
                  총 {totalCbm.toFixed(2)} CBM
                </div>
              </div>
            </div>

            {/* 백그라운드 AI 분석 알림 배너 */}
            {backgroundAiTasks.length > 0 && (
              <div className="space-y-1.5">
                {backgroundAiTasks.map(task => (
                  <div
                    key={task.id}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-between gap-2 shadow-xs animate-in fade-in ${
                      task.status === 'analyzing'
                        ? 'bg-amber-50 text-amber-900 border-amber-200'
                        : task.status === 'done'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : 'bg-red-50 text-red-900 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {task.status === 'analyzing' ? (
                        <div className="w-4 h-4 rounded-full border-2 border-amber-600 border-t-transparent animate-spin shrink-0" />
                      ) : task.status === 'done' ? (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle size={16} className="text-red-600 shrink-0" />
                      )}
                      <span>
                        {task.status === 'analyzing'
                          ? `[${task.location}] AI 분석 중...`
                          : task.status === 'done'
                          ? `🎉 [${task.location}] 분석 완료 (${task.items?.length || 0}개 감지)`
                          : `[${task.location}] 실패: ${task.error}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {task.status === 'done' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (task.items) {
                              handleApplyAiItems(task.items, 'append')
                            }
                            setBackgroundAiTasks(prev => prev.filter(t => t.id !== task.id))
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-2xs"
                        >
                          + 반영
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setBackgroundAiTasks(prev => prev.filter(t => t.id !== task.id))}
                        className="px-2 py-1 rounded-lg bg-white/80 hover:bg-white text-gray-600 text-[11px] border border-gray-300"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 입력 뷰: 초고속 터치 모드 vs 상세 테이블 모드 */}
            {cbmInputMode === 'touch' ? (
              <QuickTouchCbmPanel
                categories={displayedCategories}
                availableCategoriesToAdd={availableCategoriesToAdd}
                onAddCategory={handleAddCategory}
                onRemoveCategory={handleRemoveCategory}
                items={items}
                setItems={setItems}
                standardItems={standardItems}
              />
            ) : (
              <div className="space-y-3">
              {/* 테이블 모드 스마트 필터 바 (선택됨만 보기 / 중분류 / 초성 ㄱ~ㅎ / 검색) */}
              <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-2.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                    {ITEM_MID_CATEGORIES.map(cat => {
                      const isSelected = tableMidCat === cat.key
                      const isSelectedTab = cat.key === 'selected'
                      const selectedCount = items.filter(i => (Number(i.quantity) || 0) > 0).length
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => setTableMidCat(cat.key)}
                          className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1 border ${
                            isSelected
                              ? isSelectedTab
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                : 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : isSelectedTab && selectedCount > 0
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          <span>{cat.shortLabel}</span>
                          {isSelectedTab && (
                            <span
                              className={`text-[10px] px-1 rounded-full font-bold ${
                                isSelected ? 'bg-white/25 text-white' : 'bg-emerald-200/80 text-emerald-900'
                              }`}
                            >
                              {selectedCount}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  <div className="relative flex-1 sm:flex-initial sm:w-56">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      lang="ko"
                      inputMode="text"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      style={{ imeMode: 'active' } as React.CSSProperties}
                      value={tableSearch}
                      onChange={e => setTableSearch(convertEngInputToKor(e.target.value))}
                      placeholder="테이블 내 품목·초성 검색 (예: 침대, ㅊㄷ)"
                      className="w-full pl-7 pr-6 py-1 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-800 outline-none focus:border-blue-500"
                    />
                    {tableSearch && (
                      <button
                        type="button"
                        onClick={() => setTableSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {CHOSUNG_BUTTONS.map(ch => {
                      const isSelected = tableChosung === ch
                      return (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => setTableChosung(prev => (prev === ch && ch !== '전체' ? '전체' : ch))}
                          className={`min-w-[26px] h-6 sm:h-7 px-1.5 rounded-md text-[11px] sm:text-xs font-extrabold transition-all shrink-0 border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-indigo-50 hover:border-indigo-300'
                          }`}
                        >
                          {ch}
                        </button>
                      )
                    })}
                  </div>

                  {(tableMidCat !== 'all' || tableChosung !== '전체' || tableSearch.trim()) && (
                    <button
                      type="button"
                      onClick={() => {
                        setTableMidCat('all')
                        setTableChosung('전체')
                        setTableSearch('')
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0 whitespace-nowrap"
                    >
                      필터 해제
                    </button>
                  )}
                </div>
              </div>

              {displayedCategories.map((cat: any) => {
                // 실시간 동적 정렬 제거: 타이핑 중 행 위치가 변경되어 모바일 한글 조합(IME)이 깨지는 현상 방지
                const allCatItems = items.filter(i => (i.locationId || '') === cat.id)
                const catItems = allCatItems.filter(it => {
                  const qty = Number(it.quantity) || 0
                  if (tableMidCat === 'selected' && qty <= 0) return false
                  if (
                    tableMidCat !== 'all' &&
                    tableMidCat !== 'selected' &&
                    classifyItemMidCategory(it.name) !== tableMidCat
                  ) {
                    return false
                  }
                  if (tableChosung !== '전체' && !matchesChosungFilter(it.name, tableChosung)) {
                    return false
                  }
                  if (tableSearch.trim() && !matchesKoreanSearch(it.name, it.spec, tableSearch)) {
                    return false
                  }
                  return true
                })
                // Hide '기타/미지정' if it has no items
                if (cat.id === '' && allCatItems.length === 0) return null
                
                const isExpanded = expandedCategories[cat.id] !== false

                return (
                  <div key={cat.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div 
                      className="bg-blue-50/80 px-3 sm:px-4 py-2 font-bold text-gray-800 flex justify-between items-center cursor-pointer hover:bg-blue-100/70 transition-colors border-b border-blue-100"
                      onClick={() => setExpandedCategories(prev => ({ ...prev, [cat.id]: !isExpanded }))}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {isExpanded ? <ChevronUp size={18} className="text-blue-600" /> : <ChevronDown size={18} className="text-gray-400" />}
                        <span className="text-gray-900 font-bold text-xs sm:text-sm">{cat.name}</span>
                        {(cat.name === '기타/미지정' || cat.id === '') && (
                          <UnassignedBoxTooltip variant="badge" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-blue-700 bg-white/90 px-2 sm:px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                          {allCatItems.reduce((acc, item) => acc + getItemEffectiveCbm(item), 0).toFixed(2)} CBM
                        </span>
                        {displayedCategories.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveCategory(cat.id)
                            }}
                            title="이 공간 삭제 (비우기)"
                            className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 text-xs font-bold transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div>
                        {(cat.name === '기타/미지정' || cat.id === '') && (
                          <div className="px-3 py-1.5 bg-gray-50/80 border-b border-gray-200">
                            <UnassignedBoxTooltip variant="banner" className="w-full" />
                          </div>
                        )}
                        <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm text-left bg-white min-w-[560px] sm:min-w-0">
                          <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                            <tr>
                              <th className="whitespace-nowrap px-1.5 sm:px-2 py-1.5 font-semibold w-28 sm:w-36 md:w-44">품목</th>
                              <th className="whitespace-nowrap px-1.5 sm:px-2 py-1.5 font-semibold min-w-[160px] sm:min-w-[220px]">규격</th>
                              <th className="whitespace-nowrap px-1 sm:px-1.5 py-1.5 font-semibold w-11 sm:w-14 text-right">수량</th>
                              <th className="whitespace-nowrap px-1 sm:px-1.5 py-1.5 font-semibold w-13 sm:w-16 text-center">처리</th>
                              <th className="whitespace-nowrap px-1 sm:px-1.5 py-1.5 font-semibold w-14 sm:w-18 text-right">기본 CBM</th>
                              <th className="whitespace-nowrap px-1 sm:px-1.5 py-1.5 font-semibold w-14 sm:w-18 text-right">내품 CBM</th>
                              <th className="whitespace-nowrap px-0.5 sm:px-1 py-1.5 font-semibold w-7 sm:w-8 text-center">삭제</th>
                            </tr>
                          </thead>
                        <tbody>
                          {catItems.map((item) => {
                            const idx = items.findIndex(i => (i._uid ? i._uid === item._uid : i === item))
                            return (
                              <tr key={item._uid || idx} className="border-b last:border-0 hover:bg-blue-50/30 transition-colors">
                                <td className="px-1.5 sm:px-2 py-1">
                                  <input 
                                    type="text" 
                                    value={item.name} 
                                    onChange={e => {
                                      const newItems = [...items]
                                      newItems[idx].name = e.target.value
                                      setItems(newItems)
                                    }} 
                                    className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs sm:text-sm outline-none focus:border-blue-500 font-medium" 
                                    placeholder="직접입력" 
                                    autoComplete="off"
                                    spellCheck={false}
                                  />
                                </td>
                                <td className="px-1.5 sm:px-2 py-1">
                                  {(() => {
                                    // 해당 품목명(name)을 가진 기준정보 항목들을 찾음 (규격순 정렬)
                                    const availableSpecs = standardItems
                                      .filter(i => i.name === item.name)
                                      .sort((a, b) => (a.spec || '').localeCompare(b.spec || '', 'ko'))
                                    
                                    if (availableSpecs.length > 0) {
                                      return (
                                        <select
                                          value={item.spec || ''}
                                          title={item.spec || '규격 선택'}
                                          onChange={e => {
                                            const newItems = [...items]
                                            newItems[idx].spec = e.target.value
                                            
                                            // 선택된 규격에 해당하는 CBM 정보 가져오기
                                            const matched = availableSpecs.find(s => (s.spec || '기본') === e.target.value)
                                            if (matched) {
                                              newItems[idx].cbm = matched.defaultCbm
                                              newItems[idx].innerBoxCbm = matched.defaultInnerCbm
                                              // 규격을 처음 선택할 때 수량이 0이면 1로 자동 변경 (편의성)
                                              if (newItems[idx].quantity === 0) {
                                                newItems[idx].quantity = 1
                                              }
                                            }
                                            setItems(newItems)
                                          }}
                                          className="w-full rounded border border-gray-300 bg-white px-1.5 sm:px-2 py-1 text-xs sm:text-sm font-medium text-gray-800 outline-none focus:border-blue-500 cursor-pointer"
                                        >
                                          <option value="">규격 선택</option>
                                          {availableSpecs.map(s => (
                                            <option key={s.id} value={s.spec || '기본'}>
                                              {s.spec || '기본'} ({s.defaultCbm} CBM{(s.defaultInnerCbm || 0) > 0 ? ` + 내품 ${s.defaultInnerCbm}` : ''})
                                            </option>
                                          ))}
                                        </select>
                                      )
                                    }
                                    
                                    // 기준정보에 없는 직접 입력 항목인 경우 텍스트 입력창 유지
                                    return (
                                      <input 
                                        type="text" 
                                        value={item.spec || ''} 
                                        onChange={e => {
                                          const newItems = [...items]
                                          newItems[idx].spec = e.target.value
                                          setItems(newItems)
                                        }} 
                                        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs sm:text-sm outline-none focus:border-blue-500 font-medium" 
                                        placeholder="직접입력" 
                                        autoComplete="off"
                                        spellCheck={false}
                                      />
                                    )
                                  })()}
                                </td>
                                <td className="px-1 sm:px-1.5 py-1 text-right">
                                  <input 
                                    type="number" 
                                    min="0" 
                                    value={item.quantity !== undefined ? item.quantity : 1} 
                                    onChange={e => {
                                      const newItems = [...items]
                                      newItems[idx].quantity = e.target.value === '' ? 0 : parseInt(e.target.value)
                                      setItems(newItems)
                                    }} 
                                    onFocus={handleSelectAllOnFocus} 
                                    className="w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-xs sm:text-sm outline-none focus:border-blue-500 text-right font-bold text-gray-900" 
                                  />
                                </td>
                                <td className="px-1 py-1 text-center">
                                  <select
                                    value={item.treatment || '이동'}
                                    onChange={e => {
                                      const newItems = [...items]
                                      newItems[idx].treatment = e.target.value
                                      setItems(newItems)
                                    }}
                                    className={`w-full rounded border px-1 py-1 text-xs font-bold outline-none text-center cursor-pointer transition-colors ${
                                      (item.treatment || '이동') === '폐기' 
                                        ? 'bg-red-50 text-red-700 border-red-300'
                                        : (item.treatment || '이동') === '내림'
                                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                                        : (item.treatment || '이동') === '경유'
                                        ? 'bg-purple-50 text-purple-700 border-purple-300'
                                        : (item.treatment || '이동') === '존치'
                                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                                    }`}
                                  >
                                    <option value="이동">이동</option>
                                    <option value="폐기">폐기</option>
                                    <option value="내림">내림</option>
                                    <option value="경유">경유</option>
                                    <option value="존치">존치</option>
                                  </select>
                                </td>
                                <td className="px-1 sm:px-1.5 py-1">
                                  <div className="relative">
                                    <input 
                                      type="number" 
                                      step="0.01" 
                                      value={item.cbm} 
                                      onChange={e => {
                                        const newItems = [...items]
                                        newItems[idx].cbm = parseFloat(e.target.value) || 0
                                        setItems(newItems)
                                      }} 
                                      onFocus={handleSelectAllOnFocus} 
                                      title={isBaseCbmExcluded(item.treatment) ? `${item.treatment} 품목: 기본 CBM은 차량적재 합산에서 제외됩니다.` : undefined}
                                      className={`w-full rounded border px-1.5 py-1 text-xs sm:text-sm outline-none text-right transition-colors ${
                                        isBaseCbmExcluded(item.treatment)
                                          ? 'border-rose-300 bg-rose-50/70 text-rose-500 line-through decoration-rose-500 font-semibold focus:border-rose-500'
                                          : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500'
                                      }`} 
                                    />
                                    {isBaseCbmExcluded(item.treatment) && (
                                      <span className="text-[9px] sm:text-[10px] text-rose-600 block text-right font-bold mt-0.5 leading-none">
                                        합산제외
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-1 sm:px-1.5 py-1">
                                  <input 
                                    type="number" 
                                    step="0.01" 
                                    value={item.innerBoxCbm} 
                                    onChange={e => {
                                      const newItems = [...items]
                                      newItems[idx].innerBoxCbm = parseFloat(e.target.value) || 0
                                      setItems(newItems)
                                    }} 
                                    onFocus={handleSelectAllOnFocus} 
                                    className={`w-full rounded border px-1.5 py-1 text-xs sm:text-sm outline-none text-right transition-colors ${
                                      (Number(item.innerBoxCbm) || 0) > 0
                                        ? 'border-amber-300 bg-amber-50/80 text-amber-900 font-bold focus:border-amber-500'
                                        : 'border-gray-300 bg-white text-gray-700 focus:border-blue-500'
                                    }`} 
                                    title="장농, 서랍장 등 내부 짐을 옷 박스로 포장하기 위해 가산되는 내품 CBM"
                                  />
                                </td>
                                <td className="px-1 py-1 text-center">
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      const newItems = items.filter((_, i) => i !== idx)
                                      setItems(newItems)
                                    }} 
                                    className="text-red-500 hover:text-red-700 font-bold p-1 text-xs sm:text-sm"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                          {catItems.length === 0 && (
                            <tr className="border-b">
                              <td colSpan={7} className="px-3 py-3 text-center text-gray-400 text-xs">
                                {allCatItems.length > 0
                                  ? '필터 조건에 맞는 항목이 없습니다.'
                                  : '등록된 항목이 없습니다.'}
                              </td>
                            </tr>
                          )}
                          <tr className="bg-gray-50/80 border-t border-gray-200">
                            <td colSpan={7} className="px-2 sm:px-3 py-2">
                              <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
                                <button
                                  type="button"
                                  onClick={() => setQuickAddModalCat({ id: cat.id, name: cat.name })}
                                  className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                                >
                                  <PackagePlus size={14} />
                                  <span>+ 품목 빠른 검색·추가</span>
                                </button>

                                <select 
                                  className="min-w-[130px] sm:min-w-[170px] max-w-[210px] rounded-lg border-gray-300 border px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-semibold outline-none text-gray-800 bg-white focus:border-blue-500 cursor-pointer shadow-2xs"
                                  value={selectedItemNames[cat.id] || ''}
                                  onChange={(e) => {
                                    setSelectedItemNames(prev => ({ ...prev, [cat.id]: e.target.value }))
                                  }}
                                >
                                  <option value="">+ 드롭다운 선택</option>
                                  {(() => {
                                    // 1. 현재 위치(카테고리)와 일치하는 품목명 목록 (BOX 최상단 우선, 그 외 가나다순 정렬)
                                    const matchedNames = Array.from(new Set(
                                      standardItems
                                        .filter(i => cat.id ? i.locations?.some((l: any) => l.id === cat.id) : (!i.locations || i.locations.length === 0))
                                        .map(i => i.name)
                                    )).sort((a, b) => {
                                      const aBox = isBoxItem(a)
                                      const bBox = isBoxItem(b)
                                      if (aBox && !bBox) return -1
                                      if (!aBox && bBox) return 1
                                      return a.localeCompare(b, 'ko')
                                    })

                                    // 2. 미지정 품목(위치 미지정 또는 타 위치 포함) 중 matchedNames에 없는 품목명 목록 (BOX 최상단 우선, 그 외 가나다순)
                                    const otherNames = Array.from(new Set(
                                      standardItems
                                        .filter(i => !matchedNames.includes(i.name))
                                        .map(i => i.name)
                                    )).sort((a, b) => {
                                      const aBox = isBoxItem(a)
                                      const bBox = isBoxItem(b)
                                      if (aBox && !bBox) return -1
                                      if (!aBox && bBox) return 1
                                      return a.localeCompare(b, 'ko')
                                    })

                                    return (
                                      <>
                                        {matchedNames.length > 0 && (
                                          <optgroup label={`── ${cat.name || '현재 위치'} 지정 품목 ──`}>
                                            {matchedNames.map(name => (
                                              <option key={name} value={name}>{name}</option>
                                            ))}
                                          </optgroup>
                                        )}
                                        {otherNames.length > 0 && (
                                          <optgroup label="── 미지정 / 기타 품목 ──">
                                            {otherNames.map(name => (
                                              <option key={name} value={name}>{name}</option>
                                            ))}
                                          </optgroup>
                                        )}
                                      </>
                                    )
                                  })()}
                                </select>
                                
                                {selectedItemNames[cat.id] && (
                                  <select
                                    className="min-w-[150px] sm:min-w-[200px] max-w-[340px] rounded-lg border-blue-400 border px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-semibold outline-none text-blue-900 bg-blue-50/80 focus:border-blue-600 cursor-pointer shadow-2xs"
                                    value=""
                                    onChange={(e) => {
                                      if(!e.target.value) return;
                                      const stdItem = standardItems.find(i => i.id === e.target.value)
                                      if(stdItem) {
                                        handleAddStandardItemToCategory(cat.id, cat.name, stdItem)
                                        setSelectedItemNames(prev => ({ ...prev, [cat.id]: '' }))
                                      }
                                    }}
                                  >
                                    <option value="">+ 규격 선택</option>
                                    {standardItems
                                      .filter(i => i.name === selectedItemNames[cat.id])
                                      .sort((a, b) => (a.spec || '').localeCompare(b.spec || '', 'ko'))
                                      .map(i => (
                                        <option key={i.id} value={i.id}>
                                          {i.spec
                                            ? `${i.spec} (${i.defaultCbm} CBM${(i.defaultInnerCbm || 0) > 0 ? ` + 내품 ${i.defaultInnerCbm}` : ''})`
                                            : `기본 규격 (${i.defaultCbm} CBM${(i.defaultInnerCbm || 0) > 0 ? ` + 내품 ${i.defaultInnerCbm}` : ''})`}
                                        </option>
                                      ))}
                                  </select>
                                )}
                                <span className="text-gray-400 text-xs mx-0.5">또는</span>
                                <button 
                                  type="button" 
                                  onClick={() => setItems([...items, ensureItemUid({ locationId: cat.id, locationName: cat.name, name: '', spec: '', quantity: 1, treatment: '이동', cbm: 0, innerBoxCbm: 0 })])}
                                  className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-1.5 bg-white border border-blue-200 rounded-lg shadow-2xs hover:bg-blue-50 transition-colors"
                                >
                                  + 직접입력 추가
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* 새 공간(위치) 추가 */}
              {availableCategoriesToAdd.length > 0 && (
                <div className="flex items-center justify-center p-3 bg-gray-50/80 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700">+ 새 공간(위치) 추가:</span>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) handleAddCategory(e.target.value)
                      }}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-bold text-blue-600 outline-none focus:border-blue-500 cursor-pointer shadow-2xs hover:border-blue-400"
                    >
                      <option value="" disabled>공간 선택...</option>
                      {availableCategoriesToAdd.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          + {c.name} 추가
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* 테이블 모드용 품목 빠른 검색·추가 모달 */}
              {quickAddModalCat && (
                <ItemQuickAddModal
                  isOpen={Boolean(quickAddModalCat)}
                  onClose={() => setQuickAddModalCat(null)}
                  categoryId={quickAddModalCat.id}
                  categoryName={quickAddModalCat.name}
                  standardItems={standardItems}
                  currentCategoryItems={items.filter(i => (i.locationId || '') === quickAddModalCat.id)}
                  onAddItem={(stdItem) => handleAddStandardItemToCategory(quickAddModalCat.id, quickAddModalCat.name, stdItem)}
                  onAddCustomItem={(name, spec, cbm) => {
                    setItems(prev => [
                      ...prev,
                      ensureItemUid({
                        locationId: quickAddModalCat.id,
                        locationName: quickAddModalCat.name,
                        name,
                        spec,
                        quantity: 1,
                        cbm,
                        innerBoxCbm: 0,
                        treatment: '이동',
                      }),
                    ])
                  }}
                />
              )}
            </div>
            )}
            <input type="hidden" name="cbmItems" value={JSON.stringify(filterValidCbmItems(items))} />
          </div>

          <div className="pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* 인력 추가 */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <h3 className="font-bold text-gray-900 text-xs sm:text-sm">작업 인원</h3>
              </div>

              <div className="bg-blue-50 p-2.5 sm:p-3 rounded-lg border border-blue-100 mb-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-700">
                    구분: <strong>{movingType === 'P' ? '포장이사' : movingType === 'G' ? '일반이사' : '보관이사'}</strong>
                  </span>
                  <div className="flex items-center gap-1 text-[11px]">
                    {fromWorkTypes.concat(toWorkTypes).some(t => t === '수작업' || t === '계단') ? (
                      <span className="bg-orange-100 text-orange-700 font-semibold px-1.5 py-0.2 rounded border border-orange-200">
                        수작업/계단
                      </span>
                    ) : (
                      <span className="text-gray-500 bg-white px-1.5 py-0.2 rounded border border-gray-200">
                        기본
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-blue-900 font-bold">
                    적재량: {requiredCbm.toFixed(2)} CBM
                  </span>
                  <button 
                    type="button"
                    onClick={handleRecommendLabors}
                    className="px-2.5 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors shadow-2xs whitespace-nowrap"
                  >
                    최적 인원 추천
                  </button>
                </div>
                {laborRecommendationReason && (
                  <div className="text-[11px] text-blue-800 bg-white/80 p-1.5 rounded border border-blue-200 leading-tight font-medium">
                    💡 {laborRecommendationReason}
                  </div>
                )}
              </div>
              {labors.length > 0 && (
                <div className="border border-gray-200 rounded-lg mb-2 overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm text-left min-w-0">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                      <tr>
                        <th className="whitespace-nowrap px-2.5 py-1.5 font-medium">인력 구분</th>
                        <th className="whitespace-nowrap px-2 py-1.5 font-medium w-16 sm:w-20 text-right">인원(명)</th>
                        <th className="whitespace-nowrap px-1 py-1.5 font-medium w-8 text-center">삭제</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labors.map((labor, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-2.5 py-1.5">{labor.name}</td>
                          <td className="px-2 py-1">
                            <input type="number" min="1" value={labor.count} onChange={e => {
                              const newLabors = [...labors]
                              newLabors[idx].count = parseInt(e.target.value) || 1
                              setLabors(newLabors)
                            }} onFocus={handleSelectAllOnFocus} className="w-full rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs sm:text-sm outline-none focus:border-blue-500 text-right" />
                          </td>
                          <td className="px-1 py-1 text-center">
                            <button type="button" onClick={() => setLabors(labors.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 font-bold text-xs">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <select 
                className="w-full rounded-lg border-gray-300 border px-2.5 py-1.5 text-xs sm:text-sm outline-none text-gray-700 bg-gray-50 focus:border-blue-500 cursor-pointer"
                onChange={(e) => {
                  if(!e.target.value) return;
                  const item = standardLabors.find(i => i.id === e.target.value)
                  if(item && !labors.find(l => l.id === item.id)) {
                    setLabors([...labors, { id: item.id, name: item.name, cost: item.defaultCost, count: 1 }])
                  }
                  e.target.value = ''
                }}
              >
                <option value="">+ 인력 추가</option>
                {standardLabors.map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
              <input type="hidden" name="labors" value={JSON.stringify(labors)} />
            </div>

            {/* 차량 추가 */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <h3 className="font-bold text-gray-900 text-xs sm:text-sm">투입 차량</h3>
              </div>
              
              <div className="bg-blue-50 p-2.5 sm:p-3 rounded-lg border border-blue-100 mb-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-700">산출 CBM: <strong>{totalCbm.toFixed(2)}</strong></span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600 text-xs">데드스페이스</span>
                    <input 
                      type="number" 
                      value={deadSpaceRatio} 
                      onChange={e => setDeadSpaceRatio(Number(e.target.value))} 
                      className="w-12 rounded border border-gray-300 px-1 py-0.5 text-xs text-right outline-none focus:border-blue-500" 
                    />
                    <span className="text-gray-600 text-xs">%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-blue-900 font-bold">필요 적재 CBM: {requiredCbm.toFixed(2)}</span>
                  <button 
                    type="button"
                    onClick={handleRecommendVehicles}
                    className="px-2.5 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors shadow-2xs whitespace-nowrap"
                  >
                    최적 차량 추천
                  </button>
                </div>
              </div>

              {vehicles.length > 0 && (
                <div className="border border-gray-200 rounded-lg mb-2 overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm text-left min-w-0">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                      <tr>
                        <th className="whitespace-nowrap px-2.5 py-1.5 font-medium">차량 구분</th>
                        <th className="whitespace-nowrap px-2 py-1.5 font-medium w-16 sm:w-20 text-right">대수</th>
                        <th className="whitespace-nowrap px-1 py-1.5 font-medium w-8 text-center">삭제</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map((vehicle, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-2.5 py-1.5">
                            <div>{vehicle.name}</div>
                            {(() => {
                              const sv = standardVehicles.find(s => s.id === vehicle.id) || vehicle;
                              if ((sv.maxCbm || 0) > 0) {
                                const effective = sv.maxCbm / (1 + deadSpaceRatio / 100);
                                return <div className="text-[11px] text-gray-500 mt-0.5">실적재: {(effective * (vehicle.count || 1)).toFixed(1)} CBM</div>
                              }
                              return null;
                            })()}
                          </td>
                          <td className="px-2 py-1">
                            <input type="number" min="1" value={vehicle.count} onChange={e => {
                              const newVehicles = [...vehicles]
                              newVehicles[idx].count = parseInt(e.target.value) || 1
                              setVehicles(newVehicles)
                            }} onFocus={handleSelectAllOnFocus} className="w-full rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs sm:text-sm outline-none focus:border-blue-500 text-right" />
                          </td>
                          <td className="px-1 py-1 text-center">
                            <button type="button" onClick={() => setVehicles(vehicles.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 font-bold text-xs">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <select 
                className="w-full rounded-lg border-gray-300 border px-2.5 py-1.5 text-xs sm:text-sm outline-none text-gray-700 bg-gray-50 focus:border-blue-500 cursor-pointer"
                onChange={(e) => {
                  if(!e.target.value) return;
                  const item = standardVehicles.find(i => i.id === e.target.value)
                  if(item && !vehicles.find(v => v.id === item.id)) {
                    setVehicles([...vehicles, { id: item.id, name: item.name, cost: item.defaultCost, count: 1 }])
                  }
                  e.target.value = ''
                }}
              >
                <option value="">+ 차량 추가</option>
                {standardVehicles.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name} {(i.maxCbm || 0) > 0 ? `(실적재: ${(i.maxCbm / (1 + deadSpaceRatio / 100)).toFixed(1)} CBM)` : ''}
                  </option>
                ))}
              </select>

              {/* 이삿날 배차 호차 및 담당 팀장 지정 */}
              <div className="mt-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1">
                    🚚 이삿날 배차 호차 · 담당 팀장 배정
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    (dispatchInfo.assignedVehicles?.length > 0 || dispatchInfo.teamLeader?.trim())
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {(dispatchInfo.assignedVehicles?.length > 0 || dispatchInfo.teamLeader?.trim()) ? '배차 지정됨' : '미지정 (추후 배차 가능)'}
                  </span>
                </div>

                {/* 등록된 자사 차량(호차) 원클릭 선택 */}
                {standardVehicles.filter((sv: any) => sv.ownership !== 'STANDARD').length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {standardVehicles
                      .filter((sv: any) => sv.ownership !== 'STANDARD')
                      .map((sv: any) => {
                        const isSelected = (dispatchInfo.assignedVehicles || []).some((av: any) => av.vehicleId === sv.id)
                        return (
                          <button
                            key={sv.id}
                            type="button"
                            onClick={() => {
                              const curList = Array.isArray(dispatchInfo.assignedVehicles) ? dispatchInfo.assignedVehicles : []
                              const nextList = isSelected
                                ? curList.filter((av: any) => av.vehicleId !== sv.id)
                                : [
                                    ...curList,
                                    {
                                      vehicleId: sv.id,
                                      name: sv.name,
                                      vehicleNo: sv.vehicleNo || '',
                                      tonnage: sv.tonnage || 5,
                                      ownership: 'OWN'
                                    }
                                  ]
                              const nextLeader =
                                !isSelected && !dispatchInfo.teamLeader?.trim() && sv.teamLeader
                                  ? sv.teamLeader
                                  : dispatchInfo.teamLeader
                              const nextPhone =
                                !isSelected && !dispatchInfo.leaderPhone?.trim() && sv.leaderPhone
                                  ? formatPhoneNumber(sv.leaderPhone)
                                  : dispatchInfo.leaderPhone
                              setDispatchInfo({
                                ...dispatchInfo,
                                assignedVehicles: nextList,
                                teamLeader: nextLeader,
                                leaderPhone: nextPhone
                              })
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
                            }`}
                          >
                            <span>{sv.name}</span>
                            {sv.vehicleNo && (
                              <span className={`px-1 py-0.2 rounded text-[10px] font-black ${
                                isSelected ? 'bg-amber-300 text-gray-950' : 'bg-amber-100 text-amber-900'
                              }`}>
                                {sv.vehicleNo}
                              </span>
                            )}
                            {sv.teamLeader && (
                              <span className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-blue-600'}`}>
                                ({sv.teamLeader})
                              </span>
                            )}
                          </button>
                        )
                      })}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-0.5">담당 팀장명</label>
                    <input
                      type="text"
                      value={dispatchInfo.teamLeader || ''}
                      onChange={e => setDispatchInfo({ ...dispatchInfo, teamLeader: e.target.value })}
                      placeholder="예: 김철수 팀장"
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-bold text-gray-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-0.5">팀장 연락처</label>
                    <input
                      type="tel"
                      maxLength={13}
                      value={dispatchInfo.leaderPhone || ''}
                      onFocus={handleSelectAllOnFocus}
                      onChange={e =>
                        handlePhoneInputChange(e, val =>
                          setDispatchInfo({ ...dispatchInfo, leaderPhone: val })
                        )
                      }
                      placeholder="010-0000-0000"
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    value={dispatchInfo.dispatchMemo || ''}
                    onChange={e => setDispatchInfo({ ...dispatchInfo, dispatchMemo: e.target.value })}
                    placeholder="배차/현장 메모 (예: 07:30 현장 집결, 외주 1톤 추가 예정)"
                    className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-800 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <input type="hidden" name="vehicles" value={JSON.stringify(vehicles)} />
            </div>
          </div>
        </div>

        {/* 이사 비용 및 결제 플랜 통합 섹션 */}
        <div className="bg-white p-3 sm:p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2 gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-blue-600">이사 비용 및 결제 플랜</h2>
              <button
                type="button"
                onClick={handleOpenCostModal}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 ${
                  isPastMovingDate 
                    ? 'bg-gray-400 hover:bg-gray-500 text-white opacity-70 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                }`}
                title={
                  isPastMovingDate 
                    ? `이사날짜(${movingDate ? format(movingDate, 'yyyy-MM-dd') : ''})가 지난 건은 이사비용 산출이 비활성화됩니다.`
                    : "CBM별 가이드, 캘린더 할증, 특수물품 분해조립 비용을 종합하여 이사비용 산출"
                }
              >
                <Calculator size={12} />
                <span>이사비용 산출</span>
                {isPastMovingDate && <span className="text-[10px] bg-gray-600 px-1 rounded ml-0.5">기한만료</span>}
              </button>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
              <span className="font-bold text-gray-600">결제 기준:</span>
              <label className="flex items-center gap-1 cursor-pointer font-medium text-gray-800 hover:text-blue-600 whitespace-nowrap">
                <input 
                  type="radio" 
                  name="paymentTarget" 
                  checked={paymentTarget === 'supply'} 
                  onChange={() => setPaymentTarget('supply')} 
                  className="w-3.5 h-3.5 text-blue-600" 
                />
                공급가액
              </label>
              <label className="flex items-center gap-1 cursor-pointer font-medium text-gray-800 hover:text-blue-600 whitespace-nowrap">
                <input 
                  type="radio" 
                  name="paymentTarget" 
                  checked={paymentTarget === 'total'} 
                  onChange={() => setPaymentTarget('total')} 
                  className="w-3.5 h-3.5 text-blue-600" 
                />
                공급대가
              </label>
            </div>
          </div>

          {/* 1. 비용 입력 (태블릿/PC에서 4열 1줄로 나란히 표시) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">기본 이사 비용</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (isPastMovingDate) {
                        alert('이사날짜가 오늘 이전으로 이미 경과한 견적서는 이사비용을 재산출할 수 없습니다.')
                        return
                      }
                      setIsCostCalculatorModalOpen(true)
                    }}
                    className={`text-[11px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded shadow-2xs border transition-colors ${
                      isPastMovingDate 
                        ? 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed' 
                        : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300 active:scale-95'
                    }`}
                    title={isPastMovingDate ? "이사날짜가 경과하여 산출이 불가합니다." : "원가 기반 비용 산출 시뮬레이터"}
                  >
                    <Coins size={11} className={isPastMovingDate ? 'text-gray-400' : 'text-amber-600'} />
                    <span>원가산출</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCostModal}
                    className={`text-[11px] font-bold flex items-center gap-0.5 ${
                      isPastMovingDate 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-blue-600 hover:text-blue-800 hover:underline'
                    }`}
                    title={isPastMovingDate ? "이사날짜가 경과하여 산출이 불가합니다." : "CBM 기준 운임 가이드 산출"}
                  >
                    <Calculator size={11} />
                    <span>산출</span>
                  </button>
                </div>
              </div>
              <NumberInput name="movingCost" value={movingCost} onChange={v => { setMovingCost(v); setIsCostEdited(true); }} className="block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs sm:text-sm text-right outline-none focus:border-blue-500 font-semibold" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap mb-1">가산비용 내역</label>
              <NumberInput 
                name="additionalCost" 
                value={additionalCost} 
                onChange={v => { 
                  setAdditionalCost(v); 
                  setIsCostEdited(true); 
                  if (v === 0) {
                    setAppliedLadderCost(0);
                    setAppliedDistanceCost(0);
                  }
                }} 
                className="block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs sm:text-sm text-right outline-none focus:border-blue-500" 
              />
              {/* 산출 가산운임 반영 버튼 및 내역 (한 가지로 통합) */}
              {(totalLadderCost > 0 || calculatedExtraCost > 0) && (
                <div className="mt-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={handleApplyAllAdditionalCosts}
                    className={`text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 transition-colors w-full justify-center border shadow-2xs whitespace-nowrap ${
                      isAllApplied
                        ? 'bg-amber-100/80 text-amber-900 border-amber-300 hover:bg-amber-200/80'
                        : 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'
                    }`}
                    title="산출된 사다리차 및 거리가산 운임 일괄 반영"
                  >
                    {isAllApplied ? <CheckCircle2 size={11} className="text-amber-800" /> : <Plus size={11} />}
                    <span>
                      {isAllApplied 
                        ? `가산반영완료 (+${totalExtraCost.toLocaleString()}원)` 
                        : `산출가산 (+${totalExtraCost.toLocaleString()}원)`}
                    </span>
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap mb-1">보관 비용</label>
              <NumberInput name="storageCost" value={storageCost} onChange={v => { setStorageCost(v); setIsCostEdited(true); }} className="block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs sm:text-sm text-right outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap mb-1">부가세</label>
              <NumberInput name="vat" value={vat} onChange={setVat} className="block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs sm:text-sm text-right outline-none focus:border-blue-500" />
            </div>
          </div>

          {/* 2. 합계 금액 바 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 bg-blue-50/70 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-blue-100">
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-1">
                <span className="text-gray-600 font-medium whitespace-nowrap">공급가액:</span>
                <span className="font-bold text-gray-800">{supplyAmount.toLocaleString()} 원</span>
              </div>
              <span className="text-gray-300 hidden sm:inline">|</span>
              <div className="flex items-center gap-1">
                <span className="text-blue-900 font-bold whitespace-nowrap">총 합계(공급대가):</span>
                <span className="text-sm sm:text-base font-black text-blue-700">{totalAmount.toLocaleString()} 원</span>
              </div>
              <input type="hidden" name="totalAmount" value={totalAmount} />
            </div>
            <div className="text-xs sm:text-sm font-bold text-gray-700 text-right border-t sm:border-t-0 pt-1 sm:pt-0 border-blue-200">
              결제 대상: <span className="text-blue-700 font-black">{targetAmount.toLocaleString()} 원</span>
            </div>
          </div>

          {/* 3. 결제 플랜 테이블 (계약금, 중도금, 잔금) */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs sm:text-sm border-collapse min-w-0">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold">
                <tr>
                  <th className="px-2.5 py-1.5 text-left w-14 sm:w-16 whitespace-nowrap">구분</th>
                  <th className="px-2.5 py-1.5 text-right whitespace-nowrap">금액 (원)</th>
                  <th className="px-2 py-1.5 text-center w-28 sm:w-36 whitespace-nowrap">일자</th>
                  <th className="px-2 py-1.5 text-center w-20 sm:w-24 whitespace-nowrap">입금 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {/* 계약금 */}
                <tr className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-2.5 py-1.5 font-bold text-gray-800 whitespace-nowrap">계약금</td>
                  <td className="px-2.5 py-1">
                    <NumberInput value={downPayment} onChange={setDownPayment} className="w-full h-7 sm:h-8 rounded border border-gray-300 px-2 text-right text-xs sm:text-sm font-semibold outline-none focus:border-blue-500" />
                  </td>
                  <td className="px-2 py-1">
                    <CustomDatePicker selected={downPaymentDate} onChange={setDownPaymentDate} className="w-full h-7 sm:h-8 rounded border border-gray-300 px-1.5 text-xs outline-none focus:border-blue-500" />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <label className={`inline-flex items-center gap-1 px-2 h-7 sm:h-8 rounded-md text-xs font-semibold cursor-pointer transition-all border whitespace-nowrap ${downPaymentPaid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                      <input type="checkbox" checked={downPaymentPaid} onChange={e => setDownPaymentPaid(e.target.checked)} className="rounded text-green-600 focus:ring-green-500 w-3 h-3" />
                      <span>{downPaymentPaid ? '입금완료' : '미입금'}</span>
                    </label>
                  </td>
                </tr>
                {/* 중도금 */}
                <tr className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-2.5 py-1.5 font-bold text-gray-800 whitespace-nowrap">중도금</td>
                  <td className="px-2.5 py-1">
                    <NumberInput value={intermediatePayment} onChange={setIntermediatePayment} className="w-full h-7 sm:h-8 rounded border border-gray-300 px-2 text-right text-xs sm:text-sm font-semibold outline-none focus:border-blue-500" />
                  </td>
                  <td className="px-2 py-1">
                    <CustomDatePicker selected={intermediateDate} onChange={setIntermediateDate} className="w-full h-7 sm:h-8 rounded border border-gray-300 px-1.5 text-xs outline-none focus:border-blue-500" />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <label className={`inline-flex items-center gap-1 px-2 h-7 sm:h-8 rounded-md text-xs font-semibold cursor-pointer transition-all border whitespace-nowrap ${intermediatePaymentPaid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                      <input type="checkbox" checked={intermediatePaymentPaid} onChange={e => setIntermediatePaymentPaid(e.target.checked)} className="rounded text-green-600 focus:ring-green-500 w-3 h-3" />
                      <span>{intermediatePaymentPaid ? '입금완료' : '미입금'}</span>
                    </label>
                  </td>
                </tr>
                {/* 잔금 */}
                <tr className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-2.5 py-1.5 font-bold text-gray-800 whitespace-nowrap">잔금</td>
                  <td className="px-2.5 py-1">
                    <NumberInput value={balance} onChange={setBalance} className="w-full h-7 sm:h-8 rounded border border-gray-300 px-2 text-right text-xs sm:text-sm font-semibold outline-none focus:border-blue-500" />
                  </td>
                  <td className="px-2 py-1">
                    <CustomDatePicker selected={balanceDate} onChange={setBalanceDate} className="w-full h-7 sm:h-8 rounded border border-gray-300 px-1.5 text-xs outline-none focus:border-blue-500" />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <label className={`inline-flex items-center gap-1 px-2 h-7 sm:h-8 rounded-md text-xs font-semibold cursor-pointer transition-all border whitespace-nowrap ${balancePaid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                      <input type="checkbox" checked={balancePaid} onChange={e => setBalancePaid(e.target.checked)} className="rounded text-green-600 focus:ring-green-500 w-3 h-3" />
                      <span>{balancePaid ? '입금완료' : '미입금'}</span>
                    </label>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 4. 미할당 잔액 안내 바 */}
          <div className="flex items-center justify-between bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs sm:text-sm">
            <span className="text-gray-700 font-medium whitespace-nowrap">남은 잔액 (미할당 금액)</span>
            <span className={`font-bold text-xs sm:text-sm md:text-base ${remainingAmount === 0 ? 'text-green-600' : remainingAmount < 0 ? 'text-red-600' : 'text-blue-600'}`}>
              {remainingAmount.toLocaleString()} 원
            </span>
          </div>

          <input type="hidden" name="paymentPlan" value={JSON.stringify({ targetType: paymentTarget, targetAmount, downPayment, downPaymentDate: downPaymentDate ? format(downPaymentDate, 'yyyy-MM-dd') : '', downPaymentPaid, intermediatePayment, intermediateDate: intermediateDate ? format(intermediateDate, 'yyyy-MM-dd') : '', intermediatePaymentPaid, balance, balanceDate: balanceDate ? format(balanceDate, 'yyyy-MM-dd') : '', balancePaid, remainingAmount })} />
        </div>

        {/* 고객 서명 */}
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 space-y-2">
          <div className="flex justify-between items-center border-b pb-1.5">
            <h2 className="text-base sm:text-lg font-bold text-blue-600">고객 서명</h2>
            {!isSigning && signature ? (
              <button type="button" onClick={() => { setIsSigning(true); setSignature(''); }} className="text-xs text-red-600 hover:text-red-800 font-medium px-2.5 py-1 bg-red-50 rounded-lg">서명 다시하기</button>
            ) : (
              <button type="button" onClick={() => { sigCanvas.current?.clear(); setSignature(''); }} className="text-xs text-gray-600 hover:text-gray-800 font-medium px-2.5 py-1 bg-gray-100 rounded-lg">초기화</button>
            )}
          </div>
          
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 h-24 sm:h-28 relative touch-none">
            {isSigning ? (
              <SignatureCanvas 
                ref={sigCanvas}
                canvasProps={{ className: 'w-full h-full touch-none cursor-crosshair' }}
                onEnd={() => setSignature(sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png'))}
              />
            ) : (
              signature && <img src={signature} alt="고객 서명" className="h-full max-w-full object-contain mx-auto p-2" />
            )}
          </div>
          <input type="hidden" name="signature" value={signature} />
        </div>

        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t p-2.5 sm:p-3 shadow-lg flex justify-end gap-2.5 sm:gap-3 z-20">
          <button 
            type="button" 
            onClick={() => {
              if (confirm('견적 작성을 중단하고 목록으로 이동하시겠습니까?\n(작성 중이던 내용은 안전하게 임시 보관됩니다)')) {
                window.location.href = '/estimates'
              }
            }}
            className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors text-xs sm:text-sm"
          >
            취소
          </button>
          <button type="submit" className="px-4 sm:px-6 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md text-xs sm:text-sm">견적 저장하기</button>
        </div>
      </form>

      {/* 우편번호 검색 모달 */}
      {postcodeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPostcodeOpen(false)}>
          <div className="bg-white p-4 rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">주소 검색</h3>
              <button type="button" onClick={() => setPostcodeOpen(false)} className="text-gray-500 hover:text-gray-800 font-bold text-xl">✕</button>
            </div>
            <DaumPostcodeEmbed onComplete={handleComplete} autoClose={false} />
          </div>
        </div>
      )}

      {/* CBM 계산기 모달 */}
      {isCbmCalculatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsCbmCalculatorOpen(false)}>
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-bold text-lg text-gray-900">CBM 계산기</h3>
              <button type="button" onClick={() => setIsCbmCalculatorOpen(false)} className="text-gray-500 hover:text-gray-800 font-bold text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">가로 (cm)</label>
                <input type="number" value={cbmLength} onChange={e => setCbmLength(e.target.value ? Number(e.target.value) : '')} onFocus={handleSelectAllOnFocus} className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500" placeholder="예: 100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">세로 (cm)</label>
                <input type="number" value={cbmWidth} onChange={e => setCbmWidth(e.target.value ? Number(e.target.value) : '')} onFocus={handleSelectAllOnFocus} className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500" placeholder="예: 50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">높이 (cm)</label>
                <input type="number" value={cbmHeight} onChange={e => setCbmHeight(e.target.value ? Number(e.target.value) : '')} onFocus={handleSelectAllOnFocus} className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500" placeholder="예: 200" />
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="font-medium text-gray-700">계산 결과</span>
                <span className="text-xl font-bold text-blue-600">
                  {Number(cbmLength) > 0 && Number(cbmWidth) > 0 && Number(cbmHeight) > 0 
                    ? ((Number(cbmLength) * Number(cbmWidth) * Number(cbmHeight)) / 1000000).toFixed(3)
                    : '0.000'} <span className="text-sm">CBM</span>
                </span>
              </div>
              <button type="button" onClick={() => setIsCbmCalculatorOpen(false)} className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-700 mt-2 transition-colors">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이사비용 산출 시뮬레이터 모달 */}
      {isCostModalOpen && (
        <MovingCostCalculatorModal
          isOpen={isCostModalOpen}
          onClose={() => setIsCostModalOpen(false)}
          currentCbm={totalCbm}
          movingDate={movingDate}
          currentMovingCost={movingCost}
          distanceKm={distance}
          roundTollFare={roundTollFare}
          vehicleCount={vehicles.reduce((sum, v) => sum + (Number(v.count) || 0), 0) || 1}
          waypointCount={waypointCount}
          onApply={(calculatedCost) => {
            setMovingCost(calculatedCost)
            setIsCostEdited(true)
            const newSupply = calculatedCost + additionalCost + storageCost
            const newVat = Math.floor(newSupply * 0.1)
            const newTotal = newSupply + newVat
            const newTarget = paymentTarget === 'supply' ? newSupply : newTotal
            const newBalance = Math.max(0, newTarget - downPayment - intermediatePayment)
            setBalance(newBalance)
            alert(`산출된 이사비용 (${calculatedCost.toLocaleString()}원)이 기본 이사 비용에 반영되었습니다!\n(총 공급대가: ${newTotal.toLocaleString()}원 / 잔금: ${newBalance.toLocaleString()}원)`)
          }}
        />
      )}

      {/* 원가 기반 이사비용 산출 시뮬레이터 모달 */}
      {isCostCalculatorModalOpen && (() => {
        // DB 인건비 기준정보(standardLabors)에서 남성/여성 기본 일당 추출
        const dbMaleLabor = standardLabors.find((l: any) => (l.name || '').includes('남')) || standardLabors[0]
        const dbFemaleLabor = standardLabors.find((l: any) => (l.name || '').includes('여') || (l.name || '').includes('주방')) || standardLabors.find((l: any) => l.id !== dbMaleLabor?.id)

        // 현재 견적서 설정 인력(labors)에서 단가 및 인원수 추출 (직접 수정한 경우 최우선 반영)
        const hasLabors = labors && labors.length > 0
        const currentMaleLabor = hasLabors ? labors.find((l: any) => (l.name || '').includes('남') || (l.name || '').includes('팀장')) : undefined
        const currentFemaleLabor = hasLabors ? labors.find((l: any) => (l.name || '').includes('여') || (l.name || '').includes('도우미') || (l.name || '').includes('주방')) : undefined

        const menUnitPrice = currentMaleLabor?.cost || costStandardsData?.maleLaborCost || dbMaleLabor?.defaultCost || 190000
        const womenUnitPrice = currentFemaleLabor?.cost || costStandardsData?.femaleLaborCost || dbFemaleLabor?.defaultCost || 170000

        const menCount = hasLabors
          ? labors.filter((l: any) => (l.name || '').includes('남') || (l.name || '').includes('팀장')).reduce((sum: number, cur: any) => sum + (Number(cur.count) || 0), 0)
          : 3
        const womenCount = hasLabors
          ? labors.filter((l: any) => (l.name || '').includes('여') || (l.name || '').includes('도우미') || (l.name || '').includes('주방')).reduce((sum: number, cur: any) => sum + (Number(cur.count) || 0), 0)
          : 1

        return (
          <CostCalculatorModal
            isOpen={isCostCalculatorModalOpen}
            onClose={() => setIsCostCalculatorModalOpen(false)}
            distanceKm={distance}
            tollFare={tollFare}
            roundTollFare={roundTollFare}
            movingType={movingType}
            menCount={menCount}
            womenCount={womenCount}
            menUnitPrice={menUnitPrice}
            womenUnitPrice={womenUnitPrice}
            vehicles={vehicles}
            ladderTotalCost={totalLadderCost}
            waypointCount={waypointCount}
            costStandards={costStandardsData}
            onApply={(calculatedCost) => {
              setMovingCost(calculatedCost)
              setIsCostEdited(true)
              const newSupply = calculatedCost + additionalCost + storageCost
              const newVat = Math.floor(newSupply * 0.1)
              const newTotal = newSupply + newVat
              const newTarget = paymentTarget === 'supply' ? newSupply : newTotal
              const newBalance = Math.max(0, newTarget - downPayment - intermediatePayment)
              setBalance(newBalance)
              alert(`원가 기반 산출 이사비용 (${calculatedCost.toLocaleString()}원)이 기본 이사 비용에 반영되었습니다!\n(총 공급대가: ${newTotal.toLocaleString()}원 / 잔금: ${newBalance.toLocaleString()}원)`)
            }}
          />
        )
      })()}

      {/* AI 영상·사진 CBM 자동 견적 모달 */}
      {isAiModalOpen && (
        <AiCbmEstimateModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          locations={categories}
          standardItems={standardItems}
          onApplyToEstimate={handleApplyAiItems}
          onStartBackgroundAnalysis={handleStartBackgroundAnalysis}
        />
      )}

      {/* 평형별 표준 템플릿 모달 */}
      {isPresetModalOpen && (
        <EstimatePresetModal
          isOpen={isPresetModalOpen}
          onClose={() => setIsPresetModalOpen(false)}
          onApplyPreset={handleApplyPreset}
          currentItemsCount={items.filter(it => (Number(it.quantity) || 0) > 0).length}
        />
      )}
    </div>
  )
}
