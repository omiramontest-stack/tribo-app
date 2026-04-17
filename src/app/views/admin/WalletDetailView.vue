<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { usePassStore } from '@/app/stores/pass/PassStore'
import PassTable from '@/app/components/Admin/PassTable.vue'
import GeneratePassModal from '@/app/components/Admin/GeneratePassModal.vue'

const route = useRoute()
const router = useRouter()
const walletStore = useWalletStore()
const passStore = usePassStore()

const id = route.params.id as string
const showModal = ref(false)
const deleting = ref(false)

const typeLabel: Record<string, string> = {
  stamps: 'Sellos',
  membership: 'Membresía',
  points: 'Puntos',
}

onMounted(async () => {
  await Promise.all([walletStore.fetchWalletById(id), passStore.fetchPassesByWallet(id)])
})

async function handleDelete() {
  if (!confirm('¿Eliminar esta wallet y todos sus passes?')) return
  deleting.value = true
  await walletStore.deleteWallet(id)
  router.push({ name: 'Wallets' })
}

async function onPassGenerated() {
  await passStore.fetchPassesByWallet(id)
}
</script>

<template>
  <div class="space-y-6 max-w-3xl">
    <div class="flex items-center gap-3">
      <button class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200" @click="router.back()">
        ← Volver
      </button>
      <h1 class="text-2xl font-bold text-neutral-800 dark:text-white flex-1">
        {{ walletStore.currentWallet?.businessName ?? '...' }}
      </h1>
      <button
        class="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg"
        :disabled="deleting"
        @click="handleDelete"
      >
        Eliminar
      </button>
    </div>

    <!-- Wallet info -->
    <div
      v-if="walletStore.currentWallet"
      class="bg-white dark:bg-neutral-800 rounded-xl p-5 border border-neutral-100 dark:border-neutral-700 space-y-3"
    >
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full" :style="{ backgroundColor: walletStore.currentWallet.primaryColor }" />
        <div>
          <p class="font-semibold text-neutral-800 dark:text-white">{{ walletStore.currentWallet.businessName }}</p>
          <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">
            {{ typeLabel[walletStore.currentWallet.type] }}
          </span>
        </div>
      </div>
      <p v-if="walletStore.currentWallet.description" class="text-sm text-neutral-500 dark:text-neutral-400">
        {{ walletStore.currentWallet.description }}
      </p>
    </div>

    <!-- Passes -->
    <div class="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700">
      <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
        <h2 class="font-semibold text-neutral-800 dark:text-white">
          Passes ({{ passStore.passes.length }})
        </h2>
        <button
          class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
          @click="showModal = true"
        >
          + Generar Pase
        </button>
      </div>
      <PassTable :passes="passStore.passes" :wallet="walletStore.currentWallet!" />
    </div>

    <GeneratePassModal
      v-model="showModal"
      :wallet-id="id"
      @generated="onPassGenerated"
    />
  </div>
</template>
