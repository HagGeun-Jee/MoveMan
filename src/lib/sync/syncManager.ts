'use client'

import { localDB, LocalEstimate, SyncQueueItem } from './db'

export type SyncState = {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  lastSyncTime: Date | null
  error: string | null
}

type SyncListener = (state: SyncState) => void

class SyncManager {
  private listeners: Set<SyncListener> = new Set()
  private state: SyncState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    error: null,
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true))
      window.addEventListener('offline', () => this.handleNetworkChange(false))
      this.init()
    }
  }

  private async init() {
    await this.refreshPendingCount()
    await this.loadLastSyncTime()
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    this.listeners.forEach(l => l(this.state))
  }

  private handleNetworkChange(isOnline: boolean) {
    this.state.isOnline = isOnline
    this.notify()
    if (isOnline) {
      // 네트워크 복구 시 자동 동기화 시도
      this.syncAll().catch(() => {})
    }
  }

  public async refreshPendingCount(): Promise<number> {
    if (!localDB) return 0
    try {
      const count = await localDB.syncQueue.count()
      this.state.pendingCount = count
      this.notify()
      return count
    } catch {
      return 0
    }
  }

  private async loadLastSyncTime() {
    if (!localDB) return
    try {
      const meta = await localDB.syncMeta.get('lastSyncTime')
      if (meta?.value) {
        this.state.lastSyncTime = new Date(meta.value)
        this.notify()
      }
    } catch {}
  }

  // 1. 견적서 오프라인 저장 (로컬 DB 저장 + 동기화 대기열 추가)
  public async saveEstimateOffline(data: any, isNew: boolean): Promise<{ success: boolean; id: string }> {
    if (!localDB) throw new Error('Local database not available')

    const now = Date.now()
    const entityId = isNew 
      ? `LOCAL_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      : data.id

    const localItem: LocalEstimate = {
      id: entityId,
      customerName: data.customerName || '',
      contact: data.contact || '',
      movingType: data.movingType || 'P',
      estimateDate: data.estimateDate || new Date().toISOString(),
      visitDate: data.visitDate || null,
      movingDate: data.movingDate || null,
      organizeDate: data.organizeDate || null,
      fromAddress: data.fromAddress || '',
      toAddress: data.toAddress || '',
      cbmItems: typeof data.cbmItems === 'string' ? data.cbmItems : JSON.stringify(data.cbmItems || []),
      materials: typeof data.materials === 'string' ? data.materials : JSON.stringify(data.materials || {}),
      environment: typeof data.environment === 'string' ? data.environment : JSON.stringify(data.environment || {}),
      paymentPlan: typeof data.paymentPlan === 'string' ? data.paymentPlan : JSON.stringify(data.paymentPlan || {}),
      movingCost: Number(data.movingCost) || 0,
      additionalCost: Number(data.additionalCost) || 0,
      storageCost: Number(data.storageCost) || 0,
      vat: Number(data.vat) || 0,
      totalAmount: Number(data.totalAmount) || 0,
      syncStatus: isNew ? 'pending_create' : 'pending_update',
      updatedAt: now,
    }

    // 로컬 테이블에 즉시 저장
    await localDB.estimates.put(localItem)

    // 동기화 큐에 추가
    await localDB.syncQueue.add({
      entityType: 'estimate',
      action: isNew ? 'CREATE' : 'UPDATE',
      entityId: entityId,
      payload: data,
      timestamp: now,
      attempts: 0
    })

    await this.refreshPendingCount()

    // 온라인이면 백그라운드로 즉시 동기화 시도
    if (this.state.isOnline) {
      this.syncAll().catch(() => {})
    }

    return { success: true, id: entityId }
  }

  // 2. 전체 양방향 동기화 (Push -> Pull)
  public async syncAll(): Promise<{ success: boolean; pushed: number; pulled: number; error?: string }> {
    if (!localDB) return { success: false, pushed: 0, pulled: 0, error: '로컬 DB를 사용할 수 없습니다.' }
    if (this.state.isSyncing) return { success: false, pushed: 0, pulled: 0, error: '이미 동기화 진행 중입니다.' }

    this.state.isSyncing = true
    this.state.error = null
    this.notify()

    let pushedCount = 0
    let pulledCount = 0

    try {
      // ── Step 1: PUSH (로컬 변경분을 서버로 전송) ──
      const queueItems = await localDB.syncQueue.toArray()
      if (queueItems.length > 0) {
        const pushRes = await fetch('/api/sync/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: queueItems }),
        })

        if (!pushRes.ok) {
          throw new Error(`서버 업로드 실패 (상태코드: ${pushRes.status})`)
        }

        const pushData = await pushRes.json()
        if (pushData.results && Array.isArray(pushData.results)) {
          for (const res of pushData.results) {
            if (res.status === 'success') {
              pushedCount++
              // 임시 LOCAL_ ID를 공식 서버 ID로 치환
              if (res.clientTempId && res.serverId && res.clientTempId !== res.serverId) {
                const existing = await localDB.estimates.get(res.clientTempId)
                if (existing) {
                  await localDB.estimates.delete(res.clientTempId)
                  await localDB.estimates.put({
                    ...existing,
                    id: res.serverId,
                    syncStatus: 'synced',
                  })
                }
              } else if (res.serverId) {
                const existing = await localDB.estimates.get(res.serverId)
                if (existing) {
                  await localDB.estimates.update(res.serverId, { syncStatus: 'synced' })
                }
              }
              // 큐에서 제거
              if (res.queueId) {
                await localDB.syncQueue.delete(res.queueId)
              }
            }
          }
        }
      }

      // ── Step 2: PULL (서버의 최신 마스터 데이터 및 견적서 다운로드) ──
      const lastSyncMeta = await localDB.syncMeta.get('lastSyncTime')
      const sinceParam = lastSyncMeta?.value ? `?since=${encodeURIComponent(lastSyncMeta.value)}` : ''

      const pullRes = await fetch(`/api/sync/pull${sinceParam}`)
      if (!pullRes.ok) {
        throw new Error(`서버 다운로드 실패 (상태코드: ${pullRes.status})`)
      }

      const pullData = await pullRes.json()

      // 마스터 데이터 로컬 캐싱
      if (pullData.masterData) {
        for (const [key, val] of Object.entries(pullData.masterData)) {
          await localDB.masterData.put({
            key,
            data: val,
            updatedAt: Date.now()
          })
        }
      }

      // 견적서 로컬 갱신
      if (pullData.estimates && Array.isArray(pullData.estimates)) {
        for (const est of pullData.estimates) {
          // 로컬에서 현재 수정 대기 중(pending_update)인 것은 덮어쓰지 않고 보존
          const localEst = await localDB.estimates.get(est.id)
          if (localEst && (localEst.syncStatus === 'pending_update' || localEst.syncStatus === 'pending_create')) {
            continue
          }

          pulledCount++
          await localDB.estimates.put({
            id: est.id,
            customerName: est.customerName,
            contact: est.contact,
            movingType: est.movingType,
            estimateDate: est.estimateDate,
            visitDate: est.visitDate,
            movingDate: est.movingDate,
            organizeDate: est.organizeDate,
            fromAddress: est.fromAddress,
            toAddress: est.toAddress,
            cbmItems: est.cbmItems,
            materials: est.materials,
            environment: est.environment,
            paymentPlan: est.paymentPlan,
            movingCost: est.movingCost,
            additionalCost: est.additionalCost,
            storageCost: est.storageCost,
            vat: est.vat,
            totalAmount: est.totalAmount,
            syncStatus: 'synced',
            updatedAt: new Date(est.updatedAt).getTime()
          })
        }
      }

      // 동기화 완료 시점 저장
      const syncTime = new Date(pullData.serverTime || Date.now())
      await localDB.syncMeta.put({ key: 'lastSyncTime', value: syncTime.toISOString() })
      this.state.lastSyncTime = syncTime
      await this.refreshPendingCount()

      this.state.isSyncing = false
      this.notify()

      return { success: true, pushed: pushedCount, pulled: pulledCount }
    } catch (err: any) {
      console.error('syncAll Error:', err)
      this.state.isSyncing = false
      this.state.error = err.message || '동기화 중 오류가 발생했습니다.'
      await this.refreshPendingCount()
      this.notify()
      return { success: false, pushed: pushedCount, pulled: pulledCount, error: this.state.error || undefined }
    }
  }

  public getState(): SyncState {
    return this.state
  }
}

export const syncManager = typeof window !== 'undefined' ? new SyncManager() : null as any
