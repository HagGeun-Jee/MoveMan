import { EstimateForm } from '@/components/EstimateForm'
import { createEstimate } from '@/app/actions/estimate'

export default function NewEstimatePage() {
  return (
    <EstimateForm 
      action={createEstimate} 
      title="새 견적 작성" 
    />
  )
}
