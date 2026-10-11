'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
const SignatureCanvas = dynamic(() => import('react-signature-canvas'), { ssr: false }) as any
import { getStandardItems, getLocationCategories } from '@/app/actions/item'
import { getVehicles } from '@/app/actions/vehicle'
import { getLabors } from '@/app/actions/labor'
import DaumPostcodeEmbed from 'react-daum-postcode'
import { MapPin, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { CustomDatePicker } from '@/components/CustomDatePicker'
import { format } from 'date-fns'

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
      className={className}
    />
  )
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

  const [paymentTarget, setPaymentTarget] = useState<'supply' | 'total'>(payPlanObj.targetType || 'total')
  const targetAmount = paymentTarget === 'supply' ? supplyAmount : totalAmount
  const paidAmount = downPayment + intermediatePayment + balance
  const remainingAmount = targetAmount - paidAmount

  const [fromAddress, setFromAddress] = useState(initialData?.fromAddress || '')
  const [toAddress, setToAddress] = useState(initialData?.toAddress || '')
  const [postcodeOpen, setPostcodeOpen] = useState(false)
  const [postcodeTarget, setPostcodeTarget] = useState<'from' | 'to'>('from')
  const [movingType, setMovingType] = useState(initialData?.movingType || 'P')
  const [customerName, setCustomerName] = useState(initialData?.customerName || '')
  const [contact, setContact] = useState(initialData?.contact || '')
  const [organizeStatus, setOrganizeStatus] = useState<string>(envObj.organizeStatus || '')
  const [fromFloor, setFromFloor] = useState<string>(envObj.fromFloor || '')
  const [fromWorkTypes, setFromWorkTypes] = useState<string[]>(Array.isArray(envObj.fromWorkTypes) ? envObj.fromWorkTypes : [])
  const [toFloor, setToFloor] = useState<string>(envObj.toFloor || '')
  const [toWorkTypes, setToWorkTypes] = useState<string[]>(Array.isArray(envObj.toWorkTypes) ? envObj.toWorkTypes : [])

  const handleComplete = (data: any) => {
    const fullAddress = data.address
    if (postcodeTarget === 'from') setFromAddress(fullAddress)
    else setToAddress(fullAddress)
    setPostcodeOpen(false)
  }

  const [items, setItems] = useState<any[]>(initialData?.cbmItems ? JSON.parse(initialData.cbmItems) : [])
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
        const initialItems: any[] = []
        const grouped: Record<string, boolean> = {}

        itemsRes.forEach((item: any) => {
          const locations = item.locations && item.locations.length > 0 ? item.locations : [{ id: '', name: '기타/미지정' }]
          
          locations.forEach((loc: any) => {
            const key = `${loc.id}_${item.name}`
            if (!grouped[key]) {
              grouped[key] = true
              initialItems.push({
                locationId: loc.id,
                locationName: loc.name,
                name: item.name,
                spec: '',
                quantity: 0,
                cbm: 0,
                innerBoxCbm: 0
              })
            }
          })
        })
        setItems(initialItems)

        const initialExpanded: Record<string, boolean> = {}
        catsRes.forEach((c: any) => {
          initialExpanded[c.id] = c.name === '안방'
        })
        initialExpanded[''] = false
        setExpandedCategories(initialExpanded)
      } else {
        const parsedItems = JSON.parse(initialData.cbmItems)
        const initialExpanded: Record<string, boolean> = {}
        catsRes.forEach((c: any) => {
          const catItems = parsedItems.filter((i: any) => (i.locationId || '') === c.id)
          const hasCbm = catItems.some((i: any) => {
            const qty = i.quantity !== undefined ? Number(i.quantity) : 1
            return ((Number(i.cbm) || 0) + (Number(i.innerBoxCbm) || 0)) * qty > 0
          })
          initialExpanded[c.id] = hasCbm
        })
        initialExpanded[''] = false
        setExpandedCategories(initialExpanded)
      }
    })
  }, [initialData])

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      
      <form action={action} className="space-y-8">
        {initialData && <input type="hidden" name="id" value={initialData.id} />}
        
        {/* 기본 정보 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-bold text-blue-600 border-b pb-2">기본 정보</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 text-sm">
              <tbody>
                <tr>
                  <th className="w-24 sm:w-32 bg-gray-50 border border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
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
                  <th className="w-24 sm:w-32 bg-gray-50 border border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
                    연락처 <span className="text-red-500">*</span>
                  </th>
                  <td className="border border-gray-200 p-2 sm:p-2.5">
                    <input 
                      type="tel" 
                      name="contact" 
                      value={contact} 
                      onChange={e => setContact(e.target.value)} 
                      required 
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500" 
                      placeholder="010-0000-0000" 
                    />
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-50 border border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
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
                  <th className="bg-gray-50 border border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-lg font-bold text-blue-600">주소 및 일정</h2>
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 text-sm">
              <tbody>
                <tr>
                  <th className="w-24 sm:w-32 bg-gray-50 border border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
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
                  <th className="w-24 sm:w-32 bg-gray-50 border border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
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
                    <th className="bg-gray-50 border border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
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
                    <th className="bg-gray-50 border border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
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
                  <th className="bg-gray-50 border border-gray-200 px-4 py-3 text-left font-medium text-gray-700 align-top">
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
                  <th className="bg-gray-50 border border-gray-200 px-4 py-3 text-left font-medium text-gray-700 align-top">
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
              </tbody>
            </table>
          </div>
          <input type="hidden" name="fromFloor" value={fromFloor} />
          <input type="hidden" name="fromWorkTypes" value={JSON.stringify(fromWorkTypes)} />
          <input type="hidden" name="toFloor" value={toFloor} />
          <input type="hidden" name="toWorkTypes" value={JSON.stringify(toWorkTypes)} />
        </div>

        {/* 물품 및 작업 환경 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-bold text-blue-600 border-b pb-2">물품 및 작업 환경</h2>
          
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
                      <table className="w-full text-sm text-left bg-white">
                        <thead className="bg-gray-50 text-gray-600 border-b">
                          <tr>
                            <th className="px-4 py-2 font-medium">품목</th>
                            <th className="px-4 py-2 font-medium">규격</th>
                            <th className="px-4 py-2 font-medium w-20">수량</th>
                            <th className="px-4 py-2 font-medium w-24">기본 CBM</th>
                            <th className="px-4 py-2 font-medium w-24">추가 CBM</th>
                            <th className="px-4 py-2 font-medium w-12 text-center">삭제</th>
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
                                  }} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500 text-right" />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="number" step="0.01" value={item.cbm} onChange={e => {
                                    const newItems = [...items]
                                    newItems[idx].cbm = parseFloat(e.target.value) || 0
                                    setItems(newItems)
                                  }} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500 text-right" />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="number" step="0.01" value={item.innerBoxCbm} onChange={e => {
                                    const newItems = [...items]
                                    newItems[idx].innerBoxCbm = parseFloat(e.target.value) || 0
                                    setItems(newItems)
                                  }} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500 text-right" />
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
                    )}
                  </div>
                )
              })}
            </div>
            <input type="hidden" name="cbmItems" value={JSON.stringify(items)} />
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
                <div className="border border-gray-200 rounded-lg mb-2">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                      <tr>
                        <th className="px-3 py-2 font-medium">인력 구분</th>
                        <th className="px-3 py-2 font-medium w-24">인원(명)</th>
                        <th className="px-3 py-2 font-medium w-12 text-center">삭제</th>
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
                            }} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500 text-right" />
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
                <div className="border border-gray-200 rounded-lg mb-2">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                      <tr>
                        <th className="px-3 py-2 font-medium">차량 구분</th>
                        <th className="px-3 py-2 font-medium w-24">대수</th>
                        <th className="px-3 py-2 font-medium w-12 text-center">삭제</th>
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
                            }} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500 text-right" />
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

        {/* 이사 비용 및 부가세 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-bold text-blue-600 border-b pb-2">이사 비용 및 부가세</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">기본 이사 비용</label>
              <NumberInput name="movingCost" value={movingCost} onChange={v => { setMovingCost(v); setIsCostEdited(true); }} className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-right" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">가산 비용 (사다리차/거리 등)</label>
              <NumberInput name="additionalCost" value={additionalCost} onChange={v => { setAdditionalCost(v); setIsCostEdited(true); }} className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-right" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">보관 비용</label>
              <NumberInput name="storageCost" value={storageCost} onChange={v => { setStorageCost(v); setIsCostEdited(true); }} className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-right" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">부가세</label>
              <NumberInput name="vat" value={vat} onChange={setVat} className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-right" />
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
              <span className="text-md font-bold text-gray-700">공급가액 합계 (부가세 제외)</span>
              <span className="text-xl font-bold text-gray-800">{supplyAmount.toLocaleString()} 원</span>
            </div>
            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg">
              <span className="text-lg font-bold text-blue-900">공급대가 (총 합계)</span>
              <span className="text-2xl font-black text-blue-700">{totalAmount.toLocaleString()} 원</span>
              <input type="hidden" name="totalAmount" value={totalAmount} />
            </div>
          </div>
        </div>

        {/* 결제 플랜 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-2 gap-2">
            <div className="flex items-center gap-6">
              <h2 className="text-lg font-bold text-blue-600">결제 플랜</h2>
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" name="paymentTarget" checked={paymentTarget === 'supply'} onChange={() => setPaymentTarget('supply')} className="w-4 h-4 text-blue-600" />
                  공급가액
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" name="paymentTarget" checked={paymentTarget === 'total'} onChange={() => setPaymentTarget('total')} className="w-4 h-4 text-blue-600" />
                  공급대가
                </label>
              </div>
            </div>
            <div className="text-sm font-bold text-gray-700">
              초기 대상 금액: <span className="text-lg text-blue-600">{targetAmount.toLocaleString()} 원</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">계약금</label>
                <label className="flex items-center gap-1 text-xs text-blue-700 font-medium cursor-pointer bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded">
                  <input type="checkbox" checked={downPaymentPaid} onChange={e => setDownPaymentPaid(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3" />
                  입금완료
                </label>
              </div>
              <NumberInput value={downPayment} onChange={setDownPayment} className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-right" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">계약금 일자</label>
              <CustomDatePicker selected={downPaymentDate} onChange={setDownPaymentDate} className="block w-full rounded-lg border border-gray-300 px-4 py-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">중도금</label>
                <label className="flex items-center gap-1 text-xs text-blue-700 font-medium cursor-pointer bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded">
                  <input type="checkbox" checked={intermediatePaymentPaid} onChange={e => setIntermediatePaymentPaid(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3" />
                  입금완료
                </label>
              </div>
              <NumberInput value={intermediatePayment} onChange={setIntermediatePayment} className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-right" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">중도금 일자</label>
              <CustomDatePicker selected={intermediateDate} onChange={setIntermediateDate} className="block w-full rounded-lg border border-gray-300 px-4 py-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">잔금</label>
                <label className="flex items-center gap-1 text-xs text-blue-700 font-medium cursor-pointer bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded">
                  <input type="checkbox" checked={balancePaid} onChange={e => setBalancePaid(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3" />
                  입금완료
                </label>
              </div>
              <NumberInput value={balance} onChange={setBalance} className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-right" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">잔금 일자</label>
              <CustomDatePicker selected={balanceDate} onChange={setBalanceDate} className="block w-full rounded-lg border border-gray-300 px-4 py-2" />
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
              <span className="text-md font-bold text-gray-700">남은 잔액 (미할당 금액)</span>
              <span className={`text-xl font-bold ${remainingAmount === 0 ? 'text-green-600' : remainingAmount < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {remainingAmount.toLocaleString()} 원
              </span>
            </div>
          </div>
          <input type="hidden" name="paymentPlan" value={JSON.stringify({ targetType: paymentTarget, targetAmount, downPayment, downPaymentDate: downPaymentDate ? format(downPaymentDate, 'yyyy-MM-dd') : '', downPaymentPaid, intermediatePayment, intermediateDate: intermediateDate ? format(intermediateDate, 'yyyy-MM-dd') : '', intermediatePaymentPaid, balance, balanceDate: balanceDate ? format(balanceDate, 'yyyy-MM-dd') : '', balancePaid, remainingAmount })} />
        </div>

        {/* 고객 서명 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-lg font-bold text-blue-600">고객 서명</h2>
            {!isSigning && signature ? (
              <button type="button" onClick={() => { setIsSigning(true); setSignature(''); }} className="text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1 bg-red-50 rounded-lg">서명 다시하기</button>
            ) : (
              <button type="button" onClick={() => { sigCanvas.current?.clear(); setSignature(''); }} className="text-sm text-gray-600 hover:text-gray-800 font-medium px-3 py-1 bg-gray-100 rounded-lg">초기화</button>
            )}
          </div>
          
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 h-40 relative">
            {isSigning ? (
              <SignatureCanvas 
                ref={sigCanvas}
                canvasProps={{ className: 'w-full h-full' }}
                onEnd={() => setSignature(sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png'))}
              />
            ) : (
              signature && <img src={signature} alt="고객 서명" className="h-full max-w-full object-contain mx-auto p-2" />
            )}
          </div>
          <input type="hidden" name="signature" value={signature} />
        </div>

        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t p-4 shadow-lg flex justify-end gap-4 z-10">
          <button type="button" className="px-6 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors">취소</button>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md">견적 저장하기</button>
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
                <input type="number" value={cbmLength} onChange={e => setCbmLength(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500" placeholder="예: 100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">세로 (cm)</label>
                <input type="number" value={cbmWidth} onChange={e => setCbmWidth(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500" placeholder="예: 50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">높이 (cm)</label>
                <input type="number" value={cbmHeight} onChange={e => setCbmHeight(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500" placeholder="예: 200" />
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
