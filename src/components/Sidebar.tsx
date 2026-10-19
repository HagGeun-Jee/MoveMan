'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileText, 
  Calendar, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Users, 
  Menu, 
  X,
  PlusCircle,
  KeyRound,
  Boxes,
  Smartphone
} from 'lucide-react'
import { ChangePasswordModal } from './ChangePasswordModal'
import { APP_RELEASE_INFO } from '@/lib/appRelease'
import { AppDownloadButton } from './AppDownloadButton'



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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [installedAppVersion, setInstalledAppVersion] = useState<string | null>(null)
  const pathname = usePathname()

  // 안드로이드 네이티브 앱 환경인지 및 실제 설치된 APK 버전 감지
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const androidApp = (window as any).AndroidApp
      const isNative = Boolean(
        androidApp || 
        (window as any).Capacitor?.isNativePlatform?.() ||
        navigator.userAgent.includes('MoveMan')
      )

      if (isNative) {
        if (androidApp && typeof androidApp.getNativeVersion === 'function') {
          try {
            setInstalledAppVersion(`v${androidApp.getNativeVersion()}`)
          } catch (_) {
            setInstalledAppVersion('구버전 APK')
          }
        } else {
          // getNativeVersion 메서드가 아직 없던 과거 APK에서 실행 중인 경우
          setInstalledAppVersion('구버전 APK')
        }
      } else {
        setInstalledAppVersion(null)
      }
    }
  }, [])

  // 경로 변경 시 모바일 드로어 자동 닫기
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

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

  const mobileLinkClass = (active: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm ${
      active
        ? 'bg-blue-50 text-blue-600 font-bold'
        : 'text-gray-700 hover:bg-gray-100'
    }`

  return (
    <>
      {/* 1. 모바일 및 태블릿용 상단 네비게이션 헤더 (lg 미만 화면) */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2.5 flex justify-between items-center lg:hidden print:hidden sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 뒤로가기 (<) 버튼 */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('app:back'))
              }
            }}
            className="flex items-center justify-center p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 active:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors shadow-2xs"
            aria-label="뒤로가기"
            title="뒤로가기"
          >
            <ChevronLeft size={20} className="stroke-[2.5]" />
          </button>

          <button 
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-2xs"
            aria-label="메뉴 열기"
          >
            <Menu size={18} className="text-blue-600" />
            <span className="text-xs sm:text-sm font-bold text-gray-800">메뉴</span>
          </button>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
              <img src="/image.png" alt="MOVEMAN" className="h-7 object-contain" />
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">MOVEMAN</span>
            </Link>
            {installedAppVersion ? (
              installedAppVersion === APP_RELEASE_INFO.version ? (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-2xs text-emerald-700 bg-emerald-50 border border-emerald-200">
                  {installedAppVersion} (최신)
                </span>
              ) : (
                <a
                  href="/api/download/apk"
                  download="moveman.apk"
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-2xs text-amber-950 bg-amber-100 border border-amber-300 animate-pulse hover:bg-amber-200 transition-colors flex items-center gap-1.5"
                  title="최신 APK 다운로드"
                >
                  <span className="text-gray-700 font-sans">설치된 버전:</span>
                  <span className="text-amber-900 bg-amber-200/80 px-1 py-0.2 rounded">{installedAppVersion}</span>
                  <span className="text-amber-700 font-sans">➔</span>
                  <span className="text-white bg-blue-600 px-1.5 py-0.2 rounded shadow-2xs font-sans">최신 {APP_RELEASE_INFO.version} 설치</span>
                </a>
              )
            ) : (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md shadow-2xs text-gray-600 bg-gray-100 border border-gray-200">
                {APP_RELEASE_INFO.version}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 font-medium hidden sm:inline">{sessionName} 관리자님</span>
          <form action={logoutAction}>
            <button 
              type="submit" 
              className="text-xs text-red-600 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
            >
              로그아웃
            </button>
          </form>
        </div>
      </header>

      {/* 2. 모바일 및 태블릿용 슬라이드 드로어 메뉴 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" aria-modal="true">
          {/* 어두운 배경 오버레이 */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileOpen(false)}
          />

          {/* 슬라이드 메뉴 창 */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* 드로어 상단 */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/image.png" alt="Logo" className="h-8 object-contain" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-gray-800">MOVEMAN</p>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                      installedAppVersion 
                        ? (installedAppVersion === APP_RELEASE_INFO.version 
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                            : 'text-amber-800 bg-amber-50 border border-amber-300')
                        : 'text-blue-700 bg-blue-50 border border-blue-200'
                    }`}>
                      {installedAppVersion ? `앱 ${installedAppVersion}` : `웹 ${APP_RELEASE_INFO.version}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">이사견적 관리 시스템</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="메뉴 닫기"
              >
                <X size={20} />
              </button>
            </div>

            {/* 빠른 새 견적 작성 버튼 */}
            <div className="p-4 pb-2">
              <Link
                href="/estimates/new"
                onClick={() => setMobileOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-xl shadow-sm text-sm transition-colors"
              >
                <PlusCircle size={18} />
                <span>+ 새 견적 작성</span>
              </Link>
            </div>

            {/* 메뉴 목록 */}
            <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 px-3 uppercase tracking-wider mb-2">주요 메뉴</p>
                {canAccess('/') && (
                  <Link href="/" onClick={() => setMobileOpen(false)} className={mobileLinkClass(isActive('/'))}>
                    <LayoutDashboard size={20} className="shrink-0" />
                    <span>대시보드</span>
                  </Link>
                )}
                {canAccess('/estimates') && (
                  <Link href="/estimates" onClick={() => setMobileOpen(false)} className={mobileLinkClass(isActive('/estimates'))}>
                    <FileText size={20} className="shrink-0" />
                    <span>견적 목록</span>
                  </Link>
                )}
                {canAccess('/calendar') && (
                  <Link href="/calendar" onClick={() => setMobileOpen(false)} className={mobileLinkClass(isActive('/calendar'))}>
                    <Calendar size={20} className="shrink-0" />
                    <span>일정 캘린더</span>
                  </Link>
                )}
                {canAccess('/users') && (
                  <Link href="/users" onClick={() => setMobileOpen(false)} className={mobileLinkClass(isActive('/users'))}>
                    <Users size={20} className="shrink-0" />
                    <span>사용자 및 권한</span>
                  </Link>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 px-3 uppercase tracking-wider mb-2">기초정보 설정</p>
                {canAccess('/items') && (
                  <Link href="/items" onClick={() => setMobileOpen(false)} className={mobileLinkClass(isActive('/items'))}>
                    <Settings size={18} className="shrink-0" />
                    <span>물품정보</span>
                  </Link>
                )}
                {canAccess('/vehicles') && (
                  <Link href="/vehicles" onClick={() => setMobileOpen(false)} className={mobileLinkClass(isActive('/vehicles'))}>
                    <Settings size={18} className="shrink-0" />
                    <span>차량정보</span>
                  </Link>
                )}
                {canAccess('/labors') && (
                  <Link href="/labors" onClick={() => setMobileOpen(false)} className={mobileLinkClass(isActive('/labors'))}>
                    <Settings size={18} className="shrink-0" />
                    <span>인건비정보</span>
                  </Link>
                )}
                {canAccess('/ladders') && (
                  <Link href="/ladders" onClick={() => setMobileOpen(false)} className={mobileLinkClass(isActive('/ladders'))}>
                    <Settings size={18} className="shrink-0" />
                    <span>사다리차운임</span>
                  </Link>
                )}
                {canAccess('/inventory') && (
                  <Link href="/inventory" onClick={() => setMobileOpen(false)} className={mobileLinkClass(isActive('/inventory'))}>
                    <Boxes size={18} className="shrink-0 text-blue-600" />
                    <span>자재재고관리</span>
                  </Link>
                )}
              </div>

            </nav>

            {/* 드로어 하단 사용자 정보 및 로그아웃 */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/80">
              {/* 모바일 앱 다운로드 */}
              <div className="mb-3">
                <AppDownloadButton variant="sidebar" />
              </div>

              <div className="text-sm text-gray-700 mb-3 px-1">
                <span className="font-bold text-blue-600">{sessionName}</span> 관리자님
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false)
                    setPasswordModalOpen(true)
                  }}
                  className="flex-1 py-2 px-2 text-center text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1 transition-colors"
                >
                  <KeyRound size={14} />
                  <span>비번변경</span>
                </button>
                <form action={logoutAction} className="flex-1">

                  <button
                    type="submit"
                    className="w-full py-2 px-2 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <LogOut size={14} />
                    <span>로그아웃</span>
                  </button>
                </form>
              </div>
              <div className="mt-2.5 pt-2 border-t border-gray-200/60 text-center">
                {installedAppVersion ? (
                  <div className="text-[11px] font-mono bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-sans">현재 사용 중인 버전:</span>
                      <strong className="text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">{installedAppVersion}</strong>
                    </div>
                    {installedAppVersion !== APP_RELEASE_INFO.version ? (
                      <>
                        <div className="flex items-center justify-between text-blue-700 font-bold">
                          <span className="font-sans">설치해야 할 새 버전:</span>
                          <strong className="text-white bg-blue-600 px-1.5 py-0.5 rounded shadow-2xs">{APP_RELEASE_INFO.version}</strong>
                        </div>
                        <a
                          href="/api/download/apk"
                          download="moveman.apk"
                          className="mt-1 block w-full py-1.5 text-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white rounded font-sans font-bold text-xs shadow-xs"
                        >
                          새 버전({APP_RELEASE_INFO.version}) 다운로드 및 설치
                        </a>
                      </>
                    ) : (
                      <div className="text-emerald-700 text-[10px] font-sans font-bold text-center bg-emerald-50 py-1 rounded border border-emerald-200">
                        ✓ 최신 버전을 정상 사용 중입니다
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] font-mono text-gray-400 text-center">
                    웹 브라우저 접속 ({APP_RELEASE_INFO.version})
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* 3. 데스크톱용 좌측 사이드바 (lg 이상 화면) */}
      <aside className={`bg-white shadow-md hidden lg:flex lg:flex-col transition-all duration-300 relative print:hidden ${collapsed ? 'w-20' : 'w-64'}`}>
        
        {/* 접기/펼치기 토글 버튼 */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 bg-white border border-gray-200 text-gray-500 rounded-full p-1 shadow-sm hover:text-blue-600 hover:border-blue-300 z-10"
          title={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className={`p-4 border-b flex flex-col justify-center h-24 ${collapsed ? 'items-center px-2' : ''}`}>
          {collapsed ? (
            <div className="flex flex-col items-center">
              <img src="/image.png" alt="Logo" className="w-8 h-8 object-contain" />
              <span className="text-[9px] font-mono font-bold text-blue-600 mt-1">
                {APP_RELEASE_INFO.version}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              <div className="flex items-center gap-2">
                <img src="/image.png" alt="Logo" className="h-9 object-contain" />
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                  installedAppVersion 
                    ? (installedAppVersion === APP_RELEASE_INFO.version 
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                        : 'text-amber-800 bg-amber-50 border border-amber-300')
                    : 'text-blue-700 bg-blue-50 border border-blue-200'
                }`}>
                  {installedAppVersion ? `앱 ${installedAppVersion}` : `웹 ${APP_RELEASE_INFO.version}`}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1.5 font-medium whitespace-nowrap overflow-hidden">이사견적 관리 시스템</p>
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
            {canAccess('/ladders') && (
              <li>
                <Link href="/ladders" className={subLinkClass(isActive('/ladders'))} title="사다리차운임">
                  <Settings size={18} className="shrink-0" />
                  {!collapsed && <span>사다리차운임</span>}
                </Link>
              </li>
            )}
            {canAccess('/inventory') && (
              <li>
                <Link href="/inventory" className={subLinkClass(isActive('/inventory'))} title="자재재고관리">
                  <Boxes size={18} className="shrink-0 text-blue-600" />
                  {!collapsed && <span>자재재고관리</span>}
                </Link>
              </li>
            )}
          </ul>

        </nav>

        <div className={`p-3 border-t border-gray-100 ${collapsed ? 'flex flex-col items-center gap-1 px-2' : ''}`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-xl mb-2 border border-gray-100/80">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {sessionName ? sessionName.slice(0, 1) : '관'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-800 truncate">{sessionName} 관리자님</p>
                <p className="text-[11px] text-gray-500 font-medium">관리자 (Lv.{userLevel})</p>
              </div>
            </div>
          )}

          {collapsed ? (
            <>
              <a
                href="/api/download/apk"
                download="moveman.apk"
                className="w-full p-2.5 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center mb-1"
                title={`모바일 앱(APK) 다운로드 (릴리즈: ${APP_RELEASE_INFO.releaseDate})`}
              >
                <Smartphone size={18} />
              </a>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(true)}
                className="w-full p-2.5 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center"
                title="비밀번호 변경"
              >
                <KeyRound size={18} />
              </button>
              <form action={logoutAction} className="w-full flex justify-center">
                <button
                  type="submit"
                  className="w-full p-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center"
                  title="로그아웃"
                >
                  <LogOut size={18} />
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-1">
              <div className="mb-2">
                <AppDownloadButton variant="sidebar" />
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors text-left"
              >
                <KeyRound size={16} className="text-gray-500 shrink-0" />
                <span>비밀번호 변경</span>
              </button>
              <form action={logoutAction} className="w-full">
                <button
                  type="submit"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left"
                >
                  <LogOut size={16} className="text-red-500 shrink-0" />
                  <span>로그아웃</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </aside>

      {/* 비밀번호 변경 팝업 모달 */}
      <ChangePasswordModal 
        isOpen={passwordModalOpen} 
        onClose={() => setPasswordModalOpen(false)} 
      />
    </>
  )
}

