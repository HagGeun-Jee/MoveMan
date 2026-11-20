import { NextResponse } from 'next/server'
import { purgeExpiredSmallMoves } from '@/lib/smallMove/purge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GitHub Actions 스케줄이 매일 호출: Authorization: Bearer ${CRON_SECRET}
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ ok: false, message: 'CRON_SECRET 미설정' }, { status: 503 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 })
  }
  const result = await purgeExpiredSmallMoves()
  return NextResponse.json({ ok: true, ...result })
}

export const GET = handle
export const POST = handle
