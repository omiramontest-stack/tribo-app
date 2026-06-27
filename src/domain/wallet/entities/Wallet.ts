import type { WalletRules } from './WalletRules'
import type { WalletThemeOverrides } from './WalletTheme'

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
  theme?: WalletThemeOverrides | null
  createdAt: string
  deletedAt?: string | null
}
