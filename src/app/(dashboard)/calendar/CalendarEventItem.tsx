'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  Navigation,
  Phone,
  Truck,
  User,
  Wrench,
  X,
} from 'lucide-react'

export type CalendarEventKind = 'VISIT' | 'MOVING' | 'VEHICLE'

export interface CalendarEventBalloonData {
  kind: CalendarEventKind
  eventKey: string
  href: string
  // 공통 / 견적 정보
  estimateId?: string
  customerName?: string
  contact?: string
  rawContact?: string
  movingTypeLabel?: string
  visitDateTimeStr?: string
  visitTimeStr?: string
  movingDateStr?: string
  fromAddress?: string
  toAddress?: string
  fromEnvSummary?: string // 예: "12층 · 엘리베이터 · 32평형"
  toEnvSummary?: string
  partnerBadge?: string
  partnerFullName?: string
  estimatorName?: string
  dispatchLabel?: string
  dispatchDetail?: string
  totalCbm?: number
  totalAmount?: number
  isContracted?: boolean
  specialNotes?: string
  // 차량/차계부 일정용
  vehicleLabel?: string
  vehicleTooltip?: string
  isVehicleExpiryOrDue?: boolean
}

interface ActiveTooltipState {
  eventKey: string
  rect: DOMRect
  triggerEl?: HTMLElement | null
  data: CalendarEventBalloonData
  source: 'touch' | 'mouse'
}

interface CalendarTooltipContextValue {
  activeKey: string | null
  openTooltip: (state: ActiveTooltipState) => void
  closeTooltip: () => void
  scheduleCloseIfMouse: () => void
  cancelScheduledClose: () => void
}

const CalendarTooltipContext = createContext<CalendarTooltipContextValue | null>(null)

export function CalendarTooltipProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveTooltipState | null>(null)
  const [mounted, setMounted] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastOpenedAtRef = useRef<number>(0)

  const [pos, setPos] = useState<{
    top: number
    left: number
    width: number
    arrowLeft: number
    placement: 'top' | 'bottom'
  } | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const cancelScheduledClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const closeTooltip = useCallback(() => {
    cancelScheduledClose()
    setActive(null)
    setPos(null)
  }, [cancelScheduledClose])

  const openTooltip = useCallback(
    (next: ActiveTooltipState) => {
      cancelScheduledClose()
      lastOpenedAtRef.current = Date.now()
      setActive(next)
    },
    [cancelScheduledClose]
  )

  const scheduleCloseIfMouse = useCallback(() => {
    cancelScheduledClose()
    closeTimerRef.current = setTimeout(() => {
      setActive((prev) => (prev?.source === 'mouse' ? null : prev))
    }, 160)
  }, [cancelScheduledClose])

  const computePosition = useCallback((rect: DOMRect, actualHeight?: number) => {
    if (typeof window === 'undefined') return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const width = Math.min(316, vw - 24)
    const estHeight = actualHeight || 220
    const gap = 10

    // 태블릿에서 손가락으로 누르고 있을 때 손에 가려지지 않도록 위쪽('top') 배치를 최우선으로 선택
    let placement: 'top' | 'bottom' = 'top'
    let top = rect.top - estHeight - gap

    if (top < 12 && vh - rect.bottom > rect.top) {
      placement = 'bottom'
      top = Math.min(vh - estHeight - 12, rect.bottom + gap)
    } else if (top < 12) {
      top = 12
    }

    const triggerCenterX = rect.left + rect.width / 2
    let left = triggerCenterX - width / 2
    if (left < 12) left = 12
    if (left + width > vw - 12) left = vw - 12

    const arrowLeft = Math.max(18, Math.min(width - 18, triggerCenterX - left))
    setPos({ top, left, width, arrowLeft, placement })
  }, [])

  useLayoutEffect(() => {
    if (!active) {
      setPos(null)
      return
    }
    const measuredHeight = tooltipRef.current?.offsetHeight
    computePosition(active.rect, measuredHeight)
  }, [active, computePosition])

  // 풍선도움말 렌더링 직후 실제 높이에 맞춰 정밀 재보정
  useEffect(() => {
    if (!active || !tooltipRef.current) return
    const raf = requestAnimationFrame(() => {
      if (tooltipRef.current) {
        computePosition(active.rect, tooltipRef.current.offsetHeight)
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [active, computePosition])

  // 바깥 영역 터치/클릭, 스크롤, ESC 키 감지 시 풍선도움말 닫기
  useEffect(() => {
    if (!active) return

    const handlePointerDownOutside = (e: PointerEvent) => {
      // 방금 롱프레스로 열린 직후의 미세 이벤트 무시
      if (Date.now() - lastOpenedAtRef.current < 80) return
      const target = e.target as Node | null
      if (tooltipRef.current && target && tooltipRef.current.contains(target)) {
        return
      }
      closeTooltip()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeTooltip()
      }
    }

    const handleScrollOrResize = () => {
      if (active.triggerEl && document.body.contains(active.triggerEl)) {
        const nextRect = active.triggerEl.getBoundingClientRect()
        if (
          nextRect.bottom < 0 ||
          nextRect.top > window.innerHeight ||
          nextRect.right < 0 ||
          nextRect.left > window.innerWidth
        ) {
          closeTooltip()
          return
        }
        computePosition(nextRect, tooltipRef.current?.offsetHeight)
        return
      }
      closeTooltip()
    }

    document.addEventListener('pointerdown', handlePointerDownOutside, true)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside, true)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [active, closeTooltip, computePosition])

  const renderBalloonContent = (d: CalendarEventBalloonData) => {
    if (d.kind === 'VEHICLE') {
      const borderTheme = d.isVehicleExpiryOrDue
        ? 'border-purple-300'
        : 'border-amber-300'
      const badgeTheme = d.isVehicleExpiryOrDue
        ? 'bg-purple-100 text-purple-900 border-purple-200'
        : 'bg-amber-100 text-amber-950 border-amber-200'

      return (
        <div
          ref={tooltipRef}
          role="dialog"
          aria-modal="false"
          onMouseEnter={cancelScheduledClose}
          onMouseLeave={() => {
            if (active?.source === 'mouse') scheduleCloseIfMouse()
          }}
          style={{
            position: 'fixed',
            top: pos ? `${pos.top}px` : '-9999px',
            left: pos ? `${pos.left}px` : '-9999px',
            width: pos ? `${pos.width}px` : '300px',
            zIndex: 9999,
          }}
          className={`bg-white rounded-2xl shadow-2xl border-2 ${borderTheme} p-3 text-gray-800 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* 말풍선 꼬리 */}
          {pos && (
            <div
              style={{ left: `${pos.arrowLeft - 6}px` }}
              className={`absolute w-3 h-3 bg-white rotate-45 ${
                pos.placement === 'top'
                  ? `-bottom-[7px] border-r-2 border-b-2 ${borderTheme}`
                  : `-top-[7px] border-l-2 border-t-2 ${borderTheme}`
              }`}
            />
          )}

          <div className="flex items-start justify-between gap-2 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`shrink-0 px-1.5 py-0.5 rounded-md text-[11px] font-extrabold border ${badgeTheme}`}>
                차량일정
              </span>
              <span className="text-xs font-black text-gray-900 truncate">{d.vehicleLabel}</span>
            </div>
            <button
              type="button"
              onClick={closeTooltip}
              aria-label="닫기"
              className="p-0.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0"
            >
              <X size={14} />
            </button>
          </div>

          <div className="py-2 text-xs text-gray-700 leading-relaxed flex items-start gap-1.5">
            <Wrench size={13} className="text-amber-600 shrink-0 mt-0.5" />
            <span className="break-keep">{d.vehicleTooltip || d.vehicleLabel}</span>
          </div>

          <div className="pt-1.5 border-t border-gray-100 flex justify-end">
            <Link
              href={d.href}
              onClick={closeTooltip}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-extrabold transition-colors"
            >
              <span>차계부에서 보기</span>
              <ExternalLink size={11} />
            </Link>
          </div>
        </div>
      )
    }

    const isVisit = d.kind === 'VISIT'
    const borderTheme = isVisit ? 'border-blue-300' : 'border-red-300'
    const headerBg = isVisit ? 'bg-blue-50/80' : 'bg-red-50/80'
    const primaryBadge = isVisit
      ? 'bg-blue-600 text-white'
      : 'bg-red-600 text-white'
    const displayVisitTime =
      d.visitTimeStr && d.visitTimeStr !== '00:00' ? d.visitTimeStr : ''

    return (
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="false"
        onMouseEnter={cancelScheduledClose}
        onMouseLeave={() => {
          if (active?.source === 'mouse') scheduleCloseIfMouse()
        }}
        style={{
          position: 'fixed',
          top: pos ? `${pos.top}px` : '-9999px',
          left: pos ? `${pos.left}px` : '-9999px',
          width: pos ? `${pos.width}px` : '308px',
          zIndex: 9999,
        }}
        className={`bg-white rounded-2xl shadow-2xl border-2 ${borderTheme} overflow-visible text-gray-800 animate-in fade-in zoom-in-95 duration-150`}
      >
        {/* 말풍선 꼬리 화살표 */}
        {pos && (
          <div
            style={{ left: `${pos.arrowLeft - 6}px` }}
            className={`absolute w-3 h-3 bg-white rotate-45 ${
              pos.placement === 'top'
                ? `-bottom-[7px] border-r-2 border-b-2 ${borderTheme}`
                : `-top-[7px] border-l-2 border-t-2 ${borderTheme}`
            }`}
          />
        )}

        {/* 상단 헤더 */}
        <div className={`px-3 py-2 rounded-t-[14px] ${headerBg} border-b border-gray-100 flex items-center justify-between gap-1.5`}>
          <div className="flex flex-wrap items-center gap-1 min-w-0">
            <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-extrabold ${primaryBadge}`}>
              {isVisit ? '방문견적' : '이사작업'}
            </span>
            {isVisit && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-black bg-white text-blue-800 border border-blue-200 tabular-nums">
                <Clock size={11} className="text-blue-600" />
                {displayVisitTime || '시간미정'}
              </span>
            )}
            {d.movingTypeLabel && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-white text-gray-700 border border-gray-200">
                {d.movingTypeLabel}
              </span>
            )}
            {d.partnerFullName && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-200">
                {d.partnerFullName}
              </span>
            )}
            {d.isContracted && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                계약완료
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={closeTooltip}
            aria-label="닫기"
            className="p-0.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white/80 shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* 본문 상세 정보 */}
        <div className="p-3 space-y-1.5 text-xs">
          {/* 고객명 및 연락처 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-black text-gray-900 text-[13px] min-w-0">
              <User size={13} className={isVisit ? 'text-blue-600 shrink-0' : 'text-red-600 shrink-0'} />
              <span className="truncate">{d.customerName} 고객님</span>
            </div>
            {d.contact && (
              <a
                href={d.rawContact ? `tel:${d.rawContact}` : undefined}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200 shrink-0 tabular-nums"
              >
                <Phone size={10} />
                <span>{d.contact}</span>
              </a>
            )}
          </div>

          {/* 출발지(방문지) 주소 */}
          {d.fromAddress && (
            <div className="flex items-start gap-1.5 text-[11px] text-gray-700 leading-snug">
              <MapPin size={13} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-bold text-gray-900">{isVisit ? '방문지: ' : '출발지: '}</span>
                <span className="break-keep">{d.fromAddress}</span>
                {d.fromEnvSummary && (
                  <span className="ml-1 text-[10px] font-semibold text-gray-500">({d.fromEnvSummary})</span>
                )}
              </div>
            </div>
          )}

          {/* 도착지 주소 */}
          {d.toAddress && (
            <div className="flex items-start gap-1.5 text-[11px] text-gray-700 leading-snug">
              <Navigation size={13} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-bold text-gray-900">도착지: </span>
                <span className="break-keep">{d.toAddress}</span>
                {d.toEnvSummary && (
                  <span className="ml-1 text-[10px] font-semibold text-gray-500">({d.toEnvSummary})</span>
                )}
              </div>
            </div>
          )}

          {/* 일정 및 담당자/배차 요약 */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-[11px] text-gray-600">
            {isVisit ? (
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} className="text-gray-400" />
                <span>이사예정:</span>
                <strong className="text-gray-900">{d.movingDateStr || '미정'}</strong>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Truck size={12} className="text-red-500" />
                <span>배차:</span>
                <strong className="text-gray-900">{d.dispatchDetail || d.dispatchLabel || '미배차'}</strong>
              </span>
            )}
            {d.estimatorName && (
              <span className="text-gray-500">
                담당: <strong className="text-gray-800">{d.estimatorName}</strong>
              </span>
            )}
          </div>

          {/* 산출 물량 / 견적 금액 (산출된 내역이 있을 때만 표시) */}
          {((d.totalCbm && d.totalCbm > 0) || (d.totalAmount && d.totalAmount > 0)) && (
            <div className="flex items-center justify-between bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100 text-[11px]">
              <span className="text-gray-600">
                물량: <strong className="text-gray-900">{d.totalCbm ? `${d.totalCbm.toFixed(1)} CBM` : '-'}</strong>
              </span>
              <span className="text-gray-600">
                견적가:{' '}
                <strong className="text-blue-700">
                  {d.totalAmount && d.totalAmount > 0 ? `${d.totalAmount.toLocaleString()}원` : '미산출'}
                </strong>
              </span>
            </div>
          )}

          {/* 특이사항 / 메모 */}
          {d.specialNotes && (
            <div className="bg-amber-50/90 border border-amber-200/80 rounded-lg px-2.5 py-1.5 text-[11px] text-amber-950 flex items-start gap-1.5">
              <FileText size={12} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="line-clamp-3 whitespace-pre-line leading-snug break-keep">{d.specialNotes}</p>
            </div>
          )}
        </div>

        {/* 하단 바로가기 푸터 */}
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/70 rounded-b-[14px] flex items-center justify-between">
          <span className="text-[10px] text-gray-400 font-mono">{d.estimateId}</span>
          <Link
            href={d.href}
            onClick={closeTooltip}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors ${
              isVisit
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            <span>견적 상세보기</span>
            <ExternalLink size={11} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <CalendarTooltipContext.Provider
      value={{
        activeKey: active?.eventKey || null,
        openTooltip,
        closeTooltip,
        scheduleCloseIfMouse,
        cancelScheduledClose,
      }}
    >
      {children}
      {mounted && active && createPortal(renderBalloonContent(active.data), document.body)}
    </CalendarTooltipContext.Provider>
  )
}

export function CalendarEventItem({ data }: { data: CalendarEventBalloonData }) {
  const ctx = useContext(CalendarTooltipContext)
  const linkRef = useRef<HTMLAnchorElement>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetFlagTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressStartRef = useRef<{ x: number; y: number } | null>(null)
  const didLongPressRef = useRef(false)

  const clearTimers = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (resetFlagTimerRef.current) {
      clearTimeout(resetFlagTimerRef.current)
      resetFlagTimerRef.current = null
    }
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => clearTimers()
  }, [])

  // 태블릿 손가락 터치 및 S펜(pen) 길게 누르기 통합 감지
  const handlePointerDown = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // 마우스는 호버로도 동작하지만, 태블릿(touch/pen) 및 좌클릭 홀드 모두 380ms 롱프레스 지원
    pressStartRef.current = { x: e.clientX, y: e.clientY }
    didLongPressRef.current = false
    if (resetFlagTimerRef.current) {
      clearTimeout(resetFlagTimerRef.current)
      resetFlagTimerRef.current = null
    }

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true
      if (e.pointerType !== 'mouse') {
        try {
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(12)
          }
        } catch {}
      }
      if (linkRef.current && ctx) {
        ctx.openTooltip({
          eventKey: data.eventKey,
          rect: linkRef.current.getBoundingClientRect(),
          triggerEl: linkRef.current,
          data,
          source: e.pointerType === 'mouse' ? 'mouse' : 'touch',
        })
      }
    }, 380)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (!pressStartRef.current) return
    const dx = Math.abs(e.clientX - pressStartRef.current.x)
    const dy = Math.abs(e.clientY - pressStartRef.current.y)
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }
  }

  const handlePointerEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    pressStartRef.current = null
    // click 이벤트가 발생하지 않는 브라우저 환경을 대비해 잠시 후 플래그 자동 해제
    if (didLongPressRef.current) {
      if (resetFlagTimerRef.current) clearTimeout(resetFlagTimerRef.current)
      resetFlagTimerRef.current = setTimeout(() => {
        didLongPressRef.current = false
      }, 450)
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (didLongPressRef.current) {
      e.preventDefault()
      e.stopPropagation()
      didLongPressRef.current = false
      if (resetFlagTimerRef.current) {
        clearTimeout(resetFlagTimerRef.current)
        resetFlagTimerRef.current = null
      }
      return
    }
    ctx?.closeTooltip()
  }

  const handlePointerEnter = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== 'mouse') return
    ctx?.cancelScheduledClose()
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      if (linkRef.current && ctx) {
        ctx.openTooltip({
          eventKey: data.eventKey,
          rect: linkRef.current.getBoundingClientRect(),
          triggerEl: linkRef.current,
          data,
          source: 'mouse',
        })
      }
    }, 220)
  }

  const handlePointerLeave = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== 'mouse') return
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    ctx?.scheduleCloseIfMouse()
  }

  const isActive = ctx?.activeKey === data.eventKey

  // 1) 방문견적건: 시간을 최우선(맨 앞)으로 고정 표시
  if (data.kind === 'VISIT') {
    const displayTime =
      data.visitTimeStr && data.visitTimeStr !== '00:00' ? data.visitTimeStr : '방문'

    return (
      <Link
        ref={linkRef}
        href={data.href}
        draggable={false}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
        className={`flex items-center gap-1 text-[11px] sm:text-xs px-1 sm:px-1.5 py-0.5 sm:py-1 bg-blue-100 text-blue-950 font-bold rounded cursor-pointer hover:bg-blue-200 shadow-2xs border transition-all select-none ${
          isActive
            ? 'border-blue-600 ring-2 ring-blue-400/60 bg-blue-200'
            : 'border-blue-300'
        }`}
      >
        <span className="shrink-0 text-[10px] sm:text-[11px] font-black text-blue-800 bg-white/95 px-1 py-0.2 rounded border border-blue-200 leading-tight tabular-nums">
          {displayTime}
        </span>
        <span className="truncate min-w-0 flex-1 leading-tight">
          <span>{data.customerName}</span>
          {data.partnerBadge && (
            <span className="ml-1 text-[10px] font-extrabold text-indigo-800 bg-white/95 px-1 rounded border border-indigo-200">
              {data.partnerBadge}
            </span>
          )}
        </span>
      </Link>
    )
  }

  // 2) 이사/작업건
  if (data.kind === 'MOVING') {
    return (
      <Link
        ref={linkRef}
        href={data.href}
        draggable={false}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
        className={`block text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-red-100 text-red-900 font-bold rounded truncate cursor-pointer hover:bg-red-200 shadow-2xs border transition-all select-none ${
          isActive
            ? 'border-red-600 ring-2 ring-red-400/60 bg-red-200'
            : 'border-red-300'
        }`}
      >
        {data.partnerBadge && (
          <span className="mr-1 text-[10px] font-extrabold text-rose-800 bg-white/95 px-1 rounded border border-rose-200">
            {data.partnerBadge}
          </span>
        )}
        <span>이사: {data.customerName}</span>
        {data.dispatchLabel && (
          <span className="ml-1 text-[10px] font-extrabold text-emerald-800 bg-white/90 px-1 rounded">
            {data.dispatchLabel}
          </span>
        )}
      </Link>
    )
  }

  // 3) 차량검사/정비 일정
  return (
    <Link
      ref={linkRef}
      href={data.href}
      draggable={false}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      className={`block text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 font-bold rounded truncate cursor-pointer shadow-2xs border transition-all select-none ${
        data.isVehicleExpiryOrDue
          ? isActive
            ? 'bg-purple-200 text-purple-950 border-purple-600 ring-2 ring-purple-400/60'
            : 'bg-purple-100 text-purple-900 hover:bg-purple-200 border-purple-300'
          : isActive
            ? 'bg-amber-200 text-amber-950 border-amber-600 ring-2 ring-amber-400/60'
            : 'bg-amber-100 text-amber-950 hover:bg-amber-200 border-amber-300'
      }`}
    >
      <span>{data.vehicleLabel}</span>
    </Link>
  )
}
