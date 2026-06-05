import type { PassData } from './PassData'

export type PassStatus = 'active' | 'completed' | 'archived'

export interface Pass {
  id: string
  walletId: string
  token: string
  firstName: string
  lastName: string
  phone: string
  email?: string
  photoUrl?: string
  customerName: string
  createdAt: string
  data: PassData
  status: PassStatus
  dlExpiresAt?: string
  scannedAt?: string
}
