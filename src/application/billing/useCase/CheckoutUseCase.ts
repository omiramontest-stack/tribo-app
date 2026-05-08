import { inject, injectable } from 'inversify'
import billingTypes from '@/infrastructure/billing/di/types'
import type { BillingRepository } from '@/domain/billing/repository/BillingRepository'

@injectable()
export default class CheckoutUseCase {
  constructor(@inject(billingTypes.billingRepository) private readonly _repo: BillingRepository) {}

  run(orgId: string, planSlug: string, successUrl: string, cancelUrl: string): Promise<string> {
    return this._repo.checkout(orgId, planSlug, successUrl, cancelUrl)
  }
}
