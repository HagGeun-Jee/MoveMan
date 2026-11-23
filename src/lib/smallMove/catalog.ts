// 소형이사(원룸/투룸) 전용 물품 카탈로그 - 기존 물품정보(StandardItem)와 1:1 매칭/동기화 지원
// 고객 화면(그림/예시 팝업)과 서버 견적 산정이 같은 CBM 기준을 공유한다.

export type SmallCategory = 'APPLIANCE' | 'FURNITURE' | 'BED' | 'BOX' | 'ETC'

export const SMALL_CATEGORY_LABEL: Record<SmallCategory, string> = {
  APPLIANCE: '가전',
  FURNITURE: '가구',
  BED: '침대·매트리스',
  BOX: '박스·짐',
  ETC: '기타 대형물',
}

export interface SmallItem {
  id: string
  category: SmallCategory
  name: string
  spec: string // 고객 표시용 규격 설명
  cbm: number // 1개당 기본 부피(㎥) (DB StandardItem과 동기화 시 덮어씀)
  innerCbm?: number // 1개당 내품 부피(㎥) (DB StandardItem.defaultInnerCbm 동기화)
  icon: string // 이모지 백업
  guide: string // 팝업 예시 설명
  size: string // 대략 크기
  stdName?: string // 매칭되는 StandardItem.name
  stdSpec?: string // 매칭되는 StandardItem.spec
  needsDisassembly?: boolean
  max?: number
}

export type SmallMoveAction = '이동' | '폐기' | '내림' | '존치'
export const SMALL_MOVE_ACTIONS: SmallMoveAction[] = ['이동', '폐기', '내림', '존치']

// DB에 저장되는 물품 항목 (기존 {id, qty} 및 검수 수정/추가 {id, qty, name, spec, cbm, innerCbm, action} 호환)
export interface SmallMoveItemEntry {
  id: string
  qty: number
  name?: string
  spec?: string
  cbm?: number
  innerCbm?: number
  action?: SmallMoveAction
  dispose?: boolean // 하위 호환
}

export const SMALL_ITEMS: SmallItem[] = [
  // ── 가전 ──
  { id: 'fridge_s', category: 'APPLIANCE', name: '냉장고', spec: '소형 (~150L)', cbm: 0.3, icon: '🧊', size: '가로 50 × 높이 85cm', stdName: '냉장고', stdSpec: '소형150 이하', guide: '원룸 빌트인 옆이나 책상 아래 두는 작은 냉장고입니다. 문이 1개 또는 2개이고 허리 높이 정도입니다.' },
  { id: 'fridge_m', category: 'APPLIANCE', name: '냉장고', spec: '중형 (200~500L)', cbm: 1.0, icon: '🧊', size: '가로 60 × 높이 150~170cm', stdName: '냉장고', stdSpec: '일반 중형 500 이하', guide: '일반 2도어 냉장고입니다. 위 냉동실, 아래 냉장실 구조이고 성인 키 정도입니다.' },
  { id: 'fridge_l', category: 'APPLIANCE', name: '냉장고', spec: '대형 (양문형)', cbm: 1.6, icon: '🧊', size: '가로 90 × 높이 180cm', stdName: '냉장고', stdSpec: '양문형 2도어', guide: '양문형 또는 4도어 대형 냉장고입니다. 투룸 이상에서 주로 사용합니다.' },
  { id: 'washer_t', category: 'APPLIANCE', name: '세탁기', spec: '통돌이 (~12kg)', cbm: 1.0, icon: '🌀', size: '가로 55 × 높이 95cm', stdName: '세탁기', stdSpec: '일반/드럼', guide: '위에서 빨래를 넣는 통돌이 세탁기입니다.' },
  { id: 'washer_d', category: 'APPLIANCE', name: '세탁기', spec: '드럼 (~21kg)', cbm: 1.0, icon: '🌀', size: '가로 60 × 높이 85cm', stdName: '세탁기', stdSpec: '일반/드럼', guide: '앞문이 동그란 드럼 세탁기입니다. 건조기와 함께 있으면 따로 체크해 주세요.' },
  { id: 'dryer', category: 'APPLIANCE', name: '건조기', spec: '일반/드럼', cbm: 1.0, icon: '♨️', size: '가로 60 × 높이 85cm', stdName: '건조기', stdSpec: '일반/드럼', guide: '세탁기 옆이나 위에 설치한 건조기입니다. 스택형 설치면 분리 작업이 필요합니다.' },
  { id: 'tv_s', category: 'APPLIANCE', name: 'TV', spec: '55인치 미만', cbm: 0.3, icon: '📺', size: '가로 120cm 이내', stdName: 'TV', stdSpec: '55미만', guide: '벽걸이 또는 TV장 위에 올린 중소형 TV입니다.' },
  { id: 'tv_l', category: 'APPLIANCE', name: 'TV', spec: '65인치 이상', cbm: 0.35, icon: '📺', size: '가로 145cm 이상', stdName: 'TV', stdSpec: '65', guide: '거실에 두는 큰 TV입니다. 포장 박스가 있으면 알려주세요.' },
  { id: 'ac_stand', category: 'APPLIANCE', name: '에어컨', spec: '스탠드형', cbm: 1.1, icon: '❄️', size: '높이 170cm', stdName: '에어컨', stdSpec: '스탠드', guide: '바닥에 세워 두는 스탠드 에어컨입니다. 탈거 후 운송만 가능하며(별도 탈거 비용 없음), 도착지 재설치는 전문업체에 별도 의뢰하셔야 합니다.' },
  { id: 'ac_wall', category: 'APPLIANCE', name: '에어컨', spec: '벽걸이형 (실내기+실외기)', cbm: 0.5, icon: '❄️', size: '실내기 가로 90cm', stdName: '에어컨', stdSpec: '벽걸이', guide: '벽에 거는 에어컨입니다. 탈거 후 운송만 가능하며(별도 탈거 비용 없음), 도착지 재설치는 전문업체에 별도 의뢰하셔야 합니다.' },
  { id: 'micro', category: 'APPLIANCE', name: '전자레인지/에어프라이어', spec: '소형 가전', cbm: 0.1, icon: '🍲', size: '가로 45cm 이내', stdName: '주방가전', stdSpec: '전자레인지', guide: '주방 선반 위의 작은 가전입니다.' },
  { id: 'purifier', category: 'APPLIANCE', name: '공기청정기/제습기', spec: '일반', cbm: 0.2, icon: '🌬️', size: '높이 60~70cm', stdName: '공기청정기', stdSpec: '일반', guide: '바닥에 두는 중소형 가전입니다.' },
  { id: 'pc_tower', category: 'APPLIANCE', name: '컴퓨터 본체', spec: '데스크톱 PC', cbm: 0.1, icon: '🖥️', size: '가로 20 × 높이 45cm', stdName: '컴퓨터', stdSpec: '미들타워', guide: '책상 아래나 옆에 두는 데스크톱 본체입니다. 노트북은 박스에 함께 담아 주세요. 이동 전 케이블은 분리하고 사진을 찍어 두면 재설치가 편합니다.', max: 10 },
  { id: 'monitor_s', category: 'APPLIANCE', name: '모니터', spec: '24~27인치', cbm: 0.15, icon: '🖥️', size: '가로 50~62cm', stdName: '모니터', stdSpec: '24~27인치', guide: '일반 컴퓨터 모니터입니다. 포장 박스가 있으면 파손 위험이 줄어듭니다.', max: 10 },
  { id: 'monitor_l', category: 'APPLIANCE', name: '모니터', spec: '32인치 이상/와이드', cbm: 0.2, icon: '🖥️', size: '가로 70cm 이상', stdName: '모니터', stdSpec: '32~34', guide: '32인치 이상 대형 또는 울트라와이드 모니터입니다. 깨지기 쉬워 별도 포장이 필요합니다.', max: 10 },

  // ── 가구 ──
  { id: 'wardrobe_3', category: 'FURNITURE', name: '옷장(장농)', spec: '3자 이하', cbm: 0.9, icon: '🚪', size: '가로 90 × 높이 180cm', stdName: '장농', stdSpec: '3자', guide: '문이 2~3개인 작은 장농입니다. 분해가 필요할 수 있습니다.', needsDisassembly: true },
  { id: 'wardrobe_5', category: 'FURNITURE', name: '옷장(장농)', spec: '4자 이상', cbm: 1.2, icon: '🚪', size: '가로 120~150 × 높이 200cm', stdName: '장농', stdSpec: '4자', guide: '안방에 두는 일반 장농입니다. 보통 분해·조립이 필요합니다.', needsDisassembly: true },
  { id: 'drawer', category: 'FURNITURE', name: '서랍장', spec: '4단 800', cbm: 0.38, icon: '🗄️', size: '가로 60~80 × 높이 100cm', stdName: '서랍장', stdSpec: '4단 800', guide: '옷을 넣는 서랍장입니다. 서랍 안 옷은 미리 비워 주세요.' },
  { id: 'hanger', category: 'FURNITURE', name: '행거', spec: '이동식/조립식', cbm: 0.3, icon: '👗', size: '가로 100~150cm', stdName: '행거', stdSpec: '이동식(바퀴)', guide: '옷을 걸어두는 철제 행거입니다. 옷은 박스에 따로 포장합니다.' },
  { id: 'desk', category: 'FURNITURE', name: '책상', spec: '표준 1200', cbm: 0.5, icon: '🖥️', size: '가로 120 × 높이 75cm', stdName: '책상', stdSpec: '표준 1200', guide: '일반 컴퓨터/공부 책상입니다. 서랍이나 상판 책장이 있으면 규격이 커집니다.' },
  { id: 'chair', category: 'FURNITURE', name: '의자', spec: '책상용/사무용', cbm: 0.5, icon: '🪑', size: '높이 100cm', stdName: '의자', stdSpec: '책상용', guide: '책상 의자입니다. 식탁 의자는 개수대로 추가해 주세요.' },
  { id: 'shelf', category: 'FURNITURE', name: '책장/수납장', spec: '2x5단', cbm: 0.6, icon: '📚', size: '가로 80 × 높이 180cm', stdName: '책장', stdSpec: '2x5단', guide: '책이나 물건을 올려두는 수납장입니다. 내용물은 비워야 합니다.' },
  { id: 'sofa_2', category: 'FURNITURE', name: '소파', spec: '2인용', cbm: 1.5, icon: '🛋️', size: '가로 150cm', stdName: '소파', stdSpec: '2인', guide: '2명이 앉는 작은 소파입니다.' },
  { id: 'sofa_3', category: 'FURNITURE', name: '소파', spec: '3인용', cbm: 2.0, icon: '🛋️', size: '가로 200cm 이상', stdName: '소파', stdSpec: '3인', guide: '거실용 일반 소파입니다. 현관과 엘리베이터 진입이 가능한지 사진을 올려주세요.' },
  { id: 'table', category: 'FURNITURE', name: '식탁', spec: '4인', cbm: 0.8, icon: '🍽️', size: '가로 120~140cm', stdName: '식탁', stdSpec: '4인', guide: '의자 포함 식탁 세트면 의자는 별도로 추가해 주세요.' },
  { id: 'shoes', category: 'FURNITURE', name: '신발장/수납 선반', spec: '신발장 가구(외장)', cbm: 0.8, icon: '👟', size: '가로 60~80cm', stdName: '신발장', stdSpec: '신발장 가구(외장)', guide: '현관 신발장이 빌트인이 아닌 이동식인 경우만 체크하세요.' },
  { id: 'mirror', category: 'FURNITURE', name: '전신거울/화장대', spec: '일반', cbm: 0.15, icon: '🪞', size: '높이 150cm', stdName: '전신거울', stdSpec: '일반', guide: '깨지기 쉬워 별도 포장이 필요합니다.' },

  // ── 침대·매트리스 ──
  { id: 'bed_s', category: 'BED', name: '침대(프레임)', spec: '싱글/슈퍼싱글', cbm: 1.2, icon: '🛏️', size: '가로 100~110 × 길이 200cm', stdName: '침대', stdSpec: 'S/SS', guide: '1인용 침대 프레임입니다. 분해가 필요합니다.', needsDisassembly: true },
  { id: 'bed_q', category: 'BED', name: '침대(프레임)', spec: '퀸/킹', cbm: 1.8, icon: '🛏️', size: '가로 150~180 × 길이 200cm', stdName: '침대', stdSpec: 'Q/K', guide: '2인용 침대 프레임입니다. 분해·조립이 필요합니다.', needsDisassembly: true },
  { id: 'mat_s', category: 'BED', name: '매트리스', spec: '싱글/슈퍼싱글', cbm: 1.0, icon: '🛌', size: '가로 100~110 × 길이 200cm', stdName: '침대', stdSpec: '매트리스', guide: '프레임 없이 바닥에 쓰는 매트리스도 이 항목으로 선택하세요.' },
  { id: 'mat_q', category: 'BED', name: '매트리스', spec: '퀸/킹', cbm: 1.0, icon: '🛌', size: '가로 150~180 × 길이 200cm', stdName: '침대', stdSpec: '매트리스', guide: '2인용 매트리스입니다. 커버가 있으면 이동 시 오염을 막을 수 있습니다.' },

  // ── 박스·짐 ──
  { id: 'box', category: 'BOX', name: '이사 박스', spec: '표준 박스 (중)', cbm: 0.1, icon: '📦', size: '50 × 40 × 40cm', stdName: 'BOX', stdSpec: '중', guide: '이삿짐 센터 표준 박스 크기입니다. 책이나 그릇은 작은 박스에, 옷은 큰 박스에 담으면 됩니다.', max: 150 },
  { id: 'bag', category: 'BOX', name: '대형 가방/캐리어', spec: '대형 위탁용', cbm: 0.122, icon: '🧳', size: '높이 65cm', stdName: '캐리어', stdSpec: '대형 위탁용', guide: '캐리어, 대형 쇼핑백 등 박스 대신 쓰는 짐입니다.', max: 30 },
  { id: 'plant', category: 'BOX', name: '화분', spec: '중형 무릎~허리', cbm: 0.2, icon: '🪴', size: '높이 80cm', stdName: '화분', stdSpec: '중형 무릎~허리', guide: '큰 화분만 체크해 주세요. 작은 화분은 박스에 포함합니다.', max: 20 },

  // ── 기타 대형물 ──
  { id: 'bike', category: 'ETC', name: '자전거', spec: '성인용', cbm: 0.5, icon: '🚲', size: '길이 170cm', stdName: '자전거', stdSpec: '성인용', guide: '일반 자전거입니다.' },
  { id: 'treadmill', category: 'ETC', name: '런닝머신/운동기구', spec: '러닝머신 펼침', cbm: 1.8, icon: '🏃', size: '길이 150cm 이상', stdName: '운동기구', stdSpec: '러닝머신 펼침', guide: '런닝머신, 헬스 기구 등 무거운 대형 운동기구입니다. 사진 등록이 필요합니다.', max: 5 },
  { id: 'cattower', category: 'ETC', name: '캣타워/펫 대형용품', spec: '캣타워(중/대)', cbm: 0.6, icon: '🐈', size: '높이 150cm', stdName: '반려동물용품', stdSpec: '캣타워(중/대)', guide: '캣타워, 강아지 펜스 등 부피가 큰 반려용품입니다.' },
  { id: 'piano', category: 'ETC', name: '피아노/대형 악기', spec: '업라이트', cbm: 1.5, icon: '🎹', size: '가로 150cm', stdName: '피아노', stdSpec: '업라이트', guide: '피아노는 별도 전문 인력이 필요하여 견적 시 상담으로 안내됩니다.', max: 2 },
]

export const SMALL_ITEM_MAP: Record<string, SmallItem> = Object.fromEntries(
  SMALL_ITEMS.map((i) => [i.id, i])
)

// 품목명으로 소형이사 카테고리 추론 (물품정보에서 추가된 항목 분류용)
export function inferSmallCategory(name: string): SmallCategory {
  const n = (name || '').replace(/\s/g, '')
  if (/냉장고|세탁기|건조기|TV|에어컨|청정기|제습기|가전|컴퓨터|모니터|스타일러|식기세척기|청소기|사운드바|안마의자|스탠드등/.test(n)) return 'APPLIANCE'
  if (/침대|매트리스/.test(n)) return 'BED'
  if (/BOX|박스|캐리어|리빙박스|김치통|화분|싱크대살림|욕실용품/.test(n)) return 'BOX'
  if (/장농|붙박이장|서랍장|행거|책상|의자|책장|소파|식탁|신발장|거울|화장대|수납장|교구장|장식장|앵글|팬트리|TV장/.test(n)) return 'FURNITURE'
  return 'ETC'
}

// 저장된 물품 항목(기존 id만 있는 형태 + 검수 수정/추가된 형태)을 화면·계산용으로 해석
export function resolveSmallMoveItem(
  entry: SmallMoveItemEntry,
  syncedMap: Record<string, SmallItem> = SMALL_ITEM_MAP
) {
  const def = syncedMap[entry.id] ?? SMALL_ITEM_MAP[entry.id]
  const name = entry.name || def?.stdName || def?.name || entry.id
  const spec = entry.spec !== undefined ? entry.spec : def?.stdSpec || def?.spec || ''
  const cbm = entry.cbm !== undefined ? Number(entry.cbm) : def?.cbm ?? 0
  const innerCbm = entry.innerCbm !== undefined ? Number(entry.innerCbm) : def?.innerCbm ?? 0
  const action: SmallMoveAction =
    entry.action && SMALL_MOVE_ACTIONS.includes(entry.action)
      ? entry.action
      : entry.dispose
      ? '폐기'
      : '이동'
  const excludeBase = action !== '이동'
  // 폐기/내림/존치 시 기본 CBM은 제외하고 내품 CBM만 합산, 이동 시 기본+내품 합산
  const effectiveUnitCbm = excludeBase ? innerCbm : cbm + innerCbm
  const category: SmallCategory = def?.category || inferSmallCategory(name)
  const max = def?.max ?? 50
  return {
    id: entry.id,
    qty: entry.qty,
    name,
    spec,
    cbm,
    innerCbm,
    action,
    excludeBase,
    effectiveUnitCbm,
    category,
    max,
    displayName: entry.name || def?.name || entry.id,
    displaySpec: entry.spec !== undefined ? entry.spec : def?.spec || '',
  }
}

export const HOME_TYPES = [
  { id: 'ONE_ROOM', label: '원룸', desc: '약 10평 이하 / 방 1개 + 주방', baseCbm: 0 },
  { id: 'TWO_ROOM', label: '투룸', desc: '약 10~20평 / 방 2개', baseCbm: 0 },
  { id: 'THREE_ROOM', label: '쓰리룸 이상', desc: '방 3개 이상 (상담 권장)', baseCbm: 0 },
] as const

export type HomeTypeId = (typeof HOME_TYPES)[number]['id']

export const STATUS_LABEL: Record<string, string> = {
  RECEIVED: '접수 완료',
  REVIEWING: '검토 중',
  QUOTED: '견적 확정',
  BOOKED: '예약 완료',
  CANCELED: '취소',
}

// 차량 명칭 표기 통일 (탑차 -> 화물)
export const fixVehicleLabel = (s: string) => (s || '').split('탑차').join('화물')
