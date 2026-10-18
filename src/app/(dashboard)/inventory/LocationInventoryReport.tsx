'use client'

import { useState, useMemo } from 'react'
import { 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  Truck, 
  Warehouse, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Phone, 
  FileText,
  Boxes,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface LocationInventoryReportProps {
  locations: any[]
  materials: any[]
  initialLocationId?: string
  onOpenTransfer?: (sourceLocId?: string) => void
}

export function LocationInventoryReport({
  locations,
  materials,
  initialLocationId,
  onOpenTransfer
}: LocationInventoryReportProps) {
  // 1. 선택된 위치 (차량이 우선 선택되도록 기본값 설정)
  const defaultLocId = useMemo(() => {
    if (initialLocationId && locations.some(l => l.id === initialLocationId)) {
      return initialLocationId
    }
    const firstVehicle = locations.find(l => l.type === 'VEHICLE')
    return firstVehicle?.id || locations[0]?.id || ''
  }, [initialLocationId, locations])

  const [selectedLocationId, setSelectedLocationId] = useState<string>(defaultLocId)

  // 2. 필터 옵션
  const [onlyInStock, setOnlyInStock] = useState(true) // 기본값: 실제 실려있는(수량 > 0) 자재만 보기
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  // 3. 인수인계 메타데이터 (차량 대여/출력용)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [handoverDate, setHandoverDate] = useState(todayStr)
  const [returnDate, setReturnDate] = useState(todayStr) // 기본값은 인계일자를 따라감
  const [isReturnDateCustom, setIsReturnDateCustom] = useState(false) // 사용자가 자체 수정한 여부
  const [giverName, setGiverName] = useState('자사 관리자')
  const [receiverName, setReceiverName] = useState('')
  const [receiverContact, setReceiverContact] = useState('')
  const [vehicleNote, setVehicleNote] = useState('')
  const [isHandoverFormOpen, setIsHandoverFormOpen] = useState(false)

  // 인계일자 변경 시 반납예정일 기본값도 연동 (자체 수정하지 않았거나 인계일보다 이전인 경우)
  const handleHandoverDateChange = (newDate: string) => {
    setHandoverDate(newDate)
    if (!isReturnDateCustom || !returnDate || returnDate < newDate) {
      setReturnDate(newDate)
    }
  }

  // 반납예정일 자체 수정
  const handleReturnDateChange = (newDate: string) => {
    setReturnDate(newDate)
    setIsReturnDateCustom(true)
  }

  // 빠른 반납일 설정 (당일/익일)
  const setQuickReturnDays = (days: number) => {
    if (!handoverDate) return
    const base = new Date(handoverDate)
    base.setDate(base.getDate() + days)
    const formatted = base.toISOString().slice(0, 10)
    setReturnDate(formatted)
    setIsReturnDateCustom(days !== 0)
  }

  // 4. 복사 성공 토스트 상태
  const [copied, setCopied] = useState(false)

  // 현재 선택된 위치 객체
  const selectedLocation = useMemo(() => {
    return locations.find(l => l.id === selectedLocationId) || locations[0]
  }, [locations, selectedLocationId])

  // 현재 위치의 자재 목록 가공 (자재 품명 기본 가나다순 정렬)
  const locationItems = useMemo(() => {
    if (!selectedLocation) return []

    const list = materials.map(m => {
      const qty = m.stocks?.[selectedLocation.id] || 0
      return {
        id: m.id,
        code: m.code,
        name: m.name,
        category: m.category,
        unit: m.unit,
        unitPrice: m.unitPrice || 0,
        memo: m.memo || '',
        quantity: qty
      }
    })

    return list.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [materials, selectedLocation])

  // 필터링된 자재 목록
  const filteredItems = useMemo(() => {
    return locationItems.filter(item => {
      // 재고 보유 여부 필터
      if (onlyInStock && item.quantity <= 0) return false

      // 검색어 필터
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match = item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)
        if (!match) return false
      }

      // 카테고리 필터
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false
      }

      return true
    })
  }, [locationItems, onlyInStock, searchQuery, categoryFilter])

  // 요약 통계
  const inStockItemsCount = useMemo(() => {
    return locationItems.filter(i => i.quantity > 0).length
  }, [locationItems])

  const totalLoadedQuantity = useMemo(() => {
    return locationItems.reduce((acc, i) => acc + i.quantity, 0)
  }, [locationItems])

  // 5. PDF 다운로드 및 인쇄 실행
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      const win = window as any
      if (win.AndroidPrinter && typeof win.AndroidPrinter.print === 'function') {
        win.AndroidPrinter.print(`MEMAN_자재현황_${selectedLocation?.name || '거점'}`)
        return
      }
    }
    window.print()
  }

  // 6. 카카오톡 / 메신저 공유 텍스트 생성 및 복사
  const generateShareText = () => {
    if (!selectedLocation) return ''

    const lines: string[] = []
    lines.push(`📋 [차량/거점 자재 재고 및 인수인계 현황]`)
    lines.push(`■ 대상 거점: ${selectedLocation.name} (${selectedLocation.type === 'VEHICLE' ? '차량' : '창고'})`)
    lines.push(`■ 기준 일시: ${handoverDate}`)
    if (receiverName) {
      lines.push(`■ 인수자(대여자): ${receiverName}${receiverContact ? ` (${receiverContact})` : ''}`)
    }
    if (returnDate) {
      lines.push(`■ 반납 예정일: ${returnDate}`)
    }
    if (vehicleNote) {
      lines.push(`■ 비고/차량정보: ${vehicleNote}`)
    }
    lines.push(`----------------------------------------`)
    lines.push(`[적재 자재 목록 - 총 ${inStockItemsCount}종 (${totalLoadedQuantity.toLocaleString()}개)]`)

    const activeList = locationItems.filter(i => i.quantity > 0)
    if (activeList.length === 0) {
      lines.push(`(현재 적재된 자재가 없습니다)`)
    } else {
      activeList.forEach((it, idx) => {
        lines.push(`${idx + 1}. ${it.name} : ${it.quantity}${it.unit}`)
      })
    }

    lines.push(`----------------------------------------`)
    lines.push(`※ 차량 반납 시 위 자재 품목 및 수량을 확인해 주시기 바랍니다.`)

    return lines.join('\n')
  }

  const handleCopyShareText = async () => {
    const text = generateShareText()
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      console.error('클립보드 복사 실패:', err)
      alert('텍스트 복사에 실패했습니다.')
    }
  }

  // 7. 모바일 Web Share API
  const handleMobileShare = async () => {
    const text = generateShareText()
    if (navigator.share) {
      try {
        await navigator.share({
          title: `[자재 재고 목록] ${selectedLocation?.name}`,
          text: text
        })
      } catch (err) {
        // 사용자가 취소한 경우는 무시
      }
    } else {
      handleCopyShareText()
    }
  }

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. 웹 화면 전용 UI (인쇄 시 숨김: print:hidden) */}
      {/* ========================================================= */}
      <div className="space-y-4 print:hidden">

        {/* 거점(차량/창고) 선택 카드 바 */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <span>조회할 차량 / 창고 거점 선택</span>
              <span className="text-[11px] text-gray-400 font-normal">({locations.length}개 거점)</span>
            </span>
            {onOpenTransfer && (
              <button
                type="button"
                onClick={() => onOpenTransfer(selectedLocationId)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                + 자재 이고(상차/하차) 이동하기
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {locations.map(loc => {
              const isSelected = loc.id === selectedLocationId
              // 해당 위치에 적재된 총 수량
              const locTotal = materials.reduce((acc, m) => acc + (m.stocks?.[loc.id] || 0), 0)
              const locItemCount = materials.filter(m => (m.stocks?.[loc.id] || 0) > 0).length

              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setSelectedLocationId(loc.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between relative ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-gray-50/60 border-gray-200 hover:border-gray-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="flex items-center gap-1.5 font-bold text-xs text-gray-900 truncate">
                      {loc.type === 'VEHICLE' ? (
                        <Truck size={15} className={isSelected ? 'text-blue-600' : 'text-emerald-600'} />
                      ) : (
                        <Warehouse size={15} className={isSelected ? 'text-blue-600' : 'text-indigo-600'} />
                      )}
                      <span className="truncate">{loc.name}</span>
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      loc.type === 'VEHICLE'
                        ? 'bg-emerald-100/70 text-emerald-800'
                        : 'bg-indigo-100/70 text-indigo-800'
                    }`}>
                      {loc.type === 'VEHICLE' ? '차량' : '창고'}
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 font-medium">적재 자재: {locItemCount}종</span>
                    <span className={`font-black ${locTotal > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
                      {locTotal.toLocaleString()}개
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 차량대여 인수인계 정보입력 PDF (접이식 아코디언 및 소형화 액션 버튼) */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
          <div className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 bg-white">
            {/* 좌측: 타이틀 및 아코디언 토글 클릭 영역 */}
            <div
              onClick={() => setIsHandoverFormOpen(!isHandoverFormOpen)}
              className="flex items-center gap-2 cursor-pointer select-none min-w-0 hover:opacity-85 transition-opacity"
              title="클릭하여 상세 정보 입력란을 열거나 닫습니다"
            >
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                <FileText size={16} />
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-gray-900 whitespace-nowrap">
                  차량대여 인수인계 정보입력 PDF
                </span>
                <span className="text-[11px] text-gray-400">
                  {receiverName ? `인수자: ${receiverName}` : '(선택 입력 사항)'}
                </span>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 ml-1">
                  <span>{isHandoverFormOpen ? '접기' : '입력란 열기'}</span>
                  {isHandoverFormOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </span>
              </div>
            </div>

            {/* 우측: 소형화된 PDF 출력 및 공유 버튼 그룹 */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
              <button
                type="button"
                onClick={handlePrint}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center gap-1.5 whitespace-nowrap"
                title="A4 규격 PDF로 저장하거나 인쇄합니다"
              >
                <Printer size={13} className="shrink-0" />
                <span>PDF 다운로드 / 인쇄</span>
              </button>

              <button
                type="button"
                onClick={handleCopyShareText}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 border whitespace-nowrap ${
                  copied
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200'
                }`}
                title="카카오톡이나 문자로 전송 가능한 텍스트를 복사합니다"
              >
                {copied ? <Check size={13} className="text-emerald-600 shrink-0" /> : <Copy size={13} className="shrink-0" />}
                <span>{copied ? '복사됨!' : '카톡/메신저 복사'}</span>
              </button>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  type="button"
                  onClick={handleMobileShare}
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-200 shrink-0"
                  title="모바일 간편 공유"
                >
                  <Share2 size={13} />
                </button>
              )}
            </div>
          </div>

          {isHandoverFormOpen && (
            <div className="p-4 pt-0 border-t border-gray-100 space-y-3 bg-gray-50/40">
              <p className="text-[11px] text-gray-500 mt-2">
                * 아래 정보를 입력하면 인쇄되는 PDF 인수인계서 및 카톡 공유 메시지에 인수자/반납예정일 정보가 자동으로 포함됩니다.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">인계 일자</label>
                  <input
                    type="date"
                    value={handoverDate}
                    onChange={(e) => handleHandoverDateChange(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-gray-700">반납 예정일</label>
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setQuickReturnDays(0)}
                        className={`px-1.5 py-0.5 rounded transition-colors ${
                          !isReturnDateCustom || returnDate === handoverDate
                            ? 'bg-blue-100 text-blue-700 font-bold'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                        title="인계일자와 동일하게 당일 반납으로 맞춥니다"
                      >
                        당일
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickReturnDays(1)}
                        className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                        title="인계일 다음날 반납"
                      >
                        +1일
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => handleReturnDateChange(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">인계자 (자사 담당자)</label>
                  <input
                    type="text"
                    value={giverName}
                    onChange={(e) => setGiverName(e.target.value)}
                    placeholder="예: 홍길동 팀장"
                    className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">인수자 (대여자 성명/상호)</label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="예: 김철수 (○○이사)"
                    className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">인수자 연락처</label>
                  <input
                    type="text"
                    value={receiverContact}
                    onChange={(e) => setReceiverContact(e.target.value)}
                    placeholder="예: 010-1234-5678"
                    className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">차량 번호 및 비고 메모</label>
                  <input
                    type="text"
                    value={vehicleNote}
                    onChange={(e) => setVehicleNote(e.target.value)}
                    placeholder="예: 서울80가1234 / 단프라박스 20개 파손 주의, 반납 시 연료 가득 주유"
                    className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 자재 목록 조회 테이블 섹션 */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
          {/* 필터 및 검색 바 */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/50">
            <div className="flex flex-wrap items-center gap-2 flex-1 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="자재명 또는 코드 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-500 font-medium"
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

              {/* 실제 실려있는 자재만 보기 토글 버튼 */}
              <button
                type="button"
                onClick={() => setOnlyInStock(!onlyInStock)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  onlyInStock
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
                title="수량이 0인 자재는 숨기고 실제로 실린 자재만 표시합니다"
              >
                <span>{onlyInStock ? '✓ 실제 적재된 자재만 보기' : '전체 품목 보기 (0개 포함)'}</span>
              </button>
            </div>

            {/* 현재 거점 요약 배지 */}
            <div className="text-xs font-bold text-gray-700 flex items-center gap-3">
              <span className="flex items-center gap-1 text-gray-600">
                <span>표시 품목:</span>
                <b className="text-blue-600">{filteredItems.length}</b>종
              </span>
              <span className="flex items-center gap-1 text-gray-600 border-l border-gray-300 pl-3">
                <span>총 적재 수량:</span>
                <b className="text-emerald-700 text-sm">{totalLoadedQuantity.toLocaleString()}</b>개
              </span>
            </div>
          </div>

          {/* 자재 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                <tr>
                  <th className="px-3.5 py-3 w-12 text-center">No</th>
                  <th className="px-3.5 py-3 w-28">자재 코드</th>
                  <th className="px-3.5 py-3">자재 품명</th>
                  <th className="px-3 py-3 text-center w-20">구분</th>
                  <th className="px-3 py-3 text-center w-16">단위</th>
                  <th className="px-4 py-3 text-center w-28 bg-blue-50/60 text-blue-900 font-black">
                    적재 수량
                  </th>
                  <th className="px-3.5 py-3 text-gray-500">비고 / 규격 메모</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      {onlyInStock ? (
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-500">
                            현재 [{selectedLocation?.name}]에 적재된 자재(보유 수량 &gt; 0)가 없습니다.
                          </p>
                          <p className="text-[11px] text-gray-400">
                            상단의 &apos;전체 품목 보기&apos;를 누르시거나, &apos;자재 이고(상차)&apos;를 통해 자재를 적재해주세요.
                          </p>
                        </div>
                      ) : (
                        <p>조회된 자재 품목이 없습니다.</p>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const hasStock = item.quantity > 0
                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-gray-50/80 transition-colors ${
                          hasStock ? 'bg-white' : 'bg-gray-50/30 opacity-60'
                        }`}
                      >
                        <td className="px-3.5 py-3 text-center text-gray-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="px-3.5 py-3 font-mono font-medium text-gray-600">
                          {item.code}
                        </td>
                        <td className="px-3.5 py-3 font-bold text-gray-900">
                          {item.name}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.category === 'REUSABLE'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : item.category === 'CONSUMABLE'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {item.category === 'REUSABLE' ? '회수용' : item.category === 'CONSUMABLE' ? '소모품' : '도구'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-gray-500 font-medium">
                          {item.unit}
                        </td>
                        <td className="px-4 py-3 text-center font-black text-sm bg-blue-50/30">
                          {hasStock ? (
                            <span className="text-blue-700 font-mono text-base">
                              {item.quantity.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-300 font-mono">0</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-gray-500">
                          {item.memo || '-'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              {filteredItems.length > 0 && (
                <tfoot className="bg-gray-100/80 border-t-2 border-gray-300 font-bold text-gray-900">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right">
                      합계 (총 {filteredItems.filter(i => i.quantity > 0).length}종 적재):
                    </td>
                    <td className="px-4 py-3 text-center text-base font-black text-blue-700 bg-blue-100/50">
                      {filteredItems.reduce((acc, i) => acc + i.quantity, 0).toLocaleString()}개
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. PDF 및 인쇄 전용 A4 공식 서식 (화면에서는 숨김: hidden print:block) */}
      {/* ========================================================= */}
      <div className="hidden print:block text-black bg-white print:m-0 print:p-0">
        {/* 상단 헤더: 회사 로고 & 문서 제목 */}
        <div className="flex justify-between items-end border-b-2 border-black pb-3 mb-4">
          <div className="flex items-center gap-3">
            <img 
              src="/esti_image.png" 
              alt="Logo" 
              className="h-10 object-contain" 
              onError={(e) => {
                // 이미지 로드 실패 시 대체 텍스트 처리
                (e.target as HTMLElement).style.display = 'none'
              }} 
            />
            <div>
              <h1 className="text-2xl font-black tracking-tight text-black">
                차량 자재 인수인계서 및 적재 재고 확인서
              </h1>
              <p className="text-[10pt] text-gray-600 mt-0.5">
                (차량 대여·배차 시 자재 분실 방지 및 상호 재고 확인용)
              </p>
            </div>
          </div>
          <div className="text-right text-[9pt] text-gray-700 leading-tight">
            <p><b>발행일자:</b> {handoverDate || todayStr}</p>
            <p><b>문서번호:</b> MAT-{todayStr.replace(/-/g, '')}-{(selectedLocation?.name || 'LOC').slice(0, 3)}</p>
          </div>
        </div>

        {/* 1. 기본 인수인계 정보 테이블 */}
        <div className="mb-4">
          <h2 className="text-[10pt] font-black mb-1.5 flex items-center gap-1">
            <span>■ 1. 차량 및 인수인계 기본 사항</span>
          </h2>
          <table className="w-full text-[9.5pt] border-collapse border border-black">
            <tbody>
              <tr>
                <th className="border border-black bg-gray-100 px-2 py-1.5 text-left font-bold w-1/6">
                  대상 거점/차량
                </th>
                <td className="border border-black px-2 py-1.5 font-bold w-2/6">
                  {selectedLocation?.name} ({selectedLocation?.type === 'VEHICLE' ? '차량' : '창고'})
                </td>
                <th className="border border-black bg-gray-100 px-2 py-1.5 text-left font-bold w-1/6">
                  인계 일자
                </th>
                <td className="border border-black px-2 py-1.5 w-2/6">
                  {handoverDate || todayStr}
                </td>
              </tr>
              <tr>
                <th className="border border-black bg-gray-100 px-2 py-1.5 text-left font-bold">
                  인계자 (자사)
                </th>
                <td className="border border-black px-2 py-1.5">
                  {giverName || '관리자'}
                </td>
                <th className="border border-black bg-gray-100 px-2 py-1.5 text-left font-bold">
                  반납 예정일
                </th>
                <td className="border border-black px-2 py-1.5">
                  {returnDate ? <b className="text-black">{returnDate}</b> : '협의 (미정)'}
                </td>
              </tr>
              <tr>
                <th className="border border-black bg-gray-100 px-2 py-1.5 text-left font-bold">
                  인수자 (대여자)
                </th>
                <td className="border border-black px-2 py-1.5 font-bold">
                  {receiverName || '__________________'}
                </td>
                <th className="border border-black bg-gray-100 px-2 py-1.5 text-left font-bold">
                  인수자 연락처
                </th>
                <td className="border border-black px-2 py-1.5">
                  {receiverContact || '__________________'}
                </td>
              </tr>
              <tr>
                <th className="border border-black bg-gray-100 px-2 py-1.5 text-left font-bold">
                  차량정보 / 비고
                </th>
                <td colSpan={3} className="border border-black px-2 py-1.5">
                  {vehicleNote || selectedLocation?.memo || '특이사항 없음'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. 적재 자재 목록 테이블 */}
        <div className="mb-4">
          <div className="flex justify-between items-end mb-1.5">
            <h2 className="text-[10pt] font-black">
              ■ 2. 적재 자재 목록 (인계 수량 vs 반납 확인)
            </h2>
            <span className="text-[8.5pt] text-gray-600">
              * 인계 시 수량과 반납 시 수량을 대조하여 확인합니다.
            </span>
          </div>

          <table className="w-full text-[9pt] border-collapse border border-black text-center">
            <thead>
              <tr className="bg-gray-100 font-bold border-b border-black">
                <th className="border border-black py-1.5 px-1 w-8">No</th>
                <th className="border border-black py-1.5 px-2 w-24">자재코드</th>
                <th className="border border-black py-1.5 px-2 text-left">자재 품명</th>
                <th className="border border-black py-1.5 px-1 w-16">구분</th>
                <th className="border border-black py-1.5 px-1 w-12">단위</th>
                <th className="border border-black py-1.5 px-2 w-20 font-black bg-gray-200">
                  인계 수량
                </th>
                <th className="border border-black py-1.5 px-2 w-24 font-bold">
                  반납 확인
                </th>
                <th className="border border-black py-1.5 px-2 text-left w-36">
                  상태 / 비고
                </th>
              </tr>
            </thead>
            <tbody>
              {/* 인쇄 시에는 기본적으로 수량이 있는 품목 위주로 출력 */}
              {(onlyInStock ? locationItems.filter(i => i.quantity > 0) : locationItems).length === 0 ? (
                <tr>
                  <td colSpan={8} className="border border-black py-8 text-center text-gray-500">
                    현재 적재된 자재가 없습니다.
                  </td>
                </tr>
              ) : (
                (onlyInStock ? locationItems.filter(i => i.quantity > 0) : locationItems).map((it, idx) => (
                  <tr key={it.id} className="border-b border-gray-300">
                    <td className="border border-black py-1 px-1 font-mono">{idx + 1}</td>
                    <td className="border border-black py-1 px-2 font-mono text-[8.5pt]">{it.code}</td>
                    <td className="border border-black py-1 px-2 text-left font-bold">{it.name}</td>
                    <td className="border border-black py-1 px-1 text-[8pt]">
                      {it.category === 'REUSABLE' ? '회수용' : it.category === 'CONSUMABLE' ? '소모품' : '도구'}
                    </td>
                    <td className="border border-black py-1 px-1">{it.unit}</td>
                    <td className="border border-black py-1 px-2 font-black text-[10pt] bg-gray-50">
                      {it.quantity.toLocaleString()}
                    </td>
                    {/* 반납 확인 기입란 (체크박스 또는 수기 기입용) */}
                    <td className="border border-black py-1 px-2 text-gray-400">
                      ( &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; )
                    </td>
                    <td className="border border-black py-1 px-2 text-left text-[8pt] text-gray-600 truncate">
                      {it.memo || ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t-2 border-black text-[9.5pt]">
                <td colSpan={5} className="border border-black py-1.5 px-3 text-right">
                  총 적재 합계 (총 {inStockItemsCount}개 품목):
                </td>
                <td className="border border-black py-1.5 px-2 font-black text-[11pt] bg-gray-200">
                  {totalLoadedQuantity.toLocaleString()}개
                </td>
                <td className="border border-black py-1.5 px-2 text-[8pt] text-gray-500">
                  반납 총계:
                </td>
                <td className="border border-black"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 3. 확인 서약 및 서명란 (인쇄 분할 방지: print-avoid-break) */}
        <div className="print-avoid-break border border-black p-3.5 mt-4 space-y-3">
          <p className="text-[9pt] font-semibold text-center leading-relaxed">
            위 차량 및 적재된 자재의 품목과 수량을 이상 없이 확인하고 정히 인수·인계합니다.<br />
            차량 운행 및 대여 중 분실·파손된 회수용 자재에 대해서는 반납 시 변상될 수 있음을 확인합니다.
          </p>

          <p className="text-center font-bold text-[9.5pt] pt-1">
            {handoverDate ? `${handoverDate.split('-')[0]}년 ${handoverDate.split('-')[1]}월 ${handoverDate.split('-')[2]}일` : todayStr}
          </p>

          <div className="grid grid-cols-2 gap-8 pt-3 px-4">
            <div className="flex justify-between items-end border-b border-black pb-1">
              <span className="font-bold text-[9.5pt]">인계자 (확인):</span>
              <span className="text-[9.5pt] font-semibold">
                {giverName || '관리자'} &nbsp; &nbsp; (인 / 서명)
              </span>
            </div>

            <div className="flex justify-between items-end border-b border-black pb-1">
              <span className="font-bold text-[9.5pt]">인수자 (수령):</span>
              <span className="text-[9.5pt] font-semibold">
                {receiverName || '__________________'} &nbsp; &nbsp; (인 / 서명)
              </span>
            </div>
          </div>
        </div>

        {/* 하단 각주 안내 */}
        <div className="mt-3 text-center text-[7.5pt] text-gray-500">
          ※ 본 확인서는 차량 대여 시 자재 안전 관리 및 반납 확인을 위해 1부씩 보관합니다.
        </div>
      </div>
    </div>
  )
}
