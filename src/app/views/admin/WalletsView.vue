<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import WalletCard from '@/app/components/Admin/WalletCard.vue'

const walletStore = useWalletStore()
const router = useRouter()

onMounted(async () => {
  await walletStore.fetchWallets()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-neutral-800 dark:text-white">Wallets</h1>
      <button
        class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        @click="router.push({ name: 'WalletCreate' })"
      >
        + Nueva Wallet
      </button>
    </div>

    <div v-if="walletStore.wallets.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <WalletCard
        v-for="wallet in walletStore.wallets"
        :key="wallet.id"
        :wallet="wallet"
      />
    </div>

    <div v-else class="text-center py-20 text-neutral-400">
      <p class="text-4xl mb-3">💳</p>
      <p class="font-medium">No hay wallets creadas</p>
      <p class="text-sm mt-1">Crea tu primera wallet para empezar</p>
      <button
        class="mt-4 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg"
        @click="router.push({ name: 'WalletCreate' })"
      >
        Crear wallet
      </button>
    </div>
  </div>
</template>
