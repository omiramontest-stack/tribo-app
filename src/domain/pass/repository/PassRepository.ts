import type { Pass } from '@/domain/pass/entities/Pass'

export interface PassRepository {
  findByToken(token: string): Promise<Pass | null>
  findByWalletId(walletId: string): Promise<Pass[]>
  save(pass: Pass): Promise<Pass>
  update(pass: Pass): Promise<Pass>
}
