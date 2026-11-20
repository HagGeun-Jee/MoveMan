import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { normalizePhone } from '@/lib/smallMove/sms'
import { rateLimit, clientIp } from '@/lib/smallMove/purge'

export const runtime = 'nodejs'

// 고객 조회: 접수번호 + 연락처가 모두 일치해야 결과 반환 (사진·주소 등 상세는 반환하지 않음)
export async function POST(req: Request) {
  if (!rateLimit('lookup:' + clientIp(req), 20, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, message: '조회 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, { status: 429 })
  }
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: '잘못된 요청입니다.' }, { status: 400 })
  }
  const id = String(body?.id || '').trim().toUpperCase()
  const contact = normalizePhone(String(body?.contact || ''))

  const r = id && contact ? await prisma.smallMoveRequest.findUnique({ where: { id } }) : null
  if (!r || !r.contact || r.contact !== contact) {
    return NextResponse.json({ ok: false, message: '일치하는 접수 내역이 없습니다. 접수번호와 연락처를 확인해 주세요.' }, { status: 404 })
  }
  return NextResponse.json({
    ok: true,
    request: {
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      movingDate: r.movingDate,
      estMin: r.estMin,
      estMax: r.estMax,
      vehicleLabel: r.vehicleLabel,
      finalAmount: r.finalAmount,
      adminComment: r.adminComment,
      quotedAt: r.quotedAt,
    },
  })
}
