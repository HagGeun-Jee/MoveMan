import type { ReactNode } from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '소형이사 간편 견적',
  description: '원룸·투룸 이사, 물품만 체크하고 사진을 올리면 예상 견적을 바로 확인하세요.',
}

export default function SmallMoveLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-xl mx-auto px-4 pb-24 pt-4">{children}</div>
    </div>
  )
}
