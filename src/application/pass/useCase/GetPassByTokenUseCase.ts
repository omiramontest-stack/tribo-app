import { inject, injectable } from 'inversify'

import walletTypes from '@/infrastructure/wallet/di/types'
import passTypes from '@/infrastructure/pass/di/types'
import type { WalletRepository } from '@/domain/wallet/repository/WalletRepository'
import type { PassRepository } from '@/domain/pass/repository/PassRepository'
import type { Pass } from '@/domain/pass/entities/Pass'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type UseCase from '@/application/common/useCase/UseCase'
import { PassHandlerError } from '@/application/pass/error/PassHandlerError'
import { PassErrorCodes } from '@/application/pass/error/enum/PassErrorCodes'

export interface PassWithWallet {
  pass: Pass
  wallet: Wallet
}

@injectable()
export default class GetPassByTokenUseCase implements UseCase<string, PassWithWallet> {
  constructor(
    @inject(walletTypes.walletRepository)
    private readonly _walletRepository: WalletRepository,
    @inject(passTypes.passRepository)
    private readonly _passRepository: PassRepository,
  ) {}

  async run(token: string): Promise<PassWithWallet> {
    const pass = await this._passRepository.findByToken(token)
    if (!pass) throw new PassHandlerError(PassErrorCodes.NOT_FOUND, 'Pass not found')

    const wallet = await this._walletRepository.findById(pass.walletId)
    if (!wallet) throw new PassHandlerError(PassErrorCodes.WALLET_NOT_FOUND, 'Wallet not found')

    return { pass, wallet }
  }
}
