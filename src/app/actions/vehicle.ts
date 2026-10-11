'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getVehicles() {
  return await prisma.vehicleMaster.findMany({
    orderBy: { createdAt: 'asc' }
  })
}

export async function createVehicle(data: FormData) {
  const name = data.get('name') as string
  const defaultCost = Number(data.get('defaultCost')) || 0
  const maxCbm = Number(data.get('maxCbm')) || 0

  if (!name) return { error: '이름을 입력하세요.' }

  try {
    await prisma.vehicleMaster.create({
      data: { name, defaultCost, maxCbm }
    })
    revalidatePath('/vehicles')
    return { success: true }
  } catch (error) {
    return { error: '차량 등록 중 오류가 발생했습니다. 이름이 중복되었을 수 있습니다.' }
  }
}

export async function deleteVehicle(id: string) {
  try {
    await prisma.vehicleMaster.delete({ where: { id } })
    revalidatePath('/vehicles')
    return { success: true }
  } catch (error) {
    return { error: '삭제 중 오류가 발생했습니다.' }
  }
}

export async function updateVehicle(id: string, name: string, defaultCost: number, maxCbm: number = 0) {
  if (!name) return { error: '이름을 입력하세요.' }

  try {
    await prisma.vehicleMaster.update({
      where: { id },
      data: { name, defaultCost, maxCbm }
    })
    revalidatePath('/vehicles')
    return { success: true }
  } catch (error) {
    return { error: '차량 수정 중 오류가 발생했습니다. 이름이 중복되었을 수 있습니다.' }
  }
}
