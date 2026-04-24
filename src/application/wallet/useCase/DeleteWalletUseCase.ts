import { inject, injectable } from 'inversify'

import walletTypes from '@/infrastructure/wallet/di/types'
import type { WalletRepository } from '@/domain/wallet/repository/WalletRepository'
import type UseCase from '@/application/common/useCase/UseCase'

export type DeleteWalletInput = { orgId: string; id: string }

@injectable()
export default class DeleteWalletUseCase implements UseCase<DeleteWalletInput, void> {
  constructor(
    @inject(walletTypes.walletRepository)
    private readonly _walletRepository: WalletRepository,
  ) {}

  async run({ orgId, id }: DeleteWalletInput): Promise<void> {
    return this._walletRepository.delete(orgId, id)
  }
}
