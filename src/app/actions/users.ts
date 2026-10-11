'use server'

import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { decrypt, createSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export async function createUser(prevState: any, formData: FormData) {
  const userId = formData.get('userId') as string
  const name = formData.get('name') as string
  const role = formData.get('role') as string
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

  await prisma.admin.create({
    data: {
      userId,
      name,
      role: role || 'ADMIN',
      level: level || 1,
      password: hashedPassword
    }
  })

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
