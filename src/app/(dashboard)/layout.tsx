import { ReactNode } from 'react'
import { deleteSession } from '@/lib/session'
import { redirect } from 'next/navigation'

import { Sidebar } from '@/components/Sidebar'
import { GlobalInputEnhancer } from '@/components/GlobalInputEnhancer'
import { SyncStatusBar } from '@/components/SyncStatusBar'
import { GlobalBackExitHandler } from '@/components/GlobalBackExitHandler'
import { MenuAccessGuard } from '@/components/MenuAccessGuard'

import { getCurrentUserAuthContext, getMenuPermissionsList } from '@/lib/adminSchema'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentUserAuthContext()

  if (!profile) {
    redirect('/login')
  }

  if (!profile.isActive) {
    redirect('/api/auth/logout?disabled=1')
  }

  const permissions = await getMenuPermissionsList()

  return (
    <div className="flex h-screen bg-gray-100 print:h-auto print:block print:bg-white flex-col lg:flex-row">
      <GlobalInputEnhancer />
      <GlobalBackExitHandler />
      <Sidebar 
        sessionName={profile.name} 
        userLevel={profile.level}
        userRole={profile.role}
        loginUserId={profile.userId}
        permissions={permissions}
        logoutAction={async () => {
          'use server'
          await deleteSession()
          redirect('/login')
        }} 
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto print:overflow-visible print:h-auto flex flex-col">
        <div className="print:hidden sticky top-0 z-20">
          <SyncStatusBar />
        </div>
        <div className="p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6 print:p-0 flex-1">
          <MenuAccessGuard
            userRole={profile.role}
            userLevel={profile.level}
            loginUserId={profile.userId}
            permissions={permissions}
          >
            {children}
          </MenuAccessGuard>
        </div>
      </main>
    </div>
  )
}
