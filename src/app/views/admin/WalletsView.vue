<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { useOrgWallets } from '@/app/composables/useOrgWallets'
import WalletCard from '@/app/components/Admin/WalletCard.vue'

const walletStore = useWalletStore()
const router = useRouter()
const { fetching } = useOrgWallets()
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 20px;">

    <!-- Toolbar -->
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <span
          style="padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #1B4332; color: #fff; border: 1px solid transparent; cursor: pointer;"
        >
          Todas
        </span>
        <span
          v-for="label in ['Sellos', 'Membresía', 'Puntos', 'Cashback', 'Eventos']"
          :key="label"
          style="padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #fff; color: #3A4A41; border: 1px solid #D8DDD7; cursor: pointer;"
        >
          {{ label }}
        </span>
      </div>
      <button
        style="display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; background: #E8920A; color: #13301F; font-weight: 600; font-size: 13px; border: none; cursor: pointer;"
        @click="router.push({ name: 'WalletCreate' })"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Nueva wallet
      </button>
    </div>

    <!-- Skeleton grid -->
    <div v-if="fetching" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px;">
      <div
        v-for="i in 3" :key="i"
        style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 18px; animation: pulse 1.5s infinite;"
      >
        <div style="height: 2px; background: #EFEAE0; border-radius: 2px; margin-bottom: 16px;" />
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <div>
            <div style="height: 13px; width: 120px; background: #EFEAE0; border-radius: 4px; margin-bottom: 6px;" />
            <div style="height: 10px; width: 80px; background: #F7F4EF; border-radius: 4px;" />
          </div>
          <div style="width: 28px; height: 28px; border-radius: 8px; background: #EFEAE0;" />
        </div>
        <div style="display: flex; gap: 14px; padding: 10px 0; border-top: 1px solid #ECEFEB; border-bottom: 1px solid #ECEFEB; margin-bottom: 12px;">
          <div v-for="j in 3" :key="j" style="flex: 1;">
            <div style="height: 8px; width: 40px; background: #F7F4EF; border-radius: 3px; margin-bottom: 5px;" />
            <div style="height: 13px; width: 36px; background: #EFEAE0; border-radius: 3px;" />
          </div>
        </div>
      </div>
    </div>

    <!-- Real grid -->
    <div
      v-else-if="walletStore.wallets.length"
      style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px;"
    >
      <WalletCard
        v-for="wallet in walletStore.wallets"
        :key="wallet.id"
        :wallet="wallet"
      />

      <!-- New wallet CTA -->
      <div
        style="display: grid; place-items: center; min-height: 240px; background: #EFEAE0; border: 2px dashed #D8DDD7; border-radius: 14px; cursor: pointer;"
        @click="router.push({ name: 'WalletCreate' })"
      >
        <div style="text-align: center; padding: 20px;">
          <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(232,146,10,0.12); display: grid; place-items: center; margin: 0 auto 12px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8920A" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </div>
          <div style="font-size: 14px; font-weight: 600; color: #0F1B14; margin-bottom: 4px;">Nueva wallet</div>
          <div style="font-size: 11.5px; color: #6B7A72; max-width: 180px; line-height: 1.4;">
            Crea una wallet para tus eventos, promociones o planes de membresía.
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else style="text-align: center; padding: 80px 20px; color: #6B7A72;">
      <div style="font-size: 40px; margin-bottom: 12px;">💳</div>
      <p style="font-size: 15px; font-weight: 600; color: #0F1B14; margin-bottom: 6px;">No hay wallets creadas</p>
      <p style="font-size: 13px; margin-bottom: 16px;">Crea tu primera wallet para empezar</p>
      <button
        style="padding: 9px 18px; border-radius: 8px; background: #E8920A; color: #13301F; font-weight: 600; font-size: 13px; border: none; cursor: pointer;"
        @click="router.push({ name: 'WalletCreate' })"
      >
        Crear wallet
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
