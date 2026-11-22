import 'server-only'
import prisma from '@/lib/prisma'
import { deletePhotos, listPending, isStorageConfigured } from './storage'

const DAY = 24 * 60 * 60 * 1000

// 사진 삭제/개인정보 마스킹 예정일: 이사일 + 14일 (이사일 미정이면 접수일 + 30일)
export function calcPurgeAt(movingDate: Date | null | undefined, createdAt: Date = new Date()) {
  if (movingDate) return new Date(movingDate.getTime() + 14 * DAY)
  return new Date(createdAt.getTime() + 30 * DAY)
}

// 간단한 IP 기반 요청 제한 (서버 인스턴스 메모리 기준)
const buckets = new Map<string, { count: number; reset: number }>()
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  b.count += 1
  return b.count <= max
}

export function clientIp(req: Request) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
}

export async function purgeExpiredSmallMoves() {
  const now = new Date()
  const targets = await prisma.smallMoveRequest.findMany({
    where: { purgeAt: { lte: now }, purgedAt: null },
    select: { id: true, photos: true, fromAddress: true, toAddress: true },
  })

  let purged = 0
  let deletedFiles = 0
  for (const t of targets) {
    let paths: string[] = []
    try {
      paths = (JSON.parse(t.photos || '[]') as { path: string }[]).map((p) => p.path).filter(Boolean)
    } catch {
      paths = []
    }
    // 사진 삭제에 실패하면 purgedAt을 기록하지 않고 다음 실행에서 재시도
    if (paths.length > 0) {
      const n = await deletePhotos(paths)
      if (n === 0 && isStorageConfigured()) continue
      deletedFiles += n
    }
    // 개인정보 마스킹 (통계용 금액·물량·지역(시/구)만 남김)
    const region = (a: string) => a.split(' ').slice(0, 2).join(' ')
    await prisma.smallMoveRequest.update({
      where: { id: t.id },
      data: {
        customerName: '(삭제됨)',
        contact: '',
        fromAddress: region(t.fromAddress),
        toAddress: region(t.toAddress),
        memo: '',
        adminComment: '',
        photos: '[]',
        purgedAt: now,
      },
    })
    purged += 1
  }

  // 제출되지 않고 남은 임시 업로드(2일 경과) 정리
  let pendingDeleted = 0
  const pending = await listPending()
  const stale = pending
    .filter((o) => Date.now() - new Date(o.created_at).getTime() > 2 * DAY)
    .map((o) => `pending/${o.name}`)
  if (stale.length > 0) {
    const refs = await prisma.smallMoveRequest.findMany({
      where: { photos: { contains: 'pending/' }, purgedAt: null },
      select: { photos: true },
    })
    const referenced = new Set<string>()
    for (const r of refs) {
      try {
        for (const p of JSON.parse(r.photos) as { path: string }[]) referenced.add(p.path)
      } catch {
        /* 무시 */
      }
    }
    const safe = stale.filter((p) => !referenced.has(p))
    if (safe.length > 0) pendingDeleted = await deletePhotos(safe)
  }

  return { purged, deletedFiles, pendingDeleted }
}
