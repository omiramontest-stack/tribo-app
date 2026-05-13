import { inject, injectable } from 'inversify'
import authTypes from '@/infrastructure/auth/di/types'
import type { AuthRepository, ForgotPasswordDto } from '@/domain/auth/repository/AuthRepository'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class ForgotPasswordUseCase implements UseCase<ForgotPasswordDto, void> {
  constructor(
    @inject(authTypes.authRepository)
    private readonly _repo: AuthRepository,
  ) {}

  run(dto: ForgotPasswordDto): Promise<void> {
    return this._repo.forgotPassword(dto)
  }
}
