import type { ReactNode } from 'react'

// 방문견적(기존 물품정보 StandardItem)용 아이콘 확장 세트
// 기본 팔레트는 ItemIcon.tsx와 동일하게 사용한다.
const S = '#475569'
const F = '#e0f2fe'
const F2 = '#bfdbfe'
const A = '#2563eb'
const W = '#ffffff'
const WOOD = '#fde68a'
const sw = { stroke: S, strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

export const EXTRA_ICONS: Record<string, ReactNode> = {
  // 김치냉장고 - 뚜껑형(위로 여는 형)
  kimchi_top: (
    <g {...sw}>
      <rect x="8" y="26" width="48" height="28" rx="3" fill={F} />
      <rect x="6" y="19" width="52" height="9" rx="3" fill={F2} />
      <line x1="26" y1="23.5" x2="38" y2="23.5" stroke={A} />
      <circle cx="49" cy="40" r="2.2" fill={A} stroke="none" />
      <line x1="12" y1="54" x2="12" y2="58" />
      <line x1="52" y1="54" x2="52" y2="58" />
    </g>
  ),
  // 김치냉장고 - 스탠드형(위 문 + 아래 서랍)
  kimchi_stand: (
    <g {...sw}>
      <rect x="14" y="5" width="36" height="53" rx="3" fill={F} />
      <line x1="14" y1="30" x2="50" y2="30" />
      <line x1="14" y1="42" x2="50" y2="42" />
      <line x1="32" y1="5" x2="32" y2="30" />
      <line x1="29" y1="14" x2="29" y2="22" stroke={A} />
      <line x1="35" y1="14" x2="35" y2="22" stroke={A} />
      <line x1="26" y1="36" x2="38" y2="36" stroke={A} />
      <line x1="26" y1="48" x2="38" y2="48" stroke={A} />
    </g>
  ),
  // 워시타워(세탁기+건조기 일체형)
  washtower: (
    <g {...sw}>
      <rect x="14" y="4" width="36" height="55" rx="3" fill={F} />
      <line x1="14" y1="31" x2="50" y2="31" />
      <circle cx="32" cy="17" r="8" fill={W} />
      <circle cx="32" cy="17" r="5" fill={F2} />
      <circle cx="32" cy="45" r="9" fill={W} />
      <circle cx="32" cy="45" r="6" fill={F2} />
      <circle cx="20" cy="9" r="1.5" fill={A} stroke="none" />
    </g>
  ),
  // TV장(와이드)
  tvstand: (
    <g {...sw}>
      <rect x="10" y="10" width="44" height="22" rx="2" fill="#1e293b" />
      <rect x="12.5" y="12.5" width="39" height="17" fill={F2} stroke="none" />
      <rect x="3" y="38" width="58" height="14" rx="2" fill={WOOD} />
      <line x1="22" y1="38" x2="22" y2="52" />
      <line x1="42" y1="38" x2="42" y2="52" />
      <line x1="8" y1="52" x2="8" y2="58" />
      <line x1="56" y1="52" x2="56" y2="58" />
    </g>
  ),
  // 스타일러
  styler: (
    <g {...sw}>
      <rect x="14" y="5" width="36" height="53" rx="3" fill={F} />
      <rect x="19" y="10" width="26" height="34" rx="2" fill={W} />
      <path d="M32 15v3M26 24l6-6 6 6M27 24h10v14H27z" fill={F2} />
      <line x1="22" y1="50" x2="34" y2="50" stroke={A} />
      <circle cx="42" cy="50" r="2" fill={A} stroke="none" />
    </g>
  ),
  // 식기세척기
  dishwasher: (
    <g {...sw}>
      <rect x="9" y="8" width="46" height="48" rx="3" fill={F} />
      <line x1="9" y1="19" x2="55" y2="19" />
      <circle cx="17" cy="13.5" r="2" fill={A} stroke="none" />
      <circle cx="24" cy="13.5" r="2" fill={A} stroke="none" />
      <line x1="18" y1="25" x2="46" y2="25" stroke={A} />
      <rect x="16" y="31" width="32" height="20" rx="2" fill={W} />
      <path d="M22 36h20M22 41h20M22 46h20" stroke="#94a3b8" />
    </g>
  ),
  // 선풍기
  fan: (
    <g {...sw}>
      <circle cx="32" cy="23" r="16" fill={W} />
      <circle cx="32" cy="23" r="3" fill={A} stroke="none" />
      <path d="M32 20c-3-8 4-10 6-6M35 24c8 0 8 7 3 8M29 25c-5 6-11 2-9-3" fill={F2} />
      <line x1="32" y1="39" x2="32" y2="54" />
      <path d="M20 56h24" />
    </g>
  ),
  // 전기밥솥
  ricecooker: (
    <g {...sw}>
      <rect x="13" y="26" width="38" height="28" rx="9" fill={F} />
      <path d="M16 26c0-9 6-14 16-14s16 5 16 14z" fill={F2} />
      <line x1="32" y1="9" x2="32" y2="13" />
      <rect x="22" y="38" width="20" height="6" rx="2" fill={W} />
      <circle cx="46" cy="34" r="1.8" fill={A} stroke="none" />
    </g>
  ),
  // 커피머신
  coffee: (
    <g {...sw}>
      <rect x="14" y="7" width="36" height="47" rx="4" fill={F} />
      <rect x="14" y="7" width="36" height="12" rx="4" fill={F2} />
      <rect x="28" y="19" width="8" height="8" fill="#94a3b8" />
      <rect x="25" y="40" width="14" height="8" rx="1.5" fill={W} />
      <rect x="12" y="54" width="40" height="4" rx="1.5" fill={F2} />
      <circle cx="21" cy="13" r="2" fill={A} stroke="none" />
    </g>
  ),
  // 정수기(냉온)
  water: (
    <g {...sw}>
      <rect x="17" y="6" width="30" height="52" rx="4" fill={F} />
      <rect x="22" y="11" width="20" height="8" rx="2" fill={W} />
      <circle cx="26" cy="29" r="2.5" fill={A} stroke="none" />
      <circle cx="38" cy="29" r="2.5" fill="#ef4444" stroke="none" />
      <rect x="25" y="38" width="14" height="10" rx="1.5" fill={W} />
      <line x1="17" y1="52" x2="47" y2="52" />
    </g>
  ),
  // 로봇청소기
  robot_vac: (
    <g {...sw}>
      <circle cx="32" cy="34" r="22" fill={F} />
      <path d="M12 28a22 22 0 0 1 40 0" fill="none" stroke={A} />
      <circle cx="32" cy="34" r="8" fill={W} />
      <circle cx="32" cy="34" r="3" fill={A} stroke="none" />
      <circle cx="46" cy="22" r="2" fill="#22c55e" stroke="none" />
    </g>
  ),
  // 스틱청소기
  vacuum: (
    <g {...sw}>
      <rect x="25" y="5" width="14" height="14" rx="4" fill={F2} />
      <rect x="28" y="19" width="8" height="9" fill={F} />
      <line x1="32" y1="28" x2="32" y2="50" />
      <path d="M20 53h26l-3-4H23z" fill={F} />
    </g>
  ),
  // 안마의자 (일반): 측면 리클라이너 + 머리 쿠션 + 팔걸이 + 다리 받침
  massage: (
    <g {...sw}>
      <path d="M12 10c0-3 3-5 6-5h4c3 0 5 3 5 7l2 22h18c3 0 5 2 5 5v14H38v-9H16c-3 0-5-2-5-5V10z" fill={F} />
      <rect x="15" y="9" width="9" height="10" rx="4" fill={F2} />
      <rect x="19" y="25" width="16" height="8" rx="4" fill={W} />
      <path d="M40 39h10c2 0 3 2 3 4v10H40z" fill={F2} />
      <circle cx="20" cy="48" r="2.5" fill={A} stroke="none" />
      <line x1="12" y1="53" x2="54" y2="53" />
    </g>
  ),
  // 스툴(작은 의자)
  stool: (
    <g {...sw}>
      <ellipse cx="32" cy="22" rx="18" ry="7" fill={F2} />
      <path d="M14 22v6c0 4 8 7 18 7s18-3 18-7v-6" fill={F} />
      <line x1="22" y1="34" x2="18" y2="56" />
      <line x1="42" y1="34" x2="46" y2="56" />
      <line x1="32" y1="35" x2="32" y2="56" />
    </g>
  ),
  // 소파 테이블
  coffee_table: (
    <g {...sw}>
      <rect x="6" y="24" width="52" height="7" rx="2" fill={WOOD} />
      <line x1="11" y1="31" x2="9" y2="52" />
      <line x1="53" y1="31" x2="55" y2="52" />
      <line x1="12" y1="43" x2="52" y2="43" />
    </g>
  ),
  // 2층(벙커) 침대
  bunk: (
    <g {...sw}>
      <line x1="8" y1="6" x2="8" y2="58" />
      <line x1="56" y1="6" x2="56" y2="58" />
      <rect x="8" y="14" width="48" height="8" rx="2" fill={F2} />
      <rect x="8" y="38" width="48" height="8" rx="2" fill={F2} />
      <rect x="12" y="8" width="12" height="6" rx="2" fill={W} />
      <rect x="12" y="32" width="12" height="6" rx="2" fill={W} />
      <path d="M48 22v16M42 22v16" stroke={A} />
    </g>
  ),
  // 앵글/팬트리선반 (철제 선반)
  rack: (
    <g {...sw}>
      <line x1="10" y1="6" x2="10" y2="58" />
      <line x1="54" y1="6" x2="54" y2="58" />
      <rect x="10" y="12" width="44" height="3" fill={F2} />
      <rect x="10" y="29" width="44" height="3" fill={F2} />
      <rect x="10" y="46" width="44" height="3" fill={F2} />
      <rect x="16" y="3" width="10" height="9" fill={F} />
      <rect x="32" y="19" width="14" height="10" fill={F} />
      <rect x="16" y="36" width="12" height="10" fill={F} />
    </g>
  ),
  // 킥보드
  scooter: (
    <g {...sw}>
      <path d="M44 8h8M48 8v38" />
      <path d="M8 46h40" />
      <rect x="10" y="42" width="30" height="5" rx="2" fill={F2} />
      <circle cx="14" cy="53" r="4" fill={W} />
      <circle cx="48" cy="53" r="4" fill={W} />
    </g>
  ),
  // 유모차
  stroller: (
    <g {...sw}>
      <path d="M12 30c0-12 10-18 24-18v18z" fill={F2} />
      <rect x="12" y="30" width="28" height="10" rx="3" fill={F} />
      <path d="M40 30h6l6-10M46 30l-4 14" fill="none" />
      <circle cx="18" cy="50" r="6" fill={W} />
      <circle cx="44" cy="50" r="6" fill={W} />
    </g>
  ),
  // 금고
  safe: (
    <g {...sw}>
      <rect x="10" y="9" width="44" height="46" rx="3" fill="#cbd5e1" />
      <rect x="15" y="14" width="34" height="36" rx="2" fill={F} />
      <circle cx="32" cy="32" r="9" fill={W} />
      <circle cx="32" cy="32" r="3" fill={A} stroke="none" />
      <line x1="32" y1="23" x2="32" y2="26" />
      <line x1="14" y1="55" x2="14" y2="59" />
      <line x1="50" y1="55" x2="50" y2="59" />
    </g>
  ),
  // 항아리
  jar: (
    <g {...sw}>
      <path d="M22 14h20l2 6c10 6 10 26-2 34H22C10 46 10 26 20 20z" fill="#fdba74" />
      <rect x="20" y="9" width="24" height="6" rx="2" fill="#f59e0b" />
      <path d="M18 32c8 4 20 4 28 0" fill="none" />
    </g>
  ),
  // 스탠드등
  lamp: (
    <g {...sw}>
      <path d="M20 8h24l5 16H15z" fill="#fde68a" />
      <line x1="32" y1="24" x2="32" y2="54" />
      <ellipse cx="32" cy="56" rx="12" ry="3" fill={F2} />
    </g>
  ),
  // 사운드바
  soundbar: (
    <g {...sw}>
      <rect x="3" y="24" width="58" height="14" rx="7" fill="#1e293b" />
      <path d="M12 31h40" stroke="#94a3b8" strokeDasharray="1.5 3" />
      <circle cx="50" cy="31" r="1.5" fill={A} stroke="none" />
    </g>
  ),
  // 화장대: 둥근 거울 + 서랍 달린 테이블 + 스툴 (전신거울과 구분)
  vanity: (
    <g {...sw}>
      <ellipse cx="32" cy="15" rx="13" ry="11" fill={W} />
      <ellipse cx="32" cy="15" rx="9.5" ry="7.5" fill={F2} stroke="none" />
      <line x1="32" y1="26" x2="32" y2="31" />
      <rect x="8" y="31" width="48" height="5" rx="1.5" fill={WOOD} />
      <rect x="34" y="36" width="20" height="17" fill={WOOD} />
      <line x1="34" y1="44.5" x2="54" y2="44.5" />
      <line x1="41" y1="40" x2="47" y2="40" stroke={A} />
      <line x1="41" y1="49" x2="47" y2="49" stroke={A} />
      <line x1="11" y1="36" x2="11" y2="53" />
      <ellipse cx="22" cy="48" rx="7" ry="2.5" fill={F2} />
      <line x1="22" y1="50" x2="22" y2="56" />
    </g>
  ),
  // 싱크대살림: 슬림한 상부장(위) + 하부장(아래) + 싱크볼/수전
  kitchen_cab: (
    <g {...sw}>
      <rect x="5" y="6" width="54" height="15" rx="1.5" fill={F} />
      <line x1="23" y1="6" x2="23" y2="21" />
      <line x1="41" y1="6" x2="41" y2="21" />
      <line x1="20" y1="15" x2="20" y2="18" stroke={A} />
      <line x1="26" y1="15" x2="26" y2="18" stroke={A} />
      <line x1="38" y1="15" x2="38" y2="18" stroke={A} />
      <line x1="44" y1="15" x2="44" y2="18" stroke={A} />
      <path d="M31 31v-4a3 3 0 0 1 6 0" fill="none" stroke="#94a3b8" />
      <rect x="5" y="34" width="54" height="4" rx="1" fill="#cbd5e1" />
      <rect x="25" y="34" width="14" height="2.5" fill={F2} stroke="none" />
      <rect x="5" y="38" width="54" height="18" rx="1.5" fill={WOOD} />
      <line x1="23" y1="38" x2="23" y2="56" />
      <line x1="41" y1="38" x2="41" y2="56" />
      <line x1="20" y1="44" x2="20" y2="48" stroke={A} />
      <line x1="26" y1="44" x2="26" y2="48" stroke={A} />
      <line x1="38" y1="44" x2="38" y2="48" stroke={A} />
      <line x1="44" y1="44" x2="44" y2="48" stroke={A} />
    </g>
  ),
  // 창문형 에어컨: 세로로 긴 일체형(파세코형) - 상단 표시창, 중단 송풍구, 하단 흡입 그릴, 창틀 걸침 플랜지
  ac_window: (
    <g {...sw}>
      <rect x="19" y="4" width="26" height="56" rx="4" fill={F} />
      <rect x="23" y="9" width="18" height="6" rx="1.5" fill={W} />
      <circle cx="27" cy="12" r="1.2" fill={A} stroke="none" />
      <circle cx="32" cy="12" r="1.2" fill="#22c55e" stroke="none" />
      <line x1="23" y1="21" x2="41" y2="21" />
      <line x1="23" y1="25" x2="41" y2="25" />
      <line x1="23" y1="29" x2="41" y2="29" />
      <rect x="23" y="34" width="18" height="20" rx="2" fill={W} />
      <path d="M26 38h12M26 42h12M26 46h12M26 50h12" stroke="#94a3b8" />
      <line x1="14" y1="40" x2="19" y2="40" />
      <line x1="45" y1="40" x2="50" y2="40" />
    </g>
  ),
  // 로잉머신: 긴 레일 + 슬라이딩 좌석 + 앞쪽 플라이휠 + 발판 + 손잡이 줄
  rowing: (
    <g {...sw}>
      <rect x="4" y="43" width="46" height="5" rx="2" fill={F2} />
      <rect x="18" y="36" width="12" height="5" rx="2" fill={W} />
      <line x1="24" y1="41" x2="24" y2="43" />
      <circle cx="51" cy="35" r="9" fill={F} />
      <circle cx="51" cy="35" r="4" fill={W} />
      <rect x="46" y="20" width="12" height="7" rx="2" fill="#1e293b" />
      <line x1="51" y1="26" x2="51" y2="27" />
      <path d="M43 34L30 33" stroke={A} />
      <rect x="9" y="30" width="3" height="9" rx="1" fill="#f59e0b" stroke="none" />
      <path d="M33 33h-5" stroke={A} strokeWidth={3} />
      <line x1="6" y1="48" x2="6" y2="54" />
      <line x1="48" y1="48" x2="48" y2="54" />
    </g>
  ),
  // 워킹패드: 낮고 납작한 벨트 + 손잡이 없음 + 리모컨
  walkingpad: (
    <g {...sw}>
      <path d="M6 42h46l6-8H12z" fill={F} />
      <path d="M12 34h46" />
      <rect x="6" y="42" width="46" height="8" rx="2" fill={F2} />
      <path d="M16 38h30M24 36l-6 6M34 36l-6 6M44 36l-6 6" stroke="#94a3b8" strokeWidth={1.5} />
      <circle cx="46" cy="46" r="1.5" fill={A} stroke="none" />
      <rect x="22" y="12" width="20" height="10" rx="3" fill={W} />
      <circle cx="28" cy="17" r="1.8" fill={A} stroke="none" />
      <circle cx="36" cy="17" r="1.8" fill="#22c55e" stroke="none" />
      <line x1="12" y1="50" x2="12" y2="54" />
      <line x1="46" y1="50" x2="46" y2="54" />
    </g>
  ),
  // 캐디백(골프백): 세워 둔 가방 + 삐죽 나온 클럽 + 스탠드 다리
  golfbag: (
    <g {...sw}>
      <line x1="25" y1="4" x2="27" y2="22" />
      <line x1="32" y1="3" x2="32" y2="22" />
      <line x1="39" y1="4" x2="37" y2="22" />
      <circle cx="25" cy="4" r="2.5" fill="#94a3b8" />
      <circle cx="32" cy="3" r="2.5" fill="#94a3b8" />
      <circle cx="39" cy="4" r="2.5" fill="#94a3b8" />
      <rect x="21" y="20" width="22" height="36" rx="9" fill={F} />
      <rect x="21" y="20" width="22" height="9" rx="4" fill={F2} />
      <rect x="25" y="36" width="14" height="12" rx="3" fill={W} />
      <line x1="25" y1="42" x2="39" y2="42" />
      <path d="M21 26c-7 4-8 16-3 24" fill="none" stroke={A} />
      <line x1="25" y1="56" x2="19" y2="61" />
      <line x1="39" y1="56" x2="45" y2="61" />
    </g>
  ),
  // 실내자전거/엑스바이크: 플라이휠 + 안장 + 핸들 + 받침대
  exbike: (
    <g {...sw}>
      <circle cx="26" cy="40" r="11" fill={F} />
      <circle cx="26" cy="40" r="4" fill={W} />
      <path d="M26 40L40 22M40 22h8M40 22l-8 -4" fill="none" />
      <rect x="30" y="12" width="12" height="4" rx="2" fill={A} stroke="none" />
      <path d="M26 40l14-18M48 22v-8h-5" fill="none" />
      <path d="M12 54h34" strokeWidth={3} />
      <rect x="40" y="14" width="10" height="4" rx="2" fill="#1e293b" />
    </g>
  ),
  // 러닝머신(접힘): 데크를 세워 접은 형태 + 콘솔/핸들
  treadmill_fold: (
    <g {...sw}>
      <rect x="38" y="14" width="10" height="38" rx="2" fill={F2} transform="rotate(8 43 33)" />
      <rect x="14" y="8" width="18" height="9" rx="2" fill="#1e293b" />
      <path d="M18 17l-3 33M30 17l3 33" fill="none" />
      <rect x="10" y="50" width="30" height="5" rx="2" fill={F} />
      <line x1="14" y1="55" x2="14" y2="59" />
      <line x1="36" y1="55" x2="36" y2="59" />
    </g>
  ),
  // 아기장/베이비장: 위 여닫이문 + 아래 서랍 3단, 파스텔 손잡이
  baby_cab: (
    <g {...sw}>
      <rect x="13" y="5" width="38" height="53" rx="3" fill="#fef9c3" />
      <line x1="13" y1="26" x2="51" y2="26" />
      <line x1="32" y1="5" x2="32" y2="26" />
      <circle cx="28" cy="16" r="1.8" fill="#f472b6" stroke="none" />
      <circle cx="36" cy="16" r="1.8" fill="#60a5fa" stroke="none" />
      <line x1="13" y1="35" x2="51" y2="35" />
      <line x1="13" y1="44" x2="51" y2="44" />
      <circle cx="32" cy="30.5" r="1.8" fill="#f472b6" stroke="none" />
      <circle cx="32" cy="39.5" r="1.8" fill="#60a5fa" stroke="none" />
      <circle cx="32" cy="50" r="1.8" fill="#facc15" stroke="none" />
    </g>
  ),
  // 교구장/장난감장: 낮고 넓은 오픈 칸 + 색색의 수납 바구니
  toy_cab: (
    <g {...sw}>
      <rect x="6" y="12" width="52" height="42" rx="2" fill="#fef9c3" />
      <line x1="6" y1="33" x2="58" y2="33" />
      <line x1="24" y1="12" x2="24" y2="54" />
      <line x1="41" y1="12" x2="41" y2="54" />
      <rect x="9" y="22" width="12" height="9" rx="1.5" fill="#fca5a5" stroke="none" />
      <rect x="27" y="19" width="11" height="12" rx="1.5" fill="#93c5fd" stroke="none" />
      <circle cx="49" cy="26" r="4" fill="#86efac" stroke="none" />
      <rect x="9" y="40" width="12" height="11" rx="1.5" fill="#fde047" stroke="none" />
      <rect x="27" y="42" width="11" height="9" rx="1.5" fill="#c4b5fd" stroke="none" />
      <rect x="44" y="40" width="11" height="11" rx="1.5" fill="#fdba74" stroke="none" />
    </g>
  ),
  // 주방 렌지대/밥솥장: 위 오픈 선반(밥솥+전자레인지) + 아래 여닫이 수납
  kitchen_stand: (
    <g {...sw}>
      <rect x="8" y="5" width="48" height="53" rx="2" fill={F} />
      <line x1="8" y1="25" x2="56" y2="25" />
      <line x1="8" y1="42" x2="56" y2="42" />
      <rect x="11" y="9" width="22" height="16" rx="2" fill={W} />
      <rect x="13" y="12" width="12" height="10" fill={F2} stroke="none" />
      <path d="M37 25v-6c0-5 4-8 9-8s7 3 7 8v6z" fill={F2} />
      <line x1="32" y1="42" x2="32" y2="58" />
      <line x1="29" y1="48" x2="29" y2="53" stroke={A} />
      <line x1="35" y1="48" x2="35" y2="53" stroke={A} />
      <line x1="10" y1="29" x2="30" y2="29" stroke="#94a3b8" />
      <line x1="34" y1="29" x2="54" y2="29" stroke="#94a3b8" />
    </g>
  ),
  // 다용도 수납장: 위 유리문 + 아래 일반 문 + 중간 서랍
  multi_cab: (
    <g {...sw}>
      <rect x="12" y="4" width="40" height="55" rx="3" fill={F} />
      <rect x="16" y="8" width="32" height="20" rx="1.5" fill={W} />
      <line x1="32" y1="8" x2="32" y2="28" />
      <path d="M20 24l5-5M28 24l9-9" stroke="#94a3b8" />
      <line x1="12" y1="32" x2="52" y2="32" />
      <line x1="12" y1="40" x2="52" y2="40" />
      <line x1="28" y1="36" x2="36" y2="36" stroke={A} />
      <line x1="32" y1="40" x2="32" y2="59" />
      <line x1="29" y1="48" x2="29" y2="53" stroke={A} />
      <line x1="35" y1="48" x2="35" y2="53" stroke={A} />
    </g>
  ),
  // 캣휠(대형, 지름 약 1M): 큰 바퀴 + 받침 프레임 + 달리는 면
  catwheel: (
    <g {...sw}>
      <circle cx="32" cy="29" r="23" fill={W} />
      <circle cx="32" cy="29" r="17" fill={F} />
      <path d="M32 12v34M15 29h34M20 17l24 24M44 17L20 41" stroke="#cbd5e1" />
      <circle cx="32" cy="29" r="3" fill={A} stroke="none" />
      <path d="M12 58L32 29l20 29" fill="none" />
      <line x1="8" y1="58" x2="56" y2="58" />
    </g>
  ),
  // 애견울타리: 접이식 패널 여러 장을 육각으로 둘러친 형태 (세로 살)
  dogfence: (
    <g {...sw}>
      <path d="M6 18l14-6h24l14 6v26l-14 8H20L6 44z" fill="#f8fafc" />
      <path d="M6 18v26M20 12v40M44 12v40M58 18v26M32 12v40" fill="none" />
      <path d="M6 18l14-6h24l14 6M6 44l14 8h24l14-8" fill="none" stroke={A} />
      <path d="M13 15v31M26 12v40M38 12v40M51 15v31" stroke="#cbd5e1" />
      <circle cx="32" cy="38" r="5" fill="#fde68a" />
      <path d="M28 33l1 -3M36 33l-1 -3" />
    </g>
  ),
  // 애견집/캔넬/계단: 지붕 있는 집 + 아치형 입구 + 작은 계단
  doghouse: (
    <g {...sw}>
      <path d="M8 28L32 8l24 20z" fill="#fca5a5" />
      <rect x="12" y="28" width="40" height="26" fill="#fde68a" />
      <path d="M24 54V40a8 8 0 0 1 16 0v14z" fill="#92400e" stroke={S} />
      <rect x="8" y="54" width="48" height="4" rx="1.5" fill="#cbd5e1" />
      <path d="M44 54v-3h6v3M50 54v-6h6v6" fill={F2} />
    </g>
  ),
  // 안마의자 (프리미엄/대형): 캡슐형 풀바디 쉘 + 넓은 발마사지 부스 + 골드/오렌지 포인트 라인
  massage_premium: (
    <g {...sw}>
      <path d="M10 14C10 7 16 5 22 6c5 1 7 6 8 13l3 15h14c5 0 9 4 9 9v10c0 3-2 4-5 4H14c-4 0-6-3-6-7V22c0-4 1-6 2-8z" fill="#1e293b" />
      <path d="M15 14c0-3 3-5 6-5 3 0 5 3 5 7l2 19h14c3 0 5 2 5 5v9H16c-3 0-4-2-4-5V20c0-3 1-5 3-6z" fill={F2} />
      <path d="M12 31c6-4 14-4 20 0" fill="none" stroke="#f59e0b" strokeWidth={2.5} />
      <rect x="17" y="11" width="7" height="9" rx="3.5" fill={W} />
      <rect x="40" y="40" width="12" height="12" rx="3" fill={F} />
      <circle cx="24" cy="44" r="2.5" fill="#f59e0b" stroke="none" />
    </g>
  ),
  // 세라젬: 척추 온열 침대형(플랫/슬라이딩 베드 + 상단 롤러/리모컨)
  ceragem: (
    <g {...sw}>
      <rect x="4" y="29" width="56" height="10" rx="4" fill={W} />
      <rect x="6" y="39" width="52" height="7" rx="2" fill="#e2e8f0" />
      <rect x="8" y="25" width="12" height="4" rx="2" fill={F2} />
      <path d="M24 29c4-4 10-4 14 0" fill={F} stroke="#ef4444" />
      <line x1="12" y1="46" x2="10" y2="56" />
      <line x1="52" y1="46" x2="54" y2="56" />
      <line x1="11" y1="52" x2="53" y2="52" stroke="#94a3b8" />
      <circle cx="48" cy="21" r="3" fill={A} stroke="none" />
      <path d="M48 24v5" stroke={A} />
    </g>
  ),
  // 욕실살림(1칸 기준): 샴푸 펌프통 + 칫솔컵 + 바구니/수건
  bath_goods: (
    <g {...sw}>
      <rect x="16" y="22" width="12" height="20" rx="2" fill={F2} />
      <path d="M22 22v-5M18 17h7" stroke={A} />
      <rect x="31" y="27" width="10" height="15" rx="2" fill={W} />
      <line x1="34" y1="27" x2="33" y2="16" stroke={A} />
      <line x1="38" y1="27" x2="40" y2="18" stroke="#f59e0b" />
      <path d="M10 38h44l-4 16H14z" fill={F} />
      <line x1="20" y1="46" x2="44" y2="46" stroke="#94a3b8" />
    </g>
  ),
  // 빨래바구니/햄퍼: 손잡이 + 타공 패턴 세탁 바구니
  laundry_basket: (
    <g {...sw}>
      <path d="M12 20h40l-5 34H17z" fill={F} />
      <rect x="9" y="16" width="46" height="5" rx="2" fill={F2} />
      <path d="M12 26h4M48 26h4" stroke={A} />
      <circle cx="24" cy="31" r="1.8" fill={W} stroke="#94a3b8" />
      <circle cx="32" cy="31" r="1.8" fill={W} stroke="#94a3b8" />
      <circle cx="40" cy="31" r="1.8" fill={W} stroke="#94a3b8" />
      <circle cx="25" cy="40" r="1.8" fill={W} stroke="#94a3b8" />
      <circle cx="32" cy="40" r="1.8" fill={W} stroke="#94a3b8" />
      <circle cx="39" cy="40" r="1.8" fill={W} stroke="#94a3b8" />
      <circle cx="26" cy="48" r="1.8" fill={W} stroke="#94a3b8" />
      <circle cx="32" cy="48" r="1.8" fill={W} stroke="#94a3b8" />
      <circle cx="38" cy="48" r="1.8" fill={W} stroke="#94a3b8" />
    </g>
  ),
  // 비데: 양변기(변좌+물통) + 우측 비데 조작부 패널
  bidet: (
    <g {...sw}>
      <rect x="18" y="8" width="24" height="18" rx="2" fill={F} />
      <line x1="24" y1="12" x2="36" y2="12" stroke={A} />
      <path d="M15 26h30c0 12-5 19-15 19s-15-7-15-19z" fill={W} />
      <path d="M21 44l-2 12h22l-2-12" fill={F} />
      <rect x="43" y="26" width="11" height="7" rx="2" fill={F2} />
      <circle cx="47" cy="29.5" r="1.3" fill={A} stroke="none" />
      <circle cx="51" cy="29.5" r="1.3" fill="#ef4444" stroke="none" />
    </g>
  ),
  // 휴대용 유모차: 가볍고 날렵한 기내반입형 유모차
  stroller_compact: (
    <g {...sw}>
      <path d="M18 28c0-8 7-12 16-12v12z" fill={F2} />
      <path d="M18 28h18l8-12h4" fill="none" />
      <path d="M22 28l-4 18M34 28l6 18" fill="none" />
      <circle cx="17" cy="50" r="4" fill={W} />
      <circle cx="41" cy="50" r="4" fill={W} />
    </g>
  ),
  // 웨건: 4바퀴 접이식 유아/캠핑 웨건
  wagon: (
    <g {...sw}>
      <rect x="14" y="24" width="38" height="20" rx="3" fill={F} />
      <line x1="24" y1="24" x2="24" y2="44" stroke="#94a3b8" />
      <line x1="34" y1="24" x2="34" y2="44" stroke="#94a3b8" />
      <line x1="44" y1="24" x2="44" y2="44" stroke="#94a3b8" />
      <path d="M14 28L6 16h-2" fill="none" stroke={A} />
      <circle cx="19" cy="50" r="5" fill={W} />
      <circle cx="47" cy="50" r="5" fill={W} />
      <circle cx="19" cy="50" r="1.8" fill={A} stroke="none" />
      <circle cx="47" cy="50" r="1.8" fill={A} stroke="none" />
    </g>
  ),
  // 유아 전동차(벤츠): 오픈카 실루엣 + 핸들 + 헤드라이트
  kids_car: (
    <g {...sw}>
      <path d="M8 38c2-9 10-12 22-12h12c6 0 12 4 14 12v8H8z" fill={F} />
      <path d="M18 26l4-7h12l4 7" fill="none" />
      <line x1="24" y1="26" x2="22" y2="20" stroke={A} />
      <rect x="50" y="34" width="5" height="4" rx="1" fill="#facc15" stroke="none" />
      <circle cx="18" cy="48" r="6" fill="#1e293b" />
      <circle cx="18" cy="48" r="2.5" fill={W} stroke="none" />
      <circle cx="46" cy="48" r="6" fill="#1e293b" />
      <circle cx="46" cy="48" r="2.5" fill={W} stroke="none" />
    </g>
  ),
  // 전기자전거: 자전거 프레임 + 배터리팩 + 번개 포인트
  ebike: (
    <g {...sw}>
      <circle cx="15" cy="41" r="10.5" fill="none" />
      <circle cx="49" cy="41" r="10.5" fill="none" />
      <path d="M15 41l11-17h15l8 17M26 24l6 17h-17M41 24l-2-6h6" fill="none" stroke={A} />
      <rect x="28" y="29" width="9" height="4.5" rx="1.5" fill="#f59e0b" stroke="none" transform="rotate(-35 32 31)" />
      <path d="M33 11l-3 5h4l-3 5" fill="none" stroke="#f59e0b" />
    </g>
  ),
  // 아동용 세발자전거: 앞 큰 바퀴 + 뒤 작은 바퀴 + 손잡이 바구니
  tricycle: (
    <g {...sw}>
      <circle cx="44" cy="41" r="11" fill="none" />
      <circle cx="16" cy="46" r="6" fill="none" />
      <circle cx="23" cy="46" r="6" fill="none" />
      <path d="M44 41L36 20h6M36 24l-14 8-4 14M20 32h8" fill="none" stroke={A} />
      <rect x="20" y="27" width="8" height="4" rx="1.5" fill="#fca5a5" />
      <rect x="40" y="18" width="8" height="6" rx="1" fill={F2} />
    </g>
  ),
  // 안장 킥보드: 킥보드 + 유아용 안장
  scooter_seat: (
    <g {...sw}>
      <path d="M44 10h8M48 10v36" />
      <path d="M10 46h38" />
      <rect x="12" y="42" width="28" height="5" rx="2" fill={F2} />
      <line x1="25" y1="30" x2="25" y2="42" />
      <rect x="19" y="27" width="12" height="4" rx="2" fill="#f59e0b" />
      <circle cx="15" cy="53" r="4" fill={W} />
      <circle cx="48" cy="53" r="4" fill={W} />
    </g>
  ),
  // 유아 수동 킥보드: 작은 3바퀴 킥보드 + 파스텔 포인트
  scooter_kids: (
    <g {...sw}>
      <path d="M39 18h8M43 18v29" />
      <path d="M15 47h28" />
      <rect x="16" y="44" width="22" height="4" rx="2" fill="#fca5a5" />
      <circle cx="18" cy="53" r="3.5" fill={W} />
      <circle cx="41" cy="53" r="3.5" fill={W} />
      <circle cx="46" cy="53" r="3.5" fill={W} />
    </g>
  ),
  // ── 식탁 ──
  table_2: (
    <g {...sw}>
      <rect x="16" y="24" width="32" height="5" rx="1.5" fill={WOOD} />
      <line x1="20" y1="29" x2="20" y2="52" />
      <line x1="44" y1="29" x2="44" y2="52" />
      <path d="M7 22v28M7 36h8v14" fill="none" />
      <path d="M57 22v28M57 36h-8v14" fill="none" />
    </g>
  ),
  table_large: (
    <g {...sw}>
      <rect x="4" y="23" width="56" height="5" rx="1.5" fill={WOOD} />
      <line x1="8" y1="28" x2="8" y2="53" />
      <line x1="56" y1="28" x2="56" y2="53" />
      <rect x="13" y="14" width="9" height="9" rx="1.5" fill={F2} />
      <rect x="27.5" y="14" width="9" height="9" rx="1.5" fill={F2} />
      <rect x="42" y="14" width="9" height="9" rx="1.5" fill={F2} />
      <rect x="13" y="34" width="9" height="12" rx="1.5" fill={F} />
      <rect x="27.5" y="34" width="9" height="12" rx="1.5" fill={F} />
      <rect x="42" y="34" width="9" height="12" rx="1.5" fill={F} />
    </g>
  ),
  island_table: (
    <g {...sw}>
      <rect x="4" y="21" width="44" height="5" rx="1" fill="#e2e8f0" />
      <rect x="6" y="26" width="36" height="28" fill={WOOD} />
      <line x1="24" y1="26" x2="24" y2="54" />
      <line x1="19" y1="36" x2="19" y2="44" stroke={A} />
      <line x1="29" y1="36" x2="29" y2="44" stroke={A} />
      <rect x="49" y="32" width="11" height="4" rx="1.5" fill={F2} />
      <line x1="54.5" y1="36" x2="54.5" y2="54" />
      <line x1="49" y1="54" x2="60" y2="54" />
    </g>
  ),
  // ── 소파 테이블 ──
  side_table: (
    <g {...sw}>
      <ellipse cx="32" cy="20" rx="18" ry="6" fill={WOOD} />
      <line x1="32" y1="26" x2="32" y2="53" />
      <ellipse cx="32" cy="54" rx="13" ry="3.5" fill={F2} />
    </g>
  ),
  lift_table: (
    <g {...sw}>
      <rect x="10" y="14" width="44" height="6" rx="1.5" fill={WOOD} />
      <path d="M18 20l6 12M46 20l-6 12" stroke={A} />
      <rect x="10" y="32" width="44" height="11" rx="1.5" fill={F} />
      <line x1="14" y1="43" x2="14" y2="53" />
      <line x1="50" y1="43" x2="50" y2="53" />
    </g>
  ),
  glass_table: (
    <g {...sw}>
      <rect x="6" y="22" width="52" height="6" rx="2" fill={F} />
      <path d="M16 23l-4 4M24 23l-4 4M44 23l-4 4" stroke={W} />
      <line x1="12" y1="28" x2="12" y2="52" />
      <line x1="52" y1="28" x2="52" y2="52" />
      <line x1="12" y1="48" x2="52" y2="48" stroke="#94a3b8" />
    </g>
  ),
  fold_table: (
    <g {...sw}>
      <rect x="5" y="29" width="54" height="6" rx="1.5" fill="#fdba74" />
      <path d="M12 35l-3 15M52 35l3 15" fill="none" />
      <path d="M12 42h40" stroke="#94a3b8" strokeDasharray="3 3" />
    </g>
  ),
  // ── 스탠드등 ──
  lamp_shelf: (
    <g {...sw}>
      <path d="M21 7h22l4 13H17z" fill="#fde68a" />
      <line x1="22" y1="20" x2="22" y2="56" />
      <line x1="42" y1="20" x2="42" y2="56" />
      <rect x="19" y="30" width="26" height="3" fill={WOOD} />
      <rect x="19" y="43" width="26" height="3" fill={WOOD} />
      <rect x="19" y="55" width="26" height="3" fill={WOOD} />
    </g>
  ),
  lamp_arch: (
    <g {...sw}>
      <path d="M16 54V26C16 10 38 7 47 16" fill="none" strokeWidth={2.5} />
      <path d="M40 16h14l3 10H37z" fill="#fde68a" />
      <ellipse cx="16" cy="56" rx="10" ry="3" fill="#cbd5e1" />
    </g>
  ),
  lamp_desk: (
    <g {...sw}>
      <rect x="28" y="12" width="24" height="5" rx="2" fill={F2} />
      <line x1="32" y1="17" x2="48" y2="17" stroke="#f59e0b" />
      <path d="M30 14L17 32l7 21" fill="none" />
      <circle cx="17" cy="32" r="2.5" fill={A} stroke="none" />
      <ellipse cx="25" cy="55" rx="11" ry="3" fill="#cbd5e1" />
    </g>
  ),
  lamp_mini: (
    <g {...sw}>
      <path d="M20 14h24l6 18H14z" fill="#fde68a" />
      <path d="M24 32c-4 5-4 15 0 20h16c4-5 4-15 0-20z" fill={F} />
      <ellipse cx="32" cy="54" rx="10" ry="2.5" fill="#cbd5e1" />
    </g>
  ),
  // ── 행거 ──
  hanger_stand: (
    <g {...sw}>
      <line x1="32" y1="8" x2="32" y2="55" strokeWidth={2.5} />
      <path d="M32 16l-11-6M32 20l11-6M32 28l-10-5" fill="none" stroke={A} />
      <circle cx="20" cy="10" r="2" fill={A} stroke="none" />
      <circle cx="44" cy="14" r="2" fill={A} stroke="none" />
      <path d="M20 57l12-5 12 5" fill="none" />
    </g>
  ),
  hanger_wheel: (
    <g {...sw}>
      <line x1="10" y1="13" x2="54" y2="13" />
      <line x1="12" y1="13" x2="12" y2="50" />
      <line x1="52" y1="13" x2="52" y2="50" />
      <line x1="12" y1="50" x2="52" y2="50" />
      <path d="M22 13l-5 7h10zM33 13l-5 7h10zM43 13l-5 7h10z" fill={F2} />
      <rect x="17" y="20" width="10" height="17" fill={F} />
      <rect x="28" y="20" width="10" height="20" fill={F} />
      <circle cx="14" cy="55" r="3" fill="#1e293b" />
      <circle cx="50" cy="55" r="3" fill="#1e293b" />
    </g>
  ),
  hanger_1: (
    <g {...sw}>
      <line x1="16" y1="5" x2="16" y2="59" />
      <line x1="48" y1="5" x2="48" y2="59" />
      <line x1="16" y1="14" x2="48" y2="14" stroke={A} />
      <line x1="16" y1="36" x2="48" y2="36" stroke={A} />
      <rect x="22" y="16" width="8" height="14" fill={F} />
      <rect x="33" y="16" width="8" height="14" fill={F2} />
      <rect x="22" y="38" width="8" height="14" fill={F2} />
      <rect x="33" y="38" width="8" height="14" fill={F} />
    </g>
  ),
  hanger_2: (
    <g {...sw}>
      <line x1="8" y1="5" x2="8" y2="59" />
      <line x1="32" y1="5" x2="32" y2="59" />
      <line x1="56" y1="5" x2="56" y2="59" />
      <line x1="8" y1="14" x2="56" y2="14" stroke={A} />
      <line x1="8" y1="36" x2="56" y2="36" stroke={A} />
      <rect x="13" y="16" width="14" height="13" fill={F} />
      <rect x="37" y="16" width="14" height="13" fill={F2} />
      <rect x="13" y="38" width="14" height="13" fill={F2} />
      <rect x="37" y="38" width="14" height="13" fill={F} />
    </g>
  ),
  hanger_3: (
    <g {...sw}>
      <line x1="6" y1="5" x2="6" y2="59" />
      <line x1="23" y1="5" x2="23" y2="59" />
      <line x1="41" y1="5" x2="41" y2="59" />
      <line x1="58" y1="5" x2="58" y2="59" />
      <line x1="6" y1="14" x2="58" y2="14" stroke={A} />
      <line x1="6" y1="36" x2="58" y2="36" stroke={A} />
      <rect x="9" y="16" width="11" height="13" fill={F} />
      <rect x="26" y="16" width="12" height="13" fill={F2} />
      <rect x="44" y="16" width="11" height="13" fill={F} />
      <rect x="9" y="38" width="11" height="13" fill={F2} />
      <rect x="26" y="38" width="12" height="13" fill={F} />
      <rect x="44" y="38" width="11" height="13" fill={F2} />
    </g>
  ),
  hanger_system: (
    <g {...sw}>
      <line x1="12" y1="6" x2="12" y2="58" />
      <line x1="52" y1="6" x2="52" y2="58" />
      <line x1="12" y1="14" x2="52" y2="14" stroke={A} />
      <rect x="20" y="16" width="10" height="16" fill={F} />
      <rect x="33" y="16" width="10" height="16" fill={F2} />
      <rect x="12" y="37" width="40" height="4" fill={WOOD} />
      <rect x="12" y="45" width="40" height="11" fill={WOOD} />
      <line x1="28" y1="50" x2="36" y2="50" stroke={A} />
    </g>
  ),
  // ── 책상 ──
  desk_small: (
    <g {...sw}>
      <rect x="11" y="24" width="42" height="5" rx="1" fill={WOOD} />
      <line x1="15" y1="29" x2="15" y2="54" />
      <line x1="49" y1="29" x2="49" y2="54" />
      <line x1="15" y1="44" x2="49" y2="44" stroke="#94a3b8" />
    </g>
  ),
  desk_corner: (
    <g {...sw}>
      <path d="M5 17h54v12H25v24H5z" fill={WOOD} />
      <rect x="27" y="6" width="18" height="10" rx="1" fill="#1e293b" />
      <rect x="8" y="36" width="14" height="15" fill={F2} />
      <line x1="55" y1="29" x2="55" y2="53" />
    </g>
  ),
  desk_motion: (
    <g {...sw}>
      <rect x="6" y="24" width="52" height="5" rx="1.5" fill={WOOD} />
      <rect x="14" y="29" width="5" height="23" fill="#cbd5e1" />
      <rect x="45" y="29" width="5" height="23" fill="#cbd5e1" />
      <line x1="9" y1="54" x2="24" y2="54" strokeWidth={2.5} />
      <line x1="40" y1="54" x2="55" y2="54" strokeWidth={2.5} />
      <path d="M32 7v13M28 11l4-4 4 4M28 16l4 4 4-4" fill="none" stroke={A} />
      <rect x="48" y="29" width="7" height="3" fill={A} stroke="none" />
    </g>
  ),
  desk_study: (
    <g {...sw}>
      <rect x="10" y="7" width="44" height="48" rx="2" fill={WOOD} />
      <rect x="14" y="11" width="36" height="11" fill={F} />
      <line x1="32" y1="11" x2="32" y2="22" />
      <rect x="14" y="32" width="36" height="4" fill="#fdba74" />
      <line x1="14" y1="36" x2="14" y2="55" />
      <line x1="50" y1="36" x2="50" y2="55" />
      <line x1="25" y1="26" x2="39" y2="26" stroke={A} strokeWidth={2.5} />
    </g>
  ),
  // ── 캐리어 ──
  carrier_s: (
    <g {...sw}>
      <rect x="21" y="23" width="22" height="27" rx="4" fill={F} />
      <path d="M27 23V13a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10" fill="none" />
      <line x1="27" y1="29" x2="27" y2="45" stroke={A} />
      <line x1="37" y1="29" x2="37" y2="45" stroke={A} />
      <circle cx="25" cy="53" r="2.2" fill="#1e293b" />
      <circle cx="39" cy="53" r="2.2" fill="#1e293b" />
    </g>
  ),
  carrier_l: (
    <g {...sw}>
      <rect x="12" y="11" width="40" height="42" rx="5" fill={F2} />
      <path d="M26 11V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" fill="none" />
      <line x1="12" y1="32" x2="52" y2="32" stroke="#f59e0b" strokeWidth={3} />
      <line x1="22" y1="17" x2="22" y2="47" />
      <line x1="42" y1="17" x2="42" y2="47" />
      <circle cx="17" cy="56" r="2.5" fill="#1e293b" />
      <circle cx="24" cy="56" r="2.5" fill="#1e293b" />
      <circle cx="40" cy="56" r="2.5" fill="#1e293b" />
      <circle cx="47" cy="56" r="2.5" fill="#1e293b" />
    </g>
  ),
  // ── 캠핑/생활기타 ──
  camping_tent: (
    <g {...sw}>
      <path d="M8 50L32 13l24 37z" fill="#86efac" />
      <path d="M24 50L32 29l8 21z" fill="#166534" stroke={S} />
      <line x1="5" y1="50" x2="59" y2="50" />
      <line x1="29" y1="9" x2="35" y2="17" />
      <line x1="35" y1="9" x2="29" y2="17" />
      <circle cx="13" cy="20" r="3" fill="#facc15" stroke="none" />
    </g>
  ),
  drying_rack: (
    <g {...sw}>
      <path d="M4 18l14 4h28l14-4" fill="none" />
      <line x1="18" y1="22" x2="46" y2="54" />
      <line x1="46" y1="22" x2="18" y2="54" />
      <line x1="11" y1="20" x2="53" y2="20" stroke={A} />
      <line x1="8" y1="27" x2="56" y2="27" stroke="#94a3b8" />
      <line x1="18" y1="33" x2="46" y2="33" stroke="#94a3b8" />
      <rect x="22" y="13" width="8" height="9" rx="1" fill={F2} />
      <rect x="34" y="13" width="9" height="10" rx="1" fill="#fca5a5" />
    </g>
  ),
  foot_massager: (
    <g {...sw}>
      <path d="M10 30c0-8 5-12 12-12h20c7 0 12 4 12 12v18c0 3-2 5-5 5H15c-3 0-5-2-5-5V30z" fill={F} />
      <ellipse cx="22" cy="27" rx="6" ry="7" fill="#1e293b" />
      <ellipse cx="42" cy="27" rx="6" ry="7" fill="#1e293b" />
      <rect x="27" y="40" width="10" height="5" rx="2" fill={A} stroke="none" />
    </g>
  ),
  // ── 피아노 ──
  piano_digital: (
    <g {...sw}>
      <rect x="18" y="13" width="28" height="11" rx="1.5" fill={W} />
      <rect x="6" y="24" width="52" height="10" rx="2" fill="#1e293b" />
      <rect x="8" y="29" width="48" height="5" fill={W} />
      <line x1="14" y1="34" x2="14" y2="56" strokeWidth={2.5} />
      <line x1="50" y1="34" x2="50" y2="56" strokeWidth={2.5} />
      <line x1="14" y1="50" x2="50" y2="50" />
      <rect x="27" y="51" width="10" height="4" rx="1" fill="#f59e0b" stroke="none" />
    </g>
  ),
  piano_grand: (
    <g {...sw}>
      <path d="M9 12L46 4c8 0 12 6 10 14L44 28H9z" fill="#1e293b" />
      <line x1="48" y1="12" x2="42" y2="28" stroke="#f59e0b" />
      <path d="M7 28h48v8c0 5-6 6-14 6-10 0-12-7-22-7H7z" fill="#1e293b" />
      <rect x="7" y="33" width="24" height="5" fill={W} />
      <line x1="11" y1="38" x2="11" y2="57" strokeWidth={2.5} />
      <line x1="30" y1="38" x2="30" y2="57" strokeWidth={2.5} />
      <line x1="51" y1="41" x2="51" y2="57" strokeWidth={2.5} />
    </g>
  ),
}
