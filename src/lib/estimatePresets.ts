export interface PresetItem {
  locationName: string // '안방', '거실', '주방', '방1', '방2', '베란다', '기타/미지정'
  name: string
  spec: string
  quantity: number
  cbm: number
  innerBoxCbm: number
  treatment?: '이동' | '폐기' | '내림' | '경유'
}

export interface EstimatePreset {
  id: string
  name: string
  badge: string
  estimatedCbm: string
  estimatedTonnage: string
  targetDescription: string
  color: string
  items: PresetItem[]
}

export const ESTIMATE_PRESETS: EstimatePreset[] = [
  {
    id: 'preset_studio',
    name: '원룸 / 1인 가구',
    badge: '소형 (원룸·오피스텔)',
    estimatedCbm: '약 8 ~ 12 CBM',
    estimatedTonnage: '1톤 ~ 1.5톤',
    targetDescription: '원룸, 오피스텔 거주 1인 단독 가구 추천',
    color: 'emerald',
    items: [
      { locationName: '안방', name: '침대', spec: 'S/SS', quantity: 1, cbm: 1.1, innerBoxCbm: 0 },
      { locationName: '안방', name: '서랍장', spec: '3단', quantity: 1, cbm: 0.3, innerBoxCbm: 0 },
      { locationName: '안방', name: '책상', spec: '단면(120x60)', quantity: 1, cbm: 0.4, innerBoxCbm: 0 },
      { locationName: '안방', name: '의자', spec: '일반/사무용', quantity: 1, cbm: 0.2, innerBoxCbm: 0 },
      { locationName: '거실', name: 'TV', spec: '40~50인치', quantity: 1, cbm: 0.3, innerBoxCbm: 0 },
      { locationName: '거실', name: '수납장/행거', spec: '일반', quantity: 1, cbm: 0.4, innerBoxCbm: 0 },
      { locationName: '주방', name: '냉장고', spec: '일반/소형', quantity: 1, cbm: 0.6, innerBoxCbm: 0 },
      { locationName: '주방', name: '전자렌지', spec: '일반', quantity: 1, cbm: 0.1, innerBoxCbm: 0 },
      { locationName: '베란다', name: '세탁기', spec: '일반(통돌이)', quantity: 1, cbm: 0.8, innerBoxCbm: 0 },
      { locationName: '기타/미지정', name: 'BOX', spec: '소형/의류/잡화', quantity: 15, cbm: 0.12, innerBoxCbm: 0 },
    ]
  },
  {
    id: 'preset_two_room',
    name: '투룸 / 신혼 (15~20평)',
    badge: '중소형 (15~20평)',
    estimatedCbm: '약 18 ~ 25 CBM',
    estimatedTonnage: '2.5톤 ~ 3톤',
    targetDescription: '신혼부부, 2인 가구, 빌라/투룸 추천',
    color: 'blue',
    items: [
      { locationName: '안방', name: '침대', spec: 'Q/K', quantity: 1, cbm: 1.6, innerBoxCbm: 0 },
      { locationName: '안방', name: '화장대', spec: '일반(100x50)', quantity: 1, cbm: 0.7, innerBoxCbm: 0 },
      { locationName: '안방', name: '서랍장', spec: '5단', quantity: 1, cbm: 0.6, innerBoxCbm: 0 },
      { locationName: '거실', name: '소파', spec: '2~3인용', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '거실', name: '거실장', spec: '일반(150x40)', quantity: 1, cbm: 0.6, innerBoxCbm: 0 },
      { locationName: '거실', name: 'TV', spec: '55~65인치', quantity: 1, cbm: 0.4, innerBoxCbm: 0 },
      { locationName: '거실', name: '에어컨', spec: '스탠드', quantity: 1, cbm: 0.6, innerBoxCbm: 0 },
      { locationName: '주방', name: '냉장고', spec: '양문형(800L)', quantity: 1, cbm: 1.6, innerBoxCbm: 0 },
      { locationName: '주방', name: '식탁', spec: '2인용', quantity: 1, cbm: 0.5, innerBoxCbm: 0 },
      { locationName: '주방', name: '전자렌지/밥솥대', spec: '수납장', quantity: 1, cbm: 0.4, innerBoxCbm: 0 },
      { locationName: '방1', name: '옷장/행거', spec: '시스템행거', quantity: 1, cbm: 0.8, innerBoxCbm: 0 },
      { locationName: '방1', name: '책상', spec: '일반', quantity: 1, cbm: 0.5, innerBoxCbm: 0 },
      { locationName: '베란다', name: '세탁기', spec: '드럼', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '기타/미지정', name: 'BOX', spec: '의류/주방/잡화', quantity: 30, cbm: 0.12, innerBoxCbm: 0 },
    ]
  },
  {
    id: 'preset_three_room_24',
    name: '아파트 24~26평 (3인 가구)',
    badge: '국민평형 (24평 3인)',
    estimatedCbm: '약 30 ~ 38 CBM',
    estimatedTonnage: '5톤 1대 (기본)',
    targetDescription: '아파트 24~26평, 방3개, 3인 가구 표준',
    color: 'indigo',
    items: [
      { locationName: '안방', name: '침대', spec: 'Q/K', quantity: 1, cbm: 1.6, innerBoxCbm: 0 },
      { locationName: '안방', name: '장농', spec: '1통', quantity: 3, cbm: 1.1, innerBoxCbm: 0 },
      { locationName: '안방', name: '화장대', spec: '수납형', quantity: 1, cbm: 0.8, innerBoxCbm: 0 },
      { locationName: '안방', name: '서랍장', spec: '5단', quantity: 1, cbm: 0.6, innerBoxCbm: 0 },
      { locationName: '거실', name: '소파', spec: '3~4인용', quantity: 1, cbm: 1.4, innerBoxCbm: 0 },
      { locationName: '거실', name: 'TV', spec: '65~75인치', quantity: 1, cbm: 0.5, innerBoxCbm: 0 },
      { locationName: '거실', name: '거실장', spec: '확장형', quantity: 1, cbm: 0.8, innerBoxCbm: 0 },
      { locationName: '거실', name: '에어컨', spec: '스탠드', quantity: 1, cbm: 0.6, innerBoxCbm: 0 },
      { locationName: '거실', name: '공기청정기', spec: '일반', quantity: 1, cbm: 0.2, innerBoxCbm: 0 },
      { locationName: '주방', name: '냉장고', spec: '양문형(850L)', quantity: 1, cbm: 1.8, innerBoxCbm: 0 },
      { locationName: '주방', name: '김치냉장고', spec: '스탠드형', quantity: 1, cbm: 1.2, innerBoxCbm: 0 },
      { locationName: '주방', name: '식탁', spec: '4인용(의자포함)', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '주방', name: '렌지대/수납장', spec: '일반', quantity: 1, cbm: 0.5, innerBoxCbm: 0 },
      { locationName: '방1', name: '침대', spec: 'S/SS (자녀)', quantity: 1, cbm: 1.1, innerBoxCbm: 0 },
      { locationName: '방1', name: '책상/책장', spec: '학생용 세트', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '방2', name: '서랍장/옷장', spec: '드레스룸', quantity: 1, cbm: 0.8, innerBoxCbm: 0 },
      { locationName: '베란다', name: '세탁기', spec: '드럼', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '베란다', name: '건조기', spec: '일반', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '기타/미지정', name: 'BOX', spec: '의류/침구/주방', quantity: 50, cbm: 0.12, innerBoxCbm: 0 },
    ]
  },
  {
    id: 'preset_four_room_34',
    name: '아파트 32~34평 (4인 가구)',
    badge: '대중적 평형 (34평 4인)',
    estimatedCbm: '약 45 ~ 55 CBM',
    estimatedTonnage: '5톤 1대 + 1톤~2.5톤',
    targetDescription: '아파트 32~34평, 방3~4개, 4인 가구 표준 풀세트',
    color: 'purple',
    items: [
      { locationName: '안방', name: '침대', spec: 'K (킹)', quantity: 1, cbm: 1.8, innerBoxCbm: 0 },
      { locationName: '안방', name: '장농', spec: '1통', quantity: 4, cbm: 1.1, innerBoxCbm: 0 },
      { locationName: '안방', name: '화장대', spec: '수납형 대형', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '안방', name: '서랍장', spec: '5단', quantity: 1, cbm: 0.6, innerBoxCbm: 0 },
      { locationName: '거실', name: '소파', spec: '4인용 카우치/리클라이너', quantity: 1, cbm: 1.8, innerBoxCbm: 0 },
      { locationName: '거실', name: 'TV', spec: '75~85인치', quantity: 1, cbm: 0.7, innerBoxCbm: 0 },
      { locationName: '거실', name: '거실장', spec: '대형', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '거실', name: '에어컨', spec: '스탠드(2in1)', quantity: 1, cbm: 0.8, innerBoxCbm: 0 },
      { locationName: '거실', name: '공기청정기', spec: '타워형', quantity: 1, cbm: 0.3, innerBoxCbm: 0 },
      { locationName: '거실', name: '안마의자', spec: '일반', quantity: 1, cbm: 1.2, innerBoxCbm: 0 },
      { locationName: '주방', name: '냉장고', spec: '양문형 4도어(900L)', quantity: 1, cbm: 2.0, innerBoxCbm: 0 },
      { locationName: '주방', name: '김치냉장고', spec: '스탠드 대형', quantity: 1, cbm: 1.4, innerBoxCbm: 0 },
      { locationName: '주방', name: '식탁', spec: '6인용(의자포함)', quantity: 1, cbm: 1.5, innerBoxCbm: 0 },
      { locationName: '주방', name: '주방수납장', spec: '키큰장/아일랜드', quantity: 1, cbm: 0.8, innerBoxCbm: 0 },
      { locationName: '방1', name: '침대', spec: 'SS (자녀1)', quantity: 1, cbm: 1.1, innerBoxCbm: 0 },
      { locationName: '방1', name: '책상/책장', spec: '세트', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '방1', name: '서랍장', spec: '3단', quantity: 1, cbm: 0.3, innerBoxCbm: 0 },
      { locationName: '방2', name: '침대', spec: 'SS (자녀2)', quantity: 1, cbm: 1.1, innerBoxCbm: 0 },
      { locationName: '방2', name: '책상/책장', spec: '세트', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '방3', name: '서재/드레스룸', spec: '행거 및 선반', quantity: 1, cbm: 1.2, innerBoxCbm: 0 },
      { locationName: '베란다', name: '세탁기', spec: '드럼(21kg)', quantity: 1, cbm: 1.1, innerBoxCbm: 0 },
      { locationName: '베란다', name: '건조기', spec: '대형', quantity: 1, cbm: 1.1, innerBoxCbm: 0 },
      { locationName: '기타/미지정', name: 'BOX', spec: '의류/침구/주방/도서', quantity: 70, cbm: 0.12, innerBoxCbm: 0 },
    ]
  },
  {
    id: 'preset_large_45',
    name: '아파트 40평형 이상 대형',
    badge: '대형 평형 (40평 이상)',
    estimatedCbm: '약 60 ~ 75 CBM',
    estimatedTonnage: '5톤 2대 or 5톤+5톤',
    targetDescription: '아파트 40평형 이상, 방4~5개, 다량 가구 및 짐',
    color: 'rose',
    items: [
      { locationName: '안방', name: '침대', spec: 'K (킹/라지킹)', quantity: 1, cbm: 2.0, innerBoxCbm: 0 },
      { locationName: '안방', name: '장농', spec: '1통', quantity: 5, cbm: 1.1, innerBoxCbm: 0 },
      { locationName: '안방', name: '화장대', spec: '고급 수납형', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '안방', name: '서랍장', spec: '5단', quantity: 2, cbm: 0.6, innerBoxCbm: 0 },
      { locationName: '거실', name: '소파', spec: '코너/리클라이너 대형', quantity: 1, cbm: 2.2, innerBoxCbm: 0 },
      { locationName: '거실', name: 'TV', spec: '85인치 이상', quantity: 1, cbm: 0.9, innerBoxCbm: 0 },
      { locationName: '거실', name: '거실장', spec: '대형 풀세트', quantity: 1, cbm: 1.2, innerBoxCbm: 0 },
      { locationName: '거실', name: '에어컨', spec: '스탠드(2in1)', quantity: 1, cbm: 0.8, innerBoxCbm: 0 },
      { locationName: '거실', name: '안마의자', spec: '프리미엄', quantity: 1, cbm: 1.4, innerBoxCbm: 0 },
      { locationName: '거실', name: '피아노', spec: '업라이트', quantity: 1, cbm: 1.5, innerBoxCbm: 0 },
      { locationName: '주방', name: '냉장고', spec: '대형 4도어', quantity: 1, cbm: 2.2, innerBoxCbm: 0 },
      { locationName: '주방', name: '김치냉장고', spec: '스탠드 대형', quantity: 1, cbm: 1.4, innerBoxCbm: 0 },
      { locationName: '주방', name: '식탁', spec: '6~8인용', quantity: 1, cbm: 1.8, innerBoxCbm: 0 },
      { locationName: '주방', name: '와인셀러/수납장', spec: '일반', quantity: 1, cbm: 0.8, innerBoxCbm: 0 },
      { locationName: '방1', name: '침대', spec: 'Q/SS', quantity: 1, cbm: 1.4, innerBoxCbm: 0 },
      { locationName: '방1', name: '책상/책장', spec: '원목 대형', quantity: 1, cbm: 1.2, innerBoxCbm: 0 },
      { locationName: '방2', name: '침대', spec: 'SS', quantity: 1, cbm: 1.1, innerBoxCbm: 0 },
      { locationName: '방2', name: '책상/의자', spec: '일반', quantity: 1, cbm: 0.8, innerBoxCbm: 0 },
      { locationName: '방3', name: '서재 책장', spec: '5단(2개)', quantity: 2, cbm: 0.8, innerBoxCbm: 0 },
      { locationName: '방4', name: '드레스룸', spec: '시스템 옷장', quantity: 1, cbm: 1.5, innerBoxCbm: 0 },
      { locationName: '베란다', name: '세탁기/건조기', spec: '워시타워', quantity: 1, cbm: 2.2, innerBoxCbm: 0 },
      { locationName: '베란다', name: '선반/잡화', spec: '조립식 앵글', quantity: 2, cbm: 0.6, innerBoxCbm: 0 },
      { locationName: '기타/미지정', name: 'BOX', spec: '대용량 포장박스', quantity: 90, cbm: 0.12, innerBoxCbm: 0 },
    ]
  }
]
