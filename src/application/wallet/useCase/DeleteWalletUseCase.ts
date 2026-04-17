import { inject, injectable } from 'inversify'

import walletTypes from '@/infrastructure/wallet/di/types'
import type { WalletRepository } from '@/domain/wallet/repository/WalletRepository'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class DeleteWalletUseCase implements UseCase<string, void> {
  constructor(
    @inject(walletTypes.walletRepository)
    private readonly _walletRepository: WalletRepository,
  ) {}

  async run(id: string): Promise<void> {
    return this._walletRepository.delete(id)
  }
}
