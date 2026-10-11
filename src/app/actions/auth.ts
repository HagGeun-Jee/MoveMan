'use server'

import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
  const userId = formData.get('userId') as string
  const password = formData.get('password') as string
  
  if (!userId || !password) {
    return { error: '아이디와 비밀번호를 입력해주세요.' }
  }
  
  const user = await prisma.admin.findUnique({
    where: { userId }
  })
  
  if (!user) {
    return { error: '존재하지 않는 아이디거나 비밀번호가 틀렸습니다.' }
  }
  
  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) {
    return { error: '존재하지 않는 아이디거나 비밀번호가 틀렸습니다.' }
  }
  
  const requiresPasswordChange = password === userId
  await createSession(user.id, user.name, user.level, requiresPasswordChange)
  redirect('/')
}
