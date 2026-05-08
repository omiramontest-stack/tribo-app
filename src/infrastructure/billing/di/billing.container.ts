import { ContainerModule } from 'inversify'
import type { interfaces } from 'inversify'

import billingTypes from './types'
import type { BillingRepository } from '@/domain/billing/repository/BillingRepository'
import { BillingHttpRepository } from '@/infrastructure/billing/repository/BillingHttpRepository'
import GetBillingStatusUseCase from '@/application/billing/useCase/GetBillingStatusUseCase'
import GetBillingPlansUseCase from '@/application/billing/useCase/GetBillingPlansUseCase'
import GetSmsPacksUseCase from '@/application/billing/useCase/GetSmsPacksUseCase'
import CheckoutUseCase from '@/application/billing/useCase/CheckoutUseCase'
import BuyCreditsUseCase from '@/application/billing/useCase/BuyCreditsUseCase'
import OpenPortalUseCase from '@/application/billing/useCase/OpenPortalUseCase'

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<BillingRepository>(billingTypes.billingRepository).to(BillingHttpRepository)
  bind(billingTypes.getStatusUseCase).to(GetBillingStatusUseCase)
  bind(billingTypes.getPlansUseCase).to(GetBillingPlansUseCase)
  bind(billingTypes.getSmsPacksUseCase).to(GetSmsPacksUseCase)
  bind(billingTypes.checkoutUseCase).to(CheckoutUseCase)
  bind(billingTypes.buyCreditsUseCase).to(BuyCreditsUseCase)
  bind(billingTypes.openPortalUseCase).to(OpenPortalUseCase)
})
