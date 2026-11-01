'use server'

import prisma from '@/lib/prisma'
import { ensureAdminColumns, invalidateAdminActiveCache } from '@/lib/adminSchema'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { decrypt, createSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export async function createUser(prevState: any, formData: FormData) {
  await ensureAdminColumns()

  const userId = (formData.get('userId') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim() || ''
  const role = (formData.get('role') as string)?.trim()
  const level = parseInt(formData.get('level') as string)

  if (!userId || !name) {
    return { error: '아이디와 이름을 입력해주세요.' }
  }

  // Check if userId exists
  const existingUser = await prisma.admin.findUnique({
    where: { userId }
  })

  if (existingUser) {
    return { error: '이미 존재하는 아이디입니다.' }
  }

  // 초기 비밀번호는 아이디와 동일하게 설정
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(userId, salt)

  const created = await prisma.admin.create({
    data: {
      userId,
      name,
      role: role || 'ADMIN',
      level: level || 1,
      password: hashedPassword
    }
  })

  await prisma.$executeRaw`
    UPDATE "Admin"
    SET "phone" = ${phone}, "isActive" = true
    WHERE "id" = ${created.id}
  `

  revalidatePath('/users')
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
    where: { id: session.userId as string }
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
    data: { password: hashedPassword }
  })

  // 세션 재발급 (requiresPasswordChange = false)
  await createSession(user.id, user.name, user.level, false)

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
      where: { id: session.userId as string }
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
      data: { password: hashedPassword }
    })

    // 세션 갱신
    await createSession(user.id, user.name, user.level, false)

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
    const cookieStore = await cookies()
    const cookie = cookieStore.get('session')?.value
    const session = await decrypt(cookie)

    if (!session || (session.level as number) < 9) {
      return { error: '비밀번호를 초기화할 권한이 없습니다. (최고관리자 전용)' }
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId }
    })

    if (!admin) {
      return { error: '사용자를 찾을 수 없습니다.' }
    }

    // 아이디와 동일한 비밀번호로 해시 생성 후 업데이트
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(admin.userId, salt)

    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashedPassword }
    })

    revalidatePath('/users')
    return { 
      success: true, 
      message: `'${admin.name}(${admin.userId})' 계정의 비밀번호가 아이디와 동일하게 초기화되었습니다.` 
    }
  } catch (error) {
    console.error('Password reset error:', error)
    return { error: '비밀번호 초기화 처리 중 오류가 발생했습니다.' }
  }
}

/**
 * 관리자 정보(연락처, 레벨) 수정
 */
export async function updateAdminInfo(adminId: string, phone: string, level: number) {
  try {
    await ensureAdminColumns()

    const cookieStore = await cookies()
    const cookie = cookieStore.get('session')?.value
    const session = await decrypt(cookie)

    if (!session || (session.level as number) < 9) {
      return { error: '수정 권한이 없습니다. (최고관리자 전용)' }
    }

    const cleanPhone = (phone || '').trim()
    const cleanLevel = Number.isNaN(level) ? 1 : level

    const rows = await prisma.$queryRaw<Array<{ id: string; userId: string; name: string }>>`
      UPDATE "Admin"
      SET "phone" = ${cleanPhone}, "level" = ${cleanLevel}, "updatedAt" = NOW()
      WHERE "id" = ${adminId}
      RETURNING "id", "userId", "name"
    `
    const admin = rows[0]
    if (!admin) {
      return { error: '사용자를 찾을 수 없습니다.' }
    }

    invalidateAdminActiveCache(adminId)
    revalidatePath('/users')
    return {
      success: true,
      message: `'${admin.name}(${admin.userId})' 사용자의 연락처 및 권한 정보가 저장되었습니다.`
    }
  } catch (error) {
    console.error('Update admin info error:', error)
    return { error: '사용자 정보 저장 중 오류가 발생했습니다.' }
  }
}

/**
 * 관리자 사용중 / 사용중지 상태 변경
 */
export async function toggleAdminActive(adminId: string, nextActive: boolean) {
  try {
    await ensureAdminColumns()

    const cookieStore = await cookies()
    const cookie = cookieStore.get('session')?.value
    const session = await decrypt(cookie)

    if (!session || (session.level as number) < 9) {
      return { error: '계정 상태를 변경할 권한이 없습니다. (최고관리자 전용)' }
    }

    if (!nextActive && session.userId === adminId) {
      return { error: '현재 로그인 중인 본인 계정은 사용중지할 수 없습니다.' }
    }

    const rows = await prisma.$queryRaw<Array<{ id: string; userId: string; name: string; isActive: boolean }>>`
      UPDATE "Admin"
      SET "isActive" = ${nextActive}, "updatedAt" = NOW()
      WHERE "id" = ${adminId}
      RETURNING "id", "userId", "name", "isActive"
    `
    const admin = rows[0]
    if (!admin) {
      return { error: '사용자를 찾을 수 없습니다.' }
    }

    invalidateAdminActiveCache(adminId)
    revalidatePath('/users')
    return {
      success: true,
      message: nextActive
        ? `'${admin.name}(${admin.userId})' 계정이 [사용중] 상태로 활성화되었습니다.`
        : `'${admin.name}(${admin.userId})' 계정이 [사용중지] 처리되어 로그인이 차단되었습니다.`
    }
  } catch (error) {
    console.error('Toggle admin active error:', error)
    return { error: '계정 상태 변경 중 오류가 발생했습니다.' }
  }
}



