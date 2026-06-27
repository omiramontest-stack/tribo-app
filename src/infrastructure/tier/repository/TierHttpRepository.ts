import 'reflect-metadata'
import { injectable } from 'inversify'

import type { TierRepository } from '@/domain/wallet/repository/TierRepository'
import type { WalletTier } from '@/domain/wallet/entities/WalletTier'
import type { CreateTierDto } from '@/application/wallet/dto/CreateTierDto'
import type { UpdateTierDto } from '@/application/wallet/dto/UpdateTierDto'
import { apiClient } from '@/infrastructure/http/ApiClient'

@injectable()
export class TierHttpRepository implements TierRepository {
  async findAll(orgId: string, walletId: string): Promise<WalletTier[]> {
    return apiClient.get<WalletTier[]>(
      `/organizations/${orgId}/wallets/${walletId}/tiers`,
    )
  }

  async create(orgId: string, walletId: string, dto: CreateTierDto): Promise<WalletTier> {
    return apiClient.post<WalletTier>(
      `/organizations/${orgId}/wallets/${walletId}/tiers`,
      dto,
    )
  }

  async update(orgId: string, walletId: string, id: string, dto: UpdateTierDto): Promise<WalletTier> {
    return apiClient.patch<WalletTier>(
      `/organizations/${orgId}/wallets/${walletId}/tiers/${id}`,
      dto,
    )
  }

  async delete(orgId: string, walletId: string, id: string): Promise<void> {
    await apiClient.delete(
      `/organizations/${orgId}/wallets/${walletId}/tiers/${id}`,
    )
  }
}
