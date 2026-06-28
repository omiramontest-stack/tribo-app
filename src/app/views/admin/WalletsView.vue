<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { useOrgWallets } from '@/app/composables/useOrgWallets'
import { walletTypeConfig } from '@/app/config/walletTypeConfig'
import { useWalletCreateModal } from '@/app/composables/useWalletCreateModal'
import WalletCard from '@/app/components/Admin/WalletCard.vue'

const walletStore = useWalletStore()
const { open: openCreateWallet } = useWalletCreateModal()
const { fetching } = useOrgWallets()

const activeFilter = ref('all')

const presentTypes = computed(() =>
  walletTypeConfig.filter(wt => walletStore.wallets.some(w => w.type === wt.value))
)

const filters = computed(() => [
  { value: 'all', label: 'Todas' },
  ...presentTypes.value.map(wt => ({ value: wt.value, label: wt.label })),
])

const filteredWallets = computed(() =>
  activeFilter.value === 'all'
    ? walletStore.wallets
    : walletStore.wallets.filter(w => w.type === activeFilter.value)
)
</script>

<template>
  <div class="wallets-page">

    <!-- Page header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Wallets</h1>
        <p v-if="!fetching" class="page-subtitle">
          {{ walletStore.wallets.length === 0
            ? 'Ninguna wallet creada aún'
            : `${walletStore.wallets.length} wallet${walletStore.wallets.length !== 1 ? 's' : ''} en tu organización` }}
        </p>
      </div>
      <button class="btn-new" @click="openCreateWallet()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        Nueva wallet
      </button>
    </div>

    <!-- Filter pills (only shown when wallets exist) -->
    <div v-if="!fetching && walletStore.wallets.length" class="filter-bar">
      <button
        v-for="f in filters"
        :key="f.value"
        class="filter-pill"
        :class="{ 'filter-pill--active': activeFilter === f.value }"
        @click="activeFilter = f.value"
      >
        {{ f.label }}
        <span v-if="f.value === 'all'" class="pill-count">{{ walletStore.wallets.length }}</span>
        <span v-else class="pill-count">{{ walletStore.wallets.filter(w => w.type === f.value).length }}</span>
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="fetching" class="wallets-grid">
      <div v-for="i in 3" :key="i" class="skeleton-card">
        <div class="skeleton-strip" />
        <div class="skeleton-body">
          <div class="skeleton-row">
            <div class="skeleton-avatar" />
            <div class="skeleton-lines">
              <div class="skeleton-line w-28" />
              <div class="skeleton-line w-16" />
            </div>
          </div>
          <div class="skeleton-divider" />
          <div class="skeleton-meta">
            <div v-for="j in 3" :key="j" class="skeleton-meta-item">
              <div class="skeleton-line w-10 mb-1" />
              <div class="skeleton-line w-14" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Wallet grid -->
    <div v-else-if="walletStore.wallets.length" class="wallets-grid">
      <WalletCard
        v-for="wallet in filteredWallets"
        :key="wallet.id"
        :wallet="wallet"
      />

      <!-- Empty filter result -->
      <div v-if="!filteredWallets.length" class="filter-empty">
        <p class="filter-empty-text">No hay wallets de tipo "{{ filters.find(f => f.value === activeFilter)?.label }}".</p>
        <button class="filter-empty-link" @click="activeFilter = 'all'">Ver todas</button>
      </div>

      <!-- New wallet CTA card -->
      <div
        v-if="filteredWallets.length"
        class="new-wallet-card"
        @click="openCreateWallet()"
      >
        <div class="new-wallet-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2" stroke-linecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </div>
        <p class="new-wallet-title">Nueva wallet</p>
        <p class="new-wallet-desc">Eventos, sellos, puntos, membresías y más.</p>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <div class="empty-icon-wrap">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="3"/>
          <path d="M2 10h20"/>
        </svg>
      </div>
      <p class="empty-title">No hay wallets creadas</p>
      <p class="empty-desc">Crea tu primera wallet para comenzar a emitir pases digitales.</p>
      <button class="btn-new" @click="openCreateWallet()">
        Crear primera wallet
      </button>
    </div>

  </div>
</template>

<style scoped>
.wallets-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Header */
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0 0 3px;
}

.page-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

.btn-new {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 9px;
  background: var(--amber);
  color: var(--primary);
  font-weight: 700;
  font-size: 13px;
  border: none;
  cursor: pointer;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  transition: background 0.15s;
  white-space: nowrap;
}
.btn-new:hover { background: #E8920A; }

/* Filter bar */
.filter-bar {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 13px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: var(--bg-surface);
  color: var(--text-medium);
  border: 1px solid var(--border);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.filter-pill:hover { border-color: var(--text-faint); }
.filter-pill--active {
  background: var(--primary);
  color: var(--bg-surface);
  border-color: transparent;
}

.pill-count {
  font-size: 10px;
  font-weight: 700;
  background: rgba(255,255,255,0.2);
  padding: 1px 5px;
  border-radius: 999px;
}
.filter-pill:not(.filter-pill--active) .pill-count {
  background: var(--border);
  color: var(--text-muted);
}

/* Grid */
.wallets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

/* Skeleton */
.skeleton-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  animation: pulse 1.5s ease-in-out infinite;
}
.skeleton-strip { height: 3px; background: var(--bg-subtle); }
.skeleton-body { padding: 16px; }
.skeleton-row { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; }
.skeleton-avatar { width: 38px; height: 38px; border-radius: 10px; background: var(--bg-subtle); flex-shrink: 0; }
.skeleton-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.skeleton-line { height: 10px; background: var(--bg-subtle); border-radius: 4px; }
.skeleton-line.w-28 { width: 70%; }
.skeleton-line.w-16 { width: 45%; }
.skeleton-line.w-10 { width: 35%; }
.skeleton-line.w-14 { width: 50%; }
.skeleton-line.mb-1 { margin-bottom: 4px; }
.skeleton-divider { height: 1px; background: var(--border); margin-bottom: 12px; }
.skeleton-meta { display: flex; gap: 14px; }
.skeleton-meta-item { flex: 1; display: flex; flex-direction: column; gap: 5px; }

/* New wallet CTA card */
.new-wallet-card {
  display: grid;
  place-items: center;
  min-height: 200px;
  background: var(--bg-subtle);
  border: 2px dashed var(--border);
  border-radius: 14px;
  cursor: pointer;
  text-align: center;
  padding: 20px;
  transition: border-color 0.15s, background 0.15s;
}
.new-wallet-card:hover { border-color: var(--amber); background: var(--amber-bg); }

.new-wallet-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--amber-bg);
  display: grid;
  place-items: center;
  margin: 0 auto 12px;
}

.new-wallet-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-ink);
  margin: 0 0 4px;
}

.new-wallet-desc {
  font-size: 11.5px;
  color: var(--text-muted);
  max-width: 180px;
  line-height: 1.4;
  margin: 0;
}

/* Empty filter result */
.filter-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}
.filter-empty-text { font-size: 13px; margin: 0 0 8px; }
.filter-empty-link {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-mid);
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: var(--bg-subtle);
  display: grid;
  place-items: center;
  margin-bottom: 4px;
}

.empty-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0;
}

.empty-desc {
  font-size: 13px;
  color: var(--text-muted);
  max-width: 320px;
  line-height: 1.5;
  margin: 0;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
</style>
