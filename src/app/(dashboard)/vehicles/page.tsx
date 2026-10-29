'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  getVehicles,
  createVehicle,
  updateVehicleFull,
  deleteVehicle,
  getDispatchSchedule,
  updateEstimateDispatch,
  type VehicleItem,
  type DispatchScheduleItem,
  type DispatchedVehicleRef,
  type EstimateDispatchInfo
} from '@/app/actions/vehicle'
import { formatPhoneNumber, handlePhoneInputChange, handleSelectAllOnFocus } from '@/lib/format'
import {
  Truck,
  UserCheck,
  Phone,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  PauseCircle,
  MapPin,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  FileText,
  Users
} from 'lucide-react'

const TONNAGE_PRESETS = [
  { label: '5톤', value: 5, defaultCbm: 30 },
  { label: '2.5톤', value: 2.5, defaultCbm: 15 },
  { label: '1톤', value: 1, defaultCbm: 6 },
  { label: '6톤 (5t+1t)', value: 6, defaultCbm: 36 },
  { label: '7.5톤 (5t+2.5t)', value: 7.5, defaultCbm: 45 },
  { label: '10톤 (5t×2)', value: 10, defaultCbm: 60 }
]

const VEHICLE_TYPES = ['탑차', '플러스탑', '윙바디', '카고', '호로차', '사다리차']

const CHARTERED_QUICK_OPTIONS = [
  { id: 'CH_1T_CARGO', name: '외주 1톤 카고', tonnage: 1 },
  { id: 'CH_1T_TOP', name: '외주 1톤 탑차', tonnage: 1 },
  { id: 'CH_2_5T_CARGO', name: '외주 2.5톤 카고', tonnage: 2.5 },
  { id: 'CH_2_5T_TOP', name: '외주 2.5톤 탑차', tonnage: 2.5 },
  { id: 'CH_5T_TOP', name: '외주 5톤 탑차', tonnage: 5 }
]

export default function VehiclesPage() {
  const [activeTab, setActiveTab] = useState<'FLEET' | 'DISPATCH'>('FLEET')
  const [vehicles, setVehicles] = useState<VehicleItem[]>([])
  const [schedules, setSchedules] = useState<DispatchScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [scheduleLoading, setScheduleLoading] = useState(false)

  // 현재 조회 월 (YYYY-MM)
  const [currentYearMonth, setCurrentYearMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // 차량 필터 ('ALL' | 'OWN' | 'STANDARD')
  const [fleetFilter, setFleetFilter] = useState<'ALL' | 'OWN' | 'STANDARD'>('ALL')

  // 배차 필터 ('ALL' | 'UNASSIGNED' | 'ASSIGNED' | 'CONFLICT')
  const [dispatchFilter, setDispatchFilter] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED' | 'CONFLICT'>('ALL')

  // 차량 등록/수정 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<VehicleItem | null>(null)
  const [formName, setFormName] = useState('')
  const [formVehicleNo, setFormVehicleNo] = useState('')
  const [formTonnage, setFormTonnage] = useState<number>(5)
  const [formVehicleType, setFormVehicleType] = useState('탑차')
  const [formMaxCbm, setFormMaxCbm] = useState<number>(30)
  const [formOwnership, setFormOwnership] = useState<'OWN' | 'STANDARD'>('OWN')
  const [formTeamLeader, setFormTeamLeader] = useState('')
  const [formLeaderPhone, setFormLeaderPhone] = useState('')
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'>('ACTIVE')
  const [formMemo, setFormMemo] = useState('')
  const [formSyncInventory, setFormSyncInventory] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 배차 편집 중인 견적 ID 및 임시 배차 상태
  const [editingDispatchId, setEditingDispatchId] = useState<string | null>(null)
  const [draftDispatch, setDraftDispatch] = useState<EstimateDispatchInfo | null>(null)
  const [savingDispatchId, setSavingDispatchId] = useState<string | null>(null)

  const fetchAllData = async (ym: string) => {
    setLoading(true)
    const [vData, sData] = await Promise.all([
      getVehicles(),
      getDispatchSchedule(ym)
    ])
    setVehicles(vData)
    setSchedules(sData)
    setLoading(false)
  }

  const fetchMonthSchedule = async (ym: string) => {
    setScheduleLoading(true)
    const sData = await getDispatchSchedule(ym)
    setSchedules(sData)
    setScheduleLoading(false)
  }

  useEffect(() => {
    fetchAllData(currentYearMonth)
  }, [])

  const handleMonthChange = (offset: number) => {
    const [y, m] = currentYearMonth.split('-').map(Number)
    const nextDate = new Date(y, m - 1 + offset, 1)
    const nextYm = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
    setCurrentYearMonth(nextYm)
    fetchMonthSchedule(nextYm)
  }

  const handleResetToCurrentMonth = () => {
    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    setCurrentYearMonth(ym)
    fetchMonthSchedule(ym)
  }

  // 모달 열기 (신규 / 수정)
  const openCreateModal = () => {
    setEditingVehicle(null)
    const ownCount = vehicles.filter(v => v.ownership === 'OWN').length
    setFormName(`${ownCount + 1}호차 (5톤 탑차)`)
    setFormVehicleNo('')
    setFormTonnage(5)
    setFormVehicleType('탑차')
    setFormMaxCbm(30)
    setFormOwnership('OWN')
    setFormTeamLeader('')
    setFormLeaderPhone('')
    setFormStatus('ACTIVE')
    setFormMemo('')
    setFormSyncInventory(true)
    setIsModalOpen(true)
  }

  const openEditModal = (v: VehicleItem) => {
    setEditingVehicle(v)
    setFormName(v.name)
    setFormVehicleNo(v.vehicleNo || '')
    setFormTonnage(v.tonnage || 5)
    setFormVehicleType(v.vehicleType || '탑차')
    setFormMaxCbm(v.maxCbm || 30)
    setFormOwnership(v.ownership || 'OWN')
    setFormTeamLeader(v.teamLeader || '')
    setFormLeaderPhone(formatPhoneNumber(v.leaderPhone || ''))
    setFormStatus(v.status || 'ACTIVE')
    setFormMemo(v.memo || '')
    setFormSyncInventory(false)
    setIsModalOpen(true)
  }

  // 톤수 프리셋 변경 시 적재 CBM 자동 추천
  const handleSelectTonnage = (ton: number, cbm: number) => {
    setFormTonnage(ton)
    setFormMaxCbm(cbm)
  }

  // 차량 저장 (신규/수정)
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      alert('호차/차량명을 입력해주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      if (editingVehicle) {
        const res = await updateVehicleFull(editingVehicle.id, {
          name: formName,
          vehicleNo: formVehicleNo,
          tonnage: formTonnage,
          vehicleType: formVehicleType,
          ownership: formOwnership,
          teamLeader: formTeamLeader,
          leaderPhone: formLeaderPhone,
          status: formStatus,
          memo: formMemo,
          maxCbm: formMaxCbm
        })
        if (res.error) {
          alert(res.error)
        } else {
          setIsModalOpen(false)
          const updated = await getVehicles()
          setVehicles(updated)
        }
      } else {
        const fd = new FormData()
        fd.set('name', formName)
        fd.set('vehicleNo', formVehicleNo)
        fd.set('tonnage', String(formTonnage))
        fd.set('vehicleType', formVehicleType)
        fd.set('ownership', formOwnership)
        fd.set('teamLeader', formTeamLeader)
        fd.set('leaderPhone', formLeaderPhone)
        fd.set('status', formStatus)
        fd.set('memo', formMemo)
        fd.set('maxCbm', String(formMaxCbm))
        fd.set('syncInventory', String(formSyncInventory))
        const res = await createVehicle(fd)
        if (res.error) {
          alert(res.error)
        } else {
          setIsModalOpen(false)
          const updated = await getVehicles()
          setVehicles(updated)
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // 차량 상태 원클릭 토글
  const handleQuickStatusToggle = async (v: VehicleItem) => {
    const nextStatus: Record<'ACTIVE' | 'MAINTENANCE' | 'INACTIVE', 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'> = {
      ACTIVE: 'MAINTENANCE',
      MAINTENANCE: 'INACTIVE',
      INACTIVE: 'ACTIVE'
    }
    const next = nextStatus[v.status || 'ACTIVE']
    const res = await updateVehicleFull(v.id, {
      ...v,
      status: next
    })
    if (!res.error) {
      setVehicles(prev => prev.map(item => (item.id === v.id ? { ...item, status: next } : item)))
    }
  }

  const handleDeleteVehicle = async (v: VehicleItem) => {
    if (!confirm(`'${v.name}' 차량 정보를 삭제하시겠습니까?`)) return
    const res = await deleteVehicle(v.id)
    if (res.error) {
      alert(res.error)
    } else {
      setVehicles(prev => prev.filter(item => item.id !== v.id))
    }
  }

  // 배차 편집 시작
  const startEditDispatch = (item: DispatchScheduleItem) => {
    setEditingDispatchId(item.id)
    setDraftDispatch({
      assignedVehicles: [...(item.dispatch.assignedVehicles || [])],
      teamLeader: item.dispatch.teamLeader || '',
      leaderPhone: formatPhoneNumber(item.dispatch.leaderPhone || ''),
      supportWorkers: item.dispatch.supportWorkers || '',
      dispatchStatus: item.dispatch.dispatchStatus || 'UNASSIGNED',
      dispatchMemo: item.dispatch.dispatchMemo || ''
    })
  }

  // 배차 편집 중 차량 토글 (자사 호차 선택 시 전담 팀장 자동 세팅!)
  const toggleDraftVehicle = (vRef: DispatchedVehicleRef, defaultLeader?: string, defaultPhone?: string) => {
    if (!draftDispatch) return
    const exists = draftDispatch.assignedVehicles.some(x => x.vehicleId === vRef.vehicleId)
    let nextVehicles: DispatchedVehicleRef[]
    if (exists) {
      nextVehicles = draftDispatch.assignedVehicles.filter(x => x.vehicleId !== vRef.vehicleId)
    } else {
      nextVehicles = [...draftDispatch.assignedVehicles, vRef]
    }

    // 만약 팀장이 아직 비어있고 자사 차량에 전담 팀장이 등록되어 있다면 자동으로 채워줌
    let nextLeader = draftDispatch.teamLeader
    let nextPhone = draftDispatch.leaderPhone
    if (!exists && !nextLeader.trim() && defaultLeader) {
      nextLeader = defaultLeader
      if (defaultPhone) nextPhone = formatPhoneNumber(defaultPhone)
    }

    setDraftDispatch({
      ...draftDispatch,
      assignedVehicles: nextVehicles,
      teamLeader: nextLeader,
      leaderPhone: nextPhone,
      dispatchStatus:
        nextVehicles.length > 0 || Boolean(nextLeader.trim()) ? 'CONFIRMED' : 'UNASSIGNED'
    })
  }

  // 배차 저장 실행
  const handleSaveDispatch = async (estimateId: string) => {
    if (!draftDispatch) return
    setSavingDispatchId(estimateId)
    try {
      const res = await updateEstimateDispatch(estimateId, draftDispatch)
      if (res.error) {
        alert(res.error)
      } else {
        setSchedules(prev =>
          prev.map(s =>
            s.id === estimateId
              ? {
                  ...s,
                  dispatch: {
                    ...draftDispatch,
                    dispatchStatus:
                      draftDispatch.assignedVehicles.length > 0 || Boolean(draftDispatch.teamLeader.trim())
                        ? draftDispatch.dispatchStatus === 'UNASSIGNED'
                          ? 'CONFIRMED'
                          : draftDispatch.dispatchStatus
                        : 'UNASSIGNED'
                  }
                }
              : s
          )
        )
        setEditingDispatchId(null)
        setDraftDispatch(null)
      }
    } finally {
      setSavingDispatchId(null)
    }
  }

  // 날짜별 중복 배차(동일 날짜에 같은 자사 호차 또는 같은 팀장이 2건 이상 배정) 분석
  const conflictMapByDate = useMemo(() => {
    const map: Record<string, { duplicateVehicles: string[]; duplicateLeaders: string[] }> = {}
    const byDate: Record<string, DispatchScheduleItem[]> = {}

    schedules.forEach(s => {
      if (!byDate[s.movingDate]) byDate[s.movingDate] = []
      byDate[s.movingDate].push(s)
    })

    Object.entries(byDate).forEach(([date, list]) => {
      const vCounts: Record<string, number> = {}
      const lCounts: Record<string, number> = {}

      list.forEach(item => {
        item.dispatch.assignedVehicles.forEach(av => {
          // 자사 차량만 중복 배차 체크
          if (av.ownership !== 'CHARTERED') {
            vCounts[av.name] = (vCounts[av.name] || 0) + 1
          }
        })
        const leader = (item.dispatch.teamLeader || '').trim()
        if (leader) {
          lCounts[leader] = (lCounts[leader] || 0) + 1
        }
      })

      const duplicateVehicles = Object.keys(vCounts).filter(k => vCounts[k] > 1)
      const duplicateLeaders = Object.keys(lCounts).filter(k => lCounts[k] > 1)
      if (duplicateVehicles.length > 0 || duplicateLeaders.length > 0) {
        map[date] = { duplicateVehicles, duplicateLeaders }
      }
    })

    return map
  }, [schedules])

  // 요약 지표 계산
  const summaryStats = useMemo(() => {
    const ownVehicles = vehicles.filter(v => v.ownership === 'OWN')
    const activeOwnCount = ownVehicles.filter(v => v.status === 'ACTIVE').length
    const leaders = Array.from(
      new Set(vehicles.map(v => (v.teamLeader || '').trim()).filter(Boolean))
    )
    const assignedCount = schedules.filter(
      s => s.dispatch.assignedVehicles.length > 0 || Boolean(s.dispatch.teamLeader?.trim())
    ).length
    const unassignedCount = schedules.length - assignedCount
    const conflictDateCount = Object.keys(conflictMapByDate).length

    return {
      totalOwn: ownVehicles.length,
      activeOwnCount,
      leaderCount: leaders.length,
      leaders,
      totalSchedules: schedules.length,
      assignedCount,
      unassignedCount,
      conflictDateCount
    }
  }, [vehicles, schedules, conflictMapByDate])

  // 필터링된 차량 목록
  const filteredVehicles = useMemo(() => {
    if (fleetFilter === 'ALL') return vehicles
    return vehicles.filter(v => v.ownership === fleetFilter)
  }, [vehicles, fleetFilter])

  // 날짜별로 그룹화된 배차 스케줄
  const groupedSchedules = useMemo(() => {
    const filtered = schedules.filter(s => {
      const isAssigned = s.dispatch.assignedVehicles.length > 0 || Boolean(s.dispatch.teamLeader?.trim())
      const hasConflict = Boolean(conflictMapByDate[s.movingDate])
      if (dispatchFilter === 'UNASSIGNED') return !isAssigned
      if (dispatchFilter === 'ASSIGNED') return isAssigned
      if (dispatchFilter === 'CONFLICT') return hasConflict
      return true
    })

    const groups: Record<string, DispatchScheduleItem[]> = {}
    filtered.forEach(s => {
      if (!groups[s.movingDate]) groups[s.movingDate] = []
      groups[s.movingDate].push(s)
    })
    return Object.entries(groups).sort(([d1], [d2]) => d1.localeCompare(d2))
  }, [schedules, dispatchFilter, conflictMapByDate])

  // 자사 보유 차량 리스트 (배차 선택용)
  const ownActiveVehicles = useMemo(() => {
    return vehicles.filter(v => v.ownership === 'OWN')
  }, [vehicles])

  // 등록된 팀장 빠른 선택 목록
  const registeredLeaders = useMemo(() => {
    const map = new Map<string, string>()
    vehicles.forEach(v => {
      const leader = (v.teamLeader || '').trim()
      if (leader && !map.has(leader)) {
        map.set(leader, v.leaderPhone || '')
      }
    })
    return Array.from(map.entries()).map(([name, phone]) => ({ name, phone }))
  }, [vehicles])

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-20">
      {/* 상단 고정 헤더 & 액션바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3.5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Truck className="w-4 h-4" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
              차량 · 팀장 및 배차 관리
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 sm:ml-10">
            자사 보유 호차·전담 팀장 제원 관리 및 이삿날 현장 배차 스케줄을 통합 운영합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>신규 차량/호차 등록</span>
          </button>
        </div>
      </div>

      {/* 핵심 요약 지표 카드 4종 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-gray-500">자사 보유 차량</span>
            <p className="text-lg sm:text-xl font-black text-gray-900 mt-0.5">
              정상 {summaryStats.activeOwnCount}대{' '}
              <span className="text-xs font-semibold text-gray-400">/ 총 {summaryStats.totalOwn}대</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-gray-500">전담 팀장 / 기사</span>
            <p className="text-lg sm:text-xl font-black text-blue-700 mt-0.5">
              {summaryStats.leaderCount}명{' '}
              <span className="text-xs font-normal text-gray-500">
                {summaryStats.leaders.length > 0 ? `(${summaryStats.leaders.slice(0, 2).join(', ')})` : '(미등록)'}
              </span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('DISPATCH')}
          className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <div>
            <span className="text-[11px] font-semibold text-gray-500">{currentYearMonth} 이사 일정</span>
            <p className="text-lg sm:text-xl font-black text-indigo-700 mt-0.5">
              총 {summaryStats.totalSchedules}건{' '}
              <span className="text-xs font-semibold text-emerald-600">
                (배차 {summaryStats.assignedCount}건)
              </span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => {
            setActiveTab('DISPATCH')
            if (summaryStats.unassignedCount > 0) setDispatchFilter('UNASSIGNED')
          }}
          className={`p-3.5 rounded-2xl border shadow-2xs flex items-center justify-between cursor-pointer transition-all ${
            summaryStats.unassignedCount > 0
              ? 'bg-amber-50/70 border-amber-300 hover:bg-amber-50'
              : 'bg-white border-gray-200/80'
          }`}
        >
          <div>
            <span className="text-[11px] font-semibold text-amber-900">배차 대기 (미배정)</span>
            <p className={`text-lg sm:text-xl font-black mt-0.5 ${
              summaryStats.unassignedCount > 0 ? 'text-amber-700' : 'text-gray-700'
            }`}>
              {summaryStats.unassignedCount}건{' '}
              {summaryStats.conflictDateCount > 0 && (
                <span className="text-[11px] font-extrabold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                  중복경고 {summaryStats.conflictDateCount}일
                </span>
              )}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            summaryStats.unassignedCount > 0
              ? 'bg-amber-100 text-amber-700 border-amber-300'
              : 'bg-gray-50 text-gray-400 border-gray-200'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 메인 세그먼트 탭 네비게이션 */}
      <div className="bg-gray-200/80 p-1 rounded-2xl grid grid-cols-2 gap-1.5 max-w-xl">
        <button
          type="button"
          onClick={() => setActiveTab('FLEET')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'FLEET'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>보유 차량 · 전담 팀장 관리</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${
            activeTab === 'FLEET' ? 'bg-blue-100 text-blue-800' : 'bg-gray-300/80 text-gray-700'
          }`}>
            {vehicles.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DISPATCH')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'DISPATCH'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>이삿날 배차 · 팀장 배정</span>
          {summaryStats.unassignedCount > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-amber-500 text-white font-black">
              미배차 {summaryStats.unassignedCount}
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-emerald-100 text-emerald-800">
              {summaryStats.totalSchedules}건
            </span>
          )}
        </button>
      </div>

      {/* ==================== 탭 1: 보유 차량 · 전담 팀장 관리 ==================== */}
      {activeTab === 'FLEET' && (
        <div className="space-y-4">
          {/* 필터 & 안내 바 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white px-4 py-2.5 rounded-xl border border-gray-200/80">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'ALL', label: `전체 (${vehicles.length})` },
                { key: 'OWN', label: `자사 운행 차량 (${vehicles.filter(v => v.ownership === 'OWN').length})` },
                { key: 'STANDARD', label: `CBM 산출 기본규격 (${vehicles.filter(v => v.ownership === 'STANDARD').length})` }
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFleetFilter(tab.key as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    fleetFilter === tab.key
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>호차별 전담 팀장을 등록해두면 이삿날 배차 시 팀장 정보가 자동으로 입력됩니다.</span>
            </div>
          </div>

          {/* 차량 카드 그리드 */}
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-500 border border-gray-200">
              차량 및 팀장 정보를 불러오는 중입니다...
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-300 space-y-3">
              <Truck className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-gray-600 font-semibold text-sm">등록된 차량 정보가 없습니다.</p>
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
              >
                + 첫 차량/호차 등록하기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredVehicles.map(v => {
                const isOwn = v.ownership === 'OWN'
                const isActive = v.status === 'ACTIVE'
                const isMaintenance = v.status === 'MAINTENANCE'

                return (
                  <div
                    key={v.id}
                    className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between bg-white shadow-2xs hover:shadow-md ${
                      !isOwn
                        ? 'border-gray-200'
                        : isActive
                          ? 'border-2 border-emerald-500/80 ring-2 ring-emerald-500/10'
                          : isMaintenance
                            ? 'border-2 border-amber-400 bg-amber-50/10'
                            : 'border border-gray-200 opacity-75'
                    }`}
                  >
                    {/* 카드 상단 헤더 */}
                    <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
                      !isOwn
                        ? 'bg-gray-50 border-gray-100'
                        : isActive
                          ? 'bg-emerald-50/70 border-emerald-100'
                          : isMaintenance
                            ? 'bg-amber-50/80 border-amber-100'
                            : 'bg-gray-100 border-gray-200'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                          isOwn
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {isOwn ? '자사 차량' : 'CBM 규격'}
                        </span>

                        {/* 상태 토글 버튼 */}
                        <button
                          type="button"
                          onClick={() => handleQuickStatusToggle(v)}
                          title="클릭하여 운행 상태 변경 (정상운행 ➔ 정비중 ➔ 휴차)"
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 border transition-transform active:scale-95 ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isMaintenance
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-gray-200 text-gray-600 border-gray-300'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              정상 운행
                            </>
                          ) : isMaintenance ? (
                            <>
                              <Wrench className="w-2.5 h-2.5 text-amber-700" />
                              정비/점검중
                            </>
                          ) : (
                            <>
                              <PauseCircle className="w-2.5 h-2.5 text-gray-500" />
                              휴차
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(v)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                          title="차량 및 팀장 정보 수정"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVehicle(v)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                          title="차량 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 카드 본문: 차량명, 번호판, 제원 */}
                    <div className="p-4 space-y-3 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-black text-gray-900 flex items-center gap-1.5">
                            <Truck className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                            <span>{v.name}</span>
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {v.tonnage}톤 {v.vehicleType || '탑차'}
                            </span>
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              최대 {v.maxCbm || 0} CBM
                            </span>
                          </div>
                        </div>

                        {/* 영업용 화물차 노란 번호판 스타일 */}
                        {v.vehicleNo ? (
                          <div className="bg-amber-400 text-gray-950 font-black text-xs px-2.5 py-1 rounded-md border-2 border-gray-800 shadow-2xs tracking-wider whitespace-nowrap">
                            {v.vehicleNo}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditModal(v)}
                            className="text-[11px] text-gray-400 hover:text-blue-600 border border-dashed border-gray-300 px-2 py-1 rounded-md whitespace-nowrap"
                          >
                            + 차량번호 등록
                          </button>
                        )}
                      </div>

                      {/* 전담 팀장 / 기사 정보 박스 */}
                      <div className={`p-2.5 rounded-xl border ${
                        v.teamLeader
                          ? 'bg-blue-50/50 border-blue-200/80'
                          : 'bg-gray-50 border-dashed border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              v.teamLeader ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>
                              <UserCheck className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-500 block leading-none">전담 팀장 / 운전기사</span>
                              {v.teamLeader ? (
                                <span className="text-xs font-extrabold text-gray-900 mt-0.5 block">
                                  {v.teamLeader}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openEditModal(v)}
                                  className="text-xs text-blue-600 hover:underline font-semibold mt-0.5 block"
                                >
                                  + 담당 팀장 지정하기
                                </button>
                              )}
                            </div>
                          </div>

                          {v.leaderPhone && (
                            <a
                              href={`tel:${v.leaderPhone.replace(/[^0-9]/g, '')}`}
                              className="px-2 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{formatPhoneNumber(v.leaderPhone)}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {v.memo && (
                        <p className="text-[11px] text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                          📌 {v.memo}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== 탭 2: 이삿날 배차 · 팀장 배정 관리 ==================== */}
      {activeTab === 'DISPATCH' && (
        <div className="space-y-4">
          {/* 월 선택 네비게이션 및 배차 상태 필터 */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMonthChange(-1)}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-base sm:text-lg font-black text-gray-900 min-w-[110px] text-center">
                {currentYearMonth.split('-')[0]}년 {Number(currentYearMonth.split('-')[1])}월
              </span>
              <button
                type="button"
                onClick={() => handleMonthChange(1)}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetToCurrentMonth}
                className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 ml-1"
              >
                이번 달
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'ALL', label: `전체 (${schedules.length})` },
                { key: 'UNASSIGNED', label: `미배차 대기 (${summaryStats.unassignedCount})` },
                { key: 'ASSIGNED', label: `배차 완료 (${summaryStats.assignedCount})` },
                ...(summaryStats.conflictDateCount > 0
                  ? [{ key: 'CONFLICT', label: `⚠️ 중복배차 (${summaryStats.conflictDateCount}일)` }]
                  : [])
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setDispatchFilter(tab.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dispatchFilter === tab.key
                      ? tab.key === 'CONFLICT'
                        ? 'bg-red-600 text-white shadow-2xs'
                        : 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 배차 리스트 본문 */}
          {scheduleLoading ? (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-500 border border-gray-200">
              {currentYearMonth} 이사 및 배차 일정을 불러오는 중입니다...
            </div>
          ) : groupedSchedules.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-300 space-y-2">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-gray-700 font-bold text-sm">
                해당 조건의 이사 일정이 없습니다.
              </p>
              <p className="text-xs text-gray-400">
                견적서에서 이사 예정일(movingDate)이 지정된 건들이 이곳에 자동으로 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedSchedules.map(([dateStr, dayItems]) => {
                const conflict = conflictMapByDate[dateStr]
                return (
                  <div
                    key={dateStr}
                    className={`rounded-2xl border overflow-hidden bg-white shadow-2xs ${
                      conflict ? 'border-2 border-red-400 ring-2 ring-red-400/15' : 'border-gray-200'
                    }`}
                  >
                    {/* 날짜 헤더 */}
                    <div className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 ${
                      conflict ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-white font-black text-xs sm:text-sm">
                          📅 {dateStr}
                        </span>
                        <span className="text-xs font-bold text-gray-700">
                          이사 총 {dayItems.length}건
                        </span>
                      </div>

                      {conflict && (
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-red-700 bg-red-100 px-2.5 py-1 rounded-lg border border-red-300">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>
                            중복 배차 경고:
                            {conflict.duplicateVehicles.length > 0 && ` 차량(${conflict.duplicateVehicles.join(', ')})`}
                            {conflict.duplicateLeaders.length > 0 && ` 팀장(${conflict.duplicateLeaders.join(', ')})`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 해당 날짜의 이사 건 목록 */}
                    <div className="divide-y divide-gray-200">
                      {dayItems.map(item => {
                        const isEditing = editingDispatchId === item.id
                        const hasAssigned =
                          item.dispatch.assignedVehicles.length > 0 || Boolean(item.dispatch.teamLeader?.trim())

                        return (
                          <div key={item.id} className="p-4 hover:bg-gray-50/40 transition-colors">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              {/* 좌측: 고객 및 현장 정보 */}
                              <div className="space-y-2 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
                                    item.movingType === 'P'
                                      ? 'bg-blue-100 text-blue-800'
                                      : item.movingType === 'G'
                                        ? 'bg-gray-200 text-gray-800'
                                        : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {item.movingType === 'P' ? '포장이사' : item.movingType === 'G' ? '일반이사' : '보관이사'}
                                  </span>

                                  <span className="font-black text-gray-900 text-sm sm:text-base">
                                    {item.customerName} 고객님
                                  </span>

                                  {item.contact && (
                                    <a
                                      href={`tel:${item.contact.replace(/[^0-9]/g, '')}`}
                                      className="text-xs font-bold text-gray-600 hover:text-blue-600 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md"
                                    >
                                      <Phone className="w-3 h-3" />
                                      {formatPhoneNumber(item.contact)}
                                    </a>
                                  )}

                                  <Link
                                    href={`/estimates/${item.id}`}
                                    className="text-[11px] font-mono font-bold text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                                  >
                                    #{item.id} 상세보기
                                  </Link>
                                </div>

                                {/* 출발지 -> 도착지 */}
                                <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-700">
                                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span className="font-semibold">{item.fromAddress || '출발지 미입력'}</span>
                                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="font-semibold">{item.toAddress || '도착지 미입력'}</span>
                                </div>

                                {/* 견적 당시 계획된 차량 및 인원 */}
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                                  <span className="bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-700">
                                    견적 차량:{' '}
                                    {item.PlannedVehicles.length > 0
                                      ? item.PlannedVehicles.map(v => `${v.name} ${v.count}대`).join(', ')
                                      : '미지정'}
                                  </span>
                                  <span className="bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-700">
                                    견적 인원:{' '}
                                    {item.plannedLabors.length > 0
                                      ? item.plannedLabors.map(l => `${l.name} ${l.count}명`).join(', ')
                                      : '미지정'}
                                  </span>
                                </div>
                              </div>

                              {/* 우측: 현재 배차 및 팀장 배정 상태 요약 / 편집 버튼 */}
                              {!isEditing && (
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0">
                                  {hasAssigned ? (
                                    <div className="p-2.5 rounded-xl bg-emerald-50/80 border-2 border-emerald-500/80 space-y-1.5 min-w-[260px]">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3" />
                                          배차 확정
                                        </span>
                                        {item.dispatch.teamLeader && (
                                          <span className="text-xs font-black text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">
                                            👤 팀장: {item.dispatch.teamLeader}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap gap-1 pt-0.5">
                                        {item.dispatch.assignedVehicles.length > 0 ? (
                                          item.dispatch.assignedVehicles.map((av, idx) => (
                                            <span
                                              key={idx}
                                              className={`px-2 py-0.5 rounded text-xs font-extrabold border ${
                                                av.ownership === 'CHARTERED'
                                                  ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                                  : 'bg-white text-emerald-950 border-emerald-400 shadow-2xs'
                                              }`}
                                            >
                                              🚛 {av.name} {av.vehicleNo ? `(${av.vehicleNo})` : ''}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-xs text-gray-500">배정 차량 없음</span>
                                        )}
                                      </div>

                                      {item.dispatch.dispatchMemo && (
                                        <p className="text-[11px] text-emerald-900 font-medium pt-0.5">
                                          📝 {item.dispatch.dispatchMemo}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="px-3.5 py-2.5 rounded-xl bg-amber-50 border border-dashed border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-amber-600" />
                                      <span>호차 및 담당 팀장 미배정</span>
                                    </div>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => startEditDispatch(item)}
                                    className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shadow-2xs ${
                                      hasAssigned
                                        ? 'bg-white hover:bg-gray-100 text-gray-800 border border-gray-300'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    }`}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>{hasAssigned ? '배차 변경' : '배차 · 팀장 지정'}</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* 인라인 배차 · 팀장 배정 편집 패널 */}
                            {isEditing && draftDispatch && (
                              <div className="mt-3 p-4 rounded-2xl bg-indigo-50/60 border-2 border-indigo-400 space-y-3.5 animate-in fade-in duration-150">
                                <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                                  <span className="text-xs sm:text-sm font-black text-indigo-950 flex items-center gap-1.5">
                                    <Truck className="w-4 h-4 text-indigo-600" />
                                    <span>{item.customerName} 고객님 이삿날 배차 및 팀장 배정</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDispatchId(null)
                                      setDraftDispatch(null)
                                    }}
                                    className="text-gray-500 hover:text-gray-800 p-1"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* 1. 자사 호차 선택 */}
                                <div className="space-y-1.5">
                                  <label className="text-xs font-extrabold text-gray-800 block">
                                    1. 투입 자사 차량(호차) 선택 <span className="font-normal text-gray-500">(클릭 시 전담 팀장 자동 입력)</span>
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {ownActiveVehicles.map(v => {
                                      const selected = draftDispatch.assignedVehicles.some(x => x.vehicleId === v.id)
                                      const isMaint = v.status !== 'ACTIVE'
                                      return (
                                        <button
                                          key={v.id}
                                          type="button"
                                          onClick={() =>
                                            toggleDraftVehicle(
                                              {
                                                vehicleId: v.id,
                                                name: v.name,
                                                vehicleNo: v.vehicleNo,
                                                tonnage: v.tonnage,
                                                ownership: 'OWN'
                                              },
                                              v.teamLeader,
                                              v.leaderPhone
                                            )
                                          }
                                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                                            selected
                                              ? 'border-2 border-emerald-600 bg-emerald-600 text-white shadow-sm'
                                              : isMaint
                                                ? 'border-gray-200 bg-gray-100 text-gray-400'
                                                : 'border-gray-300 bg-white text-gray-800 hover:border-emerald-500'
                                          }`}
                                        >
                                          <Truck className="w-3.5 h-3.5" />
                                          <span>{v.name}</span>
                                          {v.vehicleNo && (
                                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                                              selected ? 'bg-amber-300 text-gray-950' : 'bg-amber-100 text-amber-900'
                                            }`}>
                                              {v.vehicleNo}
                                            </span>
                                          )}
                                          {v.teamLeader && (
                                            <span className={`text-[10px] ${selected ? 'text-emerald-100' : 'text-blue-600'}`}>
                                              ({v.teamLeader})
                                            </span>
                                          )}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>

                                {/* 2. 외주 용차 추가 선택 */}
                                <div className="space-y-1.5">
                                  <label className="text-xs font-extrabold text-gray-800 block">
                                    2. 외주 용차 추가 배차 <span className="font-normal text-gray-500">(필요 시 선택)</span>
                                  </label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {CHARTERED_QUICK_OPTIONS.map(ch => {
                                      const selected = draftDispatch.assignedVehicles.some(x => x.vehicleId === ch.id)
                                      return (
                                        <button
                                          key={ch.id}
                                          type="button"
                                          onClick={() =>
                                            toggleDraftVehicle({
                                              vehicleId: ch.id,
                                              name: ch.name,
                                              tonnage: ch.tonnage,
                                              ownership: 'CHARTERED'
                                            })
                                          }
                                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                            selected
                                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                              : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                                          }`}
                                        >
                                          + {ch.name}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>

                                {/* 3. 담당 팀장 및 메모 입력 */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                  <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                      담당 팀장명
                                    </label>
                                    <input
                                      type="text"
                                      value={draftDispatch.teamLeader}
                                      onChange={e =>
                                        setDraftDispatch({ ...draftDispatch, teamLeader: e.target.value })
                                      }
                                      placeholder="예: 김철수 팀장"
                                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-bold outline-none focus:border-indigo-500"
                                    />
                                    {registeredLeaders.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {registeredLeaders.map(l => (
                                          <button
                                            key={l.name}
                                            type="button"
                                            onClick={() =>
                                              setDraftDispatch({
                                                ...draftDispatch,
                                                teamLeader: l.name,
                                                leaderPhone: formatPhoneNumber(l.phone)
                                              })
                                            }
                                            className="text-[10px] bg-white border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded hover:bg-indigo-100 font-semibold"
                                          >
                                            {l.name}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                      팀장 연락처
                                    </label>
                                    <input
                                      type="tel"
                                      maxLength={13}
                                      value={draftDispatch.leaderPhone}
                                      onFocus={handleSelectAllOnFocus}
                                      onChange={e =>
                                        handlePhoneInputChange(e, val =>
                                          setDraftDispatch({
                                            ...draftDispatch,
                                            leaderPhone: val
                                          })
                                        )
                                      }
                                      placeholder="010-0000-0000"
                                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold outline-none focus:border-indigo-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                      배차 메모 / 현장 지시사항
                                    </label>
                                    <input
                                      type="text"
                                      value={draftDispatch.dispatchMemo || ''}
                                      onChange={e =>
                                        setDraftDispatch({ ...draftDispatch, dispatchMemo: e.target.value })
                                      }
                                      placeholder="예: 07:30 현장 집결, 사다리 8시"
                                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs sm:text-sm outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-200/80">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDraftDispatch({
                                        assignedVehicles: [],
                                        teamLeader: '',
                                        leaderPhone: '',
                                        supportWorkers: '',
                                        dispatchStatus: 'UNASSIGNED',
                                        dispatchMemo: ''
                                      })
                                    }}
                                    className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg"
                                  >
                                    배차 초기화
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDispatchId(null)
                                      setDraftDispatch(null)
                                    }}
                                    className="px-3.5 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                  >
                                    취소
                                  </button>
                                  <button
                                    type="button"
                                    disabled={savingDispatchId === item.id}
                                    onClick={() => handleSaveDispatch(item.id)}
                                    className="px-5 py-1.5 text-xs sm:text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5"
                                  >
                                    <Check className="w-4 h-4" />
                                    <span>{savingDispatchId === item.id ? '저장 중...' : '배차 확정 저장'}</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== 신규 차량/호차 등록 및 수정 모달 ==================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-200" />
                <h2 className="text-base font-extrabold">
                  {editingVehicle ? '차량 · 전담 팀장 정보 수정' : '신규 차량(호차) · 전담 팀장 등록'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* 차량 운영 구분 */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">관리 구분</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormOwnership('OWN')}
                    className={`py-2 rounded-lg text-xs font-extrabold transition-all ${
                      formOwnership === 'OWN'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🚛 자사 운행 차량 (호차)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormOwnership('STANDARD')}
                    className={`py-2 rounded-lg text-xs font-extrabold transition-all ${
                      formOwnership === 'STANDARD'
                        ? 'bg-slate-700 text-white shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    📐 CBM 산출용 차종 규격
                  </button>
                </div>
              </div>

              {/* 호차/차량명 & 차량번호 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    호차 / 차량명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="예: 1호차 (5톤 탑차)"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 font-bold text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    차량번호 (번호판)
                  </label>
                  <input
                    type="text"
                    value={formVehicleNo}
                    onChange={e => setFormVehicleNo(e.target.value)}
                    placeholder="예: 82가 1234"
                    className="w-full rounded-xl border border-gray-300 bg-amber-50/40 px-3 py-2 font-extrabold text-gray-900 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* 톤수 프리셋 & 차형 & 최대 CBM */}
              <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200/80">
                <label className="block text-xs font-bold text-gray-700">
                  차량 톤수 선택 <span className="font-normal text-gray-500">(선택 시 권장 적재 CBM 자동 세팅)</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {TONNAGE_PRESETS.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleSelectTonnage(p.value, p.defaultCbm)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                        formTonnage === p.value
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">차형 (차종)</label>
                    <select
                      value={formVehicleType}
                      onChange={e => setFormVehicleType(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-semibold text-gray-800 outline-none focus:border-blue-500"
                    >
                      {VEHICLE_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      최대 적재 CBM <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={formMaxCbm}
                        onChange={e => setFormMaxCbm(Number(e.target.value) || 0)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 pr-12 font-extrabold text-blue-700 outline-none focus:border-blue-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        CBM
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 전담 팀장 / 기사 정보 */}
              <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-900">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>전담 팀장 / 운전기사 배정</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">담당 팀장/기사명</label>
                    <input
                      type="text"
                      value={formTeamLeader}
                      onChange={e => setFormTeamLeader(e.target.value)}
                      placeholder="예: 김철수 팀장"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-bold text-gray-900 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">연락처</label>
                    <input
                      type="tel"
                      maxLength={13}
                      value={formLeaderPhone}
                      onFocus={handleSelectAllOnFocus}
                      onChange={e => handlePhoneInputChange(e, setFormLeaderPhone)}
                      placeholder="010-0000-0000"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-semibold text-gray-900 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 운행 상태 & 비고 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">운행 상태</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-bold text-gray-800 outline-none focus:border-blue-500"
                  >
                    <option value="ACTIVE">🟢 정상 운행</option>
                    <option value="MAINTENANCE">🟠 정비 / 점검중</option>
                    <option value="INACTIVE">⚪ 휴차 / 대기</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">비고 (검사일/보험/특이사항)</label>
                  <input
                    type="text"
                    value={formMemo}
                    onChange={e => setFormMemo(e.target.value)}
                    placeholder="예: 12월 정기검사, 리프트 장착"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 신규 자사 차량 등록 시 자재 거점 자동 연동 옵션 */}
              {!editingVehicle && formOwnership === 'OWN' && (
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formSyncInventory}
                    onChange={e => setFormSyncInventory(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-xs font-bold text-emerald-900">
                    자재 재고관리의 차량 거점에도 이 호차를 자동 등록합니다.
                  </span>
                </label>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
                >
                  {isSubmitting ? '저장 중...' : editingVehicle ? '수정 내용 저장' : '차량 등록하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
