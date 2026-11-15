import { getCurrentUserAuthContext, getMenuPermissionsList } from '@/lib/adminSchema'
import { evaluateMenuAccess } from '@/lib/menuPermissionUtils'
import { getAllAdminUsers } from '@/app/actions/users'
import { UsersClientView } from './UsersClientView'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const currentUser = await getCurrentUserAuthContext()
  if (!currentUser) {
    redirect('/login')
  }

  const permissions = await getMenuPermissionsList()
  const access = evaluateMenuAccess({
    pathname: '/users',
    userRole: currentUser.role,
    userLevel: currentUser.level,
    loginUserId: currentUser.userId,
    permissions,
  })

  if (!access.allowed) {
    return (
      <div className="max-w-lg mx-auto mt-12 p-8 bg-white rounded-2xl border border-red-200 shadow-xs text-center space-y-2">
        <h2 className="text-xl font-black text-red-600">접근 권한이 없습니다</h2>
        <p className="text-sm text-gray-600 font-medium">
          이 메뉴는{' '}
          <strong>
            {access.requiredRole === 'ALL' ? '전체 역할' : `${access.requiredRole} 역할`} · Lv.
            {access.minLevel} 이상
          </strong>{' '}
          사용자만 접근할 수 있습니다.
        </p>
      </div>
    )
  }

  const admins = await getAllAdminUsers()

  return (
    <UsersClientView
      initialUsers={admins}
      currentSessionAdminId={currentUser.id}
      currentSessionRole={currentUser.role}
    />
  )
}
