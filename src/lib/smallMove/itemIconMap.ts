// 기존 물품정보(StandardItem: 품목명 + 규격) -> 아이콘 키 매핑 (방식 C: 품목명 기준 + 핵심 품목은 규격 변형)
// DB 컬럼 변경 없이 이름/규격 문자열만으로 결정한다.

const has = (s: string, ...keys: string[]) => keys.some((k) => s.includes(k))

export function iconKeyFor(rawName: string, rawSpec = ''): string {
  const name = (rawName || '').trim()
  const spec = (rawSpec || '').trim()
  const n = name.replace(/\s/g, '')

  // ── 규격 변형이 큰 핵심 품목 ──
  if (n === '김치냉장고') return has(spec, '뚜껑') ? 'kimchi_top' : 'kimchi_stand'
  if (n === '냉장고') {
    if (has(spec, '양문', '4도어')) return 'fridge_l'
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
    if (has(spec, '창문형')) return 'ac_wall'
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
    if (has(spec, '1인', '2인')) return 'sofa_2'
    return 'sofa_3'
  }
  if (n === '청소기') return has(spec, '로봇') ? 'robot_vac' : 'vacuum'
  if (n === '주방가전') {
    if (has(spec, '밥솥')) return 'ricecooker'
    if (has(spec, '커피')) return 'coffee'
    if (has(spec, '정수기')) return 'water'
    return 'micro'
  }
  if (n === '자전거') return has(spec, '킥보드') ? 'scooter' : 'bike'
  if (n === '운동기구') return has(spec, '자전거', '바이크') ? 'bike' : 'treadmill'
  if (n === '식탁') return 'table'
  if (n === '의자') return has(spec, '스툴') ? 'stool' : 'chair'

  // ── 품목명 기준 ──
  const byName: Record<string, string> = {
    공기청정기: 'purifier',
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
