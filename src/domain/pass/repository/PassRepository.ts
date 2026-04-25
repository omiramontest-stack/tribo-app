import type { Pass } from '@/domain/pass/entities/Pass'
import type { Wallet } from '@/domain/wallet/entities/Wallet'

export type PassAction = 'add_stamp' | 'add_points' | 'renew_membership' | 'add_cashback' | 'subtract_cashback'

export interface CashbackTransaction {
  id: string
  passId: string
  purchaseAmount: number
  cashbackPercent: number
  cashbackAmount: number
  description: string | null
  createdAt: string
}

export interface ApplyActionOptions {
  amount?: number
  purchaseAmount?: number
  cashbackPercent?: number
  description?: string
}

export interface PassWithWalletRaw {
  pass: Pass
  wallet: Wallet
}

export interface PassRepository {
  findByToken(token: string): Promise<PassWithWalletRaw | null>
  findByWalletId(walletId: string): Promise<Pass[]>
  findScanned(walletId: string): Promise<Pass[]>
  save(pass: Pass): Promise<Pass>
  update(pass: Pass): Promise<Pass>
  applyAction(token: string, action: PassAction, options?: ApplyActionOptions): Promise<Pass>
  getTransactions(token: string): Promise<CashbackTransaction[]>
  delete(token: string): Promise<void>
}
