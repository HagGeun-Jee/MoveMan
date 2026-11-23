import Link from 'next/link'
import { SmallMoveForm } from './SmallMoveForm'
import { getSyncedSmallItems } from '@/lib/smallMove/syncCatalog'

export const dynamic = 'force-dynamic'

export default async function SmallMoveRequestPage() {
  const syncedItems = await getSyncedSmallItems()
  return (
    <div className="space-y-3">
      <Link href="/s" className="text-sm text-slate-500">
        ← 처음으로
      </Link>
      <SmallMoveForm catalogItems={syncedItems} />
    </div>
  )
}
