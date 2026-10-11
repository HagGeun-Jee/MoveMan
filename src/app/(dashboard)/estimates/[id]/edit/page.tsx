import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { EstimateForm } from '@/components/EstimateForm'
import { updateEstimate } from '@/app/actions/estimate'

export default async function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const estimate = await prisma.estimate.findUnique({
    where: { id }
  })
  
  if (!estimate) {
    notFound()
  }

  return (
    <EstimateForm 
      initialData={estimate}
      action={updateEstimate} 
      title={`견적 조회/수정 - ${estimate.id}`} 
    />
  )
}
