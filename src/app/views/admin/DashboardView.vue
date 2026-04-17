<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { useAuthStore } from '@/app/stores/auth/AuthStore'

const walletStore = useWalletStore()
const authStore = useAuthStore()

const totalWallets = computed(() => walletStore.wallets.length)

onMounted(async () => {
  await walletStore.fetchWallets()
})

const typeLabel: Record<string, string> = {
  stamps: 'Sellos',
  membership: 'Membresía',
  points: 'Puntos',
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-neutral-800 dark:text-white">Dashboard</h1>
      <p class="text-sm text-neutral-500 dark:text-neutral-400">
        Bienvenido, {{ authStore.admin?.businessName }}
      </p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-neutral-100 dark:border-neutral-700">
        <p class="text-sm text-neutral-500 dark:text-neutral-400">Total Wallets</p>
        <p class="text-3xl font-bold text-blue-600 mt-1">{{ totalWallets }}</p>
      </div>
    </div>

    <!-- Wallets list preview -->
    <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-100 dark:border-neutral-700">
      <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-700">
        <h2 class="font-semibold text-neutral-800 dark:text-white">Wallets recientes</h2>
      </div>
      <div v-if="walletStore.wallets.length" class="divide-y divide-neutral-100 dark:divide-neutral-700">
        <div
          v-for="wallet in walletStore.wallets.slice(0, 5)"
          :key="wallet.id"
          class="px-5 py-3 flex items-center justify-between"
        >
          <div>
            <p class="font-medium text-sm text-neutral-800 dark:text-white">{{ wallet.businessName }}</p>
            <p class="text-xs text-neutral-400">{{ typeLabel[wallet.type] }}</p>
          </div>
          <router-link
            :to="{ name: 'WalletDetail', params: { id: wallet.id } }"
            class="text-xs text-blue-500 hover:underline"
          >
            Ver →
          </router-link>
        </div>
      </div>
      <div v-else class="px-5 py-8 text-center text-neutral-400 text-sm">
        No hay wallets creadas aún.
        <router-link :to="{ name: 'WalletCreate' }" class="text-blue-500 hover:underline ml-1">
          Crear una
        </router-link>
      </div>
    </div>
  </div>
</template>
