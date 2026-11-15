import { notFound } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { EstimateForm } from '@/components/EstimateForm'
import { updateEstimate } from '@/app/actions/estimate'
import { getCostStandards } from '@/app/actions/costStandards'
import { getCurrentUserAuthContext } from '@/lib/adminSchema'
import { canUserAccessEstimate } from '@/lib/menuPermissionUtils'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

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

  if (!canUserAccessEstimate(estimate, currentUser)) {
    return (
      <div className="max-w-md mx-auto mt-14 p-7 bg-white rounded-2xl border border-red-200 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
          <ShieldAlert size={24} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-black text-gray-900">견적 수정 권한이 없습니다</h2>
          <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
            <strong>USER</strong> 역할 계정은 <strong>본인이 작성한 견적만</strong> 조회 및 수정할 수 있습니다.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/estimates"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition-colors"
          >
            <ArrowLeft size={15} />
            <span>견적 목록으로 돌아가기</span>
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
