'use client'

import { useState, useEffect } from 'react'
import { createStandardItem, deleteStandardItem, getStandardItems, updateStandardItem, getLocationCategories, createLocationCategory, deleteLocationCategory } from '@/app/actions/item'
import { Trash2, Edit2, Check, X, Calculator, Copy } from 'lucide-react'

export default function ItemsPage() {
  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterLocationId, setFilterLocationId] = useState<string>('all')
  const [filterName, setFilterName] = useState<string>('')

  // CBM 계산기 상태
  const [isCbmCalculatorOpen, setIsCbmCalculatorOpen] = useState(false)
  const [cbmLength, setCbmLength] = useState<number | ''>('')
  const [cbmWidth, setCbmWidth] = useState<number | ''>('')
  const [cbmHeight, setCbmHeight] = useState<number | ''>('')
  const [defaultCbmVal, setDefaultCbmVal] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const calculatedCbm = (Number(cbmLength) > 0 && Number(cbmWidth) > 0 && Number(cbmHeight) > 0)
    ? ((Number(cbmLength) * Number(cbmWidth) * Number(cbmHeight)) / 1000000).toFixed(3)
    : '0.000'

  const handleApplyCbm = () => {
    if (calculatedCbm !== '0.000') {
      setDefaultCbmVal(calculatedCbm)
      setIsCbmCalculatorOpen(false)
    }
  }

  const handleCopyCbm = () => {
    if (calculatedCbm !== '0.000') {
      navigator.clipboard.writeText(calculatedCbm)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [itemsData, categoriesData] = await Promise.all([
      getStandardItems(),
      getLocationCategories()
    ])
    setItems(itemsData)
    setCategories(categoriesData)
    setLoading(false)
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const res = await createStandardItem(formData)
    
    if (res?.error) {
      alert(res.error)
    } else {
      form.reset()
      setDefaultCbmVal('')
      fetchData()
    }
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>, id: string) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const res = await updateStandardItem(id, formData)
    
    if (res?.error) {
      alert(res.error)
    } else {
      setEditingId(null)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 기준정보를 삭제하시겠습니까?')) return
    
    const res = await deleteStandardItem(id)
    if (res.error) {
      alert(res.error)
    } else {
      fetchData()
    }
  }

  const handleCreateCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const res = await createLocationCategory(formData)
    
    if (res?.error) {
      alert(res.error)
    } else {
      form.reset()
      fetchData()
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('정말 이 위치 카테고리를 삭제하시겠습니까? 연결된 물품의 위치 정보가 사라질 수 있습니다.')) return
    
    const res = await deleteLocationCategory(id)
    if (res.error) {
      alert(res.error)
    } else {
      fetchData()
    }
  }

  const filteredItems = items.filter(item => {
    let locationMatch = true
    if (filterLocationId === 'none') {
      locationMatch = !item.locations || item.locations.length === 0
    } else if (filterLocationId !== 'all') {
      locationMatch = item.locations?.some((l: any) => l.id === filterLocationId)
    }

    let nameMatch = true
    if (filterName.trim() !== '') {
      nameMatch = item.name.toLowerCase().includes(filterName.toLowerCase())
    }

    return locationMatch && nameMatch
  })

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">물품 기준정보 관리</h1>
        <button
          type="button"
          onClick={() => setIsCbmCalculatorOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm"
        >
          <Calculator size={18} />
          CBM 계산기
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 위치 카테고리 관리 */}
        <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-fit">
          <h2 className="text-lg font-bold text-blue-600 border-b pb-2 mb-4">위치 카테고리</h2>
          <form onSubmit={handleCreateCategory} className="flex gap-2 mb-4">
            <input type="text" name="name" required placeholder="예: 안방" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">추가</button>
          </form>
          <ul className="space-y-2 overflow-y-auto max-h-64">
            {categories.map(cat => (
              <li key={cat.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded border border-gray-100">
                <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 hover:text-red-700 p-1">
                  <X size={16} />
                </button>
              </li>
            ))}
            {categories.length === 0 && <li className="text-sm text-gray-500 text-center py-4">등록된 카테고리가 없습니다.</li>}
          </ul>
        </div>

        {/* 새 물품 등록 폼 */}
        <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold text-blue-600 border-b pb-2 mb-4">새 물품 등록</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">위치 (다중 선택 가능)</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
                {categories.map(cat => (
                  <label key={cat.id} className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 px-2 py-1 rounded text-sm cursor-pointer hover:bg-gray-100">
                    <input type="checkbox" name="locationCategoryIds" value={cat.id} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                    <span>{cat.name}</span>
                  </label>
                ))}
                {categories.length === 0 && <span className="text-sm text-gray-500">등록된 위치 카테고리가 없습니다.</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">품목</label>
                <input type="text" name="name" required placeholder="예: 장롱" className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">규격 (선택)</label>
                <input type="text" name="spec" placeholder="예: 12자" className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">기본 CBM</label>
                <button 
                  type="button" 
                  onClick={() => setIsCbmCalculatorOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  <Calculator size={13} />
                  CBM 계산기
                </button>
              </div>
              <input 
                type="number" 
                step="0.01" 
                name="defaultCbm" 
                value={defaultCbmVal}
                onChange={e => setDefaultCbmVal(e.target.value)}
                required 
                placeholder="예: 1.5" 
                className="block w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">내부 짐 추가 CBM (선택)</label>
              <input type="number" step="0.01" name="defaultInnerCbm" defaultValue={0} className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500" />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              등록하기
            </button>
          </form>
        </div>

        {/* 등록된 물품 목록 */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">등록된 물품 목록</h2>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="품목 검색..."
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 bg-white"
              />
              <select 
                value={filterLocationId} 
                onChange={e => setFilterLocationId(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 bg-white"
              >
                <option value="all">전체 위치 보기</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
                <option value="none">위치 미지정</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-gray-100/90 text-gray-800 font-bold text-sm border-b border-gray-200">
                  <th className="p-4 font-medium">위치</th>
                  <th className="p-4 font-medium">품목</th>
                  <th className="p-4 font-medium">규격</th>
                  <th className="p-4 font-medium">기본 CBM</th>
                  <th className="p-4 font-medium">추가 CBM</th>
                  <th className="p-4 font-medium text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">로딩 중...</td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      {items.length === 0 ? '등록된 물품이 없습니다. 좌측 폼에서 등록해주세요.' : '해당 조건에 등록된 물품이 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => (
                    editingId === item.id ? (
                      <tr key={item.id} className="border-b last:border-0 bg-blue-50/30">
                        <td colSpan={6} className="p-2">
                          <form onSubmit={(e) => handleUpdate(e, item.id)} className="flex items-center gap-2">
                            <div className="flex flex-wrap gap-1 w-32 max-h-24 overflow-y-auto border border-gray-300 rounded bg-white p-1">
                              {categories.map(cat => (
                                <label key={cat.id} className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 px-1 py-0.5 rounded text-xs cursor-pointer hover:bg-gray-100 whitespace-nowrap">
                                  <input 
                                    type="checkbox" 
                                    name="locationCategoryIds" 
                                    value={cat.id} 
                                    defaultChecked={item.locations?.some((l: any) => l.id === cat.id)}
                                    className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3" 
                                  />
                                  <span>{cat.name}</span>
                                </label>
                              ))}
                            </div>
                            <input type="text" name="name" defaultValue={item.name} required className="w-24 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                            <input type="text" name="spec" defaultValue={item.spec} className="w-24 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                            <input type="number" step="0.01" name="defaultCbm" defaultValue={item.defaultCbm} required className="w-16 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                            <input type="number" step="0.01" name="defaultInnerCbm" defaultValue={item.defaultInnerCbm} className="w-16 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                            <div className="flex gap-1 ml-auto">
                              <button type="submit" className="text-green-600 hover:bg-green-100 p-2 rounded-md transition-colors"><Check size={18}/></button>
                              <button type="button" onClick={() => setEditingId(null)} className="text-gray-500 hover:bg-gray-200 p-2 rounded-md transition-colors"><X size={18}/></button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-gray-600 text-sm">
                          {item.locations && item.locations.length > 0 
                            ? <div className="flex flex-wrap gap-1">
                                {item.locations.map((l: any) => (
                                  <span key={l.id} className="bg-gray-100 px-2 py-0.5 rounded-full text-xs border border-gray-200">{l.name}</span>
                                ))}
                              </div>
                            : '-'}
                        </td>
                        <td className="p-4 font-bold text-gray-900">{item.name}</td>
                        <td className="p-4 text-gray-800 font-medium">{item.spec || '-'}</td>
                        <td className="p-4 text-blue-700 font-bold">{item.defaultCbm}</td>
                        <td className="p-4 text-amber-700 font-bold">{item.defaultInnerCbm > 0 ? `+${item.defaultInnerCbm}` : '-'}</td>
                        <td className="p-4 text-right flex justify-end gap-1">
                          <button onClick={() => setEditingId(item.id)} className="text-gray-500 hover:text-blue-600 p-2 rounded-md hover:bg-blue-50 transition-colors">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    )
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CBM 계산기 모달 */}
      {isCbmCalculatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsCbmCalculatorOpen(false)}>
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Calculator size={20} />
                </div>
                <h3 className="font-bold text-lg text-gray-900">CBM 계산기</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsCbmCalculatorOpen(false)} 
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">가로 (cm)</label>
                <input 
                  type="number" 
                  value={cbmLength} 
                  onChange={e => setCbmLength(e.target.value ? Number(e.target.value) : '')} 
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500" 
                  placeholder="예: 100" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">세로 (cm)</label>
                <input 
                  type="number" 
                  value={cbmWidth} 
                  onChange={e => setCbmWidth(e.target.value ? Number(e.target.value) : '')} 
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500" 
                  placeholder="예: 50" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">높이 (cm)</label>
                <input 
                  type="number" 
                  value={cbmHeight} 
                  onChange={e => setCbmHeight(e.target.value ? Number(e.target.value) : '')} 
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500" 
                  placeholder="예: 200" 
                />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-700">계산 결과</span>
                  <span className="text-xl font-bold text-blue-600">
                    {calculatedCbm} <span className="text-sm">CBM</span>
                  </span>
                </div>
                <p className="text-xs text-gray-400 text-right">
                  (가로 × 세로 × 높이) ÷ 1,000,000
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={handleApplyCbm} 
                  disabled={calculatedCbm === '0.000'}
                  className="bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  새 물품에 적용
                </button>
                <button 
                  type="button" 
                  onClick={handleCopyCbm}
                  disabled={calculatedCbm === '0.000'}
                  className="flex items-center justify-center gap-1 bg-gray-100 text-gray-700 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-200 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  <span>{copied ? '복사 완료!' : '값 복사'}</span>
                </button>
              </div>

              <button 
                type="button" 
                onClick={() => setIsCbmCalculatorOpen(false)} 
                className="w-full bg-gray-50 text-gray-600 border border-gray-200 rounded-lg px-4 py-2 font-medium hover:bg-gray-100 transition-colors text-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
