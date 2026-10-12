'use client'

import { useState, useEffect } from 'react'
import { 
  getLadderFares, 
  createLadderFare, 
  deleteLadderFare, 
  batchUpdateLadderFares, 
  resetLadderFaresToDefault
} from '@/app/actions/ladder'
import type { LadderFareItem } from '@/types/ladder'
import { handleSelectAllOnFocus } from '@/lib/format'
import { 
  Plus, 
  Save, 
  RotateCcw, 
  Trash2, 
  Calculator, 
  Check, 
  AlertCircle,
  Building2,
  TrendingUp,
  Sparkles
} from 'lucide-react'

export default function LadderTruckMasterPage() {
  const [fares, setFares] = useState<LadderFareItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

  // 신규 층수 등록 폼 상태
  const [showAddModal, setShowAddModal] = useState(false)

  // 테스트 계산기 상태
  const [testFloor, setTestFloor] = useState<number>(5)
  const [testTonnage, setTestTonnage] = useState<string>('5')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const data = await getLadderFares()
    setFares(data)
    setHasChanges(false)
    setLoading(false)
  }

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type })
    setTimeout(() => setStatusMessage(null), 3500)
  }

  const handleCellChange = (id: string, field: keyof LadderFareItem, value: any) => {
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
    const res = await batchUpdateLadderFares(fares)
    setSaving(false)
    if (res.success) {
      setHasChanges(false)
      showNotification('사다리차 표준 운임표가 성공적으로 저장되었습니다.')
    } else {
      showNotification(res.error || '저장 중 오류가 발생했습니다.', 'error')
    }
  }

  const handleReset = async () => {
    if (!confirm('사다리차 운임표를 전국 표준 기본 요금표로 초기화하시겠습니까?\n현재 수정 중인 변경사항이 덮어쓰기됩니다.')) return
    setLoading(true)
    const res = await resetLadderFaresToDefault()
    if (res.success) {
      await loadData()
      showNotification('전국 표준 사다리차 운임표로 복원되었습니다.')
    } else {
      showNotification(res.error || '초기화 실패', 'error')
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`'${name}' 층수 구간을 삭제하시겠습니까?`)) return
    const res = await deleteLadderFare(id)
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
    const res = await createLadderFare(formData)
    if (res.success) {
      setShowAddModal(false)
      await loadData()
      showNotification('새 층수 구간이 등록되었습니다.')
    } else {
      alert(res.error || '등록 실패')
    }
  }

  // 실시간 계산 시뮬레이터 로직
  const getSimulatedFee = () => {
    if (!testFloor || testFloor <= 1) return { cost: 0, tier: '해당없음 (1층 또는 미지정)' }
    const matched = fares.find(f => testFloor >= f.minFloor && testFloor <= f.maxFloor)
      || fares.find(f => testFloor <= f.maxFloor)
      || fares[fares.length - 1]

    if (!matched) return { cost: 0, tier: '미설정' }

    const ton = parseFloat(testTonnage) || 5
    let cost = matched.cost5Ton
    if (ton <= 1.0) cost = matched.cost1Ton
    else if (ton <= 2.5) cost = matched.cost2_5Ton
    else if (ton <= 5.0) cost = matched.cost5Ton
    else if (ton <= 6.0) cost = matched.cost6Ton
    else if (ton <= 7.5) cost = matched.cost7_5Ton
    else cost = matched.cost10Ton

    return { cost, tier: matched.floorName }
  }

  const simulated = getSimulatedFee()

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900">사다리차 운임표 관리</h1>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
              기초정보
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            층수 구간 및 화물 톤수별 표준 사다리차 운임을 관리합니다. 여기서 설정된 운임은 이사 견적 시 사다리차 작업비용에 자동 적용됩니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-1.5 border border-gray-200"
          >
            <RotateCcw size={15} />
            <span>표준운임 복원</span>
          </button>
          
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-1.5 border border-blue-200"
          >
            <Plus size={16} />
            <span>+ 층수구간 추가</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || !hasChanges}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm ${
              hasChanges
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Save size={16} />
            <span>{saving ? '저장 중...' : '전체 저장'}</span>
          </button>
        </div>
      </div>

      {/* 상태 알림 토스트 배너 */}
      {statusMessage && (
        <div className={`p-3.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm ${
          statusMessage.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {statusMessage.type === 'success' ? <Check size={18} className="text-green-600" /> : <AlertCircle size={18} className="text-red-600" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 실시간 계산 시뮬레이터 카드 */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-5 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <Calculator size={24} className="text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg">사다리차 운임 간편 테스트</span>
                <span className="text-xs bg-blue-500/30 px-2 py-0.5 rounded text-blue-200 font-medium">견적 연동 미리보기</span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">층수와 톤수를 선택하면 표준 운임표에서 자동 산출되는 금액을 실시간으로 확인합니다.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto bg-white/10 p-2.5 rounded-xl backdrop-blur-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-blue-200">층수:</span>
              <input 
                type="number" 
                min="2" 
                max="50"
                value={testFloor} 
                onChange={e => setTestFloor(parseInt(e.target.value) || 0)}
                onFocus={handleSelectAllOnFocus}
                className="w-16 bg-white text-gray-900 font-bold px-2.5 py-1 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-blue-400"
              />
              <span className="text-xs text-white">층</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-blue-200">톤수:</span>
              <select 
                value={testTonnage} 
                onChange={e => setTestTonnage(e.target.value)}
                className="bg-white text-gray-900 font-bold px-2.5 py-1 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="1">1톤</option>
                <option value="2.5">2.5톤</option>
                <option value="5">5톤</option>
                <option value="6">6톤</option>
                <option value="7.5">7.5톤</option>
                <option value="10">10톤</option>
              </select>
            </div>

            <div className="border-l border-white/20 pl-3 ml-1 flex items-center gap-2">
              <span className="text-xs text-blue-200">적용 구간: <strong className="text-white">{simulated.tier}</strong></span>
              <span className="text-lg sm:text-xl font-black text-amber-300">
                {simulated.cost.toLocaleString()} 원
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 사다리차 표준 운임표 그리드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-blue-600" />
            <h2 className="font-bold text-gray-900">층수 및 톤별 표준 운임 테이블</h2>
            <span className="text-xs text-gray-500 font-medium">(단위: 원, 금액을 클릭하여 직접 수정 가능)</span>
          </div>
          {hasChanges && (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 animate-pulse">
              ● 수정된 내용이 있습니다. [전체 저장] 버튼을 눌러주세요.
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-gray-100/90 text-gray-700 text-xs font-bold border-b border-gray-300">
                <th className="py-3 px-3 text-left w-24">층수 구분</th>
                <th className="py-3 px-2 w-16">시작층</th>
                <th className="py-3 px-2 w-16">끝층</th>
                <th className="py-3 px-3 bg-blue-50/50 text-blue-900 border-x border-gray-200">1톤</th>
                <th className="py-3 px-3 bg-blue-50/50 text-blue-900 border-r border-gray-200">2.5톤</th>
                <th className="py-3 px-3 bg-indigo-50/70 text-indigo-900 border-r border-gray-200">5톤 (기준)</th>
                <th className="py-3 px-3 bg-blue-50/50 text-blue-900 border-r border-gray-200">6톤</th>
                <th className="py-3 px-3 bg-blue-50/50 text-blue-900 border-r border-gray-200">7.5톤</th>
                <th className="py-3 px-3 bg-blue-50/50 text-blue-900 border-r border-gray-200">10톤</th>
                <th className="py-3 px-3 text-left">비고</th>
                <th className="py-3 px-2 w-16">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-gray-500 font-medium">운임표 불러오는 중...</td>
                </tr>
              ) : fares.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-gray-500 font-medium">등록된 운임 데이터가 없습니다. 상단 [표준운임 복원]을 눌러주세요.</td>
                </tr>
              ) : (
                fares.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                    {/* 층수 구분명 */}
                    <td className="py-2.5 px-3 text-left font-bold text-gray-900">
                      <input 
                        type="text" 
                        value={item.floorName} 
                        onChange={e => handleCellChange(item.id, 'floorName', e.target.value)}
                        className="w-full font-bold text-gray-900 bg-transparent px-1.5 py-1 rounded border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white outline-none"
                      />
                    </td>

                    {/* 시작층 */}
                    <td className="py-2 px-1">
                      <input 
                        type="number" 
                        value={item.minFloor} 
                        onChange={e => handleCellChange(item.id, 'minFloor', parseInt(e.target.value) || 1)}
                        onFocus={handleSelectAllOnFocus}
                        className="w-14 text-center text-gray-700 bg-transparent px-1 py-1 rounded border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white outline-none"
                      />
                    </td>

                    {/* 끝층 */}
                    <td className="py-2 px-1">
                      <input 
                        type="number" 
                        value={item.maxFloor} 
                        onChange={e => handleCellChange(item.id, 'maxFloor', parseInt(e.target.value) || 1)}
                        onFocus={handleSelectAllOnFocus}
                        className="w-14 text-center text-gray-700 bg-transparent px-1 py-1 rounded border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white outline-none"
                      />
                    </td>

                    {/* 1톤 */}
                    <td className="py-2 px-2 border-x border-gray-200">
                      <input 
                        type="number" 
                        step="10000"
                        value={item.cost1Ton} 
                        onChange={e => handleCellChange(item.id, 'cost1Ton', parseInt(e.target.value) || 0)}
                        onFocus={handleSelectAllOnFocus}
                        className="w-24 text-right text-gray-800 font-semibold bg-transparent px-2 py-1 rounded border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white outline-none"
                      />
                    </td>

                    {/* 2.5톤 */}
                    <td className="py-2 px-2 border-r border-gray-200">
                      <input 
                        type="number" 
                        step="10000"
                        value={item.cost2_5Ton} 
                        onChange={e => handleCellChange(item.id, 'cost2_5Ton', parseInt(e.target.value) || 0)}
                        onFocus={handleSelectAllOnFocus}
                        className="w-24 text-right text-gray-800 font-semibold bg-transparent px-2 py-1 rounded border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white outline-none"
                      />
                    </td>

                    {/* 5톤 (기준 대형) */}
                    <td className="py-2 px-2 bg-indigo-50/30 border-r border-gray-200">
                      <input 
                        type="number" 
                        step="10000"
                        value={item.cost5Ton} 
                        onChange={e => handleCellChange(item.id, 'cost5Ton', parseInt(e.target.value) || 0)}
                        onFocus={handleSelectAllOnFocus}
                        className="w-24 text-right text-indigo-700 font-bold bg-transparent px-2 py-1 rounded border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white outline-none"
                      />
                    </td>

                    {/* 6톤 */}
                    <td className="py-2 px-2 border-r border-gray-200">
                      <input 
                        type="number" 
                        step="10000"
                        value={item.cost6Ton} 
                        onChange={e => handleCellChange(item.id, 'cost6Ton', parseInt(e.target.value) || 0)}
                        onFocus={handleSelectAllOnFocus}
                        className="w-24 text-right text-gray-800 font-semibold bg-transparent px-2 py-1 rounded border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white outline-none"
                      />
                    </td>

                    {/* 7.5톤 */}
                    <td className="py-2 px-2 border-r border-gray-200">
                      <input 
                        type="number" 
                        step="10000"
                        value={item.cost7_5Ton} 
                        onChange={e => handleCellChange(item.id, 'cost7_5Ton', parseInt(e.target.value) || 0)}
                        onFocus={handleSelectAllOnFocus}
                        className="w-24 text-right text-gray-800 font-semibold bg-transparent px-2 py-1 rounded border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white outline-none"
                      />
                    </td>

                    {/* 10톤 */}
                    <td className="py-2 px-2 border-r border-gray-200">
                      <input 
                        type="number" 
                        step="10000"
                        value={item.cost10Ton} 
                        onChange={e => handleCellChange(item.id, 'cost10Ton', parseInt(e.target.value) || 0)}
                        onFocus={handleSelectAllOnFocus}
                        className="w-24 text-right text-gray-800 font-semibold bg-transparent px-2 py-1 rounded border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white outline-none"
                      />
                    </td>

                    {/* 비고 */}
                    <td className="py-2 px-3 text-left">
                      <input 
                        type="text" 
                        value={item.note || ''} 
                        placeholder="특이사항"
                        onChange={e => handleCellChange(item.id, 'note', e.target.value)}
                        className="w-full text-xs text-gray-500 bg-transparent px-2 py-1 rounded border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white outline-none"
                      />
                    </td>

                    {/* 삭제 */}
                    <td className="py-2 px-2 text-center">
                      <button 
                        type="button" 
                        onClick={() => handleDelete(item.id, item.floorName)}
                        className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="구간 삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 푸터 설명 */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-2">
          <div>
            ※ 각 금액란을 클릭하여 직접 수정할 수 있으며, 수정 후 우측 상단의 <strong>[전체 저장]</strong> 버튼을 누르면 DB에 영구 반영됩니다.
          </div>
          <div className="font-bold text-gray-700">
            총 {fares.length}개 층수 구간 운임 설정됨
          </div>
        </div>
      </div>

      {/* 신규 층수 구간 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">새 사다리차 층수 구간 등록</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700 font-bold text-xl">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">표시 명칭 *</label>
                  <input type="text" name="floorName" required placeholder="예: 26~27층" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">시작층 (F)</label>
                  <input type="number" name="minFloor" required placeholder="26" onFocus={handleSelectAllOnFocus} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">끝층 (T)</label>
                  <input type="number" name="maxFloor" required placeholder="27" onFocus={handleSelectAllOnFocus} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">1톤 운임 (원)</label>
                  <input type="number" step="10000" name="cost1Ton" required placeholder="270000" onFocus={handleSelectAllOnFocus} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">2.5톤 운임 (원)</label>
                  <input type="number" step="10000" name="cost2_5Ton" required placeholder="310000" onFocus={handleSelectAllOnFocus} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">5톤 운임 (원)</label>
                  <input type="number" step="10000" name="cost5Ton" required placeholder="360000" onFocus={handleSelectAllOnFocus} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">6톤 운임 (원)</label>
                  <input type="number" step="10000" name="cost6Ton" defaultValue="0" onFocus={handleSelectAllOnFocus} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">7.5톤 운임 (원)</label>
                  <input type="number" step="10000" name="cost7_5Ton" defaultValue="0" onFocus={handleSelectAllOnFocus} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">10톤 운임 (원)</label>
                  <input type="number" step="10000" name="cost10Ton" defaultValue="0" onFocus={handleSelectAllOnFocus} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">비고</label>
                <input type="text" name="note" placeholder="예: 초고층 특수사다리차" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium">취소</button>
                <button type="submit" className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm">등록하기</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
