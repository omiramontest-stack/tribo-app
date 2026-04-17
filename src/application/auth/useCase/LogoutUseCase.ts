import { inject, injectable } from 'inversify'

import authTypes from '@/infrastructure/auth/di/types'
import type { AuthRepository } from '@/domain/auth/repository/AuthRepository'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class LogoutUseCase implements UseCase<void, void> {
  constructor(
    @inject(authTypes.authRepository)
    private readonly _authRepository: AuthRepository,
  ) {}

  async run(): Promise<void> {
    return this._authRepository.logout()
  }
}
