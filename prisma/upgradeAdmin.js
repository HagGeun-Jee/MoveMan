import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.admin.updateMany({
    data: {
      level: 9
    }
  })
  console.log('모든 관리자의 레벨을 9로 업데이트했습니다.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
