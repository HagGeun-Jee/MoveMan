'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
const SignatureCanvas = dynamic(() => import('react-signature-canvas'), { ssr: false }) as any
import { getStandardItems, getLocationCategories } from '@/app/actions/item'
import { getVehicles } from '@/app/actions/vehicle'
import { getLabors } from '@/app/actions/labor'
import { getDistance } from '@/app/actions/distance'
import { getLadderFares } from '@/app/actions/ladder'
import type { LadderFareItem } from '@/types/ladder'
import DaumPostcodeEmbed from 'react-daum-postcode'
import { MapPin, Search, ChevronDown, ChevronUp, Navigation, RefreshCw, Car, AlertCircle, CheckCircle2, Calculator, Truck, Plus } from 'lucide-react'
import { CustomDatePicker } from '@/components/CustomDatePicker'
import { format } from 'date-fns'
import { formatPhoneNumber, handleSelectAllOnFocus } from '@/lib/format'

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

const filterValidCbmItems = (itemsList: any[]): any[] => {
  if (!Array.isArray(itemsList)) return []
  return itemsList.filter((item: any) => {
    const qty = item.quantity !== undefined ? Number(item.quantity) : 1
    const unitCbm = (Number(item.cbm) || 0) + (Number(item.innerBoxCbm) || 0)
    return unitCbm > 0 && qty > 0
  })
}

const parseAndFilterCbmItems = (cbmItemsStr: string | null | undefined): any[] => {
  if (!cbmItemsStr) return []
  try {
    const parsed = JSON.parse(cbmItemsStr)
    return filterValidCbmItems(parsed)
  } catch {
    return []
  }
}

export function EstimateForm({ 
  initialData, 
  action, 
  title = "새 견적 작성" 
}: { 
  initialData?: any, 
  action: (formData: FormData) => Promise<void>,
  title?: string
}) {
  const envObj = initialData?.environment ? JSON.parse(initialData.environment) : {}
  const payPlanObj = initialData?.paymentPlan ? JSON.parse(initialData.paymentPlan) : {}

  const [movingCost, setMovingCost] = useState(initialData?.movingCost || 0)
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

  // 거리 초과 운임 계산 설정 (기본거리 10km, km당 2,000원)
  const [baseDistanceKm, setBaseDistanceKm] = useState<number>(Number(envObj.baseDistanceKm) || 10)
  const [ratePerKm, setRatePerKm] = useState<number>(Number(envObj.ratePerKm) || 2000)

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
        setDistanceNotice(`거리 계산 완료: ${res.distanceKm}km (${res.durationText})`)
        setTimeout(() => setDistanceNotice(null), 4000)
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

  // 거리 초과 가산 요금 계산
  const extraDistanceKm = Math.max(0, Math.round((distance - baseDistanceKm) * 10) / 10)
  const calculatedExtraCost = Math.round(extraDistanceKm * ratePerKm)

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
      alert(`기본 거리(${baseDistanceKm}km) 이하이므로 추가 운임이 없습니다.`)
      return
    }

    if (appliedDistanceCost === calculatedExtraCost) {
      alert(`이미 거리 초과 운임 (${calculatedExtraCost.toLocaleString()}원)이 가산 비용에 반영되어 있습니다. (중복 가산되지 않습니다)`)
      return
    }

    const diff = calculatedExtraCost - appliedDistanceCost
    setAdditionalCost((prev: number) => Math.max(0, (Number(prev) || 0) + diff))
    setAppliedDistanceCost(calculatedExtraCost)
    setIsCostEdited(true)

    if (appliedDistanceCost > 0) {
      alert(`거리 초과 운임이 변경되어 가산 비용에 갱신되었습니다!\n(기존: ${appliedDistanceCost.toLocaleString()}원 → 변경: ${calculatedExtraCost.toLocaleString()}원 / 차액: ${diff > 0 ? '+' : ''}${diff.toLocaleString()}원)`)
    } else {
      alert(`거리 초과 운임(${extraDistanceKm}km 초과 × ${ratePerKm.toLocaleString()}원 = ${calculatedExtraCost.toLocaleString()}원)이 가산 비용에 반영되었습니다!`)
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

  const [items, setItems] = useState<any[]>(() => parseAndFilterCbmItems(initialData?.cbmItems))
  const [standardItems, setStandardItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  
  const [vehicles, setVehicles] = useState<any[]>(envObj.vehicles || [])
  const [standardVehicles, setStandardVehicles] = useState<any[]>([])

  const [labors, setLabors] = useState<any[]>(envObj.labors || [])
  const [standardLabors, setStandardLabors] = useState<any[]>([])

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [selectedItemNames, setSelectedItemNames] = useState<Record<string, string>>({})

  const [isCbmCalculatorOpen, setIsCbmCalculatorOpen] = useState(false)
  const [cbmLength, setCbmLength] = useState<number | ''>('')
  const [cbmWidth, setCbmWidth] = useState<number | ''>('')
  const [cbmHeight, setCbmHeight] = useState<number | ''>('')

  const [deadSpaceRatio, setDeadSpaceRatio] = useState(20)
  const totalCbm = items.reduce((acc, item) => acc + ((Number(item.cbm) || 0) + (Number(item.innerBoxCbm) || 0)) * (item.quantity !== undefined ? Number(item.quantity) : 1), 0)
  const requiredCbm = totalCbm * (1 + deadSpaceRatio / 100)

  const handleRecommendVehicles = () => {
    const valid = standardVehicles.filter(v => (v.maxCbm || 0) > 0)
    if (valid.length === 0) {
      alert("차량 기초정보에 최대 CBM이 설정된 차량이 없습니다. 차량정보 관리에서 먼저 설정해주세요.")
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

    const cbm = requiredCbm
    if (cbm <= 0) {
      setLabors([])
      setLaborRecommendationReason('물품 CBM이 0이므로 작업 인원이 초기화되었습니다.')
      return
    }

    // 1. 기본 인원 산출 (CBM 및 이사종류 기준)
    const isPacking = movingType === 'P' || (movingType === 'K' && organizeStatus === '정리')
    let baseMale = 0
    let baseFemale = 0

    if (cbm < 6) {
      // 1톤 이하 원룸/소형
      baseMale = 1
      baseFemale = 0
    } else if (cbm < 14) {
      // 1톤~1.5톤
      baseMale = 2
      baseFemale = isPacking ? 1 : 0
    } else if (cbm < 24) {
      // 2.5톤 내외
      baseMale = 2
      baseFemale = isPacking ? 1 : 0
    } else if (cbm < 35) {
      // 5톤 표준 (20~30평대 아파트)
      baseMale = 3
      baseFemale = isPacking ? 1 : 0
    } else if (cbm < 48) {
      // 6톤~7.5톤
      baseMale = 4
      baseFemale = isPacking ? 1 : 0
    } else if (cbm < 65) {
      // 8톤~10톤 대형
      baseMale = 5
      baseFemale = isPacking ? 2 : 1
    } else {
      // 10톤 초과
      baseMale = 5 + Math.ceil((cbm - 65) / 15)
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
    let reasonText = `${moveTypeName} ${cbm.toFixed(1)} CBM 기준 남성 ${baseMale}명${baseFemale > 0 ? `, 여성 ${baseFemale}명` : ''}`
    if (reasons.length > 0) {
      reasonText += ` (환경: ${reasons.join(', ')})`
    }
    reasonText += ` → 총 ${totalMale + totalFemale}명(남 ${totalMale}, 여 ${totalFemale}) 추천 완료`
    setLaborRecommendationReason(reasonText)
  }

  const sigCanvas = useRef<any>(null)
  const [signature, setSignature] = useState(initialData?.signature || '')
  const [isSigning, setIsSigning] = useState(!initialData?.signature)

  useEffect(() => {
    Promise.all([
      getStandardItems(),
      getVehicles(),
      getLabors(),
      getLocationCategories()
    ]).then(([itemsRes, vehiclesRes, laborsRes, catsRes]) => {
      setStandardItems(itemsRes)
      setStandardVehicles(vehiclesRes)
      setStandardLabors(laborsRes)
      setCategories(catsRes)

      if (!initialData?.cbmItems) {
        setItems([])

        const initialExpanded: Record<string, boolean> = {}
        catsRes.forEach((c: any) => {
          initialExpanded[c.id] = c.name === '안방'
        })
        initialExpanded[''] = false
        setExpandedCategories(initialExpanded)
      } else {
        const validItems = parseAndFilterCbmItems(initialData.cbmItems)
        setItems(validItems)

        const initialExpanded: Record<string, boolean> = {}
        catsRes.forEach((c: any) => {
          const catItems = validItems.filter((i: any) => (i.locationId || '') === c.id)
          initialExpanded[c.id] = catItems.length > 0
        })
        initialExpanded[''] = validItems.some((i: any) => !i.locationId)
        setExpandedCategories(initialExpanded)
      }
    })
  }, [initialData])

  return (
    <div className="max-w-4xl mx-auto space-y-3 sm:space-y-5 pb-20">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
      
      <form action={action} className="space-y-4 sm:space-y-5">
        {initialData && <input type="hidden" name="id" value={initialData.id} />}
        
        {/* 기본 정보 */}
        <div className="bg-white p-3.5 sm:p-5 md:p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-blue-600 border-b pb-2">기본 정보</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 text-sm">
              <tbody>
                <tr>
                  <th className="whitespace-nowrap bg-gray-50 border border-gray-200 px-3 sm:px-4 py-3 text-left font-medium text-gray-700 w-28 sm:w-36">
                    고객명 <span className="text-red-500">*</span>
                  </th>
                  <td className="border border-gray-200 p-2 sm:p-2.5">
                    <input 
                      type="text" 
                      name="customerName" 
                      value={customerName} 
                      onChange={e => setCustomerName(e.target.value)} 
                      required 
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500" 
                      placeholder="홍길동" 
                    />
                  </td>
                  <th className="whitespace-nowrap bg-gray-50 border border-gray-200 px-3 sm:px-4 py-3 text-left font-medium text-gray-700 w-28 sm:w-36">
                    연락처 <span className="text-red-500">*</span>
                  </th>
                  <td className="border border-gray-200 p-2 sm:p-2.5">
                    <input 
                      type="tel" 
                      name="contact" 
                      value={contact} 
                      onChange={e => setContact(formatPhoneNumber(e.target.value))} 
                      onFocus={handleSelectAllOnFocus}
                      required 
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500" 
                      placeholder="010-0000-0000" 
                    />
                  </td>
                </tr>
                <tr>
                  <th className="whitespace-nowrap bg-gray-50 border border-gray-200 px-3 sm:px-4 py-3 text-left font-medium text-gray-700 w-28 sm:w-36">
                    이사 종류 <span className="text-red-500">*</span>
                  </th>
                  <td className="border border-gray-200 p-2 sm:p-2.5">
                    <select 
                      name="movingType" 
                      value={movingType} 
                      onChange={e => setMovingType(e.target.value)} 
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="P">포장이사 (P)</option>
                      <option value="G">일반이사 (G)</option>
                      <option value="K">보관이사 (K)</option>
                    </select>
                  </td>
                  <th className="whitespace-nowrap bg-gray-50 border border-gray-200 px-3 sm:px-4 py-3 text-left font-medium text-gray-700 w-28 sm:w-36">
                    접수일자 <span className="text-red-500">*</span>
                  </th>
                  <td className="border border-gray-200 p-2 sm:p-2.5">
                    <CustomDatePicker 
                      selected={estimateDate} 
                      onChange={setEstimateDate} 
                      name="estimateDate" 
                      required 
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500" 
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 주소 및 일정 */}
        <div className="bg-white p-3.5 sm:p-5 md:p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
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
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center gap-1 font-medium text-sm shadow-sm"
                >
                  <MapPin size={16}/> 경로 길찾기
                </a>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 text-sm">
              <tbody>
                <tr>
                  <th className="whitespace-nowrap bg-gray-50 border border-gray-200 px-3 sm:px-4 py-3 text-left font-medium text-gray-700 w-28 sm:w-36">
                    방문 견적일정
                  </th>
                  <td className="border border-gray-200 p-2 sm:p-2.5">
                    <CustomDatePicker 
                      selected={visitDate} 
                      onChange={setVisitDate} 
                      name="visitDate" 
                      showTimeSelect 
                      dateFormat="yyyy-MM-dd'T'HH:mm" 
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500" 
                    />
                  </td>
                  <th className="whitespace-nowrap bg-gray-50 border border-gray-200 px-3 sm:px-4 py-3 text-left font-medium text-gray-700 w-28 sm:w-36">
                    이사 예정일
                  </th>
                  <td className="border border-gray-200 p-2 sm:p-2.5">
                    <CustomDatePicker 
                      selected={movingDate} 
                      onChange={setMovingDate} 
                      name="movingDate" 
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500" 
                    />
                  </td>
                </tr>

                {movingType === 'K' && (
                  <tr>
                    <th className="whitespace-nowrap bg-gray-50 border border-gray-200 px-3 sm:px-4 py-3 text-left font-medium text-gray-700 w-28 sm:w-36">
                      정리 예정일 (보관)
                    </th>
                    <td className="border border-gray-200 p-2 sm:p-2.5">
                      <CustomDatePicker 
                        selected={organizeDate} 
                        onChange={setOrganizeDate} 
                        name="organizeDate" 
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500" 
                      />
                    </td>
                    <th className="whitespace-nowrap bg-gray-50 border border-gray-200 px-3 sm:px-4 py-3 text-left font-medium text-gray-700 w-28 sm:w-36">
                      정리 여부
                    </th>
                    <td className="border border-gray-200 p-2 sm:p-2.5">
                      <div className="flex gap-4 items-center h-full px-1">
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input 
                            type="radio" 
                            name="organizeStatus" 
                            checked={organizeStatus === '정리'} 
                            onChange={() => setOrganizeStatus('정리')} 
                            value="정리" 
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" 
                          />
                          정리
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input 
                            type="radio" 
                            name="organizeStatus" 
                            checked={organizeStatus === '미정리'} 
                            onChange={() => setOrganizeStatus('미정리')} 
                            value="미정리" 
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" 
                          />
                          미정리
                        </label>
                      </div>
                    </td>
                  </tr>
                )}

                {/* 출발지 */}
                <tr>
                  <th className="whitespace-nowrap bg-gray-50 border border-gray-200 px-3 sm:px-4 py-3 text-left font-medium text-gray-700 align-top w-28 sm:w-36">
                    출발지 <span className="text-red-500">*</span>
                  </th>
                  <td colSpan={3} className="border border-gray-200 p-3 space-y-3">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        name="fromAddress" 
                        value={fromAddress} 
                        onChange={e => setFromAddress(e.target.value)} 
                        required 
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500" 
                        placeholder="출발지 주소를 검색하세요" 
                      />
                      <button 
                        type="button" 
                        onClick={() => { setPostcodeTarget('from'); setPostcodeOpen(true); }} 
                        className="px-3.5 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 flex items-center gap-1 font-medium text-sm whitespace-nowrap shadow-sm transition-colors"
                      >
                        <Search size={16}/> 검색
                      </button>
                      {fromAddress && (
                        <a 
                          href={`https://map.kakao.com/link/search/${fromAddress}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-3.5 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-1 font-medium text-sm whitespace-nowrap shadow-sm transition-colors"
                        >
                          <MapPin size={16}/> 지도
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 bg-gray-50/80 p-2.5 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-700 font-medium text-sm whitespace-nowrap">층수:</span>
                        <input 
                          type="text" 
                          value={fromFloor} 
                          onChange={e => setFromFloor(e.target.value)} 
                          onFocus={handleSelectAllOnFocus}
                          placeholder="예: 5" 
                          className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-center outline-none focus:border-blue-500 shadow-sm" 
                        />
                        <span className="text-gray-600 text-sm">층</span>
                      </div>

                      <div className="h-4 w-[1px] bg-gray-300 hidden sm:block" />

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-gray-700 font-medium text-sm whitespace-nowrap">작업조건:</span>
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
                              className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium border transition-all flex items-center gap-1.5 shadow-sm ${
                                isChecked 
                                  ? 'bg-blue-600 border-blue-600 text-white' 
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold ${
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
                  <th className="whitespace-nowrap bg-gray-50 border border-gray-200 px-3 sm:px-4 py-3 text-left font-medium text-gray-700 align-top w-28 sm:w-36">
                    도착지 <span className="text-red-500">*</span>
                  </th>
                  <td colSpan={3} className="border border-gray-200 p-3 space-y-3">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        name="toAddress" 
                        value={toAddress} 
                        onChange={e => setToAddress(e.target.value)} 
                        required 
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500" 
                        placeholder="도착지 주소를 검색하세요" 
                      />
                      <button 
                        type="button" 
                        onClick={() => { setPostcodeTarget('to'); setPostcodeOpen(true); }} 
                        className="px-3.5 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 flex items-center gap-1 font-medium text-sm whitespace-nowrap shadow-sm transition-colors"
                      >
                        <Search size={16}/> 검색
                      </button>
                      {toAddress && (
                        <a 
                          href={`https://map.kakao.com/link/search/${toAddress}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-3.5 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-1 font-medium text-sm whitespace-nowrap shadow-sm transition-colors"
                        >
                          <MapPin size={16}/> 지도
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 bg-gray-50/80 p-2.5 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-700 font-medium text-sm whitespace-nowrap">층수:</span>
                        <input 
                          type="text" 
                          value={toFloor} 
                          onChange={e => setToFloor(e.target.value)} 
                          onFocus={handleSelectAllOnFocus}
                          placeholder="예: 12" 
                          className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-center outline-none focus:border-blue-500 shadow-sm" 
                        />
                        <span className="text-gray-600 text-sm">층</span>
                      </div>

                      <div className="h-4 w-[1px] bg-gray-300 hidden sm:block" />

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-gray-700 font-medium text-sm whitespace-nowrap">작업조건:</span>
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
                              className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium border transition-all flex items-center gap-1.5 shadow-sm ${
                                isChecked 
                                  ? 'bg-blue-600 border-blue-600 text-white' 
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold ${
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
                  <th className="whitespace-nowrap bg-amber-50/80 border border-gray-200 px-3 sm:px-4 py-3 text-left font-bold text-amber-950 align-top w-28 sm:w-36">
                    <div className="flex items-center gap-1.5">
                      <Truck size={16} className="text-amber-600" />
                      <span>사다리차 운임</span>
                    </div>
                    <span className="block text-[11px] font-normal text-amber-700 mt-0.5">표준운임표 연동</span>
                  </th>
                  <td colSpan={3} className="border border-gray-200 p-3 space-y-3">
                    <div className="bg-white rounded-xl border border-amber-200 p-3 sm:p-4 shadow-sm space-y-3">
                      {/* 톤수 선택 및 운임표 바로가기 */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">화물 기준 톤수:</span>
                          <div className="flex flex-wrap items-center gap-1">
                            {['1', '2.5', '5', '6', '7.5', '10'].map(ton => (
                              <button
                                key={ton}
                                type="button"
                                onClick={() => setLadderTonnage(ton)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-md border transition-all ${
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
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 self-end sm:self-auto hover:underline"
                        >
                          <span>사다리차 표준운임표 확인/수정 ↗</span>
                        </a>
                      </div>

                      {/* 출발지 / 도착지 사다리차 적용 현황 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 출발지 */}
                        <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                          isFromLadder 
                            ? 'bg-amber-50/50 border-amber-200' 
                            : 'bg-gray-50 border-gray-200 text-gray-400'
                        }`}>
                          <div className="flex justify-between items-center font-bold">
                            <span className={isFromLadder ? 'text-amber-900' : 'text-gray-500'}>
                              출발지 사다리차 {isFromLadder ? '✓ 선택됨' : '(미선택)'}
                            </span>
                            {isFromLadder && fromFloor && (
                              <span className="text-gray-700 bg-white px-2 py-0.5 rounded border border-amber-200 font-bold">{fromFloor}층</span>
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
                              <p className="text-gray-500 pt-1">출발지 층수를 2층 이상 입력하면 표준 운임이 자동 계산됩니다.</p>
                            )
                          ) : (
                            <p className="text-gray-400">출발지 작업조건에서 '사다리차'를 선택하면 자동 계산됩니다.</p>
                          )}
                        </div>

                        {/* 도착지 */}
                        <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                          isToLadder 
                            ? 'bg-amber-50/50 border-amber-200' 
                            : 'bg-gray-50 border-gray-200 text-gray-400'
                        }`}>
                          <div className="flex justify-between items-center font-bold">
                            <span className={isToLadder ? 'text-amber-900' : 'text-gray-500'}>
                              도착지 사다리차 {isToLadder ? '✓ 선택됨' : '(미선택)'}
                            </span>
                            {isToLadder && toFloor && (
                              <span className="text-gray-700 bg-white px-2 py-0.5 rounded border border-amber-200 font-bold">{toFloor}층</span>
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
                              <p className="text-gray-500 pt-1">도착지 층수를 2층 이상 입력하면 표준 운임이 자동 계산됩니다.</p>
                            )
                          ) : (
                            <p className="text-gray-400">도착지 작업조건에서 '사다리차'를 선택하면 자동 계산됩니다.</p>
                          )}
                        </div>
                      </div>

                      {/* 합계 및 가산비용 반영 버튼 */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-200 bg-gray-50/60 p-2.5 rounded-lg">
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <span className="text-gray-600 font-medium">총 사다리차 표준 운임:</span>
                          <span className="font-black text-amber-700 text-base">
                            {totalLadderCost.toLocaleString()} 원
                          </span>
                          {(fromLadderCalc.cost > 0 && toLadderCalc.cost > 0) && (
                            <span className="text-gray-400 text-xs hidden sm:inline">
                              (출발지 {fromLadderCalc.cost.toLocaleString()} + 도착지 {toLadderCalc.cost.toLocaleString()})
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleApplyLadderCost}
                          disabled={totalLadderCost <= 0}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                            totalLadderCost <= 0
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : isLadderApplied
                              ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                              : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
                          }`}
                        >
                          {isLadderApplied ? <CheckCircle2 size={14} className="text-amber-700" /> : <Plus size={14} />}
                          <span>{isLadderApplied ? '사다리차 운임 반영 완료' : '가산 비용에 반영하기'}</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>

                {/* 이동 거리 계산 및 표시 (견적금액 영향) */}
                <tr className="bg-blue-50/20">
                  <th className="whitespace-nowrap bg-blue-50/80 border border-gray-200 px-3 sm:px-4 py-3 text-left font-bold text-blue-950 align-top w-28 sm:w-36">
                    <div className="flex items-center gap-1.5">
                      <Navigation size={16} className="text-blue-600" />
                      <span>이동 거리</span>
                    </div>
                    <span className="block text-[11px] font-normal text-blue-700 mt-0.5">견적금액 연동</span>
                  </th>
                  <td colSpan={3} className="border border-gray-200 p-3 space-y-3">
                    <div className="bg-white rounded-xl border border-blue-200 p-3 sm:p-4 shadow-sm space-y-3">
                      {/* 1. 거리 및 시간 표시 / 수동 조정 영역 */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">실제 주행거리:</span>
                            <div className="flex items-center gap-1 bg-blue-50/60 px-3 py-1 rounded-lg border border-blue-200">
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
                                className="w-20 bg-transparent text-right font-black text-blue-700 text-base sm:text-lg outline-none focus:bg-white rounded px-1"
                              />
                              <span className="font-bold text-blue-900 text-sm sm:text-base">km</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200">
                            <span className="font-medium">예상 소요시간:</span>
                            <span className="font-bold text-gray-800">
                              {distanceDuration || (distance > 0 ? `약 ${Math.max(10, Math.round((distance / 45) * 60))}분` : '-')}
                            </span>
                          </div>
                        </div>

                        {/* 계산 버튼 & 안내 */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCalculateDistance()}
                            disabled={isCalculatingDistance || !fromAddress || !toAddress}
                            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                              isCalculatingDistance
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : !fromAddress || !toAddress
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                            }`}
                          >
                            <RefreshCw size={14} className={isCalculatingDistance ? 'animate-spin' : ''} />
                            <span>{isCalculatingDistance ? '경로 계산 중...' : '거리 재계산'}</span>
                          </button>

                          {fromAddress && toAddress && (
                            <a
                              href={`https://map.kakao.com/?sName=${encodeURIComponent(fromAddress)}&eName=${encodeURIComponent(toAddress)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm font-medium transition-colors border border-gray-300 flex items-center gap-1"
                              title="카카오맵에서 실제 경로 및 지도 확인"
                            >
                              <MapPin size={14} /> 지도 확인
                            </a>
                          )}
                        </div>
                      </div>

                      {/* 상태 알림 배지 */}
                      {distanceNotice && (
                        <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
                          <CheckCircle2 size={13} className="text-green-600 shrink-0" />
                          <span>{distanceNotice}</span>
                        </div>
                      )}

                      {distanceCalcError && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                          <AlertCircle size={13} className="text-amber-600 shrink-0" />
                          <span>{distanceCalcError}</span>
                        </div>
                      )}

                      {/* 2. 견적금액 연동: 거리 가산 요금 산출 보조 섹션 */}
                      <div className="mt-2 pt-2.5 border-t border-dashed border-gray-200 bg-gray-50/70 p-2.5 sm:p-3 rounded-lg space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-800">
                            <Calculator size={15} className="text-blue-600" />
                            <span>거리 가산 운임 계산기</span>
                            <span className="text-[11px] font-normal text-gray-500">(견적 추가비용 반영)</span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-gray-600 font-medium">기준 거리:</span>
                            <div className="flex items-center">
                              <input 
                                type="number" 
                                min="0" 
                                value={baseDistanceKm} 
                                onChange={e => setBaseDistanceKm(Number(e.target.value) || 0)} 
                                onFocus={handleSelectAllOnFocus}
                                className="w-12 text-center rounded border border-gray-300 bg-white py-0.5 px-1 font-bold text-gray-800 outline-none focus:border-blue-500" 
                              />
                              <span className="ml-1 text-gray-600">km 초과 시</span>
                            </div>

                            <span className="text-gray-600 font-medium ml-1">km당:</span>
                            <div className="flex items-center">
                              <input 
                                type="number" 
                                min="0" 
                                step="500" 
                                value={ratePerKm} 
                                onChange={e => setRatePerKm(Number(e.target.value) || 0)} 
                                onFocus={handleSelectAllOnFocus}
                                className="w-16 text-right rounded border border-gray-300 bg-white py-0.5 px-1 font-bold text-gray-800 outline-none focus:border-blue-500" 
                              />
                              <span className="ml-1 text-gray-600">원</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-gray-200/80">
                          <div className="text-xs text-gray-600 flex items-center gap-1.5 flex-wrap">
                            <span>초과 거리:</span>
                            <span className="font-bold text-gray-900">{extraDistanceKm}km</span>
                            <span className="text-gray-300">|</span>
                            <span>산출 가산금액:</span>
                            <span className="font-extrabold text-blue-700 text-sm">+{calculatedExtraCost.toLocaleString()} 원</span>
                          </div>

                          <button
                            type="button"
                            onClick={handleApplyDistanceCost}
                            disabled={calculatedExtraCost <= 0}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${
                              calculatedExtraCost <= 0
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : isDistanceApplied
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                            }`}
                          >
                            {isDistanceApplied ? <CheckCircle2 size={13} className="text-indigo-700" /> : <Plus size={13} />}
                            <span>{isDistanceApplied ? '거리가산운임 반영 완료' : '+ 가산 비용에 반영하기'}</span>
                          </button>
                        </div>
                      </div>
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
        </div>

        {/* 물품 및 작업 환경 */}
        <div className="bg-white p-3.5 sm:p-5 md:p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-blue-600 border-b pb-2">물품 및 작업 환경</h2>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h3 className="font-medium text-gray-900">물품 목록 (CBM 산출용)</h3>
                <button 
                  type="button" 
                  onClick={() => setIsCbmCalculatorOpen(true)}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md hover:bg-blue-200 font-medium transition-colors border border-blue-200"
                >
                  CBM 계산기
                </button>
              </div>
              <div className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 shadow-sm">
                총 합계: {totalCbm.toFixed(2)} CBM
              </div>
            </div>
            <div className="space-y-4">
              {[...categories, { id: '', name: '기타/미지정' }].map(cat => {
                const catItems = items.filter(i => (i.locationId || '') === cat.id)
                // Hide '기타/미지정' if it has no items
                if (cat.id === '' && catItems.length === 0) return null
                
                const isExpanded = expandedCategories[cat.id] !== false

                return (
                  <div key={cat.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div 
                      className="bg-gray-100 px-4 py-2 font-bold text-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => setExpandedCategories(prev => ({ ...prev, [cat.id]: !isExpanded }))}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                        <span>{cat.name}</span>
                      </div>
                      <span className="text-sm font-medium text-blue-600">
                        {catItems.reduce((acc, item) => acc + ((Number(item.cbm) || 0) + (Number(item.innerBoxCbm) || 0)) * (item.quantity !== undefined ? Number(item.quantity) : 1), 0).toFixed(2)} CBM
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left bg-white min-w-[500px]">
                          <thead className="bg-gray-50 text-gray-600 border-b">
                            <tr>
                              <th className="whitespace-nowrap px-3 sm:px-4 py-2 font-medium">품목</th>
                              <th className="whitespace-nowrap px-3 sm:px-4 py-2 font-medium">규격</th>
                              <th className="whitespace-nowrap px-3 sm:px-4 py-2 font-medium w-20">수량</th>
                              <th className="whitespace-nowrap px-3 sm:px-4 py-2 font-medium w-24">기본 CBM</th>
                              <th className="whitespace-nowrap px-3 sm:px-4 py-2 font-medium w-24">추가 CBM</th>
                              <th className="whitespace-nowrap px-3 sm:px-4 py-2 font-medium w-12 text-center">삭제</th>
                            </tr>
                          </thead>
                        <tbody>
                          {catItems.map((item, localIdx) => {
                            const idx = items.findIndex(i => i === item)
                            return (
                              <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="px-4 py-2">
                                  <input type="text" value={item.name} onChange={e => {
                                    const newItems = [...items]
                                    newItems[idx].name = e.target.value
                                    setItems(newItems)
                                  }} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500" placeholder="직접입력" />
                                </td>
                                <td className="px-4 py-2">
                                  {(() => {
                                    // 해당 품목명(name)을 가진 기준정보 항목들을 찾음
                                    const availableSpecs = standardItems.filter(i => i.name === item.name)
                                    
                                    if (availableSpecs.length > 0) {
                                      return (
                                        <select
                                          value={item.spec || ''}
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
                                          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500"
                                        >
                                          <option value="">규격 선택</option>
                                          {availableSpecs.map(s => (
                                            <option key={s.id} value={s.spec || '기본'}>{s.spec || '기본'}</option>
                                          ))}
                                        </select>
                                      )
                                    }
                                    
                                    // 기준정보에 없는 직접 입력 항목인 경우 텍스트 입력창 유지
                                    return (
                                      <input type="text" value={item.spec || ''} onChange={e => {
                                        const newItems = [...items]
                                        newItems[idx].spec = e.target.value
                                        setItems(newItems)
                                      }} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500" placeholder="직접입력" />
                                    )
                                  })()}
                                </td>
                                <td className="px-4 py-2">
                                  <input type="number" min="0" value={item.quantity !== undefined ? item.quantity : 1} onChange={e => {
                                    const newItems = [...items]
                                    newItems[idx].quantity = e.target.value === '' ? 0 : parseInt(e.target.value)
                                    setItems(newItems)
                                  }} onFocus={handleSelectAllOnFocus} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500 text-right" />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="number" step="0.01" value={item.cbm} onChange={e => {
                                    const newItems = [...items]
                                    newItems[idx].cbm = parseFloat(e.target.value) || 0
                                    setItems(newItems)
                                  }} onFocus={handleSelectAllOnFocus} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500 text-right" />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="number" step="0.01" value={item.innerBoxCbm} onChange={e => {
                                    const newItems = [...items]
                                    newItems[idx].innerBoxCbm = parseFloat(e.target.value) || 0
                                    setItems(newItems)
                                  }} onFocus={handleSelectAllOnFocus} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500 text-right" />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <button type="button" onClick={() => {
                                    const newItems = items.filter((_, i) => i !== idx)
                                    setItems(newItems)
                                  }} className="text-red-500 hover:text-red-700 font-bold p-1">✕</button>
                                </td>
                              </tr>
                            )
                          })}
                          {catItems.length === 0 && (
                            <tr className="border-b">
                              <td colSpan={6} className="px-4 py-4 text-center text-gray-400">등록된 항목이 없습니다.</td>
                            </tr>
                          )}
                          <tr className="bg-gray-50/50">
                            <td colSpan={6} className="px-4 py-2">
                              <div className="flex flex-wrap gap-2 items-center">
                                <select 
                                  className="rounded-lg border-gray-300 border px-3 py-1.5 text-sm outline-none text-gray-700 bg-white focus:border-blue-500 cursor-pointer"
                                  value={selectedItemNames[cat.id] || ''}
                                  onChange={(e) => {
                                    setSelectedItemNames(prev => ({ ...prev, [cat.id]: e.target.value }))
                                  }}
                                >
                                  <option value="">+ 품목 선택</option>
                                  {Array.from(new Set(
                                    standardItems
                                      .filter(i => 
                                        cat.id === '' || 
                                        i.locations?.some((l: any) => l.id === cat.id) || 
                                        !i.locations || 
                                        i.locations.length === 0
                                      )
                                      .map(i => i.name)
                                  )).map(name => (
                                    <option key={name as string} value={name as string}>{name as string}</option>
                                  ))}
                                </select>
                                
                                {selectedItemNames[cat.id] && (
                                  <select
                                    className="rounded-lg border-gray-300 border px-3 py-1.5 text-sm outline-none text-gray-700 bg-white focus:border-blue-500 cursor-pointer"
                                    value=""
                                    onChange={(e) => {
                                      if(!e.target.value) return;
                                      const stdItem = standardItems.find(i => i.id === e.target.value)
                                      if(stdItem) {
                                        setItems([...items, { locationId: cat.id, locationName: cat.name, name: stdItem.name, spec: stdItem.spec || '', quantity: 1, cbm: stdItem.defaultCbm, innerBoxCbm: stdItem.defaultInnerCbm }])
                                        setSelectedItemNames(prev => ({ ...prev, [cat.id]: '' }))
                                      }
                                    }}
                                  >
                                    <option value="">+ 규격 선택</option>
                                    {standardItems
                                      .filter(i => 
                                        i.name === selectedItemNames[cat.id] && 
                                        (
                                          cat.id === '' || 
                                          i.locations?.some((l: any) => l.id === cat.id) || 
                                          !i.locations || 
                                          i.locations.length === 0
                                        )
                                      )
                                      .map(i => (
                                        <option key={i.id} value={i.id}>{i.spec || '기본 규격'}</option>
                                      ))}
                                  </select>
                                )}
                                <span className="text-gray-400 text-sm mx-1">또는</span>
                                <button 
                                  type="button" 
                                  onClick={() => setItems([...items, { locationId: cat.id, locationName: cat.name, name: '', spec: '', quantity: 1, cbm: 0, innerBoxCbm: 0 }])}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1.5 bg-white border border-blue-200 rounded-lg shadow-sm hover:bg-blue-50"
                                >
                                  + 직접입력 항목 추가
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <input type="hidden" name="cbmItems" value={JSON.stringify(filterValidCbmItems(items))} />
          </div>

          <div className="pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 인력 추가 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-gray-900">작업 인원</h3>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">
                    구분: <strong>{movingType === 'P' ? '포장이사' : movingType === 'G' ? '일반이사' : '보관이사'}</strong>
                  </span>
                  <div className="flex items-center gap-1.5 text-xs">
                    {fromWorkTypes.concat(toWorkTypes).some(t => t === '수작업' || t === '계단') ? (
                      <span className="bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded border border-orange-200">
                        수작업/계단 가산
                      </span>
                    ) : (
                      <span className="text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                        기본 환경
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-900 font-bold">
                    기준 적재량: {requiredCbm.toFixed(2)} CBM
                  </span>
                  <button 
                    type="button"
                    onClick={handleRecommendLabors}
                    className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    최적 인원 추천
                  </button>
                </div>
                {laborRecommendationReason && (
                  <div className="text-xs text-blue-800 bg-white/80 p-2 rounded border border-blue-200 leading-relaxed font-medium">
                    💡 {laborRecommendationReason}
                  </div>
                )}
              </div>
              {labors.length > 0 && (
                <div className="border border-gray-200 rounded-lg mb-2 overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-[280px]">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                      <tr>
                        <th className="whitespace-nowrap px-3 py-2 font-medium">인력 구분</th>
                        <th className="whitespace-nowrap px-3 py-2 font-medium w-24">인원(명)</th>
                        <th className="whitespace-nowrap px-3 py-2 font-medium w-12 text-center">삭제</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labors.map((labor, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-2">{labor.name}</td>
                          <td className="px-3 py-2">
                            <input type="number" min="1" value={labor.count} onChange={e => {
                              const newLabors = [...labors]
                              newLabors[idx].count = parseInt(e.target.value) || 1
                              setLabors(newLabors)
                            }} onFocus={handleSelectAllOnFocus} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500 text-right" />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button type="button" onClick={() => setLabors(labors.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <select 
                className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm outline-none text-gray-700 bg-gray-50 focus:border-blue-500 cursor-pointer"
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
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-gray-900">투입 차량</h3>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">산출 CBM: <strong>{totalCbm.toFixed(2)}</strong></span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-xs">데드스페이스</span>
                    <input 
                      type="number" 
                      value={deadSpaceRatio} 
                      onChange={e => setDeadSpaceRatio(Number(e.target.value))} 
                      className="w-16 rounded border border-gray-300 px-2 py-0.5 text-xs text-right outline-none focus:border-blue-500" 
                    />
                    <span className="text-gray-600 text-xs">%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-900 font-bold">필요 적재 CBM: {requiredCbm.toFixed(2)}</span>
                  <button 
                    type="button"
                    onClick={handleRecommendVehicles}
                    className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    최적 차량 추천
                  </button>
                </div>
              </div>

              {vehicles.length > 0 && (
                <div className="border border-gray-200 rounded-lg mb-2 overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-[280px]">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                      <tr>
                        <th className="whitespace-nowrap px-3 py-2 font-medium">차량 구분</th>
                        <th className="whitespace-nowrap px-3 py-2 font-medium w-24">대수</th>
                        <th className="whitespace-nowrap px-3 py-2 font-medium w-12 text-center">삭제</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map((vehicle, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div>{vehicle.name}</div>
                            {(() => {
                              const sv = standardVehicles.find(s => s.id === vehicle.id) || vehicle;
                              if ((sv.maxCbm || 0) > 0) {
                                const effective = sv.maxCbm / (1 + deadSpaceRatio / 100);
                                return <div className="text-xs text-gray-500 mt-0.5">실적재: {(effective * (vehicle.count || 1)).toFixed(1)} CBM</div>
                              }
                              return null;
                            })()}
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="1" value={vehicle.count} onChange={e => {
                              const newVehicles = [...vehicles]
                              newVehicles[idx].count = parseInt(e.target.value) || 1
                              setVehicles(newVehicles)
                            }} onFocus={handleSelectAllOnFocus} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500 text-right" />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button type="button" onClick={() => setVehicles(vehicles.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <select 
                className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm outline-none text-gray-700 bg-gray-50 focus:border-blue-500 cursor-pointer"
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
              <input type="hidden" name="vehicles" value={JSON.stringify(vehicles)} />
            </div>
          </div>
        </div>

        {/* 이사 비용 및 결제 플랜 통합 섹션 */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl shadow-sm border border-gray-100 space-y-3.5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2 gap-2">
            <h2 className="text-base sm:text-lg font-bold text-blue-600">이사 비용 및 결제 플랜</h2>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-700 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
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

          {/* 1. 비용 입력 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap mb-1">기본 이사 비용</label>
              <NumberInput name="movingCost" value={movingCost} onChange={v => { setMovingCost(v); setIsCostEdited(true); }} className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-right outline-none focus:border-blue-500" />
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
                className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-right outline-none focus:border-blue-500" 
              />
              {/* 산출 가산운임 반영 버튼 및 내역 (한 가지로 통합) */}
              {(totalLadderCost > 0 || calculatedExtraCost > 0) && (
                <div className="mt-1.5 space-y-1">
                  <button
                    type="button"
                    onClick={handleApplyAllAdditionalCosts}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors w-full justify-center border shadow-xs ${
                      isAllApplied
                        ? 'bg-amber-100/80 text-amber-900 border-amber-300 hover:bg-amber-200/80'
                        : 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'
                    }`}
                    title="산출된 사다리차 및 거리가산 운임 일괄 반영"
                  >
                    {isAllApplied ? <CheckCircle2 size={12} className="text-amber-800" /> : <Plus size={12} />}
                    <span>
                      {isAllApplied 
                        ? `가산운임 반영 완료 (${totalExtraCost.toLocaleString()}원)` 
                        : `산출 가산운임 (+${totalExtraCost.toLocaleString()}원) 반영`}
                    </span>
                  </button>
                  <div className="text-[11px] text-gray-500 text-center truncate" title={[
                    totalLadderCost > 0 ? `사다리차 ${totalLadderCost.toLocaleString()}원` : null,
                    calculatedExtraCost > 0 ? `거리가산 ${calculatedExtraCost.toLocaleString()}원` : null,
                  ].filter(Boolean).join(' + ')}>
                    {[
                      totalLadderCost > 0 ? `사다리차 ${totalLadderCost.toLocaleString()}원` : null,
                      calculatedExtraCost > 0 ? `거리가산 ${calculatedExtraCost.toLocaleString()}원` : null,
                    ].filter(Boolean).join(' + ')}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap mb-1">보관 비용</label>
              <NumberInput name="storageCost" value={storageCost} onChange={v => { setStorageCost(v); setIsCostEdited(true); }} className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-right outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap mb-1">부가세</label>
              <NumberInput name="vat" value={vat} onChange={setVat} className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-right outline-none focus:border-blue-500" />
            </div>
          </div>

          {/* 2. 합계 금액 바 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-blue-50/70 px-3 py-2 rounded-lg border border-blue-100">
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600 font-medium whitespace-nowrap">공급가액:</span>
                <span className="font-bold text-gray-800">{supplyAmount.toLocaleString()} 원</span>
              </div>
              <span className="text-gray-300 hidden sm:inline">|</span>
              <div className="flex items-center gap-1.5">
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
            <table className="w-full text-xs sm:text-sm border-collapse min-w-[460px]">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold">
                <tr>
                  <th className="px-3 py-2 text-left w-16 sm:w-20 whitespace-nowrap">구분</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">금액 (원)</th>
                  <th className="px-3 py-2 text-center w-36 sm:w-44 whitespace-nowrap">일자</th>
                  <th className="px-3 py-2 text-center w-24 sm:w-28 whitespace-nowrap">입금 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {/* 계약금 */}
                <tr className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-3 py-2 font-bold text-gray-800 whitespace-nowrap">계약금</td>
                  <td className="px-3 py-2">
                    <NumberInput value={downPayment} onChange={setDownPayment} className="w-full h-8 rounded border border-gray-300 px-2.5 text-right text-xs sm:text-sm font-semibold outline-none focus:border-blue-500" />
                  </td>
                  <td className="px-3 py-2">
                    <CustomDatePicker selected={downPaymentDate} onChange={setDownPaymentDate} className="w-full h-8 rounded border border-gray-300 px-2 text-xs outline-none focus:border-blue-500" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <label className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs font-semibold cursor-pointer transition-all border ${downPaymentPaid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                      <input type="checkbox" checked={downPaymentPaid} onChange={e => setDownPaymentPaid(e.target.checked)} className="rounded text-green-600 focus:ring-green-500 w-3.5 h-3.5" />
                      <span>{downPaymentPaid ? '입금완료' : '미입금'}</span>
                    </label>
                  </td>
                </tr>
                {/* 중도금 */}
                <tr className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-3 py-2 font-bold text-gray-800 whitespace-nowrap">중도금</td>
                  <td className="px-3 py-2">
                    <NumberInput value={intermediatePayment} onChange={setIntermediatePayment} className="w-full h-8 rounded border border-gray-300 px-2.5 text-right text-xs sm:text-sm font-semibold outline-none focus:border-blue-500" />
                  </td>
                  <td className="px-3 py-2">
                    <CustomDatePicker selected={intermediateDate} onChange={setIntermediateDate} className="w-full h-8 rounded border border-gray-300 px-2 text-xs outline-none focus:border-blue-500" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <label className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs font-semibold cursor-pointer transition-all border ${intermediatePaymentPaid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                      <input type="checkbox" checked={intermediatePaymentPaid} onChange={e => setIntermediatePaymentPaid(e.target.checked)} className="rounded text-green-600 focus:ring-green-500 w-3.5 h-3.5" />
                      <span>{intermediatePaymentPaid ? '입금완료' : '미입금'}</span>
                    </label>
                  </td>
                </tr>
                {/* 잔금 */}
                <tr className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-3 py-2 font-bold text-gray-800 whitespace-nowrap">잔금</td>
                  <td className="px-3 py-2">
                    <NumberInput value={balance} onChange={setBalance} className="w-full h-8 rounded border border-gray-300 px-2.5 text-right text-xs sm:text-sm font-semibold outline-none focus:border-blue-500" />
                  </td>
                  <td className="px-3 py-2">
                    <CustomDatePicker selected={balanceDate} onChange={setBalanceDate} className="w-full h-8 rounded border border-gray-300 px-2 text-xs outline-none focus:border-blue-500" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <label className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs font-semibold cursor-pointer transition-all border ${balancePaid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                      <input type="checkbox" checked={balancePaid} onChange={e => setBalancePaid(e.target.checked)} className="rounded text-green-600 focus:ring-green-500 w-3.5 h-3.5" />
                      <span>{balancePaid ? '입금완료' : '미입금'}</span>
                    </label>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 4. 미할당 잔액 안내 바 */}
          <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 text-xs sm:text-sm">
            <span className="text-gray-700 font-medium whitespace-nowrap">남은 잔액 (미할당 금액)</span>
            <span className={`font-bold text-sm sm:text-base ${remainingAmount === 0 ? 'text-green-600' : remainingAmount < 0 ? 'text-red-600' : 'text-blue-600'}`}>
              {remainingAmount.toLocaleString()} 원
            </span>
          </div>

          <input type="hidden" name="paymentPlan" value={JSON.stringify({ targetType: paymentTarget, targetAmount, downPayment, downPaymentDate: downPaymentDate ? format(downPaymentDate, 'yyyy-MM-dd') : '', downPaymentPaid, intermediatePayment, intermediateDate: intermediateDate ? format(intermediateDate, 'yyyy-MM-dd') : '', intermediatePaymentPaid, balance, balanceDate: balanceDate ? format(balanceDate, 'yyyy-MM-dd') : '', balancePaid, remainingAmount })} />
        </div>

        {/* 고객 서명 */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex justify-between items-center border-b pb-1.5">
            <h2 className="text-base sm:text-lg font-bold text-blue-600">고객 서명</h2>
            {!isSigning && signature ? (
              <button type="button" onClick={() => { setIsSigning(true); setSignature(''); }} className="text-xs sm:text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1 bg-red-50 rounded-lg">서명 다시하기</button>
            ) : (
              <button type="button" onClick={() => { sigCanvas.current?.clear(); setSignature(''); }} className="text-xs sm:text-sm text-gray-600 hover:text-gray-800 font-medium px-3 py-1 bg-gray-100 rounded-lg">초기화</button>
            )}
          </div>
          
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 h-28 sm:h-32 relative touch-none">
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

        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t p-3 sm:p-4 shadow-lg flex justify-end gap-3 sm:gap-4 z-20">
          <button type="button" className="px-5 sm:px-6 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors text-sm sm:text-base">취소</button>
          <button type="submit" className="px-5 sm:px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md text-sm sm:text-base">견적 저장하기</button>
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
    </div>
  )
}
