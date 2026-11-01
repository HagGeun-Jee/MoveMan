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

let isStandLampSeeded = false

export async function ensureStandLampItems() {
  if (isStandLampSeeded) return
  try {
    const existing = await prisma.standardItem.count({
      where: { name: '스탠드등' }
    })
    if (existing >= 5) {
      isStandLampSeeded = true
      return
    }

    const allLocations = await prisma.locationCategory.findMany()
    const targetLocNames = ['거실', '안방', '침실', '작은방', '서재']
    const matchedLocs = allLocations.filter(loc =>
      targetLocNames.some(t => loc.name.includes(t))
    )

    const standLamps = [
      { name: '스탠드등', spec: '단스탠드(소형/협탁용)', defaultCbm: 0.1, defaultInnerCbm: 0 },
      { name: '스탠드등', spec: '책상스탠드(자바라/LED)', defaultCbm: 0.1, defaultInnerCbm: 0 },
      { name: '스탠드등', spec: '장스탠드(일반 일자형)', defaultCbm: 0.3, defaultInnerCbm: 0 },
      { name: '스탠드등', spec: '장스탠드(선반형/다구형)', defaultCbm: 0.4, defaultInnerCbm: 0 },
      { name: '스탠드등', spec: '장스탠드(아치형/대형)', defaultCbm: 0.5, defaultInnerCbm: 0 },
    ]

    for (const lamp of standLamps) {
      await prisma.standardItem.upsert({
        where: {
          name_spec: {
            name: lamp.name,
            spec: lamp.spec,
          }
        },
        update: {
          defaultCbm: lamp.defaultCbm,
          defaultInnerCbm: lamp.defaultInnerCbm,
        },
        create: {
          name: lamp.name,
          spec: lamp.spec,
          defaultCbm: lamp.defaultCbm,
          defaultInnerCbm: lamp.defaultInnerCbm,
          locations: {
            connect: matchedLocs.map(l => ({ id: l.id }))
          }
        }
      })
    }
    isStandLampSeeded = true
  } catch (err) {
    console.warn('ensureStandLampItems warning:', err)
  }
}

export async function getStandardItems() {
  await ensureStandLampItems()
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
