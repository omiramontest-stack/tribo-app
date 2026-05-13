import { ContainerModule } from 'inversify'
import type { interfaces } from 'inversify'

import authTypes from '@/infrastructure/auth/di/types'
import type { AuthRepository, RegisterDto, ChangeEmailDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from '@/domain/auth/repository/AuthRepository'
import type { Admin } from '@/domain/auth/entities/Admin'
import type UseCase from '@/application/common/useCase/UseCase'
import type { LoginDto } from '@/application/auth/useCase/LoginUseCase'

import { AuthHttpRepository } from '@/infrastructure/auth/repository/AuthHttpRepository'
import LoginUseCase from '@/application/auth/useCase/LoginUseCase'
import LogoutUseCase from '@/application/auth/useCase/LogoutUseCase'
import RegisterUseCase from '@/application/auth/useCase/RegisterUseCase'
import ChangeEmailUseCase from '@/application/auth/useCase/ChangeEmailUseCase'
import ConfirmEmailChangeUseCase from '@/application/auth/useCase/ConfirmEmailChangeUseCase'
import ChangePasswordUseCase from '@/application/auth/useCase/ChangePasswordUseCase'
import ForgotPasswordUseCase from '@/application/auth/useCase/ForgotPasswordUseCase'
import ResetPasswordUseCase from '@/application/auth/useCase/ResetPasswordUseCase'

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<AuthRepository>(authTypes.authRepository).to(AuthHttpRepository)
  bind<UseCase<LoginDto, Admin>>(authTypes.loginUseCase).to(LoginUseCase)
  bind<UseCase<void, void>>(authTypes.logoutUseCase).to(LogoutUseCase)
  bind<UseCase<RegisterDto, Admin>>(authTypes.registerUseCase).to(RegisterUseCase)
  bind<UseCase<ChangeEmailDto, void>>(authTypes.changeEmailUseCase).to(ChangeEmailUseCase)
  bind<UseCase<string, void>>(authTypes.confirmEmailChangeUseCase).to(ConfirmEmailChangeUseCase)
  bind<UseCase<ChangePasswordDto, void>>(authTypes.changePasswordUseCase).to(ChangePasswordUseCase)
  bind<UseCase<ForgotPasswordDto, void>>(authTypes.forgotPasswordUseCase).to(ForgotPasswordUseCase)
  bind<UseCase<ResetPasswordDto, void>>(authTypes.resetPasswordUseCase).to(ResetPasswordUseCase)
})
