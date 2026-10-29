'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface VehicleItem {
  id: string
  name: string
  defaultCost: number
  maxCbm: number
  vehicleNo: string
  tonnage: number
  vehicleType: string
  ownership: 'OWN' | 'STANDARD'
  teamLeader: string
  leaderPhone: string
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
  memo: string
  order: number
  createdAt: Date | string
}

export interface DispatchedVehicleRef {
  vehicleId: string
  name: string
  vehicleNo?: string
  tonnage?: number
  ownership?: 'OWN' | 'CHARTERED'
}

export interface EstimateDispatchInfo {
  assignedVehicles: DispatchedVehicleRef[]
  teamLeader: string
  leaderPhone: string
  supportWorkers?: string
  dispatchStatus: 'UNASSIGNED' | 'ASSIGNED' | 'CONFIRMED' | 'COMPLETED'
  dispatchMemo?: string
  updatedAt?: string
}

export interface DispatchScheduleItem {
  id: string
  customerName: string
  contact: string
  movingType: string
  movingDate: string // YYYY-MM-DD
  fromAddress: string
  toAddress: string
  totalAmount: number
  PlannedVehicles: { name: string; count: number }[]
  plannedLabors: { name: string; count: number }[]
  dispatch: EstimateDispatchInfo
}

let isSchemaEnsured = false

async function ensureVehicleColumns() {
  if (isSchemaEnsured) return
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "VehicleMaster"
        ADD COLUMN IF NOT EXISTS "vehicleNo" TEXT DEFAULT '',
        ADD COLUMN IF NOT EXISTS "tonnage" DOUBLE PRECISION DEFAULT 5.0,
        ADD COLUMN IF NOT EXISTS "vehicleType" TEXT DEFAULT '탑차',
        ADD COLUMN IF NOT EXISTS "ownership" TEXT DEFAULT 'OWN',
        ADD COLUMN IF NOT EXISTS "teamLeader" TEXT DEFAULT '',
        ADD COLUMN IF NOT EXISTS "leaderPhone" TEXT DEFAULT '',
        ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE',
        ADD COLUMN IF NOT EXISTS "memo" TEXT DEFAULT '',
        ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;
    `)
    isSchemaEnsured = true
  } catch (err) {
    console.warn('ensureVehicleColumns warning (fallback active):', err)
  }
}

function inferTonnageFromName(name: string, currentTonnage?: number): number {
  if (currentTonnage && currentTonnage > 0) return Number(currentTonnage)
  if (name.includes('10톤')) return 10
  if (name.includes('7.5톤')) return 7.5
  if (name.includes('6톤')) return 6
  if (name.includes('5톤')) return 5
  if (name.includes('2.5톤')) return 2.5
  if (name.includes('1톤')) return 1
  return 5
}

function inferDefaultCostFromTonnage(tonnage: number, explicitCost?: number): number {
  if (explicitCost && explicitCost > 0) return explicitCost
  if (tonnage >= 5) return 400000
  if (tonnage >= 2.5) return 250000
  return 150000
}

function inferDefaultCbmFromTonnage(tonnage: number, explicitCbm?: number): number {
  if (explicitCbm !== undefined && explicitCbm > 0) return explicitCbm
  if (tonnage >= 5) return 30
  if (tonnage >= 2.5) return 15
  return 6
}

export async function getVehicles(): Promise<VehicleItem[]> {
  await ensureVehicleColumns()
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        "id",
        "name",
        "defaultCost",
        "maxCbm",
        COALESCE("vehicleNo", '') AS "vehicleNo",
        COALESCE("tonnage", 0) AS "tonnage",
        COALESCE("vehicleType", '탑차') AS "vehicleType",
        COALESCE("ownership", 'OWN') AS "ownership",
        COALESCE("teamLeader", '') AS "teamLeader",
        COALESCE("leaderPhone", '') AS "leaderPhone",
        COALESCE("status", 'ACTIVE') AS "status",
        COALESCE("memo", '') AS "memo",
        COALESCE("order", 0) AS "order",
        "createdAt"
      FROM "VehicleMaster"
      ORDER BY COALESCE("order", 0) ASC, "createdAt" ASC
    `)

    return rows.map((r) => {
      const tonnage = inferTonnageFromName(r.name || '', Number(r.tonnage))
      return {
        id: r.id,
        name: r.name,
        defaultCost: inferDefaultCostFromTonnage(tonnage, Number(r.defaultCost)),
        maxCbm: Number(r.maxCbm) || 0,
        vehicleNo: r.vehicleNo || '',
        tonnage,
        vehicleType: r.vehicleType || '탑차',
        ownership: (r.ownership === 'STANDARD' ? 'STANDARD' : 'OWN') as 'OWN' | 'STANDARD',
        teamLeader: r.teamLeader || '',
        leaderPhone: r.leaderPhone || '',
        status: (['ACTIVE', 'MAINTENANCE', 'INACTIVE'].includes(r.status) ? r.status : 'ACTIVE') as
          | 'ACTIVE'
          | 'MAINTENANCE'
          | 'INACTIVE',
        memo: r.memo || '',
        order: Number(r.order) || 0,
        createdAt: r.createdAt
      }
    })
  } catch {
    const basic = await prisma.vehicleMaster.findMany({
      orderBy: { createdAt: 'asc' }
    })
    return basic.map((r, idx) => {
      const tonnage = inferTonnageFromName(r.name || '')
      return {
        id: r.id,
        name: r.name,
        defaultCost: inferDefaultCostFromTonnage(tonnage, r.defaultCost),
        maxCbm: r.maxCbm || 0,
        vehicleNo: '',
        tonnage,
        vehicleType: '탑차',
        ownership: 'OWN',
        teamLeader: '',
        leaderPhone: '',
        status: 'ACTIVE',
        memo: '',
        order: idx,
        createdAt: r.createdAt
      }
    })
  }
}

export async function createVehicle(data: FormData) {
  await ensureVehicleColumns()
  const name = (data.get('name') as string)?.trim()
  const vehicleNo = ((data.get('vehicleNo') as string) || '').trim()
  const rawTonnage = Number(data.get('tonnage'))
  const tonnage = rawTonnage > 0 ? rawTonnage : inferTonnageFromName(name || '')
  const vehicleType = ((data.get('vehicleType') as string) || '탑차').trim()
  const ownership = ((data.get('ownership') as string) || 'OWN').trim()
  const teamLeader = ((data.get('teamLeader') as string) || '').trim()
  const leaderPhone = ((data.get('leaderPhone') as string) || '').trim()
  const status = ((data.get('status') as string) || 'ACTIVE').trim()
  const memo = ((data.get('memo') as string) || '').trim()
  const rawMaxCbm = Number(data.get('maxCbm'))
  const maxCbm = rawMaxCbm > 0 ? rawMaxCbm : inferDefaultCbmFromTonnage(tonnage)
  const rawCost = Number(data.get('defaultCost'))
  const defaultCost = inferDefaultCostFromTonnage(tonnage, rawCost)
  const syncInventory = data.get('syncInventory') === 'true'

  if (!name) return { error: '호차/차량명을 입력하세요.' }

  try {
    const created = await prisma.vehicleMaster.create({
      data: { name, defaultCost, maxCbm }
    })

    await prisma.$executeRawUnsafe(
      `UPDATE "VehicleMaster"
       SET "vehicleNo" = $1,
           "tonnage" = $2,
           "vehicleType" = $3,
           "ownership" = $4,
           "teamLeader" = $5,
           "leaderPhone" = $6,
           "status" = $7,
           "memo" = $8
       WHERE "id" = $9`,
      vehicleNo,
      tonnage,
      vehicleType,
      ownership,
      teamLeader,
      leaderPhone,
      status,
      memo,
      created.id
    )

    // 자재 재고관리 차량 거점 자동 연동 옵션이 켜져 있으면 InventoryLocation에도 등록
    if (syncInventory && ownership === 'OWN') {
      const existingLoc = await prisma.inventoryLocation.findUnique({ where: { name } })
      if (!existingLoc) {
        await prisma.inventoryLocation.create({
          data: {
            name,
            type: 'VEHICLE',
            memo: `${vehicleNo ? `[${vehicleNo}] ` : ''}${teamLeader ? `담당: ${teamLeader}` : memo}`,
            order: 10
          }
        })
      }
    }

    revalidatePath('/vehicles')
    revalidatePath('/inventory')
    revalidatePath('/estimates/new')
    return { success: true }
  } catch (error) {
    return { error: '차량 등록 중 오류가 발생했습니다. 동일한 차량/호차명이 이미 존재할 수 있습니다.' }
  }
}

export async function updateVehicleFull(
  id: string,
  payload: {
    name: string
    vehicleNo?: string
    tonnage?: number
    vehicleType?: string
    ownership?: 'OWN' | 'STANDARD'
    teamLeader?: string
    leaderPhone?: string
    status?: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
    memo?: string
    maxCbm?: number
    defaultCost?: number
  }
) {
  await ensureVehicleColumns()
  const name = (payload.name || '').trim()
  if (!name) return { error: '호차/차량명을 입력하세요.' }

  const tonnage = payload.tonnage && payload.tonnage > 0 ? payload.tonnage : inferTonnageFromName(name)
  const maxCbm = payload.maxCbm !== undefined ? Number(payload.maxCbm) : inferDefaultCbmFromTonnage(tonnage)
  const defaultCost = inferDefaultCostFromTonnage(tonnage, payload.defaultCost)

  try {
    await prisma.vehicleMaster.update({
      where: { id },
      data: { name, defaultCost, maxCbm }
    })

    await prisma.$executeRawUnsafe(
      `UPDATE "VehicleMaster"
       SET "vehicleNo" = $1,
           "tonnage" = $2,
           "vehicleType" = $3,
           "ownership" = $4,
           "teamLeader" = $5,
           "leaderPhone" = $6,
           "status" = $7,
           "memo" = $8
       WHERE "id" = $9`,
      (payload.vehicleNo || '').trim(),
      tonnage,
      (payload.vehicleType || '탑차').trim(),
      payload.ownership || 'OWN',
      (payload.teamLeader || '').trim(),
      (payload.leaderPhone || '').trim(),
      payload.status || 'ACTIVE',
      (payload.memo || '').trim(),
      id
    )

    revalidatePath('/vehicles')
    revalidatePath('/estimates/new')
    return { success: true }
  } catch (error) {
    return { error: '차량 정보 수정 중 오류가 발생했습니다. 이름이 중복되었을 수 있습니다.' }
  }
}

export async function updateVehicle(id: string, name: string, defaultCost: number, maxCbm: number = 0) {
  return updateVehicleFull(id, { name, defaultCost, maxCbm })
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

/**
 * 특정 연-월(YYYY-MM)의 이삿날 배차 및 팀장 배정 현황 조회
 */
export async function getDispatchSchedule(yearMonth?: string): Promise<DispatchScheduleItem[]> {
  try {
    let startDate: Date
    let endDate: Date

    if (yearMonth && /^\d{4}-\d{2}$/.test(yearMonth)) {
      const [y, m] = yearMonth.split('-').map(Number)
      startDate = new Date(y, m - 1, 1, 0, 0, 0)
      endDate = new Date(y, m, 0, 23, 59, 59)
    } else {
      const now = new Date()
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    }

    const estimates = await prisma.estimate.findMany({
      where: {
        movingDate: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: [{ movingDate: 'asc' }, { createdAt: 'asc' }]
    })

    return estimates.map((est) => {
      let envObj: any = {}
      try {
        if (est.environment) envObj = JSON.parse(est.environment)
      } catch {
        envObj = {}
      }

      const rawDispatch = envObj?.dispatch || {}
      const assignedVehicles: DispatchedVehicleRef[] = Array.isArray(rawDispatch.assignedVehicles)
        ? rawDispatch.assignedVehicles
        : []
      const teamLeader = rawDispatch.teamLeader || ''
      const leaderPhone = rawDispatch.leaderPhone || ''
      const hasAssignment = assignedVehicles.length > 0 || Boolean(teamLeader.trim())

      const dispatch: EstimateDispatchInfo = {
        assignedVehicles,
        teamLeader,
        leaderPhone,
        supportWorkers: rawDispatch.supportWorkers || '',
        dispatchStatus:
          rawDispatch.dispatchStatus || (hasAssignment ? 'ASSIGNED' : 'UNASSIGNED'),
        dispatchMemo: rawDispatch.dispatchMemo || '',
        updatedAt: rawDispatch.updatedAt || ''
      }

      const mDate = est.movingDate ? new Date(est.movingDate) : new Date()
      const yyyy = mDate.getFullYear()
      const mm = String(mDate.getMonth() + 1).padStart(2, '0')
      const dd = String(mDate.getDate()).padStart(2, '0')

      return {
        id: est.id,
        customerName: est.customerName,
        contact: est.contact,
        movingType: est.movingType,
        movingDate: `${yyyy}-${mm}-${dd}`,
        fromAddress: est.fromAddress || '',
        toAddress: est.toAddress || '',
        totalAmount: est.totalAmount || 0,
        PlannedVehicles: Array.isArray(envObj.vehicles) ? envObj.vehicles : [],
        plannedLabors: Array.isArray(envObj.labors) ? envObj.labors : [],
        dispatch
      }
    })
  } catch (err) {
    console.error('getDispatchSchedule error:', err)
    return []
  }
}

/**
 * 특정 이사 견적 건의 배차 호차 및 담당 팀장 정보 저장
 */
export async function updateEstimateDispatch(estimateId: string, dispatchData: EstimateDispatchInfo) {
  try {
    const est = await prisma.estimate.findUnique({ where: { id: estimateId } })
    if (!est) return { error: '해당 견적서를 찾을 수 없습니다.' }

    let envObj: any = {}
    try {
      if (est.environment) envObj = JSON.parse(est.environment)
    } catch {
      envObj = {}
    }

    const hasAssignment =
      (Array.isArray(dispatchData.assignedVehicles) && dispatchData.assignedVehicles.length > 0) ||
      Boolean(dispatchData.teamLeader?.trim())

    envObj.dispatch = {
      ...dispatchData,
      dispatchStatus:
        dispatchData.dispatchStatus === 'UNASSIGNED' && hasAssignment
          ? 'ASSIGNED'
          : !hasAssignment
            ? 'UNASSIGNED'
            : dispatchData.dispatchStatus,
      updatedAt: new Date().toISOString()
    }

    await prisma.estimate.update({
      where: { id: estimateId },
      data: {
        environment: JSON.stringify(envObj)
      }
    })

    revalidatePath('/vehicles')
    revalidatePath('/calendar')
    revalidatePath('/estimates')
    revalidatePath(`/estimates/${estimateId}`)
    return { success: true }
  } catch (err) {
    console.error('updateEstimateDispatch error:', err)
    return { error: '배차 정보 저장 중 오류가 발생했습니다.' }
  }
}
