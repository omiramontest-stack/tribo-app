<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import { walletTypeConfig } from '@/app/config/walletTypeConfig'
import { useOrgWallets } from '@/app/composables/useOrgWallets'

const walletStore = useWalletStore()
const orgStore   = useOrganizationStore()
const router     = useRouter()
const { fetching } = useOrgWallets()

const totalWallets = computed(() => walletStore.wallets.length)
const hasWallets   = computed(() => totalWallets.value > 0)
const totalTypes   = computed(() => new Set(walletStore.wallets.map(w => w.type)).size)

// ── Time-based hero theme ─────────────────────────────────────────────────
const heroTheme = computed(() => {
  const h = new Date().getHours()

  if (h >= 6 && h < 12) return { greetingColor: 'var(--warning)', emoji: '☀️' }
  if (h >= 12 && h < 19) return { greetingColor: 'var(--primary-mid)', emoji: '👋' }
  return { greetingColor: '#4B6A8A', emoji: '🌙' }
})

// ── Welcome ───────────────────────────────────────────────────────────────
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
})

const welcomeSub = computed(() => {
  if (fetching.value) return null
  if (!hasWallets.value) return 'Crea tu primera wallet para empezar a conectar con tus clientes.'
  const n = totalWallets.value
  const t = totalTypes.value
  return `Tienes ${n} wallet${n !== 1 ? 's' : ''} activa${n !== 1 ? 's' : ''} en ${t} tipo${t !== 1 ? 's' : ''} distinto${t !== 1 ? 's' : ''}.`
})

// ── Type distribution (only when has wallets) ─────────────────────────────
const typeDistribution = computed(() => {
  const counts: Record<string, number> = {}
  for (const w of walletStore.wallets) counts[w.type] = (counts[w.type] ?? 0) + 1
  return walletTypeConfig
    .filter(c => counts[c.value])
    .map(c => ({ ...c, count: counts[c.value] }))
    .sort((a, b) => b.count - a.count)
})

// ── Helpers ───────────────────────────────────────────────────────────────
function walletTypeInfo(type: string) {
  return walletTypeConfig.find(c => c.value === type)
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="dash">

    <!-- ── Welcome hero ─────────────────────────────────────────────── -->
    <div class="hero">
      <div class="hero-content">
        <div class="hero-left">
          <p class="hero-greeting" :style="{ color: heroTheme.greetingColor }">
            <span class="greeting-emoji">{{ heroTheme.emoji }}</span>
            {{ greeting }}
          </p>
          <h2 class="hero-org">{{ orgStore.activeOrg?.name ?? 'Tu organización' }}</h2>
          <p v-if="welcomeSub" class="hero-sub">{{ welcomeSub }}</p>
        </div>
        <div class="hero-actions">
          <button class="btn-hero-primary" @click="router.push({ name: 'WalletCreate' })">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Nueva wallet
          </button>
          <button class="btn-hero-ghost" @click="router.push({ name: 'Scan' })">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v3M14 18v3M17 21h4"/>
            </svg>
            Escanear
          </button>
        </div>
      </div>
    </div>


    <!-- ── Wallets section ───────────────────────────────────────────── -->
    <div class="wallets-card">

      <!-- Header -->
      <div class="wallets-header">
        <div class="wallets-header-left">
          <h3 class="wallets-title">Tus wallets</h3>
          <!-- Type distribution pills -->
          <div v-if="!fetching && typeDistribution.length" class="type-pills">
            <span
              v-for="t in typeDistribution" :key="t.value"
              class="type-pill"
              :style="{ background: t.iconBg, color: t.iconColor }"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path :d="t.iconPath" />
              </svg>
              {{ t.label }} &middot; {{ t.count }}
            </span>
          </div>
        </div>
        <button
          v-if="hasWallets && !fetching"
          class="btn-link"
          @click="router.push({ name: 'Wallets' })"
        >
          Ver todas
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <!-- ── Skeleton ── -->
      <div v-if="fetching" class="wallet-grid">
        <div v-for="i in 4" :key="i" class="wallet-skel">
          <div class="wallet-skel-strip sk" />
          <div class="wallet-skel-body">
            <div class="sk" style="width: 32px; height: 32px; border-radius: 8px; background: var(--bg-subtle); flex-shrink: 0;" />
            <div style="flex: 1;">
              <div class="sk" style="height: 13px; width: 120px; border-radius: 4px; background: var(--bg-subtle); margin-bottom: 6px;" />
              <div class="sk" style="height: 10px; width: 72px; border-radius: 4px; background: var(--bg-subtle);" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── Wallet cards ── -->
      <div v-else-if="hasWallets" class="wallet-grid">
        <div
          v-for="wallet in walletStore.wallets.slice(0, 6)"
          :key="wallet.id"
          class="wallet-card"
          @click="router.push({ name: 'WalletDetail', params: { id: wallet.id } })"
        >
          <!-- Brand color strip -->
          <div class="wallet-strip" :style="{ background: wallet.primaryColor }" />

          <div class="wallet-body">
            <!-- Top: icon + name -->
            <div class="wallet-top">
              <div
                class="wallet-icon"
                :style="{ background: walletTypeInfo(wallet.type)?.iconBg ?? 'var(--bg-page)' }"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                  :stroke="walletTypeInfo(wallet.type)?.iconColor ?? 'var(--text-muted)'">
                  <path :d="walletTypeInfo(wallet.type)?.iconPath ?? ''" />
                </svg>
              </div>
              <div class="wallet-meta">
                <span class="wallet-name">{{ wallet.businessName }}</span>
                <span class="wallet-type">{{ walletTypeInfo(wallet.type)?.label }}</span>
              </div>
            </div>

            <!-- Bottom: color swatches + date + arrow -->
            <div class="wallet-footer">
              <div class="swatches">
                <div class="swatch" :style="{ background: wallet.primaryColor }" />
                <div class="swatch" :style="{ background: wallet.accentColor }" />
              </div>
              <span class="wallet-date">{{ relativeDate(wallet.createdAt) }}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-faint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Empty state ── -->
      <div v-else class="empty">

        <div class="empty-head">
          <div class="empty-icon-wrap">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke="var(--primary-text)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/>
              <circle cx="17" cy="15" r="1.5" fill="var(--primary-text)" stroke="none"/>
            </svg>
          </div>
          <h3 class="empty-title">Crea tu primera wallet</h3>
          <p class="empty-sub">Elige el tipo que mejor se adapte a tu negocio y empieza a fidelizar clientes hoy.</p>
        </div>

        <!-- Wallet type showcase -->
        <div class="type-showcase">
          <button
            v-for="type in walletTypeConfig"
            :key="type.value"
            class="type-tile"
            @click="router.push({ name: 'WalletCreate' })"
          >
            <div class="type-tile-icon" :style="{ background: type.iconBg }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                :stroke="type.iconColor">
                <path :d="type.iconPath" />
              </svg>
            </div>
            <span class="type-tile-label">{{ type.label }}</span>
            <span class="type-tile-desc">{{ type.desc }}</span>
          </button>
        </div>

        <button class="btn-create" @click="router.push({ name: 'WalletCreate' })">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Crear mi primera wallet
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ── Root ── */
.dash {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ── Hero ── */
.hero {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 24px 28px;
  box-shadow: 0 1px 0 var(--shadow-card);
}

.hero-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  animation: heroFadeIn 0.4s ease-out both;
}

.hero-left { flex: 1; min-width: 0; }

.hero-greeting {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0 0 5px;
}

.greeting-emoji {
  display: inline-block;
  animation: wave 2.4s ease-in-out 0.6s 2;
  transform-origin: 70% 80%;
}

.hero-org {
  font-size: 26px;
  font-weight: 800;
  color: var(--text-ink);
  letter-spacing: -0.025em;
  margin: 0 0 4px;
  line-height: 1.1;
}

.hero-sub {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}

.hero-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-hero-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 10px;
  border: none;
  background: var(--amber);
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: opacity 0.15s, transform 0.12s;
  box-shadow: 0 2px 8px rgba(245,166,35,0.28);
}
.btn-hero-primary:hover { opacity: 0.88; transform: translateY(-1px); }
.btn-hero-primary:active { transform: translateY(0); }

.btn-hero-ghost {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-field);
  color: var(--text-medium);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, transform 0.12s;
}
.btn-hero-ghost:hover { background: var(--bg-subtle); border-color: var(--border-subtle); transform: translateY(-1px); }
.btn-hero-ghost:active { transform: translateY(0); }


/* ── Wallets section ── */
.wallets-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 0 var(--shadow-card);
}

.wallets-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.wallets-header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wallets-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0;
}

.type-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.type-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.btn-link {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--primary-text);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  white-space: nowrap;
  transition: color 0.15s;
}
.btn-link:hover { color: var(--primary); }

/* ── Wallet grid ── */
.wallet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1px;
  background: var(--border);
}

/* ── Wallet card ── */
.wallet-card {
  background: var(--bg-surface);
  cursor: pointer;
  transition: background 0.12s;
  display: flex;
  flex-direction: column;
}
.wallet-card:hover { background: var(--bg-surface); }

.wallet-strip {
  height: 3px;
  width: 100%;
  flex-shrink: 0;
}

.wallet-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.wallet-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.wallet-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.wallet-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wallet-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wallet-type {
  font-size: 11px;
  color: var(--text-muted);
}

.wallet-footer {
  display: flex;
  align-items: center;
  gap: 8px;
}

.swatches {
  display: flex;
  gap: 4px;
}

.swatch {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 1.5px solid rgba(255,255,255,0.6);
  box-shadow: 0 0 0 1px rgba(0,0,0,0.06);
}

.wallet-date {
  flex: 1;
  font-size: 11px;
  color: var(--text-faint);
}

/* ── Skeleton ── */
.wallet-skel {
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
}

.wallet-skel-strip {
  height: 3px;
  background: var(--bg-subtle);
}

.wallet-skel-body {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* ── Empty state ── */
.empty {
  padding: 36px 24px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

.empty-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  max-width: 420px;
}

.empty-icon-wrap {
  width: 60px;
  height: 60px;
  border-radius: 18px;
  background: var(--primary-light);
  display: grid;
  place-items: center;
}

.empty-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--text-ink);
  margin: 0;
  letter-spacing: -0.01em;
}

.empty-sub {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.6;
}

/* ── Wallet type showcase ── */
.type-showcase {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
  width: 100%;
  max-width: 700px;
}

.type-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 7px;
  padding: 14px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: border-color 0.15s, background 0.15s, transform 0.12s;
}
.type-tile:hover {
  border-color: var(--primary-light);
  background: var(--bg-surface);
  transform: translateY(-1px);
}

.type-tile-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
}

.type-tile-label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-ink);
}

.type-tile-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}

.btn-create {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 12px 24px;
  border-radius: 10px;
  border: none;
  background: var(--primary);
  color: var(--bg-surface);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
}
.btn-create:hover { opacity: 0.88; }

/* ── Keyframes ── */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
.sk { animation: pulse 1.5s ease-in-out infinite; }

@keyframes float {
  from { transform: translateY(0px) scale(1); }
  to   { transform: translateY(-12px) scale(1.04); }
}

@keyframes heroFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes wave {
  0%   { transform: rotate(0deg); }
  15%  { transform: rotate(20deg); }
  30%  { transform: rotate(-10deg); }
  45%  { transform: rotate(16deg); }
  60%  { transform: rotate(-6deg); }
  75%  { transform: rotate(10deg); }
  100% { transform: rotate(0deg); }
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .hero { padding: 20px 18px; }
  .hero-content { flex-direction: column; align-items: flex-start; }
  .hero-org { font-size: 19px; }
  .hero-actions { width: 100%; }
  .btn-hero-primary, .btn-hero-ghost { flex: 1; justify-content: center; }
.kpi-grid { grid-template-columns: repeat(2, 1fr); }

  .wallet-grid { grid-template-columns: 1fr; }

  .type-showcase { grid-template-columns: repeat(2, 1fr); }
}
</style>
