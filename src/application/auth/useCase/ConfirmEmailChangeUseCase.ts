import { inject, injectable } from 'inversify'
import authTypes from '@/infrastructure/auth/di/types'
import type { AuthRepository } from '@/domain/auth/repository/AuthRepository'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class ConfirmEmailChangeUseCase implements UseCase<string, void> {
  constructor(
    @inject(authTypes.authRepository)
    private readonly _repo: AuthRepository,
  ) {}

  run(token: string): Promise<void> {
    return this._repo.confirmEmailChange(token)
  }
}
