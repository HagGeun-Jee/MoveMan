import prisma from '@/lib/prisma'
import { getPartnerCompanies } from '@/app/actions/partner'
import { getCurrentUserAuthContext } from '@/lib/adminSchema'
import { filterEstimatesForUser } from '@/lib/menuPermissionUtils'
import { EstimatesClientView } from './EstimatesClientView'

export default async function EstimatesPage() {
  const currentUser = await getCurrentUserAuthContext()

  const [rawEstimates, partners] = await Promise.all([
    prisma.estimate.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    getPartnerCompanies().catch(() => []),
  ])

  const estimates = filterEstimatesForUser(rawEstimates, currentUser)
  const isAdmin = Boolean(currentUser?.isMasterAdmin)

  return (
    <EstimatesClientView
      initialEstimates={estimates}
      initialPartners={partners}
      isAdmin={isAdmin}
      userRole={currentUser?.role || 'ADMIN'}
    />
  )
}

