import type { WalletRules } from '@/domain/wallet/entities/WalletRules'
import type { WalletThemeOverrides } from '@/domain/wallet/entities/WalletTheme'

export interface UpdateWalletDto {
  businessName?: string
  logoUrl?: string | null
  primaryColor?: string
  accentColor?: string
  description?: string
  businessRules?: string | null
  rules?: WalletRules
  theme?: WalletThemeOverrides | null
}
