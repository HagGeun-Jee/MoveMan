import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { EstimateForm } from '@/components/EstimateForm'
import { updateEstimate, isCurrentSessionAdminAccount } from '@/app/actions/estimate'
import { getCostStandards } from '@/app/actions/costStandards'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  
  const [estimate, costStandards, session, isAdmin] = await Promise.all([
    prisma.estimate.findUnique({
      where: { id }
    }),
    getCostStandards(),
    decrypt(cookie),
    isCurrentSessionAdminAccount(),
  ])
  
  if (!estimate) {
    notFound()
  }

  return (
    <EstimateForm 
      initialData={estimate}
      action={updateEstimate} 
      title={`견적 조회/수정 - ${estimate.id}`} 
      costStandards={costStandards}
      currentUserName={(session?.name as string) || ''}
      isAdmin={isAdmin}
    />
  )
}
