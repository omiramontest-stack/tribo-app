import { inject, injectable } from 'inversify'

import walletTypes from '@/infrastructure/wallet/di/types'
import type { WalletRepository } from '@/domain/wallet/repository/WalletRepository'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class GetWalletsUseCase implements UseCase<string, Wallet[]> {
  constructor(
    @inject(walletTypes.walletRepository)
    private readonly _walletRepository: WalletRepository,
  ) {}

  async run(orgId: string): Promise<Wallet[]> {
    return this._walletRepository.findAll(orgId)
  }
}
