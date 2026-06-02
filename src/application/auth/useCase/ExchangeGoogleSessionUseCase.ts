import { inject, injectable } from 'inversify'

import authTypes from '@/infrastructure/auth/di/types'
import type { AuthRepository } from '@/domain/auth/repository/AuthRepository'
import type { Admin } from '@/domain/auth/entities/Admin'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class ExchangeGoogleSessionUseCase implements UseCase<string, Admin> {
  constructor(
    @inject(authTypes.authRepository)
    private readonly _authRepository: AuthRepository,
  ) {}

  run(code: string): Promise<Admin> {
    return this._authRepository.exchangeGoogleSession(code)
  }
}
