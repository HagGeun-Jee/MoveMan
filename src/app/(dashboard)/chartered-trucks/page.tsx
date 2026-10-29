'use client'

import { useState, useEffect } from 'react'
import { 
  getCharteredTruckFares, 
  createCharteredTruckFare, 
  deleteCharteredTruckFare, 
  batchUpdateCharteredTruckFares, 
  resetCharteredTruckFaresToDefault
} from '@/app/actions/charteredTruck'
import type { CharteredTruckFareItem } from '@/types/charteredTruck'
import { handleSelectAllOnFocus } from '@/lib/format'
import { 
  Plus, 
  Save, 
  RotateCcw, 
  Trash2, 
  Calculator, 
  Check, 
  AlertCircle,
  Truck,
  CloudRain,
  Sun,
  ShieldCheck
} from 'lucide-react'

export default function CharteredTruckMasterPage() {
  const [fares, setFares] = useState<CharteredTruckFareItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

  // 신규 구간 등록 모달 상태
  const [showAddModal, setShowAddModal] = useState(false)

  // 테스트 계산기 상태
  const [testDistance, setTestDistance] = useState<number>(30)
  const [testTonnage, setTestTonnage] = useState<'1' | '2.5' | '5'>('1')
  const [testIsTop, setTestIsTop] = useState<boolean>(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const data = await getCharteredTruckFares()
    setFares(data)
    setHasChanges(false)
    setLoading(false)
  }

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type })
    setTimeout(() => setStatusMessage(null), 3500)
  }

  const handleCellChange = (id: string, field: keyof CharteredTruckFareItem, value: any) => {
    setFares(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value }
      }
      return item
    }))
    setHasChanges(true)
  }

  const handleSaveAll = async () => {
    setSaving(true)
    const res = await batchUpdateCharteredTruckFares(fares)
    setSaving(false)
    if (res.success) {
      setHasChanges(false)
      showNotification('외주 용차 표준 운임표가 성공적으로 저장되었습니다.')
    } else {
      showNotification(res.error || '저장 중 오류가 발생했습니다.', 'error')
    }
  }

  const handleReset = async () => {
    if (!confirm('용차 운임표를 전국 화물운송연합회 표준 기본 요금표로 초기화하시겠습니까?\n현재 수정 중인 변경사항이 덮어쓰기됩니다.')) return
    setLoading(true)
    const res = await resetCharteredTruckFaresToDefault()
    if (res.success) {
      await loadData()
      showNotification('전국 표준 용차 운임표로 복원되었습니다.')
    } else {
      showNotification(res.error || '초기화 실패', 'error')
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`'${name}' 거리 구간을 삭제하시겠습니까?`)) return
    const res = await deleteCharteredTruckFare(id)
    if (res.success) {
      setFares(prev => prev.filter(item => item.id !== id))
      showNotification(`'${name}' 구간이 삭제되었습니다.`)
    } else {
      showNotification(res.error || '삭제 실패', 'error')
    }
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const res = await createCharteredTruckFare(formData)
    if (res.success) {
      setShowAddModal(false)
      await loadData()
      showNotification('새 거리 구간이 등록되었습니다.')
    } else {
      alert(res.error || '등록 실패')
    }
  }

  // 실시간 시뮬레이터 요금 계산
  const getSimulatedFee = () => {
    if (testDistance < 0) return { cost: 0, tier: '해당없음' }
    const matched = fares.find(f => testDistance >= f.minDistanceKm && testDistance <= f.maxDistanceKm)
      || fares[fares.length - 1]

    if (!matched) return { cost: 0, tier: '미설정' }

    let cost = 0
    if (testTonnage === '1') {
      cost = testIsTop ? matched.cost1TonTop : matched.cost1TonCargo
    } else if (testTonnage === '2.5') {
      cost = testIsTop ? matched.cost2_5TonTop : matched.cost2_5TonCargo
    } else {
      cost = testIsTop ? matched.cost5TonTop : matched.cost5TonCargo
    }

    return { cost, tier: matched.distanceName }
  }

  const simulated = getSimulatedFee()

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* 헤더 카드 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">외주 용차 운임표 관리</h1>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                기초정보
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              거리 구간별 차종(1톤/2.5톤/5톤) 카고 및 우천 탑차 표준 시세를 관리합니다. 1~2년 주기 시세 변동 시 수정 저장하거나 표준 시세로 원클릭 복원할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-1.5 border border-gray-200"
          >
            <RotateCcw size={14} />
            <span>표준운임 복원</span>
          </button>
          
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-1.5 border border-indigo-200"
          >
            <Plus size={15} />
            <span>+ 구간 추가</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || !hasChanges}
            className={`px-4 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs ${
              hasChanges
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Save size={15} />
            <span>{saving ? '저장 중...' : '전체 저장'}</span>
          </button>
        </div>
      </div>

      {/* 상태 알림 토스트 배너 */}
      {statusMessage && (
        <div className={`p-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-xs ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {statusMessage.type === 'success' ? <Check size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-red-600" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 실시간 계산 시뮬레이터 카드 */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-4 text-white shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-xs">
              <Calculator size={20} className="text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base">용차 운임 간편 테스트</span>
                <span className="text-[10px] bg-indigo-500/30 px-1.5 py-0.5 rounded text-indigo-200 font-medium">원가 연동 미리보기</span>
              </div>
              <p className="text-[11px] text-indigo-200">이동거리와 톤수, 차형(카고/우천탑차)을 선택하면 표준 운임표에서 자동 산출되는 금액을 실시간으로 확인합니다.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto bg-white/10 p-2 rounded-xl backdrop-blur-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-indigo-200">거리:</span>
              <input 
                type="number" 
                min="0" 
                max="999"
                value={testDistance} 
                onChange={e => setTestDistance(parseInt(e.target.value) || 0)}
                onFocus={handleSelectAllOnFocus}
                className="w-14 bg-white text-gray-900 font-bold px-2 py-0.5 rounded text-xs text-center outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <span className="text-xs text-white">km</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-indigo-200">차종:</span>
              <select 
                value={testTonnage} 
                onChange={e => setTestTonnage(e.target.value as any)}
                className="bg-white text-gray-900 font-bold px-2 py-0.5 rounded text-xs outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="1">1톤</option>
                <option value="2.5">2.5톤</option>
                <option value="5">5톤</option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded">
              <button
                type="button"
                onClick={() => setTestIsTop(false)}
                className={`flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded transition-all ${
                  !testIsTop ? 'bg-amber-400 text-gray-950 shadow-xs' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Sun size={12} />
                <span>카고</span>
              </button>
              <button
                type="button"
                onClick={() => setTestIsTop(true)}
                className={`flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded transition-all ${
                  testIsTop ? 'bg-indigo-400 text-gray-950 shadow-xs' : 'text-gray-300 hover:text-white'
                }`}
              >
                <CloudRain size={12} />
                <span>우천 탑차</span>
              </button>
            </div>

            <div className="border-l border-white/20 pl-2.5 flex items-center gap-2">
              <div className="text-right">
                <div className="text-[10px] text-indigo-200 font-medium">적용 구간: {simulated.tier}</div>
                <div className="text-base sm:text-lg font-black text-amber-300 leading-tight">
                  {simulated.cost.toLocaleString()}원
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 운임표 테이블 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-slate-100 border-b border-gray-200 text-gray-700">
                <th className="py-2.5 px-3 font-bold text-center w-12 border-r border-gray-200">순서</th>
                <th className="py-2.5 px-3 font-bold min-w-[130px] border-r border-gray-200">거리 구간명</th>
                <th className="py-2.5 px-3 font-bold text-center min-w-[100px] border-r border-gray-200">거리 범위(km)</th>
                <th className="py-2.5 px-3 font-bold text-center min-w-[160px] bg-blue-50/70 border-r border-gray-200" colSpan={2}>
                  1톤 용차 운임 (원)
                </th>
                <th className="py-2.5 px-3 font-bold text-center min-w-[160px] bg-indigo-50/70 border-r border-gray-200" colSpan={2}>
                  2.5톤 용차 운임 (원)
                </th>
                <th className="py-2.5 px-3 font-bold text-center min-w-[160px] bg-purple-50/70 border-r border-gray-200" colSpan={2}>
                  5톤 용차 운임 (원)
                </th>
                <th className="py-2.5 px-3 font-bold min-w-[100px] border-r border-gray-200">비고</th>
                <th className="py-2.5 px-2 font-bold text-center w-12">관리</th>
              </tr>
              <tr className="bg-gray-50/90 border-b border-gray-200 text-[11px] text-gray-600">
                <th className="border-r border-gray-200"></th>
                <th className="border-r border-gray-200"></th>
                <th className="border-r border-gray-200 text-center text-[10px] text-gray-400">최소 ~ 최대</th>
                <th className="py-1 px-2 text-center bg-blue-50/50 border-r border-gray-200 font-semibold text-blue-800">카고 (기본)</th>
                <th className="py-1 px-2 text-center bg-blue-100/50 border-r border-gray-200 font-semibold text-blue-900">탑차 (우천)</th>
                <th className="py-1 px-2 text-center bg-indigo-50/50 border-r border-gray-200 font-semibold text-indigo-800">카고 (기본)</th>
                <th className="py-1 px-2 text-center bg-indigo-100/50 border-r border-gray-200 font-semibold text-indigo-900">탑차 (우천)</th>
                <th className="py-1 px-2 text-center bg-purple-50/50 border-r border-gray-200 font-semibold text-purple-800">카고 (기본)</th>
                <th className="py-1 px-2 text-center bg-purple-100/50 border-r border-gray-200 font-semibold text-purple-900">탑차 (우천)</th>
                <th className="border-r border-gray-200"></th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-400">
                    데이터를 불러오는 중입니다...
                  </td>
                </tr>
              ) : fares.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-400">
                    등록된 용차 운임 정보가 없습니다. 상단의 [표준운임 복원]을 눌러 기본 요금표를 등록하세요.
                  </td>
                </tr>
              ) : (
                fares.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-indigo-50/20 transition-colors">
                    {/* 순서 */}
                    <td className="py-2 px-2 text-center font-bold text-gray-500 border-r border-gray-100">
                      <input 
                        type="number"
                        value={item.order}
                        onChange={e => handleCellChange(item.id, 'order', parseInt(e.target.value) || 0)}
                        className="w-10 text-center bg-transparent hover:bg-white focus:bg-white rounded border border-transparent focus:border-indigo-400 outline-none"
                      />
                    </td>

                    {/* 거리 구간명 */}
                    <td className="py-2 px-3 border-r border-gray-100">
                      <input 
                        type="text"
                        value={item.distanceName}
                        onChange={e => handleCellChange(item.id, 'distanceName', e.target.value)}
                        className="w-full font-bold text-gray-900 bg-transparent hover:bg-white focus:bg-white rounded px-1.5 py-1 border border-transparent focus:border-indigo-400 outline-none"
                      />
                    </td>

                    {/* 거리 범위 */}
                    <td className="py-2 px-2 text-center border-r border-gray-100 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <input 
                          type="number"
                          value={item.minDistanceKm}
                          onChange={e => handleCellChange(item.id, 'minDistanceKm', parseInt(e.target.value) || 0)}
                          className="w-11 text-center bg-transparent hover:bg-white focus:bg-white rounded border border-transparent focus:border-indigo-400 outline-none font-medium"
                        />
                        <span className="text-gray-400">~</span>
                        <input 
                          type="number"
                          value={item.maxDistanceKm}
                          onChange={e => handleCellChange(item.id, 'maxDistanceKm', parseInt(e.target.value) || 0)}
                          className="w-11 text-center bg-transparent hover:bg-white focus:bg-white rounded border border-transparent focus:border-indigo-400 outline-none font-medium"
                        />
                      </div>
                    </td>

                    {/* 1톤 카고 */}
                    <td className="py-2 px-2 text-right border-r border-gray-100 bg-blue-50/20">
                      <input 
                        type="number"
                        step="5000"
                        value={item.cost1TonCargo}
                        onChange={e => handleCellChange(item.id, 'cost1TonCargo', parseInt(e.target.value) || 0)}
                        onFocus={handleSelectAllOnFocus}
                        className="w-full text-right font-bold text-blue-700 bg-transparent hover:bg-white focus:bg-white rounded px-1.5 py-1 border border-transparent focus:border-blue-400 outline-none"
                      />
                    </td>

                    {/* 1톤 탑차 */}
                    <td className="py-2 px-2 text-right border-r border-gray-100 bg-blue-50/40">
                      <input 
                        type="number"
                        step="5000"
                        value={item.cost1TonTop}
                        onChange={e => handleCellChange(item.id, 'cost1TonTop', parseInt(e.target.value) || 0)}
                        onFocus={handleSelectAllOnFocus}
                        className="w-full text-right font-bold text-blue-900 bg-transparent hover:bg-white focus:bg-white rounded px-1.5 py-1 border border-transparent focus:border-blue-500 outline-none"
                      />
                    </td>

                    {/* 2.5톤 카고 */}
                    <td className="py-2 px-2 text-right border-r border-gray-100 bg-indigo-50/20">
                      <input 
                        type="number"
                        step="5000"
                        value={item.cost2_5TonCargo}
                        onChange={e => handleCellChange(item.id, 'cost2_5TonCargo', parseInt(e.target.value) || 0)}
                        onFocus={handleSelectAllOnFocus}
                        className="w-full text-right font-bold text-indigo-700 bg-transparent hover:bg-white focus:bg-white rounded px-1.5 py-1 border border-transparent focus:border-indigo-400 outline-none"
                      />
                    </td>

                    {/* 2.5톤 탑차 */}
                    <td className="py-2 px-2 text-right border-r border-gray-100 bg-indigo-50/40">
                      <input 
                        type="number"
                        step="5000"
                        value={item.cost2_5TonTop}
                        onChange={e => handleCellChange(item.id, 'cost2_5TonTop', parseInt(e.target.value) || 0)}
                        onFocus={handleSelectAllOnFocus}
                        className="w-full text-right font-bold text-indigo-900 bg-transparent hover:bg-white focus:bg-white rounded px-1.5 py-1 border border-transparent focus:border-indigo-500 outline-none"
                      />
                    </td>

                    {/* 5톤 카고 */}
                    <td className="py-2 px-2 text-right border-r border-gray-100 bg-purple-50/20">
                      <input 
                        type="number"
                        step="5000"
                        value={item.cost5TonCargo}
                        onChange={e => handleCellChange(item.id, 'cost5TonCargo', parseInt(e.target.value) || 0)}
                        onFocus={handleSelectAllOnFocus}
                        className="w-full text-right font-bold text-purple-700 bg-transparent hover:bg-white focus:bg-white rounded px-1.5 py-1 border border-transparent focus:border-purple-400 outline-none"
                      />
                    </td>

                    {/* 5톤 탑차 */}
                    <td className="py-2 px-2 text-right border-r border-gray-100 bg-purple-50/40">
                      <input 
                        type="number"
                        step="5000"
                        value={item.cost5TonTop}
                        onChange={e => handleCellChange(item.id, 'cost5TonTop', parseInt(e.target.value) || 0)}
                        onFocus={handleSelectAllOnFocus}
                        className="w-full text-right font-bold text-purple-900 bg-transparent hover:bg-white focus:bg-white rounded px-1.5 py-1 border border-transparent focus:border-purple-500 outline-none"
                      />
                    </td>

                    {/* 비고 */}
                    <td className="py-2 px-2 border-r border-gray-100">
                      <input 
                        type="text"
                        value={item.note || ''}
                        onChange={e => handleCellChange(item.id, 'note', e.target.value)}
                        placeholder="특이사항"
                        className="w-full text-xs text-gray-500 bg-transparent hover:bg-white focus:bg-white rounded px-1 py-1 border border-transparent focus:border-gray-300 outline-none"
                      />
                    </td>

                    {/* 삭제 */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.distanceName)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                        title="구간 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 테이블 하단 안내 배너 */}
        <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-gray-500 gap-1.5">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-indigo-600" />
            <span>표 안의 숫자를 클릭해 엑셀처럼 자유롭게 수정한 뒤 상단의 <strong>[전체 저장]</strong>을 누르면 즉시 저장됩니다.</span>
          </div>
          <span className="text-gray-400">* 이사 견적 및 원가산출 시 이동거리와 초과차량 선택에 따라 본 운임표가 자동 적용됩니다.</span>
        </div>
      </div>

      {/* 신규 거리 구간 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                <span>새 거리 구간 및 용차 운임 등록</span>
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-700 block mb-1">거리 구간명 *</label>
                  <input 
                    name="distanceName" 
                    required 
                    placeholder="예: 400km 이상" 
                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">정렬 순서</label>
                  <input 
                    name="order" 
                    type="number" 
                    defaultValue={fares.length + 1} 
                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">최소 거리 (km)</label>
                  <input 
                    name="minDistanceKm" 
                    type="number" 
                    defaultValue={0} 
                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">최대 거리 (km)</label>
                  <input 
                    name="maxDistanceKm" 
                    type="number" 
                    defaultValue={30} 
                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="text-xs font-bold text-gray-800">1톤 운임 (카고 / 탑차)</div>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    name="cost1TonCargo" 
                    type="number" 
                    step="5000" 
                    placeholder="1톤 카고 운임 (원)" 
                    defaultValue={70000} 
                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg focus:border-indigo-500 outline-none"
                  />
                  <input 
                    name="cost1TonTop" 
                    type="number" 
                    step="5000" 
                    placeholder="1톤 탑차(우천) 운임 (원)" 
                    defaultValue={90000} 
                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-bold text-gray-800">2.5톤 운임 (카고 / 탑차)</div>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    name="cost2_5TonCargo" 
                    type="number" 
                    step="5000" 
                    placeholder="2.5톤 카고 운임 (원)" 
                    defaultValue={130000} 
                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg focus:border-indigo-500 outline-none"
                  />
                  <input 
                    name="cost2_5TonTop" 
                    type="number" 
                    step="5000" 
                    placeholder="2.5톤 탑차(우천) 운임 (원)" 
                    defaultValue={160000} 
                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-bold text-gray-800">5톤 운임 (카고 / 탑차)</div>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    name="cost5TonCargo" 
                    type="number" 
                    step="5000" 
                    placeholder="5톤 카고 운임 (원)" 
                    defaultValue={200000} 
                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg focus:border-indigo-500 outline-none"
                  />
                  <input 
                    name="cost5TonTop" 
                    type="number" 
                    step="5000" 
                    placeholder="5톤 탑차(우천) 운임 (원)" 
                    defaultValue={240000} 
                    className="w-full px-2.5 py-1.5 text-xs border rounded-lg focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">비고 (메모)</label>
                <input 
                  name="note" 
                  placeholder="특이사항 메모" 
                  className="w-full px-2.5 py-1.5 text-xs border rounded-lg focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
