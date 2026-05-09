<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { walletTypeConfig } from '@/app/config/walletTypeConfig'
import { useOrgWallets } from '@/app/composables/useOrgWallets'

const walletStore = useWalletStore()
const authStore = useAuthStore()
const router = useRouter()
const { fetching } = useOrgWallets()

const totalWallets = computed(() => walletStore.wallets.length)

function walletTypeInfo(type: string) {
  return walletTypeConfig.find(c => c.value === type)
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
          class="wallet-row"
          style="padding: 12px 20px; border-bottom: 1px solid #ECEFEB; display: flex; align-items: center; gap: 12px; cursor: pointer;"
          @click="router.push({ name: 'WalletDetail', params: { id: wallet.id } })"
        >
          <!-- Type icon badge -->
          <div
            class="grid place-items-center shrink-0"
            style="width: 32px; height: 32px; border-radius: 8px;"
            :style="{ background: walletTypeInfo(wallet.type)?.iconBg ?? '#F7F4EF' }"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" :stroke="walletTypeInfo(wallet.type)?.iconColor ?? '#6B7A72'">
              <path :d="walletTypeInfo(wallet.type)?.iconPath ?? 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'" />
            </svg>
          </div>

          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; font-weight: 600; color: #0F1B14; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              {{ wallet.businessName }}
            </div>
            <div style="font-size: 11px; color: #6B7A72; margin-top: 1px;">
              {{ walletTypeInfo(wallet.type)?.label ?? wallet.type }}
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
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.wallet-row { transition: background 0.12s; }
.wallet-row:hover { background: #F7F4EF; }
</style>
