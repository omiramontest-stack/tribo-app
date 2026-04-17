import { ContainerModule } from 'inversify'
import type { interfaces } from 'inversify'

import walletTypes from '@/infrastructure/wallet/di/types'
import type { WalletRepository } from '@/domain/wallet/repository/WalletRepository'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type UseCase from '@/application/common/useCase/UseCase'
import type { CreateWalletDto } from '@/application/wallet/dto/CreateWalletDto'

import { WalletStorageRepository } from '@/infrastructure/wallet/repository/WalletStorageRepository'
import CreateWalletUseCase from '@/application/wallet/useCase/CreateWalletUseCase'
import GetWalletsUseCase from '@/application/wallet/useCase/GetWalletsUseCase'
import GetWalletByIdUseCase from '@/application/wallet/useCase/GetWalletByIdUseCase'
import DeleteWalletUseCase from '@/application/wallet/useCase/DeleteWalletUseCase'

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<WalletRepository>(walletTypes.walletRepository).to(WalletStorageRepository)
  bind<UseCase<CreateWalletDto, Wallet>>(walletTypes.createWalletUseCase).to(CreateWalletUseCase)
  bind<UseCase<void, Wallet[]>>(walletTypes.getWalletsUseCase).to(GetWalletsUseCase)
  bind<UseCase<string, Wallet>>(walletTypes.getWalletByIdUseCase).to(GetWalletByIdUseCase)
  bind<UseCase<string, void>>(walletTypes.deleteWalletUseCase).to(DeleteWalletUseCase)
})
