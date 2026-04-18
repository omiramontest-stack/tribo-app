import { ContainerModule } from 'inversify'
import type { interfaces } from 'inversify'

import authTypes from '@/infrastructure/auth/di/types'
import type { AuthRepository } from '@/domain/auth/repository/AuthRepository'
import type { Admin } from '@/domain/auth/entities/Admin'
import type UseCase from '@/application/common/useCase/UseCase'
import type { LoginDto } from '@/application/auth/useCase/LoginUseCase'

import { AuthHttpRepository } from '@/infrastructure/auth/repository/AuthHttpRepository'
import LoginUseCase from '@/application/auth/useCase/LoginUseCase'
import LogoutUseCase from '@/application/auth/useCase/LogoutUseCase'

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<AuthRepository>(authTypes.authRepository).to(AuthHttpRepository)
  bind<UseCase<LoginDto, Admin>>(authTypes.loginUseCase).to(LoginUseCase)
  bind<UseCase<void, void>>(authTypes.logoutUseCase).to(LogoutUseCase)
})
