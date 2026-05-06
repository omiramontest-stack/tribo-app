import { reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'

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

export interface BillingStatus {
  plan: BillingPlan | null
  subscription: BillingSubscription | null
  smsCredits: number
  isActive: boolean
  gracePeriod: GracePeriod | null
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

  async function billingFetch<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
    const orgId = requireOrgId()
    const res = await fetch(path, {
      method: options?.method ?? 'GET',
      credentials: 'include',
      headers: {
        ...(options?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        'x-organization-id': orgId,
        'ngrok-skip-browser-warning': 'true',
      },
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    })

    if (res.status === 204) return undefined as T
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return data as T
  }

  async function fetchStatus() {
    state._status = await billingFetch<BillingStatus>('/billing/status')
  }

  async function fetchPlans() {
    state._plans = await billingFetch<BillingPlan[]>('/billing/plans')
  }

  async function fetchSmsPacks() {
    state._smsPacks = await billingFetch<SmsPack[]>('/billing/sms-packs')
  }

  async function checkout(planSlug: string): Promise<string> {
    const origin = window.location.origin
    const { url } = await billingFetch<{ url: string }>('/billing/checkout', {
      method: 'POST',
      body: {
        planSlug,
        successUrl: `${origin}/admin/billing?success=true`,
        cancelUrl: `${origin}/admin/billing?canceled=true`,
      },
    })
    return url
  }

  async function buyCredits(packId: string): Promise<string> {
    const origin = window.location.origin
    const { url } = await billingFetch<{ url: string }>('/billing/buy-credits', {
      method: 'POST',
      body: {
        packId,
        successUrl: `${origin}/admin/billing?success=true`,
        cancelUrl: `${origin}/admin/billing?canceled=true`,
      },
    })
    return url
  }

  async function openPortal(): Promise<string> {
    const origin = window.location.origin
    const { url } = await billingFetch<{ url: string }>('/billing/portal', {
      method: 'POST',
      body: { returnUrl: `${origin}/admin/billing` },
    })
    return url
  }

  return {
    status,
    plans,
    smsPacks,
    fetchStatus,
    fetchPlans,
    fetchSmsPacks,
    checkout,
    buyCredits,
    openPortal,
  }
})
