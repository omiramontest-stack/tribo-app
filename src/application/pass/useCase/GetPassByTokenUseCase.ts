import { inject, injectable } from 'inversify'

import passTypes from '@/infrastructure/pass/di/types'
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
    @inject(passTypes.passRepository)
    private readonly _passRepository: PassRepository,
  ) {}

  async run(token: string): Promise<PassWithWallet> {
    const result = await this._passRepository.findByToken(token)
    if (!result) throw new PassHandlerError(PassErrorCodes.NOT_FOUND, 'Pass not found')
    return result
  }
}
