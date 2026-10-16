'use client'

import { useEffect, useState } from 'react'
import { syncManager, SyncState } from '@/lib/sync/syncManager'
import { RefreshCw, Wifi, WifiOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

export function SyncStatusBar() {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    error: null,
  })
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!syncManager) return
    const unsubscribe = syncManager.subscribe((state: SyncState) => {
      setSyncState({ ...state })
    })
    return () => unsubscribe()
  }, [])

  const handleManualSync = async () => {
    if (!syncManager || syncState.isSyncing) return
    const res = await syncManager.syncAll()
    if (res.success) {
      setToastMessage(`동기화 완료 (업로드: ${res.pushed}건, 최신 수신: ${res.pulled}건)`)
      setTimeout(() => setToastMessage(null), 3500)
    } else {
      setToastMessage(`동기화 실패: ${res.error || '네트워크 상태를 확인해주세요.'}`)
      setTimeout(() => setToastMessage(null), 4000)
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2 shadow-2xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
        
        {/* 좌측: 네트워크 및 로컬 상태 */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {syncState.isOnline ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-xs">
              <Wifi size={13} className="text-emerald-600 animate-pulse" />
              온라인
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-semibold border border-red-200 text-xs">
              <WifiOff size={13} className="text-red-600" />
              오프라인 (자체DB 작동)
            </span>
          )}

          {syncState.pendingCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-300 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              미동기화 {syncState.pendingCount}건 대기
            </span>
          ) : (
            <span className="text-gray-500 hidden sm:inline-flex items-center gap-1 text-xs">
              <CheckCircle2 size={13} className="text-emerald-500" />
              모든 데이터 일치
            </span>
          )}

          {syncState.lastSyncTime && (
            <span className="text-gray-400 text-xs hidden md:inline">
              최종 동기화: {format(syncState.lastSyncTime, 'HH:mm:ss')}
            </span>
          )}
        </div>

        {/* 우측: 토스트 메시지 및 동기화 버튼 */}
        <div className="flex items-center gap-2 ml-auto">
          {toastMessage && (
            <span className={`text-xs px-2.5 py-0.5 rounded font-medium ${
              toastMessage.includes('실패') 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {toastMessage}
            </span>
          )}

          <button
            type="button"
            onClick={handleManualSync}
            disabled={syncState.isSyncing || !syncState.isOnline}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
              syncState.isSyncing
                ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
                : !syncState.isOnline
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                : syncState.pendingCount > 0
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow'
            }`}
          >
            <RefreshCw 
              size={13} 
              className={syncState.isSyncing ? 'animate-spin' : ''} 
            />
            <span>{syncState.isSyncing ? '동기화 중...' : '서버 동기화'}</span>
          </button>
        </div>

      </div>
    </div>
  )
}
