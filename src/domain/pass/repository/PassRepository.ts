import type { Pass } from '@/domain/pass/entities/Pass'
import type { Wallet } from '@/domain/wallet/entities/Wallet'

export type PassAction = 'add_stamp' | 'add_points' | 'renew_membership'

export interface PassWithWalletRaw {
  pass: Pass
  wallet: Wallet
}

export interface PassRepository {
  findByToken(token: string): Promise<PassWithWalletRaw | null>
  findByWalletId(walletId: string): Promise<Pass[]>
  save(pass: Pass): Promise<Pass>
  update(pass: Pass): Promise<Pass>
  applyAction(token: string, action: PassAction, amount?: number): Promise<Pass>
  delete(token: string): Promise<void>
}
