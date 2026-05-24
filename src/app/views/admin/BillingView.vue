<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useBillingStore } from '@/app/stores/billing/BillingStore'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { useToast } from '@/app/composables/useToast'
import { ApiError } from '@/infrastructure/http/ApiClient'
import type { BillingPlan, SmsPack } from '@/app/stores/billing/BillingStore'

const billingStore = useBillingStore()
const orgStore = useOrganizationStore()
const authStore = useAuthStore()
const toast = useToast()
const { activeOrgId } = storeToRefs(orgStore)

const fetching = ref(false)
const redirecting = ref<string | null>(null)
const showEmailVerifyModal = ref(false)
const resendingVerification = ref(false)

// ── Error guards ──────────────────────────────────────────────────────────────

function isEmailNotVerified(e: unknown): boolean {
  return e instanceof ApiError && e.status === 403 && (e.body as { error?: string })?.error === 'EMAIL_NOT_VERIFIED'
}
function isAlreadySubscribed(e: unknown): boolean {
  return e instanceof ApiError && e.status === 409 && (e.body as { error?: string })?.error === 'ALREADY_SUBSCRIBED'
}
function isNoCustomer(e: unknown): boolean {
  return e instanceof ApiError && e.status === 404 && (e.body as { error?: string })?.error === 'NO_CUSTOMER'
}
function handleBillingError(e: unknown): void {
  if (isEmailNotVerified(e)) { showEmailVerifyModal.value = true; return }
  toast.show('Error al procesar. Intenta de nuevo.', 'error')
}

// ── Return from Stripe ────────────────────────────────────────────────────────

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const hasSuccess = params.get('success') === 'true'
  const hasCancelled = params.get('cancelled') === 'true'

  // Clean query params without triggering a navigation/reload
  if (hasSuccess || hasCancelled) {
    window.history.replaceState({}, '', window.location.pathname)
  }

  if (hasSuccess) {
    // Give Stripe's webhook up to 2 s to land before refreshing
    await new Promise<void>(resolve => setTimeout(resolve, 2000))
    try { await billingStore.fetchStatus() } catch { /* best-effort */ }
    toast.show('¡Plan actualizado exitosamente!', 'success')
  } else if (hasCancelled) {
    toast.show('Pago cancelado. Tu plan no cambió.', 'error')
  }
})

// ── Load data when org changes ────────────────────────────────────────────────

watch(
  activeOrgId,
  async (id) => {
    if (!id) return
    fetching.value = true
    try {
      await Promise.all([
        billingStore.fetchStatus(),
        billingStore.fetchPlans(),
        billingStore.fetchSmsPacks(),
      ])
    } catch {
      toast.show('Error al cargar datos de facturación.', 'error')
    } finally {
      fetching.value = false
    }
  },
  { immediate: true },
)

// ── Core redirect helpers (with cascade error handling) ───────────────────────

async function redirectToCheckout(planSlug: string): Promise<void> {
  try {
    const url = await billingStore.checkout(planSlug)
    window.location.href = url
  } catch (e) {
    // 409 ALREADY_SUBSCRIBED → cascade to portal
    if (isAlreadySubscribed(e)) return redirectToPortal()
    throw e
  }
}

async function redirectToPortal(): Promise<void> {
  try {
    const url = await billingStore.openPortal()
    window.location.href = url
  } catch (e) {
    // 404 NO_CUSTOMER → cascade to checkout (base plan)
    if (isNoCustomer(e)) return redirectToCheckout('base')
    throw e
  }
}

// ── Central plan action (the decision function) ───────────────────────────────

/**
 * Main entry point for any plan CTA.
 * 1. Fetches fresh status
 * 2. isActive → portal (Stripe handles proration / upgrade / cancel)
 * 3. !isActive → checkout with targetPlanSlug
 */
async function handlePlanAction(targetPlanSlug: string): Promise<void> {
  if (redirecting.value) return
  redirecting.value = targetPlanSlug
  try {
    await billingStore.fetchStatus()                   // fresh status
    if (billingStore.status?.isActive) {
      await redirectToPortal()
    } else {
      await redirectToCheckout(targetPlanSlug)
    }
  } catch (e) {
    redirecting.value = null
    handleBillingError(e)
  }
}

// ── Computed action button for the status section ─────────────────────────────

type ButtonVariant = 'primary' | 'warning' | 'secondary'

const planAction = computed<{ label: string; slug: string; variant: ButtonVariant }>(() => {
  const s = billingStore.status

  if (!s || !s.plan) {
    return { label: 'Elegir plan', slug: 'base', variant: 'primary' }
  }
  if (s.gracePeriod) {
    return {
      label: `Reactivar · acceso por ${s.gracePeriod.daysRemaining} días más`,
      slug: 'base',
      variant: 'warning',
    }
  }
  if (s.trialInfo) {
    return {
      label: `Actualizar plan · ${s.trialInfo.daysRemaining} días restantes`,
      slug: 'pro',
      variant: 'primary',
    }
  }
  if (s.isActive) {
    if (s.plan.slug === 'pro') {
      return { label: 'Administrar suscripción', slug: 'pro', variant: 'secondary' }
    }
    // base (or any other active plan)
    return { label: 'Actualizar a Pro', slug: 'pro', variant: 'primary' }
  }
  // Cancelled without grace period
  return { label: 'Reactivar suscripción', slug: 'base', variant: 'primary' }
})

const planActionStyle = computed<Record<string, string>>(() => {
  const v = planAction.value.variant
  if (v === 'warning')   return { background: 'var(--warning, #f59e0b)', color: '#fff' }
  if (v === 'secondary') return { background: 'var(--bg-surface)', color: 'var(--text-medium)', border: '1px solid var(--border)' }
  return { background: 'var(--amber)', color: 'var(--primary)' }
})

// ── SMS credits buy ───────────────────────────────────────────────────────────

async function handleBuyCredits(pack: SmsPack): Promise<void> {
  if (redirecting.value) return
  redirecting.value = pack.id
  try {
    const url = await billingStore.buyCredits(pack.id)
    window.location.href = url
  } catch (e) {
    redirecting.value = null
    if (isEmailNotVerified(e)) { showEmailVerifyModal.value = true; return }
    toast.show('Error al procesar el pago. Intenta de nuevo.', 'error')
  }
}

// ── Email verification ────────────────────────────────────────────────────────

async function handleResendVerification(): Promise<void> {
  resendingVerification.value = true
  try {
    await authStore.resendVerification()
    toast.show('Email de verificación reenviado. Revisa tu bandeja.', 'success')
    showEmailVerifyModal.value = false
  } catch {
    toast.show('No se pudo reenviar. Intenta de nuevo.', 'error')
  } finally {
    resendingVerification.value = false
  }
}

// ── Display helpers ───────────────────────────────────────────────────────────

function formatPrice(price: number, currency = 'MXN'): string {
  return price.toLocaleString('es-MX', { style: 'currency', currency })
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function subscriptionBadge(status: string | null | undefined) {
  if (status === 'active')                          return { label: 'Activo',    bg: 'var(--success-bg)',                    color: 'var(--success)' }
  if (status === 'trialing')                        return { label: 'Trial',     bg: 'rgba(245,158,11,0.12)',                color: 'var(--amber)' }
  if (status === 'past_due' || status === 'unpaid') return { label: 'Vencido',   bg: 'var(--danger-bg)',                     color: 'var(--danger)' }
  if (status === 'cancelled')                       return { label: 'Cancelado', bg: 'var(--bg-subtle)',                     color: 'var(--text-muted)' }
  return                                                   { label: 'Sin plan',  bg: 'var(--bg-subtle)',                     color: 'var(--text-muted)' }
}

function planFeatures(plan: BillingPlan) {
  return [
    { label: `${plan.maxWallets} wallets`,                                                             included: true },
    { label: plan.maxPasses === null ? 'Pases ilimitados' : `${plan.maxPasses} pases`,                 included: true },
    { label: 'Campañas email',                                                                         included: plan.emailCampaigns },
    { label: 'SMS con créditos',                                                                       included: plan.smsCampaigns },
    { label: `Analítica ${plan.analyticsLevel === 'full' ? 'completa' : 'básica'}`,                    included: true },
    { label: 'Soporte prioritario',                                                                    included: plan.analyticsLevel === 'full' },
  ]
}

function isPopularPack(index: number, total: number): boolean {
  return total > 1 && index === Math.floor(total / 2)
}

const displayedPlans = computed(() => billingStore.plans)
const currentPlanPrice = computed(() => billingStore.status?.plan?.price ?? -1)

function isPlanDisabled(plan: BillingPlan): boolean {
  if (redirecting.value !== null) return true
  if (billingStore.status?.plan?.slug === plan.slug) return true
  if (plan.price < currentPlanPrice.value) return true
  return false
}

function planButtonLabel(plan: BillingPlan): string {
  if (redirecting.value === plan.slug) return 'Redirigiendo…'
  if (billingStore.status?.plan?.slug === plan.slug) return 'Plan actual'
  if (plan.price < currentPlanPrice.value) return 'Plan inferior'
  return 'Seleccionar plan'
}

function planButtonStyle(plan: BillingPlan): Record<string, string> {
  if (billingStore.status?.plan?.slug === plan.slug || plan.price < currentPlanPrice.value) {
    return { background: 'var(--bg-subtle)', color: 'var(--text-faint)', cursor: 'not-allowed' }
  }
  return { background: 'var(--amber)', color: 'var(--primary)' }
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 28px; max-width: 960px;">

    <!-- ── SECCIÓN A: Estado actual ───────────────────────────────────────── -->
    <section>
      <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 12px;">
        Estado actual
      </div>

      <!-- Skeleton -->
      <div
        v-if="fetching"
        style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 22px; animation: pulse 1.5s infinite;"
      >
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px;">
          <div>
            <div style="height: 20px; width: 200px; background: var(--bg-field); border-radius: 6px; margin-bottom: 10px;" />
            <div style="height: 13px; width: 140px; background: var(--bg-subtle); border-radius: 4px;" />
          </div>
          <div style="height: 36px; width: 180px; background: var(--bg-field); border-radius: 9px;" />
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
          <div v-for="i in 3" :key="i" style="height: 68px; background: var(--bg-subtle); border-radius: 10px;" />
        </div>
      </div>

      <!-- Status card (always shown once data is loaded) -->
      <div
        v-else-if="billingStore.status"
        style="background: var(--bg-surface); border-radius: 14px; box-shadow: 0 1px 0 rgba(15,27,20,0.02);"
        :style="billingStore.status.gracePeriod
          ? { border: '1.5px solid var(--warning, #f59e0b)' }
          : { border: '1px solid var(--border)' }"
      >
        <!-- Grace period banner -->
        <div
          v-if="billingStore.status.gracePeriod"
          style="padding: 10px 22px; border-radius: 13px 13px 0 0; font-size: 12.5px; font-weight: 600; display: flex; align-items: center; gap: 8px; background: rgba(245,158,11,0.10); color: var(--warning, #f59e0b); border-bottom: 1px solid rgba(245,158,11,0.2);"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Tu suscripción ha expirado. Tienes acceso por
          <strong>{{ billingStore.status.gracePeriod.daysRemaining }} días más</strong> —
          expira el {{ formatDate(billingStore.status.gracePeriod.expiresAt) }}.
        </div>

        <!-- Trial banner -->
        <div
          v-else-if="billingStore.status.trialInfo"
          style="padding: 10px 22px; border-radius: 13px 13px 0 0; font-size: 12.5px; font-weight: 600; display: flex; align-items: center; gap: 8px; background: rgba(245,158,11,0.08); color: var(--amber); border-bottom: 1px solid rgba(245,158,11,0.15);"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Período de prueba activo ·
          <strong>{{ billingStore.status.trialInfo.daysRemaining }} días restantes</strong>
          (finaliza el {{ formatDate(billingStore.status.trialInfo.endsAt) }})
        </div>

        <!-- Main content -->
        <div style="padding: 22px;">
          <!-- Header row: name + action button -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
            <div>
              <!-- No plan state -->
              <div v-if="!billingStore.status.plan" style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 10px; background: var(--bg-field); display: grid; place-items: center; flex-shrink: 0;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
                    <circle cx="17" cy="15" r="1.5" fill="var(--text-faint)" stroke="none"/>
                  </svg>
                </div>
                <div>
                  <div style="font-size: 15px; font-weight: 700; color: var(--text-ink);">Sin suscripción activa</div>
                  <div style="font-size: 12.5px; color: var(--text-muted);">Elige un plan para comenzar.</div>
                </div>
              </div>

              <!-- With plan -->
              <template v-else>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap;">
                  <div
                    style="width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;"
                    :style="{ background: subscriptionBadge(billingStore.status.subscription?.status).color }"
                  />
                  <span style="font-size: 16px; font-weight: 700; color: var(--text-ink);">
                    {{ billingStore.status.plan.name }}
                  </span>
                  <span
                    style="font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px;"
                    :style="{
                      background: subscriptionBadge(billingStore.status.subscription?.status).bg,
                      color:      subscriptionBadge(billingStore.status.subscription?.status).color,
                    }"
                  >
                    {{ subscriptionBadge(billingStore.status.subscription?.status).label }}
                  </span>
                </div>
                <div v-if="billingStore.status.subscription" style="font-size: 12.5px; color: var(--text-muted);">
                  Próxima renovación:
                  <strong style="color: var(--text-ink);">{{ formatDate(billingStore.status.subscription.currentPeriodEnd) }}</strong>
                </div>
              </template>
            </div>

            <!-- Primary action button (computed from planAction) -->
            <button
              :disabled="redirecting !== null"
              style="display: flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 9px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; white-space: nowrap; font-family: inherit; transition: opacity 0.15s;"
              :style="redirecting !== null
                ? { opacity: '0.6', cursor: 'not-allowed', background: 'var(--bg-field)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                : planActionStyle"
              @click="handlePlanAction(planAction.slug)"
            >
              <!-- Spinner while redirecting -->
              <svg
                v-if="redirecting !== null"
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5" stroke-linecap="round"
                style="animation: spin 0.8s linear infinite; flex-shrink: 0;"
              >
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
              {{ redirecting !== null ? 'Redirigiendo…' : planAction.label }}
            </button>
          </div>

          <!-- Stats chips (only when there's a plan) -->
          <div
            v-if="billingStore.status.plan"
            style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;"
          >
            <div style="padding: 14px 16px; background: var(--bg-field); border-radius: 10px;">
              <div style="font-size: 10.5px; color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em; margin-bottom: 6px; text-transform: uppercase;">Precio</div>
              <div style="font-size: 17px; font-weight: 800; color: var(--primary-text);">
                {{ formatPrice(billingStore.status.plan.price, billingStore.status.plan.currency) }}
                <span style="font-size: 11px; font-weight: 500; color: var(--text-muted);">/mes</span>
              </div>
            </div>
            <div style="padding: 14px 16px; background: var(--bg-field); border-radius: 10px;">
              <div style="font-size: 10.5px; color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em; margin-bottom: 6px; text-transform: uppercase;">Wallets</div>
              <div style="font-size: 17px; font-weight: 800; color: var(--primary-text);">
                {{ billingStore.status.plan.maxWallets }}
              </div>
            </div>
            <div style="padding: 14px 16px; background: var(--primary); border-radius: 10px;">
              <div style="font-size: 10.5px; color: var(--text-nav-icon); font-weight: 700; letter-spacing: 0.05em; margin-bottom: 6px; text-transform: uppercase;">Créditos SMS</div>
              <div style="font-size: 17px; font-weight: 800; color: var(--bg-surface);">
                {{ billingStore.status.smsCredits.toLocaleString('es-MX') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── SECCIÓN B: Planes disponibles ─────────────────────────────────── -->
    <section>
      <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 12px;">
        Planes disponibles
      </div>

      <!-- Skeleton -->
      <div
        v-if="fetching"
        style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;"
      >
        <div
          v-for="i in 2"
          :key="i"
          style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 22px; animation: pulse 1.5s infinite;"
        >
          <div style="height: 20px; width: 100px; background: var(--bg-field); border-radius: 6px; margin-bottom: 10px;" />
          <div style="height: 34px; width: 130px; background: var(--bg-field); border-radius: 6px; margin-bottom: 22px;" />
          <div v-for="j in 6" :key="j" style="height: 13px; background: var(--bg-subtle); border-radius: 4px; margin-bottom: 10px;" />
          <div style="height: 40px; background: var(--bg-field); border-radius: 9px; margin-top: 18px;" />
        </div>
      </div>

      <!-- Real plans -->
      <div
        v-else-if="displayedPlans.length"
        style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;"
      >
        <div
          v-for="plan in displayedPlans"
          :key="plan.id"
          style="background: var(--bg-surface); border-radius: 14px; padding: 22px; display: flex; flex-direction: column; position: relative; box-shadow: 0 1px 0 rgba(15,27,20,0.02);"
          :style="plan.slug === 'base'
            ? { border: '2px solid var(--amber)' }
            : { border: '1px solid var(--border)' }"
        >
          <!-- Highlighted badge -->
          <div
            v-if="plan.slug === 'base'"
            style="position: absolute; top: -12px; right: 18px; background: var(--amber); color: var(--primary); padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; display: flex; align-items: center; gap: 4px;"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="var(--primary)">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Destacado
          </div>

          <!-- Name + price -->
          <div style="margin-bottom: 18px;">
            <div style="font-size: 18px; font-weight: 700; color: var(--text-ink); margin-bottom: 8px;">{{ plan.name }}</div>
            <div style="display: flex; align-items: baseline; gap: 4px;">
              <span style="font-size: 28px; font-weight: 800; color: var(--primary-text); letter-spacing: -0.02em;">
                {{ formatPrice(plan.price, plan.currency) }}
              </span>
              <span style="font-size: 12px; color: var(--text-muted);">/mes</span>
            </div>
          </div>

          <!-- Features -->
          <div style="display: flex; flex-direction: column; gap: 9px; flex: 1; margin-bottom: 20px;">
            <div
              v-for="(feature, i) in planFeatures(plan)"
              :key="i"
              style="display: flex; align-items: center; gap: 9px; font-size: 13px;"
            >
              <div
                style="width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0;"
                :style="feature.included ? { background: 'rgba(52,183,120,0.12)' } : { background: 'var(--bg-field)' }"
              >
                <svg
                  width="10" height="10" viewBox="0 0 24 24" fill="none"
                  stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                  :stroke="feature.included ? 'var(--success)' : 'var(--text-faint)'"
                >
                  <path v-if="feature.included" d="M5 12l5 5L20 7" />
                  <path v-else d="M18 6L6 18M6 6l12 12" />
                </svg>
              </div>
              <span :style="{ color: feature.included ? 'var(--text-ink)' : 'var(--text-faint)' }">{{ feature.label }}</span>
            </div>
          </div>

          <!-- CTA — wired through handlePlanAction -->
          <button
            v-if="plan.slug !== 'trial'"
            :disabled="isPlanDisabled(plan)"
            style="width: 100%; padding: 11px 16px; border-radius: 9px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; transition: opacity 0.15s; font-family: inherit;"
            :style="planButtonStyle(plan)"
            @click="handlePlanAction(plan.slug)"
          >
            {{ planButtonLabel(plan) }}
          </button>
        </div>
      </div>

      <div v-else-if="!fetching" style="padding: 32px; text-align: center; color: var(--text-muted); font-size: 13px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px;">
        No hay planes disponibles en este momento.
      </div>

      <div style="margin-top: 10px; font-size: 11.5px; color: var(--text-faint); font-style: italic;">
        Los precios no cambian para suscriptores existentes. Cancela cuando quieras.
      </div>
    </section>

    <!-- ── SECCIÓN C: Comprar créditos SMS ───────────────────────────────── -->
    <section>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;">
          Comprar créditos SMS
        </div>
        <div v-if="billingStore.status && !fetching" style="font-size: 12.5px; color: var(--text-muted);">
          Saldo actual:
          <strong style="color: var(--primary-text);">
            {{ billingStore.status.smsCredits.toLocaleString('es-MX') }} créditos
          </strong>
        </div>
      </div>

      <!-- Skeleton -->
      <div
        v-if="fetching"
        style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;"
      >
        <div
          v-for="i in 3"
          :key="i"
          style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px; animation: pulse 1.5s infinite;"
        >
          <div style="height: 16px; width: 80px; background: var(--bg-field); border-radius: 4px; margin-bottom: 14px;" />
          <div style="height: 34px; width: 100px; background: var(--bg-field); border-radius: 6px; margin-bottom: 8px;" />
          <div style="height: 26px; width: 120px; background: var(--bg-subtle); border-radius: 6px; margin-bottom: 16px;" />
          <div style="height: 38px; background: var(--bg-field); border-radius: 9px;" />
        </div>
      </div>

      <!-- Real packs -->
      <div
        v-else-if="billingStore.smsPacks.length"
        style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;"
      >
        <div
          v-for="(pack, index) in billingStore.smsPacks"
          :key="pack.id"
          style="background: var(--bg-surface); border-radius: 14px; padding: 20px; display: flex; flex-direction: column; position: relative; box-shadow: 0 1px 0 rgba(15,27,20,0.02);"
          :style="isPopularPack(index, billingStore.smsPacks.length)
            ? { border: '2px solid var(--amber)' }
            : { border: '1px solid var(--border)' }"
        >
          <div
            v-if="isPopularPack(index, billingStore.smsPacks.length)"
            style="position: absolute; top: -11px; right: 16px; background: var(--amber); color: var(--primary); padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 700;"
          >
            Más popular
          </div>

          <div style="font-size: 15px; font-weight: 700; color: var(--text-ink); margin-bottom: 12px;">
            {{ pack.name }}
          </div>

          <div style="flex: 1; margin-bottom: 18px;">
            <div style="display: flex; align-items: baseline; gap: 4px; margin-bottom: 4px;">
              <span style="font-size: 28px; font-weight: 800; color: var(--primary-text); letter-spacing: -0.01em;">
                {{ pack.credits.toLocaleString('es-MX') }}
              </span>
              <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">créditos</span>
            </div>
            <div style="font-size: 20px; font-weight: 700; color: var(--text-ink); margin-bottom: 4px;">
              {{ formatPrice(pack.price, pack.currency) }}
            </div>
            <div style="font-size: 11px; color: var(--text-muted);">
              {{ formatPrice(pack.price / pack.credits, pack.currency) }} por crédito
            </div>
          </div>

          <button
            :disabled="redirecting !== null"
            style="width: 100%; padding: 10px 16px; border-radius: 9px; background: var(--amber); border: none; font-size: 13px; font-weight: 700; color: var(--primary); cursor: pointer; transition: opacity 0.15s; font-family: inherit;"
            :style="redirecting !== null ? { opacity: '0.6', cursor: 'not-allowed' } : {}"
            @click="handleBuyCredits(pack)"
          >
            {{ redirecting === pack.id ? 'Redirigiendo…' : 'Comprar' }}
          </button>
        </div>
      </div>

      <div v-else-if="!fetching" style="padding: 32px; text-align: center; color: var(--text-muted); font-size: 13px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px;">
        No hay paquetes disponibles en este momento.
      </div>

      <div style="margin-top: 12px; font-size: 11.5px; color: var(--text-faint); text-align: center; font-style: italic;">
        Los créditos no expiran. Úsalos cuando los necesites.
      </div>
    </section>

  </div>

  <!-- ── Modal: email no verificado ────────────────────────────────────────── -->
  <Teleport to="body">
    <div
      v-if="showEmailVerifyModal"
      style="position: fixed; inset: 0; background: var(--overlay); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px;"
      @click.self="showEmailVerifyModal = false"
    >
      <div style="background: var(--bg-surface); border-radius: 16px; padding: 28px 28px 24px; max-width: 400px; width: 100%; box-shadow: 0 20px 60px var(--overlay);">
        <div style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 18px;">
          <div style="flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px; background: var(--warning-bg); display: flex; align-items: center; justify-content: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div>
            <p style="font-size: 15px; font-weight: 700; color: var(--text-ink); margin: 0 0 4px;">Verifica tu correo</p>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.5;">
              Debes verificar tu correo electrónico antes de realizar pagos.
              Revisa tu bandeja de entrada o reenvía el email de verificación.
            </p>
          </div>
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button
            style="padding: 9px 16px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--bg-surface); font-size: 13px; font-weight: 600; color: var(--text-muted); cursor: pointer; font-family: inherit;"
            @click="showEmailVerifyModal = false"
          >
            Cerrar
          </button>
          <button
            :disabled="resendingVerification"
            style="padding: 9px 18px; border-radius: 8px; border: none; background: var(--primary); font-size: 13px; font-weight: 700; color: var(--bg-surface); cursor: pointer; transition: opacity 0.15s; font-family: inherit;"
            :style="resendingVerification ? { opacity: '0.6', cursor: 'not-allowed' } : {}"
            @click="handleResendVerification"
          >
            {{ resendingVerification ? 'Enviando…' : 'Reenviar verificación' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

button:not(:disabled):hover {
  opacity: 0.88;
}
</style>
