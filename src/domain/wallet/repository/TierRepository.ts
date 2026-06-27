import type { WalletTier } from '@/domain/wallet/entities/WalletTier'
import type { CreateTierDto } from '@/application/wallet/dto/CreateTierDto'
import type { UpdateTierDto } from '@/application/wallet/dto/UpdateTierDto'

export interface TierRepository {
  findAll(orgId: string, walletId: string): Promise<WalletTier[]>
  create(orgId: string, walletId: string, dto: CreateTierDto): Promise<WalletTier>
  update(orgId: string, walletId: string, id: string, dto: UpdateTierDto): Promise<WalletTier>
  delete(orgId: string, walletId: string, id: string): Promise<void>
}
