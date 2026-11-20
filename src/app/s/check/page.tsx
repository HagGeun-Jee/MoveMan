'use client'

import { useState } from 'react'
import Link from 'next/link'
import { STATUS_LABEL } from '@/lib/smallMove/catalog'

interface Found {
  id: string
  status: string
  createdAt: string
  movingDate: string | null
  estMin: number
  estMax: number
  vehicleLabel: string
  finalAmount: number | null
  adminComment: string
}
const won = (n: number) => n.toLocaleString('ko-KR') + '원'

export default function SmallMoveCheckPage() {
  const [id, setId] = useState('')
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [found, setFound] = useState<Found | null>(null)

  const lookup = async () => {
    setError('')
    setFound(null)
    setLoading(true)
    try {
      const res = await fetch('/api/public/small-move/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, contact }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) setError(json.message || '조회에 실패했습니다.')
      else setFound(json.request)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <Link href="/s" className="text-sm text-slate-500">
        ← 처음으로
      </Link>
      <h1 className="text-xl font-black">접수 내역 조회</h1>
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <input value={id} onChange={(e) => setId(e.target.value)} placeholder="접수번호 (예: SM2611200001)" className="w-full border border-slate-300 rounded-xl px-3 py-3 font-mono" />
        <input value={contact} onChange={(e) => setContact(e.target.value)} inputMode="tel" placeholder="접수 시 입력한 휴대폰 번호" className="w-full border border-slate-300 rounded-xl px-3 py-3" />
        <button type="button" onClick={lookup} disabled={loading} className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-black disabled:opacity-60">
          {loading ? '조회 중...' : '조회하기'}
        </button>
        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
      </div>

      {found && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono font-black text-blue-700">{found.id}</span>
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
              {STATUS_LABEL[found.status] || found.status}
            </span>
          </div>
          {found.finalAmount != null ? (
            <div className="bg-blue-600 text-white rounded-xl p-4 text-center">
              <p className="text-sm opacity-90">확정 견적</p>
              <p className="text-3xl font-black">{won(found.finalAmount)}</p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-500">예상 견적 (확정 전)</p>
              <p className="text-xl font-black">
                {won(found.estMin)} ~ {won(found.estMax)}
              </p>
            </div>
          )}
          {found.adminComment && (
            <div className="text-sm bg-amber-50 border border-amber-200 rounded-xl p-3 whitespace-pre-wrap">
              <p className="font-black mb-1">담당자 안내</p>
              {found.adminComment}
            </div>
          )}
          <p className="text-xs text-slate-500">
            접수일 {new Date(found.createdAt).toLocaleDateString('ko-KR')}
            {found.movingDate ? ` · 이사 희망일 ${new Date(found.movingDate).toLocaleDateString('ko-KR')}` : ''}
          </p>
        </div>
      )}
    </div>
  )
}
