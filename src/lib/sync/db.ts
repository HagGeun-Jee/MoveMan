import Dexie, { Table } from 'dexie'

export interface LocalEstimate {
  id: string // 서버 ID (예: P2610160001) 또는 로컬 임시 ID (LOCAL_...)
  customerName: string
  contact: string
  movingType: string
  estimateDate: string
  visitDate?: string | null
  movingDate?: string | null
  organizeDate?: string | null
  fromAddress: string
  toAddress: string
  cbmItems?: string | null
  materials?: string | null
  environment?: string | null
  paymentPlan?: string | null
  movingCost: number
  additionalCost: number
  storageCost: number
  vat: number
  totalAmount: number
  syncStatus: 'synced' | 'pending_create' | 'pending_update' | 'pending_delete'
  updatedAt: number // 타임스탬프 (ms)
}

export interface SyncQueueItem {
  id?: number
  entityType: 'estimate' | 'material_transfer' | 'material_audit'
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  entityId: string
  payload: any
  timestamp: number
  attempts: number
  lastError?: string
}

export interface MasterDataItem {
  key: string // 'categories' | 'standardItems' | 'vehicles' | 'labors' | 'ladders' | 'materials' | 'locations'
  data: any
  updatedAt: number
}

export interface SyncMetaItem {
  key: string // 'lastSyncTime' | 'deviceId'
  value: any
}

export class MemanLocalDatabase extends Dexie {
  estimates!: Table<LocalEstimate, string>
  syncQueue!: Table<SyncQueueItem, number>
  masterData!: Table<MasterDataItem, string>
  syncMeta!: Table<SyncMetaItem, string>

  constructor() {
    super('MemanLocalDB')
    this.version(1).stores({
      estimates: 'id, syncStatus, customerName, movingDate, updatedAt',
      syncQueue: '++id, entityType, action, entityId, timestamp',
      masterData: 'key, updatedAt',
      syncMeta: 'key'
    })
  }
}

// 클라이언트 환경에서 싱글톤 인스턴스 생성
export const localDB = typeof window !== 'undefined' ? new MemanLocalDatabase() : null as any
