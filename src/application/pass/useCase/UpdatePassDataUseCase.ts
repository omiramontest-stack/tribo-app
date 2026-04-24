import { inject, injectable } from 'inversify'

import walletTypes from '@/infrastructure/wallet/di/types'
import passTypes from '@/infrastructure/pass/di/types'
import type { WalletRepository } from '@/domain/wallet/repository/WalletRepository'
import type { PassRepository } from '@/domain/pass/repository/PassRepository'
import type UseCase from '@/application/common/useCase/UseCase'
import type { UpdatePassDataDto } from '@/application/pass/dto/UpdatePassDataDto'
import type { PassWithWallet } from '@/application/pass/useCase/GetPassByTokenUseCase'
import { PassHandlerError } from '@/application/pass/error/PassHandlerError'
import { PassErrorCodes } from '@/application/pass/error/enum/PassErrorCodes'

@injectable()
export default class UpdatePassDataUseCase implements UseCase<UpdatePassDataDto, PassWithWallet> {
  constructor(
    @inject(walletTypes.walletRepository)
    private readonly _walletRepository: WalletRepository,
    @inject(passTypes.passRepository)
    private readonly _passRepository: PassRepository,
  ) {}

  async run(dto: UpdatePassDataDto): Promise<PassWithWallet> {
    const updatedPass = await this._passRepository.applyAction(dto.token, dto.action, dto.amount)

    const wallet = await this._walletRepository.findById(dto.orgId, updatedPass.walletId)
    if (!wallet) throw new PassHandlerError(PassErrorCodes.WALLET_NOT_FOUND, 'Wallet not found')

    return { pass: updatedPass, wallet }
  }
}
