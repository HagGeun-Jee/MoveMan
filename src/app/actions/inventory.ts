'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/session'

// 기본 자재 시딩 데이터
const DEFAULT_MATERIALS = [
  { code: 'MAT-BOX-L', name: '단프라 박스 (대)', category: 'REUSABLE', unit: '개', safetyStock: 100, unitPrice: 8000, memo: '이사 전용 대형 포장박스', order: 1 },
  { code: 'MAT-BOX-M', name: '단프라 박스 (중)', category: 'REUSABLE', unit: '개', safetyStock: 80, unitPrice: 6500, memo: '주방 및 소품용 중형박스', order: 2 },
  { code: 'MAT-BSK-01', name: '이사 바구니 (청색/대)', category: 'REUSABLE', unit: '개', safetyStock: 150, unitPrice: 7000, memo: '일반 짐 운반용 플라스틱 바구니', order: 3 },
  { code: 'MAT-HNG-01', name: '옷걸이 박스 (행거용)', category: 'REUSABLE', unit: '개', safetyStock: 30, unitPrice: 15000, memo: '정장 및 코트 거치 박스', order: 4 },
  { code: 'MAT-CVR-BED', name: '침대 매트리스 커버 (Q/K)', category: 'REUSABLE', unit: '개', safetyStock: 10, unitPrice: 25000, memo: '방수 매트리스 보호 커버', order: 5 },
  { code: 'MAT-CVR-FURN', name: '가구/가전 보호커버 (세트)', category: 'REUSABLE', unit: '개', safetyStock: 10, unitPrice: 45000, memo: '소파/냉장고/세탁기 보호용 누비커버', order: 6 },
  { code: 'MAT-FLR-01', name: '바닥보호재 (플로링보드)', category: 'REUSABLE', unit: '장', safetyStock: 40, unitPrice: 5000, memo: '현관/거실 바닥 스크래치 방지 패드', order: 7 },
  { code: 'MAT-CART-01', name: '이사 카트/구루마 (4바퀴)', category: 'TOOL', unit: '대', safetyStock: 6, unitPrice: 35000, memo: '무거운 짐 운반용 대차', order: 8 },
  { code: 'MAT-TAPE-01', name: 'OPP 박스테이프', category: 'CONSUMABLE', unit: '롤', safetyStock: 50, unitPrice: 1500, memo: '점착 테이프', order: 9 },
  { code: 'MAT-AIR-01', name: '에어캡 (뽁뽁이 롤)', category: 'CONSUMABLE', unit: '롤', safetyStock: 10, unitPrice: 18000, memo: '완충 포장용 에어캡', order: 10 },
  { code: 'MAT-WRAP-01', name: '스트레치 필름 (랩)', category: 'CONSUMABLE', unit: '롤', safetyStock: 20, unitPrice: 9000, memo: '가구 방진 및 고정용 공업용 랩', order: 11 },
  { code: 'MAT-SHOE-01', name: '작업용 덧신', category: 'CONSUMABLE', unit: '켤레', safetyStock: 100, unitPrice: 300, memo: '고객 댁내 위생용 덧신', order: 12 },
]

// 기본 보관 위치 시딩 데이터
const DEFAULT_LOCATIONS = [
  { name: '본사 메인창고', type: 'WAREHOUSE', memo: '본사 자재 집중 보관 창고', order: 1 },
  { name: '1호차 (5톤탑차)', type: 'VEHICLE', memo: '메인 5톤 포장이사 차량', order: 2 },
  { name: '2호차 (1톤용달)', type: 'VEHICLE', memo: '1톤 원룸 및 소형이사 차량', order: 3 },
  { name: '사다리차 1호', type: 'VEHICLE', memo: '사다리차 현장 공구 및 자재 적재', order: 4 },
]

// 현재 로그인 관리자 이름 가져오기
async function getAdminName(): Promise<string> {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get('session')?.value
    const session = await decrypt(cookie)
    return (session?.name as string) || '관리자'
  } catch {
    return '관리자'
  }
}

/**
 * 초기 기본 자재 및 위치 시딩
 */
export async function seedInitialInventory() {
  const locCount = await prisma.inventoryLocation.count()
  if (locCount === 0) {
    for (const loc of DEFAULT_LOCATIONS) {
      await prisma.inventoryLocation.create({ data: loc })
    }
  }

  const matCount = await prisma.materialItem.count()
  if (matCount === 0) {
    for (const mat of DEFAULT_MATERIALS) {
      await prisma.materialItem.create({ data: mat })
    }
  }

  // 위치와 자재가 생성된 후 기본 재고 초기 수량 부여 (창고 위주)
  const stockCount = await prisma.materialStock.count()
  if (stockCount === 0) {
    const mainWh = await prisma.inventoryLocation.findFirst({ where: { type: 'WAREHOUSE' } })
    const vehicles = await prisma.inventoryLocation.findMany({ where: { type: 'VEHICLE' } })
    const allMaterials = await prisma.materialItem.findMany()

    if (mainWh) {
      for (const m of allMaterials) {
        // 창고 기본 재고
        const whQty = m.category === 'REUSABLE' ? 80 : (m.category === 'CONSUMABLE' ? 50 : 4)
        await prisma.materialStock.create({
          data: {
            locationId: mainWh.id,
            materialId: m.id,
            quantity: whQty
          }
        })

        // 차량별 기본 재고 분배
        for (const v of vehicles) {
          const vQty = m.category === 'REUSABLE' ? (v.name.includes('5톤') ? 20 : 5) : 3
          await prisma.materialStock.create({
            data: {
              locationId: v.id,
              materialId: m.id,
              quantity: vQty
            }
          })
        }
      }
    }
  }
}

/**
 * 전체 재고 종합 현황 조회
 */
export async function getInventoryOverview() {
  try {
    await seedInitialInventory()

    const materials = await prisma.materialItem.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }]
    })

    const locations = await prisma.inventoryLocation.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }]
    })

    const stocks = await prisma.materialStock.findMany()

    // 맵 구조 생성: stockMap[materialId][locationId] = quantity
    const stockMap: Record<string, Record<string, number>> = {}
    for (const s of stocks) {
      if (!stockMap[s.materialId]) stockMap[s.materialId] = {}
      stockMap[s.materialId][s.locationId] = s.quantity
    }

    // 자재별 종합 데이터 생성
    const items = materials.map(m => {
      const locStocks: Record<string, number> = {}
      let totalQty = 0
      let warehouseQty = 0
      let vehicleQty = 0

      for (const loc of locations) {
        const qty = stockMap[m.id]?.[loc.id] || 0
        locStocks[loc.id] = qty
        totalQty += qty
        if (loc.type === 'WAREHOUSE') {
          warehouseQty += qty
        } else {
          vehicleQty += qty
        }
      }

      return {
        ...m,
        stocks: locStocks,
        totalQty,
        warehouseQty,
        vehicleQty,
        isLowStock: m.safetyStock > 0 && totalQty < m.safetyStock
      }
    })

    return {
      success: true,
      materials: items,
      locations
    }
  } catch (error) {
    console.error('getInventoryOverview error:', error)
    return { success: false, error: '재고 현황 조회 실패', materials: [], locations: [] }
  }
}

/**
 * 재고 이동 (이고: 창고↔차량, 차량↔차량)
 */
export async function transferStock(payload: {
  sourceLocId: string
  targetLocId: string
  items: { materialId: string; quantity: number }[]
  memo?: string
}) {
  try {
    const { sourceLocId, targetLocId, items, memo } = payload

    if (!sourceLocId || !targetLocId) {
      return { error: '출발 위치와 도착 위치를 모두 선택해주세요.' }
    }
    if (sourceLocId === targetLocId) {
      return { error: '출발 위치와 도착 위치가 같을 수 없습니다.' }
    }
    if (!items || items.length === 0) {
      return { error: '이동할 자재를 1개 이상 선택해주세요.' }
    }

    const adminName = await getAdminName()

    // 트랜잭션 수행
    const result = await prisma.$transaction(async (tx) => {
      // 1. 출발지 재고 충분성 확인
      for (const item of items) {
        if (item.quantity <= 0) continue

        const sourceStock = await tx.materialStock.findUnique({
          where: {
            locationId_materialId: {
              locationId: sourceLocId,
              materialId: item.materialId
            }
          }
        })

        const available = sourceStock?.quantity || 0
        if (available < item.quantity) {
          const mat = await tx.materialItem.findUnique({ where: { id: item.materialId } })
          throw new Error(`[${mat?.name || '자재'}] 출발지 재고가 부족합니다. (현재: ${available}개, 요청: ${item.quantity}개)`)
        }
      }

      // 2. 전표 번호 생성
      const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '')
      const count = await tx.materialTransfer.count()
      const rand = Math.floor(100 + Math.random() * 900)
      const transferNo = `TR${todayStr}-${String(count + 1).padStart(4, '0')}-${rand}`

      const transfer = await tx.materialTransfer.create({
        data: {
          transferNo,
          type: 'TRANSFER',
          sourceLocId,
          targetLocId,
          adminName,
          memo: memo || '자재 이고 이동'
        }
      })

      // 3. 재고 차감 및 가산 (병렬 처리)
      const validItems = items.filter(it => it.quantity > 0)
      await Promise.all(
        validItems.map(async item => {
          // 출발지 차감
          await tx.materialStock.update({
            where: {
              locationId_materialId: {
                locationId: sourceLocId,
                materialId: item.materialId
              }
            },
            data: {
              quantity: { decrement: item.quantity }
            }
          })

          // 도착지 가산 (없으면 생성)
          await tx.materialStock.upsert({
            where: {
              locationId_materialId: {
                locationId: targetLocId,
                materialId: item.materialId
              }
            },
            update: {
              quantity: { increment: item.quantity }
            },
            create: {
              locationId: targetLocId,
              materialId: item.materialId,
              quantity: item.quantity
            }
          })
        })
      )

      // 품목 상세 일괄 저장 (createMany)
      if (validItems.length > 0) {
        await tx.materialTransferItem.createMany({
          data: validItems.map(item => ({
            transferId: transfer.id,
            materialId: item.materialId,
            quantity: item.quantity
          }))
        })
      }

      return transfer
    }, {
      maxWait: 15000,
      timeout: 30000
    })

    revalidatePath('/inventory')
    return { success: true, transferNo: result.transferNo }
  } catch (error: any) {
    console.error('transferStock error:', error)
    return { error: error.message || '재고 이동 처리 중 오류가 발생했습니다.' }
  }
}

/**
 * 입고 (신규 구매 / 자재 보충)
 */
export async function recordStockIn(payload: {
  targetLocId: string
  items: { materialId: string; quantity: number }[]
  memo?: string
}) {
  try {
    const { targetLocId, items, memo } = payload

    if (!targetLocId) {
      return { error: '입고할 위치(창고/차량)를 선택해주세요.' }
    }

    // 유효한 자재 및 수량만 필터링
    const validItems = (items || []).filter(
      it => it.materialId && typeof it.materialId === 'string' && it.materialId.trim() !== '' && it.quantity > 0
    )

    if (validItems.length === 0) {
      return { error: '입고할 자재를 선택하고 1개 이상의 수량을 입력해주세요.' }
    }

    const adminName = await getAdminName()

    await prisma.$transaction(
      async (tx) => {
        const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '')
        const count = await tx.materialTransfer.count()
        const rand = Math.floor(100 + Math.random() * 900)
        const transferNo = `IN${todayStr}-${String(count + 1).padStart(4, '0')}-${rand}`

        const transfer = await tx.materialTransfer.create({
          data: {
            transferNo,
            type: 'IN',
            targetLocId,
            adminName,
            memo: memo || '신규 구매 입고'
          }
        })

        await Promise.all(
          validItems.map(item =>
            tx.materialStock.upsert({
              where: {
                locationId_materialId: {
                  locationId: targetLocId,
                  materialId: item.materialId
                }
              },
              update: {
                quantity: { increment: item.quantity }
              },
              create: {
                locationId: targetLocId,
                materialId: item.materialId,
                quantity: item.quantity
              }
            })
          )
        )

        await tx.materialTransferItem.createMany({
          data: validItems.map(item => ({
            transferId: transfer.id,
            materialId: item.materialId,
            quantity: item.quantity
          }))
        })
      },
      {
        maxWait: 15000,
        timeout: 30000
      }
    )

    revalidatePath('/inventory')
    return { success: true }
  } catch (error: any) {
    console.error('recordStockIn error:', error)
    return { error: error.message || '입고 처리 중 오류가 발생했습니다.' }
  }
}

/**
 * 출고 (파손 / 폐기 / 현장 손망실)
 */
export async function recordStockOut(payload: {
  sourceLocId: string
  items: { materialId: string; quantity: number }[]
  memo?: string
}) {
  try {
    const { sourceLocId, items, memo } = payload

    if (!sourceLocId) {
      return { error: '출고(폐기)할 위치를 선택해주세요.' }
    }

    // 유효한 자재 및 수량만 필터링
    const validItems = (items || []).filter(
      it => it.materialId && typeof it.materialId === 'string' && it.materialId.trim() !== '' && it.quantity > 0
    )

    if (validItems.length === 0) {
      return { error: '출고할 자재를 선택하고 1개 이상의 수량을 입력해주세요.' }
    }

    const adminName = await getAdminName()

    await prisma.$transaction(
      async (tx) => {
        // 재고 확인
        for (const item of validItems) {
          const stock = await tx.materialStock.findUnique({
            where: {
              locationId_materialId: {
                locationId: sourceLocId,
                materialId: item.materialId
              }
            }
          })
          const cur = stock?.quantity || 0
          if (cur < item.quantity) {
            const mat = await tx.materialItem.findUnique({ where: { id: item.materialId } })
            throw new Error(`[${mat?.name || '자재'}] 보유 수량보다 많은 수량을 출고할 수 없습니다. (현재: ${cur}개)`)
          }
        }

        const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '')
        const count = await tx.materialTransfer.count()
        const rand = Math.floor(100 + Math.random() * 900)
        const transferNo = `OUT${todayStr}-${String(count + 1).padStart(4, '0')}-${rand}`

        const transfer = await tx.materialTransfer.create({
          data: {
            transferNo,
            type: 'OUT',
            sourceLocId,
            adminName,
            memo: memo || '손망실/폐기 출고'
          }
        })

        await Promise.all(
          validItems.map(item =>
            tx.materialStock.update({
              where: {
                locationId_materialId: {
                  locationId: sourceLocId,
                  materialId: item.materialId
                }
              },
              data: {
                quantity: { decrement: item.quantity }
              }
            })
          )
        )

        await tx.materialTransferItem.createMany({
          data: validItems.map(item => ({
            transferId: transfer.id,
            materialId: item.materialId,
            quantity: item.quantity
          }))
        })
      },
      {
        maxWait: 15000,
        timeout: 30000
      }
    )

    revalidatePath('/inventory')
    return { success: true }
  } catch (error: any) {
    console.error('recordStockOut error:', error)
    return { error: error.message || '출고 처리 중 오류가 발생했습니다.' }
  }
}

/**
 * 재고 실사 수행 및 전산 수량 자동 보정
 */
export async function recordAuditAndAdjust(payload: {
  locationId: string
  auditItems: {
    materialId: string
    systemQty: number
    actualQty: number
    reason?: string
  }[]
  memo?: string
}) {
  try {
    const { locationId, auditItems, memo } = payload

    if (!locationId) {
      return { error: '실사 대상 위치를 선택해주세요.' }
    }
    if (!auditItems || auditItems.length === 0) {
      return { error: '실사 품목 데이터가 없습니다.' }
    }

    const adminName = await getAdminName()

    await prisma.$transaction(
      async (tx) => {
        const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '')
        const count = await tx.materialAudit.count()
        const rand = Math.floor(100 + Math.random() * 900)
        const auditNo = `AUD${todayStr}-${String(count + 1).padStart(4, '0')}-${rand}`

        const audit = await tx.materialAudit.create({
          data: {
            auditNo,
            locationId,
            adminName,
            memo: memo || '현장 재고 실사 및 보정'
          }
        })

        // 1. 실사 상세 품목 데이터 일괄 벌크 생성 (createMany)
        const auditItemsData = auditItems.map(item => {
          const diffQty = item.actualQty - item.systemQty
          return {
            auditId: audit.id,
            materialId: item.materialId,
            systemQty: item.systemQty,
            actualQty: item.actualQty,
            diffQty,
            reason: item.reason || (diffQty !== 0 ? '실사 수량 불일치 조정' : '정상')
          }
        })

        if (auditItemsData.length > 0) {
          await tx.materialAuditItem.createMany({
            data: auditItemsData
          })
        }

        // 2. 해당 위치의 재고를 실제 수량(actualQty)으로 병렬 보정
        await Promise.all(
          auditItems.map(item =>
            tx.materialStock.upsert({
              where: {
                locationId_materialId: {
                  locationId,
                  materialId: item.materialId
                }
              },
              update: {
                quantity: item.actualQty
              },
              create: {
                locationId,
                materialId: item.materialId,
                quantity: item.actualQty
              }
            })
          )
        )
      },
      {
        maxWait: 15000,
        timeout: 30000
      }
    )

    revalidatePath('/inventory')
    return { success: true }
  } catch (error: any) {
    console.error('recordAuditAndAdjust error:', error)
    return { error: error.message || '재고 실사 처리 중 오류가 발생했습니다.' }
  }
}

/**
 * 최근 재고 이동(이고/입출고) 이력 목록
 */
export async function getTransferHistory(limit = 50) {
  try {
    const list = await prisma.materialTransfer.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sourceLocation: true,
        targetLocation: true,
        items: {
          include: {
            material: true
          }
        }
      }
    })
    return list
  } catch (err) {
    console.error('getTransferHistory error:', err)
    return []
  }
}

/**
 * 최근 재고 실사 이력 목록
 */
export async function getAuditHistory(limit = 20) {
  try {
    const list = await prisma.materialAudit.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        location: true,
        items: {
          include: {
            material: true
          }
        }
      }
    })
    return list
  } catch (err) {
    console.error('getAuditHistory error:', err)
    return []
  }
}

/**
 * 자재 품목 등록/수정/삭제
 */
export async function createMaterialItem(data: {
  code: string
  name: string
  category: string
  unit: string
  safetyStock: number
  unitPrice: number
  memo?: string
}) {
  try {
    const existing = await prisma.materialItem.findUnique({ where: { code: data.code } })
    if (existing) {
      return { error: '이미 존재하는 자재 코드입니다.' }
    }

    await prisma.materialItem.create({ data })
    revalidatePath('/inventory')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || '자재 등록 실패' }
  }
}

export async function updateMaterialItem(id: string, data: Partial<{
  code: string
  name: string
  category: string
  unit: string
  safetyStock: number
  unitPrice: number
  memo: string
}>) {
  try {
    await prisma.materialItem.update({ where: { id }, data })
    revalidatePath('/inventory')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || '자재 수정 실패' }
  }
}

export async function deleteMaterialItem(id: string) {
  try {
    await prisma.materialItem.delete({ where: { id } })
    revalidatePath('/inventory')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || '자재 삭제 실패' }
  }
}

/**
 * 재고 위치(창고/차량) 등록/수정/삭제
 */
export async function createInventoryLocation(data: {
  name: string
  type: string
  memo?: string
}) {
  try {
    const existing = await prisma.inventoryLocation.findUnique({ where: { name: data.name } })
    if (existing) {
      return { error: '이미 존재하는 위치명입니다.' }
    }

    await prisma.inventoryLocation.create({ data })
    revalidatePath('/inventory')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || '위치 등록 실패' }
  }
}

export async function updateInventoryLocation(id: string, data: Partial<{
  name: string
  type: string
  memo: string
}>) {
  try {
    await prisma.inventoryLocation.update({ where: { id }, data })
    revalidatePath('/inventory')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || '위치 수정 실패' }
  }
}

export async function deleteInventoryLocation(id: string) {
  try {
    await prisma.inventoryLocation.delete({ where: { id } })
    revalidatePath('/inventory')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || '위치 삭제 실패' }
  }
}
