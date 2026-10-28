'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface CostStandardData {
  id: string
  maleLaborCost: number // 남성 작업원 기본 일당
  femaleLaborCost: number // 여성 작업원 기본 일당
  driverAllowance: number
  baseDistanceKm: number
  distanceStepKm: number
  distanceAllowancePerPerson: number
  mealCostPerPerson: number
  fuelCostPerKm5Ton: number
  fuelCostPerKm2_5Ton: number
  fuelCostPerKm1Ton: number
  tapeUnitPrice: number
  tapeRolls1Ton: number
  tapeRolls2_5Ton: number
  tapeRolls5Ton: number
  defaultMarginRate: number
  updatedAt?: Date
}

const DEFAULT_COST_STANDARDS: Omit<CostStandardData, 'id' | 'updatedAt'> = {
  maleLaborCost: 190000,
  femaleLaborCost: 170000,
  driverAllowance: 20000,
  baseDistanceKm: 40,
  distanceStepKm: 40,
  distanceAllowancePerPerson: 10000,
  mealCostPerPerson: 12000,
  fuelCostPerKm5Ton: 500,
  fuelCostPerKm2_5Ton: 350,
  fuelCostPerKm1Ton: 250,
  tapeUnitPrice: 2000,
  tapeRolls1Ton: 3,
  tapeRolls2_5Ton: 5,
  tapeRolls5Ton: 8,
  defaultMarginRate: 20.0
}

/**
 * 원가 기준정보 단일 레코드 조회 (없으면 기본값으로 자동 생성)
 */
export async function getCostStandards(): Promise<CostStandardData> {
  try {
    const costStandardModel = (prisma as any).costStandardMaster
    if (!costStandardModel || typeof costStandardModel.upsert !== 'function') {
      console.warn('prisma.costStandardMaster is not available on current client. Returning defaults.')
      return {
        id: 'default_cost_standard',
        ...DEFAULT_COST_STANDARDS
      }
    }

    const record = await costStandardModel.upsert({
      where: { id: 'default_cost_standard' },
      update: {},
      create: {
        id: 'default_cost_standard',
        ...DEFAULT_COST_STANDARDS
      }
    })
    return {
      id: record.id,
      maleLaborCost: record.maleLaborCost ?? 190000,
      femaleLaborCost: record.femaleLaborCost ?? 170000,
      driverAllowance: record.driverAllowance,
      baseDistanceKm: record.baseDistanceKm,
      distanceStepKm: record.distanceStepKm,
      distanceAllowancePerPerson: record.distanceAllowancePerPerson,
      mealCostPerPerson: record.mealCostPerPerson,
      fuelCostPerKm5Ton: record.fuelCostPerKm5Ton,
      fuelCostPerKm2_5Ton: record.fuelCostPerKm2_5Ton,
      fuelCostPerKm1Ton: record.fuelCostPerKm1Ton,
      tapeUnitPrice: record.tapeUnitPrice,
      tapeRolls1Ton: record.tapeRolls1Ton,
      tapeRolls2_5Ton: record.tapeRolls2_5Ton,
      tapeRolls5Ton: record.tapeRolls5Ton,
      defaultMarginRate: record.defaultMarginRate,
      updatedAt: record.updatedAt
    }
  } catch (error) {
    console.error('Failed to get cost standards:', error)
    return {
      id: 'default_cost_standard',
      ...DEFAULT_COST_STANDARDS
    }
  }
}

/**
 * 원가 기준정보 저장 및 갱신 (인건비 마스터 자동 동기화 포함)
 */
export async function updateCostStandards(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const costStandardModel = (prisma as any).costStandardMaster
    if (!costStandardModel || typeof costStandardModel.upsert !== 'function') {
      return { success: false, error: '데이터베이스 클라이언트가 초기화 중입니다. 잠시 후 다시 시도해주세요.' }
    }

    const maleLaborCost = parseInt(formData.get('maleLaborCost') as string, 10) || DEFAULT_COST_STANDARDS.maleLaborCost
    const femaleLaborCost = parseInt(formData.get('femaleLaborCost') as string, 10) || DEFAULT_COST_STANDARDS.femaleLaborCost
    const driverAllowance = parseInt(formData.get('driverAllowance') as string, 10) || DEFAULT_COST_STANDARDS.driverAllowance
    const baseDistanceKm = parseInt(formData.get('baseDistanceKm') as string, 10) || DEFAULT_COST_STANDARDS.baseDistanceKm
    const distanceStepKm = parseInt(formData.get('distanceStepKm') as string, 10) || DEFAULT_COST_STANDARDS.distanceStepKm
    const distanceAllowancePerPerson = parseInt(formData.get('distanceAllowancePerPerson') as string, 10) || DEFAULT_COST_STANDARDS.distanceAllowancePerPerson
    const mealCostPerPerson = parseInt(formData.get('mealCostPerPerson') as string, 10) || DEFAULT_COST_STANDARDS.mealCostPerPerson
    const fuelCostPerKm5Ton = parseInt(formData.get('fuelCostPerKm5Ton') as string, 10) || DEFAULT_COST_STANDARDS.fuelCostPerKm5Ton
    const fuelCostPerKm2_5Ton = parseInt(formData.get('fuelCostPerKm2_5Ton') as string, 10) || DEFAULT_COST_STANDARDS.fuelCostPerKm2_5Ton
    const fuelCostPerKm1Ton = parseInt(formData.get('fuelCostPerKm1Ton') as string, 10) || DEFAULT_COST_STANDARDS.fuelCostPerKm1Ton
    const tapeUnitPrice = parseInt(formData.get('tapeUnitPrice') as string, 10) || DEFAULT_COST_STANDARDS.tapeUnitPrice
    const tapeRolls1Ton = parseInt(formData.get('tapeRolls1Ton') as string, 10) || DEFAULT_COST_STANDARDS.tapeRolls1Ton
    const tapeRolls2_5Ton = parseInt(formData.get('tapeRolls2_5Ton') as string, 10) || DEFAULT_COST_STANDARDS.tapeRolls2_5Ton
    const tapeRolls5Ton = parseInt(formData.get('tapeRolls5Ton') as string, 10) || DEFAULT_COST_STANDARDS.tapeRolls5Ton
    const defaultMarginRate = parseFloat(formData.get('defaultMarginRate') as string) || DEFAULT_COST_STANDARDS.defaultMarginRate

    // 1. 원가 기준정보 마스터 저장
    await costStandardModel.upsert({
      where: { id: 'default_cost_standard' },
      update: {
        maleLaborCost,
        femaleLaborCost,
        driverAllowance,
        baseDistanceKm,
        distanceStepKm,
        distanceAllowancePerPerson,
        mealCostPerPerson,
        fuelCostPerKm5Ton,
        fuelCostPerKm2_5Ton,
        fuelCostPerKm1Ton,
        tapeUnitPrice,
        tapeRolls1Ton,
        tapeRolls2_5Ton,
        tapeRolls5Ton,
        defaultMarginRate
      },
      create: {
        id: 'default_cost_standard',
        maleLaborCost,
        femaleLaborCost,
        driverAllowance,
        baseDistanceKm,
        distanceStepKm,
        distanceAllowancePerPerson,
        mealCostPerPerson,
        fuelCostPerKm5Ton,
        fuelCostPerKm2_5Ton,
        fuelCostPerKm1Ton,
        tapeUnitPrice,
        tapeRolls1Ton,
        tapeRolls2_5Ton,
        tapeRolls5Ton,
        defaultMarginRate
      }
    })

    // 2. 기존 인건비 마스터(LaborMaster)와 자동 양방향 동기화
    try {
      await Promise.all([
        prisma.laborMaster.upsert({
          where: { name: '남성' },
          update: { defaultCost: maleLaborCost },
          create: { name: '남성', defaultCost: maleLaborCost }
        }),
        prisma.laborMaster.upsert({
          where: { name: '여성' },
          update: { defaultCost: femaleLaborCost },
          create: { name: '여성', defaultCost: femaleLaborCost }
        })
      ])
    } catch (syncErr) {
      console.warn('LaborMaster sync warning:', syncErr)
    }

    revalidatePath('/cost-standards')
    revalidatePath('/labors')
    revalidatePath('/estimates')
    return { success: true }
  } catch (error) {
    console.error('Failed to update cost standards:', error)
    return { success: false, error: '원가 기준정보 저장 중 오류가 발생했습니다.' }
  }
}
