import { ContainerModule } from 'inversify'
import type { interfaces } from 'inversify'

import walletTypes from '@/infrastructure/wallet/di/types'
import type { WalletRepository } from '@/domain/wallet/repository/WalletRepository'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type UseCase from '@/application/common/useCase/UseCase'
import type { CreateWalletDto } from '@/application/wallet/dto/CreateWalletDto'

import { WalletHttpRepository } from '@/infrastructure/wallet/repository/WalletHttpRepository'
import CreateWalletUseCase from '@/application/wallet/useCase/CreateWalletUseCase'
import UpdateWalletUseCase from '@/application/wallet/useCase/UpdateWalletUseCase'
import GetWalletsUseCase from '@/application/wallet/useCase/GetWalletsUseCase'
import GetWalletByIdUseCase from '@/application/wallet/useCase/GetWalletByIdUseCase'
import DeleteWalletUseCase from '@/application/wallet/useCase/DeleteWalletUseCase'

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<WalletRepository>(walletTypes.walletRepository).to(WalletHttpRepository)
  bind<UseCase<CreateWalletDto, Wallet>>(walletTypes.createWalletUseCase).to(CreateWalletUseCase)
  // @ts-ignore
  bind<UseCase<void, Wallet>>(walletTypes.updateWalletUseCase).to(UpdateWalletUseCase)
  // @ts-ignore
  bind<UseCase<void, Wallet[]>>(walletTypes.getWalletsUseCase).to(GetWalletsUseCase)
  // @ts-ignore
  bind<UseCase<string, Wallet>>(walletTypes.getWalletByIdUseCase).to(GetWalletByIdUseCase)
  // @ts-ignore
  bind<UseCase<string, void>>(walletTypes.deleteWalletUseCase).to(DeleteWalletUseCase)
})
