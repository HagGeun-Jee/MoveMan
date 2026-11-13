'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  createStandardItem,
  deleteStandardItem,
  getStandardItems,
  updateStandardItem,
  getLocationCategories,
  createLocationCategory,
  updateLocationCategoriesBulk,
  deleteLocationCategory,
  updateSpaceItemOrders,
} from '@/app/actions/item'
import {
  Trash2,
  Edit2,
  Check,
  X,
  Calculator,
  Copy,
  RotateCcw,
  Plus,
  MapPin,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  Search,
  Sparkles,
  Layers,
} from 'lucide-react'
import { matchesKoreanSearch } from '@/lib/itemFilterUtils'
import {
  getEffectiveSpaceItemOrders,
  getItemOrderInSpace,
  getOrderedItemNamesForSpace,
  sortCategoriesByDisplayOrder,
} from '@/lib/spaceOrderUtils'

function isBoxItemName(name?: string | null): boolean {
  const upper = (name || '').trim().toUpperCase()
  return upper === 'BOX' || upper.startsWith('BOX') || upper === '박스'
}

interface EditableCategoryRow {
  id: string
  name: string
  order: number
  isDefault: boolean
}

export default function ItemsPage() {
  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [savingOrderBusy, setSavingOrderBusy] = useState(false)

  // 메인 목록 필터 상태
  const [filterLocationId, setFilterLocationId] = useState<string>('all')
  const [filterName, setFilterName] = useState<string>('')

  // 1) 새 물품 등록 / 복사 / 수정 모달 상태
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [itemModalMode, setItemModalMode] = useState<'create' | 'copy' | 'edit'>('create')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [itemNameVal, setItemNameVal] = useState<string>('')
  const [itemSpecVal, setItemSpecVal] = useState<string>('')
  const [defaultCbmVal, setDefaultCbmVal] = useState<string>('')
  const [defaultInnerCbmVal, setDefaultInnerCbmVal] = useState<string>('0')
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])
  const [locationItemOrders, setLocationItemOrders] = useState<Record<string, string>>({})
  const [syncSameNameLocations, setSyncSameNameLocations] = useState<boolean>(true)
  const [copySourceInfo, setCopySourceInfo] = useState<string | null>(null)
  const [selectedCopySourceId, setSelectedCopySourceId] = useState<string>('')
  const [itemSubmitting, setItemSubmitting] = useState(false)

  // 2) 위치 카테고리 등록 · 순서 관리 모달 상태
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [newCatName, setNewCatName] = useState<string>('')
  const [newCatOrder, setNewCatOrder] = useState<string>('')
  const [newCatIsDefault, setNewCatIsDefault] = useState<boolean>(true)
  const [editableCategories, setEditableCategories] = useState<EditableCategoryRow[]>([])
  const [catSubmitting, setCatSubmitting] = useState(false)

  // 3) 공간별 물품 순서 설정 모달 상태
  const [isSpaceOrderModalOpen, setIsSpaceOrderModalOpen] = useState(false)
  const [spaceOrderCatId, setSpaceOrderCatId] = useState<string>('')
  const [spaceOrderedNames, setSpaceOrderedNames] = useState<string[]>([])
  const [spaceOrderDirty, setSpaceOrderDirty] = useState(false)
  const [addSpaceItemQuery, setAddSpaceItemQuery] = useState<string>('')
  const [addSpaceItemPosition, setAddSpaceItemPosition] = useState<string>('')
  const [applyAllBedrooms, setApplyAllBedrooms] = useState<boolean>(false)
  const [spaceOrderSubmitting, setSpaceOrderSubmitting] = useState(false)

  // 4) CBM 계산기 모달 상태
  const [isCbmCalculatorOpen, setIsCbmCalculatorOpen] = useState(false)
  const [cbmLength, setCbmLength] = useState<number | ''>('')
  const [cbmWidth, setCbmWidth] = useState<number | ''>('')
  const [cbmHeight, setCbmHeight] = useState<number | ''>('')
  const [copied, setCopied] = useState(false)

  // 메인 테이블 내 인라인 순서 입력 임시값 (catId__itemName -> 입력값)
  const [inlineOrderDrafts, setInlineOrderDrafts] = useState<Record<string, string>>({})

  const calculatedCbm =
    Number(cbmLength) > 0 && Number(cbmWidth) > 0 && Number(cbmHeight) > 0
      ? ((Number(cbmLength) * Number(cbmWidth) * Number(cbmHeight)) / 1000000).toFixed(3)
      : '0.000'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [itemsData, categoriesData] = await Promise.all([
      getStandardItems(),
      getLocationCategories(),
    ])
    const sortedCats = sortCategoriesByDisplayOrder(categoriesData)
    const sortedItems = [...itemsData].sort((a, b) => {
      const nameComp = (a.name || '').localeCompare(b.name || '', 'ko')
      if (nameComp !== 0) return nameComp
      return (a.spec || '').localeCompare(b.spec || '', 'ko')
    })
    setCategories(sortedCats)
    setItems(sortedItems)
    setInlineOrderDrafts({})
    setLoading(false)
    return { sortedCats, sortedItems }
  }

  // 각 공간별 현재 연결된 고유 일반 품목명 배열 맵 (디스플레이 순서 기준 정렬됨)
  const spaceOrderedNamesMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    categories.forEach(cat => {
      map[cat.id] = getOrderedItemNamesForSpace(cat, items, isBoxItemName)
    })
    return map
  }, [categories, items])

  // 품목명별 보유 규격 리스트 맵
  const specsByItemNameMap = useMemo(() => {
    const map: Record<string, any[]> = {}
    items.forEach(it => {
      if (!map[it.name]) map[it.name] = []
      map[it.name].push(it)
    })
    return map
  }, [items])

  // 전체 고유 일반 품목명 목록 (가나다순)
  const allUniqueNonBoxNames = useMemo(() => {
    return Array.from(
      new Set(
        items
          .map(i => (i.name || '').trim())
          .filter(n => Boolean(n) && !isBoxItemName(n))
      )
    ).sort((a, b) => a.localeCompare(b, 'ko'))
  }, [items])

  const unassignedCount = useMemo(
    () => items.filter(i => !i.locations || i.locations.length === 0).length,
    [items]
  )

  const activeCategoryObj = useMemo(
    () =>
      filterLocationId !== 'all' && filterLocationId !== 'none'
        ? categories.find(c => c.id === filterLocationId) || null
        : null,
    [categories, filterLocationId]
  )

  // 특정 품목명과 선택된 위치들에 대한 초기 순서값 계산 헬퍼
  const computeDefaultLocationOrders = (targetName: string, locIds: string[]) => {
    const cleanName = (targetName || '').trim()
    const nextOrders: Record<string, string> = {}
    locIds.forEach(catId => {
      const cat = categories.find(c => c.id === catId)
      if (!cat) return
      const existingList = spaceOrderedNamesMap[catId] || []
      const existingIdx = cleanName ? existingList.indexOf(cleanName) : -1
      if (existingIdx >= 0) {
        nextOrders[catId] = String(existingIdx + 1)
      } else {
        const eff = getEffectiveSpaceItemOrders(cat)
        if (cleanName && eff[cleanName]) {
          nextOrders[catId] = String(eff[cleanName])
        } else {
          nextOrders[catId] = String(existingList.length + 1)
        }
      }
    })
    return nextOrders
  }

  // 새 물품 등록 모달 열기
  const openCreateItemModal = (preselectCatId?: string) => {
    setItemModalMode('create')
    setEditingItemId(null)
    setItemNameVal('')
    setItemSpecVal('')
    setDefaultCbmVal('')
    setDefaultInnerCbmVal('0')
    setCopySourceInfo(null)
    setSelectedCopySourceId('')
    setSyncSameNameLocations(true)

    const initialLocs =
      preselectCatId && preselectCatId !== 'all' && preselectCatId !== 'none'
        ? [preselectCatId]
        : []
    setSelectedLocationIds(initialLocs)
    setLocationItemOrders(computeDefaultLocationOrders('', initialLocs))
    setIsItemModalOpen(true)
  }

  // 기존 물품 복사 등록 모달 열기
  const openCopyItemModal = (item: any) => {
    const locIds = item.locations ? item.locations.map((l: any) => l.id) : []
    setItemModalMode('copy')
    setEditingItemId(null)
    setItemNameVal(item.name || '')
    setItemSpecVal('')
    setDefaultCbmVal('')
    setDefaultInnerCbmVal('0')
    setSelectedLocationIds(locIds)
    setLocationItemOrders(computeDefaultLocationOrders(item.name || '', locIds))
    setSyncSameNameLocations(true)
    setCopySourceInfo(`${item.name}${item.spec ? ` (${item.spec})` : ''}`)
    setSelectedCopySourceId(item.id)
    setIsItemModalOpen(true)
  }

  // 물품 수정 모달 열기
  const openEditItemModal = (item: any) => {
    const locIds = item.locations ? item.locations.map((l: any) => l.id) : []
    setItemModalMode('edit')
    setEditingItemId(item.id)
    setItemNameVal(item.name || '')
    setItemSpecVal(item.spec || '')
    setDefaultCbmVal(String(item.defaultCbm ?? 0))
    setDefaultInnerCbmVal(String(item.defaultInnerCbm ?? 0))
    setSelectedLocationIds(locIds)
    setLocationItemOrders(computeDefaultLocationOrders(item.name || '', locIds))
    setSyncSameNameLocations(true)
    setCopySourceInfo(null)
    setSelectedCopySourceId('')
    setIsItemModalOpen(true)
  }

  // 모달 내 위치 체크박스 토글
  const handleToggleItemLocation = (catId: string) => {
    setSelectedLocationIds(prev => {
      const exists = prev.includes(catId)
      const next = exists ? prev.filter(id => id !== catId) : [...prev, catId]
      if (!exists) {
        const computed = computeDefaultLocationOrders(itemNameVal, [catId])
        setLocationItemOrders(prevOrders => ({
          ...prevOrders,
          [catId]: prevOrders[catId] || computed[catId] || '1',
        }))
      }
      return next
    })
  }

  // 새 물품 등록 / 수정 제출
  const handleSubmitItemModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemNameVal.trim()) {
      alert('품목명을 입력해주세요.')
      return
    }
    setItemSubmitting(true)
    try {
      const fd = new FormData()
      fd.set('name', itemNameVal.trim())
      fd.set('spec', itemSpecVal.trim())
      fd.set('defaultCbm', defaultCbmVal || '0')
      fd.set('defaultInnerCbm', defaultInnerCbmVal || '0')
      selectedLocationIds.forEach(id => fd.append('locationCategoryIds', id))

      const cleanOrderPayload: Record<string, number> = {}
      selectedLocationIds.forEach(id => {
        const num = parseInt(locationItemOrders[id] || '', 10)
        if (!isNaN(num) && num > 0) {
          cleanOrderPayload[id] = num
        }
      })
      fd.set('locationItemOrders', JSON.stringify(cleanOrderPayload))
      fd.set('syncSameNameLocations', syncSameNameLocations ? 'true' : 'false')

      const res =
        itemModalMode === 'edit' && editingItemId
          ? await updateStandardItem(editingItemId, fd)
          : await createStandardItem(fd)

      if (res?.error) {
        alert(res.error)
      } else {
        setIsItemModalOpen(false)
        await fetchData()
      }
    } finally {
      setItemSubmitting(false)
    }
  }

  const handleDeleteItem = async (item: any) => {
    if (
      !confirm(
        `'${item.name}${item.spec ? ` (${item.spec})` : ''}' 기준정보를 삭제하시겠습니까?`
      )
    ) {
      return
    }
    const res = await deleteStandardItem(item.id)
    if (res.error) {
      alert(res.error)
    } else {
      await fetchData()
    }
  }

  // 위치 카테고리 관리 모달 열기
  const openCategoryModal = () => {
    const rows: EditableCategoryRow[] = categories.map((c, idx) => ({
      id: c.id,
      name: c.name,
      order: typeof c.order === 'number' && c.order > 0 ? c.order : idx + 1,
      isDefault: c.isDefault !== false,
    }))
    setEditableCategories(rows)
    setNewCatName('')
    setNewCatOrder(String(rows.length + 1))
    setNewCatIsDefault(true)
    setIsCategoryModalOpen(true)
  }

  const handleMoveEditableCategory = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= editableCategories.length) return
    const next = [...editableCategories]
    const [moved] = next.splice(index, 1)
    next.splice(targetIdx, 0, moved)
    setEditableCategories(next.map((r, i) => ({ ...r, order: i + 1 })))
  }

  const handleJumpEditableCategoryToOrder = (index: number, targetOrderRaw: string) => {
    const parsed = parseInt(targetOrderRaw, 10)
    if (isNaN(parsed)) return
    const clampedIdx = Math.max(0, Math.min(editableCategories.length - 1, parsed - 1))
    if (clampedIdx === index) {
      setEditableCategories(prev => prev.map((r, i) => ({ ...r, order: i + 1 })))
      return
    }
    const next = [...editableCategories]
    const [moved] = next.splice(index, 1)
    next.splice(clampedIdx, 0, moved)
    setEditableCategories(next.map((r, i) => ({ ...r, order: i + 1 })))
  }

  const handleAddCategoryInModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    setCatSubmitting(true)
    try {
      const fd = new FormData()
      fd.set('name', newCatName.trim())
      fd.set('order', newCatOrder || String(categories.length + 1))
      fd.set('isDefault', newCatIsDefault ? 'true' : 'false')
      const res = await createLocationCategory(fd)
      if (res?.error) {
        alert(res.error)
      } else {
        const refreshed = await fetchData()
        const rows = refreshed.sortedCats.map((c: any, idx: number) => ({
          id: c.id,
          name: c.name,
          order: typeof c.order === 'number' && c.order > 0 ? c.order : idx + 1,
          isDefault: c.isDefault !== false,
        }))
        setEditableCategories(rows)
        setNewCatName('')
        setNewCatOrder(String(rows.length + 1))
      }
    } finally {
      setCatSubmitting(false)
    }
  }

  const handleSaveCategoriesBulk = async () => {
    setCatSubmitting(true)
    try {
      const res = await updateLocationCategoriesBulk(editableCategories)
      if (res?.error) {
        alert(res.error)
      } else {
        setIsCategoryModalOpen(false)
        await fetchData()
      }
    } finally {
      setCatSubmitting(false)
    }
  }

  const handleDeleteCategoryInModal = async (cat: EditableCategoryRow) => {
    if (
      !confirm(
        `정말 '${cat.name}' 위치 카테고리를 삭제하시겠습니까?\n(등록된 물품 자체는 삭제되지 않으며 위치 연결만 해제됩니다.)`
      )
    ) {
      return
    }
    setCatSubmitting(true)
    try {
      const res = await deleteLocationCategory(cat.id)
      if (res?.error) {
        alert(res.error)
      } else {
        if (filterLocationId === cat.id) {
          setFilterLocationId('all')
        }
        const refreshed = await fetchData()
        const rows = refreshed.sortedCats.map((c: any, idx: number) => ({
          id: c.id,
          name: c.name,
          order: typeof c.order === 'number' && c.order > 0 ? c.order : idx + 1,
          isDefault: c.isDefault !== false,
        }))
        setEditableCategories(rows)
        setNewCatOrder(String(rows.length + 1))
      }
    } finally {
      setCatSubmitting(false)
    }
  }

  // 공간별 물품 순서 모달 열기
  const openSpaceOrderModal = (targetCatId?: string) => {
    const resolvedId =
      targetCatId && categories.some(c => c.id === targetCatId)
        ? targetCatId
        : activeCategoryObj?.id || categories[0]?.id || ''
    if (!resolvedId) {
      alert('먼저 위치 카테고리를 등록해주세요.')
      return
    }
    setSpaceOrderCatId(resolvedId)
    setSpaceOrderedNames([...(spaceOrderedNamesMap[resolvedId] || [])])
    setSpaceOrderDirty(false)
    setAddSpaceItemQuery('')
    setAddSpaceItemPosition('')
    setApplyAllBedrooms(false)
    setIsSpaceOrderModalOpen(true)
  }

  const handleSwitchSpaceInOrderModal = (nextCatId: string) => {
    if (nextCatId === spaceOrderCatId) return
    if (spaceOrderDirty) {
      if (!confirm('현재 공간에서 변경한 물품 순서가 아직 저장되지 않았습니다. 저장하지 않고 다른 공간으로 이동할까요?')) {
        return
      }
    }
    setSpaceOrderCatId(nextCatId)
    setSpaceOrderedNames([...(spaceOrderedNamesMap[nextCatId] || [])])
    setSpaceOrderDirty(false)
    setAddSpaceItemQuery('')
    setAddSpaceItemPosition('')
    setApplyAllBedrooms(false)
  }

  const handleMoveSpaceItem = (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction
    if (targetIdx < 0 || targetIdx >= spaceOrderedNames.length) return
    const next = [...spaceOrderedNames]
    const [moved] = next.splice(idx, 1)
    next.splice(targetIdx, 0, moved)
    setSpaceOrderedNames(next)
    setSpaceOrderDirty(true)
  }

  const handleJumpSpaceItemToOrder = (idx: number, rawOrder: string) => {
    const num = parseInt(rawOrder, 10)
    if (isNaN(num)) return
    const clampedIdx = Math.max(0, Math.min(spaceOrderedNames.length - 1, num - 1))
    if (clampedIdx === idx) return
    const next = [...spaceOrderedNames]
    const [moved] = next.splice(idx, 1)
    next.splice(clampedIdx, 0, moved)
    setSpaceOrderedNames(next)
    setSpaceOrderDirty(true)
  }

  const handleAddItemNameToSpaceModal = (nameToAdd: string) => {
    if (!nameToAdd || spaceOrderedNames.includes(nameToAdd)) return
    const next = [...spaceOrderedNames]
    const posNum = parseInt(addSpaceItemPosition, 10)
    if (!isNaN(posNum) && posNum > 0) {
      const insertIdx = Math.max(0, Math.min(next.length, posNum - 1))
      next.splice(insertIdx, 0, nameToAdd)
    } else {
      next.push(nameToAdd)
    }
    setSpaceOrderedNames(next)
    setSpaceOrderDirty(true)
    setAddSpaceItemQuery('')
    setAddSpaceItemPosition('')
  }

  const handleRemoveItemNameFromSpaceModal = (nameToRemove: string) => {
    setSpaceOrderedNames(prev => prev.filter(n => n !== nameToRemove))
    setSpaceOrderDirty(true)
  }

  const handleSaveSpaceOrderModal = async () => {
    if (!spaceOrderCatId) return
    setSpaceOrderSubmitting(true)
    try {
      const bedroomCatIds = applyAllBedrooms
        ? categories
            .filter(c => ['안방', '입구방', '작은방1', '작은방2'].includes(c.name))
            .map(c => c.id)
        : []

      const res = await updateSpaceItemOrders({
        categoryId: spaceOrderCatId,
        orderedItemNames: spaceOrderedNames,
        alsoApplyToCategoryIds: bedroomCatIds,
      })
      if (res?.error) {
        alert(res.error)
      } else {
        setSpaceOrderDirty(false)
        setIsSpaceOrderModalOpen(false)
        await fetchData()
      }
    } finally {
      setSpaceOrderSubmitting(false)
    }
  }

  // 메인 테이블(특정 공간 탭 선택 시)에서 바로 품목 순서를 위/아래 또는 특정 번호로 변경
  const handleQuickChangeItemOrderInTab = async (
    catId: string,
    itemName: string,
    targetIndex: number
  ) => {
    const currentNames = [...(spaceOrderedNamesMap[catId] || [])]
    const fromIdx = currentNames.indexOf(itemName)
    if (fromIdx < 0) return
    const clampedIdx = Math.max(0, Math.min(currentNames.length - 1, targetIndex))
    if (fromIdx === clampedIdx) return

    const [moved] = currentNames.splice(fromIdx, 1)
    currentNames.splice(clampedIdx, 0, moved)

    setSavingOrderBusy(true)
    try {
      const res = await updateSpaceItemOrders({
        categoryId: catId,
        orderedItemNames: currentNames,
      })
      if (res?.error) {
        alert(res.error)
      } else {
        await fetchData()
      }
    } finally {
      setSavingOrderBusy(false)
    }
  }

  const handleApplyCbm = () => {
    if (calculatedCbm !== '0.000') {
      setDefaultCbmVal(calculatedCbm)
      setIsCbmCalculatorOpen(false)
      if (!isItemModalOpen) {
        setItemModalMode('create')
        setEditingItemId(null)
        const initialLocs = activeCategoryObj ? [activeCategoryObj.id] : []
        setSelectedLocationIds(initialLocs)
        setLocationItemOrders(computeDefaultLocationOrders('', initialLocs))
        setIsItemModalOpen(true)
      }
    }
  }

  const handleCopyCbm = () => {
    if (calculatedCbm !== '0.000') {
      navigator.clipboard.writeText(calculatedCbm)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  // 메인 테이블 표시 목록 정렬:
  // - 특정 위치 탭이 선택된 경우: 해당 공간의 디스플레이 순서(1..N) 우선 -> 품목명 -> 규격 순!
  // - 전체/미지정인 경우: 품목명 -> 규격 가나다순
  const filteredItems = useMemo(() => {
    const list = items.filter(item => {
      let locationMatch = true
      if (filterLocationId === 'none') {
        locationMatch = !item.locations || item.locations.length === 0
      } else if (filterLocationId !== 'all') {
        locationMatch = item.locations?.some((l: any) => l.id === filterLocationId)
      }

      let nameMatch = true
      if (filterName.trim() !== '') {
        const q = filterName.trim().toLowerCase()
        nameMatch =
          (item.name || '').toLowerCase().includes(q) ||
          (item.spec || '').toLowerCase().includes(q) ||
          matchesKoreanSearch(item.name || '', item.spec || '', filterName)
      }

      return locationMatch && nameMatch
    })

    return list.sort((a, b) => {
      if (activeCategoryObj) {
        const aBox = isBoxItemName(a.name)
        const bBox = isBoxItemName(b.name)
        if (aBox !== bBox) return aBox ? 1 : -1

        const orderA = getItemOrderInSpace(activeCategoryObj, a.name, 9999)
        const orderB = getItemOrderInSpace(activeCategoryObj, b.name, 9999)
        if (orderA !== orderB) return orderA - orderB
      }

      const nameComp = (a.name || '').localeCompare(b.name || '', 'ko')
      if (nameComp !== 0) return nameComp
      return (a.spec || '').localeCompare(b.spec || '', 'ko')
    })
  }, [items, filterLocationId, filterName, activeCategoryObj])

  // 동일 품목명이 여러 규격으로 나올 때 특정 공간 탭에서 첫 번째 규격 행인지 판별 (순서 조작 UI 중복 노출 방지)
  const firstRowIdByItemNameInActiveTab = useMemo(() => {
    const map: Record<string, string> = {}
    if (!activeCategoryObj) return map
    filteredItems.forEach(it => {
      if (!map[it.name]) {
        map[it.name] = it.id
      }
    })
    return map
  }, [filteredItems, activeCategoryObj])

  const currentSpaceModalCat = useMemo(
    () => categories.find(c => c.id === spaceOrderCatId) || null,
    [categories, spaceOrderCatId]
  )

  const isCurrentSpaceBedroom = Boolean(
    currentSpaceModalCat &&
      ['안방', '입구방', '작은방1', '작은방2'].includes(currentSpaceModalCat.name)
  )

  const availableNamesToAddInSpaceModal = useMemo(() => {
    const inSpaceSet = new Set(spaceOrderedNames)
    return allUniqueNonBoxNames.filter(n => {
      if (inSpaceSet.has(n)) return false
      if (!addSpaceItemQuery.trim()) return true
      const q = addSpaceItemQuery.trim().toLowerCase()
      return n.toLowerCase().includes(q) || matchesKoreanSearch(n, '', addSpaceItemQuery)
    })
  }, [allUniqueNonBoxNames, spaceOrderedNames, addSpaceItemQuery])

  const sameNameSiblingCount = useMemo(() => {
    const clean = itemNameVal.trim()
    if (!clean) return 0
    return items.filter(i => i.name === clean && i.id !== editingItemId).length
  }, [items, itemNameVal, editingItemId])

  return (
    <div className="space-y-4 max-w-7xl">
      {/* 상단 타이틀 & 팝업 액션 바 */}
      <div className="bg-white px-4 py-3.5 sm:px-5 sm:py-4 rounded-2xl shadow-xs border border-gray-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            물품 기준정보 관리
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            위치(공간) 디스플레이 순서와 공간별 초기 물품 순서를 지정하면 견적 작성 화면에 그대로 적용됩니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openCategoryModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 transition-colors shadow-2xs"
          >
            <MapPin size={16} className="text-blue-600" />
            <span>위치 카테고리 · 순서</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[11px] font-extrabold">
              {categories.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => openSpaceOrderModal()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs sm:text-sm font-bold rounded-xl border border-indigo-200 transition-colors shadow-2xs"
          >
            <ListOrdered size={16} className="text-indigo-600" />
            <span>공간별 물품 순서</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCbmCalculatorOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs sm:text-sm font-bold rounded-xl border border-sky-200 transition-colors shadow-2xs"
          >
            <Calculator size={16} className="text-sky-600" />
            <span>CBM 계산기</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateItemModal(filterLocationId)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold rounded-xl transition-all shadow-sm active:scale-95"
          >
            <Plus size={16} className="stroke-[2.5]" />
            <span>새 물품 등록</span>
          </button>
        </div>
      </div>

      {/* 위치(공간) 디스플레이 순서 탭 바 */}
      <div className="bg-white p-3 rounded-2xl shadow-xs border border-gray-200/80 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-gray-700">
            <Layers size={14} className="text-blue-600" />
            <span>공간별 보기 (견적 작성 공간 디스플레이 순서 기준)</span>
          </div>
          <button
            type="button"
            onClick={openCategoryModal}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
          >
            공간 순서 변경 · 추가 &rarr;
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilterLocationId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
              filterLocationId === 'all'
                ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            전체 물품 ({items.length})
          </button>

          {categories.map((cat, idx) => {
            const isSelected = filterLocationId === cat.id
            const itemCount = (spaceOrderedNamesMap[cat.id] || []).length
            const dispOrder = typeof cat.order === 'number' && cat.order > 0 ? cat.order : idx + 1
            const isExtraSpace = cat.isDefault === false
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterLocationId(cat.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : isExtraSpace
                    ? 'bg-amber-50/60 text-gray-700 border-amber-200 hover:bg-amber-50'
                    : 'bg-white text-gray-800 border-gray-200 hover:bg-blue-50/50 hover:border-blue-300'
                }`}
                title={
                  isExtraSpace
                    ? `${dispOrder}순위 · 견적 작성 시 [+ 공간 추가]로 선택 노출`
                    : `${dispOrder}순위 · 견적 작성 시 기본 공간 탭으로 자동 노출`
                }
              >
                <span
                  className={`px-1.5 py-0.2 rounded text-[11px] font-extrabold ${
                    isSelected
                      ? 'bg-white/25 text-white'
                      : 'bg-blue-50 text-blue-700 border border-blue-100'
                  }`}
                >
                  {dispOrder}
                </span>
                <span>{cat.name}</span>
                <span
                  className={`text-[11px] font-semibold ${
                    isSelected ? 'text-blue-100' : 'text-gray-400'
                  }`}
                >
                  ({itemCount})
                </span>
                {isExtraSpace && (
                  <span
                    className={`text-[10px] px-1 rounded font-bold ${
                      isSelected ? 'bg-amber-300 text-slate-900' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    +추가용
                  </span>
                )}
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setFilterLocationId('none')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
              filterLocationId === 'none'
                ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            위치 미지정 ({unassignedCount})
          </button>
        </div>
      </div>

      {/* 특정 공간 선택 시 공간별 초기 물품 & 순서 안내 배너 */}
      {activeCategoryObj && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50/70 to-white px-4 py-3 rounded-2xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start sm:items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-extrabold shrink-0">
              공간 #{activeCategoryObj.order} · {activeCategoryObj.name}
            </span>
            <div className="text-xs sm:text-sm text-blue-950 font-medium">
              <strong className="font-extrabold">
                초기 노출 품목 {(spaceOrderedNamesMap[activeCategoryObj.id] || []).length}종
              </strong>{' '}
              — 아래 <span className="underline font-bold">표시 순서(#1, #2...)</span> 그대로 견적 작성 화면의 [{activeCategoryObj.name}] 물품 리스트에 표시됩니다.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openSpaceOrderModal(activeCategoryObj.id)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1 shadow-2xs transition-colors"
            >
              <ListOrdered size={14} />
              <span>[{activeCategoryObj.name}] 물품 추가 · 순서 편집</span>
            </button>
            <button
              type="button"
              onClick={() => openCreateItemModal(activeCategoryObj.id)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 text-xs font-extrabold flex items-center gap-1 transition-colors"
            >
              <Plus size={14} />
              <span>새 물품 등록</span>
            </button>
          </div>
        </div>
      )}

      {/* 메인 등록 물품 목록 카드 (전체 폭 사용) */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
              {activeCategoryObj
                ? `[${activeCategoryObj.name}] 등록 물품 목록`
                : filterLocationId === 'none'
                ? '위치 미지정 물품 목록'
                : '전체 등록 물품 목록'}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-gray-200/80 text-gray-700 text-xs font-extrabold">
              {filteredItems.length}건
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="품목명 · 규격 · 초성 검색..."
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 pl-9 pr-8 py-1.5 text-sm outline-none focus:border-blue-500 bg-white"
              />
              {filterName && (
                <button
                  type="button"
                  onClick={() => setFilterName('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="검색어 지우기"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              value={filterLocationId}
              onChange={e => setFilterLocationId(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-500 bg-white cursor-pointer"
            >
              <option value="all">전체 위치 보기</option>
              {categories.map((cat, i) => (
                <option key={cat.id} value={cat.id}>
                  {cat.order || i + 1}. {cat.name}
                </option>
              ))}
              <option value="none">위치 미지정</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-gray-100/90 text-gray-800 text-xs sm:text-sm border-b border-gray-200">
                {activeCategoryObj ? (
                  <th className="py-3 px-4 font-extrabold w-40">
                    [{activeCategoryObj.name}] 표시 순서
                  </th>
                ) : (
                  <th className="py-3 px-4 font-extrabold">연결 위치 (공간별 순서)</th>
                )}
                <th className="py-3 px-4 font-extrabold">품목명</th>
                <th className="py-3 px-4 font-extrabold">규격</th>
                <th className="py-3 px-4 font-extrabold text-right">기본 CBM</th>
                <th className="py-3 px-4 font-extrabold text-right">내품 CBM</th>
                <th className="py-3 px-4 font-extrabold text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-500 text-sm">
                    기준정보를 불러오는 중입니다...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-500 text-sm space-y-2">
                    <div>해당 조건에 등록된 물품이 없습니다.</div>
                    {activeCategoryObj && (
                      <button
                        type="button"
                        onClick={() => openSpaceOrderModal(activeCategoryObj.id)}
                        className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold hover:bg-indigo-100"
                      >
                        <Plus size={14} />
                        <span>기존 기준물품을 [{activeCategoryObj.name}]에 연결하기</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isBox = isBoxItemName(item.name)
                  const activeSpaceNames = activeCategoryObj
                    ? spaceOrderedNamesMap[activeCategoryObj.id] || []
                    : []
                  const activeOrderIdx = activeCategoryObj
                    ? activeSpaceNames.indexOf(item.name)
                    : -1
                  const activeOrderNum =
                    activeOrderIdx >= 0
                      ? activeOrderIdx + 1
                      : activeCategoryObj
                      ? getItemOrderInSpace(activeCategoryObj, item.name, 999)
                      : 0
                  const isPrimaryRowForName =
                    activeCategoryObj && firstRowIdByItemNameInActiveTab[item.name] === item.id
                  const draftKey = activeCategoryObj
                    ? `${activeCategoryObj.id}__${item.name}`
                    : ''

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-blue-50/30 transition-colors"
                    >
                      {activeCategoryObj ? (
                        <td className="py-3 px-4 align-middle">
                          {isBox ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                              하단 고정 박스바
                            </span>
                          ) : isPrimaryRowForName && activeOrderIdx >= 0 ? (
                            <div className="inline-flex items-center gap-1">
                              <span className="text-xs font-bold text-gray-400">#</span>
                              <input
                                type="number"
                                min={1}
                                max={Math.max(1, activeSpaceNames.length)}
                                disabled={savingOrderBusy}
                                value={
                                  inlineOrderDrafts[draftKey] !== undefined
                                    ? inlineOrderDrafts[draftKey]
                                    : String(activeOrderNum)
                                }
                                onChange={e =>
                                  setInlineOrderDrafts(prev => ({
                                    ...prev,
                                    [draftKey]: e.target.value,
                                  }))
                                }
                                onBlur={e => {
                                  const num = parseInt(e.target.value, 10)
                                  setInlineOrderDrafts(prev => {
                                    const copy = { ...prev }
                                    delete copy[draftKey]
                                    return copy
                                  })
                                  if (!isNaN(num) && num > 0 && num !== activeOrderNum) {
                                    handleQuickChangeItemOrderInTab(
                                      activeCategoryObj.id,
                                      item.name,
                                      num - 1
                                    )
                                  }
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    ;(e.target as HTMLInputElement).blur()
                                  }
                                }}
                                className="w-12 rounded-lg border border-blue-300 bg-blue-50/60 px-1.5 py-1 text-center text-xs font-extrabold text-blue-900 outline-none focus:border-blue-600 focus:bg-white"
                                title="숫자를 입력하고 Enter 또는 포커스 이동 시 해당 순서로 즉시 이동합니다"
                              />
                              <div className="flex items-center">
                                <button
                                  type="button"
                                  disabled={savingOrderBusy || activeOrderIdx <= 0}
                                  onClick={() =>
                                    handleQuickChangeItemOrderInTab(
                                      activeCategoryObj.id,
                                      item.name,
                                      activeOrderIdx - 1
                                    )
                                  }
                                  className="p-1 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                                  title="순서 한 칸 위로"
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    savingOrderBusy ||
                                    activeOrderIdx >= activeSpaceNames.length - 1
                                  }
                                  onClick={() =>
                                    handleQuickChangeItemOrderInTab(
                                      activeCategoryObj.id,
                                      item.name,
                                      activeOrderIdx + 1
                                    )
                                  }
                                  className="p-1 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                                  title="순서 한 칸 아래로"
                                >
                                  <ArrowDown size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-xs font-semibold">
                              ↳ #{activeOrderNum} 동일품목 규격
                            </span>
                          )}
                        </td>
                      ) : (
                        <td className="py-3 px-4 text-sm">
                          {item.locations && item.locations.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {sortCategoriesByDisplayOrder(item.locations).map((l: any) => {
                                const fullCat = categories.find(c => c.id === l.id) || l
                                const itemOrd = isBox
                                  ? null
                                  : getItemOrderInSpace(fullCat, item.name, 0)
                                return (
                                  <button
                                    key={l.id}
                                    type="button"
                                    onClick={() => setFilterLocationId(l.id)}
                                    className="inline-flex items-center gap-1 bg-slate-100 hover:bg-blue-50 hover:border-blue-300 px-2 py-0.5 rounded-full text-xs border border-slate-200 text-slate-700 hover:text-blue-800 transition-colors"
                                    title={`${fullCat.name} 탭으로 필터링`}
                                  >
                                    <span className="font-semibold">{fullCat.name}</span>
                                    {itemOrd && itemOrd > 0 ? (
                                      <span className="text-[10px] font-extrabold text-blue-600">
                                        #{itemOrd}
                                      </span>
                                    ) : null}
                                  </button>
                                )
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">미지정</span>
                          )}
                        </td>
                      )}

                      <td className="py-3 px-4 font-bold text-gray-900 text-sm">{item.name}</td>
                      <td className="py-3 px-4 text-gray-700 font-medium text-sm">
                        {item.spec || <span className="text-gray-400">기본</span>}
                      </td>
                      <td className="py-3 px-4 text-right text-blue-700 font-extrabold text-sm">
                        {item.defaultCbm}
                      </td>
                      <td className="py-3 px-4 text-right text-amber-700 font-bold text-sm">
                        {item.defaultInnerCbm > 0 ? `+${item.defaultInnerCbm}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex justify-end items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openCopyItemModal(item)}
                            title="이 물품을 기초로 다른 규격 복사 등록"
                            className="text-indigo-600 hover:bg-indigo-50 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                          >
                            <Copy size={14} />
                            <span className="hidden sm:inline">복사</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditItemModal(item)}
                            title="수정 (위치 및 표시 순서 포함)"
                            className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                          >
                            <Edit2 size={14} />
                            <span className="hidden sm:inline">수정</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            title="삭제"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 모달 1: 새 물품 등록 / 복사 등록 / 물품 수정 팝업                        */}
      {/* ===================================================================== */}
      {isItemModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-3 sm:p-4"
          onClick={() => setIsItemModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-300" />
                <h3 className="font-extrabold text-base sm:text-lg">
                  {itemModalMode === 'edit'
                    ? '물품 기준정보 수정'
                    : itemModalMode === 'copy'
                    ? '기존 물품 복사 등록'
                    : '새 물품 등록'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* 바디 */}
            <form
              onSubmit={handleSubmitItemModal}
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4"
            >
              {/* 신규/복사 모드일 때 기존 물품 기초 복사 불러오기 드롭다운 */}
              {itemModalMode !== 'edit' && (
                <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-indigo-950 flex items-center gap-1">
                      <Copy size={13} className="text-indigo-600" />
                      <span>기존 물품 기초로 복사 불러오기 (선택)</span>
                    </label>
                    {copySourceInfo && (
                      <button
                        type="button"
                        onClick={() => openCreateItemModal(filterLocationId)}
                        className="text-xs font-bold text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
                      >
                        <RotateCcw size={12} />
                        <span>입력 초기화</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedCopySourceId}
                    onChange={e => {
                      const target = items.find(it => it.id === e.target.value)
                      if (target) openCopyItemModal(target)
                    }}
                    className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs sm:text-sm text-gray-800 outline-none focus:border-indigo-500 cursor-pointer font-medium"
                  >
                    <option value="">직접 새로 입력하거나 복사할 물품을 선택하세요...</option>
                    {items.map(it => (
                      <option key={it.id} value={it.id}>
                        {it.name}
                        {it.spec ? ` (${it.spec})` : ''} — [위치:{' '}
                        {it.locations?.map((l: any) => l.name).join(', ') || '미지정'}]
                      </option>
                    ))}
                  </select>
                  {copySourceInfo && (
                    <div className="text-xs text-blue-700 font-bold flex items-center gap-1 pt-0.5">
                      <Check size={13} className="stroke-[3]" />
                      <span>
                        복사 기준: {copySourceInfo} (위치와 공간별 표시 순서는 유지되며 규격·CBM만 새로 입력합니다)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 품목명 & 규격 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-1">
                    품목명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={itemNameVal}
                    onChange={e => {
                      const v = e.target.value
                      setItemNameVal(v)
                      if (selectedLocationIds.length > 0) {
                        setLocationItemOrders(computeDefaultLocationOrders(v, selectedLocationIds))
                      }
                    }}
                    placeholder="예: 장농, 침대, 소파 테이블"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-bold text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-1">
                    규격 (선택)
                  </label>
                  <input
                    type="text"
                    value={itemSpecVal}
                    onChange={e => setItemSpecVal(e.target.value)}
                    placeholder="예: 10자, 퀸(Q), 4인용"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 기본 CBM & 내품 CBM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs sm:text-sm font-bold text-gray-800">
                      기본 CBM <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCbmCalculatorOpen(true)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-md hover:bg-blue-100 border border-blue-200"
                    >
                      <Calculator size={12} />
                      <span>CBM 계산기</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={defaultCbmVal}
                    onChange={e => setDefaultCbmVal(e.target.value)}
                    placeholder="예: 1.5"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-extrabold text-blue-900 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-1">
                    내품 CBM (선택 - 장농·수납장 내부 짐)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={defaultInnerCbmVal}
                    onChange={e => setDefaultInnerCbmVal(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-semibold text-amber-900 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 노출 위치 다중 선택 & 공간별 표시 순서 지정 */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs sm:text-sm font-extrabold text-gray-800 flex items-center gap-1.5">
                    <MapPin size={15} className="text-blue-600" />
                    <span>노출 위치 선택 및 공간별 디스플레이 순서 지정</span>
                  </label>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    {selectedLocationIds.length}개 공간 선택됨
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  체크한 공간의 초기 물품 리스트에 표시되며, 우측 숫자(#)로 해당 공간 내 표시 순서를 바로 지정할 수 있습니다.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-2.5 bg-gray-50/60">
                  {categories.map((cat, idx) => {
                    const isChecked = selectedLocationIds.includes(cat.id)
                    const currentTotal = (spaceOrderedNamesMap[cat.id] || []).length
                    return (
                      <div
                        key={cat.id}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-all ${
                          isChecked
                            ? 'bg-blue-50/90 border-blue-400 shadow-2xs'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleItemLocation(cat.id)}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0"
                          />
                          <span className="text-[11px] font-extrabold text-blue-600 bg-blue-100/70 px-1.5 py-0.2 rounded shrink-0">
                            {cat.order || idx + 1}
                          </span>
                          <span
                            className={`text-xs sm:text-sm truncate ${
                              isChecked ? 'font-extrabold text-blue-950' : 'font-medium text-gray-700'
                            }`}
                          >
                            {cat.name}
                          </span>
                        </label>

                        {isChecked && !isBoxItemName(itemNameVal) && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[11px] font-bold text-blue-700">순서#</span>
                            <input
                              type="number"
                              min={1}
                              max={Math.max(1, currentTotal + 1)}
                              value={locationItemOrders[cat.id] ?? ''}
                              onChange={e =>
                                setLocationItemOrders(prev => ({
                                  ...prev,
                                  [cat.id]: e.target.value,
                                }))
                              }
                              className="w-14 rounded-lg border border-blue-300 bg-white px-2 py-1 text-xs font-extrabold text-center text-blue-900 outline-none focus:border-blue-600"
                              title={`${cat.name} 내 표시 순서 (1 ~ ${currentTotal + 1})`}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* 동일 품목명 다중 규격 위치 동기화 옵션 */}
                {sameNameSiblingCount > 0 && (
                  <label className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncSameNameLocations}
                      onChange={e => setSyncSameNameLocations(e.target.checked)}
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4 shrink-0"
                    />
                    <span className="text-xs text-amber-950 font-medium leading-relaxed">
                      동일 품목명(<strong className="font-extrabold">&lsquo;{itemNameVal.trim()}&rsquo;</strong> 외{' '}
                      {sameNameSiblingCount}개 규격) 전체에 동일한 노출 위치 및 표시 순서를 함께 적용합니다.
                    </span>
                  </label>
                )}
              </div>

              {/* 푸터 액션 */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-bold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={itemSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs sm:text-sm font-extrabold shadow-sm transition-colors"
                >
                  {itemSubmitting
                    ? '저장 중...'
                    : itemModalMode === 'edit'
                    ? '수정사항 저장'
                    : itemModalMode === 'copy'
                    ? '복사 정보로 새 물품 등록'
                    : '새 물품 등록하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 모달 2: 위치 카테고리 등록 · 디스플레이 순서 관리 팝업                  */}
      {/* ===================================================================== */}
      {isCategoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-3 sm:p-4"
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-sky-400" />
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">
                    위치 카테고리 등록 · 디스플레이 순서 관리
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    여기서 지정한 공간 순서대로 견적 작성 화면의 공간 탭과 상세 내역이 배치됩니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* 신규 위치 카테고리 추가 폼 */}
              <form
                onSubmit={handleAddCategoryInModal}
                className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2.5"
              >
                <div className="text-xs font-extrabold text-blue-900 flex items-center gap-1">
                  <Plus size={14} className="text-blue-600 stroke-[2.5]" />
                  <span>새 위치(공간) 카테고리 등록</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="새 공간명 (예: 다용도실, 창고)"
                    className="flex-1 min-w-[150px] rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs sm:text-sm font-bold text-gray-900 outline-none focus:border-blue-600"
                  />
                  <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-xl border border-blue-200">
                    <span className="text-xs font-bold text-gray-600">표시순서</span>
                    <input
                      type="number"
                      min={1}
                      max={editableCategories.length + 1}
                      value={newCatOrder}
                      onChange={e => setNewCatOrder(e.target.value)}
                      className="w-12 text-center text-xs sm:text-sm font-extrabold text-blue-700 outline-none"
                    />
                  </div>
                  <label className="inline-flex items-center gap-1.5 bg-white px-2.5 py-2 rounded-xl border border-blue-200 text-xs font-bold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCatIsDefault}
                      onChange={e => setNewCatIsDefault(e.target.checked)}
                      className="rounded text-blue-600 w-3.5 h-3.5"
                    />
                    <span>견적 기본탭 노출</span>
                  </label>
                  <button
                    type="submit"
                    disabled={catSubmitting || !newCatName.trim()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs sm:text-sm font-extrabold transition-colors"
                  >
                    + 추가
                  </button>
                </div>
              </form>

              {/* 기존 위치 순서 편집 리스트 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                  <span className="font-bold text-gray-700">
                    등록된 위치 목록 ({editableCategories.length}개) — 숫자를 바꾸거나 ▲/▼ 버튼으로 순서를 조정하세요
                  </span>
                  <span>기본탭 ON = 신규 견적 시 자동 표시</span>
                </div>

                <div className="space-y-1.5">
                  {editableCategories.map((row, idx) => {
                    const count = (spaceOrderedNamesMap[row.id] || []).length
                    return (
                      <div
                        key={row.id}
                        className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-2.5 rounded-xl border border-gray-200 bg-white hover:border-blue-300 transition-colors"
                      >
                        {/* 순서 번호 입력 + 위/아래 버튼 */}
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            min={1}
                            max={editableCategories.length}
                            value={row.order}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10)
                              setEditableCategories(prev =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, order: isNaN(val) ? r.order : val } : r
                                )
                              )
                            }}
                            onBlur={e => handleJumpEditableCategoryToOrder(idx, e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleJumpEditableCategoryToOrder(
                                  idx,
                                  (e.target as HTMLInputElement).value
                                )
                              }
                            }}
                            className="w-12 rounded-lg border border-gray-300 bg-gray-50 px-1.5 py-1 text-center text-xs sm:text-sm font-extrabold text-blue-700 outline-none focus:border-blue-500 focus:bg-white"
                          />
                          <div className="flex flex-col">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveEditableCategory(idx, -1)}
                              className="p-0.5 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-25"
                              title="위로 이동"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === editableCategories.length - 1}
                              onClick={() => handleMoveEditableCategory(idx, 1)}
                              className="p-0.5 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-25"
                              title="아래로 이동"
                            >
                              <ArrowDown size={13} />
                            </button>
                          </div>
                        </div>

                        {/* 위치명 인라인 수정 */}
                        <input
                          type="text"
                          value={row.name}
                          onChange={e =>
                            setEditableCategories(prev =>
                              prev.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r))
                            )
                          }
                          className="flex-1 min-w-[110px] rounded-lg border border-gray-200 focus:border-blue-500 px-2.5 py-1.5 text-xs sm:text-sm font-bold text-gray-900 outline-none"
                        />

                        {/* 우측 옵션: 물품순서 바로가기 + 기본노출 토글 + 삭제 */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCategoryModalOpen(false)
                              openSpaceOrderModal(row.id)
                            }}
                            className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-extrabold whitespace-nowrap"
                            title={`${row.name}의 물품 리스트 및 순서 설정`}
                          >
                            물품 {count}종 순서 &rarr;
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setEditableCategories(prev =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, isDefault: !r.isDefault } : r
                                )
                              )
                            }
                            className={`px-2 py-1 rounded-lg text-[11px] font-extrabold border whitespace-nowrap transition-colors ${
                              row.isDefault
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                            title={
                              row.isDefault
                                ? '신규 견적 작성 시 기본 탭으로 자동 노출됩니다'
                                : '신규 견적 작성 시 [+ 공간 추가] 목록에 대기합니다 (드레스룸, 서재 등)'
                            }
                          >
                            {row.isDefault ? '기본탭 ON' : '+공간추가용'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCategoryInModal(row)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                            title="위치 카테고리 삭제"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 푸터 */}
            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs sm:text-sm font-bold"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={catSubmitting}
                onClick={handleSaveCategoriesBulk}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs sm:text-sm font-extrabold shadow-sm transition-colors"
              >
                {catSubmitting ? '저장 중...' : '위치 순서 및 설정 저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 모달 3: 공간별 물품 리스트 · 디스플레이 순서 설정 팝업                  */}
      {/* ===================================================================== */}
      {isSpaceOrderModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-3 sm:p-4"
          onClick={() => setIsSpaceOrderModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[92vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex flex-col gap-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListOrdered size={19} className="text-amber-300" />
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg">
                      공간별 초기 물품 · 디스플레이 순서 설정
                    </h3>
                    <p className="text-[11px] text-indigo-100">
                      선택한 공간에 표시될 물품과 순서(1, 2, 3...)를 지정하면 견적 작성 시 동일하게 나열됩니다.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSpaceOrderModalOpen(false)}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 공간 선택 탭 */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {categories.map((cat, idx) => {
                  const isCurrent = cat.id === spaceOrderCatId
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSwitchSpaceInOrderModal(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold whitespace-nowrap transition-all shrink-0 ${
                        isCurrent
                          ? 'bg-amber-300 text-slate-950 shadow-xs ring-2 ring-white'
                          : 'bg-white/15 text-white hover:bg-white/25'
                      }`}
                    >
                      {cat.order || idx + 1}. {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 바디 */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* 이 공간에 기존 기준물품 추가 바 */}
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1">
                    <Plus size={14} className="text-indigo-600 stroke-[2.5]" />
                    <span>
                      [{currentSpaceModalCat?.name}] 초기 물품 리스트에 기준물품 추가하기
                    </span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-indigo-800">삽입 순서(선택):</span>
                    <input
                      type="number"
                      min={1}
                      max={spaceOrderedNames.length + 1}
                      value={addSpaceItemPosition}
                      onChange={e => setAddSpaceItemPosition(e.target.value)}
                      placeholder={`${spaceOrderedNames.length + 1}`}
                      className="w-14 rounded-lg border border-indigo-300 bg-white px-2 py-0.5 text-center text-xs font-extrabold text-indigo-900 outline-none"
                    />
                  </div>
                </div>

                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={addSpaceItemQuery}
                    onChange={e => setAddSpaceItemQuery(e.target.value)}
                    placeholder="추가할 품목명 검색 (예: 안마의자, 전신거울, 피아노...)"
                    className="w-full rounded-xl border border-indigo-200 bg-white pl-8 pr-8 py-1.5 text-xs sm:text-sm outline-none focus:border-indigo-500"
                  />
                  {addSpaceItemQuery && (
                    <button
                      type="button"
                      onClick={() => setAddSpaceItemQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {availableNamesToAddInSpaceModal.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-0.5">
                    {availableNamesToAddInSpaceModal.map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleAddItemNameToSpaceModal(name)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-600 text-gray-800 hover:text-white border border-indigo-200 text-xs font-bold transition-colors shadow-2xs"
                      >
                        <Plus size={12} />
                        <span>{name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    {allUniqueNonBoxNames.length === spaceOrderedNames.length
                      ? '모든 기준 품목이 이미 이 공간에 포함되어 있습니다.'
                      : '검색어와 일치하는 미포함 품목이 없습니다.'}
                  </p>
                )}
              </div>

              {/* 현재 공간 물품 순서 리스트 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs sm:text-sm font-extrabold text-gray-800">
                    [{currentSpaceModalCat?.name}] 디스플레이 순서 ({spaceOrderedNames.length}종)
                  </span>
                  <span className="text-xs text-gray-500">
                    순서 번호 입력 후 Enter 또는 ▲/▼ 클릭
                  </span>
                </div>

                {spaceOrderedNames.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-gray-300 text-gray-500 text-sm">
                    이 공간에 지정된 초기 물품이 없습니다. 위에서 품목을 클릭해 추가해주세요.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {spaceOrderedNames.map((itemName, idx) => {
                      const specs = specsByItemNameMap[itemName] || []
                      const specSummary = specs
                        .map(s => s.spec || '기본')
                        .slice(0, 4)
                        .join(', ')
                      return (
                        <div
                          key={`${spaceOrderCatId}_${itemName}`}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 shadow-2xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="number"
                              min={1}
                              max={spaceOrderedNames.length}
                              defaultValue={idx + 1}
                              key={`${spaceOrderCatId}_${itemName}_${idx}`}
                              onBlur={e => handleJumpSpaceItemToOrder(idx, e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleJumpSpaceItemToOrder(
                                    idx,
                                    (e.target as HTMLInputElement).value
                                  )
                                }
                              }}
                              className="w-11 rounded-lg border border-indigo-300 bg-indigo-50/70 px-1 py-1 text-center text-xs font-extrabold text-indigo-900 outline-none focus:bg-white focus:border-indigo-600 shrink-0"
                              title="원하는 순서 번호 입력"
                            />
                            <div className="min-w-0">
                              <div className="font-extrabold text-gray-900 text-xs sm:text-sm truncate">
                                {itemName}
                              </div>
                              <div className="text-[11px] text-gray-400 truncate">
                                {specs.length > 0
                                  ? `규격 ${specs.length}종 (${specSummary}${specs.length > 4 ? '…' : ''})`
                                  : '등록 규격 없음'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveSpaceItem(idx, -1)}
                              className="p-1 rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-25"
                              title="앞 순서로 이동"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === spaceOrderedNames.length - 1}
                              onClick={() => handleMoveSpaceItem(idx, 1)}
                              className="p-1 rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-25"
                              title="뒤 순서로 이동"
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveItemNameFromSpaceModal(itemName)}
                              className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 ml-0.5"
                              title={`${currentSpaceModalCat?.name} 초기 물품에서 제외`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 침실 4종 일괄 적용 옵션 */}
              {isCurrentSpaceBedroom && (
                <label className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyAllBedrooms}
                    onChange={e => setApplyAllBedrooms(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 shrink-0"
                  />
                  <span className="text-xs sm:text-sm font-bold text-amber-950">
                    안방 · 입구방 · 작은방1 · 작은방2 전체에 동일한 물품 리스트와 순서로 한 번에 적용하기
                  </span>
                </label>
              )}
            </div>

            {/* 푸터 */}
            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs text-gray-500">
                * 공간에서 제외(X)해도 마스터 물품 자체는 삭제되지 않습니다.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSpaceOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs sm:text-sm font-bold"
                >
                  닫기
                </button>
                <button
                  type="button"
                  disabled={spaceOrderSubmitting}
                  onClick={handleSaveSpaceOrderModal}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs sm:text-sm font-extrabold shadow-sm transition-colors"
                >
                  {spaceOrderSubmitting
                    ? '저장 중...'
                    : `[${currentSpaceModalCat?.name || ''}] 물품 순서 저장 (${spaceOrderedNames.length}종)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 모달 4: CBM 계산기 팝업 (z-[70]으로 물품 팝업 위에서도 동작)           */}
      {/* ===================================================================== */}
      {isCbmCalculatorOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsCbmCalculatorOpen(false)}
        >
          <div
            className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200"
            onClick={e => e.stopPropagation()}
          >
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
                  className="bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-bold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isItemModalOpen ? '물품 CBM에 적용' : '새 물품에 적용'}
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
