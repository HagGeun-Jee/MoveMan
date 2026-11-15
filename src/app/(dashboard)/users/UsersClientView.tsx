'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  toggleAdminActive,
  type AdminUserFullRecord,
} from '@/app/actions/users'
import { isProtectedMasterAdminId, type UserRole } from '@/lib/menuPermissionUtils'
import { UserFormModal } from './UserFormModal'
import { ResetPasswordButton } from './ResetPasswordButton'
import {
  Ban,
  CheckCircle2,
  Edit2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'

interface UsersClientViewProps {
  initialUsers: AdminUserFullRecord[]
  currentSessionAdminId: string
  currentSessionRole: UserRole
}

export function UsersClientView({
  initialUsers,
  currentSessionAdminId,
  currentSessionRole,
}: UsersClientViewProps) {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUserFullRecord[]>(initialUsers)
  const [liveSessionRole, setLiveSessionRole] = useState<UserRole>(currentSessionRole)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE')
  const [editingUser, setEditingUser] = useState<AdminUserFullRecord | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    setUsers(initialUsers)
  }, [initialUsers])

  useEffect(() => {
    setLiveSessionRole(currentSessionRole)
  }, [currentSessionRole])

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
      if (statusFilter === 'ACTIVE' && !u.isActive) return false
      if (statusFilter === 'INACTIVE' && u.isActive) return false
      if (!q) return true
      return (
        u.name.toLowerCase().includes(q) ||
        u.userId.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.address.toLowerCase().includes(q) ||
        u.memo.toLowerCase().includes(q)
      )
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  const openCreateModal = () => {
    setEditingUser(null)
    setModalMode('CREATE')
    setModalOpen(true)
  }

  const openEditModal = (user: AdminUserFullRecord) => {
    setEditingUser(user)
    setModalMode('EDIT')
    setModalOpen(true)
  }

  const handleQuickToggleActive = async (user: AdminUserFullRecord) => {
    const isSelf = user.id === currentSessionAdminId
    const isMaster = isProtectedMasterAdminId(user.userId)
    if (isMaster) {
      window.alert('기본 admin 계정은 사용중지할 수 없습니다.')
      return
    }
    if (isSelf && user.isActive) {
      window.alert('현재 로그인 중인 본인 계정은 사용중지할 수 없습니다.')
      return
    }

    const nextActive = !user.isActive
    const confirmMsg = nextActive
      ? `'${user.name}(${user.userId})' 계정을 [사용중] 상태로 재개하시겠습니까?`
      : `'${user.name}(${user.userId})' 계정을 [사용중지] 처리하시겠습니까?\n사용중지 시 즉시 로그인이 차단됩니다.`

    if (!window.confirm(confirmMsg)) return

    setTogglingId(user.id)
    try {
      const res = await toggleAdminActive(user.id, nextActive)
      if (res.success) {
        if (res.users) {
          setUsers(res.users)
        }
        router.refresh()
      } else {
        window.alert(res.error || '상태 변경에 실패했습니다.')
      }
    } finally {
      setTogglingId(null)
    }
  }

  const adminCount = users.filter((u) => u.role === 'ADMIN').length
  const userCount = users.filter((u) => u.role === 'USER').length
  const activeCount = users.filter((u) => u.isActive).length

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* 상단 타이틀 및 주요 액션 */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              사용자 정보 관리
            </h1>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
              총 {users.length}명
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 font-medium">
            모든 사용자는 전체 견적을 조회할 수 있으며, 견적 수정은 <strong>ADMIN(관리자)</strong> 및 <strong>해당 견적 작성자</strong>만 가능합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/menu-permissions"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs sm:text-sm font-bold transition-colors"
          >
            <ShieldCheck size={16} />
            <span>메뉴 접근 권한 설정</span>
          </Link>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold shadow-sm transition-colors cursor-pointer"
          >
            <UserPlus size={16} />
            <span>+ 신규 사용자 등록</span>
          </button>
        </div>
      </div>

      {/* 요약 필터 및 검색 바 */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 p-3.5 sm:p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              roleFilter === 'ALL'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            전체 ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('ADMIN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              roleFilter === 'ADMIN'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-indigo-50/70 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            ADMIN ({adminCount})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('USER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              roleFilter === 'USER'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-blue-50/70 text-blue-800 border-blue-200 hover:bg-blue-100'
            }`}
          >
            USER ({userCount})
          </button>

          <div className="w-px h-4 bg-gray-200 mx-1 hidden sm:block" />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-700 bg-white outline-none focus:border-blue-500"
          >
            <option value="ALL">상태 전체</option>
            <option value="ACTIVE">사용중 ({activeCount})</option>
            <option value="INACTIVE">사용중지 ({users.length - activeCount})</option>
          </select>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름, 아이디, 모바일, 메일, 주소, 비고 검색..."
            className="w-full border border-gray-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-gray-900 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* 사용자 목록 테이블 */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100/90 text-gray-800 text-xs sm:text-sm font-bold border-b border-gray-200 whitespace-nowrap">
              <tr>
                <th className="px-4 py-3.5">이름 / 아이디</th>
                <th className="px-4 py-3.5">모바일 / 메일</th>
                <th className="px-4 py-3.5">역할 (ROLE)</th>
                <th className="px-4 py-3.5 text-center">접근레벨</th>
                <th className="px-4 py-3.5">추가정보 (주소·비고)</th>
                <th className="px-4 py-3.5">계정상태</th>
                <th className="px-4 py-3.5 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 font-medium">
                    조회된 사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u.id === currentSessionAdminId
                  const isMaster = isProtectedMasterAdminId(u.userId)
                  const maskedSsn = u.ssn
                    ? u.ssn.length >= 8
                      ? `${u.ssn.slice(0, 8)}******`
                      : '등록됨'
                    : ''

                  return (
                    <tr
                      key={u.id}
                      onClick={() => openEditModal(u)}
                      className={`transition-colors cursor-pointer ${
                        u.isActive ? 'hover:bg-blue-50/30' : 'bg-red-50/30 hover:bg-red-50/50'
                      }`}
                    >
                      {/* 이름 / 아이디 */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-extrabold text-sm ${
                              u.isActive ? 'text-gray-900' : 'text-gray-400 line-through'
                            }`}
                          >
                            {u.name}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                              본인
                            </span>
                          )}
                          {isMaster && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                              기본관리자
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-gray-500 mt-0.5">{u.userId}</div>
                      </td>

                      {/* 모바일 / 메일 */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-xs font-semibold text-gray-800 tabular-nums">
                          <Phone size={12} className="text-gray-400 shrink-0" />
                          <span>{u.phone || '-'}</span>
                        </div>
                        {u.email && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                            <Mail size={11} className="text-gray-400 shrink-0" />
                            <span>{u.email}</span>
                          </div>
                        )}
                      </td>

                      {/* 역할 (ROLE) */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {u.role === 'ADMIN' ? (
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                              ADMIN
                            </span>
                            <div className="text-[10px] text-gray-500 mt-0.5">전체 견적 수정</div>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                              USER
                            </span>
                            <div className="text-[10px] text-gray-500 mt-0.5">본인 견적만 수정</div>
                          </div>
                        )}
                      </td>

                      {/* 접근레벨 */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-200 text-xs font-black text-gray-900">
                          Lv.{u.level}
                        </span>
                      </td>

                      {/* 추가정보 요약 */}
                      <td className="px-4 py-3.5 max-w-[260px]">
                        <div className="space-y-0.5 text-xs">
                          {u.address ? (
                            <div className="flex items-center gap-1 text-gray-700 truncate">
                              <MapPin size={12} className="text-gray-400 shrink-0" />
                              <span className="truncate">
                                {u.zipCode ? `[${u.zipCode}] ` : ''}
                                {u.address}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-[11px]">주소 미등록</span>
                          )}
                          {maskedSsn && (
                            <div className="text-[11px] text-gray-500 tabular-nums">주민번호: {maskedSsn}</div>
                          )}
                          {u.memo && (
                            <div className="text-[11px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded truncate">
                              {u.memo}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 계정상태 */}
                      <td
                        className="px-4 py-3.5 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={12} />
                              사용중
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
                              <Ban size={12} />
                              사용중지
                            </span>
                          )}

                          {!isMaster && (
                            <button
                              type="button"
                              disabled={togglingId === u.id || (isSelf && u.isActive)}
                              onClick={() => handleQuickToggleActive(u)}
                              className="text-[11px] font-bold text-gray-500 hover:text-gray-800 underline px-1 disabled:opacity-40"
                            >
                              {togglingId === u.id ? (
                                <Loader2 size={12} className="animate-spin inline" />
                              ) : u.isActive ? (
                                '중지'
                              ) : (
                                '재개'
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 관리 액션 */}
                      <td
                        className="px-4 py-3.5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-colors"
                          >
                            <Edit2 size={12} />
                            <span>수정</span>
                          </button>
                          <ResetPasswordButton
                            adminId={u.id}
                            userName={u.name}
                            userId={u.userId}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 사용자 등록 / 수정 통합 팝업 모달 */}
      <UserFormModal
        isOpen={modalOpen}
        mode={modalMode}
        initialUser={editingUser}
        currentSessionAdminId={currentSessionAdminId}
        currentSessionRole={liveSessionRole}
        onClose={() => setModalOpen(false)}
        onSaved={(updatedUsers, updatedSelfRole) => {
          if (updatedUsers) {
            setUsers(updatedUsers)
          }
          if (updatedSelfRole) {
            setLiveSessionRole(updatedSelfRole)
          }
          router.refresh()
        }}
      />
    </div>
  )
}
