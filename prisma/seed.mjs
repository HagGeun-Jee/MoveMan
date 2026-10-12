import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('admin123', 10)
  const admin = await prisma.admin.upsert({
    where: { userId: 'admin' },
    update: {},
    create: {
      userId: 'admin',
      password,
      name: '최고관리자',
      role: 'ADMIN',
    },
  })
  console.log('초기 관리자 계정 생성 완료:', admin.userId)

  // 사다리차 표준 운임표 초기 시딩
  const STANDARD_LADDER_FARES = [
    { floorName: '2~5층', minFloor: 2, maxFloor: 5, cost1Ton: 120000, cost2_5Ton: 130000, cost5Ton: 150000, cost6Ton: 180000, cost7_5Ton: 210000, cost10Ton: 240000, order: 1, note: '저층 기본요금' },
    { floorName: '6~7층', minFloor: 6, maxFloor: 7, cost1Ton: 130000, cost2_5Ton: 140000, cost5Ton: 160000, cost6Ton: 190000, cost7_5Ton: 220000, cost10Ton: 250000, order: 2, note: '' },
    { floorName: '8~9층', minFloor: 8, maxFloor: 9, cost1Ton: 140000, cost2_5Ton: 150000, cost5Ton: 170000, cost6Ton: 200000, cost7_5Ton: 230000, cost10Ton: 260000, order: 3, note: '' },
    { floorName: '10~11층', minFloor: 10, maxFloor: 11, cost1Ton: 150000, cost2_5Ton: 160000, cost5Ton: 180000, cost6Ton: 210000, cost7_5Ton: 240000, cost10Ton: 270000, order: 4, note: '' },
    { floorName: '12~13층', minFloor: 12, maxFloor: 13, cost1Ton: 160000, cost2_5Ton: 170000, cost5Ton: 190000, cost6Ton: 220000, cost7_5Ton: 250000, cost10Ton: 280000, order: 5, note: '' },
    { floorName: '14층', minFloor: 14, maxFloor: 14, cost1Ton: 170000, cost2_5Ton: 180000, cost5Ton: 200000, cost6Ton: 230000, cost7_5Ton: 260000, cost10Ton: 290000, order: 6, note: '38m 장비' },
    { floorName: '15층', minFloor: 15, maxFloor: 15, cost1Ton: 180000, cost2_5Ton: 190000, cost5Ton: 210000, cost6Ton: 240000, cost7_5Ton: 270000, cost10Ton: 300000, order: 7, note: '' },
    { floorName: '16층', minFloor: 16, maxFloor: 16, cost1Ton: 190000, cost2_5Ton: 200000, cost5Ton: 220000, cost6Ton: 250000, cost7_5Ton: 280000, cost10Ton: 310000, order: 8, note: '45m 장비' },
    { floorName: '17층', minFloor: 17, maxFloor: 17, cost1Ton: 200000, cost2_5Ton: 210000, cost5Ton: 230000, cost6Ton: 260000, cost7_5Ton: 290000, cost10Ton: 320000, order: 9, note: '' },
    { floorName: '18층', minFloor: 18, maxFloor: 18, cost1Ton: 220000, cost2_5Ton: 230000, cost5Ton: 250000, cost6Ton: 280000, cost7_5Ton: 310000, cost10Ton: 340000, order: 10, note: '' },
    { floorName: '19층', minFloor: 19, maxFloor: 19, cost1Ton: 230000, cost2_5Ton: 240000, cost5Ton: 260000, cost6Ton: 290000, cost7_5Ton: 320000, cost10Ton: 350000, order: 11, note: '' },
    { floorName: '20층', minFloor: 20, maxFloor: 20, cost1Ton: 250000, cost2_5Ton: 260000, cost5Ton: 280000, cost6Ton: 310000, cost7_5Ton: 340000, cost10Ton: 370000, order: 12, note: '54m 고층장비' },
    { floorName: '21층', minFloor: 21, maxFloor: 21, cost1Ton: 280000, cost2_5Ton: 290000, cost5Ton: 310000, cost6Ton: 340000, cost7_5Ton: 370000, cost10Ton: 400000, order: 13, note: '고층 특수작업' },
    { floorName: '22층', minFloor: 22, maxFloor: 22, cost1Ton: 310000, cost2_5Ton: 320000, cost5Ton: 340000, cost6Ton: 370000, cost7_5Ton: 400000, cost10Ton: 430000, order: 14, note: '고층 특수작업' },
    { floorName: '23층', minFloor: 23, maxFloor: 23, cost1Ton: 340000, cost2_5Ton: 350000, cost5Ton: 370000, cost6Ton: 400000, cost7_5Ton: 430000, cost10Ton: 460000, order: 15, note: '65m 초고층장비' },
    { floorName: '24층', minFloor: 24, maxFloor: 24, cost1Ton: 370000, cost2_5Ton: 380000, cost5Ton: 400000, cost6Ton: 430000, cost7_5Ton: 460000, cost10Ton: 490000, order: 16, note: '초고층' },
    { floorName: '25층', minFloor: 25, maxFloor: 25, cost1Ton: 400000, cost2_5Ton: 420000, cost5Ton: 440000, cost6Ton: 480000, cost7_5Ton: 520000, cost10Ton: 550000, order: 17, note: '초고층' },
    { floorName: '26층 이상', minFloor: 26, maxFloor: 99, cost1Ton: 450000, cost2_5Ton: 480000, cost5Ton: 500000, cost6Ton: 550000, cost7_5Ton: 600000, cost10Ton: 650000, order: 18, note: '현장 협의 / 70m급' },
  ]
  for (const item of STANDARD_LADDER_FARES) {
    const id = `ladder_${item.order}`
    await prisma.$executeRawUnsafe(`
      INSERT INTO "LadderTruckMaster" ("id", "floorName", "minFloor", "maxFloor", "cost1Ton", "cost2_5Ton", "cost5Ton", "cost6Ton", "cost7_5Ton", "cost10Ton", "note", "order", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT ("id") DO UPDATE SET
        "floorName" = EXCLUDED."floorName",
        "minFloor" = EXCLUDED."minFloor",
        "maxFloor" = EXCLUDED."maxFloor",
        "cost1Ton" = EXCLUDED."cost1Ton",
        "cost2_5Ton" = EXCLUDED."cost2_5Ton",
        "cost5Ton" = EXCLUDED."cost5Ton",
        "cost6Ton" = EXCLUDED."cost6Ton",
        "cost7_5Ton" = EXCLUDED."cost7_5Ton",
        "cost10Ton" = EXCLUDED."cost10Ton",
        "note" = EXCLUDED."note",
        "order" = EXCLUDED."order",
        "updatedAt" = NOW()
    `, id, item.floorName, item.minFloor, item.maxFloor, item.cost1Ton, item.cost2_5Ton, item.cost5Ton, item.cost6Ton, item.cost7_5Ton, item.cost10Ton, item.note, item.order)
  }
  console.log('사다리차 표준 운임표 시딩 완료 (18개 구간)')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
