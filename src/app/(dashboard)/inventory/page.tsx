'use client'

import { useState, useEffect } from 'react'
import { 
  getInventoryOverview, 
  getTransferHistory, 
  getAuditHistory,
  deleteMaterialItem,
  deleteInventoryLocation
} from '@/app/actions/inventory'
import { 
  Boxes, 
  ArrowLeftRight, 
  ClipboardCheck, 
  Settings, 
  Plus, 
  ArrowDownToLine, 
  AlertTriangle, 
  Search, 
  Warehouse, 
  Truck, 
  TrendingDown, 
  CheckCircle2, 
  Package, 
  RefreshCw,
  Edit2,
  Trash2,
  FileText
} from 'lucide-react'

import { TransferModal } from './TransferModal'
import { StockInOutModal } from './StockInOutModal'
import { StockAuditModal } from './StockAuditModal'
import { MaterialModal } from './MaterialModal'
import { LocationModal } from './LocationModal'

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'transfers' | 'audits' | 'settings'>('overview')
  const [loading, setLoading] = useState(true)

  const [materials, setMaterials] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [transfers, setTransfers] = useState<any[]>([])
  const [audits, setAudits] = useState<any[]>([])

  // 필터 및 검색
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  // 모달 상태들
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isStockInOutOpen, setIsStockInOutOpen] = useState(false)
  const [isAuditOpen, setIsAuditOpen] = useState(false)
  const [isMaterialOpen, setIsMaterialOpen] = useState(false)
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null)
  const [editingLocation, setEditingLocation] = useState<any | null>(null)

  const loadData = async () => {
    setLoading(true)
    const [overviewRes, transRes, auditRes] = await Promise.all([
      getInventoryOverview(),
      getTransferHistory(30),
      getAuditHistory(20)
    ])

    if (overviewRes.success) {
      setMaterials(overviewRes.materials)
      setLocations(overviewRes.locations)
    }
    setTransfers(transRes)
    setAudits(auditRes)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // 통계 계산
  const totalItemsCount = materials.length
  const warehouseCount = locations.filter(l => l.type === 'WAREHOUSE').length
  const vehicleCount = locations.filter(l => l.type === 'VEHICLE').length
  const lowStockCount = materials.filter(m => m.isLowStock).length
  const totalStockQuantity = materials.reduce((acc, m) => acc + (m.totalQty || 0), 0)

  // 필터링된 자재 목록
  const filteredMaterials = materials.filter(m => {
    const matchQuery = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       m.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCategory = categoryFilter === 'ALL' || m.category === categoryFilter
    return matchQuery && matchCategory
  })

  // 자재 삭제
  const handleDeleteMaterial = async (id: string, name: string) => {
    if (!confirm(`'${name}' 자재를 삭제하시겠습니까?\n해당 자재의 재고 데이터도 함께 삭제됩니다.`)) return
    const res = await deleteMaterialItem(id)
    if (res.success) {
      loadData()
    } else {
      alert(res.error || '삭제 실패')
    }
  }

  // 위치 삭제
  const handleDeleteLocation = async (id: string, name: string) => {
    if (!confirm(`'${name}' 위치를 삭제하시겠습니까?\n해당 위치에 등록된 재고 데이터도 함께 삭제됩니다.`)) return
    const res = await deleteInventoryLocation(id)
    if (res.success) {
      loadData()
    } else {
      alert(res.error || '삭제 실패')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. 상단 타이틀 & 퀵 액션 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Boxes className="text-blue-600" size={26} />
              <span>자재 재고관리</span>
            </h1>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
              창고 & 차량 통합재고
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            창고 및 현장 차량별 자재 재고를 실시간 파악하고, 상차/하차 이고 및 실사를 손쉽게 관리합니다.
          </p>
        </div>

        {/* 퀵 액션 버튼 그룹 */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTransferOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-200"
          >
            <ArrowLeftRight size={15} />
            <span>자재 이고(이동)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsStockInOutOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <ArrowDownToLine size={15} />
            <span>입고 / 폐기 출고</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAuditOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <ClipboardCheck size={15} />
            <span>재고 실사</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
            title="새로고침"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. 핵심 요약 카드 4종 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500">관리 자재 품목</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{totalItemsCount}<span className="text-xs font-normal text-gray-500 ml-1">종류</span></p>
          </div>
          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Package size={22} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500">보관 거점 / 차량</p>
            <p className="text-2xl font-black text-gray-900 mt-1">
              {warehouseCount + vehicleCount}
              <span className="text-xs font-normal text-gray-500 ml-1">
                (창고 {warehouseCount} / 차량 {vehicleCount})
              </span>
            </p>
          </div>
          <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Truck size={22} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500">전체 자재 총재고</p>
            <p className="text-2xl font-black text-gray-900 mt-1">
              {totalStockQuantity.toLocaleString()}
              <span className="text-xs font-normal text-gray-500 ml-1">개/롤</span>
            </p>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Boxes size={22} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500">안전재고 부족 경고</p>
            <p className={`text-2xl font-black mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
              {lowStockCount}
              <span className="text-xs font-normal text-gray-500 ml-1">품목</span>
            </p>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${lowStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'}`}>
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* 3. 탭 네비게이션 */}
      <div className="flex border-b border-gray-200 space-x-1 sm:space-x-3 bg-white px-4 pt-2 rounded-xl shadow-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Boxes size={16} />
          <span>재고 현황 (위치별 x 자재별)</span>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'transfers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowLeftRight size={16} />
          <span>이고 / 입출고 이력 ({transfers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audits')}
          className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'audits'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ClipboardCheck size={16} />
          <span>재고 실사 이력 ({audits.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings size={16} />
          <span>자재 및 거점 설정</span>
        </button>
      </div>

      {/* 4. 탭별 메인 컨텐츠 영역 */}

      {/* [TAB 1] 재고 현황 매트릭스 뷰 */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
          {/* 검색 및 필터 바 */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/50">
            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="자재명 또는 코드 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:border-blue-500"
              >
                <option value="ALL">전체 구분</option>
                <option value="REUSABLE">회수용 자재</option>
                <option value="CONSUMABLE">소모성 자재</option>
                <option value="TOOL">도구/장비</option>
              </select>
            </div>

            <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500"></span> 창고 재고
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 ml-2"></span> 차량 재고
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 ml-2"></span> 안전재고 부족
            </div>
          </div>

          {/* 위치별 x 자재별 통합 재고 매트릭스 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100/80 text-gray-700 font-bold border-b border-gray-200">
                <tr>
                  <th className="px-3.5 py-3 sticky left-0 bg-gray-100 z-10 w-24">코드</th>
                  <th className="px-3.5 py-3 sticky left-24 bg-gray-100 z-10 min-w-36">자재 품명</th>
                  <th className="px-3 py-3 text-center w-16">구분</th>
                  <th className="px-3 py-3 text-center w-14">단위</th>

                  {/* 위치별 열 헤더 */}
                  {locations.map(loc => (
                    <th key={loc.id} className="px-3.5 py-3 text-center min-w-24">
                      <div className="flex items-center justify-center gap-1">
                        {loc.type === 'WAREHOUSE' ? (
                          <Warehouse size={13} className="text-blue-600" />
                        ) : (
                          <Truck size={13} className="text-emerald-600" />
                        )}
                        <span>{loc.name}</span>
                      </div>
                    </th>
                  ))}

                  {/* 총재고 및 안전재고 열 */}
                  <th className="px-4 py-3 text-center bg-blue-50/80 text-blue-900 font-black min-w-24 border-l border-r border-blue-100">
                    총재고 (합계)
                  </th>
                  <th className="px-3.5 py-3 text-center w-20">안전재고</th>
                  <th className="px-3.5 py-3 text-center w-20">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMaterials.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* 코드 */}
                    <td className="px-3.5 py-3 text-gray-500 font-mono sticky left-0 bg-white">
                      {m.code}
                    </td>

                    {/* 자재명 */}
                    <td className="px-3.5 py-3 font-bold text-gray-900 sticky left-24 bg-white">
                      {m.name}
                      {m.memo && <span className="block text-[11px] font-normal text-gray-400">{m.memo}</span>}
                    </td>

                    {/* 카테고리 */}
                    <td className="px-3 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.category === 'REUSABLE' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                          : m.category === 'CONSUMABLE'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {m.category === 'REUSABLE' ? '회수용' : m.category === 'CONSUMABLE' ? '소모품' : '도구'}
                      </span>
                    </td>

                    {/* 단위 */}
                    <td className="px-3 py-3 text-center text-gray-500 font-medium">
                      {m.unit}
                    </td>

                    {/* 각 위치별 수량 */}
                    {locations.map(loc => {
                      const qty = m.stocks?.[loc.id] || 0
                      return (
                        <td key={loc.id} className="px-3.5 py-3 text-center font-semibold text-gray-700">
                          {qty > 0 ? (
                            <span className={loc.type === 'WAREHOUSE' ? 'text-gray-900' : 'text-emerald-700'}>
                              {qty}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      )
                    })}

                    {/* 총재고 합계 */}
                    <td className="px-4 py-3 text-center font-black text-sm bg-blue-50/50 text-blue-900 border-l border-r border-blue-100">
                      {m.totalQty.toLocaleString()}
                    </td>

                    {/* 안전재고 */}
                    <td className="px-3.5 py-3 text-center text-gray-500 font-medium">
                      {m.safetyStock > 0 ? m.safetyStock : '-'}
                    </td>

                    {/* 상태 뱃지 */}
                    <td className="px-3.5 py-3 text-center">
                      {m.isLowStock ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                          <AlertTriangle size={11} /> 부족
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          <CheckCircle2 size={11} /> 정상
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* [TAB 2] 이고 및 입출고 이력 뷰 */}
      {activeTab === 'transfers' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-xs font-bold text-gray-800">최근 재고 이동(이고) 및 입출고 전표</h3>
            <span className="text-xs text-gray-500">최근 {transfers.length}건 표시</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                <tr>
                  <th className="px-3.5 py-3 w-32">전표번호</th>
                  <th className="px-3.5 py-3 w-28">일시</th>
                  <th className="px-3 py-3 text-center w-20">구분</th>
                  <th className="px-3.5 py-3 min-w-44">이동 경로 (출발 ➔ 도착)</th>
                  <th className="px-3.5 py-3">품목 및 수량</th>
                  <th className="px-3 py-3 text-center w-20">담당자</th>
                  <th className="px-3.5 py-3 w-40">메모</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      등록된 이동 이력이 없습니다.
                    </td>
                  </tr>
                ) : (
                  transfers.map(tr => (
                    <tr key={tr.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-3.5 py-3 font-mono font-bold text-blue-700">
                        {tr.transferNo}
                      </td>
                      <td className="px-3.5 py-3 text-gray-500">
                        {new Date(tr.transferDate).toLocaleDateString('ko-KR', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tr.type === 'TRANSFER'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : tr.type === 'IN'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {tr.type === 'TRANSFER' ? '이고(이동)' : tr.type === 'IN' ? '구매입고' : '손망실출고'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-gray-800">
                        {tr.type === 'TRANSFER' && (
                          <span className="flex items-center gap-1.5">
                            <span>{tr.sourceLocation?.name || '미지정'}</span>
                            <ArrowLeftRight size={12} className="text-gray-400" />
                            <span className="text-blue-600 font-bold">{tr.targetLocation?.name || '미지정'}</span>
                          </span>
                        )}
                        {tr.type === 'IN' && (
                          <span>외부구매 ➔ <span className="text-emerald-700 font-bold">{tr.targetLocation?.name}</span></span>
                        )}
                        {tr.type === 'OUT' && (
                          <span><span className="text-rose-700 font-bold">{tr.sourceLocation?.name}</span> ➔ 폐기</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {tr.items?.map((it: any) => (
                            <span key={it.id} className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-[11px] font-medium">
                              {it.material?.name}: <b className="text-blue-700">{it.quantity}</b>{it.material?.unit}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center font-medium text-gray-600">
                        {tr.adminName}
                      </td>
                      <td className="px-3.5 py-3 text-gray-500 truncate max-w-xs">
                        {tr.memo || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* [TAB 3] 재고 실사 이력 뷰 */}
      {activeTab === 'audits' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-xs font-bold text-gray-800">현장 재고 실사 이력 및 오차 보정 기록</h3>
            <span className="text-xs text-gray-500">최근 {audits.length}건 표시</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                <tr>
                  <th className="px-3.5 py-3 w-32">실사번호</th>
                  <th className="px-3.5 py-3 w-28">실사일시</th>
                  <th className="px-3.5 py-3 w-36">실사 대상 위치</th>
                  <th className="px-3.5 py-3">실사 결과 (오차 품목 요약)</th>
                  <th className="px-3 py-3 text-center w-24">담당자</th>
                  <th className="px-3.5 py-3 w-40">메모</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {audits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      등록된 재고 실사 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  audits.map(aud => {
                    const diffItems = aud.items?.filter((it: any) => it.diffQty !== 0) || []
                    return (
                      <tr key={aud.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-3.5 py-3 font-mono font-bold text-purple-700">
                          {aud.auditNo}
                        </td>
                        <td className="px-3.5 py-3 text-gray-500">
                          {new Date(aud.auditDate).toLocaleDateString('ko-KR', {
                            year: '2-digit',
                            month: 'numeric',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-3.5 py-3 font-bold text-gray-900">
                          {aud.location?.name}
                        </td>
                        <td className="px-3.5 py-3">
                          {diffItems.length === 0 ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 size={13} /> 전산 재고와 100% 일치
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-amber-700 font-bold text-[11px] block">
                                총 {diffItems.length}개 품목 불일치 조정:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {diffItems.map((it: any) => (
                                  <span key={it.id} className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                                    {it.material?.name}: {it.diffQty > 0 ? `+${it.diffQty}` : it.diffQty} ({it.reason})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center font-medium text-gray-600">
                          {aud.adminName}
                        </td>
                        <td className="px-3.5 py-3 text-gray-500 truncate max-w-xs">
                          {aud.memo || '-'}
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

      {/* [TAB 4] 자재 및 거점 설정 뷰 */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. 자재 품목 마스터 관리 */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">자재 품목 마스터</h3>
                <p className="text-xs text-gray-500">관리 대상 자재 품목을 등록/수정합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => { setEditingMaterial(null); setIsMaterialOpen(true); }}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus size={14} />
                <span>자재 등록</span>
              </button>
            </div>

            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {materials.map(m => (
                <div key={m.id} className="py-2.5 flex items-center justify-between hover:bg-gray-50/50 px-2 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-gray-900">{m.name}</span>
                      <span className="text-[10px] text-gray-500 font-mono">({m.code})</span>
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                        {m.unit}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      안전재고: {m.safetyStock}개 | 단가: {m.unitPrice.toLocaleString()}원
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setEditingMaterial(m); setIsMaterialOpen(true); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      title="수정"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMaterial(m.id, m.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. 보관 위치(창고/차량) 관리 */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">보관 위치 (창고 / 차량) 마스터</h3>
                <p className="text-xs text-gray-500">자재를 보관하는 창고 및 이동 차량 목록을 관리합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => { setEditingLocation(null); setIsLocationOpen(true); }}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus size={14} />
                <span>위치 등록</span>
              </button>
            </div>

            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {locations.map(loc => (
                <div key={loc.id} className="py-2.5 flex items-center justify-between hover:bg-gray-50/50 px-2 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${loc.type === 'WAREHOUSE' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {loc.type === 'WAREHOUSE' ? <Warehouse size={16} /> : <Truck size={16} />}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-gray-900">{loc.name}</p>
                      <p className="text-[11px] text-gray-400">{loc.memo || (loc.type === 'WAREHOUSE' ? '보관 창고' : '현장 차량')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setEditingLocation(loc); setIsLocationOpen(true); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      title="수정"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLocation(loc.id, loc.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 모달 컴포넌트들 */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        locations={locations}
        materials={materials}
        onSuccess={loadData}
      />

      <StockInOutModal
        isOpen={isStockInOutOpen}
        onClose={() => setIsStockInOutOpen(false)}
        locations={locations}
        materials={materials}
        onSuccess={loadData}
      />

      <StockAuditModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        locations={locations}
        materials={materials}
        onSuccess={loadData}
      />

      {isMaterialOpen && (
        <MaterialModal
          key={editingMaterial?.id || 'new-material'}
          isOpen={isMaterialOpen}
          onClose={() => { setIsMaterialOpen(false); setEditingMaterial(null); }}
          materialToEdit={editingMaterial}
          onSuccess={loadData}
        />
      )}

      {isLocationOpen && (
        <LocationModal
          key={editingLocation?.id || 'new-location'}
          isOpen={isLocationOpen}
          onClose={() => { setIsLocationOpen(false); setEditingLocation(null); }}
          locationToEdit={editingLocation}
          onSuccess={loadData}
        />
      )}
    </div>
  )
}
