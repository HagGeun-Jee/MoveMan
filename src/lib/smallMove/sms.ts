import 'server-only'

// 알리고(Aligo) 문자 발송 모듈
// 환경변수: ALIGO_KEY, ALIGO_USER_ID, ALIGO_SENDER(사전 등록된 발신번호)
// 선택: ALIGO_TEST_MODE=Y (실제 발송 없이 테스트), ADMIN_NOTIFY_PHONE (신규 접수 시 관리자 알림 수신번호)
// 키가 비어 있으면 발송하지 않고 로그만 남긴다.

export function normalizePhone(raw: string) {
  return (raw || '').replace(/[^0-9]/g, '')
}

export function isValidKoreanMobile(raw: string) {
  return /^01[016789][0-9]{7,8}$/.test(normalizePhone(raw))
}

export async function sendSms(receiver: string, message: string, title = '이사견적') {
  const key = process.env.ALIGO_KEY
  const userId = process.env.ALIGO_USER_ID
  const sender = process.env.ALIGO_SENDER
  const to = normalizePhone(receiver)

  if (!key || !userId || !sender) {
    console.log('[SMS:미연동] 알리고 환경변수 미설정 - 발송 생략', to.slice(0, 3) + '****')
    return { ok: false as const, skipped: true as const, message: 'ALIGO 환경변수 미설정' }
  }
  if (!isValidKoreanMobile(to)) {
    return { ok: false as const, skipped: false as const, message: '수신번호 형식 오류' }
  }

  // 한글 45자(90byte) 초과 시 LMS
  const isLms = Buffer.byteLength(message, 'euc-kr' as BufferEncoding) > 90 || message.length > 45
  const body = new URLSearchParams({
    key,
    user_id: userId,
    sender: normalizePhone(sender),
    receiver: to,
    msg: message,
    msg_type: isLms ? 'LMS' : 'SMS',
    title,
  })
  if (process.env.ALIGO_TEST_MODE === 'Y') body.set('testmode_yn', 'Y')

  try {
    const res = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const json = (await res.json()) as { result_code?: number | string; message?: string }
    const ok = Number(json.result_code) === 1
    if (!ok) console.error('[SMS] 알리고 발송 실패', json)
    return { ok, skipped: false as const, message: json.message || '' }
  } catch (e) {
    console.error('[SMS] 알리고 호출 오류', e)
    return { ok: false as const, skipped: false as const, message: '문자 서버 호출 오류' }
  }
}
