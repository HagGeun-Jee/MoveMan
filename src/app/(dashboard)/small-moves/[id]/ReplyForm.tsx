'use client'

import { useState } from 'react'
import { STATUS_LABEL } from '@/lib/smallMove/catalog'
import { buildReplySms, smsBytes } from '@/lib/smallMove/smsText'
import { updateSmallMoveAction } from '@/app/actions/smallMove'
import { START_TIME_OPTIONS } from '@/lib/smallMove/format'

export function ReplyForm(props: {
  id: string
  contact: string
  status: string
  finalAmount: number | null
  suggestedAmount: number
  adminComment: string
  siteUrl: string
  startTime: string
}) {
  const [status, setStatus] = useState(props.status)
  const [amountText, setAmountText] = useState(String(props.finalAmount ?? props.suggestedAmount))
  const [comment, setComment] = useState(props.adminComment)
  const [sendSms, setSendSms] = useState(false)
  const [startTime, setStartTime] = useState(props.startTime)

  const digits = amountText.replace(/[^0-9]/g, '')
  const finalAmount = digits ? parseInt(digits, 10) : null
  const preview = buildReplySms({ id: props.id, status, finalAmount, comment, siteUrl: props.siteUrl })
  const bytes = smsBytes(preview)

  return (
    <form action={updateSmallMoveAction} className="bg-white rounded-2xl border-2 border-blue-200 p-4 space-y-3 text-sm">
      <h2 className="font-black">견적 확정 / 회신</h2>
      <input type="hidden" name="id" value={props.id} />
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="font-bold">상태</span>
          <select name="status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="font-bold">확정 금액(원)</span>
          <input
            name="finalAmount"
            inputMode="numeric"
            value={digits ? Number(digits).toLocaleString('ko-KR') : ''}
            onChange={(e) => setAmountText(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="font-bold">작업 시작 시간 (24시간)</span>
        <select name="startTime" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
          <option value="">미정</option>
          {START_TIME_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="font-bold">고객 안내 코멘트 (고객 조회 화면·문자에 표시)</span>
        <textarea name="adminComment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
      </label>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-gray-700">📱 문자 미리보기 (수신: {props.contact || '번호 없음'})</span>
          <span className={bytes > 90 ? 'text-amber-700 font-bold' : 'text-gray-500'}>
            {bytes}byte · {bytes > 90 ? 'LMS(장문)' : 'SMS(단문)'}
          </span>
        </div>
        <div className="max-w-xs bg-yellow-50 border border-yellow-200 rounded-2xl rounded-tl-sm px-3.5 py-3 text-[13px] leading-relaxed text-gray-900 whitespace-pre-wrap break-all shadow-xs">
          {preview}
        </div>
        {!props.siteUrl && (
          <p className="text-xs text-red-600">NEXT_PUBLIC_SITE_URL 환경변수가 없어 문자의 조회 링크가 "/s/check"로만 표시됩니다.</p>
        )}
      </div>

      <label className="flex items-center gap-2 font-bold">
        <input type="checkbox" name="sendSms" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} className="w-4 h-4" /> 저장 후 위 내용으로 고객에게 문자 발송
      </label>
      <button type="submit" className="w-full bg-blue-600 text-white font-black rounded-xl py-2.5">
        {sendSms ? '저장 후 문자 발송' : '저장'}
      </button>
    </form>
  )
}
