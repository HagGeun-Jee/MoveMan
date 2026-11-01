'use server'

import prisma from '@/lib/prisma'
import { ensureAdminColumns } from '@/lib/adminSchema'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
  const userId = (formData.get('userId') as string)?.trim()
  const password = formData.get('password') as string
  
  if (!userId || !password) {
    return { error: '아이디와 비밀번호를 입력해주세요.' }
  }

  await ensureAdminColumns()
  
  const rows = await prisma.$queryRaw<Array<{
    id: string
    userId: string
    password: string
    name: string
    level: number
    isActive: boolean
  }>>`
    SELECT
      "id",
      "userId",
      "password",
      "name",
      "level",
      COALESCE("isActive", true) AS "isActive"
    FROM "Admin"
    WHERE "userId" = ${userId}
    LIMIT 1
  `
  const user = rows[0]
  
  if (!user) {
    return { error: '존재하지 않는 아이디거나 비밀번호가 틀렸습니다.' }
  }

  if (user.isActive === false) {
    return {
      error: `'${user.name}(${user.userId})' 계정은 현재 사용중지(사용불가) 상태입니다. 관리자에게 문의해주세요.`,
      isDisabled: true,
      attemptAt: Date.now()
    }
  }
  
  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) {
    return { error: '존재하지 않는 아이디거나 비밀번호가 틀렸습니다.' }
  }
  
  const requiresPasswordChange = password === userId
  await createSession(user.id, user.name, user.level, requiresPasswordChange)
  redirect('/')
}
