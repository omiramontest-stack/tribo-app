import { reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import { container } from '@/container'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import billingTypes from '@/infrastructure/billing/di/types'
import type GetBillingStatusUseCase from '@/application/billing/useCase/GetBillingStatusUseCase'
import type GetBillingPlansUseCase from '@/application/billing/useCase/GetBillingPlansUseCase'
import type GetSmsPacksUseCase from '@/application/billing/useCase/GetSmsPacksUseCase'
import type CheckoutUseCase from '@/application/billing/useCase/CheckoutUseCase'
import type BuyCreditsUseCase from '@/application/billing/useCase/BuyCreditsUseCase'
import type OpenPortalUseCase from '@/application/billing/useCase/OpenPortalUseCase'

export interface BillingPlan {
  id: string
  slug: string
  name: string
  price: number
  currency: string
  maxWallets: number
  maxPasses: number | null
  emailCampaigns: boolean
  smsCampaigns: boolean
  analyticsLevel: string
  geofencesPerWallet?: number
}

export interface BillingSubscription {
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
}

export interface GracePeriod {
  daysRemaining: number
  expiresAt: string
}

export interface TrialInfo {
  daysRemaining: number
  endsAt: string
}

export interface BillingStatus {
  plan: BillingPlan | null
  subscription: BillingSubscription | null
  smsCredits: number
  isActive: boolean
  gracePeriod: GracePeriod | null
  trialEndsAt: string | null
  trialInfo: TrialInfo | null
}

export interface SmsPack {
  id: string
  name: string
  price: number
  currency: string
  credits: number
}

export const useBillingStore = defineStore('BillingStore', () => {
  const orgStore = useOrganizationStore()

  const getStatusUseCase = container.get<GetBillingStatusUseCase>(billingTypes.getStatusUseCase)
  const getPlansUseCase = container.get<GetBillingPlansUseCase>(billingTypes.getPlansUseCase)
  const getSmsPacksUseCase = container.get<GetSmsPacksUseCase>(billingTypes.getSmsPacksUseCase)
  const checkoutUseCase = container.get<CheckoutUseCase>(billingTypes.checkoutUseCase)
  const buyCreditsUseCase = container.get<BuyCreditsUseCase>(billingTypes.buyCreditsUseCase)
  const openPortalUseCase = container.get<OpenPortalUseCase>(billingTypes.openPortalUseCase)

  const state = reactive<{
    _status: BillingStatus | null
    _plans: BillingPlan[]
    _smsPacks: SmsPack[]
  }>({
    _status: null,
    _plans: [],
    _smsPacks: [],
  })

  const status = computed(() => state._status)
  const plans = computed(() => state._plans)
  const smsPacks = computed(() => state._smsPacks)

  function requireOrgId(): string {
    const id = orgStore.activeOrgId
    if (!id) throw new Error('No active organization')
    return id
  }

  async function fetchStatus() {
    state._status = await getStatusUseCase.run(requireOrgId())
  }

  async function fetchPlans() {
    state._plans = await getPlansUseCase.run(requireOrgId())
  }

  async function fetchSmsPacks() {
    state._smsPacks = await getSmsPacksUseCase.run(requireOrgId())
  }

  async function checkout(planSlug: string): Promise<string> {
    const origin = window.location.origin
    return checkoutUseCase.run(
      requireOrgId(),
      planSlug,
      `${origin}/admin/billing?success=true`,
      `${origin}/admin/billing?cancelled=true`,
    )
  }

  async function buyCredits(packId: string): Promise<string> {
    const origin = window.location.origin
    return buyCreditsUseCase.run(
      requireOrgId(),
      packId,
      `${origin}/admin/billing?success=true`,
      `${origin}/admin/billing?cancelled=true`,
    )
  }

  async function openPortal(): Promise<string> {
    return openPortalUseCase.run(requireOrgId(), `${window.location.origin}/admin/billing`)
  }

  return { status, plans, smsPacks, fetchStatus, fetchPlans, fetchSmsPacks, checkout, buyCredits, openPortal }
})
