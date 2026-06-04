<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useInfiniteScroll } from '@/app/composables/useInfiniteScroll'
import { useDebounce } from '@/app/composables/useDebounce'
import { useRoute, useRouter } from 'vue-router'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { usePassStore } from '@/app/stores/pass/PassStore'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import { walletTypeConfig } from '@/app/config/walletTypeConfig'
import PassTable from '@/app/components/Admin/PassTable.vue'
import GeneratePassModal from '@/app/components/Admin/GeneratePassModal.vue'
import WalletEditModal from '@/app/components/Wallet/WalletEditModal.vue'
import type { Pass } from '@/domain/pass/entities/Pass'

const route = useRoute()
const router = useRouter()
const walletStore   = useWalletStore()
const passStore     = usePassStore()
const authStore     = useAuthStore()
const orgStore      = useOrganizationStore()

const id = route.params.id as string

// Modals
const showModal       = ref(false)   // Generate pass
const showEditModal   = ref(false)   // Edit wallet
const showDeleteModal = ref(false)   // Delete confirm
const deleting = ref(false)

// Role gate: only owners and admins can edit wallets
const canEdit = computed(() => {
  const myMember = orgStore.members.find(m => m.adminId === authStore.admin?.id)
  return myMember?.role === 'owner' || myMember?.role === 'admin'
})
const activeTab = ref<'pases' | 'canjeados'>('pases')
const scannedPasses = ref<Pass[]>([])
const loadingScanned = ref(false)
const passesPage = ref(1)
const scannedPage = ref(1)
const displayPasses = ref<Pass[]>([])
const loadingMore   = ref(false)
const searching     = ref(false)
const passesSentinelRef = ref<HTMLElement | null>(null)
const isMobile = ref(window.matchMedia('(max-width: 767px)').matches)
const searchQuery = ref('')
const debouncedSearch = useDebounce(searchQuery, 350)

watch(debouncedSearch, async (query) => {
  passesPage.value = 1
  searching.value = true
  try {
    await passStore.fetchPassesByWallet(id, 1, query)
    displayPasses.value = [...passStore.passes]
  } finally {
    searching.value = false
  }
})

const searchEmptyMessage = computed(() =>
  debouncedSearch.value.trim()
    ? `Sin resultados para "${debouncedSearch.value.trim()}"`
    : 'No hay pases generados aún.'
)

const isDaypass = computed(() => walletStore.currentWallet?.type === 'daypass')

const wt = computed(() => {
  const found = walletTypeConfig.find(c => c.value === walletStore.currentWallet?.type)
  return found
    ? { label: found.label, accent: found.iconColor, bg: found.iconBg, iconPath: found.iconPath }
    : { label: '—', accent: 'var(--text-muted)', bg: 'var(--bg-field)', iconPath: '' }
})

const initials = computed(() =>
  (walletStore.currentWallet?.businessName ?? '')
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
)

const stats = computed(() => [
  {
    label: 'Emitidos',
    value: passStore.passes.length,
    color: 'var(--amber)',
    bg: 'var(--amber-bg)',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
  {
    label: 'Activos',
    value: passStore.passes.length,
    color: 'var(--primary-text)',
    bg: 'var(--primary-light)',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    label: 'Escaneos',
    value: '—',
    color: 'var(--primary-text)',
    bg: 'var(--primary-light)',
    icon: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z',
  },
  {
    label: 'Canjeados',
    value: '—',
    color: '#8B5CF6',
    bg: '#EBE3FB',
    icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
  },
])

onMounted(async () => {
  await Promise.all([
    walletStore.fetchWalletById(id),
    passStore.fetchPassesByWallet(id, 1),
    // Load members only if not already populated (needed for role check)
    orgStore.members.length === 0 && orgStore.activeOrgId
      ? orgStore.fetchMembers(orgStore.activeOrgId)
      : Promise.resolve(),
  ])
  displayPasses.value = [...passStore.passes]
})

async function goToPassesPage(page: number) {
  passesPage.value = page
  await passStore.fetchPassesByWallet(id, page, debouncedSearch.value)
  displayPasses.value = [...passStore.passes]
}

async function loadMorePasses() {
  if (!isMobile.value || loadingMore.value) return
  if (passesPage.value >= passStore.passesMeta.totalPages) return
  loadingMore.value = true
  passesPage.value++
  try {
    await passStore.fetchPassesByWallet(id, passesPage.value, debouncedSearch.value)
    displayPasses.value = [...displayPasses.value, ...passStore.passes]
  } finally {
    loadingMore.value = false
  }
}

useInfiniteScroll(passesSentinelRef, loadMorePasses)

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

function handleDelete() { showDeleteModal.value = true }

async function confirmDelete() {
  deleting.value = true
  try {
    await walletStore.deleteWallet(id)
    router.push({ name: 'Wallets' })
  } finally {
    deleting.value = false
  }
}

async function onPassGenerated() {
  passesPage.value = 1
  await passStore.fetchPassesByWallet(id, 1)
  displayPasses.value = [...passStore.passes]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<template>
  <div class="detail-page">

    <!-- Page header -->
    <div class="page-header">
      <button class="btn-back-nav" @click="router.back()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Volver
      </button>

      <div class="header-actions">
        <button
          class="btn-action"
          @click="router.push({ name: 'WalletAnalytics', params: { id } })"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21V5M3 21h18"/><path d="M7 17v-5M11 17V9M15 17v-3M19 17V7"/>
          </svg>
          Ver analytics
        </button>
        <button
          v-if="canEdit"
          class="btn-action btn-action--edit"
          @click="showEditModal = true"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Editar
        </button>
        <button
          v-if="canEdit"
          class="btn-danger-outline"
          :disabled="deleting"
          @click="handleDelete"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
          Eliminar
        </button>
      </div>
    </div>

    <!-- Wallet identity card -->
    <div v-if="walletStore.currentWallet" class="identity-card">
      <div class="identity-strip" :style="{ background: walletStore.currentWallet.primaryColor }" />
      <div class="identity-body">
        <div
          class="identity-avatar"
          :style="walletStore.currentWallet.logoUrl ? {} : { background: walletStore.currentWallet.primaryColor }"
        >
          <img
            v-if="walletStore.currentWallet.logoUrl"
            :src="walletStore.currentWallet.logoUrl"
            :alt="walletStore.currentWallet.businessName"
            class="identity-avatar-img"
          />
          <span v-else class="identity-avatar-initials">{{ initials }}</span>
        </div>

        <div class="identity-info">
          <h2 class="identity-name">{{ walletStore.currentWallet.businessName }}</h2>
          <div class="identity-meta">
            <span class="type-badge" :style="{ color: wt.accent, background: wt.bg }">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" :stroke="wt.accent" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path :d="wt.iconPath" />
              </svg>
              {{ wt.label }}
            </span>
            <span v-if="walletStore.currentWallet.description" class="identity-desc">
              {{ walletStore.currentWallet.description }}
            </span>
          </div>
        </div>

        <div class="identity-colors">
          <span class="color-chip" :style="{ background: walletStore.currentWallet.primaryColor }" :title="walletStore.currentWallet.primaryColor" />
          <span class="color-chip" :style="{ background: walletStore.currentWallet.accentColor, opacity: 0.75 }" :title="walletStore.currentWallet.accentColor" />
        </div>
      </div>

      <!-- Business rules / T&C (shown only when present) -->
      <div v-if="walletStore.currentWallet.businessRules" class="business-rules-section">
        <div class="business-rules-header">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
          </svg>
          <span class="business-rules-title">Reglas del negocio</span>
        </div>
        <p class="business-rules-text">{{ walletStore.currentWallet.businessRules }}</p>
      </div>
    </div>

    <!-- Stats grid -->
    <div class="stats-grid">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="stat-card"
      >
        <div class="stat-icon-wrap" :style="{ background: stat.bg }">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" :stroke="stat.color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path :d="stat.icon" />
          </svg>
        </div>
        <div class="stat-body">
          <p class="stat-label">{{ stat.label }}</p>
          <p class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</p>
        </div>
      </div>
    </div>

    <!-- Passes section -->
    <div class="passes-section">

      <!-- Tab bar / header -->
      <div class="passes-header">
        <div v-if="isDaypass" class="tab-group">
          <button
            v-for="tab in [
              { id: 'pases', label: `Activos (${passStore.passesMeta.total})` },
              { id: 'canjeados', label: 'Canjeados' },
            ]"
            :key="tab.id"
            class="tab-btn"
            :class="{ 'tab-btn--active': activeTab === tab.id }"
            @click="switchTab(tab.id as 'pases' | 'canjeados')"
          >
            {{ tab.label }}
          </button>
        </div>

        <p v-else class="passes-title">
          Pases
          <span class="passes-count">{{ passStore.passesMeta.total }}</span>
        </p>

        <button
          v-if="activeTab === 'pases'"
          class="btn-generate"
          @click="showModal = true"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Generar pase
        </button>
      </div>

      <!-- Search bar (solo tab pases) -->
      <div v-if="activeTab === 'pases'" class="passes-search">
        <div class="search-wrap">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            v-model="searchQuery"
            class="search-input"
            type="search"
            placeholder="Buscar por nombre o teléfono…"
            autocomplete="off"
            spellcheck="false"
          />
          <svg v-if="searching" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="spin search-spinner">
            <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9"/>
          </svg>
          <button v-else-if="searchQuery" class="search-clear" title="Limpiar búsqueda" @click="searchQuery = ''">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Active passes -->
      <template v-if="activeTab === 'pases'">
        <PassTable
          :passes="displayPasses"
          :wallet="walletStore.currentWallet!"
          :empty-message="searchEmptyMessage"
        />
        <!-- Sentinel: IntersectionObserver lo detecta en mobile para infinite scroll -->
        <div ref="passesSentinelRef" class="scroll-sentinel" />
        <div v-if="isMobile && loadingMore" class="loading-more">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="spin">
            <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9"/>
          </svg>
          Cargando más…
        </div>
        <!-- Paginación solo en desktop -->
        <div v-if="!isMobile && passStore.passesMeta.totalPages > 1" class="pagination">
          <button
            class="page-btn"
            :disabled="passesPage <= 1"
            @click="goToPassesPage(passesPage - 1)"
          >← Anterior</button>
          <span class="page-info">Página {{ passesPage }} de {{ passStore.passesMeta.totalPages }}</span>
          <button
            class="page-btn"
            :disabled="passesPage >= passStore.passesMeta.totalPages"
            @click="goToPassesPage(passesPage + 1)"
          >Siguiente →</button>
        </div>
      </template>

      <!-- Scanned passes (daypass) -->
      <div v-else-if="activeTab === 'canjeados'">
        <div v-if="loadingScanned" class="passes-loading">Cargando…</div>
        <div v-else-if="!scannedPasses.length" class="passes-empty">
          Aún no se han canjeado pases para este evento.
        </div>
        <div v-else>
          <div
            v-for="pass in scannedPasses"
            :key="pass.id"
            class="scanned-row"
          >
            <div class="scanned-info">
              <p class="scanned-name">{{ pass.firstName }} {{ pass.lastName }}</p>
              <p v-if="pass.phone" class="scanned-sub">{{ pass.phone }}</p>
              <p class="scanned-sub">Escaneado: {{ pass.scannedAt ? formatDate(pass.scannedAt) : '—' }}</p>
            </div>
            <span class="scanned-badge">Canjeado</span>
          </div>
          <div v-if="passStore.scannedMeta.totalPages > 1" class="pagination">
            <button class="page-btn" :disabled="scannedPage <= 1" @click="goToScannedPage(scannedPage - 1)">← Anterior</button>
            <span class="page-info">Página {{ scannedPage }} de {{ passStore.scannedMeta.totalPages }}</span>
            <button class="page-btn" :disabled="scannedPage >= passStore.scannedMeta.totalPages" @click="goToScannedPage(scannedPage + 1)">Siguiente →</button>
          </div>
        </div>
      </div>
    </div>

    <GeneratePassModal
      v-model="showModal"
      :wallet-id="id"
      :wallet-type="walletStore.currentWallet?.type ?? ''"
      @generated="onPassGenerated"
    />
  </div>

  <!-- Edit wallet drawer -->
  <WalletEditModal
    v-if="walletStore.currentWallet"
    v-model="showEditModal"
    :wallet="walletStore.currentWallet"
  />

  <!-- Delete confirmation modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showDeleteModal" class="modal-backdrop" @click.self="showDeleteModal = false">
        <div class="modal-card">
          <div class="modal-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </div>
          <div>
            <p class="modal-title">Eliminar wallet</p>
            <p class="modal-body">
              ¿Eliminar <strong>{{ walletStore.currentWallet?.businessName }}</strong> y todos sus pases?
              Esta acción no se puede deshacer.
            </p>
          </div>
          <div class="modal-actions">
            <button class="modal-btn-cancel" :disabled="deleting" @click="showDeleteModal = false">Cancelar</button>
            <button class="modal-btn-confirm" :disabled="deleting" @click="confirmDelete">
              <svg v-if="deleting" class="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9"/>
              </svg>
              {{ deleting ? 'Eliminando…' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 900px;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-back-nav {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
  transition: color 0.15s;
}
.btn-back-nav:hover { color: var(--text-ink); }

.header-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--primary-text);
  border: 1px solid var(--border);
  padding: 7px 13px;
  border-radius: 8px;
  background: var(--bg-surface);
  cursor: pointer;
  font-weight: 600;
  font-family: inherit;
  transition: background 0.12s, border-color 0.12s;
}
.btn-action:hover { background: var(--bg-page); border-color: var(--border); }
.btn-action--edit { color: var(--amber); border-color: var(--amber-bg); }
.btn-action--edit:hover { background: var(--amber-bg); }

.btn-danger-outline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--danger);
  border: 1px solid var(--danger-bg);
  padding: 7px 13px;
  border-radius: 8px;
  background: var(--bg-surface);
  cursor: pointer;
  font-weight: 600;
  font-family: inherit;
  transition: background 0.12s;
}
.btn-danger-outline:hover { background: var(--danger-bg); }
.btn-danger-outline:disabled { opacity: 0.5; cursor: not-allowed; }

/* Identity card */
.identity-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 0 var(--shadow-card);
}

.identity-strip { height: 3px; }

.identity-body {
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.identity-avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.identity-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
  background: var(--bg-field);
}

.identity-avatar-initials {
  font-size: 17px;
  font-weight: 700;
  color: var(--bg-surface);
  letter-spacing: -0.5px;
}

.identity-info { flex: 1; min-width: 0; }

.identity-name {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0 0 6px;
}

.identity-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
}

.identity-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.identity-colors {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.color-chip {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

/* Business rules section */
.business-rules-section {
  padding: 14px 18px;
  border-top: 1px solid var(--border);
}

.business-rules-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: var(--text-muted);
}

.business-rules-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.business-rules-text {
  font-size: 12.5px;
  color: var(--text-muted);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.stat-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 0 var(--shadow-card);
}

.stat-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-body { min-width: 0; }

.stat-label {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 4px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  margin: 0;
  line-height: 1;
}

/* Passes section */
.passes-section {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 0 var(--shadow-card);
}

.passes-header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.tab-group {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--bg-subtle);
  border-radius: 8px;
}

.tab-btn {
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  background: transparent;
  color: var(--text-muted);
  font-family: inherit;
  transition: all 0.12s;
}
.tab-btn--active {
  background: var(--bg-surface);
  color: var(--text-ink);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.passes-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 7px;
}

.passes-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-subtle);
  padding: 2px 7px;
  border-radius: 999px;
}

.btn-generate {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 8px;
  background: var(--amber);
  color: var(--primary);
  font-weight: 700;
  font-size: 12px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-generate:hover { background: #E8920A; }

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
}

.page-btn {
  padding: 5px 12px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  font-size: 12px;
  cursor: pointer;
  color: var(--text-medium);
  font-family: inherit;
  transition: background 0.12s;
}
.page-btn:hover:not(:disabled) { background: var(--bg-page); }
.page-btn:disabled { opacity: 0.4; cursor: default; }

.page-info {
  font-size: 12px;
  color: var(--text-muted);
}

/* Scanned rows */
.passes-loading,
.passes-empty {
  padding: 48px 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.scanned-row {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.scanned-row:last-child { border-bottom: none; }

.scanned-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-ink);
  margin: 0 0 2px;
}

.scanned-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0 0 1px;
}

.scanned-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--bg-subtle);
  color: var(--text-muted);
  white-space: nowrap;
}

/* Delete modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--overlay);
  backdrop-filter: blur(2px);
}

.modal-card {
  background: var(--bg-surface);
  border-radius: 18px;
  box-shadow: 0 20px 60px var(--shadow-card);
  width: 100%;
  max-width: 380px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--danger-bg);
  display: grid;
  place-items: center;
}

.modal-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0 0 6px;
}

.modal-body {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.55;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.modal-btn-cancel {
  padding: 9px 18px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-medium);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.modal-btn-cancel:hover:not(:disabled) { background: var(--bg-page); }

.modal-btn-confirm {
  padding: 9px 18px;
  border-radius: 9px;
  border: none;
  background: var(--danger);
  font-size: 13px;
  font-weight: 700;
  color: var(--bg-surface);
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.15s;
}
.modal-btn-confirm:hover:not(:disabled) { opacity: 0.88; }
.modal-btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-card,
.modal-leave-active .modal-card { transition: transform 0.2s ease; }
.modal-enter-from .modal-card,
.modal-leave-to .modal-card { transform: scale(0.96); }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }

/* Search bar */
.passes-search {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-page);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0 12px;
  height: 38px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.search-wrap:focus-within {
  border-color: var(--primary-text);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-text) 12%, transparent);
}

.search-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--text-ink);
  font-family: inherit;
  outline: none;
  min-width: 0;
}
.search-input::placeholder { color: var(--text-faint); }
.search-input::-webkit-search-cancel-button { display: none; }

.search-spinner {
  color: var(--text-muted);
  flex-shrink: 0;
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: var(--bg-subtle);
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: background 0.12s, color 0.12s;
}
.search-clear:hover { background: var(--border); color: var(--text-ink); }

.scroll-sentinel { height: 1px; }

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  font-size: 12px;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
}
</style>
