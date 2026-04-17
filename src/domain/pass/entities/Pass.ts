import type { PassData } from './PassData'

export interface Pass {
  id: string
  walletId: string
  token: string
  customerName: string
  createdAt: string
  data: PassData
}
