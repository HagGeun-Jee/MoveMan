'use client'

import { Printer } from 'lucide-react'

export function PrintButton() {
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
      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
    >
      <Printer size={18} />
      <span>PDF 다운로드 / 인쇄</span>
    </button>
  )
}
