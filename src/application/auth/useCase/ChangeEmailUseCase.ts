import { inject, injectable } from 'inversify'
import authTypes from '@/infrastructure/auth/di/types'
import type { AuthRepository, ChangeEmailDto } from '@/domain/auth/repository/AuthRepository'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class ChangeEmailUseCase implements UseCase<ChangeEmailDto, void> {
  constructor(
    @inject(authTypes.authRepository)
    private readonly _repo: AuthRepository,
  ) {}

  run(dto: ChangeEmailDto): Promise<void> {
    return this._repo.changeEmail(dto)
  }
}
