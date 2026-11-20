import 'server-only'

// Supabase Storage (비공개 버킷) REST 래퍼 - 추가 패키지 없이 fetch 사용
// 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (서버 전용, 절대 클라이언트 노출 금지)
const BUCKET = 'small-move'
let bucketReady = false

function authHeaders(key: string, extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${key}`, apikey: key, ...extra }
}

function conf() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return url && key ? { url, key } : null
}

export function isStorageConfigured() {
  return conf() !== null
}

async function ensureBucket() {
  const c = conf()
  if (!c || bucketReady) return
  const res = await fetch(`${c.url}/storage/v1/bucket`, {
    method: 'POST',
    headers: authHeaders(c.key, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  })
  // 이미 존재하면 400/409 - 무시
  if (res.ok || res.status === 400 || res.status === 409) bucketReady = true
  else console.error('[storage] 버킷 생성 실패', res.status, await res.text().catch(() => ''))
}

export async function uploadPhoto(path: string, data: ArrayBuffer, contentType: string) {
  const c = conf()
  if (!c) throw new Error('STORAGE_NOT_CONFIGURED')
  await ensureBucket()
  const res = await fetch(`${c.url}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: authHeaders(c.key, { 'Content-Type': contentType, 'x-upsert': 'false' }),
    body: data,
  })
  if (!res.ok) {
    console.error('[storage] 업로드 실패', res.status, await res.text().catch(() => ''))
    throw new Error(`STORAGE_UPLOAD_FAILED_${res.status}`)
  }
}

export async function signedUrls(paths: string[], expiresIn = 3600) {
  const c = conf()
  if (!c || paths.length === 0) return {} as Record<string, string>
  const out: Record<string, string> = {}
  await Promise.all(
    paths.map(async (p) => {
      const res = await fetch(`${c.url}/storage/v1/object/sign/${BUCKET}/${p}`, {
        method: 'POST',
        headers: authHeaders(c.key, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ expiresIn }),
      })
      if (!res.ok) return
      const json = (await res.json()) as { signedURL?: string }
      if (json.signedURL) out[p] = `${c.url}/storage/v1${json.signedURL}`
    })
  )
  return out
}

export async function deletePhotos(paths: string[]) {
  const c = conf()
  if (!c || paths.length === 0) return 0
  const res = await fetch(`${c.url}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: authHeaders(c.key, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes: paths }),
  })
  return res.ok ? paths.length : 0
}

// 제출되지 않고 방치된 임시 업로드(pending/) 정리용 목록
export async function listPending(): Promise<{ name: string; created_at: string }[]> {
  const c = conf()
  if (!c) return []
  const res = await fetch(`${c.url}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: authHeaders(c.key, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefix: 'pending', limit: 1000 }),
  })
  if (!res.ok) return []
  return (await res.json()) as { name: string; created_at: string }[]
}
