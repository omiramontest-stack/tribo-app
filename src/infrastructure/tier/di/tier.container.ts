import { ContainerModule } from 'inversify'
import type { interfaces } from 'inversify'

import tierTypes from '@/infrastructure/tier/di/types'
import type { TierRepository } from '@/domain/wallet/repository/TierRepository'
import type { WalletTier } from '@/domain/wallet/entities/WalletTier'
import type UseCase from '@/application/common/useCase/UseCase'
import type { FetchTiersInput } from '@/application/wallet/useCase/FetchTiersUseCase'
import type { CreateTierInput } from '@/application/wallet/useCase/CreateTierUseCase'
import type { UpdateTierInput } from '@/application/wallet/useCase/UpdateTierUseCase'
import type { DeleteTierInput } from '@/application/wallet/useCase/DeleteTierUseCase'

import { TierHttpRepository } from '@/infrastructure/tier/repository/TierHttpRepository'
import FetchTiersUseCase from '@/application/wallet/useCase/FetchTiersUseCase'
import CreateTierUseCase from '@/application/wallet/useCase/CreateTierUseCase'
import UpdateTierUseCase from '@/application/wallet/useCase/UpdateTierUseCase'
import DeleteTierUseCase from '@/application/wallet/useCase/DeleteTierUseCase'

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<TierRepository>(tierTypes.tierRepository).to(TierHttpRepository)
  // @ts-ignore
  bind<UseCase<FetchTiersInput, WalletTier[]>>(tierTypes.fetchTiersUseCase).to(FetchTiersUseCase)
  // @ts-ignore
  bind<UseCase<CreateTierInput, WalletTier>>(tierTypes.createTierUseCase).to(CreateTierUseCase)
  // @ts-ignore
  bind<UseCase<UpdateTierInput, WalletTier>>(tierTypes.updateTierUseCase).to(UpdateTierUseCase)
  // @ts-ignore
  bind<UseCase<DeleteTierInput, void>>(tierTypes.deleteTierUseCase).to(DeleteTierUseCase)
})
