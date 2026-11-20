import Link from 'next/link'
import { SmallMoveForm } from './SmallMoveForm'

export default function SmallMoveRequestPage() {
  return (
    <div className="space-y-3">
      <Link href="/s" className="text-sm text-slate-500">
        ← 처음으로
      </Link>
      <SmallMoveForm />
    </div>
  )
}
