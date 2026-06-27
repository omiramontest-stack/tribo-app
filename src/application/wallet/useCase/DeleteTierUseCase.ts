import { inject, injectable } from 'inversify'

import tierTypes from '@/infrastructure/tier/di/types'
import type { TierRepository } from '@/domain/wallet/repository/TierRepository'
import type UseCase from '@/application/common/useCase/UseCase'

export interface DeleteTierInput {
  orgId: string
  walletId: string
  tierId: string
}

@injectable()
export default class DeleteTierUseCase implements UseCase<DeleteTierInput, void> {
  constructor(
    @inject(tierTypes.tierRepository)
    private readonly _tierRepository: TierRepository,
  ) {}

  async run({ orgId, walletId, tierId }: DeleteTierInput): Promise<void> {
    await this._tierRepository.delete(orgId, walletId, tierId)
  }
}
