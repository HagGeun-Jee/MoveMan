import prisma from '@/lib/prisma'
import { getPartnerCompanies } from '@/app/actions/partner'
import { isCurrentSessionAdminAccount } from '@/app/actions/estimate'
import { EstimatesClientView } from './EstimatesClientView'

export default async function EstimatesPage() {
  const [estimates, partners, isAdmin] = await Promise.all([
    prisma.estimate.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    getPartnerCompanies().catch(() => []),
    isCurrentSessionAdminAccount(),
  ])

  return (
    <EstimatesClientView
      initialEstimates={estimates}
      initialPartners={partners}
      isAdmin={isAdmin}
    />
  )
}

