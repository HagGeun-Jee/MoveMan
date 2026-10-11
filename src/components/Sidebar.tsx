'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Calendar, Settings, ChevronLeft, ChevronRight, LogOut, Users } from 'lucide-react'

export function Sidebar({ 
  sessionName, 
  userLevel,
  permissions,
  logoutAction 
}: { 
  sessionName: string, 
  userLevel: number,
  permissions: { menuPath: string, minLevel: number }[],
  logoutAction: () => void 
}) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const isActive = (path: string) => pathname?.startsWith(path) && (path !== '/' || pathname === '/')

  const canAccess = (path: string) => {
    const perm = permissions.find(p => p.menuPath === path)
    if (!perm) return true // 권한 설정이 없으면 기본적으로 접근 가능
    return userLevel >= perm.minLevel
  }

  const linkClass = (active: boolean) => 
    `flex items-center gap-3 py-3 rounded-xl transition-colors ${collapsed ? 'px-0 justify-center w-full' : 'px-4'} ${active ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium'}`

  const subLinkClass = (active: boolean) => 
    `flex items-center gap-3 py-2.5 rounded-xl transition-colors text-sm ${collapsed ? 'px-0 justify-center w-full' : 'px-4'} ${active ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600 font-medium'}`

  return (
    <aside className={`bg-white shadow-md hidden md:flex md:flex-col transition-all duration-300 relative print:hidden ${collapsed ? 'w-20' : 'w-64'}`}>
      
      {/* Toggle Button */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 bg-white border border-gray-200 text-gray-500 rounded-full p-1 shadow-sm hover:text-blue-600 hover:border-blue-300 z-10"
        title={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className={`p-4 border-b flex flex-col justify-center h-24 ${collapsed ? 'items-center px-2' : ''}`}>
        {collapsed ? (
          <img src="/image.png" alt="Logo" className="w-10 h-10 object-contain" />
        ) : (
          <div className="flex flex-col items-center w-full">
            <img src="/image.png" alt="Logo" className="h-10 object-contain" />
            <p className="text-xs text-gray-500 mt-2 font-medium whitespace-nowrap overflow-hidden">이사견적 관리 시스템</p>
          </div>
        )}
      </div>
      
      <nav className="flex-1 mt-6 overflow-hidden">
        <ul className={`space-y-2 ${collapsed ? 'px-2' : 'px-4'}`}>
          {canAccess('/') && (
            <li>
              <Link href="/" className={linkClass(isActive('/'))} title="대시보드">
                <LayoutDashboard size={20} className="shrink-0" />
                {!collapsed && <span>대시보드</span>}
              </Link>
            </li>
          )}
          {canAccess('/estimates') && (
            <li>
              <Link href="/estimates" className={linkClass(isActive('/estimates'))} title="견적 목록">
                <FileText size={20} className="shrink-0" />
                {!collapsed && <span>견적 목록</span>}
              </Link>
            </li>
          )}
          {canAccess('/calendar') && (
            <li>
              <Link href="/calendar" className={linkClass(isActive('/calendar'))} title="일정 캘린더">
                <Calendar size={20} className="shrink-0" />
                {!collapsed && <span>일정 캘린더</span>}
              </Link>
            </li>
          )}
          {canAccess('/users') && (
            <li>
              <Link href="/users" className={linkClass(isActive('/users'))} title="사용자 및 권한">
                <Users size={20} className="shrink-0" />
                {!collapsed && <span>사용자 및 권한</span>}
              </Link>
            </li>
          )}
        </ul>

        <div className={`mt-8 text-xs font-bold text-gray-400 uppercase tracking-wider ${collapsed ? 'text-center' : 'px-8'}`}>
          {collapsed ? '기초' : '기초정보'}
        </div>
        <ul className={`mt-2 space-y-1 ${collapsed ? 'px-2' : 'px-4'}`}>
          {canAccess('/items') && (
            <li>
              <Link href="/items" className={subLinkClass(isActive('/items'))} title="물품정보">
                <Settings size={18} className="shrink-0" />
                {!collapsed && <span>물품정보</span>}
              </Link>
            </li>
          )}
          {canAccess('/vehicles') && (
            <li>
              <Link href="/vehicles" className={subLinkClass(isActive('/vehicles'))} title="차량정보">
                <Settings size={18} className="shrink-0" />
                {!collapsed && <span>차량정보</span>}
              </Link>
            </li>
          )}
          {canAccess('/labors') && (
            <li>
              <Link href="/labors" className={subLinkClass(isActive('/labors'))} title="인건비정보">
                <Settings size={18} className="shrink-0" />
                {!collapsed && <span>인건비정보</span>}
              </Link>
            </li>
          )}
        </ul>
      </nav>

      <div className={`p-4 border-t ${collapsed ? 'flex flex-col items-center px-2' : ''}`}>
        {!collapsed && (
          <div className="text-sm text-gray-600 mb-4 px-4 truncate">
            <span className="font-semibold">{sessionName}</span> 관리자님
          </div>
        )}
        <form action={logoutAction} className={collapsed ? 'w-full flex justify-center' : 'w-full'}>
          <button className={`text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2 ${collapsed ? 'p-2 rounded-lg w-full' : 'w-full text-left px-4 py-2 text-sm rounded-lg'}`} title="로그아웃">
            {collapsed ? <LogOut size={18} /> : <span className="w-full">로그아웃</span>}
          </button>
        </form>
      </div>
    </aside>
  )
}
