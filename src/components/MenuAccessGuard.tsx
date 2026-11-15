'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  evaluateMenuAccess,
  type MenuPermissionRecord,
  type UserRole,
} from '@/lib/menuPermissionUtils'
import { ShieldAlert, Home } from 'lucide-react'

export function MenuAccessGuard({
  userRole,
  userLevel,
  loginUserId,
  permissions,
  children,
}: {
  userRole: UserRole
  userLevel: number
  loginUserId: string
  permissions: MenuPermissionRecord[]
  children: React.ReactNode
}) {
  const pathname = usePathname() || '/'

  const access = evaluateMenuAccess({
    pathname,
    userRole,
    userLevel,
    loginUserId,
    permissions,
  })

  if (!access.allowed) {
    const roleDesc =
      access.requiredRole === 'ALL'
        ? '전체 역할 (ADMIN / USER)'
        : `${access.requiredRole} 전용`

    return (
      <div className="max-w-md mx-auto mt-14 p-7 bg-white rounded-2xl border border-red-200 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
          <ShieldAlert size={24} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-black text-gray-900">
            메뉴 접근 권한이 없습니다
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
            <strong>[{access.menuName}]</strong> 메뉴는{' '}
            <strong className="text-red-600">
              {roleDesc} · Lv.{access.minLevel} 이상
            </strong>{' '}
            권한이 필요합니다.
          </p>
          <p className="text-xs text-gray-400">
            현재 내 권한: <strong>{userRole}</strong> · <strong>Lv.{userLevel}</strong>
          </p>
        </div>
        {pathname !== '/' && (
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition-colors"
            >
              <Home size={15} />
              <span>대시보드로 돌아가기</span>
            </Link>
          </div>
        )}
      </div>
    )
  }

  return <>{children}</>
}
