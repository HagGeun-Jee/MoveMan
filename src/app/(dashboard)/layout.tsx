import Link from 'next/link'
import { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { decrypt, deleteSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { LayoutDashboard, FileText, Calendar, Settings } from 'lucide-react'

import { Sidebar } from '@/components/Sidebar'
import { GlobalInputEnhancer } from '@/components/GlobalInputEnhancer'
import { SyncStatusBar } from '@/components/SyncStatusBar'
import { GlobalBackExitHandler } from '@/components/GlobalBackExitHandler'

import prisma from '@/lib/prisma'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  const session = await decrypt(cookie)
  const permissions = await prisma.menuPermission.findMany()

  return (
    <div className="flex h-screen bg-gray-100 print:h-auto print:block print:bg-white flex-col lg:flex-row">
      <GlobalInputEnhancer />
      <GlobalBackExitHandler />
      <Sidebar 
        sessionName={session?.name as string} 
        userLevel={(session?.level as number) || 1}
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
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 print:p-0 flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}
