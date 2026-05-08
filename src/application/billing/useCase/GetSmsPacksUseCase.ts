import { inject, injectable } from 'inversify'
import billingTypes from '@/infrastructure/billing/di/types'
import type { BillingRepository } from '@/domain/billing/repository/BillingRepository'
import type { SmsPack } from '@/app/stores/billing/BillingStore'

@injectable()
export default class GetSmsPacksUseCase {
  constructor(@inject(billingTypes.billingRepository) private readonly _repo: BillingRepository) {}

  run(orgId: string): Promise<SmsPack[]> {
    return this._repo.getSmsPacks(orgId)
  }
}
