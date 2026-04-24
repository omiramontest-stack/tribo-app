import { inject, injectable } from 'inversify'

import walletTypes from '@/infrastructure/wallet/di/types'
import type { WalletRepository } from '@/domain/wallet/repository/WalletRepository'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type UseCase from '@/application/common/useCase/UseCase'
import { WalletHandlerError } from '@/application/wallet/error/WalletHandlerError'
import { WalletErrorCodes } from '@/application/wallet/error/enum/WalletErrorCodes'

export type GetWalletByIdInput = { orgId: string; id: string }

@injectable()
export default class GetWalletByIdUseCase implements UseCase<GetWalletByIdInput, Wallet> {
  constructor(
    @inject(walletTypes.walletRepository)
    private readonly _walletRepository: WalletRepository,
  ) {}

  async run({ orgId, id }: GetWalletByIdInput): Promise<Wallet> {
    const wallet = await this._walletRepository.findById(orgId, id)
    if (!wallet) throw new WalletHandlerError(WalletErrorCodes.NOT_FOUND, `Wallet ${id} not found`)
    return wallet
  }
}
