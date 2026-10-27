import { EstimateForm } from '@/components/EstimateForm'
import { createEstimate } from '@/app/actions/estimate'
import { getCostStandards } from '@/app/actions/costStandards'

export const dynamic = 'force-dynamic'

export default async function NewEstimatePage() {
  const costStandards = await getCostStandards()

  return (
    <EstimateForm 
      action={createEstimate} 
      title="새 견적 작성" 
      costStandards={costStandards}
    />
  )
}
