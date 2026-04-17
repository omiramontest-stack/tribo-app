import { inject, injectable } from 'inversify'

import authTypes from '@/infrastructure/auth/di/types'
import type { AuthRepository } from '@/domain/auth/repository/AuthRepository'
import type { Admin } from '@/domain/auth/entities/Admin'
import type UseCase from '@/application/common/useCase/UseCase'
import { AuthHandlerError } from '@/application/auth/error/AuthHandlerError'
import { AuthErrorCodes } from '@/application/auth/error/enum/AuthErrorCodes'

export interface LoginDto {
  email: string
  password: string
}

@injectable()
export default class LoginUseCase implements UseCase<LoginDto, Admin> {
  constructor(
    @inject(authTypes.authRepository)
    private readonly _authRepository: AuthRepository,
  ) {}

  async run(dto: LoginDto): Promise<Admin> {
    const admin = await this._authRepository.login(dto.email, dto.password)
    if (!admin)
      throw new AuthHandlerError(AuthErrorCodes.INVALID_CREDENTIALS, 'Credenciales incorrectas')
    return admin
  }
}
