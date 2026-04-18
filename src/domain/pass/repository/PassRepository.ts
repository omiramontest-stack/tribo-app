import type { Pass } from '@/domain/pass/entities/Pass'

export type PassAction = 'add_stamp' | 'add_points' | 'renew_membership'

export interface PassRepository {
  findByToken(token: string): Promise<Pass | null>
  findByWalletId(walletId: string): Promise<Pass[]>
  save(pass: Pass): Promise<Pass>
  update(pass: Pass): Promise<Pass>
  applyAction(token: string, action: PassAction, amount?: number): Promise<Pass>
  delete(token: string): Promise<void>
}
