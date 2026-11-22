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
  // 안마의자
  massage: (
    <g {...sw}>
      <path d="M18 6c-4 2-6 8-4 14l4 22h26l2 14H10l-2-8z" fill={F2} />
      <rect x="18" y="38" width="30" height="10" rx="4" fill={F} />
      <path d="M44 38l12 8v8H44" fill={F} />
      <rect x="9" y="28" width="9" height="12" rx="3" fill={F} />
      <circle cx="23" cy="18" r="3" fill={A} stroke="none" />
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
}
