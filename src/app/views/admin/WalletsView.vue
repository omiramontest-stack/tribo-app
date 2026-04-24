<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import WalletCard from '@/app/components/Admin/WalletCard.vue'

const walletStore = useWalletStore()
const orgStore = useOrganizationStore()
const router = useRouter()
const { activeOrgId } = storeToRefs(orgStore)
const fetching = ref(false)

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

    <!-- Skeleton grid -->
    <div v-if="fetching" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="i in 3"
        :key="i"
        class="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 p-5 space-y-4 animate-pulse"
      >
        <div class="flex items-center justify-between">
          <div class="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
          <div class="h-5 w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
        </div>
        <div class="space-y-2">
          <div class="h-3 w-full bg-neutral-100 dark:bg-neutral-700/60 rounded" />
          <div class="h-3 w-3/4 bg-neutral-100 dark:bg-neutral-700/60 rounded" />
        </div>
        <div class="flex gap-2 pt-1">
          <div class="h-7 w-7 rounded-full bg-neutral-200 dark:bg-neutral-700" />
          <div class="h-7 w-7 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        </div>
      </div>
    </div>

    <!-- Real grid -->
    <div v-else-if="walletStore.wallets.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
