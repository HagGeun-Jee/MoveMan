import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { EstimateForm } from '@/components/EstimateForm'
import { updateEstimate } from '@/app/actions/estimate'
import { getCostStandards } from '@/app/actions/costStandards'

export const dynamic = 'force-dynamic'

export default async function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const [estimate, costStandards] = await Promise.all([
    prisma.estimate.findUnique({
      where: { id }
    }),
    getCostStandards()
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
    />
  )
}
