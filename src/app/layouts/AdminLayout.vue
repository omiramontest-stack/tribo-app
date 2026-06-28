<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import OrgSwitcher from '@/app/components/Admin/OrgSwitcher.vue'
import NotificationBell from '@/app/components/Shared/NotificationBell.vue'
import CommandPalette from '@/app/components/Shared/CommandPalette.vue'
import WalletCreateModal from '@/app/components/Wallet/WalletCreateModal.vue'
import { useCommandPalette } from '@/app/composables/useCommandPalette'
import { useWalletCreateModal } from '@/app/composables/useWalletCreateModal'
import { useTheme } from '@/app/composables/useTheme'

const { open: openPalette } = useCommandPalette()
const { isDark, toggleTheme } = useTheme()
const { isOpen: showCreateWallet } = useWalletCreateModal()
import { apiClient } from '@/infrastructure/http/ApiClient'
import { usePlanGate } from '@/app/composables/usePlanGate'
import { useToast } from '@/app/composables/useToast'
import { useBillingStore } from '@/app/stores/billing/BillingStore'
import { useWhatsAppStore } from '@/app/stores/whatsapp/WhatsAppStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const orgStore = useOrganizationStore()
const billingStore = useBillingStore()
const whatsappStore = useWhatsAppStore()
const moreOpen = ref(false)
const planGate = usePlanGate()
const toast = useToast()
const layoutReady = ref(false)
const bannerDismissed = ref(false)

const trialDaysLeft = computed(() => {
  const info = billingStore.status?.trialInfo
  if (info) return info.daysRemaining
  const endsAt = billingStore.status?.trialEndsAt
  if (!endsAt) return null
  const days = Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000)
  return days > 0 ? days : 0
})
const isTrial = computed(() => trialDaysLeft.value !== null)
const trialActive = computed(() => isTrial.value && (trialDaysLeft.value ?? 0) > 0)
const trialExpired = computed(() => isTrial.value && trialDaysLeft.value === 0)

onMounted(async () => {
  await new Promise((r) => setTimeout(r, 1000))
  layoutReady.value = true
  billingStore.fetchStatus().catch(() => {})
  if (orgStore.activeOrgId) whatsappStore.fetchStatus(orgStore.activeOrgId).catch(() => {})
})
watch(() => orgStore.activeOrgId, (id) => {
  billingStore.fetchStatus().catch(() => {})
  if (id) whatsappStore.fetchStatus(id).catch(() => {})
})

apiClient.onPlanError = (code, message) => {
  if (code === 'SUBSCRIPTION_REQUIRED') {
    toast.show('Necesitas una suscripción activa.', 'error')
    router.push({ name: 'Billing' })
    return
  }
  planGate.trigger(code, message)
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'Login' })
}


const navGroups = [
  {
    label: 'Workspace',
    links: [
      { id: 'dashboard', label: 'Dashboard', to: '/admin/dashboard', icon: 'home' },
      { id: 'wallets',   label: 'Wallets',   to: '/admin/wallets',   icon: 'wallet' },
      { id: 'scan',      label: 'Escanear',  to: '/admin/scan',      icon: 'qr' },
      { id: 'team',      label: 'Equipo',    to: '/admin/team',      icon: 'users' },
    ],
  },
  {
    label: 'CRM',
    links: [
      { id: 'analytics', label: 'Analítica', to: '/admin/analytics', icon: 'chart' },
      { id: 'campaigns', label: 'Campañas',  to: '/admin/campaigns', icon: 'flash' },
    ],
  },
  {
    label: 'Cuenta',
    links: [
      { id: 'billing',  label: 'Facturación', to: '/admin/billing',  icon: 'billing' },
      { id: 'settings', label: 'Ajustes',     to: '/admin/settings', icon: 'settings' },
    ],
  },
]

// Primary bottom-tab items (mobile)
const bottomTabs = [
  { id: 'dashboard', label: 'Inicio',    to: '/admin/dashboard', icon: 'home',   center: false },
  { id: 'wallets',   label: 'Wallets',   to: '/admin/wallets',   icon: 'wallet', center: false },
  { id: 'scan',      label: 'Escanear',  to: '/admin/scan',      icon: 'qr',     center: true  },
  { id: 'analytics', label: 'Analítica', to: '/admin/analytics', icon: 'chart',  center: false },
  { id: 'more',      label: 'Más',       to: null,               icon: 'grid',   center: false },
]

// Secondary items in the "Más" sheet
const moreLinks = [
  { id: 'team',      label: 'Equipo',      to: '/admin/team',      icon: 'users'    },
  { id: 'campaigns', label: 'Campañas',    to: '/admin/campaigns', icon: 'flash'    },
  { id: 'billing',   label: 'Facturación', to: '/admin/billing',   icon: 'billing'  },
  { id: 'settings',  label: 'Ajustes',     to: '/admin/settings',  icon: 'settings' },
]

const moreActive = computed(() =>
  moreOpen.value || moreLinks.some(l => route.path.startsWith(l.to))
)

function navigateMore(to: string) {
  router.push(to)
  moreOpen.value = false
}

const routeTitles: Record<string, string> = {
  Dashboard:    'Dashboard',
  Wallets:      'Tus wallets',
  WalletDetail: 'Detalle de wallet',
  WalletCreate: 'Nueva wallet',
  Scan:         'Escanear pases',
  Team:         'Equipo',
  Analytics:    'Analítica',
  Campaigns:    'Campañas',
  Billing:      'Facturación',
  Settings:     'Ajustes',
}

const pageTitle = computed(() => routeTitles[route.name as string] ?? '')

function isActive(link: { to: string | null }) {
  return !!link.to && route.path.startsWith(link.to)
}

function getInitials(name = ''): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

const iconPaths: Record<string, string> = {
  home:        '<path d="M3 11l9-8 9 8"/><path d="M5 9v12h14V9"/>',
  wallet:      '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5" fill="currentColor" stroke="none"/>',
  qr:          '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v3M14 18v3M17 21h4"/>',
  users:       '<circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="7" r="2.5"/><path d="M16 14c3.5 0 6 2.5 6 6"/>',
  chart:       '<path d="M3 21V5M3 21h18"/><path d="M7 17v-5M11 17V9M15 17v-3M19 17V7"/>',
  flash:       '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  billing:     '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5" fill="currentColor" stroke="none"/>',
  search:      '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  bell:        '<path d="M6 8a6 6 0 1112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 004 0"/>',
  logout:      '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
  settings:    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
  grid:        '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  close:       '<path d="M18 6L6 18M6 6l12 12"/>',
  arrowRight:  '<path d="M5 12h14M12 5l7 7-7 7"/>',
}
</script>

<template>
  <!-- Full-page skeleton while layout initializes -->
  <div v-if="!layoutReady" class="flex h-screen overflow-hidden" style="background: var(--bg-page);">
    <aside class="hidden lg:flex flex-col shrink-0" style="width: 232px; background: var(--bg-surface); border-right: 1px solid var(--border-nav); padding: 20px 12px; gap: 16px; box-shadow: 4px 0 20px var(--shadow-card);">
      <div style="padding: 4px 8px 14px; border-bottom: 1px solid var(--border-nav-2); display: flex; align-items: center; gap: 8px;">
        <div class="sk" style="width: 22px; height: 22px; border-radius: 6px; background: var(--border-nav);" />
        <div class="sk" style="width: 60px; height: 16px; border-radius: 4px; background: var(--border-nav);" />
      </div>
      <div class="sk" style="height: 48px; border-radius: 10px; background: var(--bg-subtle);" />
      <div style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
        <div v-for="i in 7" :key="i" class="sk" style="height: 36px; border-radius: 8px; background: var(--bg-subtle);" />
      </div>
      <div style="border-top: 1px solid var(--border-nav-2); padding-top: 14px; display: flex; gap: 10px; align-items: center;">
        <div class="sk" style="width: 32px; height: 32px; border-radius: 50%; background: var(--border-nav); flex-shrink: 0;" />
        <div style="flex: 1;">
          <div class="sk" style="height: 12px; width: 80px; border-radius: 4px; background: var(--border-nav); margin-bottom: 6px;" />
          <div class="sk" style="height: 10px; width: 120px; border-radius: 4px; background: var(--bg-subtle);" />
        </div>
      </div>
    </aside>
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <header style="padding: 18px 32px; border-bottom: 1px solid var(--border); background: var(--bg-surface); display: flex; align-items: center; gap: 16px;">
        <div style="flex: 1;">
          <div class="sk" style="height: 11px; width: 80px; border-radius: 4px; background: var(--bg-subtle); margin-bottom: 8px;" />
          <div class="sk" style="height: 22px; width: 160px; border-radius: 6px; background: var(--bg-subtle);" />
        </div>
        <div class="sk hidden md:block" style="height: 36px; width: 240px; border-radius: 8px; background: var(--bg-subtle);" />
        <div class="sk hidden md:block" style="height: 36px; width: 36px; border-radius: 8px; background: var(--bg-subtle);" />
      </header>
      <main style="flex: 1; padding: 28px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px;">
          <div v-for="i in 4" :key="i" class="sk" style="height: 90px; border-radius: 14px; background: var(--bg-subtle);" />
        </div>
        <div class="sk" style="height: 280px; border-radius: 14px; background: var(--bg-subtle);" />
      </main>
    </div>
  </div>

  <div v-else class="flex h-screen overflow-hidden layout-page">

    <!-- ── Sidebar desktop ── -->
    <aside class="layout-sidebar hidden lg:flex flex-col shrink-0">
      <div
        class="sidebar-logo"
        style="padding: 2px 6px 14px; display: flex; align-items: center; gap: 8px; cursor: pointer;"
        @click="router.push({ name: 'Dashboard' })"
      >
        <svg width="22" height="22" viewBox="0 0 40 40" fill="none" style="flex-shrink: 0;">
          <line x1="10" y1="28" x2="30" y2="28" stroke="var(--amber)" stroke-width="2"/>
          <line x1="10" y1="28" x2="20" y2="10" stroke="var(--amber)" stroke-width="2"/>
          <line x1="20" y1="10" x2="30" y2="28" stroke="var(--amber)" stroke-width="2"/>
          <circle cx="20" cy="10" r="3.5" fill="var(--amber)"/>
          <circle cx="10" cy="28" r="3.5" fill="var(--amber)"/>
          <circle cx="30" cy="28" r="3.5" fill="var(--amber)"/>
        </svg>
        <span style="font-size: 17px; font-weight: 800; letter-spacing: -0.02em; color: var(--text-ink); font-family: 'Plus Jakarta Sans', system-ui, sans-serif; line-height: 1;">
          trib<span style="color: var(--amber);">o</span>
        </span>
      </div>

      <OrgSwitcher :dark="false" />

      <nav style="flex: 1; display: flex; flex-direction: column; gap: 14px;">
        <div v-for="group in navGroups" :key="group.label" style="display: flex; flex-direction: column; gap: 2px;">
          <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: var(--text-nav-label); padding: 0 12px 4px; text-transform: uppercase;">
            {{ group.label }}
          </div>
          <div
            v-for="link in group.links"
            :key="link.id"
            style="position: relative;"
          >
            <!-- Amber left indicator (outside button, flush to sidebar left) -->
            <span
              v-if="isActive(link)"
              style="position: absolute; left: -12px; top: 7px; bottom: 7px; width: 3px; background: var(--amber); border-radius: 0 2px 2px 0; pointer-events: none;"
            />
            <button
              class="flex items-center gap-3 w-full nav-item"
              :class="{ 'nav-active': isActive(link) }"
              style="padding: 9px 12px; border-radius: 10px; font-size: 13.5px; border: none; cursor: pointer; text-align: left;"
              :style="isActive(link)
                ? { background: 'var(--primary-light)', color: 'var(--primary-text)', fontWeight: '700' }
                : { background: 'transparent', color: 'var(--text-nav)', fontWeight: '500' }"
              @click="router.push(link.to)"
            >
              <svg
                width="17" height="17" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round"
                :style="{ color: isActive(link) ? 'var(--primary-text)' : 'var(--text-nav-icon)' }"
                v-html="iconPaths[link.icon]"
              />
              <span style="flex: 1;">{{ link.label }}</span>
            </button>
          </div>
        </div>
      </nav>

      <div class="sidebar-footer" style="padding-top: 14px;">
        <div class="flex items-center gap-2.5" style="padding: 4px 8px;">
          <!-- Avatar: matches Settings profile card style, always legible -->
          <div
            class="grid place-items-center shrink-0 font-bold"
            style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--primary), var(--primary-mid)); color: var(--on-primary); font-size: 13px; letter-spacing: 0.03em; flex-shrink: 0;"
          >
            {{ (authStore.admin?.email ?? '').slice(0, 2).toUpperCase() }}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 12.5px; font-weight: 600; color: var(--text-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              {{ orgStore.activeOrg?.name ?? 'Admin' }}
            </div>
            <div class="truncate" style="font-size: 11px; color: var(--text-muted);">
              {{ authStore.admin?.email }}
            </div>
          </div>
          <button
            class="shrink-0 sidebar-logout"
            style="background: transparent; border: none; cursor: pointer; padding: 5px; border-radius: 6px;"
            title="Cerrar sesión"
            @click="handleLogout"
          >
            <svg
              width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="var(--text-muted)" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round"
              v-html="iconPaths.logout"
            />
          </button>
        </div>
      </div>
    </aside>

    <!-- ── Main area ── -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

      <!-- Top bar -->
      <header class="layout-header admin-header flex items-center gap-4 shrink-0">
        <!-- Mobile: logo mark -->
        <div
          class="lg:hidden shrink-0 cursor-pointer"
          style="display: flex; align-items: center; gap: 6px;"
          @click="router.push({ name: 'Dashboard' })"
        >
          <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
            <line x1="10" y1="28" x2="30" y2="28" stroke="var(--amber)" stroke-width="2.5"/>
            <line x1="10" y1="28" x2="20" y2="10" stroke="var(--amber)" stroke-width="2.5"/>
            <line x1="20" y1="10" x2="30" y2="28" stroke="var(--amber)" stroke-width="2.5"/>
            <circle cx="20" cy="10" r="3.5" fill="var(--amber)"/>
            <circle cx="10" cy="28" r="3.5" fill="var(--amber)"/>
            <circle cx="30" cy="28" r="3.5" fill="var(--amber)"/>
          </svg>
        </div>

        <!-- Page title -->
        <div style="flex: 1; min-width: 0;">
          <div v-if="orgStore.activeOrg?.name" style="font-size: 11px; color: var(--text-muted); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;">
            {{ orgStore.activeOrg.name }}
          </div>
          <h1 class="mobile-title" style="font-weight: 700; color: var(--text-ink); letter-spacing: -0.01em; line-height: 1.2; margin-top: 2px;">
            {{ pageTitle }}
          </h1>
        </div>

        <!-- Search trigger (desktop only) -->
        <button
          class="header-search hidden md:flex items-center gap-2"
          @click="openPalette"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="iconPaths.search" />
          <span style="font-size: 13px; color: var(--text-faint); flex: 1; text-align: left;">Buscar…</span>
          <span class="search-kbd">⌘K</span>
        </button>

        <NotificationBell />

        <!-- Theme toggle -->
        <button class="theme-toggle" :aria-label="isDark ? 'Modo claro' : 'Modo oscuro'" @click="toggleTheme">
          <svg v-if="isDark" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
          <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
        </button>

        <slot name="actions" />
      </header>

      <!-- Trial active banner -->
      <div
        v-if="!bannerDismissed && trialActive"
        style="flex-shrink: 0; display: flex; align-items: center; gap: 12px; padding: 11px 24px; font-size: 13px; font-weight: 500; background: var(--info-bg); border-bottom: 1px solid var(--info-bg); color: var(--info);"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink: 0;">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/>
        </svg>
        <span style="flex: 1;">
          Estás en tu período de prueba gratuita. Te quedan <strong>{{ trialDaysLeft }} día{{ trialDaysLeft === 1 ? '' : 's' }}</strong>.
        </span>
        <button
          style="padding: 5px 14px; border-radius: 7px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; font-family: inherit; flex-shrink: 0; background: var(--info); color: var(--bg-surface);"
          @click="router.push({ name: 'Billing' })"
        >
          Activar plan
        </button>
        <button
          style="background: none; border: none; cursor: pointer; padding: 2px; opacity: 0.6; flex-shrink: 0; color: var(--info);"
          @click="bannerDismissed = true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Grace period / cancelled banner -->
      <div
        v-if="!bannerDismissed && billingStore.status && !billingStore.status.isActive && !isTrial && !trialExpired"
        style="flex-shrink: 0; display: flex; align-items: center; gap: 12px; padding: 11px 24px; font-size: 13px; font-weight: 500;"
        :style="billingStore.status.gracePeriod
          ? 'background: var(--warning-bg); border-bottom: 1px solid var(--warning-bg); color: var(--warning);'
          : 'background: var(--danger-bg); border-bottom: 1px solid var(--danger-bg); color: var(--danger);'"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink: 0;">
          <path d="M12 2l10 18H2L12 2z"/><path d="M12 9v4"/><circle cx="12" cy="17.5" r="0.5" fill="currentColor"/>
        </svg>
        <span style="flex: 1;">
          <template v-if="billingStore.status.gracePeriod">
            Tu suscripción fue cancelada. Tienes <strong>{{ billingStore.status.gracePeriod.daysRemaining }} día{{ billingStore.status.gracePeriod.daysRemaining === 1 ? '' : 's' }}</strong> para renovar antes de pasar al plan gratuito.
          </template>
          <template v-else>
            Tu suscripción ha expirado. Activa un plan para seguir usando todas las funciones.
          </template>
        </span>
        <button
          style="padding: 5px 14px; border-radius: 7px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; font-family: inherit; flex-shrink: 0;"
          :style="billingStore.status.gracePeriod ? 'background: var(--warning); color: var(--bg-surface);' : 'background: var(--danger); color: var(--bg-surface);'"
          @click="router.push({ name: 'Billing' })"
        >
          Renovar plan
        </button>
        <button
          style="background: none; border: none; cursor: pointer; padding: 2px; opacity: 0.6; flex-shrink: 0;"
          :style="billingStore.status.gracePeriod ? 'color: var(--warning);' : 'color: var(--danger);'"
          @click="bannerDismissed = true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto main-content">
        <RouterView />
      </main>

      <!-- ── Bottom Nav (mobile only) ── -->
      <nav class="bottom-nav lg:hidden" aria-label="Navegación principal">
        <div class="bottom-nav-track">
          <template v-for="tab in bottomTabs" :key="tab.id">

            <!-- Scan: elevated center button -->
            <button
              v-if="tab.center"
              class="tab-scan"
              :aria-label="tab.label"
              @click="router.push(tab.to!)"
            >
              <div class="scan-bubble" :class="{ 'scan-active': isActive({ to: tab.to }) }">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                  v-html="iconPaths[tab.icon]"
                />
              </div>
              <span class="tab-label" :class="{ 'tab-label-active': isActive({ to: tab.to }) }">
                {{ tab.label }}
              </span>
            </button>

            <!-- Regular tab -->
            <button
              v-else
              class="tab-item"
              :class="{ 'tab-active': tab.id === 'more' ? moreActive : isActive({ to: tab.to }) }"
              :aria-label="tab.label"
              @click="tab.id === 'more' ? (moreOpen = true) : router.push(tab.to!)"
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round"
                v-html="iconPaths[tab.icon]"
              />
              <span class="tab-label">{{ tab.label }}</span>
            </button>

          </template>
        </div>
      </nav>

    </div>

    <!-- ── Toast global ── -->
    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="toast.visible.value"
          style="position: fixed; top: 24px; right: 24px; z-index: 9999; padding: 14px 20px; border-radius: 12px; display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,0.12); min-width: 280px; font-family: inherit;"
          :style="toast.type.value === 'success'
            ? { background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-bg)' }
            : { background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-bg)' }"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
            <path v-if="toast.type.value === 'success'" d="M5 12l5 5L20 7" />
            <path v-else d="M18 6L6 18M6 6l12 12" />
          </svg>
          {{ toast.message.value }}
        </div>
      </Transition>
    </Teleport>

    <!-- ── Trial expired blocking modal ── -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="trialExpired"
          style="position: fixed; inset: 0; background: var(--overlay); display: grid; place-items: center; z-index: 9500; backdrop-filter: blur(4px); padding: 20px;"
        >
          <div style="background: var(--bg-surface); border-radius: 20px; padding: 40px; max-width: 460px; width: 100%; box-shadow: 0 24px 64px var(--overlay); text-align: center;">
            <div style="width: 64px; height: 64px; border-radius: 16px; background: var(--warning-bg); display: grid; place-items: center; margin: 0 auto 20px;">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: var(--text-ink); margin-bottom: 10px;">Tu período de prueba ha terminado</div>
            <div style="font-size: 13px; color: var(--text-muted); line-height: 1.7; margin-bottom: 28px;">
              Activa un plan para seguir usando Tribo y acceder a todas las funciones.
            </div>
            <button
              style="width: 100%; padding: 14px 16px; border-radius: 10px; background: var(--amber); border: none; font-size: 14px; font-weight: 700; color: var(--primary); cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 6px;"
              @click="router.push({ name: 'Billing' })"
            >
              Ver planes
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="iconPaths.arrowRight" />
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Plan gate modal ── -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="planGate.event.value"
          style="position: fixed; inset: 0; background: var(--overlay); display: grid; place-items: center; z-index: 9000; backdrop-filter: blur(3px); padding: 20px;"
          @click.self="planGate.dismiss()"
        >
          <div style="background: var(--bg-surface); border-radius: 20px; padding: 40px; max-width: 460px; width: 100%; box-shadow: 0 24px 64px var(--overlay);">

            <template v-if="planGate.event.value.code === 'PLAN_UPGRADE_REQUIRED'">
              <div style="width: 64px; height: 64px; border-radius: 16px; background: var(--danger-bg); display: grid; place-items: center; margin-bottom: 20px;">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="5" y="10" width="14" height="10" rx="2"/><path d="M9 10V7a3 3 0 016 0v3"/>
                </svg>
              </div>
              <div style="font-size: 18px; font-weight: 800; color: var(--text-ink); margin-bottom: 8px;">Función no incluida en tu plan</div>
              <div style="font-size: 13px; color: var(--text-muted); line-height: 1.7; margin-bottom: 24px;">
                {{ planGate.event.value.message || 'Tu plan actual no incluye esta función. Actualiza para desbloquearla.' }}
              </div>
              <div style="display: flex; gap: 10px;">
                <button
                  style="flex: 1; padding: 12px 16px; border-radius: 10px; background: var(--bg-page); border: none; font-size: 13px; font-weight: 600; color: var(--text-medium); cursor: pointer; font-family: inherit;"
                  @click="planGate.dismiss()"
                >
                  Cancelar
                </button>
                <button
                  style="flex: 1; padding: 12px 16px; border-radius: 10px; background: var(--amber); border: none; font-size: 13px; font-weight: 700; color: var(--primary); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: inherit;"
                  @click="() => { planGate.dismiss(); router.push({ name: 'Billing' }) }"
                >
                  Ver planes
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="iconPaths.arrowRight" />
                </button>
              </div>
            </template>

            <template v-else-if="planGate.event.value.code === 'WALLET_LIMIT_REACHED'">
              <div style="width: 64px; height: 64px; border-radius: 16px; background: var(--warning-bg); display: grid; place-items: center; margin-bottom: 20px;">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2l10 18H2L12 2z"/><path d="M12 9v4"/><circle cx="12" cy="17" r="0.5" fill="var(--warning)"/>
                </svg>
              </div>
              <div style="font-size: 18px; font-weight: 800; color: var(--text-ink); margin-bottom: 8px;">Límite de wallets alcanzado</div>
              <div style="font-size: 13px; color: var(--text-muted); line-height: 1.7; margin-bottom: 24px;">
                {{ planGate.event.value.message }}. Actualiza tu plan para crear más wallets.
              </div>
              <button
                style="width: 100%; padding: 12px 16px; border-radius: 10px; background: var(--primary); border: none; font-size: 13px; font-weight: 700; color: var(--on-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: inherit;"
                @click="() => { planGate.dismiss(); router.push({ name: 'Billing' }) }"
              >
                Ver planes
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="iconPaths.arrowRight" />
              </button>
            </template>

            <template v-else-if="planGate.event.value.code === 'PASS_LIMIT_REACHED'">
              <div style="width: 64px; height: 64px; border-radius: 16px; background: var(--warning-bg); display: grid; place-items: center; margin-bottom: 20px;">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2l10 18H2L12 2z"/><path d="M12 9v4"/><circle cx="12" cy="17" r="0.5" fill="var(--warning)"/>
                </svg>
              </div>
              <div style="font-size: 18px; font-weight: 800; color: var(--text-ink); margin-bottom: 8px;">Límite de pases alcanzado</div>
              <div style="font-size: 13px; color: var(--text-muted); line-height: 1.7; margin-bottom: 24px;">
                {{ planGate.event.value.message }}. Actualiza tu plan para emitir pases ilimitados.
              </div>
              <button
                style="width: 100%; padding: 12px 16px; border-radius: 10px; background: var(--primary); border: none; font-size: 13px; font-weight: 700; color: var(--on-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: inherit;"
                @click="() => { planGate.dismiss(); router.push({ name: 'Billing' }) }"
              >
                Ver planes
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="iconPaths.arrowRight" />
              </button>
            </template>

          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── "Más" bottom sheet (mobile only) ── -->
    <Teleport to="body">
      <Transition name="sheet-backdrop">
        <div
          v-if="moreOpen"
          class="lg:hidden"
          style="position: fixed; inset: 0; z-index: 200; background: var(--overlay); backdrop-filter: blur(2px);"
          @click="moreOpen = false"
        />
      </Transition>
      <Transition name="sheet-panel">
        <div v-if="moreOpen" class="more-sheet lg:hidden">
          <!-- Drag handle -->
          <div style="display: flex; justify-content: center; padding: 10px 0 6px; flex-shrink: 0;">
            <div style="width: 36px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.18);" />
          </div>

          <!-- Org switcher -->
          <div style="padding: 8px 16px 14px; border-bottom: 1px solid var(--on-primary-border); flex-shrink: 0;">
            <OrgSwitcher :dark="true" />
          </div>

          <!-- Secondary nav links -->
          <nav style="padding: 10px 12px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 3px;">
            <template v-for="link in moreLinks" :key="link.id">
              <button
                class="flex items-center gap-3 w-full more-link"
                :class="{ 'more-link-active': isActive(link) }"
                @click="navigateMore(link.to)"
              >
                <svg
                  width="18" height="18" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round" stroke-linejoin="round"
                  v-html="iconPaths[link.icon]"
                />
                <span style="flex: 1; text-align: left;">{{ link.label }}</span>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  style="opacity: 0.4;"
                  v-html="iconPaths.arrowRight"
                />
              </button>
            </template>
          </nav>

          <!-- User row + Logout -->
          <div style="padding: 12px 16px; border-top: 1px solid var(--on-primary-border); flex-shrink: 0;">
            <div class="flex items-center gap-3" style="padding: 6px 12px 12px;">
              <div
                class="grid place-items-center shrink-0 font-bold"
                style="width: 36px; height: 36px; border-radius: 999px; background: var(--amber); color: var(--primary); font-size: 13px;"
              >
                {{ getInitials(authStore.admin?.email ?? '') }}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 13px; font-weight: 600; color: var(--on-primary); line-height: 1.3;">
                  {{ orgStore.activeOrg?.name ?? 'Admin' }}
                </div>
                <div class="truncate" style="font-size: 11.5px; color: var(--on-primary-muted);">
                  {{ authStore.admin?.email }}
                </div>
              </div>
            </div>
            <button
              class="w-full flex items-center gap-3"
              style="padding: 12px 14px; border-radius: 10px; border: none; background: var(--on-primary-surface); color: var(--on-primary-muted); cursor: pointer; font-size: 14px; font-weight: 500; font-family: inherit; transition: background 0.15s;"
              @click="handleLogout"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round"
                v-html="iconPaths.logout"
              />
              Cerrar sesión
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Command Palette ── -->
    <CommandPalette />
    <WalletCreateModal v-model="showCreateWallet" />

  </div>
</template>

<style scoped>
/* ── Layout shell ── */
.layout-page {
  background: var(--bg-page);
}
.layout-sidebar {
  width: 232px;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-nav);
  padding: 20px 12px;
  gap: 16px;
  box-shadow: 4px 0 20px rgba(15,27,20,0.04);
  transition: background 0.2s, border-color 0.2s;
}
html.dark .layout-sidebar { box-shadow: none; border-right-color: var(--border-nav); }
.sidebar-logo {
  border-bottom: 1px solid var(--border-nav-2);
}
.sidebar-footer {
  border-top: 1px solid var(--border-nav-2);
}
.layout-header {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  transition: background 0.2s, border-color 0.2s;
}

/* ── Search ── */
.header-search {
  padding: 8px 12px;
  background: var(--bg-field);
  border-radius: 8px;
  width: 240px;
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;
}
.header-search:hover { border-color: var(--border); }
.search-kbd {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  padding: 2px 6px;
  background: var(--bg-surface);
  border-radius: 4px;
  border: 1px solid var(--border);
}

/* ── Theme toggle ── */
.theme-toggle {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--bg-field);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-muted);
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.theme-toggle:hover {
  background: var(--bg-green);
  color: var(--amber);
  border-color: var(--primary-text);
}

/* ── Sidebar nav items ── */
.nav-item { transition: background 0.12s, color 0.12s; }
.nav-item:not(.nav-active):hover {
  background: var(--bg-subtle) !important;
  color: var(--text-ink) !important;
}
.nav-item:not(.nav-active):hover svg { color: var(--primary-text) !important; }
.nav-active:hover { background: rgba(245,166,35,0.2) !important; }
.sidebar-logout:hover svg { stroke: var(--text-nav) !important; }

/* ── Header ── */
.admin-header {
  padding: 12px 16px;
}
@media (min-width: 1024px) {
  .admin-header { padding: 18px 32px; }
}

.mobile-title {
  font-size: 18px;
}
@media (min-width: 1024px) {
  .mobile-title { font-size: 22px; }
}

/* ── Main content: extra bottom padding on mobile for the tab bar ── */
.main-content {
  padding: 16px 16px calc(16px + 68px + env(safe-area-inset-bottom, 0px));
}
@media (min-width: 1024px) {
  .main-content { padding: 28px; }
}

/* ── Bottom navigation bar ── */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 30;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  box-shadow: 0 -4px 16px rgba(15, 27, 20, 0.06);
  transition: background 0.2s, border-color 0.2s;
}
html.dark .bottom-nav { box-shadow: 0 -4px 16px rgba(0,0,0,0.3); }

.bottom-nav-track {
  display: flex;
  align-items: center;
  height: 60px;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Regular tab button */
.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-faint);
  font-family: inherit;
  transition: color 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.tab-item.tab-active {
  color: var(--amber);
}

/* Scan: center elevated button */
.tab-scan {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}

.scan-bubble {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: var(--primary);
  display: grid;
  place-items: center;
  margin-top: -14px;
  box-shadow: 0 4px 14px rgba(27, 67, 50, 0.38), 0 1px 3px rgba(0,0,0,0.1);
  transition: transform 0.12s ease, background 0.15s, box-shadow 0.15s;
}
.scan-bubble:active {
  transform: scale(0.92);
}
.scan-active {
  background: var(--amber) !important;
  box-shadow: 0 4px 14px rgba(232, 146, 10, 0.42), 0 1px 3px rgba(0,0,0,0.1) !important;
}

/* Tab labels */
.tab-label {
  font-size: 10px;
  font-weight: 500;
  color: inherit;
  line-height: 1;
}
.tab-label-active {
  color: var(--amber);
}

/* ── More sheet ── */
.more-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 201;
  background: var(--primary);
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  max-height: 82vh;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  box-shadow: 0 -8px 40px rgba(0,0,0,0.3);
}

.more-link {
  padding: 13px 14px;
  border-radius: 10px;
  font-size: 14.5px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  background: transparent;
  color: var(--on-primary);
  transition: background 0.15s, color 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.more-link:active {
  background: var(--on-primary-surface);
}
.more-link-active {
  background: var(--amber) !important;
  color: var(--primary) !important;
  font-weight: 600;
}

/* ── Sheet transitions ── */
.sheet-backdrop-enter-active,
.sheet-backdrop-leave-active { transition: opacity 0.22s ease; }
.sheet-backdrop-enter-from,
.sheet-backdrop-leave-to { opacity: 0; }

.sheet-panel-enter-active { transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1); }
.sheet-panel-leave-active { transition: transform 0.24s cubic-bezier(0.4, 0, 1, 1); }
.sheet-panel-enter-from,
.sheet-panel-leave-to { transform: translateY(100%); }

/* ── Toast ── */
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-8px); }

/* ── Modal ── */
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active > div, .modal-leave-active > div { transition: transform 0.2s ease; }
.modal-enter-from > div, .modal-leave-to > div { transform: scale(0.96); }

/* ── Skeleton pulse ── */
@keyframes sk-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
.sk { animation: sk-pulse 1.4s ease-in-out infinite; }
</style>
