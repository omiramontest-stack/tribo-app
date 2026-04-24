import type { Wallet } from '@/domain/wallet/entities/Wallet'

export interface WalletRepository {
  findAll(orgId: string): Promise<Wallet[]>
  findById(orgId: string, id: string): Promise<Wallet | null>
  save(orgId: string, wallet: Wallet): Promise<Wallet>
  delete(orgId: string, id: string): Promise<void>
}
