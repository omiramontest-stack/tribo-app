import { inject, injectable } from 'inversify'
import authTypes from '@/infrastructure/auth/di/types'
import type { AuthRepository, ResetPasswordDto } from '@/domain/auth/repository/AuthRepository'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class ResetPasswordUseCase implements UseCase<ResetPasswordDto, void> {
  constructor(
    @inject(authTypes.authRepository)
    private readonly _repo: AuthRepository,
  ) {}

  run(dto: ResetPasswordDto): Promise<void> {
    return this._repo.resetPassword(dto)
  }
}
