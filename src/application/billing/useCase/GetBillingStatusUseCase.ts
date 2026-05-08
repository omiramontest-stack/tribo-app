import { inject, injectable } from 'inversify'
import billingTypes from '@/infrastructure/billing/di/types'
import type { BillingRepository } from '@/domain/billing/repository/BillingRepository'
import type { BillingStatus } from '@/app/stores/billing/BillingStore'

@injectable()
export default class GetBillingStatusUseCase {
  constructor(@inject(billingTypes.billingRepository) private readonly _repo: BillingRepository) {}

  run(orgId: string): Promise<BillingStatus> {
    return this._repo.getStatus(orgId)
  }
}
