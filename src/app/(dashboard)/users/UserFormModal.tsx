'use client'

import React, { useState, useEffect } from 'react'
import DaumPostcodeEmbed from 'react-daum-postcode'
import {
  saveAdminUserModal,
  resetUserPassword,
  type AdminUserFullRecord,
} from '@/app/actions/users'
import { isProtectedMasterAdminId, type UserRole } from '@/lib/menuPermissionUtils'
import {
  Ban,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Save,
  Search,
  Shield,
  User,
  UserPlus,
  X,
} from 'lucide-react'

interface UserFormModalProps {
  isOpen: boolean
  mode: 'CREATE' | 'EDIT'
  initialUser?: AdminUserFullRecord | null
  currentSessionAdminId: string
  currentSessionRole: UserRole
  onClose: () => void
  onSaved: (updatedUsers?: AdminUserFullRecord[], updatedSelfRole?: UserRole) => void
}

function formatMobileInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function formatSsnInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  if (digits.length <= 6) return digits
  return `${digits.slice(0, 6)}-${digits.slice(6)}`
}

export function UserFormModal({
  isOpen,
  mode,
  initialUser,
  currentSessionAdminId,
  currentSessionRole,
  onClose,
  onSaved,
}: UserFormModalProps) {
  // [기본정보]
  const [name, setName] = useState('')
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('USER')
  const [level, setLevel] = useState<number>(1)
  const [isActive, setIsActive] = useState<boolean>(true)

  // [추가정보]
  const [email, setEmail] = useState('')
  const [ssn, setSsn] = useState('')
  const [showSsn, setShowSsn] = useState(false)
  const [zipCode, setZipCode] = useState('')
  const [address, setAddress] = useState('')
  const [memo, setMemo] = useState('')

  // 상태 제어
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resettingPw, setResettingPw] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setErrorMsg('')
    setIsPostcodeOpen(false)
    setShowPassword(false)
    setShowSsn(false)

    if (mode === 'EDIT' && initialUser) {
      setName(initialUser.name || '')
      setUserId(initialUser.userId || '')
      setPassword('')
      setPhone(formatMobileInput(initialUser.phone || ''))
      setRole(isProtectedMasterAdminId(initialUser.userId) ? 'ADMIN' : initialUser.role)
      setLevel(isProtectedMasterAdminId(initialUser.userId) ? 9 : initialUser.level || 1)
      setIsActive(isProtectedMasterAdminId(initialUser.userId) ? true : initialUser.isActive !== false)
      setEmail(initialUser.email || '')
      setSsn(formatSsnInput(initialUser.ssn || ''))
      setZipCode(initialUser.zipCode || '')
      setAddress(initialUser.address || '')
      setMemo(initialUser.memo || '')
    } else {
      setName('')
      setUserId('')
      setPassword('')
      setPhone('')
      setRole('USER')
      setLevel(1)
      setIsActive(true)
      setEmail('')
      setSsn('')
      setZipCode('')
      setAddress('')
      setMemo('')
    }
  }, [isOpen, mode, initialUser])

  if (!isOpen) return null

  const effectiveTargetUserId = mode === 'EDIT' ? initialUser?.userId || '' : userId
  const isMasterAdminAccount = isProtectedMasterAdminId(effectiveTargetUserId)
  const isSelfAccount = mode === 'EDIT' && initialUser?.id === currentSessionAdminId
  const isCallerAdminRole = currentSessionRole === 'ADMIN'
  const isRoleLocked = isMasterAdminAccount || !isCallerAdminRole

  const handlePostcodeComplete = (data: any) => {
    let fullAddr = data.roadAddress || data.jibunAddress || ''
    if (data.buildingName) {
      fullAddr += fullAddr ? ` (${data.buildingName})` : data.buildingName
    }
    setZipCode(data.zonecode || '')
    setAddress(fullAddr)
    setIsPostcodeOpen(false)
  }

  const handleResetPassword = async () => {
    if (!initialUser?.id) return
    if (
      !window.confirm(
        `'${initialUser.name}(${initialUser.userId})' 계정의 비밀번호를 아이디('${initialUser.userId}')와 동일하게 초기화하시겠습니까?`
      )
    ) {
      return
    }
    setResettingPw(true)
    try {
      const res = await resetUserPassword(initialUser.id)
      if (res.success) {
        window.alert(res.message)
      } else {
        window.alert(res.error || '비밀번호 초기화에 실패했습니다.')
      }
    } finally {
      setResettingPw(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSaving(true)

    try {
      const safeRoleToSubmit: UserRole = isMasterAdminAccount
        ? 'ADMIN'
        : !isCallerAdminRole
          ? mode === 'EDIT' && initialUser
            ? initialUser.role
            : 'USER'
          : role

      const res = await saveAdminUserModal({
        id: mode === 'EDIT' ? initialUser?.id : undefined,
        name,
        userId,
        password,
        phone,
        role: safeRoleToSubmit,
        level: isMasterAdminAccount ? 9 : level,
        isActive: isMasterAdminAccount || isSelfAccount ? true : isActive,
        email,
        ssn,
        zipCode,
        address,
        memo,
      })

      if (!res.success) {
        setErrorMsg(res.error || '저장에 실패했습니다.')
        return
      }

      onSaved(res.users, res.updatedSelfRole)
      onClose()
    } catch (err) {
      console.error(err)
      setErrorMsg('저장 처리 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* 모달 상단 헤더 */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              {mode === 'CREATE' ? <UserPlus size={19} /> : <User size={19} />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900">
                {mode === 'CREATE' ? '신규 사용자 등록' : '사용자 정보 및 권한 수정'}
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                기본정보(역할·접근레벨·계정상태) 및 인적 추가정보를 설정합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white/80 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 모달 본문 폼 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-bold">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* ================= 1. 기본정보 섹션 ================= */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <div className="flex items-center gap-1.5">
                <Shield size={16} className="text-blue-600" />
                <h3 className="text-sm sm:text-base font-extrabold text-gray-900">[기본정보]</h3>
              </div>
              {isMasterAdminAccount && (
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  🔒 기본 마스터 계정 (ADMIN 고정)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 이름 */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="예: 홍길동"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              {/* 아이디 */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  아이디 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => {
                    const v = e.target.value
                    setUserId(v)
                    if (isProtectedMasterAdminId(v) && isCallerAdminRole) {
                      setRole('ADMIN')
                      setLevel(9)
                      setIsActive(true)
                    }
                  }}
                  readOnly={mode === 'EDIT'}
                  required
                  placeholder="예: staff01"
                  className={`w-full border rounded-xl px-3 py-2 text-sm font-medium outline-none ${
                    mode === 'EDIT'
                      ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                />
              </div>

              {/* 비밀번호 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    비밀번호 {mode === 'EDIT' && <span className="text-gray-400 font-normal">(변경 시 입력)</span>}
                  </label>
                  {mode === 'EDIT' && initialUser && (
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={resettingPw}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900"
                    >
                      {resettingPw ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                      <span>아이디로 초기화</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === 'CREATE'
                        ? '미입력 시 아이디와 동일하게 설정'
                        : '미입력 시 기존 비밀번호 유지'
                    }
                    className="w-full border border-gray-300 rounded-xl pl-8 pr-9 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* 모바일 */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">모바일</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatMobileInput(e.target.value))}
                    placeholder="010-0000-0000"
                    className="w-full border border-gray-300 rounded-xl pl-8 pr-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
              </div>

              {/* 역할(ROLE) */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <label className="block text-xs font-bold text-gray-700">
                    역할 (ROLE : 견적 조회·수정 권한)
                  </label>
                  {!isCallerAdminRole && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      <Lock size={11} />
                      ADMIN 계정만 수정 가능
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={isRoleLocked}
                    onClick={() => {
                      if (!isRoleLocked) setRole('ADMIN')
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      role === 'ADMIN'
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    } ${isRoleLocked ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-800">ADMIN (관리자)</span>
                      {isRoleLocked && <Lock size={13} className="text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-0.5 font-medium">
                      모든 메뉴에서 <strong>전체 견적</strong> 조회 및 수정 가능
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={isRoleLocked}
                    onClick={() => {
                      if (!isRoleLocked) setRole('USER')
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      role === 'USER'
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    } ${isRoleLocked ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-800">USER (일반 사용자)</span>
                      {!isCallerAdminRole && <Lock size={13} className="text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-0.5 font-medium">
                      모든 메뉴에서 <strong>본인이 작성한 견적만</strong> 조회 및 수정 가능
                    </p>
                  </button>
                </div>
                {isMasterAdminAccount && (
                  <p className="text-[11px] text-indigo-600 font-semibold mt-1">
                    * 기본 admin 계정은 역할을 변경할 수 없으며 항상 ADMIN으로 유지됩니다.
                  </p>
                )}
                {!isCallerAdminRole && !isMasterAdminAccount && (
                  <p className="text-[11px] text-amber-700 font-semibold mt-1">
                    * 현재 로그인한 계정의 ROLE이 USER이므로 역할(ROLE) 항목은 수정할 수 없습니다.
                  </p>
                )}
              </div>

              {/* 접근레벨 (1~9) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  접근레벨 (1 ~ 9 : 프로그램 메뉴 접근레벨)
                </label>
                <select
                  value={isMasterAdminAccount ? 9 : level}
                  disabled={isMasterAdminAccount}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none disabled:bg-gray-100"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lv) => (
                    <option key={lv} value={lv}>
                      Lv.{lv}{' '}
                      {lv === 1
                        ? '(기본)'
                        : lv === 5
                          ? '(중간관리)'
                          : lv === 9
                            ? '(최고레벨)'
                            : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 계정상태 (사용중, 사용중지) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">계정상태</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsActive(true)}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                      isActive
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    <span>사용중</span>
                  </button>
                  <button
                    type="button"
                    disabled={isMasterAdminAccount || isSelfAccount}
                    onClick={() => setIsActive(false)}
                    title={
                      isMasterAdminAccount
                        ? 'admin 계정은 사용중지할 수 없습니다.'
                        : isSelfAccount
                          ? '현재 로그인한 본인 계정은 사용중지할 수 없습니다.'
                          : undefined
                    }
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      !isActive
                        ? 'bg-red-50 border-red-500 text-red-800 ring-2 ring-red-500/20'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Ban size={14} />
                    <span>사용중지</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ================= 2. 추가정보 섹션 ================= */}
          <section className="space-y-4">
            <div className="flex items-center gap-1.5 border-b border-gray-200 pb-2">
              <FileText size={16} className="text-indigo-600" />
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900">[추가정보]</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 메일주소 */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">메일주소</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full border border-gray-300 rounded-xl pl-8 pr-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
              </div>

              {/* 주민번호 */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">주민번호</label>
                <div className="relative">
                  <input
                    type={showSsn ? 'text' : 'password'}
                    value={ssn}
                    onChange={(e) => setSsn(formatSsnInput(e.target.value))}
                    placeholder="000000-0000000"
                    maxLength={14}
                    className="w-full border border-gray-300 rounded-xl pl-3 pr-9 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSsn((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    title={showSsn ? '주민번호 숨기기' : '주민번호 보기'}
                  >
                    {showSsn ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* 우편번호 */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">우편번호 및 집주소</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="우편번호"
                    className="w-32 border border-gray-300 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 bg-gray-50/70 focus:bg-white focus:border-blue-500 outline-none tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPostcodeOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold transition-colors shadow-2xs"
                  >
                    <Search size={13} />
                    <span>{isPostcodeOpen ? '주소검색 닫기' : '우편번호 검색'}</span>
                  </button>
                </div>

                {isPostcodeOpen && (
                  <div className="mb-2 border border-blue-200 rounded-xl overflow-hidden shadow-sm">
                    <DaumPostcodeEmbed onComplete={handlePostcodeComplete} style={{ height: 360 }} />
                  </div>
                )}

                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="도로명/지번 주소 및 동·호수 상세주소 입력"
                    className="w-full border border-gray-300 rounded-xl pl-8 pr-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
              </div>

              {/* 비고사항 */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">비고사항</label>
                <textarea
                  rows={3}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="담당 업무, 입사일, 특이사항 등 자유롭게 기재해주세요."
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                />
              </div>
            </div>
          </section>

          {/* 하단 액션 버튼 */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-bold transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              <span>{mode === 'CREATE' ? '신규 사용자 등록' : '수정 내용 저장'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
