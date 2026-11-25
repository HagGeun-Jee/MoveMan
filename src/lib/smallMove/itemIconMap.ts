// 기존 물품정보(StandardItem: 품목명 + 규격) -> 아이콘 키 매핑 (방식 C: 품목명 기준 + 핵심 품목은 규격 변형)
// DB 컬럼 변경 없이 이름/규격 문자열만으로 결정한다.

const has = (s: string, ...keys: string[]) => keys.some((k) => s.includes(k))

export function iconKeyFor(rawName: string, rawSpec = ''): string {
  const name = (rawName || '').trim()
  const spec = (rawSpec || '').trim()
  const n = name.replace(/\s/g, '')

  // ── 규격 변형이 큰 핵심 품목 ──
  if (n === '김치냉장고') {
    if (has(spec, '뚜껑') && has(spec, '2도어')) return 'kimchi_top_2'
    if (has(spec, '뚜껑')) return 'kimchi_top'
    if (has(spec, '3도어')) return 'kimchi_stand_3'
    return 'kimchi_stand'
  }
  if (n === '냉장고') {
    if (has(spec, '4도어') && has(spec, '슬림')) return 'fridge_4door_slim'
    if (has(spec, '4도어')) return 'fridge_4door_wide'
    if (has(spec, '양문')) return 'fridge_2door'
    if (has(spec, '500')) return 'fridge_m_500'
    if (has(spec, '소형', '150')) return 'fridge_s'
    return 'fridge_m'
  }
  if (n === '세탁기') return has(spec, '워시타워') ? 'washtower' : 'washer_d'
  if (n === '건조기') return 'dryer'
  if (n === 'TV') return has(spec, '55미만') ? 'tv_s' : 'tv_l'
  if (n === 'TV장') return 'tvstand'
  if (n === '모니터') return has(spec, '32', '34') ? 'monitor_l' : 'monitor_s'
  if (n === '컴퓨터') return 'pc_tower'
  if (n === '에어컨') return has(spec, '벽걸이') ? 'ac_wall' : 'ac_stand'
  if (n === '계절가전') {
    if (has(spec, '창문형')) return 'ac_window'
    if (has(spec, '선풍기', '난로')) return 'fan'
    return 'purifier'
  }
  if (n === '장농') return has(spec, '4자') ? 'wardrobe_5' : 'wardrobe_3'
  if (n === '붙박이장') return 'wardrobe_5'
  if (n === '침대') {
    if (has(spec, '2층', '벙커')) return 'bunk'
    if (has(spec, '매트리스')) return 'mat_q'
    if (has(spec, 'S/SS')) return 'bed_s'
    return 'bed_q'
  }
  if (n === '소파') {
    if (has(spec, '스툴')) return 'stool'
    if (has(spec, '코너')) return 'sofa_corner'
    if (has(spec, '4인')) return 'sofa_4'
    if (has(spec, '1인')) return 'sofa_1'
    if (has(spec, '2인')) return 'sofa_2'
    return 'sofa_3'
  }
  if (n === '서랍장') {
    if (has(spec, '협탁')) return 'nightstand'
    if (has(spec, '이동식')) return 'drawer_mobile'
    if (has(spec, '아일랜드')) return 'drawer_wide'
    if (has(spec, '플라스틱')) return 'drawer_plastic'
    if (has(spec, '3단')) return 'drawer_3'
    if (has(spec, '5단')) return 'drawer_5'
    return 'drawer'
  }
  if (n === '앵글') {
    if (has(spec, '2단') && has(spec, '100')) return 'rack_2w'
    if (has(spec, '2단')) return 'rack_2'
    if (has(spec, '접이식')) return 'rack_fold'
    if (has(spec, '120')) return 'rack_wide'
    return 'rack'
  }
  if (n === '책장') {
    if (has(spec, '소형')) return 'shelf_small'
    if (has(spec, '3x5')) return 'shelf_3x5'
    if (has(spec, '2x5')) return 'shelf_2x5'
    return 'shelf'
  }
  if (n === '팬트리선반') {
    if (has(spec, 'ㄴ자')) return 'pantry_l'
    if (has(spec, 'ㄷ자')) return 'pantry_u'
    return 'pantry_1'
  }
  if (n === '항아리') return has(spec, '대') ? 'jar_l' : 'jar'
  if (n === '화분') {
    if (has(spec, '소형')) return 'plant_s'
    if (has(spec, '특대', '돌화분')) return 'plant_xl'
    if (has(spec, '대형')) return 'plant_l'
    return 'plant'
  }
  if (n === '화장대') {
    if (has(spec, '콘솔')) return 'vanity_console'
    if (has(spec, '수납')) return 'vanity_storage'
    return 'vanity'
  }
  if (n === '청소기') return has(spec, '로봇') ? 'robot_vac' : 'vacuum'
  if (n === '주방가전') {
    if (has(spec, '가스', '인덕션')) return 'gas_stove'
    if (has(spec, '광파', '오븐')) return 'oven_wave'
    if (has(spec, '에어프라이어')) return 'airfryer'
    if (has(spec, '밥솥')) return 'ricecooker'
    if (has(spec, '캡슐')) return 'coffee_capsule'
    if (has(spec, '커피')) return 'coffee'
    if (has(spec, '정수기') && has(spec, '미니')) return 'water_mini'
    if (has(spec, '정수기')) return 'water'
    return 'micro'
  }
  if (n === '자전거') {
    if (has(spec, '안장')) return 'scooter_seat'
    if (has(spec, '유아', '수동')) return 'scooter_kids'
    if (has(spec, '킥보드')) return 'scooter'
    if (has(spec, '전기')) return 'ebike'
    if (has(spec, '세발', '아동')) return 'tricycle'
    return 'bike'
  }
  if (n === '유모차') {
    if (has(spec, '휴대용')) return 'stroller_compact'
    if (has(spec, '웨건')) return 'wagon'
    if (has(spec, '전동차')) return 'kids_car'
    return 'stroller'
  }
  if (n === '운동기구') {
    if (has(spec, '로잉')) return 'rowing'
    if (has(spec, '워킹패드')) return 'walkingpad'
    if (has(spec, '캐디백')) return 'golfbag'
    if (has(spec, '자전거', '바이크')) return 'exbike'
    if (has(spec, '접힘')) return 'treadmill_fold'
    return 'treadmill'
  }
  if (n === '식탁') {
    if (has(spec, '아일랜드')) return 'island_table'
    if (has(spec, '2인')) return 'table_2'
    if (has(spec, '6인', '8인')) return 'table_large'
    return 'table'
  }
  if (n === '소파테이블') {
    if (has(spec, '사이드', '미니')) return 'side_table'
    if (has(spec, '리프트')) return 'lift_table'
    if (has(spec, '대리석', '통유리')) return 'glass_table'
    if (has(spec, '교자상', '접이식')) return 'fold_table'
    return 'coffee_table'
  }
  if (n === '스탠드등') {
    if (has(spec, '선반', '다구')) return 'lamp_shelf'
    if (has(spec, '아치')) return 'lamp_arch'
    if (has(spec, '책상', '자바라', 'LED')) return 'lamp_desk'
    if (has(spec, '단스탠드', '협탁')) return 'lamp_mini'
    return 'lamp'
  }
  if (n === '행거') {
    if (has(spec, '스탠드')) return 'hanger_stand'
    if (has(spec, '이동식', '바퀴')) return 'hanger_wheel'
    if (has(spec, '1칸')) return 'hanger_1'
    if (has(spec, '2칸')) return 'hanger_2'
    if (has(spec, '3칸')) return 'hanger_3'
    if (has(spec, '시스템')) return 'hanger_system'
    return 'hanger'
  }
  if (n === '책상') {
    if (has(spec, '소형')) return 'desk_small'
    if (has(spec, '코너', '대형')) return 'desk_corner'
    if (has(spec, '모션')) return 'desk_motion'
    if (has(spec, '독서실')) return 'desk_study'
    return 'desk'
  }
  if (n === '캐리어') {
    if (has(spec, '기내')) return 'carrier_s'
    if (has(spec, '대형')) return 'carrier_l'
    return 'bag'
  }
  if (n === '캠핑/생활기타') {
    if (has(spec, '캠핑')) return 'camping_tent'
    if (has(spec, '건조대', '다리미')) return 'drying_rack'
    if (has(spec, '안마기')) return 'foot_massager'
    return 'box'
  }
  if (n === '커튼') {
    if (has(spec, '버티컬')) return 'curtain_vertical'
    if (has(spec, '블라인드')) return 'curtain_blind'
    return 'curtain'
  }
  if (n === '블라인드') return 'curtain_blind'
  if (n === '피아노') {
    if (has(spec, '디지털')) return 'piano_digital'
    if (has(spec, '그랜드')) return 'piano_grand'
    return 'piano'
  }
  if (n === '의자') {
    if (has(spec, '식탁')) return 'chair_dining'
    if (has(spec, '와이드')) return 'stool_wide'
    if (has(spec, '스툴')) return 'stool'
    return 'chair'
  }

  if (n === '수납장/교구장') {
    if (has(spec, '아기장', '베이비')) return 'baby_cab'
    if (has(spec, '교구장', '장난감')) return 'toy_cab'
    if (has(spec, '렌지대', '밥솥')) return 'kitchen_stand'
    return 'multi_cab'
  }

  if (n === '반려동물용품') {
    if (has(spec, '캣휠')) return 'catwheel'
    if (has(spec, '울타리')) return 'dogfence'
    if (has(spec, '애견집', '캔넬', '계단')) return 'doghouse'
    return 'cattower'
  }
  if (n === '안마의자') {
    if (has(spec, '세라젬')) return 'ceragem'
    if (has(spec, '프리미엄', '대형')) return 'massage_premium'
    return 'massage'
  }
  if (n === '욕실용품') {
    if (has(spec, '빨래바구니', '햄퍼')) return 'laundry_basket'
    if (has(spec, '비데')) return 'bidet'
    return 'bath_goods'
  }

  // ── 품목명 기준 ──
  const byName: Record<string, string> = {
    공기청정기: 'purifier',
    가스레인지: 'gas_stove',
    금고: 'safe',
    '김치통/아이스박스': 'box',
    리빙박스: 'box',
    BOX: 'box',
    반려동물용품: 'cattower',
    사운드바: 'soundbar',
    서랍장: 'drawer',
    소파테이블: 'coffee_table',
    '수납장/교구장': 'shelf',
    스타일러: 'styler',
    스탠드등: 'lamp',
    식기세척기: 'dishwasher',
    신발장: 'shoes',
    싱크대살림: 'kitchen_cab',
    안마의자: 'massage',
    앵글: 'rack',
    욕실용품: 'box',
    유모차: 'stroller',
    전동킥보드: 'scooter',
    전신거울: 'mirror',
    장식장: 'shelf',
    책상: 'desk',
    책장: 'shelf',
    캐리어: 'bag',
    '캠핑/생활기타': 'box',
    팬트리선반: 'rack',
    피아노: 'piano',
    항아리: 'jar',
    행거: 'hanger',
    화분: 'plant',
    화장대: 'vanity',
  }
  return byName[n] || 'generic'
}
