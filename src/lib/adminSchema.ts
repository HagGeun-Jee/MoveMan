import prisma from '@/lib/prisma'

let isAdminSchemaEnsured = false
let isRlsEnsured = false

// 짧은 메모리 캐시 (10초)로 DB 부하 방지 및 사용중지 즉시 반영
const activeStatusCache = new Map<string, { isActive: boolean; expiresAt: number }>()

export function invalidateAdminActiveCache(adminId?: string) {
  if (adminId) {
    activeStatusCache.delete(adminId)
  } else {
    activeStatusCache.clear()
  }
}

export async function ensureAdminColumns() {
  if (!isAdminSchemaEnsured) {
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL DEFAULT '';
      `)
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
      `)
      isAdminSchemaEnsured = true
    } catch (error) {
      console.warn('ensureAdminColumns warning:', error)
    }
  }

  if (!isRlsEnsured) {
    try {
      // Supabase 외부 PostgREST API(anon, authenticated) 직접 접근 원천 차단 (RLS 활성화)
      // Prisma 서버 연결(postgres table owner)은 기존과 동일하게 100% 정상 동작함
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
}

/**
 * 현재 세션의 관리자가 유효하고 사용중(isActive === true)인지 확인
 */
export async function verifyActiveAdmin(adminId: string | undefined | null): Promise<boolean> {
  if (!adminId) return false

  const now = Date.now()
  const cached = activeStatusCache.get(adminId)
  if (cached && cached.expiresAt > now) {
    return cached.isActive
  }

  try {
    await ensureAdminColumns()
    const rows = await prisma.$queryRaw<Array<{ id: string; isActive: boolean }>>`
      SELECT "id", COALESCE("isActive", true) AS "isActive"
      FROM "Admin"
      WHERE "id" = ${adminId}
      LIMIT 1
    `
    const user = rows[0]
    const isActive = Boolean(user && user.isActive !== false)
    activeStatusCache.set(adminId, { isActive, expiresAt: now + 10_000 })
    return isActive
  } catch (error) {
    console.warn('verifyActiveAdmin error:', error)
    // 일시적 네트워크 오류 시 기존 로그인 세션이 갑자기 끊기지 않도록 true 폴백
    return true
  }
}
