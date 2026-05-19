import type { PassData } from './PassData'

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
  dlExpiresAt?: string
  scannedAt?: string
}
