'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type VehicleLogCategory = 'FUEL' | 'MAINTENANCE' | 'TOLL_PARKING' | 'INSURANCE_TAX'

export interface VehicleLogItem {
  id: string
  vehicleId: string
  vehicleName: string
  vehicleNo: string
  logDate: string // YYYY-MM-DD
  category: VehicleLogCategory
  subType: string
  totalAmount: number
  subsidyAmount: number
  netAmount: number
  fuelLiters: number
  unitPrice: number
  mileage: number
  nextDueMileage: number
  nextDueDate: string
  shopName: string
  driverName: string
  paymentMethod: string
  memo: string
  createdAt: string
}

export interface CreateVehicleLogInput {
  vehicleId: string
  vehicleName?: string
  vehicleNo?: string
  logDate: string
  category: VehicleLogCategory
  subType: string
  totalAmount: number
  subsidyAmount?: number
  netAmount?: number
  fuelLiters?: number
  unitPrice?: number
  mileage?: number
  nextDueMileage?: number
  nextDueDate?: string
  shopName?: string
  driverName?: string
  paymentMethod?: string
  memo?: string
}

let isLogSchemaEnsured = false

export async function ensureVehicleLogSchema() {
  if (isLogSchemaEnsured) return
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "VehicleMaster"
        ADD COLUMN IF NOT EXISTS "currentMileage" INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "nextEngineOilKm" INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "inspectionExpiry" TEXT DEFAULT '',
        ADD COLUMN IF NOT EXISTS "insuranceExpiry" TEXT DEFAULT '',
        ADD COLUMN IF NOT EXISTS "subsidyRatePerLiter" DOUBLE PRECISION DEFAULT 205.0,
        ADD COLUMN IF NOT EXISTS "monthlySubsidyLimitLiters" INTEGER DEFAULT 2261;
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VehicleLog" (
        "id" TEXT NOT NULL,
        "vehicleId" TEXT NOT NULL,
        "vehicleName" TEXT DEFAULT '',
        "vehicleNo" TEXT DEFAULT '',
        "logDate" TEXT NOT NULL,
        "category" TEXT DEFAULT 'FUEL',
        "subType" TEXT DEFAULT '',
        "totalAmount" INTEGER DEFAULT 0,
        "subsidyAmount" INTEGER DEFAULT 0,
        "netAmount" INTEGER DEFAULT 0,
        "fuelLiters" DOUBLE PRECISION DEFAULT 0,
        "unitPrice" DOUBLE PRECISION DEFAULT 0,
        "mileage" INTEGER DEFAULT 0,
        "nextDueMileage" INTEGER DEFAULT 0,
        "nextDueDate" TEXT DEFAULT '',
        "shopName" TEXT DEFAULT '',
        "driverName" TEXT DEFAULT '',
        "paymentMethod" TEXT DEFAULT '화물복지카드',
        "memo" TEXT DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "VehicleLog_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "VehicleLog_vehicleId_logDate_idx"
      ON "VehicleLog"("vehicleId", "logDate" DESC);
    `)

    isLogSchemaEnsured = true
  } catch (err) {
    console.warn('ensureVehicleLogSchema warning:', err)
  }
}

export async function getVehicleLogs(yearMonth?: string, vehicleId?: string): Promise<VehicleLogItem[]> {
  await ensureVehicleLogSchema()
  try {
    const conditions: string[] = []
    const params: any[] = []

    if (yearMonth && /^\d{4}-\d{2}$/.test(yearMonth)) {
      params.push(`${yearMonth}-%`)
      conditions.push(`"logDate" LIKE $${params.length}`)
    }

    if (vehicleId && vehicleId !== 'ALL') {
      params.push(vehicleId)
      conditions.push(`"vehicleId" = $${params.length}`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT
        "id",
        "vehicleId",
        COALESCE("vehicleName", '') AS "vehicleName",
        COALESCE("vehicleNo", '') AS "vehicleNo",
        "logDate",
        COALESCE("category", 'FUEL') AS "category",
        COALESCE("subType", '') AS "subType",
        COALESCE("totalAmount", 0) AS "totalAmount",
        COALESCE("subsidyAmount", 0) AS "subsidyAmount",
        COALESCE("netAmount", 0) AS "netAmount",
        COALESCE("fuelLiters", 0) AS "fuelLiters",
        COALESCE("unitPrice", 0) AS "unitPrice",
        COALESCE("mileage", 0) AS "mileage",
        COALESCE("nextDueMileage", 0) AS "nextDueMileage",
        COALESCE("nextDueDate", '') AS "nextDueDate",
        COALESCE("shopName", '') AS "shopName",
        COALESCE("driverName", '') AS "driverName",
        COALESCE("paymentMethod", '화물복지카드') AS "paymentMethod",
        COALESCE("memo", '') AS "memo",
        "createdAt"
      FROM "VehicleLog"
      ${whereClause}
      ORDER BY "logDate" DESC, "mileage" DESC, "createdAt" DESC`,
      ...params
    )

    return rows.map((r) => ({
      id: r.id,
      vehicleId: r.vehicleId,
      vehicleName: r.vehicleName || '',
      vehicleNo: r.vehicleNo || '',
      logDate: r.logDate || '',
      category: (['FUEL', 'MAINTENANCE', 'TOLL_PARKING', 'INSURANCE_TAX'].includes(r.category)
        ? r.category
        : 'FUEL') as VehicleLogCategory,
      subType: r.subType || '',
      totalAmount: Number(r.totalAmount) || 0,
      subsidyAmount: Number(r.subsidyAmount) || 0,
      netAmount: Number(r.netAmount) || 0,
      fuelLiters: Number(r.fuelLiters) || 0,
      unitPrice: Number(r.unitPrice) || 0,
      mileage: Number(r.mileage) || 0,
      nextDueMileage: Number(r.nextDueMileage) || 0,
      nextDueDate: r.nextDueDate || '',
      shopName: r.shopName || '',
      driverName: r.driverName || '',
      paymentMethod: r.paymentMethod || '화물복지카드',
      memo: r.memo || '',
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : ''
    }))
  } catch (err) {
    console.error('getVehicleLogs error:', err)
    return []
  }
}

async function syncVehicleMasterOnLogSave(payload: CreateVehicleLogInput) {
  const { vehicleId, category, subType, mileage, nextDueMileage, nextDueDate } = payload
  if (!vehicleId) return

  try {
    // 1. 주행거리 입력 시 현재 주행거리(currentMileage)보다 크면 자동 갱신
    if (mileage && mileage > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE "VehicleMaster"
         SET "currentMileage" = GREATEST(COALESCE("currentMileage", 0), $1)
         WHERE "id" = $2`,
        Math.round(mileage),
        vehicleId
      )
    }

    // 2. 엔진오일 교환이고 다음 교체 예정 거리가 입력된 경우 자동 갱신
    if (category === 'MAINTENANCE' && subType.includes('엔진오일') && nextDueMileage && nextDueMileage > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE "VehicleMaster"
         SET "nextEngineOilKm" = $1
         WHERE "id" = $2`,
        Math.round(nextDueMileage),
        vehicleId
      )
    }

    // 3. 정기검사 또는 보험 갱신이고 다음 만기일이 입력된 경우 자동 갱신
    if (category === 'INSURANCE_TAX' && nextDueDate) {
      if (subType.includes('검사')) {
        await prisma.$executeRawUnsafe(
          `UPDATE "VehicleMaster" SET "inspectionExpiry" = $1 WHERE "id" = $2`,
          nextDueDate.trim(),
          vehicleId
        )
      } else if (subType.includes('보험')) {
        await prisma.$executeRawUnsafe(
          `UPDATE "VehicleMaster" SET "insuranceExpiry" = $1 WHERE "id" = $2`,
          nextDueDate.trim(),
          vehicleId
        )
      }
    }
  } catch (err) {
    console.warn('syncVehicleMasterOnLogSave warning:', err)
  }
}

export async function createVehicleLog(payload: CreateVehicleLogInput) {
  await ensureVehicleLogSchema()
  if (!payload.vehicleId) {
    return { error: '대상 차량을 선택해주세요.' }
  }
  if (!payload.logDate) {
    return { error: '일자를 입력해주세요.' }
  }

  const id = `VLOG_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const totalAmount = Math.max(0, Math.round(Number(payload.totalAmount) || 0))
  const subsidyAmount = Math.max(0, Math.round(Number(payload.subsidyAmount) || 0))
  const netAmount =
    payload.netAmount !== undefined
      ? Math.max(0, Math.round(Number(payload.netAmount)))
      : Math.max(0, totalAmount - subsidyAmount)

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "VehicleLog" (
        "id", "vehicleId", "vehicleName", "vehicleNo", "logDate",
        "category", "subType", "totalAmount", "subsidyAmount", "netAmount",
        "fuelLiters", "unitPrice", "mileage", "nextDueMileage", "nextDueDate",
        "shopName", "driverName", "paymentMethod", "memo", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )`,
      id,
      payload.vehicleId,
      (payload.vehicleName || '').trim(),
      (payload.vehicleNo || '').trim(),
      payload.logDate.trim(),
      payload.category || 'FUEL',
      (payload.subType || '').trim(),
      totalAmount,
      subsidyAmount,
      netAmount,
      Number(payload.fuelLiters) || 0,
      Number(payload.unitPrice) || 0,
      Math.max(0, Math.round(Number(payload.mileage) || 0)),
      Math.max(0, Math.round(Number(payload.nextDueMileage) || 0)),
      (payload.nextDueDate || '').trim(),
      (payload.shopName || '').trim(),
      (payload.driverName || '').trim(),
      (payload.paymentMethod || '화물복지카드').trim(),
      (payload.memo || '').trim()
    )

    await syncVehicleMasterOnLogSave(payload)
    revalidatePath('/vehicles')
    revalidatePath('/calendar')
    return { success: true, id }
  } catch (err) {
    console.error('createVehicleLog error:', err)
    return { error: '차계부 내역 저장 중 오류가 발생했습니다.' }
  }
}

export async function updateVehicleLog(id: string, payload: CreateVehicleLogInput) {
  await ensureVehicleLogSchema()
  if (!id) return { error: '수정할 내역 ID가 없습니다.' }

  const totalAmount = Math.max(0, Math.round(Number(payload.totalAmount) || 0))
  const subsidyAmount = Math.max(0, Math.round(Number(payload.subsidyAmount) || 0))
  const netAmount =
    payload.netAmount !== undefined
      ? Math.max(0, Math.round(Number(payload.netAmount)))
      : Math.max(0, totalAmount - subsidyAmount)

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "VehicleLog"
       SET "vehicleId" = $1,
           "vehicleName" = $2,
           "vehicleNo" = $3,
           "logDate" = $4,
           "category" = $5,
           "subType" = $6,
           "totalAmount" = $7,
           "subsidyAmount" = $8,
           "netAmount" = $9,
           "fuelLiters" = $10,
           "unitPrice" = $11,
           "mileage" = $12,
           "nextDueMileage" = $13,
           "nextDueDate" = $14,
           "shopName" = $15,
           "driverName" = $16,
           "paymentMethod" = $17,
           "memo" = $18,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $19`,
      payload.vehicleId,
      (payload.vehicleName || '').trim(),
      (payload.vehicleNo || '').trim(),
      payload.logDate.trim(),
      payload.category || 'FUEL',
      (payload.subType || '').trim(),
      totalAmount,
      subsidyAmount,
      netAmount,
      Number(payload.fuelLiters) || 0,
      Number(payload.unitPrice) || 0,
      Math.max(0, Math.round(Number(payload.mileage) || 0)),
      Math.max(0, Math.round(Number(payload.nextDueMileage) || 0)),
      (payload.nextDueDate || '').trim(),
      (payload.shopName || '').trim(),
      (payload.driverName || '').trim(),
      (payload.paymentMethod || '화물복지카드').trim(),
      (payload.memo || '').trim(),
      id
    )

    await syncVehicleMasterOnLogSave(payload)
    revalidatePath('/vehicles')
    revalidatePath('/calendar')
    return { success: true }
  } catch (err) {
    console.error('updateVehicleLog error:', err)
    return { error: '차계부 내역 수정 중 오류가 발생했습니다.' }
  }
}

export async function deleteVehicleLog(id: string) {
  await ensureVehicleLogSchema()
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "VehicleLog" WHERE "id" = $1`, id)
    revalidatePath('/vehicles')
    revalidatePath('/calendar')
    return { success: true }
  } catch (err) {
    console.error('deleteVehicleLog error:', err)
    return { error: '차계부 내역 삭제 중 오류가 발생했습니다.' }
  }
}

export async function updateVehicleLogSettings(
  vehicleId: string,
  settings: {
    currentMileage: number
    nextEngineOilKm: number
    inspectionExpiry: string
    insuranceExpiry: string
    subsidyRatePerLiter: number
    monthlySubsidyLimitLiters: number
  }
) {
  await ensureVehicleLogSchema()
  if (!vehicleId) return { error: '차량 ID가 없습니다.' }
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "VehicleMaster"
       SET "currentMileage" = $1,
           "nextEngineOilKm" = $2,
           "inspectionExpiry" = $3,
           "insuranceExpiry" = $4,
           "subsidyRatePerLiter" = $5,
           "monthlySubsidyLimitLiters" = $6
       WHERE "id" = $7`,
      Math.max(0, Math.round(Number(settings.currentMileage) || 0)),
      Math.max(0, Math.round(Number(settings.nextEngineOilKm) || 0)),
      (settings.inspectionExpiry || '').trim(),
      (settings.insuranceExpiry || '').trim(),
      Number(settings.subsidyRatePerLiter) >= 0 ? Number(settings.subsidyRatePerLiter) : 205.0,
      Math.max(0, Math.round(Number(settings.monthlySubsidyLimitLiters) || 2261)),
      vehicleId
    )
    revalidatePath('/vehicles')
    revalidatePath('/calendar')
    return { success: true }
  } catch (err) {
    console.error('updateVehicleLogSettings error:', err)
    return { error: '차량 관리 기준 저장 중 오류가 발생했습니다.' }
  }
}

export interface VehicleCalendarEvent {
  id: string
  date: string // YYYY-MM-DD
  vehicleId: string
  vehicleShortName: string
  type: 'EXPIRY_INSPECTION' | 'EXPIRY_INSURANCE' | 'DUE_DATE' | 'MAINTENANCE_LOG'
  label: string
  tooltip: string
}

/**
 * 일정 캘린더(/calendar)에 표시할 해당 월(YYYY-MM)의 차량 검사/보험 만기일, 점검 예정일, 정비/검사 실행 내역 조회
 */
export async function getVehicleCalendarEvents(yearMonth: string): Promise<VehicleCalendarEvent[]> {
  await ensureVehicleLogSchema()
  const events: VehicleCalendarEvent[] = []
  const seenKeys = new Set<string>()

  const getShortVehicleName = (name: string) => {
    const trimmed = (name || '').trim()
    if (!trimmed) return '차량'
    return trimmed.split(' ')[0] // 예: "1호차 (5톤 탑차)" -> "1호차"
  }

  try {
    // 1. VehicleMaster의 정기검사 만기일(inspectionExpiry) 및 보험 만기일(insuranceExpiry)
    const vehicles = await prisma.$queryRawUnsafe<any[]>(
      `SELECT
        "id",
        "name",
        COALESCE("ownership", 'OWN') AS "ownership",
        COALESCE("inspectionExpiry", '') AS "inspectionExpiry",
        COALESCE("insuranceExpiry", '') AS "insuranceExpiry"
      FROM "VehicleMaster"
      WHERE COALESCE("ownership", 'OWN') = 'OWN'`
    )

    for (const v of vehicles) {
      const vShort = getShortVehicleName(v.name)
      if (v.inspectionExpiry && v.inspectionExpiry.startsWith(yearMonth)) {
        const key = `${v.id}_${v.inspectionExpiry}_INSP`
        seenKeys.add(key)
        events.push({
          id: `insp-${v.id}-${v.inspectionExpiry}`,
          date: v.inspectionExpiry,
          vehicleId: v.id,
          vehicleShortName: vShort,
          type: 'EXPIRY_INSPECTION',
          label: `📋 ${vShort} 정기검사만기`,
          tooltip: `[차량 정기검사 만기일] ${v.name} (${v.inspectionExpiry})`
        })
      }

      if (v.insuranceExpiry && v.insuranceExpiry.startsWith(yearMonth)) {
        const key = `${v.id}_${v.insuranceExpiry}_INS`
        seenKeys.add(key)
        events.push({
          id: `ins-${v.id}-${v.insuranceExpiry}`,
          date: v.insuranceExpiry,
          vehicleId: v.id,
          vehicleShortName: vShort,
          type: 'EXPIRY_INSURANCE',
          label: `🛡️ ${vShort} 보험만기`,
          tooltip: `[자동차/적재물 보험 만기일] ${v.name} (${v.insuranceExpiry})`
        })
      }
    }

    // 2. VehicleLog의 다음 예정일(nextDueDate) 및 당월 정비/검사 실행 내역(logDate)
    const logs = await prisma.$queryRawUnsafe<any[]>(
      `SELECT
        "id",
        "vehicleId",
        COALESCE("vehicleName", '') AS "vehicleName",
        "logDate",
        COALESCE("category", 'FUEL') AS "category",
        COALESCE("subType", '') AS "subType",
        COALESCE("netAmount", 0) AS "netAmount",
        COALESCE("nextDueDate", '') AS "nextDueDate",
        COALESCE("shopName", '') AS "shopName"
      FROM "VehicleLog"
      WHERE "logDate" LIKE $1 OR "nextDueDate" LIKE $1
      ORDER BY "logDate" ASC`,
      `${yearMonth}-%`
    )

    for (const l of logs) {
      const vShort = getShortVehicleName(l.vehicleName)

      // (A) nextDueDate가 해당 월에 속하는 경우
      if (l.nextDueDate && l.nextDueDate.startsWith(yearMonth)) {
        const isInsp = l.subType.includes('검사')
        const isIns = l.subType.includes('보험')
        const dupKey = isInsp
          ? `${l.vehicleId}_${l.nextDueDate}_INSP`
          : isIns
            ? `${l.vehicleId}_${l.nextDueDate}_INS`
            : `${l.vehicleId}_${l.nextDueDate}_${l.subType}`

        if (!seenKeys.has(dupKey)) {
          seenKeys.add(dupKey)
          events.push({
            id: `due-${l.id}`,
            date: l.nextDueDate,
            vehicleId: l.vehicleId,
            vehicleShortName: vShort,
            type: isInsp ? 'EXPIRY_INSPECTION' : isIns ? 'EXPIRY_INSURANCE' : 'DUE_DATE',
            label: `🔔 ${vShort} ${l.subType} 예정`,
            tooltip: `[차량 예정/만기일] ${l.vehicleName} - ${l.subType} (${l.nextDueDate})`
          })
        }
      }

      // (B) 정비/소모품(MAINTENANCE) 또는 검사/보험(INSURANCE_TAX) 실행일인 경우
      if (
        l.logDate &&
        l.logDate.startsWith(yearMonth) &&
        (l.category === 'MAINTENANCE' || l.category === 'INSURANCE_TAX')
      ) {
        events.push({
          id: `log-${l.id}`,
          date: l.logDate,
          vehicleId: l.vehicleId,
          vehicleShortName: vShort,
          type: 'MAINTENANCE_LOG',
          label: `🔧 ${vShort} ${l.subType}`,
          tooltip: `[차계부 기록] ${l.vehicleName} - ${l.subType} (${Number(l.netAmount || 0).toLocaleString()}원)${
            l.shopName ? ` @${l.shopName}` : ''
          }`
        })
      }
    }

    return events
  } catch (err) {
    console.error('getVehicleCalendarEvents error:', err)
    return []
  }
}

