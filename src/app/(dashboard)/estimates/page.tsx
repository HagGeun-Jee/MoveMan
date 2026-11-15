import prisma from '@/lib/prisma'
import { getPartnerCompanies } from '@/app/actions/partner'
import { getCurrentUserAuthContext } from '@/lib/adminSchema'
import { EstimatesClientView } from './EstimatesClientView'

export default async function EstimatesPage() {
  const currentUser = await getCurrentUserAuthContext()

  const [estimates, partners] = await Promise.all([
    prisma.estimate.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    getPartnerCompanies().catch(() => []),
  ])

  const isAdmin = Boolean(currentUser?.isMasterAdmin)

  return (
    <EstimatesClientView
      initialEstimates={estimates}
      initialPartners={partners}
      isAdmin={isAdmin}
      userRole={currentUser?.role || 'ADMIN'}
      currentUser={
        currentUser
          ? {
              id: currentUser.id,
              userId: currentUser.userId,
              name: currentUser.name,
              role: currentUser.role,
              level: currentUser.level,
            }
          : null
      }
    />
  )
}

