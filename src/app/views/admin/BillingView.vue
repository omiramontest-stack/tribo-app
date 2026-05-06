<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useBillingStore } from '@/app/stores/billing/BillingStore'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import { useToast } from '@/app/composables/useToast'
import type { BillingPlan, SmsPack } from '@/app/stores/billing/BillingStore'

const billingStore = useBillingStore()
const orgStore = useOrganizationStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { activeOrgId } = storeToRefs(orgStore)

const fetching = ref(false)
const redirecting = ref<string | null>(null)

onMounted(() => {
  if (route.query.success === 'true') {
    toast.show('¡Pago exitoso! Tu plan ha sido actualizado.', 'success')
    router.replace({ name: 'Billing' })
  } else if (route.query.canceled === 'true') {
    toast.show('Pago cancelado.', 'error')
    router.replace({ name: 'Billing' })
  }
})

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
    } finally {
      fetching.value = false
    }
  },
  { immediate: true },
)

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
  if (status === 'active') return { label: 'Activo', bg: '#D1FAE5', color: '#16A34A' }
  if (status === 'past_due' || status === 'unpaid') return { label: 'Vencido', bg: '#FEE2E2', color: '#DC2626' }
  return { label: 'Sin plan', bg: '#F0F0F0', color: '#6B7A72' }
}

function planFeatures(plan: BillingPlan) {
  return [
    { label: `${plan.maxWallets} wallets`, included: true },
    { label: plan.maxPasses === null ? 'Pases ilimitados' : `${plan.maxPasses} pases`, included: true },
    { label: 'Campañas email', included: plan.emailCampaigns },
    { label: 'SMS con créditos', included: plan.smsCampaigns },
    { label: `Analítica ${plan.analyticsLevel === 'complete' ? 'completa' : 'básica'}`, included: true },
    { label: 'Soporte prioritario', included: plan.analyticsLevel === 'complete' },
  ]
}

function isPopularPack(index: number, total: number): boolean {
  return total > 1 && index === Math.floor(total / 2)
}

async function handleCheckout(plan: BillingPlan) {
  if (billingStore.status?.plan?.slug === plan.slug) return
  redirecting.value = plan.slug
  try {
    const url = await billingStore.checkout(plan.slug)
    window.location.href = url
  } catch {
    toast.show('Error al procesar el pago. Intenta de nuevo.', 'error')
    redirecting.value = null
  }
}

async function handleBuyCredits(pack: SmsPack) {
  redirecting.value = pack.id
  try {
    const url = await billingStore.buyCredits(pack.id)
    window.location.href = url
  } catch {
    toast.show('Error al procesar el pago. Intenta de nuevo.', 'error')
    redirecting.value = null
  }
}

async function handlePortal() {
  redirecting.value = 'portal'
  try {
    const url = await billingStore.openPortal()
    window.location.href = url
  } catch {
    toast.show('Error al abrir el portal. Intenta de nuevo.', 'error')
    redirecting.value = null
  }
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 28px; max-width: 960px;">

    <!-- ── SECCIÓN A: Estado actual ── -->
    <section>
      <div style="font-size: 11px; color: #6B7A72; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 12px;">
        Estado actual
      </div>

      <!-- Skeleton -->
      <div
        v-if="fetching"
        style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 22px; animation: pulse 1.5s infinite;"
      >
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px;">
          <div>
            <div style="height: 20px; width: 200px; background: #EFEAE0; border-radius: 6px; margin-bottom: 10px;" />
            <div style="height: 13px; width: 140px; background: #F7F4EF; border-radius: 4px;" />
          </div>
          <div style="height: 36px; width: 180px; background: #EFEAE0; border-radius: 9px;" />
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
          <div v-for="i in 3" :key="i" style="height: 68px; background: #F7F4EF; border-radius: 10px;" />
        </div>
      </div>

      <!-- Sin plan activo -->
      <div
        v-else-if="billingStore.status && !billingStore.status.plan"
        style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 28px; display: flex; align-items: center; gap: 20px; box-shadow: 0 1px 0 rgba(15,27,20,0.02);"
      >
        <div style="width: 44px; height: 44px; border-radius: 12px; background: #F7F4EF; display: grid; place-items: center; flex-shrink: 0;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8B3AC" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5" fill="#A8B3AC" stroke="none"/>
          </svg>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 14px; font-weight: 700; color: #0F1B14; margin-bottom: 4px;">Sin suscripción activa</div>
          <div style="font-size: 12.5px; color: #6B7A72;">Elige un plan de los disponibles abajo para comenzar.</div>
        </div>
      </div>

      <!-- Con plan activo -->
      <div
        v-else-if="billingStore.status?.plan"
        style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 22px; box-shadow: 0 1px 0 rgba(15,27,20,0.02);"
      >
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap;">
              <div
                style="width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;"
                :style="{ background: subscriptionBadge(billingStore.status.subscription?.status).color }"
              />
              <span style="font-size: 16px; font-weight: 700; color: #0F1B14;">
                {{ billingStore.status.plan.name }}
              </span>
              <span
                style="font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px;"
                :style="{
                  background: subscriptionBadge(billingStore.status.subscription?.status).bg,
                  color: subscriptionBadge(billingStore.status.subscription?.status).color,
                }"
              >
                {{ subscriptionBadge(billingStore.status.subscription?.status).label }}
              </span>
            </div>
            <div v-if="billingStore.status.subscription" style="font-size: 12.5px; color: #6B7A72;">
              Próxima renovación: <strong>{{ formatDate(billingStore.status.subscription.currentPeriodEnd) }}</strong>
            </div>
          </div>

          <button
            v-if="billingStore.status.subscription"
            :disabled="redirecting === 'portal'"
            style="display: flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 9px; border: 1px solid #D8DDD7; background: #fff; font-size: 12.5px; font-weight: 600; color: #3A4A41; cursor: pointer; white-space: nowrap; font-family: inherit;"
            @click="handlePortal"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {{ redirecting === 'portal' ? 'Abriendo…' : 'Administrar suscripción' }}
          </button>
        </div>

        <!-- Stats chips -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
          <div style="padding: 14px 16px; background: #F7F4EF; border-radius: 10px;">
            <div style="font-size: 10.5px; color: #6B7A72; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 6px; text-transform: uppercase;">Precio</div>
            <div style="font-size: 17px; font-weight: 800; color: #1B4332;">
              {{ formatPrice(billingStore.status.plan.price, billingStore.status.plan.currency) }}
              <span style="font-size: 11px; font-weight: 500; color: #6B7A72;">/mes</span>
            </div>
          </div>
          <div style="padding: 14px 16px; background: #F7F4EF; border-radius: 10px;">
            <div style="font-size: 10.5px; color: #6B7A72; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 6px; text-transform: uppercase;">Wallets</div>
            <div style="font-size: 17px; font-weight: 800; color: #1B4332;">
              {{ billingStore.status.plan.maxWallets }}
            </div>
          </div>
          <div style="padding: 14px 16px; background: #1B4332; border-radius: 10px;">
            <div style="font-size: 10.5px; color: #9DB7A8; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 6px; text-transform: uppercase;">Créditos SMS</div>
            <div style="font-size: 17px; font-weight: 800; color: #fff;">
              {{ billingStore.status.smsCredits.toLocaleString('es-MX') }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── SECCIÓN B: Planes disponibles ── -->
    <section>
      <div style="font-size: 11px; color: #6B7A72; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 12px;">
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
          style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 22px; animation: pulse 1.5s infinite;"
        >
          <div style="height: 20px; width: 100px; background: #EFEAE0; border-radius: 6px; margin-bottom: 10px;" />
          <div style="height: 34px; width: 130px; background: #EFEAE0; border-radius: 6px; margin-bottom: 22px;" />
          <div v-for="j in 6" :key="j" style="height: 13px; background: #F7F4EF; border-radius: 4px; margin-bottom: 10px;" />
          <div style="height: 40px; background: #EFEAE0; border-radius: 9px; margin-top: 18px;" />
        </div>
      </div>

      <!-- Real plans -->
      <div
        v-else-if="billingStore.plans.length"
        style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;"
      >
        <div
          v-for="plan in billingStore.plans"
          :key="plan.id"
          style="background: #fff; border-radius: 14px; padding: 22px; display: flex; flex-direction: column; position: relative; box-shadow: 0 1px 0 rgba(15,27,20,0.02);"
          :style="plan.slug === 'base'
            ? { border: '2px solid #E8920A' }
            : { border: '1px solid #ECEFEB' }"
        >
          <!-- Highlighted badge -->
          <div
            v-if="plan.slug === 'base'"
            style="position: absolute; top: -12px; right: 18px; background: #E8920A; color: #13301F; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; display: flex; align-items: center; gap: 4px;"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#13301F">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Destacado
          </div>

          <!-- Name + price -->
          <div style="margin-bottom: 18px;">
            <div style="font-size: 18px; font-weight: 700; color: #0F1B14; margin-bottom: 8px;">{{ plan.name }}</div>
            <div style="display: flex; align-items: baseline; gap: 4px;">
              <span style="font-size: 28px; font-weight: 800; color: #1B4332; letter-spacing: -0.02em;">
                {{ formatPrice(plan.price, plan.currency) }}
              </span>
              <span style="font-size: 12px; color: #6B7A72;">/mes</span>
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
                :style="feature.included ? { background: '#D1FAE5' } : { background: '#F0F0F0' }"
              >
                <svg
                  width="10" height="10" viewBox="0 0 24 24" fill="none"
                  stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                  :stroke="feature.included ? '#16A34A' : '#A8B3AC'"
                >
                  <path v-if="feature.included" d="M5 12l5 5L20 7" />
                  <path v-else d="M18 6L6 18M6 6l12 12" />
                </svg>
              </div>
              <span :style="{ color: feature.included ? '#0F1B14' : '#A8B3AC' }">{{ feature.label }}</span>
            </div>
          </div>

          <!-- CTA -->
          <button
            :disabled="billingStore.status?.plan?.slug === plan.slug || redirecting === plan.slug"
            style="width: 100%; padding: 11px 16px; border-radius: 9px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; transition: opacity 0.15s; font-family: inherit;"
            :style="billingStore.status?.plan?.slug === plan.slug
              ? { background: '#F0F0F0', color: '#A8B3AC', cursor: 'default' }
              : { background: '#E8920A', color: '#13301F' }"
            @click="handleCheckout(plan)"
          >
            <span v-if="billingStore.status?.plan?.slug === plan.slug">Plan actual</span>
            <span v-else-if="redirecting === plan.slug">Redirigiendo…</span>
            <span v-else>Suscribirse</span>
          </button>
        </div>
      </div>

      <div v-else-if="!fetching" style="padding: 32px; text-align: center; color: #6B7A72; font-size: 13px; background: #fff; border: 1px solid #ECEFEB; border-radius: 14px;">
        No hay planes disponibles en este momento.
      </div>

      <div style="margin-top: 10px; font-size: 11.5px; color: #A8B3AC; font-style: italic;">
        Los precios no cambian para suscriptores existentes. Cancela cuando quieras.
      </div>
    </section>
    <section>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <div style="font-size: 11px; color: #6B7A72; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;">
          Comprar créditos
        </div>
        <div v-if="billingStore.status && !fetching" style="font-size: 12.5px; color: #6B7A72;">
          Saldo actual:
          <strong style="color: #1B4332;">
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
          style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 20px; animation: pulse 1.5s infinite;"
        >
          <div style="height: 16px; width: 80px; background: #EFEAE0; border-radius: 4px; margin-bottom: 14px;" />
          <div style="height: 34px; width: 100px; background: #EFEAE0; border-radius: 6px; margin-bottom: 8px;" />
          <div style="height: 26px; width: 120px; background: #F7F4EF; border-radius: 6px; margin-bottom: 16px;" />
          <div style="height: 38px; background: #EFEAE0; border-radius: 9px;" />
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
          style="background: #fff; border-radius: 14px; padding: 20px; display: flex; flex-direction: column; position: relative; box-shadow: 0 1px 0 rgba(15,27,20,0.02);"
          :style="isPopularPack(index, billingStore.smsPacks.length)
            ? { border: '2px solid #E8920A' }
            : { border: '1px solid #ECEFEB' }"
        >
          <div
            v-if="isPopularPack(index, billingStore.smsPacks.length)"
            style="position: absolute; top: -11px; right: 16px; background: #E8920A; color: #13301F; padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 700;"
          >
            Más popular
          </div>

          <div style="font-size: 15px; font-weight: 700; color: #0F1B14; margin-bottom: 12px;">
            {{ pack.name }}
          </div>

          <div style="flex: 1; margin-bottom: 18px;">
            <div style="display: flex; align-items: baseline; gap: 4px; margin-bottom: 4px;">
              <span style="font-size: 28px; font-weight: 800; color: #1B4332; letter-spacing: -0.01em;">
                {{ pack.credits.toLocaleString('es-MX') }}
              </span>
              <span style="font-size: 12px; color: #6B7A72; font-weight: 600;">Creditos</span>
            </div>
            <div style="font-size: 20px; font-weight: 700; color: #0F1B14; margin-bottom: 4px;">
              {{ formatPrice(pack.price, pack.currency) }}
            </div>
            <div style="font-size: 11px; color: #6B7A72;">
              {{ formatPrice(pack.price / pack.credits, pack.currency) }} por credito
            </div>
          </div>

          <button
            :disabled="redirecting === pack.id"
            style="width: 100%; padding: 10px 16px; border-radius: 9px; background: #E8920A; border: none; font-size: 13px; font-weight: 700; color: #13301F; cursor: pointer; transition: opacity 0.15s; font-family: inherit;"
            @click="handleBuyCredits(pack)"
          >
            {{ redirecting === pack.id ? 'Redirigiendo…' : 'Comprar' }}
          </button>
        </div>
      </div>

      <div v-else-if="!fetching" style="padding: 32px; text-align: center; color: #6B7A72; font-size: 13px; background: #fff; border: 1px solid #ECEFEB; border-radius: 14px;">
        No hay paquetes disponibles en este momento.
      </div>

      <div style="margin-top: 12px; font-size: 11.5px; color: #A8B3AC; text-align: center; font-style: italic;">
        Los créditos no expiran. Úsalos cuando los necesites.
      </div>
    </section>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

button:not(:disabled):hover {
  opacity: 0.88;
}
</style>
