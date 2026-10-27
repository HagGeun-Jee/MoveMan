'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface CostStandardData {
  id: string
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
    const record = await prisma.costStandardMaster.upsert({
      where: { id: 'default_cost_standard' },
      update: {},
      create: {
        id: 'default_cost_standard',
        ...DEFAULT_COST_STANDARDS
      }
    })
    return {
      id: record.id,
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
 * 원가 기준정보 저장 및 갱신
 */
export async function updateCostStandards(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
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

    await prisma.costStandardMaster.upsert({
      where: { id: 'default_cost_standard' },
      update: {
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

    revalidatePath('/cost-standards')
    revalidatePath('/estimates')
    return { success: true }
  } catch (error) {
    console.error('Failed to update cost standards:', error)
    return { success: false, error: '원가 기준정보 저장 중 오류가 발생했습니다.' }
  }
}
