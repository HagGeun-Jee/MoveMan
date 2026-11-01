'use client'

import { useState } from 'react'
import { updateAdminInfo, toggleAdminActive } from '@/app/actions/users'
import { ResetPasswordButton } from './ResetPasswordButton'
import { Ban, CheckCircle2, Loader2, Phone, Save } from 'lucide-react'

interface AdminManageRowProps {
  admin: {
    id: string
    userId: string
    name: string
    phone?: string | null
    role: string
    level: number
    isActive?: boolean | null
  }
  currentSessionUserId?: string
}

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

export function AdminManageRow({ admin, currentSessionUserId }: AdminManageRowProps) {
  const [phone, setPhone] = useState(admin.phone || '')
  const [level, setLevel] = useState(admin.level)
  const [isActive, setIsActive] = useState(admin.isActive !== false)
  const [savingInfo, setSavingInfo] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)

  const isSelf = currentSessionUserId === admin.id

  const handleSaveInfo = async () => {
    setSavingInfo(true)
    try {
      const res = await updateAdminInfo(admin.id, phone, Number(level))
      if (res.success) {
        window.alert(res.message || '저장되었습니다.')
      } else {
        window.alert(res.error || '저장에 실패했습니다.')
      }
    } catch (err) {
      console.error(err)
      window.alert('정보 저장 중 오류가 발생했습니다.')
    } finally {
      setSavingInfo(false)
    }
  }

  const handleToggleActive = async () => {
    if (isSelf && isActive) {
      window.alert('현재 로그인 중인 본인 계정은 사용중지할 수 없습니다.')
      return
    }

    const nextActive = !isActive
    const confirmMsg = nextActive
      ? `'${admin.name}(${admin.userId})' 계정의 사용중지를 해제하고 다시 [사용중] 상태로 변경하시겠습니까?`
      : `'${admin.name}(${admin.userId})' 계정을 [사용중지] 처리하시겠습니까?\n\n사용중지 시 해당 사용자는 로그인할 수 없으며, 로그인 시도 시 사용불가 알림이 표시됩니다.`

    if (!window.confirm(confirmMsg)) return

    setTogglingStatus(true)
    try {
      const res = await toggleAdminActive(admin.id, nextActive)
      if (res.success) {
        setIsActive(nextActive)
        window.alert(res.message)
      } else {
        window.alert(res.error || '상태 변경에 실패했습니다.')
      }
    } catch (err) {
      console.error(err)
      window.alert('상태 변경 중 오류가 발생했습니다.')
    } finally {
      setTogglingStatus(false)
    }
  }

  return (
    <tr className={`border-b transition-colors ${isActive ? 'hover:bg-gray-50' : 'bg-red-50/40 hover:bg-red-50/70'}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className={`font-bold ${isActive ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
            {admin.name}
          </span>
          {isSelf && (
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
              본인
            </span>
          )}
        </div>
      </td>
      <td className={`px-4 py-3 font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
        {admin.userId}
      </td>
      <td className="px-4 py-3">
        <div className="relative flex items-center max-w-[165px]">
          <Phone size={13} className="absolute left-2.5 text-gray-400 pointer-events-none" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
            placeholder="010-0000-0000"
            className="border border-gray-300 rounded-lg pl-7 pr-2.5 py-1.5 w-full text-xs font-medium text-gray-900 bg-white focus:border-blue-500 outline-none"
          />
        </div>
      </td>
      <td className="px-4 py-3 font-semibold text-blue-700">
        {admin.role}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={level}
            onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 w-16 text-center font-bold text-gray-900 bg-white focus:border-blue-500 outline-none"
            min="1"
            max="99"
          />
          <button
            type="button"
            onClick={handleSaveInfo}
            disabled={savingInfo}
            className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {savingInfo ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span>저장</span>
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {isActive ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full whitespace-nowrap">
              <CheckCircle2 size={12} />
              사용중
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-2.5 py-1 rounded-full whitespace-nowrap">
              <Ban size={12} />
              사용중지
            </span>
          )}

          <button
            type="button"
            onClick={handleToggleActive}
            disabled={togglingStatus || (isSelf && isActive)}
            title={isSelf && isActive ? '현재 로그인 중인 본인 계정은 사용중지할 수 없습니다.' : undefined}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap disabled:opacity-40 ${
              isActive
                ? 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
            }`}
          >
            {togglingStatus ? (
              <Loader2 size={12} className="animate-spin" />
            ) : isActive ? (
              '사용중지'
            ) : (
              '사용재개'
            )}
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <ResetPasswordButton
          adminId={admin.id}
          userName={admin.name}
          userId={admin.userId}
        />
      </td>
    </tr>
  )
}

