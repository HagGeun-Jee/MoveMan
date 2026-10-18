'use client'

import { Printer } from 'lucide-react'

export function PrintButton({ className }: { className?: string }) {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      const win = window as any
      if (win.AndroidPrinter && typeof win.AndroidPrinter.print === 'function') {
        win.AndroidPrinter.print('MEMAN_견적서')
      } else {
        window.print()
      }
    }
  }

  return (
    <button 
      onClick={handlePrint}
      className={className || "px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 whitespace-nowrap"}
      title="A4 견적서 PDF 다운로드 및 인쇄"
    >
      <Printer size={15} className="shrink-0" />
      <span>PDF/인쇄</span>
    </button>
  )
}
