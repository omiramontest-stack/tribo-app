import type { WalletRules } from './WalletRules'

export type WalletType = 'stamps' | 'membership' | 'points' | 'cashback' | 'daypass' | 'bundle' | 'giftcard' | 'coupon'

export interface Wallet {
  id: string
  organizationId?: string
  type: WalletType
  businessName: string
  logoUrl: string | null
  primaryColor: string
  accentColor: string
  description: string
  businessRules?: string | null
  rules: WalletRules
  createdAt: string
  deletedAt?: string | null
}
