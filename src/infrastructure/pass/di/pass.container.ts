import { ContainerModule } from 'inversify'
import type { interfaces } from 'inversify'

import passTypes from '@/infrastructure/pass/di/types'
import type { PassRepository } from '@/domain/pass/repository/PassRepository'
import type { Pass } from '@/domain/pass/entities/Pass'
import type UseCase from '@/application/common/useCase/UseCase'
import type { GeneratePassDto } from '@/application/pass/dto/GeneratePassDto'
import type { PassWithWallet } from '@/application/pass/useCase/GetPassByTokenUseCase'

import { PassStorageRepository } from '@/infrastructure/pass/repository/PassStorageRepository'
import GeneratePassUseCase from '@/application/pass/useCase/GeneratePassUseCase'
import GetPassByTokenUseCase from '@/application/pass/useCase/GetPassByTokenUseCase'
import GetPassesByWalletUseCase from '@/application/pass/useCase/GetPassesByWalletUseCase'
import UpdatePassDataUseCase from '@/application/pass/useCase/UpdatePassDataUseCase'
import type { UpdatePassDataDto } from '@/application/pass/dto/UpdatePassDataDto'

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<PassRepository>(passTypes.passRepository).to(PassStorageRepository)
  bind<UseCase<GeneratePassDto, Pass>>(passTypes.generatePassUseCase).to(GeneratePassUseCase)
  bind<UseCase<string, PassWithWallet>>(passTypes.getPassByTokenUseCase).to(GetPassByTokenUseCase)
  bind<UseCase<string, Pass[]>>(passTypes.getPassesByWalletUseCase).to(GetPassesByWalletUseCase)
  bind<UseCase<UpdatePassDataDto, PassWithWallet>>(passTypes.updatePassDataUseCase).to(UpdatePassDataUseCase)
})
