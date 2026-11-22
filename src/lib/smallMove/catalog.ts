// 소형이사(원룸/투룸) 전용 물품 카탈로그 - 컨택이사 StandardItem과 별도 구성
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
  spec: string // 규격 설명 (예: 300L급)
  cbm: number // 1개당 부피(㎥) 서버 산정 기준
  icon: string // 그림(이모지)
  guide: string // 팝업 예시 설명 (고객이 이해하기 쉬운 크기/예시)
  size: string // 대략 크기
  needsDisassembly?: boolean
  max?: number
}

export const SMALL_ITEMS: SmallItem[] = [
  // ── 가전 ──
  { id: 'fridge_s', category: 'APPLIANCE', name: '냉장고', spec: '소형 (~150L)', cbm: 0.5, icon: '🧊', size: '가로 50 × 높이 85cm', guide: '원룸 빌트인 옆이나 책상 아래 두는 작은 냉장고입니다. 문이 1개이고 허리 높이 정도입니다.' },
  { id: 'fridge_m', category: 'APPLIANCE', name: '냉장고', spec: '중형 (200~350L)', cbm: 1.0, icon: '🧊', size: '가로 60 × 높이 150~170cm', guide: '일반 2도어 냉장고입니다. 위 냉동실, 아래 냉장실 구조이고 성인 키 정도입니다.' },
  { id: 'fridge_l', category: 'APPLIANCE', name: '냉장고', spec: '대형 (400L~/양문형)', cbm: 1.7, icon: '🧊', size: '가로 90 × 높이 180cm', guide: '양문형 또는 4도어 대형 냉장고입니다. 투룸 이상에서 주로 사용합니다.' },
  { id: 'washer_t', category: 'APPLIANCE', name: '세탁기', spec: '통돌이 (~12kg)', cbm: 0.6, icon: '🌀', size: '가로 55 × 높이 95cm', guide: '위에서 빨래를 넣는 통돌이 세탁기입니다.' },
  { id: 'washer_d', category: 'APPLIANCE', name: '세탁기', spec: '드럼 (~21kg)', cbm: 0.8, icon: '🌀', size: '가로 60 × 높이 85cm', guide: '앞문이 동그란 드럼 세탁기입니다. 건조기와 함께 있으면 따로 체크해 주세요.' },
  { id: 'dryer', category: 'APPLIANCE', name: '건조기', spec: '일반', cbm: 0.8, icon: '♨️', size: '가로 60 × 높이 85cm', guide: '세탁기 옆이나 위에 설치한 건조기입니다. 스택형 설치면 분리 작업이 필요합니다.' },
  { id: 'tv_s', category: 'APPLIANCE', name: 'TV', spec: '43인치 이하', cbm: 0.2, icon: '📺', size: '가로 100cm 이내', guide: '벽걸이 또는 TV장 위에 올린 작은 TV입니다.' },
  { id: 'tv_l', category: 'APPLIANCE', name: 'TV', spec: '50인치 이상', cbm: 0.4, icon: '📺', size: '가로 110cm 이상', guide: '거실에 두는 큰 TV입니다. 포장 박스가 있으면 알려주세요.' },
  { id: 'ac_stand', category: 'APPLIANCE', name: '에어컨', spec: '스탠드형', cbm: 0.7, icon: '❄️', size: '높이 170cm', guide: '바닥에 세워 두는 스탠드 에어컨입니다. 설치·철거는 전문업체가 따로 필요합니다.' },
  { id: 'ac_wall', category: 'APPLIANCE', name: '에어컨', spec: '벽걸이형 (실내기+실외기)', cbm: 0.4, icon: '❄️', size: '실내기 가로 90cm', guide: '벽에 거는 에어컨입니다. 이전 설치 여부를 옵션에서 선택해 주세요.' },
  { id: 'micro', category: 'APPLIANCE', name: '전자레인지/에어프라이어', spec: '소형 가전', cbm: 0.1, icon: '🍲', size: '가로 45cm 이내', guide: '주방 선반 위의 작은 가전입니다.' },
  { id: 'pc_tower', category: 'APPLIANCE', name: '컴퓨터 본체', spec: '데스크톱 PC', cbm: 0.1, icon: '🖥️', size: '가로 20 × 높이 45cm', guide: '책상 아래나 옆에 두는 데스크톱 본체입니다. 노트북은 박스에 함께 담아 주세요. 이동 전 케이블은 분리하고 사진을 찍어 두면 재설치가 편합니다.', max: 10 },
  { id: 'monitor_s', category: 'APPLIANCE', name: '모니터', spec: '27인치 이하', cbm: 0.1, icon: '🖥️', size: '가로 50~62cm', guide: '일반 컴퓨터 모니터입니다. 포장 박스가 있으면 파손 위험이 줄어듭니다.', max: 10 },
  { id: 'monitor_l', category: 'APPLIANCE', name: '모니터', spec: '32인치 이상/와이드', cbm: 0.2, icon: '🖥️', size: '가로 70cm 이상', guide: '32인치 이상 대형 또는 울트라와이드 모니터입니다. 깨지기 쉬워 별도 포장이 필요합니다.', max: 10 },
  { id: 'purifier', category: 'APPLIANCE', name: '공기청정기/제습기', spec: '일반', cbm: 0.2, icon: '🌬️', size: '높이 60~70cm', guide: '바닥에 두는 중소형 가전입니다.' },

  // ── 가구 ──
  { id: 'wardrobe_3', category: 'FURNITURE', name: '옷장(장롱)', spec: '3자 이하', cbm: 0.9, icon: '🚪', size: '가로 90 × 높이 180cm', guide: '문이 2~3개인 작은 장롱입니다. 분해가 필요할 수 있습니다.', needsDisassembly: true },
  { id: 'wardrobe_5', category: 'FURNITURE', name: '옷장(장롱)', spec: '5자 (약 150cm)', cbm: 1.6, icon: '🚪', size: '가로 150 × 높이 200cm', guide: '안방에 두는 일반 장롱입니다. 보통 분해·조립이 필요합니다.', needsDisassembly: true },
  { id: 'drawer', category: 'FURNITURE', name: '서랍장', spec: '3~5단', cbm: 0.5, icon: '🗄️', size: '가로 60~80 × 높이 100cm', guide: '옷을 넣는 서랍장입니다. 서랍 안 옷은 미리 비워 주세요.' },
  { id: 'hanger', category: 'FURNITURE', name: '행거', spec: '이동식/조립식', cbm: 0.3, icon: '👗', size: '가로 100~150cm', guide: '옷을 걸어두는 철제 행거입니다. 옷은 박스에 따로 포장합니다.' },
  { id: 'desk', category: 'FURNITURE', name: '책상', spec: '일반 (120cm 내외)', cbm: 0.6, icon: '🖥️', size: '가로 120 × 높이 75cm', guide: '일반 컴퓨터/공부 책상입니다. 서랍이나 상판 책장이 있으면 규격이 커집니다.' },
  { id: 'chair', category: 'FURNITURE', name: '의자', spec: '일반/사무용', cbm: 0.2, icon: '🪑', size: '높이 100cm', guide: '책상 의자입니다. 식탁 의자는 개수대로 추가해 주세요.' },
  { id: 'shelf', category: 'FURNITURE', name: '책장/수납장', spec: '일반', cbm: 0.6, icon: '📚', size: '가로 80 × 높이 180cm', guide: '책이나 물건을 올려두는 수납장입니다. 내용물은 비워야 합니다.' },
  { id: 'sofa_2', category: 'FURNITURE', name: '소파', spec: '2인용', cbm: 1.0, icon: '🛋️', size: '가로 150cm', guide: '2명이 앉는 작은 소파입니다.' },
  { id: 'sofa_3', category: 'FURNITURE', name: '소파', spec: '3~4인용', cbm: 1.6, icon: '🛋️', size: '가로 200cm 이상', guide: '거실용 일반 소파입니다. 현관과 엘리베이터 진입이 가능한지 사진을 올려주세요.' },
  { id: 'table', category: 'FURNITURE', name: '식탁', spec: '2~4인', cbm: 1.0, icon: '🍽️', size: '가로 120~140cm', guide: '의자 포함 식탁 세트면 의자는 별도로 추가해 주세요.' },
  { id: 'shoes', category: 'FURNITURE', name: '신발장/수납 선반', spec: '일반', cbm: 0.5, icon: '👟', size: '가로 60~80cm', guide: '현관 신발장이 빌트인이 아닌 이동식인 경우만 체크하세요.' },
  { id: 'mirror', category: 'FURNITURE', name: '전신거울/화장대', spec: '일반', cbm: 0.3, icon: '🪞', size: '높이 150cm', guide: '깨지기 쉬워 별도 포장이 필요합니다.' },

  // ── 침대·매트리스 ──
  { id: 'bed_s', category: 'BED', name: '침대(프레임)', spec: '싱글/슈퍼싱글', cbm: 0.9, icon: '🛏️', size: '가로 100~110 × 길이 200cm', guide: '1인용 침대 프레임입니다. 분해가 필요합니다.', needsDisassembly: true },
  { id: 'bed_q', category: 'BED', name: '침대(프레임)', spec: '퀸/킹', cbm: 1.8, icon: '🛏️', size: '가로 150~180 × 길이 200cm', guide: '2인용 침대 프레임입니다. 분해·조립이 필요합니다.', needsDisassembly: true },
  { id: 'mat_s', category: 'BED', name: '매트리스', spec: '싱글/슈퍼싱글', cbm: 0.6, icon: '🛌', size: '가로 100~110 × 길이 200cm', guide: '프레임 없이 바닥에 쓰는 매트리스도 이 항목으로 선택하세요.' },
  { id: 'mat_q', category: 'BED', name: '매트리스', spec: '퀸/킹', cbm: 1.1, icon: '🛌', size: '가로 150~180 × 길이 200cm', guide: '2인용 매트리스입니다. 커버가 있으면 이동 시 오염을 막을 수 있습니다.' },

  // ── 박스·짐 ──
  { id: 'box', category: 'BOX', name: '이사 박스', spec: '표준 박스 (약 50×40×40cm)', cbm: 0.1, icon: '📦', size: '50 × 40 × 40cm', guide: '이삿짐 센터 표준 박스 크기입니다. 책이나 그릇은 작은 박스에, 옷은 큰 박스에 담으면 됩니다.', max: 150 },
  { id: 'bag', category: 'BOX', name: '대형 가방/캐리어', spec: '24인치 이상', cbm: 0.15, icon: '🧳', size: '높이 65cm', guide: '캐리어, 대형 쇼핑백 등 박스 대신 쓰는 짐입니다.', max: 30 },
  { id: 'plant', category: 'BOX', name: '화분', spec: '중대형', cbm: 0.2, icon: '🪴', size: '높이 80cm', guide: '큰 화분만 체크해 주세요. 작은 화분은 박스에 포함합니다.', max: 20 },

  // ── 기타 대형물 ──
  { id: 'bike', category: 'ETC', name: '자전거', spec: '일반', cbm: 0.5, icon: '🚲', size: '길이 170cm', guide: '일반 자전거입니다.' },
  { id: 'treadmill', category: 'ETC', name: '런닝머신/운동기구', spec: '대형', cbm: 1.8, icon: '🏃', size: '길이 150cm 이상', guide: '런닝머신, 헬스 기구 등 무거운 대형 운동기구입니다. 사진 등록이 필요합니다.', max: 5 },
  { id: 'cattower', category: 'ETC', name: '캣타워/펫 대형용품', spec: '대형', cbm: 0.5, icon: '🐈', size: '높이 150cm', guide: '캣타워, 강아지 펜스 등 부피가 큰 반려용품입니다.' },
  { id: 'piano', category: 'ETC', name: '피아노/대형 악기', spec: '업라이트', cbm: 3.0, icon: '🎹', size: '가로 150cm', guide: '피아노는 별도 전문 인력이 필요하여 견적 시 상담으로 안내됩니다.', max: 2 },
]

export const SMALL_ITEM_MAP: Record<string, SmallItem> = Object.fromEntries(
  SMALL_ITEMS.map((i) => [i.id, i])
)

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
