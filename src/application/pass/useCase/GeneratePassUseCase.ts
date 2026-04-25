import { inject, injectable } from 'inversify'

import walletTypes from '@/infrastructure/wallet/di/types'
import passTypes from '@/infrastructure/pass/di/types'
import type { WalletRepository } from '@/domain/wallet/repository/WalletRepository'
import type { PassRepository } from '@/domain/pass/repository/PassRepository'
import type { Pass } from '@/domain/pass/entities/Pass'
import type { PassData } from '@/domain/pass/entities/PassData'
import type { WalletType } from '@/domain/wallet/entities/Wallet'
import type { WalletRules, MembershipRules } from '@/domain/wallet/entities/WalletRules'
import type UseCase from '@/application/common/useCase/UseCase'
import type { GeneratePassDto } from '@/application/pass/dto/GeneratePassDto'
import { PassHandlerError } from '@/application/pass/error/PassHandlerError'
import { PassErrorCodes } from '@/application/pass/error/enum/PassErrorCodes'

@injectable()
export default class GeneratePassUseCase implements UseCase<GeneratePassDto, Pass> {
  constructor(
    @inject(walletTypes.walletRepository)
    private readonly _walletRepository: WalletRepository,
    @inject(passTypes.passRepository)
    private readonly _passRepository: PassRepository,
  ) {}

  async run(dto: GeneratePassDto): Promise<Pass> {
    const wallet = await this._walletRepository.findById(dto.orgId, dto.walletId)
    if (!wallet)
      throw new PassHandlerError(PassErrorCodes.WALLET_NOT_FOUND, 'Wallet not found')

    const now = new Date().toISOString()
    const pass: Pass = {
      id: crypto.randomUUID(),
      walletId: dto.walletId,
      token: crypto.randomUUID(),
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      customerName: `${dto.firstName} ${dto.lastName}`,
      createdAt: now,
      data: this._buildPassData(wallet.type, wallet.rules, now),
    }
    return this._passRepository.save(pass)
  }

  private _buildPassData(type: WalletType, rules: WalletRules, now: string): PassData {
    switch (type) {
      case 'stamps':
        return { type: 'stamps', currentStamps: 0 }
      case 'membership': {
        const r = rules as MembershipRules
        const expiresAt = r.expiresInDays
          ? new Date(Date.now() + r.expiresInDays * 86400000).toISOString()
          : null
        return { type: 'membership', memberSince: now, expiresAt }
      }
      case 'points':
        return { type: 'points', currentPoints: 0 }
      case 'cashback':
        return { type: 'cashback', balance: 0 }
      case 'daypass':
        return { type: 'daypass', used: false }
    }
  }
}
