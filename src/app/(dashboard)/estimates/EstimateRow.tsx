'use client'

import { useRouter } from 'next/navigation'

export function EstimateRow({ children, id }: { children: React.ReactNode, id: string }) {
  const router = useRouter()
  return (
    <tr onClick={() => router.push(`/estimates/${id}`)} className="border-b last:border-0 hover:bg-gray-50 transition-colors cursor-pointer">
      {children}
    </tr>
  )
}
