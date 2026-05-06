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
const activeTab = ref<'pases' | 'canjeados'>('pases')
const scannedPasses = ref<Pass[]>([])
const loadingScanned = ref(false)

const isDaypass = computed(() => walletStore.currentWallet?.type === 'daypass')

const typeConfig: Record<string, { label: string; accent: string; bg: string }> = {
  stamps:     { label: 'Sellos',    accent: '#7C5E3C', bg: '#F1E6D4' },
  membership: { label: 'Membresía', accent: '#1B4332', bg: '#D9E5DD' },
  points:     { label: 'Puntos',    accent: '#8B5CF6', bg: '#EBE3FB' },
  cashback:   { label: 'Cashback',  accent: '#E8920A', bg: '#FCEBC4' },
  daypass:    { label: 'Day Pass',  accent: '#0EA5E9', bg: '#D6EEFB' },
}

const wt = computed(() => typeConfig[walletStore.currentWallet?.type ?? ''] ?? { label: '—', accent: '#6B7A72', bg: '#F7F4EF' })

onMounted(async () => {
  await Promise.all([walletStore.fetchWalletById(id), passStore.fetchPassesByWallet(id)])
})

async function switchTab(tab: 'pases' | 'canjeados') {
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
      <PassTable
        v-if="activeTab === 'pases'"
        :passes="passStore.passes"
        :wallet="walletStore.currentWallet!"
      />

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
                Escaneado: {{ formatDate((pass as any).deletedAt) }}
              </p>
            </div>
            <span style="font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px; background: #EFEAE0; color: #6B7A72;">
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
