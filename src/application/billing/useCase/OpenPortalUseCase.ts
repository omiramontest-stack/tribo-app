import { inject, injectable } from 'inversify'
import billingTypes from '@/infrastructure/billing/di/types'
import type { BillingRepository } from '@/domain/billing/repository/BillingRepository'

@injectable()
export default class OpenPortalUseCase {
  constructor(@inject(billingTypes.billingRepository) private readonly _repo: BillingRepository) {}

  run(orgId: string, returnUrl: string): Promise<string> {
    return this._repo.openPortal(orgId, returnUrl)
  }
}
