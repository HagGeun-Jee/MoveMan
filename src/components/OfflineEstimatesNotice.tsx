'use client'

import { useEffect, useState } from 'react'
import { localDB, LocalEstimate } from '@/lib/sync/db'
import { syncManager, SyncState } from '@/lib/sync/syncManager'
import Link from 'next/link'
import { format } from 'date-fns'
import { AlertCircle, RefreshCw } from 'lucide-react'

export function OfflineEstimatesNotice() {
  const [pendingList, setPendingList] = useState<LocalEstimate[]>([])
  const [isSyncing, setIsSyncing] = useState(false)

  const loadPending = async () => {
    if (!localDB) return
    try {
      const items = await localDB.estimates
        .filter((e: LocalEstimate) => e.syncStatus === 'pending_create' || e.syncStatus === 'pending_update')
        .toArray()
      setPendingList(items)
    } catch {}
  }

  useEffect(() => {
    loadPending()
    if (!syncManager) return
    const unsub = syncManager.subscribe((state: SyncState) => {
      setIsSyncing(state.isSyncing)
      loadPending()
    })
    return () => unsub()
  }, [])

  if (pendingList.length === 0) return null

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 sm:p-4 mb-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <div>
            <h3 className="font-bold text-amber-900 text-sm">
              단말기 로컬 DB에 보관 중인 미동기화 견적서 ({pendingList.length}건)
            </h3>
            <p className="text-xs text-amber-700">
              현장 오프라인 상태에서 작성/수정된 건입니다. 네트워크 연결 시 [서버 동기화]를 눌러 웹에 반영해주세요.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => syncManager?.syncAll()}
          disabled={isSyncing}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-2xs"
        >
          <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? '동기화 중...' : '지금 웹으로 전송'}
        </button>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-amber-100/60 text-amber-900 border-b border-amber-200">
            <tr>
              <th className="px-3 py-1.5 font-bold">임시코드</th>
              <th className="px-3 py-1.5 font-bold">고객명</th>
              <th className="px-3 py-1.5 font-bold">연락처</th>
              <th className="px-3 py-1.5 font-bold">이사일</th>
              <th className="px-3 py-1.5 font-bold">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-200/60">
            {pendingList.map(item => (
              <tr key={item.id} className="hover:bg-amber-100/30">
                <td className="px-3 py-1.5 font-mono font-bold text-amber-900">{item.id}</td>
                <td className="px-3 py-1.5 font-semibold text-gray-900">{item.customerName || '-'}</td>
                <td className="px-3 py-1.5 text-gray-700">{item.contact || '-'}</td>
                <td className="px-3 py-1.5 text-gray-700">
                  {item.movingDate ? format(new Date(item.movingDate), 'yyyy-MM-dd') : '-'}
                </td>
                <td className="px-3 py-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                    {item.syncStatus === 'pending_create' ? '신규 등록 대기' : '수정 대기'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
