'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createStandardItem(formData: FormData) {
  const name = formData.get('name') as string
  const spec = formData.get('spec') as string || ""
  const defaultCbm = parseFloat(formData.get('defaultCbm') as string)
  const defaultInnerCbm = parseFloat(formData.get('defaultInnerCbm') as string)
  const locationCategoryIds = formData.getAll('locationCategoryIds') as string[]

  if (!name) return { error: '물품명을 입력해주세요.' }

  try {
    await prisma.standardItem.create({
      data: {
        name,
        spec,
        defaultCbm: isNaN(defaultCbm) ? 0 : defaultCbm,
        defaultInnerCbm: isNaN(defaultInnerCbm) ? 0 : defaultInnerCbm,
        locations: {
          connect: locationCategoryIds.map(id => ({ id }))
        },
      }
    })
    revalidatePath('/items')
    revalidatePath('/estimates/new')
    return { success: true }
  } catch (error) {
    return { error: '물품 등록 중 오류가 발생했습니다. 이름이 중복되었을 수 있습니다.' }
  }
}

export async function deleteStandardItem(id: string) {
  try {
    await prisma.standardItem.delete({
      where: { id }
    })
    revalidatePath('/items')
    revalidatePath('/estimates/new')
    return { success: true }
  } catch (error) {
    return { error: '삭제 중 오류가 발생했습니다.' }
  }
}

export async function updateStandardItem(id: string, formData: FormData) {
  const name = formData.get('name') as string
  const spec = formData.get('spec') as string || ""
  const defaultCbm = parseFloat(formData.get('defaultCbm') as string)
  const defaultInnerCbm = parseFloat(formData.get('defaultInnerCbm') as string)
  const locationCategoryIds = formData.getAll('locationCategoryIds') as string[]

  if (!name) return { error: '물품명을 입력해주세요.' }

  try {
    await prisma.standardItem.update({
      where: { id },
      data: {
        name,
        spec,
        defaultCbm: isNaN(defaultCbm) ? 0 : defaultCbm,
        defaultInnerCbm: isNaN(defaultInnerCbm) ? 0 : defaultInnerCbm,
        locations: {
          set: [],
          connect: locationCategoryIds.map(locId => ({ id: locId }))
        },
      }
    })
    revalidatePath('/items')
    revalidatePath('/estimates/new')
    return { success: true }
  } catch (error) {
    return { error: '수정 중 오류가 발생했습니다. 이름이 중복되었을 수 있습니다.' }
  }
}

export async function getStandardItems() {
  return await prisma.standardItem.findMany({
    include: { locations: true },
    orderBy: [
      { name: 'asc' },
      { spec: 'asc' }
    ]
  })
}

export async function getLocationCategories() {
  return await prisma.locationCategory.findMany({
    orderBy: { order: 'asc' }
  })
}

export async function createLocationCategory(formData: FormData) {
  const name = formData.get('name') as string
  if (!name) return { error: '카테고리명을 입력해주세요.' }
  
  try {
    await prisma.locationCategory.create({
      data: { name }
    })
    revalidatePath('/items')
    return { success: true }
  } catch (error) {
    return { error: '카테고리 등록 중 오류가 발생했습니다.' }
  }
}

export async function deleteLocationCategory(id: string) {
  try {
    await prisma.locationCategory.delete({
      where: { id }
    })
    revalidatePath('/items')
    return { success: true }
  } catch (error) {
    return { error: '삭제 중 오류가 발생했습니다.' }
  }
}
