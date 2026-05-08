import type { BillingStatus, BillingPlan, SmsPack } from '@/app/stores/billing/BillingStore'

export interface CheckoutResult { url: string }

export interface BillingRepository {
  getStatus(orgId: string): Promise<BillingStatus>
  getPlans(orgId: string): Promise<BillingPlan[]>
  getSmsPacks(orgId: string): Promise<SmsPack[]>
  checkout(orgId: string, planSlug: string, successUrl: string, cancelUrl: string): Promise<string>
  buyCredits(orgId: string, packId: string, successUrl: string, cancelUrl: string): Promise<string>
  openPortal(orgId: string, returnUrl: string): Promise<string>
}
