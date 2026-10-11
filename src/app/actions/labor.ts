'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getLabors() {
  return await prisma.laborMaster.findMany({
    orderBy: { createdAt: 'asc' }
  })
}

export async function createLabor(data: FormData) {
  const name = data.get('name') as string
  const defaultCost = Number(data.get('defaultCost')) || 0

  if (!name) return { error: '이름을 입력하세요.' }

  try {
    await prisma.laborMaster.create({
      data: { name, defaultCost }
    })
    revalidatePath('/labors')
    return { success: true }
  } catch (error) {
    return { error: '인건비 등록 중 오류가 발생했습니다. 이름이 중복되었을 수 있습니다.' }
  }
}

export async function deleteLabor(id: string) {
  try {
    await prisma.laborMaster.delete({ where: { id } })
    revalidatePath('/labors')
    return { success: true }
  } catch (error) {
    return { error: '삭제 중 오류가 발생했습니다.' }
  }
}

export async function updateLabor(id: string, name: string, defaultCost: number) {
  if (!name) return { error: '이름을 입력하세요.' }

  try {
    await prisma.laborMaster.update({
      where: { id },
      data: { name, defaultCost }
    })
    revalidatePath('/labors')
    return { success: true }
  } catch (error) {
    return { error: '인건비 수정 중 오류가 발생했습니다. 이름이 중복되었을 수 있습니다.' }
  }
}
