'use server'

import prisma from '@/lib/prisma'
import {
  ensureAdminColumns,
  getCurrentUserAuthContext,
  getMenuPermissionsList,
  invalidateAdminActiveCache,
} from '@/lib/adminSchema'
import {
  clampAccessLevel,
  evaluateMenuAccess,
  isProtectedMasterAdminId,
  normalizeAllowedRole,
  normalizeUserRole,
  type AllowedRoleType,
  type UserRole,
} from '@/lib/menuPermissionUtils'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { decrypt, createSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export interface AdminUserFullRecord {
  id: string
  userId: string
  name: string
  phone: string
  role: UserRole
  level: number
  isActive: boolean
  email: string
  ssn: string
  zipCode: string
  address: string
  memo: string
  createdAt: string
  updatedAt: string
}

export interface SaveAdminUserPayload {
  id?: string // 수정 시 대상 Admin.id, 신규 등록 시 생략
  name: string
  userId: string
  password?: string
  phone?: string
  role: UserRole
  level: number
  isActive: boolean
  email?: string
  ssn?: string
  zipCode?: string
  address?: string
  memo?: string
}

async function verifyManagePermission(targetMenuPath: '/users' | '/menu-permissions') {
  const caller = await getCurrentUserAuthContext()
  if (!caller || !caller.isActive) {
    return { allowed: false as const, error: '로그인이 필요하거나 비활성화된 계정입니다.', caller: null }
  }
  const permissions = await getMenuPermissionsList()
  const access = evaluateMenuAccess({
    pathname: targetMenuPath,
    userRole: caller.role,
    userLevel: caller.level,
    loginUserId: caller.userId,
    permissions,
  })
  if (!access.allowed) {
    return {
      allowed: false as const,
      error: `'${access.menuName}' 권한이 없습니다.`,
      caller: null,
    }
  }
  return { allowed: true as const, error: '', caller }
}

export async function getAllAdminUsers(): Promise<AdminUserFullRecord[]> {
  await ensureAdminColumns()
  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      userId: string
      name: string
      phone: string
      role: string
      level: number
      isActive: boolean
      email: string
      ssn: string
      zipCode: string
      address: string
      memo: string
      createdAt: Date
      updatedAt: Date
    }>
  >`
    SELECT
      "id",
      "userId",
      "name",
      COALESCE("phone", '') AS "phone",
      COALESCE("role", 'ADMIN') AS "role",
      COALESCE("level", 1) AS "level",
      COALESCE("isActive", true) AS "isActive",
      COALESCE("email", '') AS "email",
      COALESCE("ssn", '') AS "ssn",
      COALESCE("zipCode", '') AS "zipCode",
      COALESCE("address", '') AS "address",
      COALESCE("memo", '') AS "memo",
      "createdAt",
      "updatedAt"
    FROM "Admin"
    ORDER BY
      CASE WHEN LOWER(TRIM("userId")) = 'admin' THEN 0 ELSE 1 END ASC,
      "createdAt" DESC
  `

  return rows.map((r) => {
    const isMaster = isProtectedMasterAdminId(r.userId)
    return {
      id: r.id,
      userId: r.userId,
      name: r.name,
      phone: r.phone || '',
      role: normalizeUserRole(r.role, r.userId),
      level: isMaster ? 9 : clampAccessLevel(r.level, 1),
      isActive: isMaster ? true : r.isActive !== false,
      email: r.email || '',
      ssn: r.ssn || '',
      zipCode: r.zipCode || '',
      address: r.address || '',
      memo: r.memo || '',
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt || ''),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt || ''),
    }
  })
}

/**
 * 팝업 모달 전용: 신규 사용자 등록 및 기존 사용자 정보 통합 저장
 */
export async function saveAdminUserModal(payload: SaveAdminUserPayload) {
  try {
    await ensureAdminColumns()

    const authCheck = await verifyManagePermission('/users')
    if (!authCheck.allowed || !authCheck.caller) {
      return { success: false, error: authCheck.error }
    }
    const caller = authCheck.caller

    const name = String(payload.name || '').trim()
    const userId = String(payload.userId || '').trim()
    const rawPassword = String(payload.password || '')
    const phone = String(payload.phone || '').trim()
    const email = String(payload.email || '').trim()
    const ssn = String(payload.ssn || '').trim()
    const zipCode = String(payload.zipCode || '').trim()
    const address = String(payload.address || '').trim()
    const memo = String(payload.memo || '').trim()

    if (!name) {
      return { success: false, error: '이름을 입력해주세요.' }
    }

    // 1) 신규 사용자 등록
    if (!payload.id) {
      if (!userId) {
        return { success: false, error: '아이디를 입력해주세요.' }
      }
      if (userId.length < 2) {
        return { success: false, error: '아이디는 2자 이상 입력해주세요.' }
      }
      if (rawPassword && rawPassword.length < 4) {
        return { success: false, error: '비밀번호는 최소 4자 이상 입력해주세요.' }
      }

      const dupRows = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Admin" WHERE LOWER(TRIM("userId")) = LOWER(${userId}) LIMIT 1
      `
      if (dupRows.length > 0) {
        return { success: false, error: `'${userId}' 아이디는 이미 등록되어 있습니다.` }
      }

      const isMaster = isProtectedMasterAdminId(userId)

      // 로그인 계정의 ROLE이 ADMIN이 아닌 경우(USER인 경우): ADMIN 계정 생성 및 ROLE을 ADMIN으로 지정 불가
      if (caller.role !== 'ADMIN') {
        if (isMaster || normalizeUserRole(payload.role, userId) !== 'USER') {
          return {
            success: false,
            error: 'ROLE(역할) 설정 및 ADMIN 권한 부여는 ADMIN 역할 계정만 가능합니다.',
          }
        }
      }

      const effectiveRole: UserRole =
        caller.role !== 'ADMIN'
          ? 'USER'
          : isMaster
            ? 'ADMIN'
            : normalizeUserRole(payload.role, userId)
      const effectiveLevel = isMaster ? 9 : clampAccessLevel(payload.level, 1)
      const effectiveActive = isMaster ? true : payload.isActive !== false

      // 비밀번호 미입력 시 아이디와 동일하게 초기 설정
      const passwordToHash = rawPassword || userId
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(passwordToHash, salt)

      const created = await prisma.admin.create({
        data: {
          userId,
          name,
          password: hashedPassword,
          role: effectiveRole,
          level: effectiveLevel,
        },
      })

      await prisma.$executeRaw`
        UPDATE "Admin"
        SET
          "phone" = ${phone},
          "isActive" = ${effectiveActive},
          "email" = ${email},
          "ssn" = ${ssn},
          "zipCode" = ${zipCode},
          "address" = ${address},
          "memo" = ${memo},
          "updatedAt" = NOW()
        WHERE "id" = ${created.id}
      `

      invalidateAdminActiveCache(created.id)
      revalidatePath('/', 'layout')
      revalidatePath('/users')
      revalidatePath('/menu-permissions')
      revalidatePath('/estimates')
      revalidatePath('/calendar')
      revalidatePath('/vehicles')

      const updatedUsers = await getAllAdminUsers()

      return {
        success: true,
        message: `'${name}(${userId})' 사용자가 등록되었습니다.`,
        users: updatedUsers,
      }
    }

    // 2) 기존 사용자 수정
    const targetId = payload.id
    const existingRows = await prisma.$queryRaw<
      Array<{ id: string; userId: string; name: string; password: string; role: string }>
    >`
      SELECT
        "id",
        "userId",
        "name",
        "password",
        COALESCE("role", 'ADMIN') AS "role"
      FROM "Admin"
      WHERE "id" = ${targetId}
      LIMIT 1
    `
    const existing = existingRows[0]
    if (!existing) {
      return { success: false, error: '수정할 사용자를 찾을 수 없습니다.' }
    }

    const isTargetMasterAdmin = isProtectedMasterAdminId(existing.userId)
    const isSelf = caller.id === existing.id
    const existingRole = normalizeUserRole(existing.role, existing.userId)
    const requestedRole = isTargetMasterAdmin
      ? 'ADMIN'
      : normalizeUserRole(payload.role, existing.userId)

    // 로그인 계정의 ROLE이 USER인 경우 ROLE 변경 불가 (ADMIN ROLE 계정만 ROLE 수정 가능)
    if (caller.role !== 'ADMIN' && requestedRole !== existingRole) {
      return {
        success: false,
        error: 'ROLE(역할) 수정 권한은 ADMIN 계정에게만 있습니다. (USER 계정은 수정 불가)',
      }
    }

    // admin 계정은 ROLE 변경 불가 (항상 ADMIN 유지)
    if (isTargetMasterAdmin && payload.role !== 'ADMIN') {
      return {
        success: false,
        error: '기본 admin 계정의 역할(ROLE)은 변경할 수 없습니다. (항상 ADMIN 유지)',
      }
    }
    if (isTargetMasterAdmin && payload.isActive === false) {
      return {
        success: false,
        error: '기본 admin 계정은 사용중지할 수 없습니다.',
      }
    }
    if (isSelf && payload.isActive === false) {
      return {
        success: false,
        error: '현재 로그인 중인 본인 계정은 사용중지할 수 없습니다.',
      }
    }
    if (rawPassword && rawPassword.length < 4) {
      return { success: false, error: '변경할 비밀번호는 최소 4자 이상 입력해주세요.' }
    }

    const effectiveRole: UserRole =
      caller.role !== 'ADMIN'
        ? existingRole
        : isTargetMasterAdmin
          ? 'ADMIN'
          : requestedRole
    const effectiveLevel = isTargetMasterAdmin ? 9 : clampAccessLevel(payload.level, 1)
    const effectiveActive = isTargetMasterAdmin ? true : payload.isActive !== false

    let nextHashedPassword = existing.password
    if (rawPassword) {
      const salt = await bcrypt.genSalt(10)
      nextHashedPassword = await bcrypt.hash(rawPassword, salt)
    }

    await prisma.$executeRaw`
      UPDATE "Admin"
      SET
        "name" = ${name},
        "password" = ${nextHashedPassword},
        "phone" = ${phone},
        "role" = ${effectiveRole},
        "level" = ${effectiveLevel},
        "isActive" = ${effectiveActive},
        "email" = ${email},
        "ssn" = ${ssn},
        "zipCode" = ${zipCode},
        "address" = ${address},
        "memo" = ${memo},
        "updatedAt" = NOW()
      WHERE "id" = ${targetId}
    `

    invalidateAdminActiveCache(targetId)

    // 본인 계정을 직접 수정한 경우 세션 쿠키 정보 즉시 동기화
    if (isSelf) {
      await createSession(
        existing.id,
        name,
        effectiveLevel,
        false,
        effectiveRole,
        existing.userId
      )
    }

    revalidatePath('/', 'layout')
    revalidatePath('/users')
    revalidatePath('/menu-permissions')
    revalidatePath('/estimates')
    revalidatePath('/calendar')
    revalidatePath('/vehicles')

    const updatedUsers = await getAllAdminUsers()

    return {
      success: true,
      message: `'${name}(${existing.userId})' 사용자 정보가 저장되었습니다.`,
      users: updatedUsers,
      updatedSelfRole: isSelf ? effectiveRole : undefined,
    }
  } catch (error) {
    console.error('saveAdminUserModal error:', error)
    return { success: false, error: '사용자 정보 저장 중 오류가 발생했습니다.' }
  }
}

export async function createUser(prevState: any, formData: FormData) {
  const res = await saveAdminUserModal({
    name: String(formData.get('name') || ''),
    userId: String(formData.get('userId') || ''),
    password: String(formData.get('password') || ''),
    phone: String(formData.get('phone') || ''),
    role: normalizeUserRole(String(formData.get('role') || 'USER')),
    level: clampAccessLevel(formData.get('level') as string, 1),
    isActive: true,
  })
  if (!res.success) return { error: res.error }
  return { success: true }
}

export async function changePassword(prevState: any, formData: FormData) {
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (newPassword !== confirmPassword) {
    return { error: '새 비밀번호가 일치하지 않습니다.' }
  }

  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  const session = await decrypt(cookie)

  if (!session?.userId) {
    redirect('/login')
  }

  const user = await prisma.admin.findUnique({
    where: { id: session.userId as string },
  })

  if (!user) {
    redirect('/login')
  }

  if (newPassword === user.userId) {
    return { error: '새 비밀번호는 아이디와 같을 수 없습니다.' }
  }

  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(newPassword, salt)

  await prisma.admin.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  })

  await createSession(
    user.id,
    user.name,
    clampAccessLevel(user.level, 1),
    false,
    normalizeUserRole(user.role, user.userId),
    user.userId
  )

  redirect('/')
}

export async function changePasswordModal(prevState: any, formData: FormData) {
  try {
    const currentPassword = formData.get('currentPassword') as string
    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!currentPassword) {
      return { error: '현재 비밀번호를 입력해주세요.' }
    }

    if (!newPassword) {
      return { error: '새 비밀번호를 입력해주세요.' }
    }

    if (newPassword.length < 4) {
      return { error: '새 비밀번호는 최소 4자 이상이어야 합니다.' }
    }

    if (newPassword !== confirmPassword) {
      return { error: '새 비밀번호가 일치하지 않습니다.' }
    }

    const cookieStore = await cookies()
    const cookie = cookieStore.get('session')?.value
    const session = await decrypt(cookie)

    if (!session?.userId) {
      return { error: '로그인 정보가 만료되었습니다. 다시 로그인해주세요.' }
    }

    const user = await prisma.admin.findUnique({
      where: { id: session.userId as string },
    })

    if (!user) {
      return { error: '사용자 정보를 찾을 수 없습니다.' }
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return { error: '현재 비밀번호가 올바르지 않습니다.' }
    }

    if (newPassword === user.userId) {
      return { error: '새 비밀번호는 아이디와 같을 수 없습니다.' }
    }

    if (currentPassword === newPassword) {
      return { error: '현재 사용 중인 비밀번호와 다른 비밀번호를 입력해주세요.' }
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    await prisma.admin.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    await createSession(
      user.id,
      user.name,
      clampAccessLevel(user.level, 1),
      false,
      normalizeUserRole(user.role, user.userId),
      user.userId
    )

    return { success: true, message: '비밀번호가 성공적으로 변경되었습니다.' }
  } catch (error) {
    console.error('Password change error:', error)
    return { error: '비밀번호 변경 처리 중 오류가 발생했습니다. 다시 시도해주세요.' }
  }
}

/**
 * 관리자 비밀번호 초기화 (아이디와 동일하게 초기화)
 */
export async function resetUserPassword(adminId: string) {
  try {
    const authCheck = await verifyManagePermission('/users')
    if (!authCheck.allowed) {
      return { error: authCheck.error || '비밀번호를 초기화할 권한이 없습니다.' }
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    })

    if (!admin) {
      return { error: '사용자를 찾을 수 없습니다.' }
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(admin.userId, salt)

    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    })

    revalidatePath('/users')
    return {
      success: true,
      message: `'${admin.name}(${admin.userId})' 계정의 비밀번호가 아이디와 동일하게 초기화되었습니다.`,
    }
  } catch (error) {
    console.error('Password reset error:', error)
    return { error: '비밀번호 초기화 처리 중 오류가 발생했습니다.' }
  }
}

/**
 * 계정 상태(사용중 / 사용중지) 빠른 전환
 */
export async function toggleAdminActive(adminId: string, nextActive: boolean) {
  try {
    await ensureAdminColumns()

    const authCheck = await verifyManagePermission('/users')
    if (!authCheck.allowed || !authCheck.caller) {
      return { error: authCheck.error || '계정 상태를 변경할 권한이 없습니다.' }
    }

    if (!nextActive && authCheck.caller.id === adminId) {
      return { error: '현재 로그인 중인 본인 계정은 사용중지할 수 없습니다.' }
    }

    const targetRows = await prisma.$queryRaw<Array<{ id: string; userId: string; name: string }>>`
      SELECT "id", "userId", "name" FROM "Admin" WHERE "id" = ${adminId} LIMIT 1
    `
    const target = targetRows[0]
    if (!target) {
      return { error: '사용자를 찾을 수 없습니다.' }
    }
    if (!nextActive && isProtectedMasterAdminId(target.userId)) {
      return { error: '기본 admin 계정은 사용중지할 수 없습니다.' }
    }

    await prisma.$executeRaw`
      UPDATE "Admin"
      SET "isActive" = ${nextActive}, "updatedAt" = NOW()
      WHERE "id" = ${adminId}
    `

    invalidateAdminActiveCache(adminId)
    revalidatePath('/', 'layout')
    revalidatePath('/users')

    const updatedUsers = await getAllAdminUsers()

    return {
      success: true,
      message: nextActive
        ? `'${target.name}(${target.userId})' 계정이 [사용중] 상태로 활성화되었습니다.`
        : `'${target.name}(${target.userId})' 계정이 [사용중지] 처리되어 로그인이 차단되었습니다.`,
      users: updatedUsers,
    }
  } catch (error) {
    console.error('Toggle admin active error:', error)
    return { error: '계정 상태 변경 중 오류가 발생했습니다.' }
  }
}

/**
 * 메뉴별 접근 권한 저장 (최소 레벨 1~9 + 허용 ROLE)
 */
export async function saveMenuPermissionsBulk(
  items: Array<{
    menuPath: string
    menuName: string
    minLevel: number
    allowedRole: AllowedRoleType
  }>
) {
  try {
    await ensureAdminColumns()

    const authCheck = await verifyManagePermission('/menu-permissions')
    if (!authCheck.allowed) {
      return { success: false, error: authCheck.error || '메뉴 권한을 변경할 권한이 없습니다.' }
    }

    for (const item of items) {
      const menuPath = String(item.menuPath || '').trim()
      if (!menuPath) continue
      const menuName = String(item.menuName || menuPath).trim()
      const minLevel = clampAccessLevel(item.minLevel, 1)
      const allowedRole = normalizeAllowedRole(item.allowedRole)

      const newId = `MP_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      await prisma.$executeRaw`
        INSERT INTO "MenuPermission" ("id", "menuPath", "menuName", "minLevel", "allowedRole", "createdAt", "updatedAt")
        VALUES (${newId}, ${menuPath}, ${menuName}, ${minLevel}, ${allowedRole}, NOW(), NOW())
        ON CONFLICT ("menuPath") DO UPDATE
        SET
          "menuName" = EXCLUDED."menuName",
          "minLevel" = EXCLUDED."minLevel",
          "allowedRole" = EXCLUDED."allowedRole",
          "updatedAt" = NOW()
      `
    }

    revalidatePath('/menu-permissions')
    revalidatePath('/users')
    revalidatePath('/', 'layout')

    return {
      success: true,
      message: '메뉴별 접근 권한 설정이 저장되었습니다.',
    }
  } catch (error) {
    console.error('saveMenuPermissionsBulk error:', error)
    return { success: false, error: '메뉴 권한 저장 중 오류가 발생했습니다.' }
  }
}
