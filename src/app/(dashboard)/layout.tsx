import Link from 'next/link'
import { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { decrypt, deleteSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { LayoutDashboard, FileText, Calendar, Settings } from 'lucide-react'

import { Sidebar } from '@/components/Sidebar'

import prisma from '@/lib/prisma'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  const session = await decrypt(cookie)
  const permissions = await prisma.menuPermission.findMany()

  return (
    <div className="flex h-screen bg-gray-100 print:h-auto print:block print:bg-white">
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
      <main className="flex-1 overflow-auto print:overflow-visible print:h-auto">
        <header className="bg-white shadow-sm md:hidden print:hidden p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">MOVEMAN</h1>
          <form action={async () => {
            'use server'
            await deleteSession()
            redirect('/login')
          }}>
            <button className="text-sm text-red-600 font-medium">로그아웃</button>
          </form>
        </header>
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
