import { inject, injectable } from 'inversify'

import walletTypes from '@/infrastructure/wallet/di/types'
import type { WalletRepository } from '@/domain/wallet/repository/WalletRepository'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type UseCase from '@/application/common/useCase/UseCase'
import type { UpdateWalletDto } from '@/application/wallet/dto/UpdateWalletDto'

export type UpdateWalletInput = UpdateWalletDto & { orgId: string; id: string }

@injectable()
export default class UpdateWalletUseCase implements UseCase<UpdateWalletInput, Wallet> {
  constructor(
    @inject(walletTypes.walletRepository)
    private readonly _walletRepository: WalletRepository,
  ) {}

  async run({ orgId, id, ...dto }: UpdateWalletInput): Promise<Wallet> {
    return this._walletRepository.update(orgId, id, dto)
  }
}
