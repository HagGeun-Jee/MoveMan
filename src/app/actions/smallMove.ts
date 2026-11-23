'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { decrypt } from '@/lib/session'
import { sendSms, normalizePhone, isValidKoreanMobile } from '@/lib/smallMove/sms'
import { calcPurgeAt } from '@/lib/smallMove/purge'
import { buildReplySms } from '@/lib/smallMove/smsText'
import { isValidStartTime, kstDateStr } from '@/lib/smallMove/format'
import { calculateSmallMoveQuote } from '@/lib/smallMove/pricing'
import { SMALL_ITEM_MAP, SMALL_MOVE_ACTIONS, type SmallMoveAction, type SmallMoveItemEntry } from '@/lib/smallMove/catalog'
import { getSyncedSmallItemMap } from '@/lib/smallMove/syncCatalog'
import { getDistance } from '@/app/actions/distance'

async function requireAdmin() {
  const store = await cookies()
  const session = await decrypt(store.get('session')?.value)
  if (!session?.userId) throw new Error('관리자 로그인이 필요합니다.')
  return session
}

const VALID_STATUS = ['RECEIVED', 'REVIEWING', 'QUOTED', 'BOOKED', 'CANCELED']

export async function updateSmallMoveAction(formData: FormData) {
  await requireAdmin()

  const id = String(formData.get('id') || '')
  const status = String(formData.get('status') || '')
  const finalRaw = String(formData.get('finalAmount') || '').replace(/[^0-9]/g, '')
  const comment = String(formData.get('adminComment') || '').slice(0, 1000)
  const sendSmsFlag = formData.get('sendSms') === 'on'

  const cur = await prisma.smallMoveRequest.findUnique({ where: { id } })
  if (!cur || cur.purgedAt) return
  if (!VALID_STATUS.includes(status)) return

  const finalAmount = finalRaw ? parseInt(finalRaw, 10) : null
  const now = new Date()
  const data: Record<string, unknown> = {
    status,
    finalAmount,
    adminComment: comment,
  }
  if (status === 'QUOTED' && finalAmount != null && (!cur.quotedAt || cur.finalAmount !== finalAmount)) {
    data.quotedAt = now
  }
  // 취소 시 취소일 + 14일, 그 외에는 이사일 기준으로 정리 예정일 재계산
  data.purgeAt = status === 'CANCELED' ? new Date(now.getTime() + 14 * 86400000) : calcPurgeAt(cur.movingDate, cur.createdAt)

  const startTime = String(formData.get('startTime') || '')
  try {
    const opt = JSON.parse(cur.options || '{}')
    opt.startTime = isValidStartTime(startTime) ? startTime : ''
    data.options = JSON.stringify(opt)
  } catch {
    /* 옵션 파싱 실패 시 유지 */
  }

  await prisma.smallMoveRequest.update({ where: { id }, data })

  if (sendSmsFlag && cur.contact) {
    const msg = buildReplySms({ id, status, finalAmount, comment, siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '' })
    await sendSms(cur.contact, msg)
  }

  revalidatePath('/small-moves')
  revalidatePath(`/small-moves/${id}`)
  redirect(`/small-moves/${id}`)
}

const HOME_TYPE_IDS = ['ONE_ROOM', 'TWO_ROOM', 'THREE_ROOM']
const sideOf = (v: any) => ({
  floor: Math.max(-1, Math.min(60, Math.floor(Number(v?.floor) || 1))),
  elevator: Boolean(v?.elevator),
  ladder: Boolean(v?.ladder),
  parkingFar: Boolean(v?.parkingFar),
})
const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n)

// 검수자가 고객과 소통하며 바뀐 접수 내용을 수정한다. 저장 후 상세 화면으로 이동.
export async function updateSmallMoveDetailsAction(formData: FormData) {
  const session = await requireAdmin()
  const id = String(formData.get('id') || '')
  let p: any
  try {
    p = JSON.parse(String(formData.get('payload') || '{}'))
  } catch {
    throw new Error('잘못된 요청입니다.')
  }

  const cur = await prisma.smallMoveRequest.findUnique({ where: { id } })
  if (!cur || cur.purgedAt) throw new Error('수정할 수 없는 접수입니다.')

  const customerName = clip(p.customerName, 30)
  const contact = normalizePhone(clip(p.contact, 20))
  const fromAddress = clip(p.fromAddress, 200)
  const toAddress = clip(p.toAddress, 200)
  const homeType = HOME_TYPE_IDS.includes(p.homeType) ? p.homeType : cur.homeType
  if (!customerName || !isValidKoreanMobile(contact) || !fromAddress || !toAddress) {
    throw new Error('필수 항목(이름, 연락처, 주소)을 확인해 주세요.')
  }

  const syncedMap = await getSyncedSmallItemMap()
  const stdRows = await prisma.standardItem.findMany({ select: { id: true, name: true, spec: true, defaultCbm: true, defaultInnerCbm: true } })
  const stdByKey = new Map(stdRows.map((s) => [`${s.name}__${s.spec}`, s]))

  const items: SmallMoveItemEntry[] = (Array.isArray(p.items) ? p.items.slice(0, 120) : [])
    .map((i: any): SmallMoveItemEntry | null => {
      const id = clip(i?.id, 80)
      const qty = Math.floor(Number(i?.qty) || 0)
      if (!id || qty <= 0) return null
      const name = clip(i?.name, 60)
      const spec = clip(i?.spec, 80)
      const action: SmallMoveAction = SMALL_MOVE_ACTIONS.includes(i?.action)
        ? i.action
        : i?.dispose
        ? '폐기'
        : '이동'
      if (name) {
        const matched = stdByKey.get(`${name}__${spec}`)
        const cbm = matched ? matched.defaultCbm : Math.max(0, Math.min(20, Number(i?.cbm) || 0))
        const innerCbm = matched ? (matched.defaultInnerCbm || 0) : Math.max(0, Math.min(20, Number(i?.innerCbm) || 0))
        return { id, qty: Math.min(qty, 150), name, spec, cbm, innerCbm, action }
      }
      const def = syncedMap[id] ?? SMALL_ITEM_MAP[id]
      if (!def) return null
      return { id, qty: Math.min(qty, def.max ?? 50), action }
    })
    .filter((i: SmallMoveItemEntry | null): i is SmallMoveItemEntry => i !== null)
  if (items.length === 0) throw new Error('물품을 1개 이상 선택해 주세요.')

  const md = clip(p.movingDate, 10)
  const movingDate = /^\d{4}-\d{2}-\d{2}$/.test(md) ? new Date(md + 'T00:00:00+09:00') : null
  const fromInfo = sideOf(p.fromInfo)
  const toInfo = sideOf(p.toInfo)

  const opt = (() => {
    try {
      return JSON.parse(cur.options || '{}')
    } catch {
      return {} as Record<string, any>
    }
  })()
  const prevOpt = { ...opt }
  opt.packingService = Boolean(p.options?.packingService)
  opt.airconCount = Math.max(0, Math.min(5, Math.floor(Number(p.options?.airconCount) || 0)))
  opt.startTime = isValidStartTime(p.startTime) ? p.startTime : ''

  // 주소가 바뀌면 경로 거리·통행료 재계산
  let distanceKm = cur.distanceKm
  if (fromAddress !== cur.fromAddress || toAddress !== cur.toAddress) {
    try {
      const d = await getDistance(fromAddress, toAddress)
      if (d?.success && d.distanceKm > 0) {
        distanceKm = d.distanceKm
        opt.tollFare = d.tollFare ?? 0
        opt.tollByClass = d.tollFareByClass ?? null
        opt.durationText = d.durationText || ''
      }
    } catch {
      /* 기존 거리 유지 */
    }
  }

  // 변경된 항목 기록
  const norm = (list: SmallMoveItemEntry[]) =>
    JSON.stringify(
      [...list]
        .map((x) => `${x.id}|${x.name || ''}|${x.spec || ''}|${x.qty}|${x.action || (x.dispose ? '폐기' : '이동')}`)
        .sort()
    )
  const safe = (s: string, fb: any) => {
    try {
      return JSON.parse(s)
    } catch {
      return fb
    }
  }
  const changed: string[] = []
  if (customerName !== cur.customerName) changed.push('이름')
  if (contact !== cur.contact) changed.push('연락처')
  if (homeType !== cur.homeType) changed.push('주거형태')
  if (kstDateStr(movingDate) !== kstDateStr(cur.movingDate)) changed.push('이사일')
  if (opt.startTime !== (prevOpt.startTime || '')) changed.push('작업시작시간')
  if (fromAddress !== cur.fromAddress) changed.push('출발지 주소')
  if (toAddress !== cur.toAddress) changed.push('도착지 주소')
  if (JSON.stringify(fromInfo) !== JSON.stringify(sideOf(safe(cur.fromInfo, {})))) changed.push('출발지 작업환경')
  if (JSON.stringify(toInfo) !== JSON.stringify(sideOf(safe(cur.toInfo, {})))) changed.push('도착지 작업환경')
  if (norm(items) !== norm(safe(cur.items, []))) changed.push('물품')
  if (opt.packingService !== Boolean(prevOpt.packingService) || opt.airconCount !== (Number(prevOpt.airconCount) || 0)) changed.push('옵션')
  if (clip(p.memo, 1000) !== cur.memo) changed.push('요청사항')

  const data: Record<string, any> = {
    customerName,
    contact,
    homeType,
    movingDate,
    fromAddress,
    toAddress,
    fromInfo: JSON.stringify(fromInfo),
    toInfo: JSON.stringify(toInfo),
    items: JSON.stringify(items),
    memo: clip(p.memo, 1000),
    distanceKm,
  }

  if (p.recalc) {
    let labor = 190000
    try {
      const cs = await prisma.costStandardMaster.findFirst()
      if (cs?.maleLaborCost) labor = cs.maleLaborCost
    } catch {
      /* 기본값 */
    }
    const q = calculateSmallMoveQuote({
      items,
      from: fromInfo,
      to: toInfo,
      distanceKm,
      movingDate: md || null,
      packingService: opt.packingService,
      airconCount: opt.airconCount,
      laborCostPerPerson: labor,
      syncedMap,
    })
    data.totalCbm = q.totalCbm
    data.vehicleLabel = q.vehicleLabel
    data.estMin = q.min
    data.estMax = q.max
    data.estBreakdown = JSON.stringify(q.breakdown)
    data.consultRequired = q.consultRequired
    if (q.min !== cur.estMin || q.max !== cur.estMax) changed.push('예상견적 재산정')
  }

  if (cur.status !== 'CANCELED') data.purgeAt = calcPurgeAt(movingDate, cur.createdAt)

  // 수정 이력 (최근 30건)
  if (changed.length > 0) {
    const history = Array.isArray(opt.history) ? opt.history : []
    history.push({ at: new Date().toISOString(), by: String((session as any).name || (session as any).loginId || '관리자'), fields: changed })
    opt.history = history.slice(-30)
  }
  data.options = JSON.stringify(opt)

  await prisma.smallMoveRequest.update({ where: { id }, data })
  revalidatePath('/small-moves')
  revalidatePath(`/small-moves/${id}`)
  revalidatePath('/')
  revalidatePath('/calendar')
  redirect(`/small-moves/${id}`)
}

function kstYYMMDD() {
  const k = new Date(Date.now() + 9 * 3600 * 1000)
  return k.toISOString().slice(2, 10).replace(/-/g, '')
}

// 플랫폼 오더장 등 전화견적용 소형이사 신규 접수 생성 (저장 후 상세 화면으로 이동)
export async function createPhoneSmallMoveAction(formData: FormData) {
  await requireAdmin()
  let p: any
  try {
    p = JSON.parse(String(formData.get('payload') || '{}'))
  } catch {
    throw new Error('잘못된 요청입니다.')
  }

  const customerName = clip(p.customerName, 30)
  const contact = normalizePhone(clip(p.contact, 20))
  const fromAddress = clip(p.fromAddress, 200)
  const toAddress = clip(p.toAddress, 200)
  const homeType = HOME_TYPE_IDS.includes(p.homeType) ? p.homeType : 'ONE_ROOM'
  const channel = clip(p.channel, 40) || '전화견적'

  if (!customerName || !isValidKoreanMobile(contact) || !fromAddress || !toAddress) {
    throw new Error('필수 항목(이름, 연락처, 출발지/도착지 주소)을 확인해 주세요.')
  }

  const syncedMap = await getSyncedSmallItemMap()
  const stdRows = await prisma.standardItem.findMany({ select: { id: true, name: true, spec: true, defaultCbm: true, defaultInnerCbm: true } })
  const stdByKey = new Map(stdRows.map((s) => [`${s.name}__${s.spec}`, s]))

  const items: SmallMoveItemEntry[] = (Array.isArray(p.items) ? p.items.slice(0, 120) : [])
    .map((i: any): SmallMoveItemEntry | null => {
      const id = clip(i?.id, 80)
      const qty = Math.floor(Number(i?.qty) || 0)
      if (!id || qty <= 0) return null
      const name = clip(i?.name, 60)
      const spec = clip(i?.spec, 80)
      const action: SmallMoveAction = SMALL_MOVE_ACTIONS.includes(i?.action) ? i.action : '이동'
      if (name) {
        const matched = stdByKey.get(`${name}__${spec}`)
        const cbm = matched ? matched.defaultCbm : Math.max(0, Math.min(20, Number(i?.cbm) || 0))
        const innerCbm = matched ? (matched.defaultInnerCbm || 0) : Math.max(0, Math.min(20, Number(i?.innerCbm) || 0))
        return { id, qty: Math.min(qty, 150), name, spec, cbm, innerCbm, action }
      }
      const def = syncedMap[id] ?? SMALL_ITEM_MAP[id]
      if (!def) return null
      return { id, qty: Math.min(qty, def.max ?? 50), action }
    })
    .filter((i: SmallMoveItemEntry | null): i is SmallMoveItemEntry => i !== null)
  if (items.length === 0) throw new Error('물품을 1개 이상 선택해 주세요.')

  const md = clip(p.movingDate, 10)
  const movingDate = /^\d{4}-\d{2}-\d{2}$/.test(md) ? new Date(md + 'T00:00:00+09:00') : null
  const fromInfo = sideOf(p.fromInfo)
  const toInfo = sideOf(p.toInfo)
  const options: Record<string, any> = {
    packingService: Boolean(p.options?.packingService),
    airconCount: 0,
    startTime: isValidStartTime(p.startTime) ? p.startTime : '',
  }

  let distanceKm = 20
  try {
    const d = await getDistance(fromAddress, toAddress)
    if (d?.success && d.distanceKm > 0) {
      distanceKm = d.distanceKm
      options.tollFare = d.tollFare ?? 0
      options.tollByClass = d.tollFareByClass ?? null
      options.durationText = d.durationText || ''
    }
  } catch {
    /* 기본 거리 사용 */
  }

  let labor = 190000
  try {
    const cs = await prisma.costStandardMaster.findFirst()
    if (cs?.maleLaborCost) labor = cs.maleLaborCost
  } catch {
    /* 기본값 */
  }

  const q = calculateSmallMoveQuote({
    items,
    from: fromInfo,
    to: toInfo,
    distanceKm,
    movingDate: md || null,
    packingService: options.packingService,
    airconCount: 0,
    laborCostPerPerson: labor,
    syncedMap,
  })

  const now = new Date()
  let id = ''
  for (let attempt = 0; attempt < 6; attempt++) {
    id = `SM${kstYYMMDD()}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
    try {
      await prisma.smallMoveRequest.create({
        data: {
          id,
          status: 'REVIEWING',
          channel,
          customerName,
          contact,
          homeType,
          movingDate,
          fromAddress,
          toAddress,
          fromInfo: JSON.stringify(fromInfo),
          toInfo: JSON.stringify(toInfo),
          items: JSON.stringify(items),
          photos: '[]',
          options: JSON.stringify(options),
          memo: clip(p.memo, 1000),
          distanceKm,
          totalCbm: q.totalCbm,
          vehicleLabel: q.vehicleLabel,
          estMin: q.min,
          estMax: q.max,
          estBreakdown: JSON.stringify(q.breakdown),
          consultRequired: q.consultRequired,
          privacyConsentAt: now,
          purgeAt: calcPurgeAt(movingDate, now),
        },
      })
      break
    } catch (e: any) {
      if (e?.code === 'P2002' && attempt < 5) continue
      throw e
    }
  }

  revalidatePath('/small-moves')
  revalidatePath('/')
  revalidatePath('/calendar')
  redirect(`/small-moves/${id}`)
}
