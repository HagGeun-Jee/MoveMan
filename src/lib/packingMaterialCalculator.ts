import { CostStandardData } from '@/app/actions/costStandards'

export interface PackingMaterialItem {
  code: string
  name: string
  category: 'BOX' | 'BASKET' | 'COVER' | 'PROTECTION' | 'CONSUMABLE'
  unit: string
  spec: string
  quantity: number
  reason: string
  source: 'REGISTERED' | 'GENERAL' // 등록자재 기준 vs 일반 기준
}

export interface RegisteredMaterialCatalogItem {
  id?: string
  code: string
  name: string
  category: string
  unit: string
  unitPrice?: number
  memo?: string | null
  isActive?: boolean
}

// DB에 기본 등록된 자재 마스터 카탈로그 (오프라인 및 초기 로드용 폴백, 옷걸이 박스 MAT-HNG-01 제외)
export const DEFAULT_REGISTERED_MATERIALS: RegisteredMaterialCatalogItem[] = [
  // 1. 박스 및 바구니 (옷걸이 박스 MAT-HNG-01 제외)
  { code: 'MAT-BOX-CLO', name: '단프라 박스 (의류)', category: 'BOX', unit: '개', memo: '900 x 500 x 500 (약 0.22 CBM)' },
  { code: 'MAT-BOX-BED', name: '단프라 박스 (이불)', category: 'BOX', unit: '개', memo: '900 x 500 x 600 (약 0.27 CBM)' },
  { code: 'MAT-BOX-L', name: '단프라 박스 (대)', category: 'BOX', unit: '개', memo: '700 × 450 × 500 CBM: 0.15' },
  { code: 'MAT-BOX-M', name: '단프라 박스 (중)', category: 'BOX', unit: '개', memo: '600 x 410 x 470 CBM: 0.11' },
  { code: 'MAT-BOX-S', name: '단프라 박스 (소)', category: 'BOX', unit: '개', memo: '480 x 350 x 350 책박스 (약 0.06 CBM)' },
  { code: 'MAT-BSK-01', name: '이사 바구니 (적색/대)', category: 'BASKET', unit: '개', memo: '일반 짐 운반용 플라스틱 바구니' },
  { code: 'MAT-ICE-BOX', name: '아이스박스', category: 'BASKET', unit: '개', memo: '7~8인 60QT 약 57리터' },

  // 2. 가구/가전/침대 보호커버 (22종)
  { code: 'MAT-CVR-BED2', name: '침대 매트리스 커버 (S/SS)', category: 'COVER', unit: '개', memo: '싱글, 슈퍼싱글 침대 매트리스 오염방지' },
  { code: 'MAT-CVR-BED', name: '침대 매트리스 커버 (Q/K)', category: 'COVER', unit: '개', memo: '퀸/킹 침대 매트리스 오염방지 커버' },
  { code: 'MAT-CVR-BED3', name: '침대 매트리스 커버 (수퍼킹)', category: 'COVER', unit: '개', memo: '수퍼킹 침대 매트리스 오염방지 커버' },
  { code: 'MAT-CVR-BED-HEAD', name: '침대 머리판 커버', category: 'COVER', unit: '개', memo: '침대 프레임 헤드 보호 커버' },
  { code: 'MAT-CVR-JANG', name: '커버 장농 3~4자', category: 'COVER', unit: '개', memo: '1000 x 630 x 2100' },
  { code: 'MAT-CVR-DRAW3', name: '서랍장 커버 3단', category: 'COVER', unit: '개', memo: '900 x 450 x 800' },
  { code: 'MAT-CVR-DRAW5', name: '서랍장 커버 5단', category: 'COVER', unit: '개', memo: '850 x 500 x 1150' },
  { code: 'MAT-CVR-STYL', name: '스타일러 커버', category: 'COVER', unit: '개', memo: '530 x 600 x 1900' },
  { code: 'MAT-CVR-FRI', name: '커버 지펠냉장고', category: 'COVER', unit: '개', memo: '양문형 2도어 몸통 보호' },
  { code: 'MAT-CVR-FRI-DOOR', name: '커버 지펠문짝 (2개)', category: 'COVER', unit: '개', memo: '양문형 2도어 문짝 보호' },
  { code: 'MAT-CVR-FRI2', name: '커버 지펠 4도어', category: 'COVER', unit: '개', memo: '4도어 냉장고 몸통 보호' },
  { code: 'MAT-CVR-FRI-DOOR2', name: '커버 냉장고 4도어 문짝', category: 'COVER', unit: '개', memo: '4도어 냉장고 문짝 보호' },
  { code: 'MAT-CVR-KIMC', name: '커버 김치냉장고 스텐드', category: 'COVER', unit: '개', memo: '스탠드형 김치냉장고 보호' },
  { code: 'MAT-CVR-KIMC2', name: '커버 김치냉장고 뚜껑형', category: 'COVER', unit: '개', memo: '뚜껑형 김치냉장고 보호' },
  { code: 'MAT-CVR-WASH2', name: '세탁기 커버 (드럼)', category: 'COVER', unit: '개', memo: '드럼세탁기/건조기 오염방지' },
  { code: 'MAT-CVR-WASH', name: '세탁기 커버 (트윈)', category: 'COVER', unit: '개', memo: '트윈워시/워시타워 오염방지' },
  { code: 'MAT-CVR-SOFA1', name: '소파 커버 1인', category: 'COVER', unit: '개', memo: '1인용 소파 보호 커버' },
  { code: 'MAT-CVR-SOFA2', name: '소파 커버 2인', category: 'COVER', unit: '개', memo: '2인용 소파 보호 커버' },
  { code: 'MAT-CVR-SOFA3', name: '소파 커버 3인', category: 'COVER', unit: '개', memo: '3인용 소파 보호 커버' },
  { code: 'MAT-CVR-TV55', name: '티브이 커버 55', category: 'COVER', unit: '개', memo: '55인치 이하 TV 액정 보호' },
  { code: 'MAT-CVR-TV65', name: '티브이 커버 65', category: 'COVER', unit: '개', memo: '65인치 TV 액정 보호' },
  { code: 'MAT-CVR-TV75', name: '티브이 커버 75', category: 'COVER', unit: '개', memo: '75인치 TV 액정 보호' },
  { code: 'MAT-CVR-TV80', name: '티브이 커버 80', category: 'COVER', unit: '개', memo: '80~85인치 TV 액정 보호' },
  { code: 'MAT-CVR-TV88', name: '티브이 커버 88', category: 'COVER', unit: '개', memo: '88인치 이상 대형 TV 보호' },

  // 3. 현장 보양재·운반장비·소모품 (6종)
  { code: 'MAT-FLR-01', name: '바닥보호재 (플로링보드)', category: 'TOOL', unit: '장', memo: '출발지/도착지 거실 및 복도 바닥 보양' },
  { code: 'MAT-CART-01', name: '이사 카트/구루마 (4바퀴)', category: 'TOOL', unit: '대', memo: '중량물 및 박스 운반용 구루마' },
  { code: 'MAT-TAPE-01', name: 'OPP 박스테이프', category: 'CONSUMABLE', unit: '롤', memo: '박스 밀봉 및 포장용 테이프 (원가기준정보 연동)' },
  { code: 'MAT-AIR-01', name: '에어캡 (뽁뽁이 롤)', category: 'CONSUMABLE', unit: '롤', memo: '유리/그릇/모니터/취급주의 완충 포장' },
  { code: 'MAT-WRAP-01', name: '스트레치 필름 (랩)', category: 'CONSUMABLE', unit: '롤', memo: '서랍 고정 및 가구 오염 방지 랩핑' },
  { code: 'MAT-SHOE-01', name: '작업용 덧신', category: 'CONSUMABLE', unit: '켤레', memo: '실내 작업용 위생 덧신' },
]

// 옷걸이 박스 제외 필터
export const isExcludedMaterial = (code?: string, name?: string): boolean => {
  if (code === 'MAT-HNG-01') return true
  if (name && (name.includes('옷걸이 박스') || name.includes('옷걸이박스'))) return true
  return false
}

const isExcludedTreatment = (treatment?: string): boolean => {
  return treatment === '폐기' || treatment === '존치'
}

export interface CalculatePackingMaterialsParams {
  items: any[]
  vehicles?: any[]
  labors?: any[]
  costStandards?: CostStandardData
  registeredMaterials?: RegisteredMaterialCatalogItem[]
  movingType?: string // 'P' 포장이사, 'G' 일반이사, 'K' 보관이사
}

export function calculatePackingMaterials({
  items,
  vehicles = [],
  labors = [],
  costStandards,
  registeredMaterials = [],
  movingType = 'P',
}: CalculatePackingMaterialsParams): PackingMaterialItem[] {
  // 1. 사용 가능한 등록 자재 사전 구성 (옷걸이 박스 제외)
  const catalogMap = new Map<string, RegisteredMaterialCatalogItem>()
  DEFAULT_REGISTERED_MATERIALS.forEach(m => {
    if (!isExcludedMaterial(m.code, m.name)) {
      catalogMap.set(m.code, m)
    }
  })
  registeredMaterials.forEach(m => {
    if (m.isActive !== false && !isExcludedMaterial(m.code, m.name)) {
      catalogMap.set(m.code, m)
    }
  })

  const getReg = (code: string, fallbackName: string, fallbackUnit = '개', fallbackSpec = '') => {
    const found = catalogMap.get(code)
    return {
      code,
      name: found?.name || fallbackName,
      unit: found?.unit || fallbackUnit,
      spec: found?.memo || fallbackSpec,
      source: (found ? 'REGISTERED' : 'GENERAL') as 'REGISTERED' | 'GENERAL',
    }
  }

  // 유효 물품 필터링 (수량 > 0)
  const validItems = (items || []).filter((it: any) => (Number(it.quantity) || 0) > 0)
  if (validItems.length === 0) return []

  // 총 유효 CBM 계산
  const totalCbm = validItems.reduce((sum: number, it: any) => {
    const qty = Number(it.quantity) || 0
    const baseCbm = isExcludedTreatment(it.treatment) || it.treatment === '내림' ? 0 : (Number(it.cbm) || 0)
    const innerCbm = Number(it.innerBoxCbm) || 0
    return sum + (baseCbm + innerCbm) * qty
  }, 0)

  const resultMap = new Map<string, PackingMaterialItem>()

  const addMaterial = (
    code: string,
    fallbackName: string,
    category: PackingMaterialItem['category'],
    qty: number,
    reasonPart: string,
    fallbackUnit = '개',
    fallbackSpec = '',
    forceSource?: 'REGISTERED' | 'GENERAL'
  ) => {
    if (qty <= 0 || isExcludedMaterial(code, fallbackName)) return
    const reg = getReg(code, fallbackName, fallbackUnit, fallbackSpec)
    const existing = resultMap.get(code)
    if (existing) {
      existing.quantity += qty
      if (reasonPart && !existing.reason.includes(reasonPart)) {
        existing.reason = existing.reason ? `${existing.reason}, ${reasonPart}` : reasonPart
      }
    } else {
      resultMap.set(code, {
        code,
        name: reg.name,
        category,
        unit: reg.unit,
        spec: reg.spec,
        quantity: qty,
        reason: reasonPart,
        source: forceSource || reg.source,
      })
    }
  }

  // ============================================================================
  // A. 박스 및 바구니 소요량 산출 (옷걸이 박스 미사용 -> 의류박스 & 이불박스로 통합 배분)
  // ============================================================================
  let clothesInnerCbm = 0
  let beddingInnerCbm = 0
  let bookInnerCbm = 0
  let kitchenBasketInnerCbm = 0
  let mediumBoxInnerCbm = 0
  let largeBoxInnerCbm = 0

  let explicitClothesBoxes = 0
  let explicitBeddingBoxes = 0
  let explicitBookBoxes = 0
  let explicitMediumBoxes = 0
  let explicitLargeBoxes = 0
  let explicitBaskets = 0

  const clothesReasons: string[] = []
  const beddingReasons: string[] = []
  const bookReasons: string[] = []
  const mediumBoxReasons: string[] = []
  const largeBoxReasons: string[] = []
  const basketReasons: string[] = []

  let bedCountForBedding = 0

  validItems.forEach((it: any) => {
    const qty = Number(it.quantity) || 0
    const name = String(it.name || '').trim()
    const spec = String(it.spec || '').trim()
    const loc = String(it.locationName || '').trim()
    const unitInner = Number(it.innerBoxCbm) || 0
    const unitBase = Number(it.cbm) || 0
    const totalInner = unitInner * qty

    // 1) 명시적으로 입력된 BOX / 바구니 품목 처리
    if (name.toUpperCase() === 'BOX' || name === '박스' || name.includes('이사박스') || name.includes('단프라')) {
      if (spec.includes('옷') || spec.includes('의류') || spec.includes('행거')) {
        explicitClothesBoxes += qty
        clothesReasons.push(`${loc || '지정'} BOX(${spec || '옷'}) ${qty}개`)
      } else if (spec.includes('이불') || spec.includes('침구')) {
        explicitBeddingBoxes += qty
        beddingReasons.push(`${loc || '지정'} BOX(${spec || '이불'}) ${qty}개`)
      } else if (spec.includes('소') || spec.includes('책')) {
        explicitBookBoxes += qty
        bookReasons.push(`${loc || '지정'} BOX(${spec}) ${qty}개`)
      } else if (spec.includes('대')) {
        explicitLargeBoxes += qty
        largeBoxReasons.push(`${loc || '지정'} BOX(${spec}) ${qty}개`)
      } else {
        explicitMediumBoxes += qty
        mediumBoxReasons.push(`${loc || '지정'} BOX(${spec || '일반/중'}) ${qty}개`)
      }
      return
    }

    if (name.includes('바구니')) {
      explicitBaskets += qty
      basketReasons.push(`${loc || '지정'} ${name} ${qty}개`)
      return
    }

    if (name.includes('침대') && !name.includes('애기') && !name.includes('유아')) {
      bedCountForBedding += qty
    }

    // 2) 가구/공간 내품(innerBoxCbm) 기반 박스/바구니 환산
    if (totalInner > 0) {
      if (name.includes('장농') || name.includes('옷장') || name.includes('붙박이')) {
        // 옷걸이 박스를 사용하지 않으므로 의류 70% -> 단프라 박스(의류), 이불 30% -> 단프라 박스(이불)
        clothesInnerCbm += totalInner * 0.72
        beddingInnerCbm += totalInner * 0.28
        clothesReasons.push(`${loc} ${name}${spec ? `(${spec})` : ''} 내품`)
        beddingReasons.push(`${loc} ${name}${spec ? `(${spec})` : ''} 이불`)
      } else if (name.includes('행거') || name.includes('시스템행거') || name.includes('드레스룸')) {
        clothesInnerCbm += totalInner
        clothesReasons.push(`${loc} ${name} 의류`)
      } else if (name.includes('서랍장') || name.includes('수납장') || name.includes('5단') || name.includes('3단')) {
        clothesInnerCbm += totalInner * 0.65
        mediumBoxInnerCbm += totalInner * 0.35
        clothesReasons.push(`${loc} ${name} 의류`)
      } else if (name.includes('책장') || name.includes('책상') || name.includes('책꽂이')) {
        bookInnerCbm += totalInner
        bookReasons.push(`${loc} ${name}${spec ? `(${spec})` : ''} 도서/문구`)
      } else if (
        loc.includes('주방') ||
        loc.includes('다용도') ||
        loc.includes('베란다') ||
        loc.includes('발코니') ||
        loc.includes('욕실') ||
        loc.includes('화장실') ||
        loc.includes('현관') ||
        name.includes('싱크') ||
        name.includes('냉장고') ||
        name.includes('김치냉장고') ||
        name.includes('팬트리') ||
        name.includes('신발장') ||
        name.includes('선반')
      ) {
        kitchenBasketInnerCbm += totalInner
        basketReasons.push(`${loc} ${name}`)
      } else if (name.includes('거실장') || name.includes('장식장') || name.includes('화장대')) {
        mediumBoxInnerCbm += totalInner
        mediumBoxReasons.push(`${loc} ${name} 내품`)
      } else {
        largeBoxInnerCbm += totalInner * 0.5
        mediumBoxInnerCbm += totalInner * 0.5
        largeBoxReasons.push(`${loc} ${name} 내품`)
      }
    } else if (
      (name.includes('팬트리') || name.includes('싱크대') || name.includes('신발장') || name.includes('앵글')) &&
      unitBase > 0
    ) {
      // 내품 CBM이 0으로 기록된 수납선반/싱크대살림은 기본 CBM의 60%를 바구니/중박스로 환산
      kitchenBasketInnerCbm += unitBase * qty * 0.6
      basketReasons.push(`${loc} ${name}(${qty})`)
    }
  })

  // 단프라 박스 (의류) MAT-BOX-CLO (개당 실효 적재 약 0.20 CBM)
  const calcClothesBoxes = explicitClothesBoxes + Math.ceil(clothesInnerCbm / 0.20)
  if (calcClothesBoxes > 0) {
    addMaterial(
      'MAT-BOX-CLO',
      '단프라 박스 (의류)',
      'BOX',
      calcClothesBoxes,
      clothesReasons.slice(0, 3).join(', ') + (clothesReasons.length > 3 ? ' 외 (옷걸이박스 대체 포함)' : ' (옷걸이박스 대체 포함)'),
      '개',
      '900 x 500 x 500'
    )
  }

  // 단프라 박스 (이불) MAT-BOX-BED (개당 실효 적재 약 0.25 CBM + 침대당 최소 1개 침구 고려)
  const calcBeddingFromInner = Math.ceil(beddingInnerCbm / 0.25)
  const minBedBedding = bedCountForBedding > 0 ? Math.max(calcBeddingFromInner, bedCountForBedding) : calcBeddingFromInner
  const calcBeddingBoxes = explicitBeddingBoxes + minBedBedding
  if (calcBeddingBoxes > 0) {
    const rList = [...beddingReasons]
    if (bedCountForBedding > 0 && rList.length === 0) {
      rList.push(`침대(${bedCountForBedding}개) 침구류 포장`)
    }
    addMaterial(
      'MAT-BOX-BED',
      '단프라 박스 (이불)',
      'BOX',
      calcBeddingBoxes,
      rList.slice(0, 3).join(', ') || '침구류 및 부피형 의류 포장',
      '개',
      '900 x 500 x 600'
    )
  }

  // 단프라 박스 (대) MAT-BOX-L (0.15 CBM)
  // 대형 잔짐 및 거실/방 잡화 여유분 (포장이사 시 총 CBM 비례 기본 소요 반영)
  const baseLargeBoxFromCbm = movingType !== 'G' && totalCbm >= 10 ? Math.max(2, Math.round(totalCbm * 0.25)) : 0
  const calcLargeBoxes = explicitLargeBoxes + Math.ceil(largeBoxInnerCbm / 0.15) + baseLargeBoxFromCbm
  if (calcLargeBoxes > 0) {
    addMaterial(
      'MAT-BOX-L',
      '단프라 박스 (대)',
      'BOX',
      calcLargeBoxes,
      largeBoxReasons.length > 0
        ? `${largeBoxReasons.slice(0, 2).join(', ')} 및 일반 대형 잡화`
        : '방/거실 부피형 생활잡화 및 소형가전 포장',
      '개',
      '700 × 450 × 500 CBM: 0.15'
    )
  }

  // 단프라 박스 (중) MAT-BOX-M (0.11 CBM)
  const baseMediumBoxFromCbm = movingType !== 'G' && totalCbm >= 8 ? Math.max(3, Math.round(totalCbm * 0.35)) : 0
  const calcMediumBoxes = explicitMediumBoxes + Math.ceil(mediumBoxInnerCbm / 0.11) + baseMediumBoxFromCbm
  if (calcMediumBoxes > 0) {
    addMaterial(
      'MAT-BOX-M',
      '단프라 박스 (중)',
      'BOX',
      calcMediumBoxes,
      mediumBoxReasons.length > 0
        ? `${mediumBoxReasons.slice(0, 2).join(', ')} 및 생활 소품`
        : '화장대·거실장·주방 생활잡화 표준 포장',
      '개',
      '600 x 410 x 470 CBM: 0.11'
    )
  }

  // 단프라 박스 (소) MAT-BOX-S (책박스, 0.06 CBM)
  const calcSmallBoxes = explicitBookBoxes + Math.ceil(bookInnerCbm / 0.06)
  if (calcSmallBoxes > 0) {
    addMaterial(
      'MAT-BOX-S',
      '단프라 박스 (소)',
      'BOX',
      calcSmallBoxes,
      bookReasons.slice(0, 3).join(', ') || '책장/책상 도서 및 중량물 분산 포장',
      '개',
      '480 x 350 x 350 책박스'
    )
  }

  // 이사 바구니 (적색/대) MAT-BSK-01 (개당 실효 0.10 CBM + 기본 욕실/현관/베란다용 최소 수량)
  const baseBaskets = movingType !== 'G' && totalCbm >= 6 ? Math.max(4, Math.round(totalCbm * 0.35)) : 0
  const calcBaskets = explicitBaskets + Math.max(baseBaskets, Math.ceil(kitchenBasketInnerCbm / 0.10) + 3)
  if (calcBaskets > 0) {
    const uniqBasketReasons = Array.from(new Set(basketReasons))
    addMaterial(
      'MAT-BSK-01',
      '이사 바구니 (적색/대)',
      'BASKET',
      calcBaskets,
      uniqBasketReasons.length > 0
        ? `${uniqBasketReasons.slice(0, 3).join(', ')} 및 욕실·현관·베란다 잡화`
        : '주방 식기/찬장, 욕실, 신발장, 베란다 잡화 운반',
      '개',
      '일반 짐 운반용 플라스틱 바구니'
    )
  }

  // ============================================================================
  // B. 가구·가전·침대 전용 보호커버 및 아이스박스 산출 (폐기/존치 제외)
  // ============================================================================
  const generalProtectItems: string[] = []

  validItems.forEach((it: any) => {
    if (isExcludedTreatment(it.treatment)) return

    const qty = Number(it.quantity) || 0
    const name = String(it.name || '').trim()
    const spec = String(it.spec || '').trim()
    const loc = String(it.locationName || '').trim()
    const label = `${loc ? `${loc} ` : ''}${name}${spec ? `(${spec})` : ''} ${qty}개`

    // 1) 침대 (매트리스 커버 + 머리판 커버)
    if (name.includes('침대') && !name.includes('쇼파') && !name.includes('소파')) {
      const upperSpec = spec.toUpperCase()
      if (spec.includes('라지킹') || spec.includes('수퍼킹') || spec.includes('슈퍼킹') || upperSpec.includes('LK') || upperSpec.includes('KK')) {
        addMaterial('MAT-CVR-BED3', '침대 매트리스 커버 (수퍼킹)', 'COVER', qty, label)
      } else if (spec.includes('퀸') || spec.includes('킹') || upperSpec.includes('Q') || upperSpec.includes('K')) {
        addMaterial('MAT-CVR-BED', '침대 매트리스 커버 (Q/K)', 'COVER', qty, label)
      } else {
        // S, SS, 싱글, 슈퍼싱글, 2층침대, 돌침대 등 기본
        const mattressMultiply = spec.includes('2층') ? 2 : 1
        addMaterial('MAT-CVR-BED2', '침대 매트리스 커버 (S/SS)', 'COVER', qty * mattressMultiply, label)
      }
      if (!spec.includes('매트만') && !name.includes('매트리스')) {
        addMaterial('MAT-CVR-BED-HEAD', '침대 머리판 커버', 'COVER', qty, `${name} 프레임 헤드 보호`)
      }
      return
    }

    // 2) 매트리스 단독 품목
    if (name.includes('매트리스')) {
      if (spec.includes('라지킹') || spec.includes('수퍼킹') || spec.includes('슈퍼킹')) {
        addMaterial('MAT-CVR-BED3', '침대 매트리스 커버 (수퍼킹)', 'COVER', qty, label)
      } else if (spec.includes('퀸') || spec.includes('킹')) {
        addMaterial('MAT-CVR-BED', '침대 매트리스 커버 (Q/K)', 'COVER', qty, label)
      } else {
        addMaterial('MAT-CVR-BED2', '침대 매트리스 커버 (S/SS)', 'COVER', qty, label)
      }
      return
    }

    // 3) 장농 / 옷장 (MAT-CVR-JANG: 커버 장농 3~4자, 1통=약 3~3.5자 기준)
    if (name.includes('장농') || name.includes('옷장')) {
      let bodyCount = qty
      const jaMatch = spec.match(/(\d+(\.\d+)?)\s*자/)
      if (jaMatch) {
        const ja = parseFloat(jaMatch[1])
        bodyCount = Math.max(1, Math.round(ja / 3.3)) * qty
      }
      addMaterial('MAT-CVR-JANG', '커버 장농 3~4자', 'COVER', bodyCount, `${label} (${bodyCount}통 환산)`)
      return
    }

    // 4) 서랍장
    if (name.includes('서랍장')) {
      if (spec.includes('5단') || spec.includes('4단') || spec.includes('대')) {
        addMaterial('MAT-CVR-DRAW5', '서랍장 커버 5단', 'COVER', qty, label)
      } else {
        addMaterial('MAT-CVR-DRAW3', '서랍장 커버 3단', 'COVER', qty, label)
      }
      return
    }

    // 5) 스타일러 / 에어드레서
    if (name.includes('스타일러') || name.includes('에어드레서')) {
      addMaterial('MAT-CVR-STYL', '스타일러 커버', 'COVER', qty, label)
      return
    }

    // 6) 김치냉장고 (냉장고보다 먼저 체크)
    if (name.includes('김치냉장고') || name.includes('김치')) {
      if (spec.includes('뚜껑') || spec.includes('일반')) {
        addMaterial('MAT-CVR-KIMC2', '커버 김치냉장고 뚜껑형', 'COVER', qty, label)
      } else {
        addMaterial('MAT-CVR-KIMC', '커버 김치냉장고 스텐드', 'COVER', qty, label)
      }
      addMaterial('MAT-ICE-BOX', '아이스박스', 'BASKET', qty, `${name} 김치/냉장식품 보냉 운반`)
      return
    }

    // 7) 일반/양문형/4도어 냉장고
    if (name.includes('냉장고')) {
      if (spec.includes('4도어') || spec.includes('비스포크') || spec.includes('오브제')) {
        addMaterial('MAT-CVR-FRI2', '커버 지펠 4도어', 'COVER', qty, `${label} 몸통`)
        addMaterial('MAT-CVR-FRI-DOOR2', '커버 냉장고 4도어 문짝', 'COVER', qty, `${label} 문짝`)
        addMaterial('MAT-ICE-BOX', '아이스박스', 'BASKET', qty * 2, `${name}(4도어) 냉장·냉동식품 보냉`)
      } else {
        addMaterial('MAT-CVR-FRI', '커버 지펠냉장고', 'COVER', qty, `${label} 몸통`)
        addMaterial('MAT-CVR-FRI-DOOR', '커버 지펠문짝 (2개)', 'COVER', qty, `${label} 문짝`)
        addMaterial('MAT-ICE-BOX', '아이스박스', 'BASKET', qty, `${name} 냉장·냉동식품 보냉`)
      }
      return
    }

    // 8) 세탁기 및 건조기
    if (name.includes('세탁기') || name.includes('건조기') || name.includes('워시타워')) {
      if (spec.includes('콤보') || spec.includes('트윈') || spec.includes('워시타워') || name.includes('워시타워')) {
        addMaterial('MAT-CVR-WASH', '세탁기 커버 (트윈)', 'COVER', qty, label)
      } else {
        addMaterial('MAT-CVR-WASH2', '세탁기 커버 (드럼)', 'COVER', qty, label)
      }
      return
    }

    // 9) 소파 / 쇼파
    if (name.includes('소파') || name.includes('쇼파')) {
      if (spec.includes('4인') || spec.includes('코너') || spec.includes('카우치') || spec.includes('대형')) {
        addMaterial('MAT-CVR-SOFA3', '소파 커버 3인', 'COVER', qty, `${label} (본체)`)
        addMaterial('MAT-CVR-SOFA1', '소파 커버 1인', 'COVER', qty, `${label} (보조/스툴)`)
      } else if (spec.includes('3인')) {
        addMaterial('MAT-CVR-SOFA3', '소파 커버 3인', 'COVER', qty, label)
      } else if (spec.includes('2인')) {
        addMaterial('MAT-CVR-SOFA2', '소파 커버 2인', 'COVER', qty, label)
      } else if (spec.includes('1인') || spec.includes('리클라이너')) {
        addMaterial('MAT-CVR-SOFA1', '소파 커버 1인', 'COVER', qty, label)
      } else {
        addMaterial('MAT-CVR-SOFA3', '소파 커버 3인', 'COVER', qty, label)
      }
      return
    }

    // 10) TV / 티브이 / 모니터
    if (name.toUpperCase().includes('TV') || name.includes('티브이') || name.includes('티비')) {
      const inchMatch = spec.match(/(\d+)/)
      const inch = inchMatch ? parseInt(inchMatch[1], 10) : 55
      if (inch >= 86) {
        addMaterial('MAT-CVR-TV88', '티브이 커버 88', 'COVER', qty, label)
      } else if (inch >= 78) {
        addMaterial('MAT-CVR-TV80', '티브이 커버 80', 'COVER', qty, label)
      } else if (inch >= 70) {
        addMaterial('MAT-CVR-TV75', '티브이 커버 75', 'COVER', qty, label)
      } else if (inch >= 60) {
        addMaterial('MAT-CVR-TV65', '티브이 커버 65', 'COVER', qty, label)
      } else {
        addMaterial('MAT-CVR-TV55', '티브이 커버 55', 'COVER', qty, label)
      }
      return
    }

    // 11) 자재 마스터에 사용자가 추가로 등록한 커버가 있는지 동적 매칭
    const customMatchedCover = Array.from(catalogMap.values()).find(
      m =>
        m.category === 'COVER' &&
        !m.code.startsWith('MAT-CVR-BED') &&
        !m.code.startsWith('MAT-CVR-FRI') &&
        !m.code.startsWith('MAT-CVR-KIMC') &&
        !m.code.startsWith('MAT-CVR-WASH') &&
        !m.code.startsWith('MAT-CVR-SOFA') &&
        !m.code.startsWith('MAT-CVR-TV') &&
        name.length >= 2 &&
        m.name.includes(name)
    )
    if (customMatchedCover) {
      addMaterial(
        customMatchedCover.code,
        customMatchedCover.name,
        'COVER',
        qty,
        label,
        customMatchedCover.unit || '개',
        customMatchedCover.memo || ''
      )
      return
    }

    // 12) 자재 마스터에 전용 커버가 없는 주요 가구/가전 -> 일반 다용도 보호자재(장농/서랍장 커버 호환 또는 다용도 패드) 안내
    if (
      name.includes('식탁') ||
      name.includes('거실장') ||
      name.includes('화장대') ||
      name.includes('책상') ||
      name.includes('책장') ||
      name.includes('장식장') ||
      name.includes('에어컨') ||
      name.includes('안마의자') ||
      name.includes('피아노') ||
      name.includes('식기세척기')
    ) {
      generalProtectItems.push(`${name}${qty > 1 ? `(${qty})` : ''}`)
    }
  })

  // 전용 커버 미등록 가구/가전(식탁, 에어컨, 책상, 화장대, 거실장 등)이 있는 경우 일반적인 다용도 퀼팅 패드(자바라) 산출 추가
  if (generalProtectItems.length > 0) {
    const uniqGeneral = Array.from(new Set(generalProtectItems))
    addMaterial(
      'GEN-PAD-MULTI',
      '다용도 가구·가전 보호패드 (자바라/모포)',
      'COVER',
      uniqGeneral.length,
      `전용커버 외 일반보호 (${uniqGeneral.slice(0, 5).join(', ')}${uniqGeneral.length > 5 ? ' 외' : ''})`,
      '장',
      '전용커버 미등록 가구/가전 스크래치 방지 (일반기준)',
      'GENERAL'
    )
  }

  // ============================================================================
  // C. 원가기준정보 연동 소모품 및 현장 보양/운반 장비 산출
  // ============================================================================

  // 1) OPP 박스테이프 (MAT-TAPE-01) -> 원가기준정보(costStandards)의 톤수별 기준 롤 수 참조!
  const tape5T = Number(costStandards?.tapeRolls5Ton ?? 8)
  const tape2_5T = Number(costStandards?.tapeRolls2_5Ton ?? 5)
  const tape1T = Number(costStandards?.tapeRolls1Ton ?? 3)

  let totalTapeRolls = 0
  const tapeReasonParts: string[] = []

  if (vehicles && vehicles.length > 0) {
    vehicles.forEach((v: any) => {
      const vName = String(v.name || '')
      const vCount = Number(v.count) || 1
      if (vName.includes('5톤') || Number(v.tonnage) >= 5) {
        totalTapeRolls += vCount * tape5T
        tapeReasonParts.push(`5톤 ${vCount}대×${tape5T}롤`)
      } else if (vName.includes('2.5톤') || vName.includes('3.5톤') || Number(v.tonnage) === 2.5) {
        totalTapeRolls += vCount * tape2_5T
        tapeReasonParts.push(`2.5톤 ${vCount}대×${tape2_5T}롤`)
      } else if (vName.includes('1톤') || vName.includes('1.4톤') || Number(v.tonnage) === 1) {
        totalTapeRolls += vCount * tape1T
        tapeReasonParts.push(`1톤 ${vCount}대×${tape1T}롤`)
      } else {
        totalTapeRolls += vCount * tape5T
        tapeReasonParts.push(`${vName} ${vCount}대×${tape5T}롤`)
      }
    })
  } else {
    // 투입 차량이 아직 선택되지 않은 경우 총 CBM 기준 권장 차량 톤수로 원가기준정보 적용
    if (totalCbm > 31) {
      const extraTone = totalCbm - 31 > 15 ? tape5T : totalCbm - 31 > 6.5 ? tape2_5T : tape1T
      const extraLabel = totalCbm - 31 > 15 ? `5톤(${tape5T}롤)` : totalCbm - 31 > 6.5 ? `2.5톤(${tape2_5T}롤)` : `1톤(${tape1T}롤)`
      totalTapeRolls = tape5T + extraTone
      tapeReasonParts.push(`예상 5톤(${tape5T}롤)+${extraLabel}`)
    } else if (totalCbm > 15) {
      totalTapeRolls = tape5T
      tapeReasonParts.push(`예상 5톤 1대 기준(${tape5T}롤)`)
    } else if (totalCbm > 6.5) {
      totalTapeRolls = tape2_5T
      tapeReasonParts.push(`예상 2.5톤 1대 기준(${tape2_5T}롤)`)
    } else {
      totalTapeRolls = tape1T
      tapeReasonParts.push(`예상 1톤 1대 기준(${tape1T}롤)`)
    }
  }

  addMaterial(
    'MAT-TAPE-01',
    'OPP 박스테이프',
    'CONSUMABLE',
    Math.max(1, totalTapeRolls),
    `원가기준정보 적용: ${tapeReasonParts.join(' + ')}`,
    '롤',
    `원가기준 (5톤:${tape5T}롤 / 2.5톤:${tape2_5T}롤 / 1톤:${tape1T}롤)`
  )

  // 2) 에어캡 (뽁뽁이 롤) MAT-AIR-01
  const airCapRolls = totalCbm >= 18 ? 2 : 1
  addMaterial(
    'MAT-AIR-01',
    '에어캡 (뽁뽁이 롤)',
    'CONSUMABLE',
    airCapRolls,
    '주방 도자기/유리식기, 모니터, 거울, 파손주의 물품 완충 포장',
    '롤'
  )

  // 3) 스트레치 필름 (랩) MAT-WRAP-01
  const wrapRolls = totalCbm >= 18 ? 2 : 1
  addMaterial(
    'MAT-WRAP-01',
    '스트레치 필름 (랩)',
    'CONSUMABLE',
    wrapRolls,
    '서랍장/수납장 열림 고정 및 가구/소파 오염 방지 랩핑',
    '롤'
  )

  // 4) 바닥보호재 (플로링보드) MAT-FLR-01
  const floorBoards = totalCbm >= 20 ? 15 : totalCbm >= 10 ? 10 : 6
  addMaterial(
    'MAT-FLR-01',
    '바닥보호재 (플로링보드)',
    'PROTECTION',
    floorBoards,
    '출발지·도착지 현관~거실 주요 이동 동선 바닥 보양',
    '장'
  )

  // 5) 이사 카트/구루마 (4바퀴) MAT-CART-01
  const totalWorkers = labors.reduce((sum: number, l: any) => sum + (Number(l.count) || 0), 0)
  const cartCount = totalWorkers > 0 ? Math.max(2, Math.min(5, totalWorkers)) : (totalCbm >= 15 ? 4 : 2)
  addMaterial(
    'MAT-CART-01',
    '이사 카트/구루마 (4바퀴)',
    'PROTECTION',
    cartCount,
    '단프라 박스, 바구니 및 대형 가전/가구 운반',
    '대'
  )

  // 6) 작업용 덧신 MAT-SHOE-01
  const shoeCount = totalWorkers > 0 ? totalWorkers : (totalCbm >= 15 ? 4 : 2)
  addMaterial(
    'MAT-SHOE-01',
    '작업용 덧신',
    'CONSUMABLE',
    shoeCount,
    `투입 작업 인원(${shoeCount}명) 실내 위생 작업용`,
    '켤레'
  )

  return Array.from(resultMap.values())
}
