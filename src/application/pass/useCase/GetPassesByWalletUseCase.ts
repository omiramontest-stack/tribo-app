import { inject, injectable } from 'inversify'

import passTypes from '@/infrastructure/pass/di/types'
import type { PassRepository } from '@/domain/pass/repository/PassRepository'
import type { Pass } from '@/domain/pass/entities/Pass'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class GetPassesByWalletUseCase implements UseCase<string, Pass[]> {
  constructor(
    @inject(passTypes.passRepository)
    private readonly _passRepository: PassRepository,
  ) {}

  async run(walletId: string): Promise<Pass[]> {
    return this._passRepository.findByWalletId(walletId)
  }
}
