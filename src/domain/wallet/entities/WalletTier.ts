import type { WalletRules } from './WalletRules'
import type { WalletThemeOverrides } from './WalletTheme'

export interface UpgradeRule {
  type: 'cycles_completed'
  threshold: number
}

export interface WalletTier {
  id: string
  walletId: string
  level: number
  name: string
  rules: WalletRules
  config: WalletThemeOverrides | null
  unlockRule: UpgradeRule
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}
