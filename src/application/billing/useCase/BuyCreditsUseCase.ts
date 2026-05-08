import { inject, injectable } from 'inversify'
import billingTypes from '@/infrastructure/billing/di/types'
import type { BillingRepository } from '@/domain/billing/repository/BillingRepository'

@injectable()
export default class BuyCreditsUseCase {
  constructor(@inject(billingTypes.billingRepository) private readonly _repo: BillingRepository) {}

  run(orgId: string, packId: string, successUrl: string, cancelUrl: string): Promise<string> {
    return this._repo.buyCredits(orgId, packId, successUrl, cancelUrl)
  }
}
