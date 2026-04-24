<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'

const walletStore = useWalletStore()
const authStore = useAuthStore()
const orgStore = useOrganizationStore()
const { activeOrgId, activeOrg } = storeToRefs(orgStore)
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
        {{ activeOrg?.name ?? authStore.admin?.email }}
      </p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-neutral-100 dark:border-neutral-700">
        <p class="text-sm text-neutral-500 dark:text-neutral-400">Total Wallets</p>
        <div v-if="fetching" class="h-9 w-12 bg-neutral-200 dark:bg-neutral-700 rounded mt-1 animate-pulse" />
        <p v-else class="text-3xl font-bold text-blue-600 mt-1">{{ totalWallets }}</p>
      </div>
    </div>

    <!-- Wallets list preview -->
    <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-100 dark:border-neutral-700">
      <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-700">
        <h2 class="font-semibold text-neutral-800 dark:text-white">Wallets recientes</h2>
      </div>

      <!-- Skeleton -->
      <div v-if="fetching" class="divide-y divide-neutral-100 dark:divide-neutral-700">
        <div v-for="i in 3" :key="i" class="px-5 py-3 flex items-center justify-between animate-pulse">
          <div class="space-y-1.5">
            <div class="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
            <div class="h-3 w-16 bg-neutral-100 dark:bg-neutral-700/60 rounded" />
          </div>
          <div class="h-3 w-10 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
      </div>

      <div v-else-if="walletStore.wallets.length" class="divide-y divide-neutral-100 dark:divide-neutral-700">
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
