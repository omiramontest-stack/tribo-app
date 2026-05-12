import { inject, injectable } from 'inversify'
import authTypes from '@/infrastructure/auth/di/types'
import type { AuthRepository, ChangePasswordDto } from '@/domain/auth/repository/AuthRepository'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class ChangePasswordUseCase implements UseCase<ChangePasswordDto, void> {
  constructor(
    @inject(authTypes.authRepository)
    private readonly _repo: AuthRepository,
  ) {}

  run(dto: ChangePasswordDto): Promise<void> {
    return this._repo.changePassword(dto)
  }
}
