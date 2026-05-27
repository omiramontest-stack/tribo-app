import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { UpdateWalletDto } from '@/application/wallet/dto/UpdateWalletDto'

export interface WalletRepository {
  findAll(orgId: string): Promise<Wallet[]>
  findById(orgId: string, id: string): Promise<Wallet | null>
  save(orgId: string, wallet: Wallet): Promise<Wallet>
  update(orgId: string, id: string, dto: UpdateWalletDto): Promise<Wallet>
  delete(orgId: string, id: string): Promise<void>
}
