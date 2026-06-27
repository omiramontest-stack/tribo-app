import { inject, injectable } from 'inversify'

import tierTypes from '@/infrastructure/tier/di/types'
import type { TierRepository } from '@/domain/wallet/repository/TierRepository'
import type { WalletTier } from '@/domain/wallet/entities/WalletTier'
import type { CreateTierDto } from '@/application/wallet/dto/CreateTierDto'
import type UseCase from '@/application/common/useCase/UseCase'

export type CreateTierInput = CreateTierDto & { orgId: string; walletId: string }

@injectable()
export default class CreateTierUseCase implements UseCase<CreateTierInput, WalletTier> {
  constructor(
    @inject(tierTypes.tierRepository)
    private readonly _tierRepository: TierRepository,
  ) {}

  async run({ orgId, walletId, ...dto }: CreateTierInput): Promise<WalletTier> {
    return this._tierRepository.create(orgId, walletId, dto)
  }
}
