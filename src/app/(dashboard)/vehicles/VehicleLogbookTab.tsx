'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  type VehicleItem
} from '@/app/actions/vehicle'
import {
  getVehicleLogs,
  createVehicleLog,
  updateVehicleLog,
  deleteVehicleLog,
  updateVehicleLogSettings,
  type VehicleLogItem,
  type VehicleLogCategory
} from '@/app/actions/vehicleLog'
import { handleSelectAllOnFocus } from '@/lib/format'
import {
  Fuel,
  Wrench,
  ShieldCheck,
  Receipt,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Settings,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Truck,
  X,
  Check,
  Calendar,
  Calculator
} from 'lucide-react'

interface VehicleLogbookTabProps {
  vehicles: VehicleItem[]
  selectedVehicleId: string
  onSelectVehicleId: (id: string) => void
  currentYearMonth: string
  onMonthChange: (offset: number) => void
  onResetToCurrentMonth: () => void
  onRefreshVehicles: () => Promise<void>
}

const CATEGORY_META: Record<
  VehicleLogCategory,
  {
    label: string
    shortLabel: string
    badgeClass: string
    subTypes: string[]
  }
> = {
  FUEL: {
    label: '⛽ 주유 · 요소수',
    shortLabel: '주유/요소수',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    subTypes: ['경유 주유', '요소수 보충', '경유+요소수']
  },
  MAINTENANCE: {
    label: '🔧 정비 · 소모품 교환',
    shortLabel: '정비/소모품',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    subTypes: [
      '엔진오일/필터 교환',
      '타이어 교환/펑크',
      '브레이크 패드/라이닝',
      '배터리/제네레이터',
      '미션/데후오일',
      '탑차/리프트 특장수리',
      '에어컨/히터/냉각수',
      '기타 정비/부품'
    ]
  },
  TOLL_PARKING: {
    label: '🛣️ 통행료 · 주차 · 세차',
    shortLabel: '통행료/세차',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    subTypes: ['고속도로 하이패스/통행료', '현장 주차비', '대형차 세차비', '기타 운행경비']
  },
  INSURANCE_TAX: {
    label: '📋 검사 · 보험 · 세금',
    shortLabel: '검사/보험/세금',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    subTypes: [
      '화물차 정기/종합검사',
      '자동차/적재물 배상보험',
      '타코미터(운행기록계) 점검',
      '자동차세/협회비/공과금'
    ]
  }
}

const SUBSIDY_RATE_PRESETS = [
  { label: '183.21원/L (유류세 인하)', value: 183.21 },
  { label: '205.0원/L (표준 평균)', value: 205.0 },
  { label: '230.0원/L', value: 230.0 },
  { label: '256.96원/L (기본 세액)', value: 256.96 }
]

export default function VehicleLogbookTab({
  vehicles,
  selectedVehicleId,
  onSelectVehicleId,
  currentYearMonth,
  onMonthChange,
  onResetToCurrentMonth,
  onRefreshVehicles
}: VehicleLogbookTabProps) {
  // 자사 운행 차량 목록 (없을 경우 전체 차량 fallback)
  const ownVehicles = useMemo(() => {
    const own = vehicles.filter(v => v.ownership === 'OWN')
    return own.length > 0 ? own : vehicles
  }, [vehicles])

  // 차량이 1대뿐이고 초기 상태면 자동으로 해당 차량을 기본 선택
  useEffect(() => {
    if (ownVehicles.length === 1 && (!selectedVehicleId || selectedVehicleId === 'ALL')) {
      onSelectVehicleId(ownVehicles[0].id)
    }
  }, [ownVehicles, selectedVehicleId, onSelectVehicleId])

  const activeVehicle = useMemo(() => {
    if (selectedVehicleId && selectedVehicleId !== 'ALL') {
      return ownVehicles.find(v => v.id === selectedVehicleId) || ownVehicles[0] || null
    }
    return ownVehicles[0] || null
  }, [ownVehicles, selectedVehicleId])

  const [logs, setLogs] = useState<VehicleLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | VehicleLogCategory>('ALL')

  // 내역 등록/수정 모달 상태
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<VehicleLogItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 폼 입력 상태
  const [formVehicleId, setFormVehicleId] = useState('')
  const [formLogDate, setFormLogDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const [formCategory, setFormCategory] = useState<VehicleLogCategory>('FUEL')
  const [formSubType, setFormSubType] = useState('경유 주유')
  const [formTotalAmount, setFormTotalAmount] = useState<number>(0)
  const [formUnitPrice, setFormUnitPrice] = useState<number>(1600) // 기본 경유 단가 예시
  const [formFuelLiters, setFormFuelLiters] = useState<number>(0)
  const [formApplySubsidy, setFormApplySubsidy] = useState<boolean>(true)
  const [formIncludeExtraPriceSubsidy, setFormIncludeExtraPriceSubsidy] = useState<boolean>(false) // 1,700원 초과분 50% 유가연동보조금
  const [formSubsidyRate, setFormSubsidyRate] = useState<number>(205.0)
  const [formSubsidyAmount, setFormSubsidyAmount] = useState<number>(0)
  const [formIsSubsidyManual, setFormIsSubsidyManual] = useState<boolean>(false)
  const [formMileage, setFormMileage] = useState<number>(0)
  const [formNextDueMileage, setFormNextDueMileage] = useState<number>(0)
  const [formNextDueDate, setFormNextDueDate] = useState<string>('')
  const [formShopName, setFormShopName] = useState<string>('')
  const [formDriverName, setFormDriverName] = useState<string>('')
  const [formPaymentMethod, setFormPaymentMethod] = useState<string>('화물복지카드')
  const [formMemo, setFormMemo] = useState<string>('')

  // 차량 관리 기준(주행거리/엔진오일/검사일/유가보조금 단가) 설정 모달 상태
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [setMileage, setSetMileage] = useState<number>(0)
  const [setNextOilKm, setSetNextOilKm] = useState<number>(0)
  const [setInspectionExp, setSetInspectionExp] = useState<string>('')
  const [setInsuranceExp, setSetInsuranceExp] = useState<string>('')
  const [setSubsidyRate, setSetSubsidyRate] = useState<number>(205.0)
  const [setMonthlyLimit, setSetMonthlyLimit] = useState<number>(2261)
  const [savingSettings, setSavingSettings] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    const data = await getVehicleLogs(currentYearMonth, selectedVehicleId)
    setLogs(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [currentYearMonth, selectedVehicleId])

  // 유가보조금 자동 계산 함수
  const calculateSubsidy = (
    liters: number,
    unitPrice: number,
    baseRate: number,
    applySubsidy: boolean,
    includeExtra: boolean
  ) => {
    if (!applySubsidy || liters <= 0) return 0
    // 기본 유류세 연동 보조금 = 주유량(L) * 리터당 보조금 단가
    let perLiterSubsidy = baseRate
    // 한시적 유가연동보조금(경유 기준가격 1,700원/L 초과분의 50% 추가 지원) 체크 시
    if (includeExtra && unitPrice > 1700) {
      perLiterSubsidy += (unitPrice - 1700) * 0.5
    }
    return Math.round(liters * perLiterSubsidy)
  }

  // 총 주유금액 변경 시 -> 단가가 있으면 주유량(L) 및 유가보조금 자동 계산
  const handleTotalAmountChange = (newTotal: number) => {
    setFormTotalAmount(newTotal)
    if (formCategory === 'FUEL') {
      let nextLiters = formFuelLiters
      if (formUnitPrice > 0 && newTotal > 0) {
        nextLiters = Number((newTotal / formUnitPrice).toFixed(2))
        setFormFuelLiters(nextLiters)
      }
      if (!formIsSubsidyManual) {
        const autoSub = calculateSubsidy(
          nextLiters,
          formUnitPrice,
          formSubsidyRate,
          formApplySubsidy,
          formIncludeExtraPriceSubsidy
        )
        setFormSubsidyAmount(autoSub)
      }
    }
  }

  // 리터당 주유소 단가 변경 시 -> 총 주유금액이 있으면 주유량(L) 및 보조금 재계산
  const handleUnitPriceChange = (newPrice: number) => {
    setFormUnitPrice(newPrice)
    if (formCategory === 'FUEL') {
      let nextLiters = formFuelLiters
      if (newPrice > 0 && formTotalAmount > 0) {
        nextLiters = Number((formTotalAmount / newPrice).toFixed(2))
        setFormFuelLiters(nextLiters)
      }
      if (!formIsSubsidyManual) {
        const autoSub = calculateSubsidy(
          nextLiters,
          newPrice,
          formSubsidyRate,
          formApplySubsidy,
          formIncludeExtraPriceSubsidy
        )
        setFormSubsidyAmount(autoSub)
      }
    }
  }

  // 주유량(L) 직접 변경 시 -> 유가보조금 자동 재계산 (총액이 비어있고 단가가 있으면 총액도 계산)
  const handleFuelLitersChange = (newLiters: number) => {
    setFormFuelLiters(newLiters)
    if (formCategory === 'FUEL') {
      if (formTotalAmount === 0 && formUnitPrice > 0 && newLiters > 0) {
        setFormTotalAmount(Math.round(newLiters * formUnitPrice))
      } else if (formTotalAmount > 0 && newLiters > 0) {
        setFormUnitPrice(Math.round(formTotalAmount / newLiters))
      }
      if (!formIsSubsidyManual) {
        const autoSub = calculateSubsidy(
          newLiters,
          formUnitPrice,
          formSubsidyRate,
          formApplySubsidy,
          formIncludeExtraPriceSubsidy
        )
        setFormSubsidyAmount(autoSub)
      }
    }
  }

  // 보조금 적용 여부 / 단가 / 초과보조금 옵션 변경 시 즉시 재계산
  useEffect(() => {
    if (formCategory === 'FUEL' && !formIsSubsidyManual) {
      const autoSub = calculateSubsidy(
        formFuelLiters,
        formUnitPrice,
        formSubsidyRate,
        formApplySubsidy,
        formIncludeExtraPriceSubsidy
      )
      setFormSubsidyAmount(autoSub)
    }
  }, [formApplySubsidy, formSubsidyRate, formIncludeExtraPriceSubsidy, formCategory])

  // 빠른 내역 등록 모달 열기
  const openCreateLogModal = (defaultCat: VehicleLogCategory = 'FUEL') => {
    const targetV = activeVehicle || ownVehicles[0]
    setEditingLog(null)
    setFormVehicleId(targetV?.id || '')
    const now = new Date()
    setFormLogDate(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    )
    setFormCategory(defaultCat)
    setFormSubType(CATEGORY_META[defaultCat].subTypes[0])
    setFormTotalAmount(0)
    setFormUnitPrice(1600)
    setFormFuelLiters(0)
    setFormApplySubsidy(defaultCat === 'FUEL')
    setFormIncludeExtraPriceSubsidy(false)
    setFormSubsidyRate(targetV?.subsidyRatePerLiter || 205.0)
    setFormSubsidyAmount(0)
    setFormIsSubsidyManual(false)
    setFormMileage(targetV?.currentMileage || 0)
    setFormNextDueMileage(
      defaultCat === 'MAINTENANCE' && targetV?.currentMileage
        ? targetV.currentMileage + 15000
        : 0
    )
    setFormNextDueDate('')
    setFormShopName('')
    setFormDriverName(targetV?.teamLeader || '')
    setFormPaymentMethod(defaultCat === 'FUEL' ? '화물복지카드' : '법인카드')
    setFormMemo('')
    setIsLogModalOpen(true)
  }

  // 기존 내역 수정 모달 열기
  const openEditLogModal = (item: VehicleLogItem) => {
    const targetV = ownVehicles.find(v => v.id === item.vehicleId) || activeVehicle
    setEditingLog(item)
    setFormVehicleId(item.vehicleId)
    setFormLogDate(item.logDate)
    setFormCategory(item.category)
    setFormSubType(item.subType || CATEGORY_META[item.category].subTypes[0])
    setFormTotalAmount(item.totalAmount)
    setFormUnitPrice(item.unitPrice || 1600)
    setFormFuelLiters(item.fuelLiters || 0)
    setFormApplySubsidy(item.subsidyAmount > 0)
    setFormIncludeExtraPriceSubsidy(false)
    setFormSubsidyRate(targetV?.subsidyRatePerLiter || 205.0)
    setFormSubsidyAmount(item.subsidyAmount || 0)
    setFormIsSubsidyManual(true)
    setFormMileage(item.mileage || 0)
    setFormNextDueMileage(item.nextDueMileage || 0)
    setFormNextDueDate(item.nextDueDate || '')
    setFormShopName(item.shopName || '')
    setFormDriverName(item.driverName || '')
    setFormPaymentMethod(item.paymentMethod || '화물복지카드')
    setFormMemo(item.memo || '')
    setIsLogModalOpen(true)
  }

  // 차량 기준정보(주행거리/엔진오일/검사일/유가보조금 단가) 설정 모달 열기
  const openVehicleSettingsModal = () => {
    if (!activeVehicle) return
    setSetMileage(activeVehicle.currentMileage || 0)
    setSetNextOilKm(
      activeVehicle.nextEngineOilKm ||
        (activeVehicle.currentMileage ? activeVehicle.currentMileage + 15000 : 15000)
    )
    setSetInspectionExp(activeVehicle.inspectionExpiry || '')
    setSetInsuranceExp(activeVehicle.insuranceExpiry || '')
    setSetSubsidyRate(activeVehicle.subsidyRatePerLiter || 205.0)
    setSetMonthlyLimit(activeVehicle.monthlySubsidyLimitLiters || 2261)
    setIsSettingsOpen(true)
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeVehicle) return
    setSavingSettings(true)
    try {
      const res = await updateVehicleLogSettings(activeVehicle.id, {
        currentMileage: setMileage,
        nextEngineOilKm: setNextOilKm,
        inspectionExpiry: setInspectionExp,
        insuranceExpiry: setInsuranceExp,
        subsidyRatePerLiter: setSubsidyRate,
        monthlySubsidyLimitLiters: setMonthlyLimit
      })
      if (res.error) {
        alert(res.error)
      } else {
        setIsSettingsOpen(false)
        await onRefreshVehicles()
      }
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formVehicleId) {
      alert('차량을 선택해주세요.')
      return
    }
    const targetV = ownVehicles.find(v => v.id === formVehicleId)
    const subsidy =
      formCategory === 'FUEL' && formApplySubsidy && formPaymentMethod === '화물복지카드'
        ? formSubsidyAmount
        : 0
    const net = Math.max(0, formTotalAmount - subsidy)

    setIsSubmitting(true)
    try {
      const payload = {
        vehicleId: formVehicleId,
        vehicleName: targetV?.name || '',
        vehicleNo: targetV?.vehicleNo || '',
        logDate: formLogDate,
        category: formCategory,
        subType: formSubType,
        totalAmount: formTotalAmount,
        subsidyAmount: subsidy,
        netAmount: net,
        fuelLiters: formCategory === 'FUEL' ? formFuelLiters : 0,
        unitPrice: formCategory === 'FUEL' ? formUnitPrice : 0,
        mileage: formMileage,
        nextDueMileage: formNextDueMileage,
        nextDueDate: formNextDueDate,
        shopName: formShopName,
        driverName: formDriverName,
        paymentMethod: formPaymentMethod,
        memo: formMemo
      }

      const res = editingLog
        ? await updateVehicleLog(editingLog.id, payload)
        : await createVehicleLog(payload)

      if (res.error) {
        alert(res.error)
      } else {
        setIsLogModalOpen(false)
        await Promise.all([fetchLogs(), onRefreshVehicles()])
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteLog = async (item: VehicleLogItem) => {
    if (!confirm(`[${item.logDate}] ${item.subType} (${item.totalAmount.toLocaleString()}원) 내역을 삭제하시겠습니까?`)) {
      return
    }
    const res = await deleteVehicleLog(item.id)
    if (res.error) {
      alert(res.error)
    } else {
      await fetchLogs()
    }
  }

  // 월간 통계 계산
  const stats = useMemo(() => {
    let totalGross = 0
    let totalSubsidy = 0
    let totalNet = 0

    let fuelGross = 0
    let fuelNet = 0
    let dieselLiters = 0 // 경유 주유 리터 (유가보조금 한도 체크용)

    let maintenanceCost = 0
    let tollParkingCost = 0
    let insuranceTaxCost = 0

    const mileages: number[] = []

    logs.forEach(l => {
      totalGross += l.totalAmount
      totalSubsidy += l.subsidyAmount
      totalNet += l.netAmount

      if (l.mileage > 0) {
        mileages.push(l.mileage)
      }

      if (l.category === 'FUEL') {
        fuelGross += l.totalAmount
        fuelNet += l.netAmount
        if (!l.subType.includes('요소수')) {
          dieselLiters += l.fuelLiters || 0
        }
      } else if (l.category === 'MAINTENANCE') {
        maintenanceCost += l.netAmount
      } else if (l.category === 'TOLL_PARKING') {
        tollParkingCost += l.netAmount
      } else if (l.category === 'INSURANCE_TAX') {
        insuranceTaxCost += l.netAmount
      }
    })

    // 이달 운행거리 추정 (기록된 주행거리 중 최대값 - 최소값)
    let monthDistanceKm = 0
    if (mileages.length >= 2) {
      monthDistanceKm = Math.max(...mileages) - Math.min(...mileages)
    }

    const avgFuelEfficiency =
      monthDistanceKm > 0 && dieselLiters > 0
        ? Number((monthDistanceKm / dieselLiters).toFixed(2))
        : 0

    const actualCostPerKm =
      monthDistanceKm > 0 && fuelNet > 0 ? Math.round(fuelNet / monthDistanceKm) : 0

    const monthlyLimit = activeVehicle?.monthlySubsidyLimitLiters || 2261
    const remainingLimitLiters = Math.max(0, Number((monthlyLimit - dieselLiters).toFixed(1)))
    const limitUsagePercent = Math.min(100, Math.round((dieselLiters / monthlyLimit) * 100))

    return {
      totalGross,
      totalSubsidy,
      totalNet,
      fuelGross,
      fuelNet,
      dieselLiters: Number(dieselLiters.toFixed(1)),
      maintenanceCost,
      tollParkingCost,
      insuranceTaxCost,
      monthDistanceKm,
      avgFuelEfficiency,
      actualCostPerKm,
      monthlyLimit,
      remainingLimitLiters,
      limitUsagePercent
    }
  }, [logs, activeVehicle])

  const filteredLogs = useMemo(() => {
    if (categoryFilter === 'ALL') return logs
    return logs.filter(l => l.category === categoryFilter)
  }, [logs, categoryFilter])

  // 엔진오일 잔여 주행거리 계산
  const engineOilStatus = useMemo(() => {
    if (!activeVehicle || !activeVehicle.nextEngineOilKm) return null
    const remain = activeVehicle.nextEngineOilKm - (activeVehicle.currentMileage || 0)
    return {
      nextKm: activeVehicle.nextEngineOilKm,
      remainKm: remain,
      isUrgent: remain <= 1500
    }
  }, [activeVehicle])

  const netPreviewAmount = Math.max(
    0,
    formTotalAmount - (formCategory === 'FUEL' && formApplySubsidy ? formSubsidyAmount : 0)
  )

  return (
    <div className="space-y-4">
      {/* 1. 상단 차량 선택 탭 & 월 이동 컨트롤 바 */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* 호차 선택 (1대일 때는 자동 선택, 향후 증차 시 탭 자동 확장) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {ownVehicles.map(v => {
              const isSelected = selectedVehicleId === v.id
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectVehicleId(v.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>{v.name}</span>
                  {v.vehicleNo && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                        isSelected ? 'bg-amber-300 text-gray-950' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {v.vehicleNo}
                    </span>
                  )}
                </button>
              )
            })}

            {ownVehicles.length > 1 && (
              <button
                type="button"
                onClick={() => onSelectVehicleId('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                  selectedVehicleId === 'ALL'
                    ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                전체 차량 합산 ({ownVehicles.length}대)
              </button>
            )}
          </div>

          {/* 월 선택 네비게이션 */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onMonthChange(-1)}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm sm:text-base font-black text-gray-900 min-w-[100px] text-center">
                {currentYearMonth.split('-')[0]}년 {Number(currentYearMonth.split('-')[1])}월
              </span>
              <button
                type="button"
                onClick={() => onMonthChange(1)}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onResetToCurrentMonth}
                className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200"
              >
                이번 달
              </button>
            </div>

            {activeVehicle && (
              <button
                type="button"
                onClick={openVehicleSettingsModal}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 flex items-center gap-1 whitespace-nowrap"
                title="현재 주행거리, 엔진오일 주기, 유가보조금 단가 설정"
              >
                <Settings className="w-3.5 h-3.5 text-gray-600" />
                <span>차량 기준/보조금 설정</span>
              </button>
            )}
          </div>
        </div>

        {/* 선택된 차량의 현재 계기판 주행거리 · 엔진오일 · 정기검사 · 유가보조금 기준 표시줄 */}
        {activeVehicle && (
          <div className="pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                <Gauge className="w-3.5 h-3.5 text-slate-700" />
                <span className="text-gray-600 font-medium">현재 주행거리:</span>
                <strong className="text-gray-900 font-black">
                  {(activeVehicle.currentMileage || 0).toLocaleString()} km
                </strong>
              </div>

              {engineOilStatus ? (
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                    engineOilStatus.isUrgent
                      ? 'bg-red-50 border-red-300 text-red-800'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>다음 엔진오일:</span>
                  <strong>{engineOilStatus.nextKm.toLocaleString()} km</strong>
                  <span className="font-bold">
                    (
                    {engineOilStatus.remainKm > 0
                      ? `${engineOilStatus.remainKm.toLocaleString()}km 남음`
                      : `${Math.abs(engineOilStatus.remainKm).toLocaleString()}km 초과!`}
                    )
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openVehicleSettingsModal}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  + 엔진오일 교환주기 설정
                </button>
              )}

              {activeVehicle.inspectionExpiry && (
                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 px-2.5 py-1 rounded-lg border border-purple-200 font-semibold">
                  📋 정기검사 만기: <strong>{activeVehicle.inspectionExpiry}</strong>
                </span>
              )}

              {activeVehicle.insuranceExpiry && (
                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded-lg border border-indigo-200 font-semibold">
                  🛡️ 보험 만기: <strong>{activeVehicle.insuranceExpiry}</strong>
                </span>
              )}
            </div>

            <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
              <span>
                화물 유가보조금 기준:{' '}
                <strong className="text-blue-700">{activeVehicle.subsidyRatePerLiter || 205}원/L</strong>
              </span>
              <span>·</span>
              <span>
                월 한도:{' '}
                <strong className="text-gray-800">
                  {(activeVehicle.monthlySubsidyLimitLiters || 2261).toLocaleString()}L
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. 빠른 기록 버튼 바 (원클릭 모달 오픈) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => openCreateLogModal('FUEL')}
          className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Fuel className="w-4 h-4" />
          <span>+ 주유 · 요소수 기록</span>
        </button>

        <button
          type="button"
          onClick={() => openCreateLogModal('MAINTENANCE')}
          className="p-3 rounded-2xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-extrabold text-xs sm:text-sm shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Wrench className="w-4 h-4 text-amber-600" />
          <span>+ 정비 · 소모품 기록</span>
        </button>

        <button
          type="button"
          onClick={() => openCreateLogModal('TOLL_PARKING')}
          className="p-3 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 font-extrabold text-xs sm:text-sm shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Receipt className="w-4 h-4 text-emerald-600" />
          <span>+ 통행료 · 주차 · 세차</span>
        </button>

        <button
          type="button"
          onClick={() => openCreateLogModal('INSURANCE_TAX')}
          className="p-3 rounded-2xl bg-white hover:bg-purple-50 text-purple-900 border border-purple-300 font-extrabold text-xs sm:text-sm shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <ShieldCheck className="w-4 h-4 text-purple-600" />
          <span>+ 검사 · 보험 · 세금</span>
        </button>
      </div>

      {/* 3. 월간 차계부 핵심 요약 카드 4종 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 카드 1: 이달 실부담 총 지출 */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">이달 실부담 차량유지비</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
              보조금 차감 후
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-gray-900 mt-1.5">
            {stats.totalNet.toLocaleString()}원
          </p>
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>총 결제: {stats.totalGross.toLocaleString()}원</span>
            <span className="text-emerald-700 font-bold">
              보조금 -{stats.totalSubsidy.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* 카드 2: 주유량 및 5톤 유가보조금 한도 게이지 */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">이달 경유 주유 / 보조금 한도</span>
            <span className="text-[11px] font-extrabold text-blue-700">
              {stats.limitUsagePercent}% 사용
            </span>
          </div>
          <p className="text-lg sm:text-xl font-black text-blue-700 mt-1">
            {stats.dieselLiters.toLocaleString()} L{' '}
            <span className="text-xs font-semibold text-gray-400">
              / {stats.monthlyLimit.toLocaleString()} L
            </span>
          </p>
          <div className="mt-2 space-y-1">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  stats.limitUsagePercent >= 90 ? 'bg-red-500' : 'bg-blue-600'
                }`}
                style={{ width: `${stats.limitUsagePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-500">
              <span>잔여 한도: {stats.remainingLimitLiters.toLocaleString()} L</span>
              <span className="font-semibold text-gray-700">
                실주유비 {stats.fuelNet.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        {/* 카드 3: 이달 주행거리 & 실측 연비 / km당 유류비 */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">운행거리 · 실측 연비</span>
            <Gauge className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-gray-900 mt-1">
            {stats.monthDistanceKm > 0 ? `${stats.monthDistanceKm.toLocaleString()} km` : '주행거리 기록 대기'}
          </p>
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <span className="text-gray-600">
              평균 연비:{' '}
              <strong className="text-emerald-700">
                {stats.avgFuelEfficiency > 0 ? `${stats.avgFuelEfficiency} km/L` : '-'}
              </strong>
            </span>
            <span className="text-gray-600">
              km당 유류비:{' '}
              <strong className="text-blue-700">
                {stats.actualCostPerKm > 0 ? `${stats.actualCostPerKm.toLocaleString()}원` : '-'}
              </strong>
            </span>
          </div>
        </div>

        {/* 카드 4: 정비 · 통행료 · 검사/보험 합계 */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-bold text-gray-500">정비 · 통행료 · 검사/보험</span>
          <div className="space-y-1 mt-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">🔧 정비/소모품:</span>
              <strong className="text-amber-800">{stats.maintenanceCost.toLocaleString()}원</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">🛣️ 통행료/세차:</span>
              <strong className="text-emerald-800">{stats.tollParkingCost.toLocaleString()}원</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">📋 검사/보험/세금:</span>
              <strong className="text-purple-800">{stats.insuranceTaxCost.toLocaleString()}원</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 차계부 내역 필터 및 상세 리스트 */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-50/60">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: 'ALL', label: `전체 내역 (${logs.length})` },
              {
                key: 'FUEL',
                label: `⛽ 주유/요소수 (${logs.filter(l => l.category === 'FUEL').length})`
              },
              {
                key: 'MAINTENANCE',
                label: `🔧 정비/소모품 (${logs.filter(l => l.category === 'MAINTENANCE').length})`
              },
              {
                key: 'TOLL_PARKING',
                label: `🛣️ 통행료/세차 (${logs.filter(l => l.category === 'TOLL_PARKING').length})`
              },
              {
                key: 'INSURANCE_TAX',
                label: `📋 검사/보험 (${logs.filter(l => l.category === 'INSURANCE_TAX').length})`
              }
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setCategoryFilter(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  categoryFilter === tab.key
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-gray-500 font-medium">
            표시 건수: <strong>{filteredLogs.length}건</strong>
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            차계부 내역을 불러오는 중입니다...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Fuel className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-gray-700">
              {currentYearMonth}에 등록된 차계부 내역이 없습니다.
            </p>
            <p className="text-xs text-gray-400">
              상단의 [+ 주유 · 요소수 기록] 또는 [+ 정비 · 소모품 기록] 버튼을 눌러 첫 내역을 기록해보세요.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-100/80 text-gray-700 border-b border-gray-200 text-xs">
                  <th className="py-3 px-3.5 font-bold whitespace-nowrap">일자</th>
                  {ownVehicles.length > 1 && (
                    <th className="py-3 px-3 font-bold whitespace-nowrap">차량</th>
                  )}
                  <th className="py-3 px-3 font-bold whitespace-nowrap">분류 / 세부항목</th>
                  <th className="py-3 px-3 font-bold whitespace-nowrap">주행거리</th>
                  <th className="py-3 px-3 font-bold whitespace-nowrap">주유량 · 상세내역</th>
                  <th className="py-3 px-3 font-bold text-right whitespace-nowrap">총 결제액</th>
                  <th className="py-3 px-3 font-bold text-right whitespace-nowrap">유가보조금</th>
                  <th className="py-3 px-3.5 font-bold text-right whitespace-nowrap">실부담액</th>
                  <th className="py-3 px-3 font-bold text-center whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map(item => {
                  const meta = CATEGORY_META[item.category] || CATEGORY_META.FUEL
                  return (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-gray-900 whitespace-nowrap">
                        {item.logDate}
                      </td>
                      {ownVehicles.length > 1 && (
                        <td className="py-3 px-3 font-bold text-gray-800 whitespace-nowrap">
                          {item.vehicleName || '-'}
                        </td>
                      )}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${meta.badgeClass}`}
                          >
                            {meta.shortLabel}
                          </span>
                          <span className="font-bold text-gray-900">{item.subType}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.mileage > 0 ? (
                          <span className="font-mono font-semibold text-gray-800">
                            {item.mileage.toLocaleString()} km
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          {item.category === 'FUEL' && item.fuelLiters > 0 && (
                            <div className="text-xs font-bold text-blue-700">
                              주유 {item.fuelLiters.toLocaleString()}L
                              {item.unitPrice > 0 && (
                                <span className="text-gray-500 font-normal ml-1">
                                  (@{item.unitPrice.toLocaleString()}원/L)
                                </span>
                              )}
                            </div>
                          )}
                          {(item.shopName || item.memo || item.driverName) && (
                            <div className="text-xs text-gray-600 flex flex-wrap items-center gap-1.5">
                              {item.shopName && (
                                <span className="font-semibold text-gray-800">[{item.shopName}]</span>
                              )}
                              {item.memo && <span>{item.memo}</span>}
                              {item.driverName && (
                                <span className="text-[11px] text-gray-400">({item.driverName})</span>
                              )}
                            </div>
                          )}
                          {item.nextDueMileage > 0 && (
                            <div className="text-[11px] font-bold text-amber-700">
                              📌 다음 교환 예정: {item.nextDueMileage.toLocaleString()} km
                            </div>
                          )}
                          {item.nextDueDate && (
                            <div className="text-[11px] font-bold text-purple-700">
                              📌 다음 만기/예정일: {item.nextDueDate}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-700 whitespace-nowrap">
                        {item.totalAmount.toLocaleString()}원
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {item.subsidyAmount > 0 ? (
                          <span className="font-bold text-emerald-700">
                            -{item.subsidyAmount.toLocaleString()}원
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right font-black text-gray-900 whitespace-nowrap">
                        {item.netAmount.toLocaleString()}원
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditLogModal(item)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="수정"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLog(item)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================== 모달 1: 차계부 내역 등록 / 수정 모달 ==================== */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* 모달 헤더 */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-800 to-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fuel className="w-5 h-5 text-blue-300" />
                <h2 className="text-base font-extrabold">
                  {editingLog ? '차계부 내역 수정' : '차계부 신규 기록'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* 1. 카테고리 선택 탭 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-gray-100 rounded-xl">
                {(Object.keys(CATEGORY_META) as VehicleLogCategory[]).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setFormCategory(cat)
                      setFormSubType(CATEGORY_META[cat].subTypes[0])
                      if (cat === 'FUEL') {
                        setFormApplySubsidy(true)
                        setFormPaymentMethod('화물복지카드')
                      } else {
                        setFormApplySubsidy(false)
                        setFormPaymentMethod('법인카드')
                      }
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-extrabold transition-all ${
                      formCategory === cat
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {CATEGORY_META[cat].label}
                  </button>
                ))}
              </div>

              {/* 2. 차량 선택 & 일자 & 계기판 주행거리 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">대상 차량(호차)</label>
                  <select
                    value={formVehicleId}
                    onChange={e => {
                      const vid = e.target.value
                      setFormVehicleId(vid)
                      const found = ownVehicles.find(v => v.id === vid)
                      if (found) {
                        if (!editingLog) {
                          setFormMileage(found.currentMileage || 0)
                          setFormDriverName(found.teamLeader || '')
                          setFormSubsidyRate(found.subsidyRatePerLiter || 205.0)
                        }
                      }
                    }}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-bold text-gray-900 outline-none focus:border-blue-500"
                  >
                    {ownVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.vehicleNo ? `(${v.vehicleNo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">일자</label>
                  <input
                    type="date"
                    required
                    value={formLogDate}
                    onChange={e => setFormLogDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-bold text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    계기판 주행거리 (km)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={formMileage || ''}
                      onFocus={handleSelectAllOnFocus}
                      onChange={e => {
                        const km = Number(e.target.value) || 0
                        setFormMileage(km)
                        if (
                          formCategory === 'MAINTENANCE' &&
                          formSubType.includes('엔진오일') &&
                          km > 0
                        ) {
                          setFormNextDueMileage(km + 15000)
                        }
                      }}
                      placeholder="예: 125400"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 pr-10 font-extrabold text-gray-900 outline-none focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                      km
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. 세부 항목 빠른 선택 버튼 + 직접 입력 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">세부 항목 선택</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_META[formCategory].subTypes.map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setFormSubType(st)
                        if (formCategory === 'FUEL') {
                          const isUrea = st.includes('요소수') && !st.includes('경유')
                          if (isUrea) {
                            setFormApplySubsidy(false)
                            setFormSubsidyAmount(0)
                          } else if (formPaymentMethod === '화물복지카드') {
                            setFormApplySubsidy(true)
                            setFormIsSubsidyManual(false)
                          }
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        formSubType === st
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. 주유(FUEL) 전용: 주유량 및 화물 유가보조금 실시간 자동 계산 패널 */}
              {formCategory === 'FUEL' ? (
                <div className="p-3.5 rounded-2xl bg-blue-50/60 border-2 border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-blue-600" />
                      <span>주유 금액 · 리터(L) · 화물 유가보조금 자동 계산</span>
                    </span>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formApplySubsidy}
                        onChange={e => {
                          const checked = e.target.checked
                          setFormApplySubsidy(checked)
                          setFormIsSubsidyManual(false)
                          if (checked) {
                            setFormPaymentMethod('화물복지카드')
                          } else {
                            setFormSubsidyAmount(0)
                            if (formPaymentMethod === '화물복지카드' && !formSubType.includes('요소수')) {
                              setFormPaymentMethod('법인카드')
                            }
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className={`text-xs font-bold ${formApplySubsidy ? 'text-blue-800' : 'text-gray-500'}`}>
                        {formApplySubsidy
                          ? '화물복지카드 보조금 적용 중'
                          : `보조금 미적용 (${formPaymentMethod})`}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        ① 총 주유 결제금액 (원) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={formTotalAmount || ''}
                        onFocus={handleSelectAllOnFocus}
                        onChange={e => handleTotalAmountChange(Number(e.target.value) || 0)}
                        placeholder="예: 160000"
                        className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 font-black text-gray-900 outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        ② 주유소 단가 (원/L)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formUnitPrice || ''}
                        onFocus={handleSelectAllOnFocus}
                        onChange={e => handleUnitPriceChange(Number(e.target.value) || 0)}
                        placeholder="예: 1600"
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-bold text-gray-900 outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        ③ 주유량 (L, 자동산출/직접입력)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={formFuelLiters || ''}
                        onFocus={handleSelectAllOnFocus}
                        onChange={e => handleFuelLitersChange(Number(e.target.value) || 0)}
                        placeholder="예: 100.0"
                        className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 font-black text-blue-700 outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* 유가보조금 상세 설정 및 결과 */}
                  {formApplySubsidy && (
                    <div className="pt-2 border-t border-blue-200/80 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-700">리터당 보조금 단가:</span>
                          <input
                            type="number"
                            step="0.01"
                            value={formSubsidyRate}
                            onFocus={handleSelectAllOnFocus}
                            onChange={e => {
                              setFormSubsidyRate(Number(e.target.value) || 0)
                              setFormIsSubsidyManual(false)
                            }}
                            className="w-24 rounded-lg border border-blue-300 bg-white px-2 py-1 text-xs font-extrabold text-blue-800"
                          />
                          <span className="text-[11px] text-gray-500">원/L</span>
                        </div>

                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-blue-900 font-semibold">
                          <input
                            type="checkbox"
                            checked={formIncludeExtraPriceSubsidy}
                            onChange={e => {
                              setFormIncludeExtraPriceSubsidy(e.target.checked)
                              setFormIsSubsidyManual(false)
                            }}
                            className="w-3.5 h-3.5 text-blue-600 rounded"
                          />
                          <span>1,700원/L 초과분 50% 추가보조 포함</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 bg-white p-2.5 rounded-xl border border-blue-200">
                        <div>
                          <label className="block text-[11px] font-bold text-emerald-800 mb-0.5">
                            유가보조금 할인/환급액 (직접 보정 가능)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              value={formSubsidyAmount || ''}
                              onFocus={handleSelectAllOnFocus}
                              onChange={e => {
                                setFormSubsidyAmount(Number(e.target.value) || 0)
                                setFormIsSubsidyManual(true)
                              }}
                              className="w-full rounded-lg border border-emerald-300 bg-emerald-50/40 px-2.5 py-1.5 font-extrabold text-emerald-800 outline-none"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-emerald-700">
                              원
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col justify-center items-end pr-2">
                          <span className="text-[11px] font-bold text-gray-500">
                            실부담 주유비 (결제액 - 보조금)
                          </span>
                          <span className="text-base sm:text-lg font-black text-blue-900">
                            {netPreviewAmount.toLocaleString()} 원
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* 주유 외 일반 지출 금액 입력 */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      지출 금액 (원) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formTotalAmount || ''}
                      onFocus={handleSelectAllOnFocus}
                      onChange={e => setFormTotalAmount(Number(e.target.value) || 0)}
                      placeholder="예: 180000"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-black text-gray-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  {formCategory === 'MAINTENANCE' && (
                    <div>
                      <label className="block text-xs font-bold text-amber-900 mb-1">
                        다음 교체 예정 주행거리 (km)
                      </label>
                      <div className="space-y-1">
                        <input
                          type="number"
                          min={0}
                          value={formNextDueMileage || ''}
                          onFocus={handleSelectAllOnFocus}
                          onChange={e => setFormNextDueMileage(Number(e.target.value) || 0)}
                          placeholder="예: 140000"
                          className="w-full rounded-xl border border-amber-300 bg-amber-50/30 px-3 py-2 font-bold text-amber-950 outline-none"
                        />
                        {formMileage > 0 && (
                          <div className="flex gap-1">
                            {[10000, 15000, 20000].map(addKm => (
                              <button
                                key={addKm}
                                type="button"
                                onClick={() => setFormNextDueMileage(formMileage + addKm)}
                                className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 rounded hover:bg-amber-200"
                              >
                                +{(addKm / 10000).toFixed(1)}만km
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {formCategory === 'INSURANCE_TAX' && (
                    <div>
                      <label className="block text-xs font-bold text-purple-900 mb-1">
                        다음 만기일 / 갱신 예정일
                      </label>
                      <input
                        type="date"
                        value={formNextDueDate}
                        onChange={e => setFormNextDueDate(e.target.value)}
                        className="w-full rounded-xl border border-purple-300 bg-purple-50/30 px-3 py-2 font-bold text-purple-950 outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 5. 주유소/정비소명, 담당자, 결제수단, 메모 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {formCategory === 'FUEL' ? '주유소명' : formCategory === 'MAINTENANCE' ? '정비소명' : '결제처/장소'}
                  </label>
                  <input
                    type="text"
                    value={formShopName}
                    onChange={e => setFormShopName(e.target.value)}
                    placeholder={
                      formCategory === 'FUEL' ? '예: 만남의광장 주유소' : '예: 대성화물차정비'
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">담당 기사/팀장</label>
                  <input
                    type="text"
                    value={formDriverName}
                    onChange={e => setFormDriverName(e.target.value)}
                    placeholder="예: 김철수 팀장"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-semibold text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">결제 수단</label>
                  <select
                    value={formPaymentMethod}
                    onChange={e => {
                      const nextMethod = e.target.value
                      setFormPaymentMethod(nextMethod)
                      if (formCategory === 'FUEL') {
                        if (nextMethod !== '화물복지카드') {
                          setFormApplySubsidy(false)
                          setFormSubsidyAmount(0)
                        } else {
                          const isPureUrea =
                            formSubType.includes('요소수') && !formSubType.includes('경유')
                          if (!isPureUrea) {
                            setFormApplySubsidy(true)
                            setFormIsSubsidyManual(false)
                          }
                        }
                      }
                    }}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-semibold text-gray-800 outline-none focus:border-blue-500"
                  >
                    <option value="화물복지카드">화물복지카드 (유가보조금 대상)</option>
                    <option value="법인카드">법인카드 (보조금 미적용)</option>
                    <option value="하이패스">하이패스</option>
                    <option value="현금/계좌이체">현금/계좌이체 (보조금 미적용)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">상세 메모 (선택)</label>
                <input
                  type="text"
                  value={formMemo}
                  onChange={e => setFormMemo(e.target.value)}
                  placeholder="예: 에어크리너 함께 교체, 뒷타이어 2본 교환 등"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
                >
                  {isSubmitting ? '저장 중...' : editingLog ? '수정 내용 저장' : '차계부 기록 저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 모달 2: 차량 관리 기준 및 유가보조금 설정 모달 ==================== */}
      {isSettingsOpen && activeVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-300" />
                <h3 className="text-sm sm:text-base font-extrabold">
                  {activeVehicle.name} 관리 기준 · 보조금 설정
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    현재 누적 주행거리 (km)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={setMileage || ''}
                    onFocus={handleSelectAllOnFocus}
                    onChange={e => setSetMileage(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 font-extrabold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-800 mb-1">
                    다음 엔진오일 교환 (km)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={setNextOilKm || ''}
                    onFocus={handleSelectAllOnFocus}
                    onChange={e => setSetNextOilKm(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-amber-300 bg-amber-50/40 px-3 py-2 font-extrabold text-amber-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    정기검사 만기일
                  </label>
                  <input
                    type="date"
                    value={setInspectionExp}
                    onChange={e => setSetInspectionExp(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 font-semibold text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    자동차/적재물 보험 만기일
                  </label>
                  <input
                    type="date"
                    value={setInsuranceExp}
                    onChange={e => setSetInsuranceExp(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 font-semibold text-gray-800"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2.5">
                <label className="block text-xs font-extrabold text-blue-900">
                  ⛽ 화물복지카드 유가보조금 기본 단가 (원/L)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={setSubsidyRate}
                  onFocus={handleSelectAllOnFocus}
                  onChange={e => setSetSubsidyRate(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 font-black text-blue-800"
                />
                <div className="flex flex-wrap gap-1">
                  {SUBSIDY_RATE_PRESETS.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setSetSubsidyRate(p.value)}
                      className="px-2 py-1 rounded bg-white border border-blue-200 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    월간 유가보조금 한도 리터 (5톤 법정 기본: 2,261L)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={setMonthlyLimit}
                    onFocus={handleSelectAllOnFocus}
                    onChange={e => setSetMonthlyLimit(Number(e.target.value) || 2261)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 font-bold text-gray-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700"
                >
                  {savingSettings ? '저장 중...' : '설정 저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

