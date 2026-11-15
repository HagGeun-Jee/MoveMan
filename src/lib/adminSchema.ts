import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/session'
import {
  clampAccessLevel,
  isProtectedMasterAdminId,
  normalizeAllowedRole,
  normalizeUserRole,
  type MenuPermissionRecord,
  type UserRole,
} from '@/lib/menuPermissionUtils'

export interface VerifiedAdminProfile {
  id: string
  userId: string
  name: string
  role: UserRole
  level: number
  isActive: boolean
  isMasterAdmin: boolean
}

let isAdminSchemaEnsured = false
let isRlsEnsured = false
let schemaEnsurePromise: Promise<void> | null = null

export function invalidateAdminActiveCache(_adminId?: string) {
  // 실시간 DB 조회 방식으로 전환하여 별도 메모리 캐시 지연 없이 즉시 반영됨
}

export async function ensureAdminColumns() {
  if (isAdminSchemaEnsured && isRlsEnsured) return
  if (schemaEnsurePromise) {
    await schemaEnsurePromise
    return
  }

  schemaEnsurePromise = (async () => {
    if (!isAdminSchemaEnsured) {
      try {
        // 1. Admin 확장 컬럼 보장 (기본정보 + 추가정보)
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL DEFAULT '';
        `)
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
        `)
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL DEFAULT '';
        `)
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "ssn" TEXT NOT NULL DEFAULT '';
        `)
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "zipCode" TEXT NOT NULL DEFAULT '';
        `)
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "address" TEXT NOT NULL DEFAULT '';
        `)
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "memo" TEXT NOT NULL DEFAULT '';
        `)

        // admin 마스터 계정은 항상 ROLE='ADMIN', 사용중(true) 보장
        await prisma.$executeRawUnsafe(`
          UPDATE "Admin"
          SET "role" = 'ADMIN', "isActive" = true
          WHERE LOWER(TRIM("userId")) = 'admin' AND ("role" <> 'ADMIN' OR "isActive" IS FALSE);
        `)

        // 2. MenuPermission 허용 역할(allowedRole) 컬럼 보장
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "MenuPermission" ADD COLUMN IF NOT EXISTS "allowedRole" TEXT NOT NULL DEFAULT 'ALL';
        `)

        // 3. Estimate 작성자 식별 컬럼 보장
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Estimate" ADD COLUMN IF NOT EXISTS "createdById" TEXT NOT NULL DEFAULT '';
        `)
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Estimate" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT NOT NULL DEFAULT '';
        `)

        isAdminSchemaEnsured = true
      } catch (error) {
        console.warn('ensureAdminColumns warning:', error)
      }
    }

    if (!isRlsEnsured) {
      try {
        // Supabase 외부 PostgREST API(anon, authenticated) 직접 접근 원천 차단 (RLS 활성화)
        await prisma.$executeRawUnsafe(`
          DO $$
          DECLARE
            r RECORD;
          BEGIN
            FOR r IN (
              SELECT tablename
              FROM pg_tables
              WHERE schemaname = 'public'
            ) LOOP
              EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
            END LOOP;
          END $$;
        `)
        isRlsEnsured = true
      } catch (error) {
        console.warn('ensureDatabaseRls warning:', error)
      }
    }
  })()

  try {
    await schemaEnsurePromise
  } finally {
    schemaEnsurePromise = null
  }
}

/**
 * DB에서 현재 관리자/사용자 계정의 최신 프로필(ROLE, 접근레벨, 계정상태) 조회
 */
export async function getVerifiedAdminProfile(
  adminId: string | undefined | null
): Promise<VerifiedAdminProfile | null> {
  if (!adminId) return null

  await ensureAdminColumns()

  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string
        userId: string
        name: string
        role: string
        level: number
        isActive: boolean
      }>
    >`
      SELECT
        "id",
        "userId",
        "name",
        COALESCE("role", 'ADMIN') AS "role",
        COALESCE("level", 1) AS "level",
        COALESCE("isActive", true) AS "isActive"
      FROM "Admin"
      WHERE "id" = ${adminId}
      LIMIT 1
    `
    const row = rows[0]
    if (!row) {
      return null
    }

    const isMasterAdmin = isProtectedMasterAdminId(row.userId)
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      role: normalizeUserRole(row.role, row.userId),
      level: isMasterAdmin ? 9 : clampAccessLevel(row.level, 1),
      isActive: isMasterAdmin ? true : row.isActive !== false,
      isMasterAdmin,
    }
  } catch (error) {
    console.warn('getVerifiedAdminProfile error:', error)
    return null
  }
}

/**
 * 현재 세션의 사용자가 유효하고 사용중(isActive === true)인지 확인
 */
export async function verifyActiveAdmin(adminId: string | undefined | null): Promise<boolean> {
  if (!adminId) return false
  try {
    const profile = await getVerifiedAdminProfile(adminId)
    if (!profile) {
      // DB 조회 자체 실패가 아닌 계정 미존재 시 false, 네트워크 장애 대비는 아래 catch에서 처리
      return false
    }
    return profile.isActive
  } catch (error) {
    console.warn('verifyActiveAdmin error:', error)
    return true
  }
}

/**
 * 현재 요청의 쿠키 세션 및 DB 실시간 권한 컨텍스트 반환
 */
export async function getCurrentUserAuthContext(): Promise<VerifiedAdminProfile | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  if (!cookie) return null

  try {
    const session = await decrypt(cookie)
    if (!session?.userId) return null

    await ensureAdminColumns()
    const profile = await getVerifiedAdminProfile(String(session.userId))
    if (profile) {
      return profile
    }

    // 일시적 DB 연결 지연 시 세션 페이로드 기반 폴백
    const fallbackLoginId = String(session.loginId || '')
    const isMasterAdmin = isProtectedMasterAdminId(fallbackLoginId)
    return {
      id: String(session.userId),
      userId: fallbackLoginId,
      name: String(session.name || ''),
      role: normalizeUserRole(String(session.role || 'ADMIN'), fallbackLoginId),
      level: clampAccessLevel(session.level as number, 1),
      isActive: true,
      isMasterAdmin,
    }
  } catch {
    return null
  }
}

/**
 * 메뉴별 접근 권한 목록 조회 (allowedRole 포함)
 */
export async function getMenuPermissionsList(): Promise<MenuPermissionRecord[]> {
  try {
    await ensureAdminColumns()
    const rows = await prisma.$queryRaw<
      Array<{
        menuPath: string
        menuName: string
        minLevel: number
        allowedRole: string
      }>
    >`
      SELECT
        "menuPath",
        "menuName",
        COALESCE("minLevel", 1) AS "minLevel",
        COALESCE("allowedRole", 'ALL') AS "allowedRole"
      FROM "MenuPermission"
      ORDER BY "menuPath" ASC
    `
    return rows.map((r) => ({
      menuPath: r.menuPath,
      menuName: r.menuName,
      minLevel: clampAccessLevel(r.minLevel, 1),
      allowedRole: normalizeAllowedRole(r.allowedRole),
    }))
  } catch (error) {
    console.warn('getMenuPermissionsList error:', error)
    return []
  }
}
