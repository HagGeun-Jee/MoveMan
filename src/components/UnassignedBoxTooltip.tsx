'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Info, HelpCircle, Package, X, Sparkles } from 'lucide-react'

interface UnassignedBoxTooltipProps {
  variant?: 'badge' | 'icon' | 'banner'
  className?: string
}

export function UnassignedBoxTooltip({ variant = 'badge', className = '' }: UnassignedBoxTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  // 팝오버 위치를 뷰포트 내에 완벽히 들어오도록 계산 (우측/하단 잘림 원천 방지)
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const popoverWidth = Math.min(360, window.innerWidth - 32)
    const popoverHeight = 350 // 예상 최대 높이

    // Y축 계산: 기본은 버튼 아래쪽, 공간 부족 시 위쪽으로
    let top = rect.bottom + 8
    if (top + popoverHeight > window.innerHeight && rect.top > popoverHeight + 16) {
      top = Math.max(16, rect.top - popoverHeight - 8)
    }

    // X축 계산: 버튼 시작점에 맞추되, 우측 경계선(16px 패딩)을 초과하면 화면 안쪽으로 clamp
    let left = rect.left
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16
    }
    if (left < 16) {
      left = 16
    }

    setPopoverPos({ top, left })
  }, [])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOpen) {
      updatePosition()
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  // 화면 리사이즈 시 위치 재계산 또는 닫기
  useEffect(() => {
    if (!isOpen) return

    const handleResizeOrScroll = () => {
      updatePosition()
    }

    window.addEventListener('resize', handleResizeOrScroll)
    window.addEventListener('scroll', handleResizeOrScroll, true)

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll)
      window.removeEventListener('scroll', handleResizeOrScroll, true)
    }
  }, [isOpen, updatePosition])

  return (
    <div className={`relative inline-block ${className}`} ref={triggerRef}>
      {/* 트리거 버튼 */}
      {variant === 'badge' && (
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:text-indigo-900 transition-colors cursor-pointer shadow-2xs"
          title="미지정 박스에 포함된 짐 내역 보기"
        >
          <Info size={12} className="text-indigo-600" />
          <span>박스 포함내역 안내</span>
        </button>
      )}

      {variant === 'icon' && (
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
          title="미지정 박스 포함 내역"
        >
          <HelpCircle size={13} />
        </button>
      )}

      {variant === 'banner' && (
        <div 
          onClick={handleToggle}
          className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-50/80 border border-indigo-100 text-xs text-indigo-950 cursor-pointer hover:bg-indigo-100/70 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Package size={14} className="text-indigo-600 shrink-0" />
            <span className="font-semibold">
              <strong>기타/미지정 BOX</strong>: 신발, 욕실용품, 거실 바닥 짐 등 순수 노출 잔짐 포함
            </span>
          </div>
          <span className="text-[11px] font-bold text-indigo-700 underline shrink-0 ml-2">
            {isOpen ? '닫기 ▲' : '포함내역 보기 ▼'}
          </span>
        </div>
      )}

      {/* 스마트 고정(fixed) 팝오버: 부모 overflow-hidden 영향 탈출 및 우측 잘림 방지 */}
      {isOpen && popoverPos && (
        <>
          {/* 반투명 백드롭 (바깥 클릭 시 닫기) */}
          <div 
            className="fixed inset-0 z-50 bg-black/15 backdrop-blur-2xs"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
            }}
          />

          {/* 팝오버 본체 (화면 경계 16px 내로 clamp) */}
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              width: 'min(360px, calc(100vw - 32px))',
              maxHeight: 'calc(100vh - 32px)',
              zIndex: 51
            }}
            className="p-3.5 bg-white rounded-2xl shadow-2xl border border-indigo-200 text-gray-800 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2.5">
              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-indigo-900">
                <Package size={16} className="text-indigo-600" />
                <span>기타/미지정 박스(BOX) 포함 짐 내역</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                aria-label="닫기"
              >
                <X size={15} />
              </button>
            </div>

            {/* 본문 항목 리스트 */}
            <p className="text-[11px] text-gray-500 mb-2 font-medium">
              가구에 수납되지 않고 바닥이나 공간에 노출된 <strong>순수 잔짐</strong>으로 산정됩니다:
            </p>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                  현관 / 신발장
                </span>
                <span className="text-gray-700 text-[11px] leading-tight">
                  신발류(신발장 수납분 일부), 우산, 슬리퍼, 현관 수납 잡화
                </span>
              </div>

              <div className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  욕실 / 화장실
                </span>
                <span className="text-gray-700 text-[11px] leading-tight">
                  수건, 세면도구, 샴푸/바디워시, 헤어드라이기, 욕실 소품
                </span>
              </div>

              <div className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                  거실 / 침실
                </span>
                <span className="text-gray-700 text-[11px] leading-tight">
                  화장대 위 화장품, 스탠드, 멀티탭/전선, 쿠션, 인형, 액자, 생활 소품
                </span>
              </div>

              <div className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  베란다 / 다용도 / 팬트리
                </span>
                <span className="text-gray-700 text-[11px] leading-tight">
                  빨래바구니, 건조대 소품, 청소도구 부속품, 화분 주변 잡화, 선반 외 노출 잔짐
                </span>
              </div>
            </div>

            {/* 하단 내품 중복 제외 안내 (중요 팁) */}
            <div className="mt-2.5 pt-2 border-t border-gray-100 bg-indigo-50/70 p-2 rounded-xl text-[10px] text-indigo-900 space-y-0.5 font-medium leading-relaxed">
              <div className="font-bold flex items-center gap-1 text-indigo-950">
                <Sparkles size={11} className="text-amber-500 fill-amber-500" />
                <span>가구 내품 자동 포함 안내 (중복 제외됨)</span>
              </div>
              <p className="text-gray-600">
                • <strong>장농/서랍장</strong> 옷·이불, <strong>냉장고</strong> 음식물, <strong>책장</strong> 도서, <strong>팬트리선반</strong> 수납짐은 각 품목의 <strong>[내품 CBM]</strong>에 이미 포함되어 있어 본 박스와 중복되지 않습니다.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
