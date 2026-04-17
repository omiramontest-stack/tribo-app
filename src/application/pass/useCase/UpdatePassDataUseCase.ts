import { inject, injectable } from 'inversify'

import walletTypes from '@/infrastructure/wallet/di/types'
import passTypes from '@/infrastructure/pass/di/types'
import type { WalletRepository } from '@/domain/wallet/repository/WalletRepository'
import type { PassRepository } from '@/domain/pass/repository/PassRepository'
import type UseCase from '@/application/common/useCase/UseCase'
import type { UpdatePassDataDto } from '@/application/pass/dto/UpdatePassDataDto'
import type { PassWithWallet } from '@/application/pass/useCase/GetPassByTokenUseCase'
import type { StampsRules, MembershipRules, PointsRules } from '@/domain/wallet/entities/WalletRules'
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
    const pass = await this._passRepository.findByToken(dto.token)
    if (!pass) throw new PassHandlerError(PassErrorCodes.NOT_FOUND, 'Pass not found')

    const wallet = await this._walletRepository.findById(pass.walletId)
    if (!wallet) throw new PassHandlerError(PassErrorCodes.WALLET_NOT_FOUND, 'Wallet not found')

    if (dto.action === 'add_stamp' && pass.data.type === 'stamps') {
      const rules = wallet.rules as StampsRules
      pass.data = {
        ...pass.data,
        currentStamps: Math.min(pass.data.currentStamps + 1, rules.totalStamps),
      }
    }

    if (dto.action === 'add_points' && pass.data.type === 'points') {
      pass.data = {
        ...pass.data,
        currentPoints: pass.data.currentPoints + (dto.amount ?? 1),
      }
    }

    if (dto.action === 'renew_membership' && pass.data.type === 'membership') {
      const rules = wallet.rules as MembershipRules
      const expiresAt = rules.expiresInDays
        ? new Date(Date.now() + rules.expiresInDays * 86400000).toISOString()
        : null
      pass.data = { ...pass.data, expiresAt }
    }

    const updated = await this._passRepository.update(pass)
    return { pass: updated, wallet }
  }
}
