export interface PresetItem {
  locationName: string // '안방', '거실', '주방', '방1', '방2', '베란다', '기타/미지정'
  name: string
  spec: string
  quantity: number
  cbm: number
  innerBoxCbm: number
  treatment?: '이동' | '폐기' | '내림' | '경유' | '존치'
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
      { locationName: '안방', name: '침대', spec: 'S/SS', quantity: 1, cbm: 1.2, innerBoxCbm: 0 },
      { locationName: '안방', name: '서랍장', spec: '3단 600', quantity: 1, cbm: 0.22, innerBoxCbm: 0.22 },
      { locationName: '안방', name: '책상', spec: '소형', quantity: 1, cbm: 0.5, innerBoxCbm: 0 },
      { locationName: '안방', name: '의자', spec: '책상용', quantity: 1, cbm: 0.5, innerBoxCbm: 0 },
      { locationName: '거실', name: 'TV', spec: '55미만', quantity: 1, cbm: 0.3, innerBoxCbm: 0 },
      { locationName: '거실', name: '서랍장', spec: '협탁', quantity: 1, cbm: 0.1, innerBoxCbm: 0 },
      { locationName: '주방', name: '냉장고', spec: '일반 300 이하', quantity: 1, cbm: 0.5, innerBoxCbm: 0.2 },
      { locationName: '주방', name: '주방가전', spec: '전자레인지', quantity: 1, cbm: 0.1, innerBoxCbm: 0 },
      { locationName: '베란다', name: '세탁기', spec: '일반/드럼', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '기타/미지정', name: 'BOX', spec: '옷', quantity: 10, cbm: 0.25, innerBoxCbm: 0 },
      { locationName: '기타/미지정', name: 'BOX', spec: '중', quantity: 10, cbm: 0.17, innerBoxCbm: 0 },
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
      { locationName: '안방', name: '침대', spec: 'Q/K', quantity: 1, cbm: 1.8, innerBoxCbm: 0 },
      { locationName: '안방', name: '화장대', spec: '일반(100x50x140)', quantity: 1, cbm: 0.7, innerBoxCbm: 0 },
      { locationName: '안방', name: '서랍장', spec: '5단 600', quantity: 1, cbm: 0.35, innerBoxCbm: 0.35 },
      { locationName: '거실', name: '소파', spec: '3인', quantity: 1, cbm: 1.6, innerBoxCbm: 0 },
      { locationName: '거실', name: '거실장', spec: 'TV장', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '거실', name: 'TV', spec: '65', quantity: 1, cbm: 0.45, innerBoxCbm: 0 },
      { locationName: '거실', name: '에어컨', spec: '스탠드', quantity: 1, cbm: 1.1, innerBoxCbm: 0 },
      { locationName: '주방', name: '냉장고', spec: '양문형 2도어', quantity: 1, cbm: 1.6, innerBoxCbm: 1.5 },
      { locationName: '주방', name: '식탁', spec: '2인', quantity: 1, cbm: 0.5, innerBoxCbm: 0 },
      { locationName: '주방', name: '주방가전', spec: '전자레인지', quantity: 1, cbm: 0.1, innerBoxCbm: 0 },
      { locationName: '주방', name: '주방가전', spec: '전기밥솥', quantity: 1, cbm: 0.08, innerBoxCbm: 0 },
      { locationName: '방1', name: '장농', spec: '중/주니어', quantity: 1, cbm: 1.0, innerBoxCbm: 0.8 },
      { locationName: '방1', name: '책상', spec: '소형', quantity: 1, cbm: 0.5, innerBoxCbm: 0 },
      { locationName: '방1', name: '의자', spec: '책상용', quantity: 1, cbm: 0.5, innerBoxCbm: 0 },
      { locationName: '베란다', name: '세탁기', spec: '일반/드럼', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '기타/미지정', name: 'BOX', spec: '옷', quantity: 15, cbm: 0.25, innerBoxCbm: 0 },
      { locationName: '기타/미지정', name: 'BOX', spec: '중', quantity: 15, cbm: 0.17, innerBoxCbm: 0 },
    ]
  },
  {
    id: 'preset_three_room_24',
    name: '아파트 24~26평 (3인 가구)',
    badge: '국민평형 (24평 3인)',
    estimatedCbm: '약 32 ~ 40 CBM',
    estimatedTonnage: '5톤 1대 (기본)',
    targetDescription: '아파트 24~26평, 방3개, 3인 가구 표준 (장농 내품 박스 CBM 포함)',
    color: 'indigo',
    items: [
      { locationName: '안방', name: '침대', spec: 'Q/K', quantity: 1, cbm: 1.8, innerBoxCbm: 0 },
      { locationName: '안방', name: '장농', spec: '1통', quantity: 3, cbm: 1.1, innerBoxCbm: 0.9 }, // 1통당 1.1 + 0.9 = 2.0 CBM
      { locationName: '안방', name: '화장대', spec: '수납(120x50x150)', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '안방', name: '서랍장', spec: '5단 800', quantity: 1, cbm: 0.5, innerBoxCbm: 0.5 },
      { locationName: '거실', name: '소파', spec: '4인', quantity: 1, cbm: 2.3, innerBoxCbm: 0 },
      { locationName: '거실', name: 'TV', spec: '75', quantity: 1, cbm: 0.6, innerBoxCbm: 0 },
      { locationName: '거실', name: '거실장', spec: 'TV장', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '거실', name: '에어컨', spec: '2 IN 1', quantity: 1, cbm: 1.5, innerBoxCbm: 0 },
      { locationName: '거실', name: '공기청정기', spec: '일반', quantity: 1, cbm: 0.2, innerBoxCbm: 0 },
      { locationName: '주방', name: '냉장고', spec: '양문형 대형 4도어', quantity: 1, cbm: 2.4, innerBoxCbm: 1.6 },
      { locationName: '주방', name: '김치냉장고', spec: '스탠드 중형 3도어', quantity: 1, cbm: 0.9, innerBoxCbm: 0.6 },
      { locationName: '주방', name: '식탁', spec: '4인', quantity: 1, cbm: 0.8, innerBoxCbm: 0 },
      { locationName: '주방', name: '주방소형가전', spec: '보통', quantity: 1, cbm: 0.2, innerBoxCbm: 0 },
      { locationName: '방1', name: '침대', spec: 'S/SS', quantity: 1, cbm: 1.2, innerBoxCbm: 0 },
      { locationName: '방1', name: '책상', spec: '분리형/1M이하', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '방1', name: '의자', spec: '책상용', quantity: 1, cbm: 0.5, innerBoxCbm: 0 },
      { locationName: '방1', name: '책장', spec: '2x5단', quantity: 1, cbm: 0.5, innerBoxCbm: 0.5 },
      { locationName: '방2', name: '서랍장', spec: '3단 800', quantity: 1, cbm: 0.25, innerBoxCbm: 0.25 },
      { locationName: '베란다', name: '세탁기', spec: '일반/드럼', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '베란다', name: '건조기', spec: '일반/드럼', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '기타/미지정', name: 'BOX', spec: '옷', quantity: 20, cbm: 0.25, innerBoxCbm: 0 },
      { locationName: '기타/미지정', name: 'BOX', spec: '이불', quantity: 10, cbm: 0.33, innerBoxCbm: 0 },
      { locationName: '기타/미지정', name: 'BOX', spec: '중', quantity: 15, cbm: 0.17, innerBoxCbm: 0 },
    ]
  },
  {
    id: 'preset_four_room_34',
    name: '아파트 32~34평 (4인 가구)',
    badge: '대중적 평형 (34평 4인)',
    estimatedCbm: '약 48 ~ 58 CBM',
    estimatedTonnage: '5톤 1대 + 1톤~2.5톤',
    targetDescription: '아파트 32~34평, 방3~4개, 4인 가구 표준 풀세트 (장농·서랍장·냉장고 내품 CBM 합산)',
    color: 'purple',
    items: [
      { locationName: '안방', name: '침대', spec: '라지킹', quantity: 1, cbm: 2.3, innerBoxCbm: 0 },
      { locationName: '안방', name: '장농', spec: '1통', quantity: 4, cbm: 1.1, innerBoxCbm: 0.9 }, // 4통 = (1.1 + 0.9) * 4 = 8.0 CBM
      { locationName: '안방', name: '화장대', spec: '수납(120x50x150)', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '안방', name: '서랍장', spec: '5단 800', quantity: 1, cbm: 0.5, innerBoxCbm: 0.5 },
      { locationName: '거실', name: '소파', spec: '4인', quantity: 1, cbm: 2.3, innerBoxCbm: 0 },
      { locationName: '거실', name: 'TV', spec: '85', quantity: 1, cbm: 0.8, innerBoxCbm: 0 },
      { locationName: '거실', name: '거실장', spec: 'TV장', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '거실', name: '에어컨', spec: '2 IN 1', quantity: 1, cbm: 1.5, innerBoxCbm: 0 },
      { locationName: '거실', name: '공기청정기', spec: '타워/대형', quantity: 1, cbm: 0.3, innerBoxCbm: 0 },
      { locationName: '거실', name: '안마의자', spec: '프리미엄/대형', quantity: 1, cbm: 2.5, innerBoxCbm: 0 },
      { locationName: '주방', name: '냉장고', spec: '양문형 대형 4도어', quantity: 1, cbm: 2.4, innerBoxCbm: 1.6 },
      { locationName: '주방', name: '김치냉장고', spec: '스탠드 대형 4도어', quantity: 1, cbm: 1.3, innerBoxCbm: 0.8 },
      { locationName: '주방', name: '식탁', spec: '6인', quantity: 1, cbm: 1.2, innerBoxCbm: 0 },
      { locationName: '방1', name: '침대', spec: 'S/SS', quantity: 1, cbm: 1.2, innerBoxCbm: 0 },
      { locationName: '방1', name: '책상', spec: '분리형/1M이하', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '방1', name: '의자', spec: '책상용', quantity: 1, cbm: 0.5, innerBoxCbm: 0 },
      { locationName: '방1', name: '책장', spec: '2x5단', quantity: 1, cbm: 0.5, innerBoxCbm: 0.5 },
      { locationName: '방1', name: '서랍장', spec: '3단 600', quantity: 1, cbm: 0.22, innerBoxCbm: 0.22 },
      { locationName: '방2', name: '침대', spec: 'S/SS', quantity: 1, cbm: 1.2, innerBoxCbm: 0 },
      { locationName: '방2', name: '책상', spec: '소형', quantity: 1, cbm: 0.5, innerBoxCbm: 0 },
      { locationName: '방2', name: '의자', spec: '책상용', quantity: 1, cbm: 0.5, innerBoxCbm: 0 },
      { locationName: '방3', name: '책장', spec: '3x5단', quantity: 1, cbm: 0.65, innerBoxCbm: 0.65 },
      { locationName: '방3', name: '앵글', spec: '철재 120x45x180', quantity: 1, cbm: 1.0, innerBoxCbm: 0.5 },
      { locationName: '베란다', name: '세탁기', spec: '콤보/신형', quantity: 1, cbm: 1.5, innerBoxCbm: 0 },
      { locationName: '베란다', name: '건조기', spec: '대형', quantity: 1, cbm: 1.1, innerBoxCbm: 0 },
      { locationName: '기타/미지정', name: 'BOX', spec: '옷', quantity: 30, cbm: 0.25, innerBoxCbm: 0 },
      { locationName: '기타/미지정', name: 'BOX', spec: '이불', quantity: 15, cbm: 0.33, innerBoxCbm: 0 },
      { locationName: '기타/미지정', name: 'BOX', spec: '중', quantity: 20, cbm: 0.17, innerBoxCbm: 0 },
    ]
  },
  {
    id: 'preset_large_45',
    name: '아파트 40평형 이상 대형',
    badge: '대형 평형 (40평 이상)',
    estimatedCbm: '약 65 ~ 80 CBM',
    estimatedTonnage: '5톤 2대 or 5톤+5톤',
    targetDescription: '아파트 40평형 이상, 방4~5개, 다량 가구 및 짐 (장농 5통 내품 CBM 풀세트)',
    color: 'rose',
    items: [
      { locationName: '안방', name: '침대', spec: '라지킹', quantity: 1, cbm: 2.3, innerBoxCbm: 0 },
      { locationName: '안방', name: '장농', spec: '1통', quantity: 5, cbm: 1.1, innerBoxCbm: 0.9 }, // 5통 = (1.1 + 0.9) * 5 = 10.0 CBM
      { locationName: '안방', name: '화장대', spec: '수납(120x50x150)', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '안방', name: '서랍장', spec: '5단 800', quantity: 2, cbm: 0.5, innerBoxCbm: 0.5 },
      { locationName: '거실', name: '소파', spec: '아쿠아텍스 코너형', quantity: 1, cbm: 5.0, innerBoxCbm: 0 },
      { locationName: '거실', name: 'TV', spec: '98이상', quantity: 1, cbm: 1.2, innerBoxCbm: 0 },
      { locationName: '거실', name: '거실장', spec: 'TV장', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '거실', name: '에어컨', spec: '2 IN 1', quantity: 1, cbm: 1.5, innerBoxCbm: 0 },
      { locationName: '거실', name: '안마의자', spec: '프리미엄/대형', quantity: 1, cbm: 2.5, innerBoxCbm: 0 },
      { locationName: '거실', name: '피아노', spec: '업라이트', quantity: 1, cbm: 1.5, innerBoxCbm: 0 },
      { locationName: '주방', name: '냉장고', spec: '양문형 대형 4도어', quantity: 1, cbm: 2.4, innerBoxCbm: 1.6 },
      { locationName: '주방', name: '김치냉장고', spec: '스탠드 대형 4도어', quantity: 1, cbm: 1.3, innerBoxCbm: 0.8 },
      { locationName: '주방', name: '식탁', spec: '8인', quantity: 1, cbm: 1.5, innerBoxCbm: 0 },
      { locationName: '방1', name: '침대', spec: 'Q/K', quantity: 1, cbm: 1.8, innerBoxCbm: 0 },
      { locationName: '방1', name: '책상', spec: '대형/라운드', quantity: 1, cbm: 2.0, innerBoxCbm: 0 },
      { locationName: '방1', name: '의자', spec: '책상용', quantity: 1, cbm: 0.5, innerBoxCbm: 0 },
      { locationName: '방2', name: '침대', spec: 'S/SS', quantity: 1, cbm: 1.2, innerBoxCbm: 0 },
      { locationName: '방2', name: '책상', spec: '분리형/1M이하', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '방2', name: '의자', spec: '책상용', quantity: 1, cbm: 0.5, innerBoxCbm: 0 },
      { locationName: '방3', name: '책장', spec: '3x5단', quantity: 2, cbm: 0.65, innerBoxCbm: 0.65 },
      { locationName: '방4', name: '장식장', spec: '기본+내품추가', quantity: 1, cbm: 1.0, innerBoxCbm: 0 },
      { locationName: '베란다', name: '세탁기', spec: '콤보/신형', quantity: 1, cbm: 1.5, innerBoxCbm: 0 },
      { locationName: '베란다', name: '건조기', spec: '대형', quantity: 1, cbm: 1.1, innerBoxCbm: 0 },
      { locationName: '베란다', name: '앵글', spec: '철재 120x45x180', quantity: 2, cbm: 1.0, innerBoxCbm: 0.5 },
      { locationName: '기타/미지정', name: 'BOX', spec: '옷', quantity: 40, cbm: 0.25, innerBoxCbm: 0 },
      { locationName: '기타/미지정', name: 'BOX', spec: '이불', quantity: 20, cbm: 0.33, innerBoxCbm: 0 },
      { locationName: '기타/미지정', name: 'BOX', spec: '중', quantity: 25, cbm: 0.17, innerBoxCbm: 0 },
    ]
  }
]
