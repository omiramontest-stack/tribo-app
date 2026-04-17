import type { WalletType } from '@/domain/wallet/entities/Wallet'
import type { WalletRules } from '@/domain/wallet/entities/WalletRules'

export interface CreateWalletDto {
  type: WalletType
  businessName: string
  logoUrl?: string
  primaryColor: string
  accentColor: string
  description: string
  rules: WalletRules
}
