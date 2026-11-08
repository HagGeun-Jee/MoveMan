'use client'

import React, { useState, useMemo } from 'react'
import { ensureItemUid, getItemEffectiveCbm, isBoxItem } from './EstimateForm'
import { Check, ArrowDown, X, RotateCcw, Plus, Sparkles } from 'lucide-react'

interface PaperSheetCbmPanelProps {
  categories: { id: string; name: string }[]
  allCategories: { id: string; name: string }[]
  onActivateCategory?: (catId: string) => void
  items: any[]
  setItems: React.Dispatch<React.SetStateAction<any[]>>
  standardItems: any[]
}

type PenMode = 'MOVE' | 'DOWN' | 'DISPOSE' | 'WAYPOINT' | 'ERASE'

interface SubOptionDef {
  label: string
  spec: string
  cbm: number
  innerBoxCbm?: number
}

interface PaperRowDef {
  id: string
  displayTitle: string
  matchNames: string[] // 시스템 표준품목 매칭용 이름 후보 (첫 번째가 기본 저장 품목명)
  defaultSpec: string
  defaultCbm: number
  defaultInnerCbm?: number
  options?: SubOptionDef[]
  bedSizeBadges?: string[] // 침대 등 Q/K/S 뱃지 지원
}

// 좌측 1블록: 안방 | 방1 | 방2 | 방3 | 방4 공통 행 정의 (종이양식 100% 동일 순서)
const ROOM_MATRIX_ROWS: PaperRowDef[] = [
  {
    id: 'wardrobe',
    displayTitle: '장롱',
    matchNames: ['장농', '장롱'],
    defaultSpec: '1통',
    defaultCbm: 1.4,
    defaultInnerCbm: 0.7,
    options: [
      { label: '반분해', spec: '반분해(1통)', cbm: 1.4, innerBoxCbm: 0.7 },
      { label: '올분해', spec: '올분해(1통)', cbm: 1.5, innerBoxCbm: 0.7 },
    ],
  },
  {
    id: 'hanger',
    displayTitle: '행거',
    matchNames: ['행거', '시스템행거'],
    defaultSpec: '일반',
    defaultCbm: 0.4,
    defaultInnerCbm: 0.6,
    options: [
      { label: '시스템', spec: '시스템(1칸)', cbm: 0.6, innerBoxCbm: 0.8 },
      { label: '장', spec: '장행거', cbm: 0.8, innerBoxCbm: 0.7 },
      { label: '스탠드', spec: '스탠드', cbm: 0.3, innerBoxCbm: 0.4 },
      { label: '일반', spec: '일반', cbm: 0.4, innerBoxCbm: 0.6 },
    ],
  },
  {
    id: 'bed',
    displayTitle: '침대',
    matchNames: ['침대', '돌침대', '흙침대'],
    defaultSpec: 'Q/K',
    defaultCbm: 1.8,
    defaultInnerCbm: 0,
    options: [
      { label: '흙', spec: '흙침대', cbm: 2.2, innerBoxCbm: 0 },
      { label: '돌', spec: '돌침대', cbm: 2.2, innerBoxCbm: 0 },
      { label: '일반', spec: 'Q/K', cbm: 1.8, innerBoxCbm: 0 },
    ],
    bedSizeBadges: ['Q', 'K', 'S'],
  },
  {
    id: 'cabinet',
    displayTitle: '장식장',
    matchNames: ['장식장', '유리장식장'],
    defaultSpec: '일반',
    defaultCbm: 1.0,
    defaultInnerCbm: 0.3,
  },
  {
    id: 'drawer',
    displayTitle: '서랍장',
    matchNames: ['서랍장'],
    defaultSpec: '5단 800',
    defaultCbm: 0.5,
    defaultInnerCbm: 0.5,
  },
  {
    id: 'tv',
    displayTitle: 'TV',
    matchNames: ['TV'],
    defaultSpec: '벽걸이',
    defaultCbm: 0.45,
    defaultInnerCbm: 0,
    options: [{ label: '벽걸이', spec: '벽걸이', cbm: 0.45, innerBoxCbm: 0 }],
  },
  {
    id: 'tv_stand',
    displayTitle: 'TV받침',
    matchNames: ['거실장', 'TV받침', '문갑'],
    defaultSpec: '문갑',
    defaultCbm: 0.8,
    defaultInnerCbm: 0.2,
    options: [
      { label: '문갑', spec: '문갑', cbm: 0.8, innerBoxCbm: 0.2 },
      { label: '드레스', spec: '드레스', cbm: 1.0, innerBoxCbm: 0.3 },
    ],
  },
  {
    id: 'vanity',
    displayTitle: '화장대',
    matchNames: ['화장대'],
    defaultSpec: '서랍형',
    defaultCbm: 0.8,
    defaultInnerCbm: 0.25,
    options: [
      { label: '서랍', spec: '서랍형', cbm: 0.9, innerBoxCbm: 0.25 },
      { label: '콘솔', spec: '콘솔형', cbm: 0.7, innerBoxCbm: 0.2 },
    ],
  },
  {
    id: 'pc',
    displayTitle: '컴퓨터',
    matchNames: ['컴퓨터', 'PC'],
    defaultSpec: 'LCD/세트',
    defaultCbm: 0.25,
    defaultInnerCbm: 0.1,
    options: [{ label: 'LCD', spec: 'LCD/세트', cbm: 0.25, innerBoxCbm: 0.1 }],
  },
  {
    id: 'desk',
    displayTitle: '책상',
    matchNames: ['책상'],
    defaultSpec: '책상+의자',
    defaultCbm: 1.2,
    defaultInnerCbm: 0.2,
    options: [
      { label: '퍼즐', spec: '퍼즐책상', cbm: 1.4, innerBoxCbm: 0.2 },
      { label: '의자', spec: '책상+의자', cbm: 1.2, innerBoxCbm: 0.2 },
    ],
  },
  {
    id: 'bookshelf',
    displayTitle: '책장',
    matchNames: ['책장'],
    defaultSpec: '2x5단',
    defaultCbm: 0.5,
    defaultInnerCbm: 0.5,
  },
  {
    id: 'ac',
    displayTitle: '에어컨',
    matchNames: ['에어컨'],
    defaultSpec: '벽걸이',
    defaultCbm: 0.6,
    defaultInnerCbm: 0,
    options: [
      { label: '슬림', spec: '스탠드/슬림', cbm: 1.1, innerBoxCbm: 0 },
      { label: '벽걸이', spec: '벽걸이', cbm: 0.5, innerBoxCbm: 0 },
    ],
  },
  {
    id: 'angle',
    displayTitle: '앵글/기타',
    matchNames: ['앵글', '선반'],
    defaultSpec: '철제앵글',
    defaultCbm: 0.5,
    defaultInnerCbm: 0.5,
  },
]

// 2블록: 거실 행 정의
const LIVING_ROWS: PaperRowDef[] = [
  {
    id: 'liv_sofa',
    displayTitle: '쇼파',
    matchNames: ['소파', '쇼파'],
    defaultSpec: '3인',
    defaultCbm: 2.0,
    options: [
      { label: '1인', spec: '1인', cbm: 0.8 },
      { label: '2인', spec: '2인', cbm: 1.4 },
      { label: '3인', spec: '3인', cbm: 2.0 },
      { label: '4인', spec: '4인', cbm: 3.0 },
    ],
  },
  {
    id: 'liv_stone_sofa',
    displayTitle: '흙·돌(쇼파)',
    matchNames: ['돌소파', '흙소파', '돌침대'],
    defaultSpec: '흙/돌 쇼파',
    defaultCbm: 2.4,
    options: [
      { label: '흙', spec: '흙쇼파', cbm: 2.4 },
      { label: '돌', spec: '돌쇼파', cbm: 2.4 },
    ],
  },
  {
    id: 'liv_cabinet',
    displayTitle: '장식장',
    matchNames: ['장식장'],
    defaultSpec: '유리',
    defaultCbm: 1.2,
    defaultInnerCbm: 0.3,
    options: [{ label: '유리', spec: '유리장식장', cbm: 1.2, innerBoxCbm: 0.3 }],
  },
  {
    id: 'liv_tv',
    displayTitle: 'TV',
    matchNames: ['TV'],
    defaultSpec: '75(벽걸이)',
    defaultCbm: 0.6,
    options: [{ label: '벽걸이', spec: '벽걸이', cbm: 0.6 }],
  },
  {
    id: 'liv_tv_stand',
    displayTitle: 'TV받침',
    matchNames: ['거실장', 'TV받침'],
    defaultSpec: 'TV장',
    defaultCbm: 1.0,
    defaultInnerCbm: 0.2,
    options: [
      { label: '문갑', spec: '문갑', cbm: 0.8, innerBoxCbm: 0.2 },
      { label: '드레스', spec: '드레스', cbm: 1.1, innerBoxCbm: 0.2 },
    ],
  },
  {
    id: 'liv_drawer',
    displayTitle: '서랍장',
    matchNames: ['서랍장'],
    defaultSpec: '5단 800',
    defaultCbm: 0.5,
    defaultInnerCbm: 0.5,
  },
  {
    id: 'liv_ac',
    displayTitle: '에어컨',
    matchNames: ['에어컨'],
    defaultSpec: '2 IN 1',
    defaultCbm: 1.5,
    options: [
      { label: '슬림', spec: '2 IN 1(슬림)', cbm: 1.5 },
      { label: '벽걸이', spec: '벽걸이', cbm: 0.5 },
    ],
  },
  {
    id: 'liv_piano',
    displayTitle: '피아노',
    matchNames: ['피아노', '디지털피아노'],
    defaultSpec: '전자/디지털',
    defaultCbm: 1.0,
    options: [
      { label: '전자', spec: '전자피아노', cbm: 0.8 },
      { label: '일반', spec: '업라이트', cbm: 2.0 },
    ],
  },
  {
    id: 'liv_desk',
    displayTitle: '책상/의자',
    matchNames: ['책상'],
    defaultSpec: '책상+의자',
    defaultCbm: 1.2,
    defaultInnerCbm: 0.2,
  },
  {
    id: 'liv_bookshelf',
    displayTitle: '책장',
    matchNames: ['책장'],
    defaultSpec: '2x5단',
    defaultCbm: 0.5,
    defaultInnerCbm: 0.5,
  },
  {
    id: 'liv_styler',
    displayTitle: '스타일러',
    matchNames: ['스타일러', '에어드레서'],
    defaultSpec: '일반(3~5벌)',
    defaultCbm: 1.2,
  },
  {
    id: 'liv_massage',
    displayTitle: '안마의자/세라젬',
    matchNames: ['안마의자', '세라젬'],
    defaultSpec: '프리미엄/대형',
    defaultCbm: 2.2,
    options: [
      { label: '안마의자', spec: '안마의자', cbm: 2.5 },
      { label: '세라젬', spec: '세라젬', cbm: 1.5 },
    ],
  },
]

// 3블록: 주방 행 정의
const KITCHEN_ROWS: PaperRowDef[] = [
  {
    id: 'kit_table',
    displayTitle: '식탁',
    matchNames: ['식탁'],
    defaultSpec: '4인 세트(의자포함)',
    defaultCbm: 1.5,
    options: [
      { label: '4', spec: '4인 세트(의자포함)', cbm: 1.5 },
      { label: '6', spec: '6인 세트(의자포함)', cbm: 2.2 },
    ],
  },
  {
    id: 'kit_chair',
    displayTitle: '의자',
    matchNames: ['의자', '식탁의자'],
    defaultSpec: '식탁용',
    defaultCbm: 0.25,
  },
  {
    id: 'kit_cabinet',
    displayTitle: '장식장',
    matchNames: ['장식장', '그릇장'],
    defaultSpec: '유리',
    defaultCbm: 1.0,
    defaultInnerCbm: 0.4,
    options: [{ label: '유리', spec: '유리장식장', cbm: 1.0, innerBoxCbm: 0.4 }],
  },
  {
    id: 'kit_fridge',
    displayTitle: '냉장고',
    matchNames: ['냉장고'],
    defaultSpec: '양문형 대형 4도어',
    defaultCbm: 2.4,
    defaultInnerCbm: 1.6,
    options: [
      { label: '대', spec: '양문형 대형 4도어', cbm: 2.4, innerBoxCbm: 1.6 },
      { label: '중', spec: '양문형 2도어', cbm: 1.6, innerBoxCbm: 1.2 },
      { label: '소', spec: '일반 300 이하', cbm: 0.6, innerBoxCbm: 0.3 },
    ],
  },
  {
    id: 'kit_kimchi',
    displayTitle: '김치냉장고',
    matchNames: ['김치냉장고'],
    defaultSpec: '스탠드 중형 3도어',
    defaultCbm: 1.2,
    defaultInnerCbm: 0.6,
    options: [
      { label: '대', spec: '스탠드 대형 4도어', cbm: 1.6, innerBoxCbm: 0.8 },
      { label: '소', spec: '뚜껑형/소형', cbm: 0.7, innerBoxCbm: 0.4 },
    ],
  },
  {
    id: 'kit_dishwasher',
    displayTitle: '식기세척기',
    matchNames: ['식기세척기'],
    defaultSpec: '12인용/프리스탠딩',
    defaultCbm: 0.6,
  },
  {
    id: 'kit_induction',
    displayTitle: '인덕션',
    matchNames: ['인덕션', '가스레인지'],
    defaultSpec: '스탠드/프리스탠딩',
    defaultCbm: 0.2,
  },
  {
    id: 'kit_mw_stand',
    displayTitle: '전자렌지다이',
    matchNames: ['전자렌지다이', '렌지대'],
    defaultSpec: '일반',
    defaultCbm: 0.5,
    defaultInnerCbm: 0.2,
  },
  {
    id: 'kit_angle',
    displayTitle: '앵글다이',
    matchNames: ['앵글', '앵글다이', '선반'],
    defaultSpec: '주방앵글',
    defaultCbm: 0.5,
    defaultInnerCbm: 0.4,
  },
  {
    id: 'kit_purifier',
    displayTitle: '정수기',
    matchNames: ['정수기'],
    defaultSpec: '데스크/스탠드',
    defaultCbm: 0.2,
  },
  {
    id: 'kit_island',
    displayTitle: '아일랜드',
    matchNames: ['아일랜드식탁', '아일랜드', '홈바'],
    defaultSpec: '수납형',
    defaultCbm: 1.2,
    defaultInnerCbm: 0.3,
  },
  {
    id: 'kit_sink_goods',
    displayTitle: '싱크대살림',
    matchNames: ['싱크대살림', '주방살림'],
    defaultSpec: '표준(3~4인)',
    defaultCbm: 0,
    defaultInnerCbm: 1.2,
  },
]

// 4블록: 베란다 행 정의
const VERANDA_ROWS: PaperRowDef[] = [
  {
    id: 'ver_washer',
    displayTitle: '세탁기',
    matchNames: ['세탁기'],
    defaultSpec: '일반/드럼',
    defaultCbm: 1.0,
    options: [
      { label: '트윈', spec: '트윈워시/워시타워', cbm: 1.4 },
      { label: '드럼', spec: '드럼', cbm: 1.0 },
      { label: '통돌이', spec: '통돌이', cbm: 0.9 },
    ],
  },
  {
    id: 'ver_dryer',
    displayTitle: '건조기',
    matchNames: ['건조기'],
    defaultSpec: '일반/드럼',
    defaultCbm: 1.0,
    options: [
      { label: '일체', spec: '일체형/직렬', cbm: 1.0 },
      { label: '단독', spec: '단독형', cbm: 1.0 },
    ],
  },
  {
    id: 'ver_cabinet',
    displayTitle: '장식장',
    matchNames: ['장식장'],
    defaultSpec: '유리',
    defaultCbm: 1.0,
    options: [{ label: '유리', spec: '유리장식장', cbm: 1.0 }],
  },
  {
    id: 'ver_fridge',
    displayTitle: '냉장고',
    matchNames: ['냉장고'],
    defaultSpec: '1D/소형',
    defaultCbm: 0.8,
    defaultInnerCbm: 0.3,
    options: [
      { label: '대', spec: '양문형 대형', cbm: 2.0, innerBoxCbm: 1.0 },
      { label: '중', spec: '일반 중형', cbm: 1.2, innerBoxCbm: 0.5 },
      { label: '소', spec: '소형', cbm: 0.6, innerBoxCbm: 0.2 },
      { label: '1D', spec: '1D(원도어)', cbm: 0.8, innerBoxCbm: 0.3 },
    ],
  },
  {
    id: 'ver_kimchi',
    displayTitle: '김치냉장고',
    matchNames: ['김치냉장고'],
    defaultSpec: '스탠드/뚜껑형',
    defaultCbm: 1.0,
    defaultInnerCbm: 0.5,
    options: [
      { label: '대', spec: '스탠드 대형', cbm: 1.5, innerBoxCbm: 0.7 },
      { label: '소', spec: '뚜껑형/소형', cbm: 0.7, innerBoxCbm: 0.4 },
    ],
  },
  {
    id: 'ver_camping',
    displayTitle: '캠핑용품',
    matchNames: ['캠핑용품', '캠핑장비'],
    defaultSpec: '세트',
    defaultCbm: 0.8,
    defaultInnerCbm: 0.4,
  },
  {
    id: 'ver_angle',
    displayTitle: '앵글다이',
    matchNames: ['앵글', '앵글다이', '선반'],
    defaultSpec: '베란다앵글',
    defaultCbm: 0.5,
    defaultInnerCbm: 0.5,
  },
  {
    id: 'ver_display',
    displayTitle: '진열대/진열장',
    matchNames: ['진열대', '진열장', '수납선반'],
    defaultSpec: '일반',
    defaultCbm: 0.8,
    defaultInnerCbm: 0.3,
  },
  {
    id: 'ver_bike',
    displayTitle: '자전거',
    matchNames: ['자전거'],
    defaultSpec: '성인/아동',
    defaultCbm: 0.5,
  },
  {
    id: 'ver_pot',
    displayTitle: '화분',
    matchNames: ['화분'],
    defaultSpec: '중/대형',
    defaultCbm: 0.2,
  },
  {
    id: 'ver_jar',
    displayTitle: '항아리',
    matchNames: ['항아리', '장독'],
    defaultSpec: '중/대형',
    defaultCbm: 0.25,
  },
  {
    id: 'ver_exercise',
    displayTitle: '운동기구',
    matchNames: ['운동기구', '헬스자전거', '런닝머신'],
    defaultSpec: '실내자전거/기구',
    defaultCbm: 0.8,
  },
]

const ROOM_COLUMNS = [
  { key: '안방', label: '안방', subLabel: '' },
  { key: '입구방', label: '방1', subLabel: '입구' },
  { key: '작은방1', label: '방2', subLabel: '작은1' },
  { key: '작은방2', label: '방3', subLabel: '작은2' },
  { key: '서재', label: '방4', subLabel: '서재' },
]

export function PaperSheetCbmPanel({
  allCategories,
  onActivateCategory,
  items,
  setItems,
  standardItems,
}: PaperSheetCbmPanelProps) {
  const [penMode, setPenMode] = useState<PenMode>('MOVE')
  // 각 행별로 사용자가 동그라미 친 서브옵션 상태 기록 (key: row.id)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, SubOptionDef>>({})
  // 침대 행(bed)에서 선택된 사이즈 뱃지 (예: Q, K, S)
  const [selectedBedSize, setSelectedBedSize] = useState<string>('Q')

  // 위치 이름('안방', '입구방', '거실', '주방', '베란다' 등)으로 시스템 category 객체 찾기
  const getCategoryByLocName = (locName: string) => {
    const found = allCategories.find(c => c.name === locName)
    return found || { id: '', name: locName }
  }

  // 특정 위치(locName) + 행(rowDef)에 해당하는 현재 items 내 항목 찾기
  const findMatchingItem = (locName: string, rowDef: PaperRowDef) => {
    const cat = getCategoryByLocName(locName)
    return items.find(it => {
      const sameLoc = cat.id
        ? (it.locationId || '') === cat.id || it.locationName === locName
        : it.locationName === locName
      if (!sameLoc) return false
      return rowDef.matchNames.some(mn => (it.name || '').trim() === mn)
    })
  }

  // 행의 현재 선택된 옵션(또는 items에 이미 저장된 규격) 조회
  const getEffectiveOption = (rowDef: PaperRowDef, existingItem?: any): SubOptionDef => {
    if (selectedOptions[rowDef.id]) {
      return selectedOptions[rowDef.id]
    }
    if (existingItem && existingItem.spec && rowDef.options) {
      const matchedOpt = rowDef.options.find(
        o => existingItem.spec.includes(o.label) || existingItem.spec === o.spec
      )
      if (matchedOpt) return matchedOpt
    }
    // standardItems에 등록된 기본 실측치가 있으면 우선 참조
    const std = standardItems.find(s => rowDef.matchNames.includes(s.name))
    return {
      label: rowDef.options?.[0]?.label || '',
      spec: existingItem?.spec || rowDef.defaultSpec,
      cbm: std?.defaultCbm ?? rowDef.defaultCbm,
      innerBoxCbm: std?.defaultInnerCbm ?? rowDef.defaultInnerCbm ?? 0,
    }
  }

  // 괄호 안의 옵션을 클릭했을 때 동그라미 선택 + 이미 체크된 해당 행의 규격/CBM도 즉시 업데이트
  const handleSelectSubOption = (
    rowDef: PaperRowDef,
    opt: SubOptionDef,
    targetLocNames: string[]
  ) => {
    setSelectedOptions(prev => ({ ...prev, [rowDef.id]: opt }))

    setItems(prev =>
      prev.map(it => {
        const isTargetLoc = targetLocNames.some(ln => {
          const cat = getCategoryByLocName(ln)
          return (cat.id && it.locationId === cat.id) || it.locationName === ln
        })
        if (!isTargetLoc) return it
        if (!rowDef.matchNames.includes((it.name || '').trim())) return it
        if ((Number(it.quantity) || 0) <= 0) return it

        return {
          ...it,
          spec: opt.spec,
          cbm: opt.cbm,
          innerBoxCbm: opt.innerBoxCbm ?? it.innerBoxCbm ?? 0,
        }
      })
    )
  }

  // 셀 클릭 시 펜 모드(MOVE / DOWN / DISPOSE / WAYPOINT / ERASE)에 따라 즉시 마킹/수량 증감
  const handleCellClick = (locName: string, rowDef: PaperRowDef) => {
    const cat = getCategoryByLocName(locName)
    if (cat.id && onActivateCategory) {
      onActivateCategory(cat.id)
    }

    const opt = getEffectiveOption(rowDef)
    const canonicalName =
      standardItems.find(s => rowDef.matchNames.includes(s.name))?.name || rowDef.matchNames[0]

    const finalSpec =
      rowDef.id === 'bed' && selectedBedSize
        ? `${selectedBedSize}(${opt.spec})`
        : opt.spec

    setItems(prev => {
      const idx = prev.findIndex(it => {
        const sameLoc = cat.id
          ? (it.locationId || '') === cat.id || it.locationName === locName
          : it.locationName === locName
        return sameLoc && rowDef.matchNames.includes((it.name || '').trim())
      })

      if (penMode === 'ERASE') {
        if (idx < 0) return prev
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: 0, treatment: '이동' }
        return next
      }

      const targetTreatment =
        penMode === 'DOWN'
          ? '내림'
          : penMode === 'DISPOSE'
          ? '폐기'
          : penMode === 'WAYPOINT'
          ? '경유'
          : '이동'

      if (idx >= 0) {
        const cur = prev[idx]
        const curQty = Number(cur.quantity) || 0
        const curTreatment = cur.treatment || '이동'

        let nextQty = curQty
        let nextTreatment = targetTreatment

        if (penMode === 'MOVE') {
          if (curQty <= 0) {
            nextQty = 1
          } else if (curTreatment !== '이동') {
            // 내림/폐기 상태에서 이동 펜으로 누르면 이동 1개로 전환
            nextTreatment = '이동'
          } else {
            // 이미 이동 체크된 상태에서 누르면 1 -> 2 -> 3 -> 4 -> 0 순환
            nextQty = curQty >= 5 ? 0 : curQty + 1
          }
        } else {
          // 내림(↓), 폐기(✕), 경유 펜 모드일 때: 빈칸이면 1개로 마킹, 이미 같은 마킹이면 해제(0), 다른 마킹이면 해당 마킹으로 전환
          if (curQty > 0 && curTreatment === targetTreatment) {
            nextQty = 0
            nextTreatment = '이동'
          } else {
            nextQty = curQty > 0 ? curQty : 1
          }
        }

        const next = [...prev]
        next[idx] = {
          ...cur,
          locationId: cat.id,
          locationName: locName,
          name: cur.name || canonicalName,
          spec: finalSpec || cur.spec,
          quantity: nextQty,
          treatment: nextTreatment,
          cbm: opt.cbm || cur.cbm || rowDef.defaultCbm,
          innerBoxCbm: opt.innerBoxCbm ?? cur.innerBoxCbm ?? rowDef.defaultInnerCbm ?? 0,
        }
        return next
      } else {
        // 신규 항목 추가
        return [
          ...prev,
          ensureItemUid({
            locationId: cat.id,
            locationName: locName,
            name: canonicalName,
            spec: finalSpec,
            quantity: 1,
            treatment: targetTreatment,
            cbm: opt.cbm || rowDef.defaultCbm,
            innerBoxCbm: opt.innerBoxCbm ?? rowDef.defaultInnerCbm ?? 0,
          }),
        ]
      }
    })
  }

  // 셀 수량 직접 우클릭/초기화 헬퍼
  const handleClearCell = (e: React.MouseEvent, locName: string, rowDef: PaperRowDef) => {
    e.stopPropagation()
    const cat = getCategoryByLocName(locName)
    setItems(prev =>
      prev.map(it => {
        const sameLoc = cat.id
          ? (it.locationId || '') === cat.id || it.locationName === locName
          : it.locationName === locName
        if (sameLoc && rowDef.matchNames.includes((it.name || '').trim())) {
          return { ...it, quantity: 0, treatment: '이동' }
        }
        return it
      })
    )
  }

  // 위치별 포장 BOX 수량 조회 및 증감
  const getBoxQtyForLoc = (locName: string) => {
    const cat = getCategoryByLocName(locName)
    return items
      .filter(it => {
        const sameLoc = cat.id
          ? (it.locationId || '') === cat.id || it.locationName === locName
          : it.locationName === locName
        return sameLoc && isBoxItem(it.name)
      })
      .reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)
  }

  const handleBoxCellClick = (locName: string, delta: number) => {
    const cat = getCategoryByLocName(locName)
    if (cat.id && onActivateCategory) {
      onActivateCategory(cat.id)
    }

    setItems(prev => {
      const idx = prev.findIndex(it => {
        const sameLoc = cat.id
          ? (it.locationId || '') === cat.id || it.locationName === locName
          : it.locationName === locName
        return sameLoc && isBoxItem(it.name)
      })

      if (idx >= 0) {
        const next = [...prev]
        const curQty = Number(next[idx].quantity) || 0
        const nextQty = Math.max(0, curQty + delta)
        next[idx] = {
          ...next[idx],
          quantity: nextQty,
          cbm: Number(next[idx].cbm) || 0.25,
        }
        return next
      } else if (delta > 0) {
        return [
          ...prev,
          ensureItemUid({
            locationId: cat.id,
            locationName: locName,
            name: 'BOX',
            spec: '중박스(표준)',
            quantity: delta,
            treatment: '이동',
            cbm: 0.25,
            innerBoxCbm: 0,
          }),
        ]
      }
      return prev
    })
  }

  // 셀 내부에 종이양식 필기 기호(V, 숫자, Q2, ↓, X) 렌더링
  const renderCellMark = (locName: string, rowDef: PaperRowDef) => {
    const matched = findMatchingItem(locName, rowDef)
    const qty = Number(matched?.quantity) || 0
    if (!matched || qty <= 0) {
      return <span className="text-[10px] text-gray-300 select-none">·</span>
    }

    const treatment = matched.treatment || '이동'

    if (treatment === '내림') {
      return (
        <div className="relative w-full h-full flex items-center justify-center group">
          <span
            className="text-sm sm:text-base font-black text-amber-700 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-300 leading-none"
            title={`내림 (${qty}개)`}
          >
            ↓{qty > 1 ? qty : ''}
          </span>
          <button
            type="button"
            onClick={e => handleClearCell(e, locName, rowDef)}
            className="hidden group-hover:flex absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gray-700 text-white items-center justify-center text-[9px]"
            title="지우기"
          >
            ×
          </button>
        </div>
      )
    }

    if (treatment === '폐기' || treatment === '존치') {
      return (
        <div className="relative w-full h-full flex items-center justify-center group">
          <span
            className="text-sm sm:text-base font-black text-rose-600 bg-rose-100/90 px-1.5 py-0.2 rounded border border-rose-300 leading-none"
            title={`${treatment} (${qty}개)`}
          >
            ✕{qty > 1 ? qty : ''}
          </span>
          <button
            type="button"
            onClick={e => handleClearCell(e, locName, rowDef)}
            className="hidden group-hover:flex absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gray-700 text-white items-center justify-center text-[9px]"
            title="지우기"
          >
            ×
          </button>
        </div>
      )
    }

    if (treatment === '경유') {
      return (
        <div className="relative w-full h-full flex items-center justify-center group">
          <span
            className="text-[11px] font-black text-purple-700 bg-purple-100 px-1 py-0.2 rounded border border-purple-300 leading-none"
            title={`경유 (${qty}개)`}
          >
            경{qty > 1 ? qty : ''}
          </span>
          <button
            type="button"
            onClick={e => handleClearCell(e, locName, rowDef)}
            className="hidden group-hover:flex absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gray-700 text-white items-center justify-center text-[9px]"
            title="지우기"
          >
            ×
          </button>
        </div>
      )
    }

    // 이동(기본): 침대면 Q1/Q2/K1/S1 형태, 일반 품목이면 1개는 '✓'(체크), 2개 이상은 숫자 표기
    const isBed = rowDef.id === 'bed'
    const sizePrefix = isBed
      ? (matched.spec || '').startsWith('K')
        ? 'K'
        : (matched.spec || '').startsWith('S')
        ? 'S'
        : 'Q'
      : ''

    return (
      <div className="relative w-full h-full flex items-center justify-center group">
        <span className="text-sm sm:text-base font-black text-blue-700 leading-none tracking-tight select-none">
          {isBed ? `${sizePrefix}${qty}` : qty === 1 ? '✓' : qty}
        </span>
        <button
          type="button"
          onClick={e => handleClearCell(e, locName, rowDef)}
          className="hidden group-hover:flex absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gray-700 text-white items-center justify-center text-[9px]"
          title="지우기"
        >
          ×
        </button>
      </div>
    )
  }

  // 품목명 + 괄호 안 서브옵션(클릭 시 동그라미 마킹) 렌더링
  const renderRowTitleWithOptions = (rowDef: PaperRowDef, targetLocNames: string[]) => {
    const activeOptLabel =
      selectedOptions[rowDef.id]?.label ||
      (() => {
        for (const ln of targetLocNames) {
          const m = findMatchingItem(ln, rowDef)
          if (m && (Number(m.quantity) || 0) > 0 && rowDef.options) {
            const found = rowDef.options.find(
              o => (m.spec || '').includes(o.label) || m.spec === o.spec
            )
            if (found) return found.label
          }
        }
        return ''
      })()

    return (
      <div className="flex flex-wrap items-center gap-0.5 leading-tight py-0.5">
        <span className="font-extrabold text-gray-900 text-[11px] sm:text-xs">
          {rowDef.displayTitle}
        </span>
        {rowDef.options && rowDef.options.length > 0 && (
          <span className="text-[10px] sm:text-[11px] text-gray-600 inline-flex flex-wrap items-center">
            <span>(</span>
            {rowDef.options.map((opt, idx) => {
              const isCircled = activeOptLabel === opt.label
              return (
                <React.Fragment key={opt.label}>
                  {idx > 0 && <span className="text-gray-400 mx-0.2">/</span>}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      handleSelectSubOption(rowDef, opt, targetLocNames)
                    }}
                    className={`px-1 rounded-full transition-all font-bold ${
                      isCircled
                        ? 'ring-2 ring-red-600 bg-red-50 text-red-700 font-black'
                        : 'hover:bg-gray-200 text-gray-700'
                    }`}
                    title={`클릭 시 [${opt.label}] 규격(${opt.cbm} CBM) 동그라미 선택`}
                  >
                    {opt.label}
                  </button>
                </React.Fragment>
              )
            })}
            <span>)</span>
          </span>
        )}
        {rowDef.bedSizeBadges && (
          <span className="inline-flex items-center gap-0.5 ml-0.5">
            {rowDef.bedSizeBadges.map(sz => (
              <button
                key={sz}
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  setSelectedBedSize(sz)
                }}
                className={`px-1 py-0.1 text-[9px] rounded font-black border ${
                  selectedBedSize === sz
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-100 text-gray-600 border-gray-300'
                }`}
                title={`침대 사이즈 ${sz} 선택 후 방 칸 클릭 시 ${sz}1, ${sz}2 표기`}
              >
                {sz}
              </button>
            ))}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {/* 상단: 현장 종이양식 마킹 펜 도구 바 */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-black text-amber-950 mr-1 flex items-center gap-1">
            ✏️ 현장 기입 펜:
          </span>

          <button
            type="button"
            onClick={() => setPenMode('MOVE')}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border transition-all flex items-center gap-1 ${
              penMode === 'MOVE'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>✓ 이동 체크 (연속클릭=수량+)</span>
          </button>

          <button
            type="button"
            onClick={() => setPenMode('DOWN')}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border transition-all flex items-center gap-1 ${
              penMode === 'DOWN'
                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>↓ 내림</span>
          </button>

          <button
            type="button"
            onClick={() => setPenMode('DISPOSE')}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border transition-all flex items-center gap-1 ${
              penMode === 'DISPOSE'
                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                : 'bg-white text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>✕ 폐기/제외</span>
          </button>

          <button
            type="button"
            onClick={() => setPenMode('WAYPOINT')}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border transition-all ${
              penMode === 'WAYPOINT'
                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                : 'bg-white text-purple-800 border-purple-300 hover:bg-purple-100'
            }`}
          >
            경유
          </button>

          <button
            type="button"
            onClick={() => setPenMode('ERASE')}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border transition-all flex items-center gap-1 ${
              penMode === 'ERASE'
                ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>지우개</span>
          </button>
        </div>

        <div className="text-[11px] font-bold text-amber-900">
          💡 괄호 안 글자(<span className="text-red-600 underline">반분해, 일반, 4/6 등</span>)를 누르면{' '}
          <span className="px-1 rounded-full ring-1 ring-red-600 bg-red-50 text-red-700 font-black">
            동그라미
          </span>{' '}
          선택되며, 빈칸을 누르면 체크됩니다.
        </div>
      </div>

      {/* 본문: 현장 종이양식 4단 매트릭스 시트 */}
      <div className="border-2 border-neutral-800 rounded-lg overflow-x-auto bg-white shadow-sm">
        <div className="min-w-[860px] grid grid-cols-12 divide-x-2 divide-neutral-700 text-xs">
          {/* 1블록 (5열 폭): 방 매트릭스 (품목 | 안방 | 방1 | 방2 | 방3 | 방4) */}
          <div className="col-span-5 flex flex-col">
            <table className="w-full border-collapse table-fixed flex-1">
              <thead>
                <tr className="bg-neutral-800 text-white font-black text-[11px] sm:text-xs">
                  <th className="py-2 px-2 text-center border-b border-r border-neutral-600 w-[44%]">
                    방 품목 (옵션터치)
                  </th>
                  {ROOM_COLUMNS.map(rc => (
                    <th
                      key={rc.key}
                      className="py-1.5 px-0.5 text-center border-b border-r last:border-r-0 border-neutral-600 w-[11.2%]"
                      title={rc.subLabel ? `${rc.label} (${rc.subLabel})` : rc.label}
                    >
                      <div>{rc.label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-300">
                {ROOM_MATRIX_ROWS.map(rowDef => (
                  <tr key={rowDef.id} className="hover:bg-blue-50/30 transition-colors h-8">
                    <td className="px-2 py-1 border-r border-neutral-300 bg-neutral-50/60">
                      {renderRowTitleWithOptions(
                        rowDef,
                        ROOM_COLUMNS.map(r => r.key)
                      )}
                    </td>
                    {ROOM_COLUMNS.map(rc => {
                      const matched = findMatchingItem(rc.key, rowDef)
                      const hasQty = (Number(matched?.quantity) || 0) > 0
                      return (
                        <td
                          key={rc.key}
                          onClick={() => handleCellClick(rc.key, rowDef)}
                          className={`border-r last:border-r-0 border-neutral-300 text-center cursor-pointer transition-colors ${
                            hasQty ? 'bg-blue-50/70' : 'hover:bg-amber-50/60'
                          }`}
                        >
                          {renderCellMark(rc.key, rowDef)}
                        </td>
                      )
                    })}
                  </tr>
                ))}

                {/* 방별 포장 BOX 수량 행 */}
                <tr className="bg-amber-50/50 h-8 border-t-2 border-neutral-400">
                  <td className="px-2 py-1 border-r border-neutral-300 font-black text-amber-950 text-[11px]">
                    📦 잔짐 BOX (클릭 +1)
                  </td>
                  {ROOM_COLUMNS.map(rc => {
                    const boxQty = getBoxQtyForLoc(rc.key)
                    return (
                      <td
                        key={rc.key}
                        onClick={() => handleBoxCellClick(rc.key, penMode === 'ERASE' ? -boxQty : 1)}
                        className="border-r last:border-r-0 border-neutral-300 text-center cursor-pointer hover:bg-amber-100/70 font-black text-amber-900"
                        title="클릭 시 해당 방 BOX +1 (지우개 모드 시 0 초기화)"
                      >
                        {boxQty > 0 ? boxQty : <span className="text-gray-300 text-[10px]">·</span>}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* 2블록 (2.33열 → col-span-2): 거실 */}
          <div className="col-span-2 flex flex-col">
            <table className="w-full border-collapse table-fixed flex-1">
              <thead>
                <tr className="bg-neutral-800 text-white font-black text-[11px] sm:text-xs">
                  <th className="py-2 px-2 text-center border-b border-r border-neutral-600 w-[74%]">
                    거실
                  </th>
                  <th className="py-2 px-1 text-center border-b border-neutral-600 w-[26%]">체크</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-300">
                {LIVING_ROWS.map(rowDef => {
                  const matched = findMatchingItem('거실', rowDef)
                  const hasQty = (Number(matched?.quantity) || 0) > 0
                  return (
                    <tr key={rowDef.id} className="hover:bg-blue-50/30 transition-colors h-8">
                      <td className="px-2 py-1 border-r border-neutral-300 bg-neutral-50/60">
                        {renderRowTitleWithOptions(rowDef, ['거실'])}
                      </td>
                      <td
                        onClick={() => handleCellClick('거실', rowDef)}
                        className={`text-center cursor-pointer transition-colors ${
                          hasQty ? 'bg-blue-50/70' : 'hover:bg-amber-50/60'
                        }`}
                      >
                        {renderCellMark('거실', rowDef)}
                      </td>
                    </tr>
                  )
                })}
                {/* 높이 맞춤 빈 줄 + 거실 BOX */}
                <tr className="h-8">
                  <td className="px-2 py-1 border-r border-neutral-300 bg-neutral-50/40 text-[11px] text-gray-500">
                    공기청정기
                  </td>
                  <td
                    onClick={() =>
                      handleCellClick('거실', {
                        id: 'liv_air',
                        displayTitle: '공기청정기',
                        matchNames: ['공기청정기'],
                        defaultSpec: '일반',
                        defaultCbm: 0.25,
                      })
                    }
                    className="text-center cursor-pointer hover:bg-amber-50/60"
                  >
                    {renderCellMark('거실', {
                      id: 'liv_air',
                      displayTitle: '공기청정기',
                      matchNames: ['공기청정기'],
                      defaultSpec: '일반',
                      defaultCbm: 0.25,
                    })}
                  </td>
                </tr>
                <tr className="bg-amber-50/50 h-8 border-t-2 border-neutral-400">
                  <td className="px-2 py-1 border-r border-neutral-300 font-black text-amber-950 text-[11px]">
                    📦 거실 BOX (+1)
                  </td>
                  <td
                    onClick={() => {
                      const q = getBoxQtyForLoc('거실')
                      handleBoxCellClick('거실', penMode === 'ERASE' ? -q : 1)
                    }}
                    className="text-center cursor-pointer hover:bg-amber-100/70 font-black text-amber-900"
                  >
                    {getBoxQtyForLoc('거실') || <span className="text-gray-300 text-[10px]">·</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 3블록 (col-span-2): 주방 */}
          <div className="col-span-2 flex flex-col">
            <table className="w-full border-collapse table-fixed flex-1">
              <thead>
                <tr className="bg-neutral-800 text-white font-black text-[11px] sm:text-xs">
                  <th className="py-2 px-2 text-center border-b border-r border-neutral-600 w-[74%]">
                    주방
                  </th>
                  <th className="py-2 px-1 text-center border-b border-neutral-600 w-[26%]">체크</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-300">
                {KITCHEN_ROWS.map(rowDef => {
                  const matched = findMatchingItem('주방', rowDef)
                  const hasQty = (Number(matched?.quantity) || 0) > 0
                  return (
                    <tr key={rowDef.id} className="hover:bg-blue-50/30 transition-colors h-8">
                      <td className="px-2 py-1 border-r border-neutral-300 bg-neutral-50/60">
                        {renderRowTitleWithOptions(rowDef, ['주방'])}
                      </td>
                      <td
                        onClick={() => handleCellClick('주방', rowDef)}
                        className={`text-center cursor-pointer transition-colors ${
                          hasQty ? 'bg-blue-50/70' : 'hover:bg-amber-50/60'
                        }`}
                      >
                        {renderCellMark('주방', rowDef)}
                      </td>
                    </tr>
                  )
                })}
                <tr className="h-8">
                  <td className="px-2 py-1 border-r border-neutral-300 bg-neutral-50/40 text-[11px] text-gray-500">
                    전자레인지/밥솥
                  </td>
                  <td
                    onClick={() =>
                      handleCellClick('주방', {
                        id: 'kit_small_app',
                        displayTitle: '주방가전',
                        matchNames: ['주방가전', '전자레인지'],
                        defaultSpec: '전자레인지/밥솥',
                        defaultCbm: 0.2,
                      })
                    }
                    className="text-center cursor-pointer hover:bg-amber-50/60"
                  >
                    {renderCellMark('주방', {
                      id: 'kit_small_app',
                      displayTitle: '주방가전',
                      matchNames: ['주방가전', '전자레인지'],
                      defaultSpec: '전자레인지/밥솥',
                      defaultCbm: 0.2,
                    })}
                  </td>
                </tr>
                <tr className="bg-amber-50/50 h-8 border-t-2 border-neutral-400">
                  <td className="px-2 py-1 border-r border-neutral-300 font-black text-amber-950 text-[11px]">
                    📦 주방 BOX (+1)
                  </td>
                  <td
                    onClick={() => {
                      const q = getBoxQtyForLoc('주방')
                      handleBoxCellClick('주방', penMode === 'ERASE' ? -q : 1)
                    }}
                    className="text-center cursor-pointer hover:bg-amber-100/70 font-black text-amber-900"
                  >
                    {getBoxQtyForLoc('주방') || <span className="text-gray-300 text-[10px]">·</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 4블록 (col-span-3): 베란다 */}
          <div className="col-span-3 flex flex-col">
            <table className="w-full border-collapse table-fixed flex-1">
              <thead>
                <tr className="bg-neutral-800 text-white font-black text-[11px] sm:text-xs">
                  <th className="py-2 px-2 text-center border-b border-r border-neutral-600 w-[76%]">
                    베란다
                  </th>
                  <th className="py-2 px-1 text-center border-b border-neutral-600 w-[24%]">체크</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-300">
                {VERANDA_ROWS.map(rowDef => {
                  const matched = findMatchingItem('베란다', rowDef)
                  const hasQty = (Number(matched?.quantity) || 0) > 0
                  return (
                    <tr key={rowDef.id} className="hover:bg-blue-50/30 transition-colors h-8">
                      <td className="px-2 py-1 border-r border-neutral-300 bg-neutral-50/60">
                        {renderRowTitleWithOptions(rowDef, ['베란다'])}
                      </td>
                      <td
                        onClick={() => handleCellClick('베란다', rowDef)}
                        className={`text-center cursor-pointer transition-colors ${
                          hasQty ? 'bg-blue-50/70' : 'hover:bg-amber-50/60'
                        }`}
                      >
                        {renderCellMark('베란다', rowDef)}
                      </td>
                    </tr>
                  )
                })}
                <tr className="h-8">
                  <td className="px-2 py-1 border-r border-neutral-300 bg-neutral-50/40 text-[11px] text-gray-500">
                    잔짐/기타물품
                  </td>
                  <td
                    onClick={() =>
                      handleCellClick('베란다', {
                        id: 'ver_etc',
                        displayTitle: '베란다잔짐',
                        matchNames: ['베란다잔짐', '창고짐'],
                        defaultSpec: '일식',
                        defaultCbm: 0.5,
                      })
                    }
                    className="text-center cursor-pointer hover:bg-amber-50/60"
                  >
                    {renderCellMark('베란다', {
                      id: 'ver_etc',
                      displayTitle: '베란다잔짐',
                      matchNames: ['베란다잔짐', '창고짐'],
                      defaultSpec: '일식',
                      defaultCbm: 0.5,
                    })}
                  </td>
                </tr>
                <tr className="bg-amber-50/50 h-8 border-t-2 border-neutral-400">
                  <td className="px-2 py-1 border-r border-neutral-300 font-black text-amber-950 text-[11px]">
                    📦 베란다 BOX (+1)
                  </td>
                  <td
                    onClick={() => {
                      const q = getBoxQtyForLoc('베란다')
                      handleBoxCellClick('베란다', penMode === 'ERASE' ? -q : 1)
                    }}
                    className="text-center cursor-pointer hover:bg-amber-100/70 font-black text-amber-900"
                  >
                    {getBoxQtyForLoc('베란다') || (
                      <span className="text-gray-300 text-[10px]">·</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 하단: 현재 체크된 물품 요약 바 */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-extrabold text-slate-700">체크된 물품 요약:</span>
          {items.filter(it => (Number(it.quantity) || 0) > 0).length === 0 ? (
            <span className="text-gray-400">표의 빈칸을 터치하면 즉시 물품이 체크됩니다.</span>
          ) : (
            items
              .filter(it => (Number(it.quantity) || 0) > 0)
              .map(it => (
                <span
                  key={it._uid || `${it.locationName}_${it.name}_${it.spec}`}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold border text-[11px] ${
                    it.treatment === '내림'
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : it.treatment === '폐기' || it.treatment === '존치'
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-white text-gray-800 border-gray-300'
                  }`}
                >
                  <span className="text-blue-600">[{it.locationName || '미지정'}]</span>
                  <span>{it.name}</span>
                  {it.spec && <span className="text-gray-500">({it.spec})</span>}
                  <span className="font-black">×{it.quantity}</span>
                  {it.treatment && it.treatment !== '이동' && (
                    <span className="text-[10px] font-black underline">{it.treatment}</span>
                  )}
                </span>
              ))
          )}
        </div>
      </div>
    </div>
  )
}

