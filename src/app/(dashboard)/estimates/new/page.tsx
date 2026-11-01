import { EstimateForm } from '@/components/EstimateForm'
import { createEstimate } from '@/app/actions/estimate'
import { getCostStandards } from '@/app/actions/costStandards'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function NewEstimatePage() {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  const [costStandards, session] = await Promise.all([
    getCostStandards(),
    decrypt(cookie),
  ])

  return (
    <EstimateForm 
      action={createEstimate} 
      title="새 견적 작성" 
      costStandards={costStandards}
      currentUserName={(session?.name as string) || ''}
    />
  )
}
