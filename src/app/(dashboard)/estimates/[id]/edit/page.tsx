import { notFound } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { EstimateForm } from '@/components/EstimateForm'
import { updateEstimate } from '@/app/actions/estimate'
import { getCostStandards } from '@/app/actions/costStandards'
import { getCurrentUserAuthContext } from '@/lib/adminSchema'
import { canUserModifyEstimate } from '@/lib/menuPermissionUtils'
import { ShieldAlert, ArrowLeft, Eye } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const currentUser = await getCurrentUserAuthContext()
  const isAdmin = Boolean(currentUser?.isMasterAdmin)
  
  const [estimate, costStandards] = await Promise.all([
    prisma.estimate.findUnique({
      where: { id }
    }),
    getCostStandards(),
  ])
  
  if (!estimate) {
    notFound()
  }

  if (!canUserModifyEstimate(estimate, currentUser)) {
    return (
      <div className="max-w-md mx-auto mt-14 p-7 bg-white rounded-2xl border border-red-200 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
          <ShieldAlert size={24} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-black text-gray-900">견적 수정 권한이 없습니다</h2>
          <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
            모든 견적의 조회는 가능하지만, 수정은 <strong>관리자(ADMIN)</strong> 또는 <strong>해당 견적의 작성자</strong>만 가능합니다.
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-2">
          <Link
            href={`/estimates/${estimate.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition-colors"
          >
            <Eye size={15} />
            <span>견적 상세 조회하기</span>
          </Link>
          <Link
            href="/estimates"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-bold transition-colors border border-gray-300"
          >
            <ArrowLeft size={15} />
            <span>목록</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <EstimateForm 
      initialData={estimate}
      action={updateEstimate} 
      title={`견적 조회/수정 - ${estimate.id}`} 
      costStandards={costStandards}
      currentUserName={currentUser?.name || ''}
      isAdmin={isAdmin}
    />
  )
}
