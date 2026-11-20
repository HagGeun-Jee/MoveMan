import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { SMALL_ITEM_MAP } from '@/lib/smallMove/catalog'
import { calculateSmallMoveQuote, type SideInfo } from '@/lib/smallMove/pricing'
import { sendSms, normalizePhone, isValidKoreanMobile } from '@/lib/smallMove/sms'
import { calcPurgeAt, rateLimit, clientIp } from '@/lib/smallMove/purge'
import { getDistance } from '@/app/actions/distance'

export const runtime = 'nodejs'

const PHOTO_PATH_RE = /^pending\/[0-9a-f-]{36}\.(jpg|png|webp)$/

function str(v: unknown, max: number) {
  return String(v ?? '').trim().slice(0, max)
}

function side(v: any): SideInfo {
  return {
    floor: Math.max(-1, Math.min(60, Math.floor(Number(v?.floor) || 1))),
    elevator: Boolean(v?.elevator),
    ladder: Boolean(v?.ladder),
    parkingFar: Boolean(v?.parkingFar),
  }
}

function kstYYMMDD() {
  const k = new Date(Date.now() + 9 * 3600 * 1000)
  return k.toISOString().slice(2, 10).replace(/-/g, '')
}

const man = (n: number) => `${Math.round(n / 10000)}만원`

export async function POST(req: Request) {
  const ip = clientIp(req)
  if (!rateLimit('submit:' + ip, 6, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, message: '접수 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, { status: 429 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: '잘못된 요청입니다.' }, { status: 400 })
  }

  // 스팸 방지 허니팟 (사람은 비워둠)
  if (body?.website) return NextResponse.json({ ok: true, id: 'SM-OK' })

  const customerName = str(body.customerName, 30)
  const contact = normalizePhone(str(body.contact, 20))
  const fromAddress = str(body.fromAddress, 200)
  const toAddress = str(body.toAddress, 200)
  const homeType = ['ONE_ROOM', 'TWO_ROOM', 'THREE_ROOM'].includes(body.homeType) ? body.homeType : ''

  if (!customerName) return NextResponse.json({ ok: false, message: '이름을 입력해 주세요.' }, { status: 400 })
  if (!isValidKoreanMobile(contact)) return NextResponse.json({ ok: false, message: '휴대폰 번호를 정확히 입력해 주세요.' }, { status: 400 })
  if (!fromAddress || !toAddress) return NextResponse.json({ ok: false, message: '출발지와 도착지 주소를 입력해 주세요.' }, { status: 400 })
  if (!homeType) return NextResponse.json({ ok: false, message: '주거 형태를 선택해 주세요.' }, { status: 400 })
  if (!body.privacyConsent) return NextResponse.json({ ok: false, message: '개인정보 수집·이용에 동의해 주세요.' }, { status: 400 })

  // 물품
  const rawItems: any[] = Array.isArray(body.items) ? body.items.slice(0, 80) : []
  const items = rawItems
    .map((i) => ({ id: String(i?.id), qty: Math.floor(Number(i?.qty) || 0) }))
    .filter((i) => SMALL_ITEM_MAP[i.id] && i.qty > 0)
    .map((i) => ({ id: i.id, qty: Math.min(i.qty, SMALL_ITEM_MAP[i.id].max ?? 20) }))
  if (items.length === 0) return NextResponse.json({ ok: false, message: '옮길 물품을 1개 이상 선택해 주세요.' }, { status: 400 })

  // 사진 (업로드 API가 발급한 경로만 허용)
  const photos = (Array.isArray(body.photos) ? body.photos.slice(0, 10) : [])
    .map((p: any) => ({ path: String(p?.path || ''), label: str(p?.label, 20) }))
    .filter((p: { path: string }) => PHOTO_PATH_RE.test(p.path))

  // 이사일
  let movingDate: Date | null = null
  const md = str(body.movingDate, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(md)) movingDate = new Date(md + 'T00:00:00+09:00')

  const fromInfo = side(body.fromInfo)
  const toInfo = side(body.toInfo)
  const options = {
    packingService: Boolean(body.options?.packingService),
    airconCount: Math.max(0, Math.min(5, Math.floor(Number(body.options?.airconCount) || 0))),
  }

  // 거리 (실패하면 20km 가정 후 관리자 확인)
  let distanceKm = 20
  try {
    const d = await getDistance(fromAddress, toAddress)
    if (d?.success && d.distanceKm > 0) distanceKm = d.distanceKm
  } catch {
    /* 기본값 사용 */
  }

  let labor = 190000
  try {
    const cs = await prisma.costStandardMaster.findFirst()
    if (cs?.maleLaborCost) labor = cs.maleLaborCost
  } catch {
    /* 기본값 사용 */
  }

  const quote = calculateSmallMoveQuote({
    items,
    from: fromInfo,
    to: toInfo,
    distanceKm,
    movingDate: md || null,
    packingService: options.packingService,
    airconCount: options.airconCount,
    laborCostPerPerson: labor,
  })

  const now = new Date()
  let id = ''
  for (let attempt = 0; attempt < 6; attempt++) {
    id = `SM${kstYYMMDD()}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
    try {
      await prisma.smallMoveRequest.create({
        data: {
          id,
          channel: str(body.channel, 40),
          customerName,
          contact,
          homeType,
          movingDate,
          fromAddress,
          toAddress,
          fromInfo: JSON.stringify(fromInfo),
          toInfo: JSON.stringify(toInfo),
          items: JSON.stringify(items),
          photos: JSON.stringify(photos),
          options: JSON.stringify(options),
          memo: str(body.memo, 1000),
          distanceKm,
          totalCbm: quote.totalCbm,
          vehicleLabel: quote.vehicleLabel,
          estMin: quote.min,
          estMax: quote.max,
          estBreakdown: JSON.stringify(quote.breakdown),
          consultRequired: quote.consultRequired,
          privacyConsentAt: now,
          purgeAt: calcPurgeAt(movingDate, now),
        },
      })
      break
    } catch (e: any) {
      if (e?.code === 'P2002' && attempt < 5) continue // 접수번호 충돌 시 재시도
      console.error('small-move create error', e)
      return NextResponse.json({ ok: false, message: '접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 })
    }
  }

  // 문자 발송 (실패해도 접수는 성공 처리)
  const site = process.env.NEXT_PUBLIC_SITE_URL || ''
  void sendSms(
    contact,
    `[톡톡용달이사] 접수완료\n접수번호 ${id}\n예상견적 ${man(quote.min)}~${man(quote.max)} (확정 아님)\n담당자가 사진 확인 후 확정 견적을 문자로 안내드립니다.\n조회: ${site}/s/check`
  )
  const adminPhone = process.env.ADMIN_NOTIFY_PHONE
  if (adminPhone) {
    void sendSms(adminPhone, `[톡톡용달이사] 신규접수 ${id} ${customerName} / ${man(quote.min)}~${man(quote.max)}`, '신규접수')
  }

  return NextResponse.json({
    ok: true,
    id,
    estimate: {
      min: quote.min,
      max: quote.max,
      vehicleLabel: quote.vehicleLabel,
      totalCbm: quote.totalCbm,
      consultRequired: quote.consultRequired,
      consultReasons: quote.consultReasons,
      breakdown: quote.breakdown,
    },
  })
}
