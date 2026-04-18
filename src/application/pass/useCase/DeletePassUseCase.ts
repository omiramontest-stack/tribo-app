import { inject, injectable } from 'inversify'

import passTypes from '@/infrastructure/pass/di/types'
import type { PassRepository } from '@/domain/pass/repository/PassRepository'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class DeletePassUseCase implements UseCase<string, void> {
  constructor(
    @inject(passTypes.passRepository)
    private readonly _passRepository: PassRepository,
  ) {}

  async run(token: string): Promise<void> {
    await this._passRepository.delete(token)
  }
}
