<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { usePassStore } from '@/app/stores/pass/PassStore'
import { walletTypeConfig } from '@/app/config/walletTypeConfig'
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
const activeTab = ref<'pases' | 'canjeados'>('pases')
const scannedPasses = ref<Pass[]>([])
const loadingScanned = ref(false)
const passesPage = ref(1)
const scannedPage = ref(1)

const isDaypass = computed(() => walletStore.currentWallet?.type === 'daypass')

import { walletTypeConfig } from '@/app/config/walletTypeConfig'

const wt = computed(() => {
  const found = walletTypeConfig.find(c => c.value === walletStore.currentWallet?.type)
  return found
    ? { label: found.label, accent: found.iconColor, bg: found.iconBg }
    : { label: '—', accent: '#6B7A72', bg: '#F7F4EF' }
})

onMounted(async () => {
  await Promise.all([walletStore.fetchWalletById(id), passStore.fetchPassesByWallet(id, 1)])
})

async function goToPassesPage(page: number) {
  passesPage.value = page
  await passStore.fetchPassesByWallet(id, page)
}

async function switchTab(tab: 'pases' | 'canjeados') {
  activeTab.value = tab
  if (tab === 'canjeados' && scannedPasses.value.length === 0) {
    loadingScanned.value = true
    try {
      scannedPasses.value = await passStore.fetchScannedPasses(id, 1)
      scannedPage.value = 1
    } finally {
      loadingScanned.value = false
    }
  }
}

async function goToScannedPage(page: number) {
  scannedPage.value = page
  loadingScanned.value = true
  try {
    scannedPasses.value = await passStore.fetchScannedPasses(id, page)
  } finally {
    loadingScanned.value = false
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
  <div style="display: flex; flex-direction: column; gap: 20px; max-width: 900px;">

    <!-- Page header -->
    <div style="display: flex; align-items: center; gap: 12px;">
      <button
        style="font-size: 13px; color: #6B7A72; background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px;"
        @click="router.back()"
      >
        ← Volver
      </button>
      <div style="flex: 1;" />
      <button
        style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #1B4332; border: 1px solid #ECEFEB; padding: 6px 12px; border-radius: 8px; background: #fff; cursor: pointer; font-weight: 600;"
        @click="router.push({ name: 'WalletAnalytics', params: { id } })"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 21V5M3 21h18"/><path d="M7 17v-5M11 17V9M15 17v-3M19 17V7"/>
        </svg>
        Ver Analytics
      </button>
      <button
        :disabled="deleting"
        style="font-size: 12px; color: #DC2626; border: 1px solid #FCA5A5; padding: 6px 12px; border-radius: 8px; background: #fff; cursor: pointer;"
        @click="handleDelete"
      >
        Eliminar wallet
      </button>
    </div>

    <!-- Wallet info card -->
    <div
      v-if="walletStore.currentWallet"
      style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 0 rgba(15,27,20,0.02);"
    >
      <div style="height: 3px;" :style="{ background: walletStore.currentWallet.primaryColor }" />
      <div style="padding: 18px; display: flex; align-items: center; gap: 14px;">
        <div
          class="grid place-items-center shrink-0"
          style="width: 44px; height: 44px; border-radius: 12px;"
          :style="{ background: wt.bg }"
        >
          <div style="width: 16px; height: 16px; border-radius: 4px;" :style="{ background: walletStore.currentWallet.primaryColor }" />
        </div>
        <div>
          <h2 style="font-size: 17px; font-weight: 700; color: #0F1B14; margin: 0 0 4px;">
            {{ walletStore.currentWallet.businessName }}
          </h2>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span
              style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px;"
              :style="{ color: wt.accent, background: wt.bg }"
            >
              {{ wt.label }}
            </span>
            <span v-if="walletStore.currentWallet.description" style="font-size: 12px; color: #6B7A72;">
              {{ walletStore.currentWallet.description }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Overview stats -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
      <div
        v-for="stat in [
          { label: 'Emitidos', value: passStore.passes.length, color: '#E8920A' },
          { label: 'Activos',  value: passStore.passes.length, color: '#1B4332' },
          { label: 'Escaneos', value: '—', color: '#2D6A4F' },
          { label: 'Canjeados',value: '—', color: '#8B5CF6' },
        ]"
        :key="stat.label"
        style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 14px; box-shadow: 0 1px 0 rgba(15,27,20,0.02);"
        :style="{ borderLeft: `4px solid ${stat.color}` }"
      >
        <div style="font-size: 11px; color: #6B7A72; font-weight: 600; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
          {{ stat.label }}
        </div>
        <div style="font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums;" :style="{ color: stat.color }">
          {{ stat.value }}
        </div>
      </div>
    </div>

    <!-- Passes section -->
    <div style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 0 rgba(15,27,20,0.02);">

      <!-- Tab bar header -->
      <div style="padding: 14px 20px; border-bottom: 1px solid #ECEFEB; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
        <!-- Tabs for daypass, simple title otherwise -->
        <div
          v-if="isDaypass"
          style="display: flex; gap: 2px; padding: 3px; background: #EFEAE0; border-radius: 8px;"
        >
          <button
            v-for="tab in [{ id: 'pases', label: `Activos (${passStore.passes.length})` }, { id: 'canjeados', label: 'Canjeados' }]"
            :key="tab.id"
            style="padding: 6px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; border: none; cursor: pointer; transition: all 0.12s;"
            :style="activeTab === tab.id
              ? 'background: #fff; color: #0F1B14; box-shadow: 0 1px 2px rgba(0,0,0,0.05);'
              : 'background: transparent; color: #6B7A72;'"
            @click="switchTab(tab.id as 'pases' | 'canjeados')"
          >
            {{ tab.label }}
          </button>
        </div>

        <div v-else style="font-size: 14px; font-weight: 600; color: #0F1B14;">
          Pases ({{ passStore.passes.length }})
        </div>

        <button
          v-if="activeTab === 'pases'"
          style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; background: #E8920A; color: #13301F; font-weight: 600; font-size: 12px; border: none; cursor: pointer;"
          @click="showModal = true"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Generar pase
        </button>
      </div>

      <!-- Passes table (activos) -->
      <template v-if="activeTab === 'pases'">
        <PassTable
          :passes="passStore.passes"
          :wallet="walletStore.currentWallet!"
        />
        <div
          v-if="passStore.passesMeta.totalPages > 1"
          style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 20px; border-top: 1px solid #ECEFEB;"
        >
          <button
            :disabled="passesPage <= 1"
            style="padding: 5px 12px; border-radius: 7px; border: 1px solid #ECEFEB; background: #fff; font-size: 12px; cursor: pointer; color: #3A4A41; disabled:opacity-50;"
            :style="passesPage <= 1 ? 'opacity:0.4;cursor:default;' : ''"
            @click="goToPassesPage(passesPage - 1)"
          >← Anterior</button>
          <span style="font-size: 12px; color: #6B7A72;">
            Página {{ passesPage }} de {{ passStore.passesMeta.totalPages }}
          </span>
          <button
            :disabled="passesPage >= passStore.passesMeta.totalPages"
            style="padding: 5px 12px; border-radius: 7px; border: 1px solid #ECEFEB; background: #fff; font-size: 12px; cursor: pointer; color: #3A4A41;"
            :style="passesPage >= passStore.passesMeta.totalPages ? 'opacity:0.4;cursor:default;' : ''"
            @click="goToPassesPage(passesPage + 1)"
          >Siguiente →</button>
        </div>
      </template>

      <!-- Canjeados (daypass only) -->
      <div v-else-if="activeTab === 'canjeados'">
        <div v-if="loadingScanned" style="padding: 48px 20px; text-align: center; color: #6B7A72; font-size: 13px;">
          Cargando…
        </div>
        <div v-else-if="!scannedPasses.length" style="padding: 48px 20px; text-align: center; color: #6B7A72; font-size: 13px;">
          Aún no se han canjeado pases para este evento.
        </div>
        <div v-else>
          <div
            v-for="pass in scannedPasses"
            :key="pass.id"
            style="padding: 12px 20px; border-bottom: 1px solid #ECEFEB; display: flex; align-items: center; justify-content: space-between; gap: 12px;"
          >
            <div>
              <p style="font-size: 13px; font-weight: 600; color: #0F1B14;">{{ pass.firstName }} {{ pass.lastName }}</p>
              <p v-if="pass.phone" style="font-size: 11px; color: #6B7A72; margin-top: 1px;">{{ pass.phone }}</p>
              <p style="font-size: 11px; color: #6B7A72; margin-top: 1px;">
                Escaneado: {{ pass.scannedAt ? formatDate(pass.scannedAt) : '—' }}
              </p>
            </div>
            <span style="font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px; background: #EFEAE0; color: #6B7A72;">
              Canjeado
            </span>
          </div>
          <div
            v-if="passStore.scannedMeta.totalPages > 1"
            style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 20px; border-top: 1px solid #ECEFEB;"
          >
            <button
              :disabled="scannedPage <= 1"
              style="padding: 5px 12px; border-radius: 7px; border: 1px solid #ECEFEB; background: #fff; font-size: 12px; cursor: pointer; color: #3A4A41;"
              :style="scannedPage <= 1 ? 'opacity:0.4;cursor:default;' : ''"
              @click="goToScannedPage(scannedPage - 1)"
            >← Anterior</button>
            <span style="font-size: 12px; color: #6B7A72;">
              Página {{ scannedPage }} de {{ passStore.scannedMeta.totalPages }}
            </span>
            <button
              :disabled="scannedPage >= passStore.scannedMeta.totalPages"
              style="padding: 5px 12px; border-radius: 7px; border: 1px solid #ECEFEB; background: #fff; font-size: 12px; cursor: pointer; color: #3A4A41;"
              :style="scannedPage >= passStore.scannedMeta.totalPages ? 'opacity:0.4;cursor:default;' : ''"
              @click="goToScannedPage(scannedPage + 1)"
            >Siguiente →</button>
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
