import { inject, injectable } from 'inversify'

import authTypes from '@/infrastructure/auth/di/types'
import type { AuthRepository, RegisterDto } from '@/domain/auth/repository/AuthRepository'
import type { Admin } from '@/domain/auth/entities/Admin'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class RegisterUseCase implements UseCase<RegisterDto, Admin> {
  constructor(
    @inject(authTypes.authRepository)
    private readonly _authRepository: AuthRepository,
  ) {}

  async run(dto: RegisterDto): Promise<Admin> {
    return this._authRepository.register(dto)
  }
}
