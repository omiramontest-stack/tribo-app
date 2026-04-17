import { inject, injectable } from 'inversify'

import walletTypes from '@/infrastructure/wallet/di/types'
import type { WalletRepository } from '@/domain/wallet/repository/WalletRepository'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type UseCase from '@/application/common/useCase/UseCase'
import type { CreateWalletDto } from '@/application/wallet/dto/CreateWalletDto'

@injectable()
export default class CreateWalletUseCase implements UseCase<CreateWalletDto, Wallet> {
  constructor(
    @inject(walletTypes.walletRepository)
    private readonly _walletRepository: WalletRepository,
  ) {}

  async run(dto: CreateWalletDto): Promise<Wallet> {
    const wallet: Wallet = {
      id: crypto.randomUUID(),
      type: dto.type,
      businessName: dto.businessName,
      logoUrl: dto.logoUrl ?? null,
      primaryColor: dto.primaryColor,
      accentColor: dto.accentColor,
      description: dto.description,
      rules: dto.rules,
      createdAt: new Date().toISOString(),
    }
    return this._walletRepository.save(wallet)
  }
}
