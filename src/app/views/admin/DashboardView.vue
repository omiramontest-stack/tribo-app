<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'

const walletStore = useWalletStore()
const authStore = useAuthStore()
const orgStore = useOrganizationStore()
const router = useRouter()
const { activeOrgId } = storeToRefs(orgStore)
const fetching = ref(false)

const totalWallets = computed(() => walletStore.wallets.length)

watch(
  activeOrgId,
  async (id) => {
    if (!id) return
    walletStore.clearWallets()
    fetching.value = true
    try {
      await walletStore.fetchWallets()
    } finally {
      fetching.value = false
    }
  },
  { immediate: true },
)

const typeConfig: Record<string, { label: string; accent: string; bg: string }> = {
  stamps:     { label: 'Sellos',    accent: '#7C5E3C', bg: '#F1E6D4' },
  membership: { label: 'Membresía', accent: '#1B4332', bg: '#D9E5DD' },
  points:     { label: 'Puntos',    accent: '#8B5CF6', bg: '#EBE3FB' },
  cashback:   { label: 'Cashback',  accent: '#E8920A', bg: '#FCEBC4' },
  daypass:    { label: 'Day Pass',  accent: '#0EA5E9', bg: '#D6EEFB' },
}

const kpiColor = '#E8920A'

const typeIconPaths: Record<string, string> = {
  stamps:     'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  membership: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  points:     'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  cashback:   'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  daypass:    'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 22px;">

    <!-- KPI cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px;">
      <!-- Wallets activas -->
      <div style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 18px; box-shadow: 0 1px 0 rgba(15,27,20,0.02);">
        <div style="font-size: 12px; color: #6B7A72; font-weight: 500; margin-bottom: 10px;">Wallets activas</div>
        <div v-if="fetching" style="height: 36px; width: 60px; background: #EFEAE0; border-radius: 6px; animation: pulse 1.5s infinite;" />
        <div v-else style="font-size: 30px; font-weight: 700; letter-spacing: -0.02em; color: #0F1B14; line-height: 1;">
          {{ totalWallets }}
        </div>
      </div>

      <!-- Pases emitidos (mock) -->
      <div style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 18px; box-shadow: 0 1px 0 rgba(15,27,20,0.02);">
        <div style="font-size: 12px; color: #6B7A72; font-weight: 500; margin-bottom: 10px;">Pases emitidos</div>
        <div style="font-size: 30px; font-weight: 700; letter-spacing: -0.02em; color: #0F1B14; line-height: 1;">—</div>
      </div>

      <!-- Escaneos (mock) -->
      <div style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 18px; box-shadow: 0 1px 0 rgba(15,27,20,0.02);">
        <div style="font-size: 12px; color: #6B7A72; font-weight: 500; margin-bottom: 10px;">Escaneos · 30d</div>
        <div style="font-size: 30px; font-weight: 700; letter-spacing: -0.02em; color: #0F1B14; line-height: 1;">—</div>
      </div>

      <!-- Recompensas (mock) -->
      <div style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 18px; box-shadow: 0 1px 0 rgba(15,27,20,0.02);">
        <div style="font-size: 12px; color: #6B7A72; font-weight: 500; margin-bottom: 10px;">Recompensas</div>
        <div style="font-size: 30px; font-weight: 700; letter-spacing: -0.02em; color: #0F1B14; line-height: 1;">—</div>
      </div>
    </div>

    <!-- Wallets recientes -->
    <div style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; box-shadow: 0 1px 0 rgba(15,27,20,0.02); overflow: hidden;">
      <div style="padding: 16px 20px; border-bottom: 1px solid #ECEFEB; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 14px; font-weight: 600; color: #0F1B14;">Wallets recientes</div>
        <button
          style="font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 8px; background: #E8920A; color: #13301F; border: none; cursor: pointer;"
          @click="router.push({ name: 'WalletCreate' })"
        >
          + Nueva wallet
        </button>
      </div>

      <!-- Skeleton -->
      <div v-if="fetching">
        <div
          v-for="i in 3" :key="i"
          style="padding: 14px 20px; border-bottom: 1px solid #ECEFEB; display: flex; align-items: center; gap: 12px; animation: pulse 1.5s infinite;"
        >
          <div style="width: 32px; height: 32px; border-radius: 8px; background: #EFEAE0;" />
          <div style="flex: 1;">
            <div style="height: 13px; width: 140px; background: #EFEAE0; border-radius: 4px; margin-bottom: 6px;" />
            <div style="height: 10px; width: 80px; background: #F7F4EF; border-radius: 4px;" />
          </div>
        </div>
      </div>

      <!-- List -->
      <div v-else-if="walletStore.wallets.length">
        <div
          v-for="wallet in walletStore.wallets.slice(0, 6)"
          :key="wallet.id"
          style="padding: 12px 20px; border-bottom: 1px solid #ECEFEB; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.12s;"
          @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background = '#F7F4EF'"
          @mouseleave="(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'"
          @click="router.push({ name: 'WalletDetail', params: { id: wallet.id } })"
        >
          <!-- Type icon badge -->
          <div
            class="grid place-items-center shrink-0"
            style="width: 32px; height: 32px; border-radius: 8px;"
            :style="{ background: typeConfig[wallet.type]?.bg ?? '#F7F4EF' }"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" :stroke="typeConfig[wallet.type]?.accent ?? '#6B7A72'">
              <path :d="typeIconPaths[wallet.type] ?? 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'" />
            </svg>
          </div>

          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; font-weight: 600; color: #0F1B14; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              {{ wallet.businessName }}
            </div>
            <div style="font-size: 11px; color: #6B7A72; margin-top: 1px;">
              {{ typeConfig[wallet.type]?.label ?? wallet.type }}
            </div>
          </div>

          <span style="font-size: 12px; font-weight: 600; color: #2D6A4F; cursor: pointer;">
            Ver detalle →
          </span>
        </div>
      </div>

      <div v-else style="padding: 48px 20px; text-align: center; color: #6B7A72; font-size: 13px;">
        No hay wallets creadas aún.
        <router-link :to="{ name: 'WalletCreate' }" style="color: #E8920A; font-weight: 600; margin-left: 4px; text-decoration: none;">
          Crear una
        </router-link>
      </div>
    </div>

    <!-- Próximo: Campañas (CTA card) -->
    <div style="background: #1B4332; border-radius: 14px; padding: 22px; border: none; max-width: 420px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <div style="width: 36px; height: 36px; border-radius: 10px; background: #E8920A; display: grid; place-items: center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#13301F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </div>
        <div style="font-size: 14px; font-weight: 700; color: #fff;">Próximo: Campañas</div>
      </div>
      <div style="font-size: 12.5px; color: #C8DBD0; line-height: 1.5; margin-bottom: 16px;">
        Convierte escaneos en ventas. Envía notificaciones push segmentadas a clientes con wallet activa.
      </div>
      <button style="width: 100%; padding: 8px 14px; border-radius: 8px; background: #E8920A; color: #13301F; font-weight: 600; font-size: 13px; border: none; cursor: pointer;">
        Reservar acceso early
      </button>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
