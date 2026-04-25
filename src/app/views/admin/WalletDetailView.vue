<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { usePassStore } from '@/app/stores/pass/PassStore'
import PassTable from '@/app/components/Admin/PassTable.vue'
import GeneratePassModal from '@/app/components/Admin/GeneratePassModal.vue'
import type { Pass } from '@/domain/pass/entities/Pass'

const route = useRoute()
const router = useRouter()
const walletStore = useWalletStore()
const passStore = usePassStore()

const id = route.params.id as string
const showModal = ref(false)
const deleting = ref(false)
const activeTab = ref<'activos' | 'canjeados'>('activos')
const scannedPasses = ref<Pass[]>([])
const loadingScanned = ref(false)

const isDaypass = computed(() => walletStore.currentWallet?.type === 'daypass')

const typeLabel: Record<string, string> = {
  stamps: 'Sellos',
  membership: 'Membresía',
  points: 'Puntos',
  cashback: 'Cashback',
  daypass: 'Day Pass',
}

onMounted(async () => {
  await Promise.all([walletStore.fetchWalletById(id), passStore.fetchPassesByWallet(id)])
})

async function switchTab(tab: 'activos' | 'canjeados') {
  activeTab.value = tab
  if (tab === 'canjeados' && scannedPasses.value.length === 0) {
    loadingScanned.value = true
    try {
      scannedPasses.value = await passStore.fetchScannedPasses(id)
    } finally {
      loadingScanned.value = false
    }
  }
}

async function handleDelete() {
  if (!confirm('¿Eliminar esta wallet y todos sus passes?')) return
  deleting.value = true
  await walletStore.deleteWallet(id)
  router.push({ name: 'Wallets' })
}

async function onPassGenerated() {
  await passStore.fetchPassesByWallet(id)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
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
            {{ typeLabel[walletStore.currentWallet.type] ?? walletStore.currentWallet.type }}
          </span>
        </div>
      </div>
      <p v-if="walletStore.currentWallet.description" class="text-sm text-neutral-500 dark:text-neutral-400">
        {{ walletStore.currentWallet.description }}
      </p>
    </div>

    <!-- Passes section -->
    <div class="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700">
      <!-- Header con tabs para daypass, header simple para el resto -->
      <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between gap-4">
        <!-- Tabs (solo daypass) -->
        <div v-if="isDaypass" class="flex gap-1 bg-neutral-100 dark:bg-neutral-700 p-1 rounded-lg">
          <button
            class="px-3 py-1 rounded-md text-sm font-medium transition-colors"
            :class="activeTab === 'activos'
              ? 'bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'"
            @click="switchTab('activos')"
          >
            Activos ({{ passStore.passes.length }})
          </button>
          <button
            class="px-3 py-1 rounded-md text-sm font-medium transition-colors"
            :class="activeTab === 'canjeados'
              ? 'bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'"
            @click="switchTab('canjeados')"
          >
            Canjeados
          </button>
        </div>

        <!-- Título simple para otros tipos -->
        <h2 v-else class="font-semibold text-neutral-800 dark:text-white">
          Passes ({{ passStore.passes.length }})
        </h2>

        <button
          v-if="activeTab === 'activos'"
          class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg shrink-0"
          @click="showModal = true"
        >
          + Generar Pase
        </button>
      </div>

      <!-- Tab: Activos -->
      <PassTable
        v-if="activeTab === 'activos'"
        :passes="passStore.passes"
        :wallet="walletStore.currentWallet!"
      />

      <!-- Tab: Canjeados (solo daypass) -->
      <div v-else-if="activeTab === 'canjeados'">
        <div v-if="loadingScanned" class="px-5 py-8 text-center text-neutral-400 text-sm">
          Cargando...
        </div>
        <div v-else-if="!scannedPasses.length" class="px-5 py-8 text-center text-neutral-400 text-sm">
          Aún no se han canjeado pases para este evento.
        </div>
        <div v-else class="divide-y divide-neutral-100 dark:divide-neutral-700">
          <div
            v-for="pass in scannedPasses"
            :key="pass.id"
            class="px-5 py-3 flex items-center justify-between gap-4"
          >
            <div>
              <p class="font-medium text-sm text-neutral-800 dark:text-white">
                {{ pass.firstName }} {{ pass.lastName }}
              </p>
              <p v-if="pass.phone" class="text-xs text-neutral-400 mt-0.5">{{ pass.phone }}</p>
              <p class="text-xs text-neutral-400 mt-0.5">
                Escaneado: {{ formatDate((pass as any).deletedAt) }}
              </p>
            </div>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 shrink-0">
              Canjeado
            </span>
          </div>
        </div>
      </div>
    </div>

    <GeneratePassModal
      v-model="showModal"
      :wallet-id="id"
      @generated="onPassGenerated"
    />
  </div>
</template>
