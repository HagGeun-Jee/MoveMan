import type { ReactNode } from 'react'
import { EXTRA_ICONS } from './extraIcons'
import { iconKeyFor } from './itemIconMap'

// 소형이사 물품 아이콘 (실제 규격/형태에 가깝게 그린 SVG, 64x64)
const S = '#475569' // 선
const F = '#e0f2fe' // 면
const F2 = '#bfdbfe' // 짙은 면
const A = '#2563eb' // 포인트
const W = '#ffffff'

const sw = { stroke: S, strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

const ICONS: Record<string, ReactNode> = {
  // ── 냉장고 ──
  // 소형: 위(냉동)/아래(냉장) 문 2개, 키가 작음
  fridge_s: (
    <g {...sw}>
      <rect x="17" y="16" width="30" height="40" rx="3" fill={F} />
      <line x1="17" y1="30" x2="47" y2="30" />
      <line x1="41" y1="21" x2="41" y2="26" stroke={A} />
      <line x1="41" y1="35" x2="41" y2="45" stroke={A} />
      <line x1="21" y1="56" x2="21" y2="59" />
      <line x1="43" y1="56" x2="43" y2="59" />
    </g>
  ),
  // 중형: 위 냉동(작게) / 아래 냉장(크게) 2도어, 키가 큼
  fridge_m: (
    <g {...sw}>
      <rect x="16" y="5" width="32" height="53" rx="3" fill={F} />
      <line x1="16" y1="21" x2="48" y2="21" />
      <line x1="42" y1="11" x2="42" y2="17" stroke={A} />
      <line x1="42" y1="27" x2="42" y2="40" stroke={A} />
    </g>
  ),
  // 대형: 양문형(좌우 문) + 하단 서랍
  fridge_l: (
    <g {...sw}>
      <rect x="9" y="5" width="46" height="53" rx="3" fill={F} />
      <line x1="32" y1="5" x2="32" y2="46" />
      <line x1="9" y1="46" x2="55" y2="46" />
      <line x1="28" y1="18" x2="28" y2="30" stroke={A} />
      <line x1="36" y1="18" x2="36" y2="30" stroke={A} />
      <line x1="26" y1="52" x2="38" y2="52" stroke={A} />
    </g>
  ),
  // ── 세탁기/건조기 ──
  washer_t: (
    <g {...sw}>
      <rect x="14" y="7" width="36" height="50" rx="3" fill={F} />
      <line x1="14" y1="20" x2="50" y2="20" />
      <circle cx="22" cy="13.5" r="2.5" fill={A} stroke="none" />
      <rect x="28" y="11" width="16" height="5" rx="1.5" fill={W} />
      <rect x="20" y="26" width="24" height="22" rx="3" fill={F2} />
      <line x1="32" y1="26" x2="32" y2="48" />
    </g>
  ),
  washer_d: (
    <g {...sw}>
      <rect x="12" y="7" width="40" height="50" rx="3" fill={F} />
      <line x1="12" y1="19" x2="52" y2="19" />
      <circle cx="20" cy="13" r="2.5" fill={A} stroke="none" />
      <rect x="35" y="11" width="12" height="4" rx="1.5" fill={W} />
      <circle cx="32" cy="38" r="13" fill={W} />
      <circle cx="32" cy="38" r="9" fill={F2} />
    </g>
  ),
  dryer: (
    <g {...sw}>
      <rect x="12" y="7" width="40" height="50" rx="3" fill="#fef3c7" />
      <line x1="12" y1="19" x2="52" y2="19" />
      <circle cx="20" cy="13" r="2.5" fill="#f59e0b" stroke="none" />
      <rect x="35" y="11" width="12" height="4" rx="1.5" fill={W} />
      <circle cx="32" cy="38" r="13" fill={W} />
      <path d="M24 38c3-4 5 4 8 0s5 4 8 0" fill="none" stroke="#f59e0b" />
    </g>
  ),
  // ── 가전 ──
  tv_s: (
    <g {...sw}>
      <rect x="10" y="16" width="44" height="28" rx="2" fill="#1e293b" />
      <rect x="13" y="19" width="38" height="22" fill={F2} stroke="none" />
      <line x1="32" y1="44" x2="32" y2="50" />
      <line x1="22" y1="51" x2="42" y2="51" />
    </g>
  ),
  tv_l: (
    <g {...sw}>
      <rect x="3" y="12" width="58" height="34" rx="2" fill="#1e293b" />
      <rect x="6" y="15" width="52" height="28" fill={F2} stroke="none" />
      <path d="M26 46l-3 6h18l-3-6" fill={F} />
    </g>
  ),
  ac_stand: (
    <g {...sw}>
      <rect x="20" y="4" width="24" height="54" rx="5" fill={F} />
      <rect x="25" y="9" width="14" height="4" rx="1" fill={W} />
      <line x1="25" y1="20" x2="39" y2="20" />
      <line x1="25" y1="25" x2="39" y2="25" />
      <line x1="25" y1="30" x2="39" y2="30" />
      <circle cx="32" cy="46" r="6" fill={W} />
      <circle cx="32" cy="46" r="2" fill={A} stroke="none" />
    </g>
  ),
  ac_wall: (
    <g {...sw}>
      <rect x="6" y="14" width="52" height="20" rx="7" fill={F} />
      <line x1="12" y1="28" x2="52" y2="28" />
      <circle cx="48" cy="20" r="1.8" fill={A} stroke="none" />
      <path d="M16 40c2 3 4 3 6 0M30 40c2 3 4 3 6 0M44 40c2 3 4 3 6 0" fill="none" stroke={A} />
    </g>
  ),
  micro: (
    <g {...sw}>
      <rect x="6" y="20" width="52" height="30" rx="3" fill={F} />
      <rect x="10" y="24" width="30" height="22" rx="2" fill={W} />
      <line x1="44" y1="26" x2="44" y2="44" />
      <circle cx="51" cy="29" r="2" fill={A} stroke="none" />
      <circle cx="51" cy="37" r="2" fill={A} stroke="none" />
    </g>
  ),
  purifier: (
    <g {...sw}>
      <rect x="18" y="8" width="28" height="48" rx="7" fill={F} />
      <line x1="24" y1="22" x2="40" y2="22" />
      <line x1="24" y1="28" x2="40" y2="28" />
      <line x1="24" y1="34" x2="40" y2="34" />
      <line x1="24" y1="40" x2="40" y2="40" />
      <circle cx="32" cy="15" r="2.5" fill={A} stroke="none" />
    </g>
  ),
  // 컴퓨터 본체 (타워형: 전면 드라이브/전원 버튼/통풍구)
  pc_tower: (
    <g {...sw}>
      <rect x="12" y="5" width="40" height="52" rx="4" fill="#1e293b" />
      <rect x="16" y="9" width="26" height="44" rx="2" fill="#bfdbfe" />
      <circle cx="29" cy="21" r="8" fill="#e0f2fe" />
      <circle cx="29" cy="21" r="2.2" fill={A} stroke="none" />
      <path d="M29 13v5M29 24v5M21 21h5M32 21h5" stroke={A} strokeWidth={1.5} />
      <circle cx="29" cy="41" r="8" fill="#e0f2fe" />
      <circle cx="29" cy="41" r="2.2" fill={A} stroke="none" />
      <path d="M29 33v5M29 44v5M21 41h5M32 41h5" stroke={A} strokeWidth={1.5} />
      <line x1="18" y1="50" x2="40" y2="50" stroke="#f59e0b" />
      <circle cx="47" cy="12" r="2" fill="#22c55e" stroke="none" />
      <line x1="45" y1="22" x2="49" y2="22" stroke="#94a3b8" />
      <line x1="45" y1="26" x2="49" y2="26" stroke="#94a3b8" />
      <line x1="45" y1="30" x2="49" y2="30" stroke="#94a3b8" />
      <line x1="45" y1="34" x2="49" y2="34" stroke="#94a3b8" />
      <line x1="17" y1="57" x2="17" y2="60" />
      <line x1="47" y1="57" x2="47" y2="60" />
    </g>
  ),
  // 모니터 (일반): 화면 + 받침대
  monitor_s: (
    <g {...sw}>
      <rect x="9" y="9" width="46" height="31" rx="3" fill="#e2e8f0" />
      <rect x="12" y="12" width="40" height="25" rx="1" fill="#f8fafc" />
      <rect x="12" y="12" width="40" height="5" fill={A} stroke="none" />
      <circle cx="15" cy="14.5" r="1" fill={W} stroke="none" />
      <circle cx="19" cy="14.5" r="1" fill={W} stroke="none" />
      <rect x="16" y="21" width="14" height="11" rx="1" fill={F2} stroke="none" />
      <line x1="34" y1="22" x2="48" y2="22" stroke="#94a3b8" />
      <line x1="34" y1="26" x2="48" y2="26" stroke="#94a3b8" />
      <line x1="34" y1="30" x2="44" y2="30" stroke="#94a3b8" />
      <rect x="29" y="40" width="6" height="9" fill="#cbd5e1" />
      <ellipse cx="32" cy="52" rx="13" ry="3" fill="#cbd5e1" />
    </g>
  ),
  // 모니터 (와이드/대형): 가로로 긴 화면 + 곡면 느낌
  monitor_l: (
    <g {...sw}>
      <path d="M2 17 Q32 9 62 17 V39 Q32 47 2 39 Z" fill="#e2e8f0" />
      <path d="M6 19 Q32 12 58 19 V36 Q32 43 6 36 Z" fill="#f8fafc" stroke="none" />
      <path d="M6 19 Q32 12 58 19 V23 Q32 16 6 23 Z" fill={A} stroke="none" />
      <rect x="11" y="27" width="16" height="8" rx="1" fill={F2} stroke="none" />
      <line x1="32" y1="27" x2="52" y2="27" stroke="#94a3b8" />
      <line x1="32" y1="31" x2="52" y2="31" stroke="#94a3b8" />
      <rect x="29" y="43" width="6" height="7" fill="#cbd5e1" />
      <ellipse cx="32" cy="53" rx="14" ry="3" fill="#cbd5e1" />
    </g>
  ),
  // ── 가구 ──
  wardrobe_3: (
    <g {...sw}>
      <rect x="15" y="5" width="34" height="53" rx="2" fill="#fde68a" />
      <line x1="32" y1="5" x2="32" y2="58" />
      <line x1="28" y1="28" x2="28" y2="36" stroke={S} />
      <line x1="36" y1="28" x2="36" y2="36" stroke={S} />
      <line x1="15" y1="58" x2="49" y2="58" />
    </g>
  ),
  wardrobe_5: (
    <g {...sw}>
      <rect x="6" y="5" width="52" height="53" rx="2" fill="#fde68a" />
      <line x1="23" y1="5" x2="23" y2="44" />
      <line x1="41" y1="5" x2="41" y2="44" />
      <line x1="6" y1="44" x2="58" y2="44" />
      <line x1="30" y1="24" x2="30" y2="32" />
      <line x1="34" y1="24" x2="34" y2="32" />
      <line x1="19" y1="24" x2="19" y2="32" />
      <line x1="45" y1="24" x2="45" y2="32" />
      <line x1="28" y1="51" x2="36" y2="51" />
    </g>
  ),
  drawer: (
    <g {...sw}>
      <rect x="12" y="10" width="40" height="44" rx="2" fill="#fde68a" />
      <line x1="12" y1="21" x2="52" y2="21" />
      <line x1="12" y1="32" x2="52" y2="32" />
      <line x1="12" y1="43" x2="52" y2="43" />
      <line x1="28" y1="15.5" x2="36" y2="15.5" stroke={A} />
      <line x1="28" y1="26.5" x2="36" y2="26.5" stroke={A} />
      <line x1="28" y1="37.5" x2="36" y2="37.5" stroke={A} />
      <line x1="28" y1="48.5" x2="36" y2="48.5" stroke={A} />
    </g>
  ),
  hanger: (
    <g {...sw}>
      <line x1="8" y1="14" x2="56" y2="14" />
      <line x1="10" y1="14" x2="10" y2="56" />
      <line x1="54" y1="14" x2="54" y2="56" />
      <path d="M22 14l-6 8h12zM32 14l-6 8h12zM42 14l-6 8h12z" fill={F2} />
      <path d="M17 22v18h10V22M27 22v22h10V22M37 22v16h10V22" fill={F} />
    </g>
  ),
  desk: (
    <g {...sw}>
      <rect x="5" y="22" width="54" height="5" rx="1" fill="#fde68a" />
      <rect x="8" y="27" width="4" height="26" fill="#fde68a" />
      <rect x="40" y="27" width="16" height="22" fill="#fde68a" />
      <line x1="40" y1="38" x2="56" y2="38" />
      <rect x="18" y="8" width="18" height="12" rx="1" fill="#1e293b" />
      <line x1="27" y1="20" x2="27" y2="22" />
    </g>
  ),
  chair: (
    <g {...sw}>
      <rect x="19" y="6" width="26" height="22" rx="5" fill={F2} />
      <rect x="15" y="31" width="34" height="8" rx="3" fill={F} />
      <line x1="32" y1="39" x2="32" y2="50" />
      <path d="M18 54h28M32 50l-14 4M32 50l14 4" fill="none" />
    </g>
  ),
  shelf: (
    <g {...sw}>
      <rect x="13" y="5" width="38" height="53" rx="2" fill="#fde68a" />
      <line x1="13" y1="21" x2="51" y2="21" />
      <line x1="13" y1="38" x2="51" y2="38" />
      <rect x="17" y="10" width="4" height="11" fill={A} stroke="none" />
      <rect x="23" y="12" width="4" height="9" fill="#f59e0b" stroke="none" />
      <rect x="29" y="9" width="5" height="12" fill="#10b981" stroke="none" />
      <rect x="18" y="28" width="9" height="10" fill={F2} stroke="none" />
      <rect x="36" y="45" width="10" height="13" fill={F2} stroke="none" />
    </g>
  ),
  sofa_2: (
    <g {...sw}>
      <rect x="12" y="18" width="40" height="16" rx="6" fill={F2} />
      <rect x="6" y="26" width="10" height="22" rx="4" fill={F} />
      <rect x="48" y="26" width="10" height="22" rx="4" fill={F} />
      <rect x="14" y="32" width="36" height="14" rx="3" fill={F} />
      <line x1="32" y1="32" x2="32" y2="46" />
      <line x1="12" y1="48" x2="12" y2="53" />
      <line x1="52" y1="48" x2="52" y2="53" />
    </g>
  ),
  sofa_3: (
    <g {...sw}>
      <rect x="8" y="18" width="48" height="16" rx="6" fill={F2} />
      <rect x="2" y="26" width="10" height="22" rx="4" fill={F} />
      <rect x="52" y="26" width="10" height="22" rx="4" fill={F} />
      <rect x="10" y="32" width="44" height="14" rx="3" fill={F} />
      <line x1="24" y1="32" x2="24" y2="46" />
      <line x1="40" y1="32" x2="40" y2="46" />
      <line x1="8" y1="48" x2="8" y2="53" />
      <line x1="56" y1="48" x2="56" y2="53" />
    </g>
  ),
  table: (
    <g {...sw}>
      <rect x="8" y="22" width="48" height="5" rx="1.5" fill="#fde68a" />
      <line x1="12" y1="27" x2="12" y2="52" />
      <line x1="52" y1="27" x2="52" y2="52" />
      <rect x="1" y="30" width="6" height="14" rx="2" fill={F2} />
      <rect x="57" y="30" width="6" height="14" rx="2" fill={F2} />
    </g>
  ),
  shoes: (
    <g {...sw}>
      <rect x="12" y="10" width="40" height="44" rx="2" fill="#fde68a" />
      <path d="M12 22h40M12 36h40" />
      <path d="M16 20l32-2M16 34l32-2M16 48l32-2" stroke={A} />
    </g>
  ),
  mirror: (
    <g {...sw}>
      <rect x="20" y="5" width="24" height="44" rx="12" fill={F2} />
      <rect x="24" y="9" width="16" height="36" rx="8" fill={W} />
      <line x1="32" y1="49" x2="32" y2="58" />
      <line x1="22" y1="58" x2="42" y2="58" />
    </g>
  ),
  // ── 침대/매트리스 ──
  bed_s: (
    <g {...sw}>
      <rect x="6" y="14" width="5" height="36" rx="1.5" fill="#fde68a" />
      <rect x="11" y="32" width="46" height="10" rx="3" fill={F2} />
      <rect x="11" y="42" width="46" height="8" rx="2" fill="#fde68a" />
      <rect x="14" y="24" width="14" height="8" rx="3" fill={W} />
      <line x1="55" y1="50" x2="55" y2="55" />
      <line x1="9" y1="50" x2="9" y2="55" />
    </g>
  ),
  bed_q: (
    <g {...sw}>
      <rect x="3" y="12" width="5" height="40" rx="1.5" fill="#fde68a" />
      <rect x="8" y="32" width="53" height="11" rx="3" fill={F2} />
      <rect x="8" y="43" width="53" height="9" rx="2" fill="#fde68a" />
      <rect x="11" y="23" width="15" height="9" rx="3" fill={W} />
      <rect x="29" y="23" width="15" height="9" rx="3" fill={W} />
    </g>
  ),
  mat_s: (
    <g {...sw}>
      <rect x="8" y="22" width="48" height="16" rx="4" fill={F2} />
      <path d="M8 30h48M22 22v16M36 22v16M48 22v16" stroke={W} />
      <rect x="8" y="38" width="48" height="3" rx="1" fill={F} />
    </g>
  ),
  mat_q: (
    <g {...sw}>
      <rect x="4" y="20" width="56" height="20" rx="5" fill={F2} />
      <path d="M4 30h56M18 20v20M32 20v20M46 20v20" stroke={W} />
      <rect x="4" y="40" width="56" height="3" rx="1" fill={F} />
    </g>
  ),
  // ── 박스/짐 ──
  box: (
    <g {...sw}>
      <path d="M10 22l22-8 22 8v26l-22 8-22-8z" fill="#fcd9a8" />
      <path d="M10 22l22 8 22-8M32 30v26" />
      <path d="M24 17l22 8v6l-8-3" fill={F} stroke={A} />
    </g>
  ),
  bag: (
    <g {...sw}>
      <rect x="15" y="14" width="34" height="38" rx="6" fill="#fecaca" />
      <path d="M25 14v-5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5" fill="none" />
      <line x1="25" y1="22" x2="25" y2="46" />
      <line x1="39" y1="22" x2="39" y2="46" />
      <circle cx="22" cy="55" r="2.5" fill={S} />
      <circle cx="42" cy="55" r="2.5" fill={S} />
    </g>
  ),
  plant: (
    <g {...sw}>
      <path d="M22 40h20l-3 16H25z" fill="#fdba74" />
      <path d="M32 40c0-12-10-16-14-20 10-2 14 6 14 20zM32 40c0-14 10-18 14-22-10-1-14 8-14 22z" fill="#86efac" />
      <path d="M32 40c0-9 0-17 0-24" fill="none" />
    </g>
  ),
  // ── 기타 ──
  bike: (
    <g {...sw}>
      <circle cx="16" cy="40" r="11" fill="none" />
      <circle cx="48" cy="40" r="11" fill="none" />
      <path d="M16 40l10-18h16l6 18M26 22l8 18h-18M42 22l-2-6h6" fill="none" stroke={A} />
    </g>
  ),
  treadmill: (
    <g {...sw}>
      <path d="M8 46h42l6-6H14z" fill={F2} />
      <rect x="8" y="46" width="42" height="6" rx="2" fill={F} />
      <path d="M46 40V16" />
      <rect x="38" y="8" width="16" height="8" rx="2" fill="#1e293b" />
      <line x1="14" y1="52" x2="14" y2="57" />
      <line x1="46" y1="52" x2="46" y2="57" />
    </g>
  ),
  cattower: (
    <g {...sw}>
      <rect x="26" y="10" width="8" height="46" fill="#fde68a" />
      <rect x="12" y="50" width="38" height="7" rx="2" fill={F2} />
      <rect x="14" y="14" width="24" height="6" rx="2" fill={F} />
      <rect x="28" y="30" width="22" height="6" rx="2" fill={F} />
      <circle cx="46" cy="22" r="3" fill="#f59e0b" stroke="none" />
    </g>
  ),
  piano: (
    <g {...sw}>
      <rect x="5" y="10" width="54" height="26" rx="2" fill="#1e293b" />
      <rect x="5" y="36" width="54" height="10" fill={W} />
      <path d="M13 36v10M21 36v10M29 36v10M37 36v10M45 36v10M53 36v10" />
      <path d="M11 36v6M19 36v6M35 36v6M43 36v6M51 36v6" stroke="#1e293b" strokeWidth={4} />
      <line x1="10" y1="46" x2="10" y2="58" />
      <line x1="54" y1="46" x2="54" y2="58" />
    </g>
  ),
}

// 기존 물품정보(품목명 + 규격)로 아이콘 표시 - 방문견적 등에서 사용
export function ItemIconByName({ name, spec = '', className = 'w-8 h-8' }: { name: string; spec?: string; className?: string }) {
  return <ItemIcon id={iconKeyFor(name, spec)} className={className} />
}

export function ItemIcon({ id, className = 'w-12 h-12' }: { id: string; className?: string }) {
  const icon = ICONS[id] ?? EXTRA_ICONS[id]
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-hidden="true">
      {icon ?? <rect x="14" y="14" width="36" height="36" rx="4" fill={F} stroke={S} strokeWidth={2} />}
    </svg>
  )
}
