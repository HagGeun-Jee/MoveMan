import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/session'
import { downloadPhoto } from '@/lib/smallMove/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PATH_RE = /^(pending|requests\/SM\d+)\/[0-9a-f-]{36}\.(jpg|png|webp)$/

// 관리자 로그인 세션이 있어야만 사진을 볼 수 있다.
export async function GET(req: Request) {
  const store = await cookies()
  const session = await decrypt(store.get('session')?.value)
  if (!session?.userId) return new NextResponse('unauthorized', { status: 401 })

  const path = new URL(req.url).searchParams.get('path') || ''
  if (!PATH_RE.test(path)) return new NextResponse('bad request', { status: 400 })

  const file = await downloadPhoto(path)
  if (!file) return new NextResponse('not found', { status: 404 })
  return new NextResponse(file.data, {
    headers: { 'Content-Type': file.contentType, 'Cache-Control': 'private, max-age=300' },
  })
}
