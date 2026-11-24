'use client'

import { useMemo, useState } from 'react'
import {
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Plus,
  Search,
  Trash2,
  RotateCcw,
  Save,
  CheckCircle2,
} from 'lucide-react'
import {
  SMALL_CATEGORY_LABEL,
  inferSmallCategory,
  type SmallCategory,
  type SmallItem,
} from '@/lib/smallMove/catalog'
import { ItemIconByName } from '@/lib/smallMove/ItemIcon'
import { matchesKoreanSearch } from '@/lib/itemFilterUtils'
import { saveSmallCatalogAction, resetSmallCatalogAction } from '@/app/actions/smallMove'

interface StandardItemOption {
  id: string
  name: string
  spec: string
  defaultCbm: number
  defaultInnerCbm: number
}

const CATEGORIES = Object.keys(SMALL_CATEGORY_LABEL) as SmallCategory[]

export function CatalogManager({
  initialItems,
  standardItems,
  isCustomized,
}: {
  initialItems: SmallItem[]
  standardItems: StandardItemOption[]
  isCustomized: boolean
}) {
  const [items, setItems] = useState<SmallItem[]>(initialItems)
  const [activeCat, setActiveCat] = useState<SmallCategory | 'ALL'>('APPLIANCE')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStd, setSelectedStd] = useState<StandardItemOption | null>(null)
  const [newCategory, setNewCategory] = useState<SmallCategory>('APPLIANCE')
  const [newName, setNewName] = useState('')
  const [newSpec, setNewSpec] = useState('')
  const [newSize, setNewSize] = useState('')
  const [newGuide, setNewGuide] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)

  const stdMap = useMemo(() => {
    const m = new Map<string, StandardItemOption>()
    for (const s of standardItems) m.set(`${s.name}__${s.spec}`, s)
    return m
  }, [standardItems])

  const searchResults = useMemo(() => {
    const q = searchQuery.trim()
    if (!q) return []
    return standardItems.filter((s) => matchesKoreanSearch(s.name, s.spec, q)).slice(0, 24)
  }, [standardItems, searchQuery])

  const pickStandardForAdd = (std: StandardItemOption) => {
    setSelectedStd(std)
    // 기본은 품목명, 단 규격명이 더 구체적인 경우 버튼으로 1클릭 전환 가능
    setNewName(std.name)
    setNewSpec(std.spec)
    setNewCategory(inferSmallCategory(std.name))
    setNewSize('')
    setNewGuide('')
  }

  const handleAddItem = () => {
    if (!selectedStd || !newName.trim()) return
    const id = `c_${Date.now().toString(36)}`
    const added: SmallItem = {
      id,
      category: newCategory,
      name: newName.trim(),
      spec: newSpec.trim(),
      cbm: selectedStd.defaultCbm,
      innerCbm: selectedStd.defaultInnerCbm || 0,
      icon: '📦',
      size: newSize.trim(),
      guide: newGuide.trim() || `${newName.trim()} (${selectedStd.spec || '기본'}) 항목입니다.`,
      stdName: selectedStd.name,
      stdSpec: selectedStd.spec,
      max: 20,
      hidden: false,
    }
    setItems((prev) => [...prev, added])
    setActiveCat(newCategory)
    setSelectedStd(null)
    setSearchQuery('')
    setNewName('')
    setNewSpec('')
    setNewSize('')
    setNewGuide('')
  }

  const updateField = (id: string, patch: Partial<SmallItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  const moveItem = (id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id)
      if (idx < 0) return prev
      const targetCat = prev[idx].category
      // 같은 카테고리 내 인접 항목 찾기
      let swapIdx = idx + dir
      while (swapIdx >= 0 && swapIdx < prev.length && prev[swapIdx].category !== targetCat) {
        swapIdx += dir
      }
      if (swapIdx < 0 || swapIdx >= prev.length) return prev
      const copy = [...prev]
      const tmp = copy[idx]
      copy[idx] = copy[swapIdx]
      copy[swapIdx] = tmp
      return copy
    })
  }

  const removeCustomItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const filteredItems = useMemo(() => {
    if (activeCat === 'ALL') return items
    return items.filter((i) => i.category === activeCat)
  }, [items, activeCat])

  const handleSave = async (formData: FormData) => {
    setSaving(true)
    setSavedToast(false)
    try {
      await saveSmallCatalogAction(formData)
      setSavedToast(true)
      setTimeout(() => setSavedToast(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 상단 고정 영역: 저장 바 + 새 물품 추가 + 카테고리 탭 */}
      <div className="sticky top-11 z-20 bg-gray-100/95 backdrop-blur-xs pt-1 pb-2 -mx-1 px-1 space-y-2.5 max-h-[70vh] overflow-y-auto">
      {/* 상단 저장 바 */}
      <div className="bg-white rounded-2xl border border-gray-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded-full font-bold ${isCustomized ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
            {isCustomized ? '사용자 설정 적용 중' : '기본 카탈로그 사용 중'}
          </span>
          <span className="text-gray-500">전체 {items.length}종 (노출 {items.filter((i) => !i.hidden).length}종)</span>
          {savedToast && (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
              <CheckCircle2 size={14} /> 저장되었습니다!
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <form
            action={async () => {
              if (!confirm('기본 소형이사 물품 목록으로 초기화하시겠습니까?')) return
              await resetSmallCatalogAction()
              window.location.reload()
            }}
          >
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-1"
            >
              <RotateCcw size={13} /> 기본값 초기화
            </button>
          </form>
          <form action={handleSave}>
            <input type="hidden" name="catalog" value={JSON.stringify(items)} />
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 disabled:opacity-60"
            >
              <Save size={14} /> {saving ? '저장 중...' : '변경사항 저장'}
            </button>
          </form>
        </div>
      </div>

      {/* 새 물품 추가 (물품정보에서 선택 -> 표시명 자유 지정) */}
      <section className="bg-white rounded-2xl border border-blue-200 p-4 space-y-3 text-sm">
        <h2 className="font-black text-blue-900">+ 물품정보에서 새 소형이사 물품 추가</h2>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="물품정보 검색 (예: 비데, 김치냉장고, ㅂㄷ)"
            className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 text-xs sm:text-sm outline-none focus:border-blue-500"
          />
        </div>
        {searchQuery.trim() && (
          <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-xs text-gray-500">일치하는 물품정보가 없습니다.</p>
            ) : (
              searchResults.map((std) => (
                <button
                  key={std.id}
                  type="button"
                  onClick={() => pickStandardForAdd(std)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${
                    selectedStd?.id === std.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 hover:bg-blue-50 border-gray-200 text-gray-800'
                  }`}
                >
                  <ItemIconByName name={std.name} spec={std.spec} className="w-5 h-5 shrink-0 bg-white rounded" />
                  <span>{std.name}</span>
                  {std.spec && <span className="opacity-75">({std.spec})</span>}
                  <span className="text-[10px] opacity-75">{std.defaultCbm}㎥</span>
                </button>
              ))
            )}
          </div>
        )}

        {selectedStd && (
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ItemIconByName name={selectedStd.name} spec={selectedStd.spec} className="w-10 h-10 bg-white rounded-lg border border-blue-200 p-0.5" />
                <div>
                  <p className="text-xs font-black text-blue-900">
                    연결 기준정보: {selectedStd.name} / {selectedStd.spec || '기본'} ({selectedStd.defaultCbm}㎥)
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setNewName(selectedStd.name)
                        setNewSpec(selectedStd.spec)
                      }}
                      className="px-2 py-0.5 rounded bg-white border border-blue-300 text-[11px] font-bold text-blue-800 hover:bg-blue-100"
                    >
                      품목명을 표시명으로 ({selectedStd.name})
                    </button>
                    {selectedStd.spec && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewName(selectedStd.spec)
                          setNewSpec('')
                        }}
                        className="px-2 py-0.5 rounded bg-white border border-blue-300 text-[11px] font-bold text-blue-800 hover:bg-blue-100"
                      >
                        규격명을 표시명으로 ({selectedStd.spec})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-4 gap-2 text-xs">
              <label className="space-y-1">
                <span className="font-bold">소속 카테고리</span>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as SmallCategory)}
                  className="w-full border border-gray-300 bg-white rounded-lg px-2 py-1.5 font-bold"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{SMALL_CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-bold">고객 표시 물품명 *</span>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="예: 비데"
                  className="w-full border border-gray-300 bg-white rounded-lg px-2 py-1.5 font-bold"
                />
              </label>
              <label className="space-y-1">
                <span className="font-bold">보조 규격 설명</span>
                <input
                  value={newSpec}
                  onChange={(e) => setNewSpec(e.target.value)}
                  placeholder="예: 일반형"
                  className="w-full border border-gray-300 bg-white rounded-lg px-2 py-1.5"
                />
              </label>
              <label className="space-y-1">
                <span className="font-bold">대략 크기 (팝업용)</span>
                <input
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  placeholder="예: 가로 50cm"
                  className="w-full border border-gray-300 bg-white rounded-lg px-2 py-1.5"
                />
              </label>
            </div>
            <div className="flex gap-2 items-center">
              <input
                value={newGuide}
                onChange={(e) => setNewGuide(e.target.value)}
                placeholder="ⓘ 팝업 안내 문구 (선택)"
                className="flex-1 border border-gray-300 bg-white rounded-lg px-2.5 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={handleAddItem}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center gap-1 shrink-0"
              >
                <Plus size={14} /> 목록에 추가
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 카테고리 탭 */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveCat('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
            activeCat === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-gray-300 text-gray-700'
          }`}
        >
          전체 {items.length}
        </button>
        {CATEGORIES.map((c) => {
          const cnt = items.filter((i) => i.category === c).length
          return (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCat(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                activeCat === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700'
              }`}
            >
              {SMALL_CATEGORY_LABEL[c]} {cnt}
            </button>
          )
        })}
      </div>
      </div>

      {/* 물품 편집 목록 */}
      <div className="space-y-2">
        {filteredItems.map((it) => {
          const matchedStd = it.stdName ? stdMap.get(`${it.stdName}__${it.stdSpec || ''}`) : undefined
          const isCustom = it.id.startsWith('c_')
          return (
            <div
              key={it.id}
              className={`bg-white rounded-2xl border p-3 space-y-2 text-xs ${
                it.hidden ? 'border-gray-200 opacity-55 bg-gray-50' : 'border-gray-200'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <ItemIconByName
                  name={it.stdName || it.name}
                  spec={it.stdSpec !== undefined ? it.stdSpec : it.spec}
                  className="w-10 h-10 shrink-0 rounded-lg bg-gray-50 border border-gray-200 p-0.5"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 flex-1 min-w-[240px]">
                  <select
                    value={it.category}
                    onChange={(e) => updateField(it.id, { category: e.target.value as SmallCategory })}
                    className="border border-gray-300 rounded-lg px-2 py-1 font-bold"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{SMALL_CATEGORY_LABEL[c]}</option>
                    ))}
                  </select>
                  <input
                    value={it.name}
                    onChange={(e) => updateField(it.id, { name: e.target.value })}
                    placeholder="고객 표시 물품명"
                    className="border border-gray-300 rounded-lg px-2 py-1 font-black text-gray-900"
                  />
                  <input
                    value={it.spec}
                    onChange={(e) => updateField(it.id, { spec: e.target.value })}
                    placeholder="보조 규격 설명"
                    className="border border-gray-300 rounded-lg px-2 py-1"
                  />
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold truncate" title="물품정보 DB 동기화 기준">
                    <span>
                      DB: {it.stdName || '미연결'}
                      {it.stdSpec ? `/${it.stdSpec}` : ''}
                    </span>
                    <span className="ml-auto text-blue-600">{matchedStd ? matchedStd.defaultCbm : it.cbm}㎥</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-auto">
                  {it.stdSpec && (
                    <button
                      type="button"
                      onClick={() => updateField(it.id, { name: it.stdSpec || it.name, spec: '' })}
                      title="연결된 규격명을 표시 물품명으로 전환"
                      className="px-2 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100"
                    >
                      규격명표시
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => moveItem(it.id, -1)}
                    title="위로"
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(it.id, 1)}
                    title="아래로"
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField(it.id, { hidden: !it.hidden })}
                    title={it.hidden ? '고객 화면에 노출' : '고객 화면에서 숨김'}
                    className={`px-2 py-1 rounded-lg border font-bold flex items-center gap-1 ${
                      it.hidden ? 'bg-gray-200 text-gray-700 border-gray-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {it.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{it.hidden ? '숨김' : '노출'}</span>
                  </button>
                  {isCustom && (
                    <button
                      type="button"
                      onClick={() => removeCustomItem(it.id)}
                      title="추가 항목 삭제"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-1.5 pl-12">
                <input
                  value={it.size}
                  onChange={(e) => updateField(it.id, { size: e.target.value })}
                  placeholder="대략 크기 (예: 가로 60 × 높이 150cm)"
                  className="border border-gray-200 rounded-lg px-2 py-1 text-[11px]"
                />
                <input
                  value={it.guide}
                  onChange={(e) => updateField(it.id, { guide: e.target.value })}
                  placeholder="ⓘ 예시 팝업 설명"
                  className="sm:col-span-2 border border-gray-200 rounded-lg px-2 py-1 text-[11px]"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
