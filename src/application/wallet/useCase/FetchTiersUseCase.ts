import { inject, injectable } from 'inversify'

import tierTypes from '@/infrastructure/tier/di/types'
import type { TierRepository } from '@/domain/wallet/repository/TierRepository'
import type { WalletTier } from '@/domain/wallet/entities/WalletTier'
import type UseCase from '@/application/common/useCase/UseCase'

export interface FetchTiersInput {
  orgId: string
  walletId: string
}

@injectable()
export default class FetchTiersUseCase implements UseCase<FetchTiersInput, WalletTier[]> {
  constructor(
    @inject(tierTypes.tierRepository)
    private readonly _tierRepository: TierRepository,
  ) {}

  async run({ orgId, walletId }: FetchTiersInput): Promise<WalletTier[]> {
    return this._tierRepository.findAll(orgId, walletId)
  }
}
