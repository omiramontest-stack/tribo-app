import type { WalletRules } from '@/domain/wallet/entities/WalletRules'

export interface UpdateWalletDto {
  businessName?: string
  logoUrl?: string | null
  primaryColor?: string
  accentColor?: string
  description?: string
  businessRules?: string | null
  rules?: WalletRules
}
