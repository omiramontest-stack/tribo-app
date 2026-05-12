<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import { walletTypeConfig } from '@/app/config/walletTypeConfig'
import { useOrgWallets } from '@/app/composables/useOrgWallets'

const walletStore = useWalletStore()
const orgStore   = useOrganizationStore()
const router     = useRouter()
const { fetching } = useOrgWallets()

// Fetch team members silently whenever the org changes
function loadMembers() {
  if (orgStore.activeOrgId) orgStore.fetchMembers(orgStore.activeOrgId).catch(() => {})
}
onMounted(loadMembers)
watch(() => orgStore.activeOrgId, loadMembers)

// ── KPIs ──────────────────────────────────────────────────────────────────
const totalWallets  = computed(() => walletStore.wallets.length)
const hasWallets    = computed(() => totalWallets.value > 0)
const totalTypes    = computed(() => new Set(walletStore.wallets.map(w => w.type)).size)
const totalMembers  = computed(() => orgStore.members.length)

const walletThisMonth = computed(() => {
  const now = new Date()
  return walletStore.wallets.filter(w => {
    const d = new Date(w.createdAt)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length
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
      <!-- Decorative triangle watermark -->
      <svg class="hero-watermark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <line x1="10" y1="28" x2="30" y2="28" stroke="white" stroke-width="1.5"/>
        <line x1="10" y1="28" x2="20" y2="10" stroke="white" stroke-width="1.5"/>
        <line x1="20" y1="10" x2="30" y2="28" stroke="white" stroke-width="1.5"/>
        <circle cx="20" cy="10" r="3" fill="white"/>
        <circle cx="10" cy="28" r="3" fill="white"/>
        <circle cx="30" cy="28" r="3" fill="white"/>
      </svg>

      <div class="hero-content">
        <div class="hero-text">
          <p class="hero-greeting">{{ greeting }} 👋</p>
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

    <!-- ── KPI grid ──────────────────────────────────────────────────── -->
    <div class="kpi-grid">

      <div class="kpi-card">
        <div class="kpi-icon" style="background: #E8F5EE; color: #1B4332;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/>
            <circle cx="17" cy="15" r="1.5" fill="currentColor" stroke="none"/>
          </svg>
        </div>
        <div class="kpi-body">
          <div class="kpi-value">
            <div v-if="fetching" class="kpi-skel" />
            <span v-else>{{ totalWallets }}</span>
          </div>
          <div class="kpi-label">Wallets activas</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon" style="background: #EDE9FE; color: #7C3AED;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
        </div>
        <div class="kpi-body">
          <div class="kpi-value">
            <div v-if="fetching" class="kpi-skel" />
            <span v-else>{{ totalTypes }}</span>
          </div>
          <div class="kpi-label">Tipos activos</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon" style="background: #FCEBC4; color: #D97706;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
        </div>
        <div class="kpi-body">
          <div class="kpi-value">
            <div v-if="fetching" class="kpi-skel" />
            <span v-else>{{ walletThisMonth }}</span>
          </div>
          <div class="kpi-label">Creadas este mes</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon" style="background: #FCE7F3; color: #BE185D;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6"/>
            <circle cx="17" cy="7" r="2.5"/><path d="M16 14c3.5 0 6 2.5 6 6"/>
          </svg>
        </div>
        <div class="kpi-body">
          <div class="kpi-value">
            <span>{{ totalMembers || '—' }}</span>
          </div>
          <div class="kpi-label">Miembros del equipo</div>
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
            <div class="sk" style="width: 32px; height: 32px; border-radius: 8px; background: #EFEAE0; flex-shrink: 0;" />
            <div style="flex: 1;">
              <div class="sk" style="height: 13px; width: 120px; border-radius: 4px; background: #EFEAE0; margin-bottom: 6px;" />
              <div class="sk" style="height: 10px; width: 72px; border-radius: 4px; background: #F5F0E8;" />
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
                :style="{ background: walletTypeInfo(wallet.type)?.iconBg ?? '#F7F4EF' }"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                  :stroke="walletTypeInfo(wallet.type)?.iconColor ?? '#6B7A72'">
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
                stroke="#C4CEC7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
              stroke="#1B4332" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/>
              <circle cx="17" cy="15" r="1.5" fill="#1B4332" stroke="none"/>
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
  position: relative;
  overflow: hidden;
  background: #1B4332;
  border-radius: 16px;
  padding: 24px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.hero-watermark {
  position: absolute;
  top: -20px;
  right: -16px;
  width: 120px;
  height: 120px;
  opacity: 0.06;
  pointer-events: none;
}

.hero-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  width: 100%;
  position: relative;
  z-index: 1;
}

.hero-text { flex: 1; min-width: 0; }

.hero-greeting {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #7FA68B;
  margin: 0 0 4px;
}

.hero-org {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
  line-height: 1.15;
}

.hero-sub {
  font-size: 13px;
  color: #9DB7A8;
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
  padding: 9px 16px;
  border-radius: 9px;
  border: none;
  background: #E8920A;
  color: #13301F;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: opacity 0.15s;
}
.btn-hero-primary:hover { opacity: 0.88; }

.btn-hero-ghost {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 9px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.08);
  color: #D4E0D8;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: background 0.15s;
}
.btn-hero-ghost:hover { background: rgba(255,255,255,0.14); }

/* ── KPI grid ── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.kpi-card {
  background: #fff;
  border: 1px solid #ECEFEB;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  box-shadow: 0 1px 0 rgba(15,27,20,0.02);
}

.kpi-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.kpi-body { flex: 1; min-width: 0; }

.kpi-value {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #0F1B14;
  line-height: 1;
  margin-bottom: 5px;
  min-height: 28px;
  display: flex;
  align-items: center;
}

.kpi-label {
  font-size: 11.5px;
  color: #6B7A72;
  font-weight: 500;
}

.kpi-skel {
  width: 48px;
  height: 28px;
  border-radius: 6px;
  background: #EFEAE0;
  animation: pulse 1.5s ease-in-out infinite;
}

/* ── Wallets section ── */
.wallets-card {
  background: #fff;
  border: 1px solid #ECEFEB;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 0 rgba(15,27,20,0.02);
}

.wallets-header {
  padding: 16px 20px;
  border-bottom: 1px solid #ECEFEB;
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
  color: #0F1B14;
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
  color: #2D6A4F;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  white-space: nowrap;
  transition: color 0.15s;
}
.btn-link:hover { color: #1B4332; }

/* ── Wallet grid ── */
.wallet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1px;
  background: #ECEFEB;
}

/* ── Wallet card ── */
.wallet-card {
  background: #fff;
  cursor: pointer;
  transition: background 0.12s;
  display: flex;
  flex-direction: column;
}
.wallet-card:hover { background: #FAFCFA; }

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
  color: #0F1B14;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wallet-type {
  font-size: 11px;
  color: #6B7A72;
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
  color: #A8B3AC;
}

/* ── Skeleton ── */
.wallet-skel {
  background: #fff;
  display: flex;
  flex-direction: column;
}

.wallet-skel-strip {
  height: 3px;
  background: #EFEAE0;
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
  background: #E8F5EE;
  display: grid;
  place-items: center;
}

.empty-title {
  font-size: 17px;
  font-weight: 800;
  color: #0F1B14;
  margin: 0;
  letter-spacing: -0.01em;
}

.empty-sub {
  font-size: 13px;
  color: #6B7A72;
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
  border: 1px solid #ECEFEB;
  background: #FAFCFA;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: border-color 0.15s, background 0.15s, transform 0.12s;
}
.type-tile:hover {
  border-color: #C4D8CB;
  background: #fff;
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
  color: #0F1B14;
}

.type-tile-desc {
  font-size: 11px;
  color: #6B7A72;
  line-height: 1.4;
}

.btn-create {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 12px 24px;
  border-radius: 10px;
  border: none;
  background: #1B4332;
  color: #fff;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
}
.btn-create:hover { opacity: 0.88; }

/* ── Skeleton pulse ── */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
.sk { animation: pulse 1.5s ease-in-out infinite; }

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
