'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveMenuPermissionsBulk } from '@/app/actions/users'
import {
  APP_MENUS,
  clampAccessLevel,
  normalizeAllowedRole,
  type AllowedRoleType,
  type MenuPermissionRecord,
} from '@/lib/menuPermissionUtils'
import {
  Check,
  Loader2,
  Save,
  ShieldCheck,
  Users,
} from 'lucide-react'

interface MenuRowState {
  path: string
  name: string
  group: string
  description: string
  minLevel: number
  allowedRole: AllowedRoleType
  savedMinLevel: number
  savedAllowedRole: AllowedRoleType
}

export function MenuPermissionsClient({
  initialPermissions,
}: {
  initialPermissions: MenuPermissionRecord[]
}) {
  const router = useRouter()

  const buildInitialRows = (): MenuRowState[] => {
    return APP_MENUS.map((menu) => {
      const found = initialPermissions.find((p) => p.menuPath === menu.path)
      const minLevel = found
        ? clampAccessLevel(found.minLevel, menu.defaultMinLevel)
        : menu.defaultMinLevel
      const allowedRole = found
        ? normalizeAllowedRole(found.allowedRole)
        : menu.defaultAllowedRole

      return {
        path: menu.path,
        name: menu.name,
        group: menu.group,
        description: menu.description,
        minLevel,
        allowedRole,
        savedMinLevel: minLevel,
        savedAllowedRole: allowedRole,
      }
    })
  }

  const [rows, setRows] = useState<MenuRowState[]>(buildInitialRows)
  const [savingPath, setSavingPath] = useState<string | null>(null)
  const [savingAll, setSavingAll] = useState(false)

  const dirtyCount = rows.filter(
    (r) => r.minLevel !== r.savedMinLevel || r.allowedRole !== r.savedAllowedRole
  ).length

  const updateRow = (path: string, patch: Partial<Pick<MenuRowState, 'minLevel' | 'allowedRole'>>) => {
    setRows((prev) =>
      prev.map((r) => (r.path === path ? { ...r, ...patch } : r))
    )
  }

  const handleSaveSingle = async (row: MenuRowState) => {
    setSavingPath(row.path)
    try {
      const res = await saveMenuPermissionsBulk([
        {
          menuPath: row.path,
          menuName: row.name,
          minLevel: row.minLevel,
          allowedRole: row.allowedRole,
        },
      ])
      if (res.success) {
        setRows((prev) =>
          prev.map((r) =>
            r.path === row.path
              ? { ...r, savedMinLevel: r.minLevel, savedAllowedRole: r.allowedRole }
              : r
          )
        )
        router.refresh()
      } else {
        window.alert(res.error || '저장에 실패했습니다.')
      }
    } finally {
      setSavingPath(null)
    }
  }

  const handleSaveAll = async () => {
    setSavingAll(true)
    try {
      const res = await saveMenuPermissionsBulk(
        rows.map((r) => ({
          menuPath: r.path,
          menuName: r.name,
          minLevel: r.minLevel,
          allowedRole: r.allowedRole,
        }))
      )
      if (res.success) {
        setRows((prev) =>
          prev.map((r) => ({
            ...r,
            savedMinLevel: r.minLevel,
            savedAllowedRole: r.allowedRole,
          }))
        )
        window.alert('전체 메뉴 접근 권한 설정이 저장되었습니다.')
        router.refresh()
      } else {
        window.alert(res.error || '저장에 실패했습니다.')
      }
    } finally {
      setSavingAll(false)
    }
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* 상단 헤더 */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              메뉴별 접근 권한 관리
            </h1>
            {dirtyCount > 0 && (
              <span className="text-xs font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                변경 {dirtyCount}건 미저장
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-600 font-medium">
            메뉴별로 접근 가능한 <strong>역할(ROLE)</strong>과 <strong>최소 접근 레벨(Lv.1 ~ Lv.9)</strong>을 설정합니다. 조건에 미달하는 사용자는 사이드바 메뉴 노출 및 페이지 진입이 제한됩니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/users"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-bold transition-colors"
          >
            <Users size={16} />
            <span>사용자 정보 관리</span>
          </Link>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={savingAll}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-extrabold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {savingAll ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>전체 권한 일괄 저장</span>
          </button>
        </div>
      </div>

      {/* 권한 설정 테이블 */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100/90 text-gray-800 text-xs sm:text-sm font-bold border-b border-gray-200 whitespace-nowrap">
              <tr>
                <th className="px-4 py-3.5">분류</th>
                <th className="px-4 py-3.5">메뉴명 / 설명</th>
                <th className="px-4 py-3.5">경로</th>
                <th className="px-4 py-3.5">접근 허용 역할 (ROLE)</th>
                <th className="px-4 py-3.5">최소 접근 레벨 (1~9)</th>
                <th className="px-4 py-3.5 text-right">개별 저장</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const isDirty =
                  row.minLevel !== row.savedMinLevel ||
                  row.allowedRole !== row.savedAllowedRole

                const groupBadgeClass =
                  row.group === '주요 메뉴'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : row.group === '관리자 메뉴'
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200'

                return (
                  <tr
                    key={row.path}
                    className={`transition-colors ${
                      isDirty ? 'bg-amber-50/40' : 'hover:bg-gray-50/70'
                    }`}
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${groupBadgeClass}`}
                      >
                        {row.group}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-gray-900">{row.name}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{row.description}</div>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs text-gray-600 whitespace-nowrap">
                      {row.path}
                    </td>

                    {/* 허용 역할(ROLE) 선택 */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <select
                        value={row.allowedRole}
                        onChange={(e) =>
                          updateRow(row.path, {
                            allowedRole: e.target.value as AllowedRoleType,
                          })
                        }
                        className={`border rounded-xl px-3 py-1.5 text-xs font-extrabold outline-none transition-colors ${
                          row.allowedRole === 'ADMIN'
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                            : row.allowedRole === 'USER'
                              ? 'bg-sky-50 text-sky-800 border-sky-300'
                              : 'bg-white text-gray-800 border-gray-300'
                        }`}
                      >
                        <option value="ALL">전체 허용 (ADMIN + USER)</option>
                        <option value="ADMIN">ADMIN 전용 (관리자만)</option>
                        <option value="USER">USER 전용 (일반사용자만)</option>
                      </select>
                    </td>

                    {/* 최소 레벨(1~9) 선택 */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <select
                        value={row.minLevel}
                        onChange={(e) =>
                          updateRow(row.path, { minLevel: Number(e.target.value) })
                        }
                        className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-extrabold text-gray-900 bg-white focus:border-indigo-500 outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lv) => (
                          <option key={lv} value={lv}>
                            Lv.{lv} 이상
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 저장 버튼 */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSaveSingle(row)}
                        disabled={savingPath === row.path}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          isDirty
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {savingPath === row.path ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : isDirty ? (
                          <Save size={13} />
                        ) : (
                          <Check size={13} className="text-emerald-600" />
                        )}
                        <span>{isDirty ? '저장' : '저장됨'}</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 하단 안내 카드 */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 text-xs text-indigo-950 space-y-1 font-medium">
        <p className="font-extrabold text-indigo-900">💡 권한 동작 규칙 안내</p>
        <p>• 메뉴 접근 조건은 <strong>[접근 허용 역할(ROLE)]</strong>과 <strong>[최소 접근 레벨(1~9)]</strong>을 모두 충족해야 접근할 수 있습니다.</p>
        <p>• 모든 사용자는 접근이 허용된 메뉴에서 <strong>전체 견적을 조회</strong>할 수 있으며, 견적 수정은 <strong>ADMIN(관리자)</strong> 및 <strong>해당 견적 작성자</strong>만 가능합니다.</p>
        <p>• 기본 마스터 계정(<strong>admin</strong>)은 권한 설정 실수로 인한 잠김을 방지하기 위해 항상 모든 메뉴에 접근 가능합니다.</p>
      </div>
    </div>
  )
}
