export type UserRole = 'ADMIN' | 'USER'
export type AllowedRoleType = 'ALL' | 'ADMIN' | 'USER'

export interface MenuDefinitionItem {
  path: string
  name: string
  group: '주요 메뉴' | '관리자 메뉴' | '기초정보 설정'
  defaultMinLevel: number
  defaultAllowedRole: AllowedRoleType
  description: string
}

export interface MenuPermissionRecord {
  menuPath: string
  menuName?: string
  minLevel: number
  allowedRole?: string | null
}

export interface UserIdentityInfo {
  id: string
  userId: string
  name: string
  role: UserRole
  level: number
}

export const APP_MENUS: MenuDefinitionItem[] = [
  {
    path: '/',
    name: '대시보드',
    group: '주요 메뉴',
    defaultMinLevel: 1,
    defaultAllowedRole: 'ALL',
    description: '금일 방문·이사 요약 현황 및 최근 견적 조회',
  },
  {
    path: '/estimates',
    name: '견적 목록',
    group: '주요 메뉴',
    defaultMinLevel: 1,
    defaultAllowedRole: 'ALL',
    description: '견적 목록 조회, 신규 작성, 상세 열람 및 수정',
  },
  {
    path: '/calendar',
    name: '일정 캘린더',
    group: '주요 메뉴',
    defaultMinLevel: 1,
    defaultAllowedRole: 'ALL',
    description: '방문견적·이사일정·차량정비 월간 캘린더',
  },
  {
    path: '/users',
    name: '사용자 정보 관리',
    group: '관리자 메뉴',
    defaultMinLevel: 9,
    defaultAllowedRole: 'ADMIN',
    description: '직원/관리자 계정 등록·수정, 역할(ROLE)·레벨·상태 관리',
  },
  {
    path: '/menu-permissions',
    name: '메뉴 접근 권한',
    group: '관리자 메뉴',
    defaultMinLevel: 9,
    defaultAllowedRole: 'ADMIN',
    description: '메뉴별 허용 역할(ROLE) 및 최소 접근 레벨(1~9) 설정',
  },
  {
    path: '/items',
    name: '물품정보',
    group: '기초정보 설정',
    defaultMinLevel: 1,
    defaultAllowedRole: 'ALL',
    description: '공간 카테고리 및 표준 이삿짐 품목/CBM 기준정보',
  },
  {
    path: '/vehicles',
    name: '차량·배차관리',
    group: '기초정보 설정',
    defaultMinLevel: 1,
    defaultAllowedRole: 'ALL',
    description: '차량 마스터, 배차 스케줄 및 화물차 차계부 관리',
  },
  {
    path: '/ladders',
    name: '사다리차운임',
    group: '기초정보 설정',
    defaultMinLevel: 1,
    defaultAllowedRole: 'ALL',
    description: '층수 구간 및 톤수별 사다리차 기준운임 설정',
  },
  {
    path: '/chartered-trucks',
    name: '용차기준운임',
    group: '기초정보 설정',
    defaultMinLevel: 1,
    defaultAllowedRole: 'ALL',
    description: '거리 구간 및 차종별 외주 용차 기준운임 설정',
  },
  {
    path: '/inventory',
    name: '자재재고관리',
    group: '기초정보 설정',
    defaultMinLevel: 1,
    defaultAllowedRole: 'ALL',
    description: '창고·차량별 포장자재 재고, 이고/실사 및 인수인계서',
  },
  {
    path: '/cost-standards',
    name: '원가기준정보',
    group: '기초정보 설정',
    defaultMinLevel: 1,
    defaultAllowedRole: 'ALL',
    description: '인건비·식대·유류비·마진율 등 원가 산출 기준 설정',
  },
]

export function isProtectedMasterAdminId(loginUserId?: string | null): boolean {
  return String(loginUserId || '').trim().toLowerCase() === 'admin'
}

export function normalizeUserRole(role?: string | null, loginUserId?: string | null): UserRole {
  if (isProtectedMasterAdminId(loginUserId)) return 'ADMIN'
  const upper = String(role || '').trim().toUpperCase()
  return upper === 'USER' ? 'USER' : 'ADMIN'
}

export function normalizeAllowedRole(allowedRole?: string | null): AllowedRoleType {
  const upper = String(allowedRole || '').trim().toUpperCase()
  if (upper === 'ADMIN') return 'ADMIN'
  if (upper === 'USER') return 'USER'
  return 'ALL'
}

export function clampAccessLevel(level?: number | string | null, fallback = 1): number {
  const parsed = typeof level === 'number' ? level : parseInt(String(level ?? ''), 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.max(1, Math.min(9, parsed))
}

export function matchMenuDefinition(pathname: string): MenuDefinitionItem | null {
  const cleanPath = (pathname || '/').split('?')[0]
  if (cleanPath === '/' || cleanPath === '') {
    return APP_MENUS.find((m) => m.path === '/') || null
  }
  // 가장 구체적인 경로 우선 매칭
  const sorted = [...APP_MENUS]
    .filter((m) => m.path !== '/')
    .sort((a, b) => b.path.length - a.path.length)

  for (const menu of sorted) {
    if (cleanPath === menu.path || cleanPath.startsWith(`${menu.path}/`)) {
      return menu
    }
  }
  return null
}

export function evaluateMenuAccess(params: {
  pathname: string
  userRole?: string | null
  userLevel?: number | null
  loginUserId?: string | null
  permissions: MenuPermissionRecord[]
}): {
  allowed: boolean
  menuName: string
  requiredRole: AllowedRoleType
  minLevel: number
} {
  const { pathname, userRole, userLevel, loginUserId, permissions } = params

  // 기본 최고관리자('admin' 아이디)는 시스템 잠김 방지를 위해 모든 메뉴 항상 접근 허용
  if (isProtectedMasterAdminId(loginUserId)) {
    return {
      allowed: true,
      menuName: '',
      requiredRole: 'ALL',
      minLevel: 1,
    }
  }

  const matchedMenu = matchMenuDefinition(pathname)
  if (!matchedMenu) {
    return {
      allowed: true,
      menuName: '',
      requiredRole: 'ALL',
      minLevel: 1,
    }
  }

  const dbPerm = permissions.find((p) => p.menuPath === matchedMenu.path)
  const requiredRole = dbPerm
    ? normalizeAllowedRole(dbPerm.allowedRole)
    : matchedMenu.defaultAllowedRole
  const minLevel = dbPerm
    ? clampAccessLevel(dbPerm.minLevel, matchedMenu.defaultMinLevel)
    : matchedMenu.defaultMinLevel

  const effectiveRole = normalizeUserRole(userRole, loginUserId)
  const effectiveLevel = clampAccessLevel(userLevel, 1)

  if (requiredRole === 'ADMIN' && effectiveRole !== 'ADMIN') {
    return {
      allowed: false,
      menuName: matchedMenu.name,
      requiredRole,
      minLevel,
    }
  }

  if (requiredRole === 'USER' && effectiveRole !== 'USER') {
    return {
      allowed: false,
      menuName: matchedMenu.name,
      requiredRole,
      minLevel,
    }
  }

  if (effectiveLevel < minLevel) {
    return {
      allowed: false,
      menuName: matchedMenu.name,
      requiredRole,
      minLevel,
    }
  }

  return {
    allowed: true,
    menuName: matchedMenu.name,
    requiredRole,
    minLevel,
  }
}

/**
 * 견적 수정 권한 판별 (조회는 모든 활성 사용자에게 허용)
 * - ADMIN 역할 (또는 'admin' 마스터 계정): 모든 견적 수정 가능
 * - USER 역할: 본인이 작성한 견적(작성자)만 수정 가능
 */
export function canUserModifyEstimate(
  estimate: {
    createdById?: string | null
    createdByUserId?: string | null
    environment?: string | null
    adminHistory?: string | null
  } | null | undefined,
  user: UserIdentityInfo | null | undefined
): boolean {
  if (!estimate || !user) return false

  const effectiveRole = normalizeUserRole(user.role, user.userId)
  if (effectiveRole === 'ADMIN') {
    return true
  }

  const myAdminId = String(user.id || '').trim()
  const myLoginId = String(user.userId || '').trim().toLowerCase()
  const myName = String(user.name || '').trim()

  // 1순위: 명시적 작성자 PK (createdById)
  const estCreatedById = String(estimate.createdById || '').trim()
  if (estCreatedById) {
    return Boolean(myAdminId && estCreatedById === myAdminId)
  }

  // 2순위: 명시적 작성자 로그인 아이디 (createdByUserId)
  const estCreatedByUserId = String(estimate.createdByUserId || '').trim().toLowerCase()
  if (estCreatedByUserId) {
    return Boolean(myLoginId && estCreatedByUserId === myLoginId)
  }

  // 3순위: 기존 레거시 견적 및 environment / adminHistory 작성자 정보
  let envObj: any = null
  if (estimate.environment) {
    try {
      envObj = JSON.parse(estimate.environment)
    } catch {}
  }

  if (envObj && typeof envObj === 'object') {
    const envAdminId = String(envObj.createdByAdminId || '').trim()
    if (envAdminId) {
      return Boolean(myAdminId && envAdminId === myAdminId)
    }
    const envLoginId = String(envObj.createdByUserId || '').trim().toLowerCase()
    if (envLoginId) {
      return Boolean(myLoginId && envLoginId === myLoginId)
    }
  }

  if (estimate.adminHistory) {
    try {
      const hist = JSON.parse(estimate.adminHistory)
      if (Array.isArray(hist) && hist.length > 0) {
        const createEntry =
          hist.find((h: any) => h?.action === 'CREATE' || h?.action === 'CREATE_QUICK_VISIT') ||
          hist[0]
        if (createEntry) {
          if (createEntry.byAdminId) {
            return Boolean(myAdminId && String(createEntry.byAdminId).trim() === myAdminId)
          }
          if (createEntry.byUserId) {
            return Boolean(
              myLoginId && String(createEntry.byUserId).trim().toLowerCase() === myLoginId
            )
          }
          const byStr = String(createEntry.by || '').trim()
          if (byStr) {
            return (
              (Boolean(myName) && byStr === myName) ||
              (Boolean(myLoginId) && byStr.toLowerCase() === myLoginId)
            )
          }
        }
      }
    } catch {}
  }

  if (envObj && typeof envObj === 'object') {
    const estName = String(envObj.estimatorName || '').trim()
    if (estName) {
      return (
        (Boolean(myName) && estName === myName) ||
        (Boolean(myLoginId) && estName.toLowerCase() === myLoginId)
      )
    }
  }

  return false
}

export const canUserAccessEstimate = canUserModifyEstimate
