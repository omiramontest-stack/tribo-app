import type { Wallet } from '@/domain/wallet/entities/Wallet'

export interface WalletRepository {
  findAll(): Promise<Wallet[]>
  findById(id: string): Promise<Wallet | null>
  save(wallet: Wallet): Promise<Wallet>
  delete(id: string): Promise<void>
}
