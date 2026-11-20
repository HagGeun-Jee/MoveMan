'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { decrypt } from '@/lib/session'
import { sendSms } from '@/lib/smallMove/sms'
import { calcPurgeAt } from '@/lib/smallMove/purge'

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

  await prisma.smallMoveRequest.update({ where: { id }, data })

  if (sendSmsFlag && cur.contact) {
    const site = process.env.NEXT_PUBLIC_SITE_URL || ''
    const amountText = finalAmount != null ? `확정 견적 ${finalAmount.toLocaleString('ko-KR')}원` : '견적 안내'
    const msg = `[이사견적 ${status === 'QUOTED' ? '확정' : '안내'}]\n접수번호 ${id}\n${amountText}${comment ? `\n${comment.slice(0, 200)}` : ''}\n조회: ${site}/s/check`
    await sendSms(cur.contact, msg)
  }

  revalidatePath('/small-moves')
  revalidatePath(`/small-moves/${id}`)
}
