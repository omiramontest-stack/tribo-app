import type { WalletRules } from '@/domain/wallet/entities/WalletRules'
import type { WalletThemeOverrides } from '@/domain/wallet/entities/WalletTheme'
import type { UpgradeRule } from '@/domain/wallet/entities/WalletTier'

export interface UpdateTierDto {
  name?: string
  rules?: WalletRules
  config?: WalletThemeOverrides | null
  unlockRule?: UpgradeRule
}
