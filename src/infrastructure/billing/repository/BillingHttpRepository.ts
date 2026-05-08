import 'reflect-metadata'
import { injectable } from 'inversify'
import { apiClient } from '@/infrastructure/http/ApiClient'
import type { BillingRepository } from '@/domain/billing/repository/BillingRepository'
import type { BillingStatus, BillingPlan, SmsPack } from '@/app/stores/billing/BillingStore'

@injectable()
export class BillingHttpRepository implements BillingRepository {
  private headers(orgId: string): Record<string, string> {
    return { 'x-organization-id': orgId }
  }

  getStatus(orgId: string): Promise<BillingStatus> {
    return apiClient.get<BillingStatus>('/billing/status', this.headers(orgId))
  }

  getPlans(orgId: string): Promise<BillingPlan[]> {
    return apiClient.get<BillingPlan[]>('/billing/plans', this.headers(orgId))
  }

  getSmsPacks(orgId: string): Promise<SmsPack[]> {
    return apiClient.get<SmsPack[]>('/billing/sms-packs', this.headers(orgId))
  }

  async checkout(orgId: string, planSlug: string, successUrl: string, cancelUrl: string): Promise<string> {
    const { url } = await apiClient.post<{ url: string }>('/billing/checkout', { planSlug, successUrl, cancelUrl }, this.headers(orgId))
    return url
  }

  async buyCredits(orgId: string, packId: string, successUrl: string, cancelUrl: string): Promise<string> {
    const { url } = await apiClient.post<{ url: string }>('/billing/buy-credits', { packId, successUrl, cancelUrl }, this.headers(orgId))
    return url
  }

  async openPortal(orgId: string, returnUrl: string): Promise<string> {
    const { url } = await apiClient.post<{ url: string }>('/billing/portal', { returnUrl }, this.headers(orgId))
    return url
  }
}
