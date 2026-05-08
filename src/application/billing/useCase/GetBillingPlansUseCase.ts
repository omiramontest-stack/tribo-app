import { inject, injectable } from 'inversify'
import billingTypes from '@/infrastructure/billing/di/types'
import type { BillingRepository } from '@/domain/billing/repository/BillingRepository'
import type { BillingPlan } from '@/app/stores/billing/BillingStore'

@injectable()
export default class GetBillingPlansUseCase {
  constructor(@inject(billingTypes.billingRepository) private readonly _repo: BillingRepository) {}

  run(orgId: string): Promise<BillingPlan[]> {
    return this._repo.getPlans(orgId)
  }
}
