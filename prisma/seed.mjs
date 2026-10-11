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
