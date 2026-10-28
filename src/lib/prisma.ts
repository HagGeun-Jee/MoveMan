import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  // Supabase 세션 모드 풀 고갈(EMAXCONNSESSION) 방지를 위해 최대 커넥션을 3으로 제한
  const dbUrl = process.env.DATABASE_URL
  if (dbUrl && !dbUrl.includes('connection_limit')) {
    const separator = dbUrl.includes('?') ? '&' : '?'
    process.env.DATABASE_URL = `${dbUrl}${separator}connection_limit=3`
  }

  return new PrismaClient({
    log: ['error', 'warn'],
  })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const getPrismaInstance = () => {
  // 캐시된 인스턴스가 있고 최신 모델(costStandardMaster)이 정상 포함되어 있으면 재사용
  if (globalThis.prismaGlobal && (globalThis.prismaGlobal as any).costStandardMaster) {
    return globalThis.prismaGlobal
  }
  const client = prismaClientSingleton()
  globalThis.prismaGlobal = client
  return client
}

const prisma = getPrismaInstance()

export default prisma
