import { inject, injectable } from 'inversify'

import tierTypes from '@/infrastructure/tier/di/types'
import type { TierRepository } from '@/domain/wallet/repository/TierRepository'
import type { WalletTier } from '@/domain/wallet/entities/WalletTier'
import type { UpdateTierDto } from '@/application/wallet/dto/UpdateTierDto'
import type UseCase from '@/application/common/useCase/UseCase'

export type UpdateTierInput = UpdateTierDto & { orgId: string; walletId: string; tierId: string }

@injectable()
export default class UpdateTierUseCase implements UseCase<UpdateTierInput, WalletTier> {
  constructor(
    @inject(tierTypes.tierRepository)
    private readonly _tierRepository: TierRepository,
  ) {}

  async run({ orgId, walletId, tierId, ...dto }: UpdateTierInput): Promise<WalletTier> {
    return this._tierRepository.update(orgId, walletId, tierId, dto)
  }
}
