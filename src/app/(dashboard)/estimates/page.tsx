import prisma from '@/lib/prisma'
import { getPartnerCompanies } from '@/app/actions/partner'
import { EstimatesClientView } from './EstimatesClientView'

export default async function EstimatesPage() {
  const [estimates, partners] = await Promise.all([
    prisma.estimate.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    getPartnerCompanies().catch(() => []),
  ])

  return (
    <EstimatesClientView
      initialEstimates={estimates}
      initialPartners={partners}
    />
  )
}

