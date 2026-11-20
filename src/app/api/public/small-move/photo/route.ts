import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { uploadPhoto, isStorageConfigured } from '@/lib/smallMove/storage'
import { rateLimit, clientIp } from '@/lib/smallMove/purge'

export const runtime = 'nodejs'

const MAX_BYTES = 5 * 1024 * 1024
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export async function POST(req: Request) {
  if (!isStorageConfigured()) {
    return NextResponse.json({ ok: false, message: '사진 저장소가 아직 설정되지 않아 사진을 올릴 수 없습니다. 사진 없이 제출하시면 담당자가 연락드립니다.' }, { status: 503 })
  }
  if (!rateLimit('photo:' + clientIp(req), 40, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, { status: 429 })
  }
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ ok: false, message: '파일이 없습니다.' }, { status: 400 })
    const ext = EXT[file.type]
    if (!ext) return NextResponse.json({ ok: false, message: 'JPG/PNG/WEBP 사진만 올릴 수 있습니다.' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: '사진은 5MB 이하만 가능합니다.' }, { status: 400 })

    const path = `pending/${randomUUID()}.${ext}`
    await uploadPhoto(path, await file.arrayBuffer(), file.type)
    return NextResponse.json({ ok: true, path })
  } catch (e) {
    console.error('small-move photo upload error', e)
    const code = e instanceof Error && /^STORAGE_/.test(e.message) ? ` (${e.message})` : ''
    return NextResponse.json({ ok: false, message: `사진 업로드에 실패했습니다.${code}` }, { status: 500 })
  }
}
