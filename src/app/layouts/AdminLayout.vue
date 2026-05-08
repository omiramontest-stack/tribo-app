<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import OrgSwitcher from '@/app/components/Admin/OrgSwitcher.vue'
import { apiClient } from '@/infrastructure/http/ApiClient'
import { usePlanGate } from '@/app/composables/usePlanGate'
import { useToast } from '@/app/composables/useToast'
import { useBillingStore } from '@/app/stores/billing/BillingStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const orgStore = useOrganizationStore()
const billingStore = useBillingStore()
const mobileOpen = ref(false)
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
})
watch(() => orgStore.activeOrgId, () => billingStore.fetchStatus().catch(() => {}))

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

const navLinks = [
  { id: 'dashboard', label: 'Dashboard',  to: '/admin/dashboard', icon: 'home' },
  { id: 'wallets',   label: 'Wallets',    to: '/admin/wallets',   icon: 'wallet' },
  { id: 'scan',      label: 'Escanear',   to: '/admin/scan',      icon: 'qr' },
  { id: 'team',      label: 'Equipo',     to: '/admin/team',      icon: 'users' },
  { id: 'analytics', label: 'Analítica',  to: '/admin/analytics',  icon: 'chart' },
  { id: 'campaigns', label: 'Campañas',   to: '/admin/campaigns',  icon: 'flash' },
  { id: 'billing',   label: 'Facturación', to: '/admin/billing',   icon: 'billing' },
]

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
}

const pageTitle = computed(() => routeTitles[route.name as string] ?? '')

function isActive(link: { to: string | null }) {
  return !!link.to && route.path.startsWith(link.to)
}

function getInitials(name = ''): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

// SVG icon paths (stroke-based, lucide-style)
const iconPaths: Record<string, string> = {
  home:   '<path d="M3 11l9-8 9 8"/><path d="M5 9v12h14V9"/>',
  wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5" fill="currentColor" stroke="none"/>',
  qr:     '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v3M14 18v3M17 21h4"/>',
  users:  '<circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="7" r="2.5"/><path d="M16 14c3.5 0 6 2.5 6 6"/>',
  chart:  '<path d="M3 21V5M3 21h18"/><path d="M7 17v-5M11 17V9M15 17v-3M19 17V7"/>',
  flash:   '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  billing: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5" fill="currentColor" stroke="none"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  bell:   '<path d="M6 8a6 6 0 1112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 004 0"/>',
  logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
}
</script>

<template>
  <!-- Full-page skeleton while layout initializes -->
  <div v-if="!layoutReady" class="flex h-screen overflow-hidden" style="background: #F7F4EF;">
    <!-- Sidebar skeleton -->
    <aside class="hidden lg:flex flex-col shrink-0" style="width: 232px; background: #1B4332; padding: 20px 14px; gap: 18px;">
      <!-- Logo -->
      <div style="padding: 4px 8px 14px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 8px;">
        <div class="sk" style="width: 22px; height: 22px; border-radius: 6px; background: rgba(255,255,255,0.15);" />
        <div class="sk" style="width: 60px; height: 16px; border-radius: 4px; background: rgba(255,255,255,0.15);" />
      </div>
      <!-- Org switcher -->
      <div class="sk" style="height: 48px; border-radius: 10px; background: rgba(255,255,255,0.1);" />
      <!-- Nav items -->
      <div style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
        <div v-for="i in 7" :key="i" class="sk" style="height: 36px; border-radius: 8px; background: rgba(255,255,255,0.07);" />
      </div>
      <!-- User -->
      <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px; display: flex; gap: 10px; align-items: center;">
        <div class="sk" style="width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.15); flex-shrink: 0;" />
        <div style="flex: 1;">
          <div class="sk" style="height: 12px; width: 80px; border-radius: 4px; background: rgba(255,255,255,0.15); margin-bottom: 6px;" />
          <div class="sk" style="height: 10px; width: 120px; border-radius: 4px; background: rgba(255,255,255,0.1);" />
        </div>
      </div>
    </aside>

    <!-- Main skeleton -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Header -->
      <header style="padding: 18px 32px; border-bottom: 1px solid #ECEFEB; background: #fff; display: flex; align-items: center; gap: 16px;">
        <div style="flex: 1;">
          <div class="sk" style="height: 11px; width: 80px; border-radius: 4px; background: #EFEAE0; margin-bottom: 8px;" />
          <div class="sk" style="height: 22px; width: 160px; border-radius: 6px; background: #EFEAE0;" />
        </div>
        <div class="sk hidden md:block" style="height: 36px; width: 240px; border-radius: 8px; background: #EFEAE0;" />
        <div class="sk hidden md:block" style="height: 36px; width: 36px; border-radius: 8px; background: #EFEAE0;" />
      </header>
      <!-- Content -->
      <main style="flex: 1; padding: 28px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px;">
          <div v-for="i in 4" :key="i" class="sk" style="height: 90px; border-radius: 14px; background: #EFEAE0;" />
        </div>
        <div class="sk" style="height: 280px; border-radius: 14px; background: #EFEAE0;" />
      </main>
    </div>
  </div>

  <div v-else class="flex h-screen overflow-hidden" style="background: #F7F4EF;">

    <!-- ── Sidebar desktop ── -->
    <aside
      class="hidden lg:flex flex-col shrink-0"
      style="width: 232px; background: #1B4332; padding: 20px 14px; gap: 18px;"
    >
      <!-- Logo -->
      <div
        style="padding: 4px 8px 14px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 8px; cursor: pointer;"
        @click="router.push({ name: 'Dashboard' })"
      >
        <svg width="22" height="22" viewBox="0 0 40 40" fill="none" style="flex-shrink: 0;">
          <line x1="10" y1="28" x2="30" y2="28" stroke="#E8920A" stroke-width="2"/>
          <line x1="10" y1="28" x2="20" y2="10" stroke="#E8920A" stroke-width="2"/>
          <line x1="20" y1="10" x2="30" y2="28" stroke="#E8920A" stroke-width="2"/>
          <circle cx="20" cy="10" r="3.5" fill="#E8920A"/>
          <circle cx="10" cy="28" r="3.5" fill="#E8920A"/>
          <circle cx="30" cy="28" r="3.5" fill="#E8920A"/>
        </svg>
        <span style="font-size: 17px; font-weight: 800; letter-spacing: -0.02em; color: #fff; font-family: 'Syne', sans-serif; line-height: 1;">
          trib<span style="color: #E8920A;">o</span>
        </span>
      </div>

      <!-- Org switcher -->
      <OrgSwitcher :dark="true" />

      <!-- Nav -->
      <nav style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
        <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: #7FA68B; padding: 6px 12px 4px;">
          NAVEGACIÓN
        </div>
        <template v-for="link in navLinks" :key="link.id">
          <!-- Active nav item -->
          <button
            v-if="link.to"
            class="flex items-center gap-3 w-full"
            style="padding: 9px 12px; border-radius: 8px; font-size: 13.5px; font-weight: 500; border: none; cursor: pointer; text-align: left; transition: background 0.15s;"
            :style="isActive(link)
              ? { background: '#E8920A', color: '#13301F', fontWeight: '600' }
              : { background: 'transparent', color: '#D4E0D8' }"
            @click="router.push(link.to)"
          >
            <svg
              width="17" height="17" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round"
              :style="{ color: isActive(link) ? '#13301F' : '#9DB7A8' }"
              v-html="iconPaths[link.icon]"
            />
            <span style="flex: 1;">{{ link.label }}</span>
          </button>

        </template>
      </nav>

      <!-- User profile + logout -->
      <div style="border-top: 1px solid #13301F; padding-top: 14px;">
        <div class="flex items-center gap-2.5" style="padding: 4px 8px;">
          <div
            class="grid place-items-center shrink-0 font-bold"
            style="width: 32px; height: 32px; border-radius: 999px; background: #F5B942; color: #13301F; font-size: 12px;"
          >
            {{ getInitials(authStore.admin?.email ?? '') }}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 12.5px; font-weight: 600; color: #fff;">
              {{ orgStore.activeOrg?.name ?? 'Admin' }}
            </div>
            <div class="truncate" style="font-size: 11px; color: #9DB7A8;">
              {{ authStore.admin?.email }}
            </div>
          </div>
          <button
            class="shrink-0"
            style="background: transparent; border: none; cursor: pointer; padding: 4px;"
            title="Cerrar sesión"
            @click="handleLogout"
          >
            <svg
              width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="#9DB7A8" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round"
              v-html="iconPaths.logout"
            />
          </button>
        </div>
      </div>
    </aside>

    <!-- ── Main area ── -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

      <!-- Top bar (mobile hamburger + desktop page header) -->
      <header
        class="flex items-center gap-4 shrink-0"
        style="padding: 18px 32px; border-bottom: 1px solid #ECEFEB; background: #fff;"
      >
        <!-- Mobile hamburger -->
        <button
          class="lg:hidden p-2 rounded-lg"
          style="border: 1px solid #ECEFEB; color: #6B7A72;"
          @click="mobileOpen = !mobileOpen"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="!mobileOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Page title -->
        <div style="flex: 1; min-width: 0;">
          <div v-if="orgStore.activeOrg?.name" style="font-size: 11px; color: #6B7A72; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;">
            {{ orgStore.activeOrg.name }}
          </div>
          <h1 style="font-size: 22px; font-weight: 700; color: #0F1B14; letter-spacing: -0.01em; line-height: 1.2; margin-top: 2px;">
            {{ pageTitle }}
          </h1>
        </div>

        <!-- Search (decorative — functional search pending) -->
        <div
          class="hidden md:flex items-center gap-2"
          style="padding: 8px 12px; background: #F7F4EF; border-radius: 8px; width: 240px;"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7A72" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="iconPaths.search" />
          <span style="font-size: 13px; color: #A8B3AC; flex: 1;">Buscar…</span>
          <span style="font-size: 10px; font-weight: 600; color: #6B7A72; padding: 2px 6px; background: #fff; border-radius: 4px; border: 1px solid #D8DDD7;">⌘K</span>
        </div>

        <!-- Bell -->
        <div class="relative hidden md:block">
          <button
            class="grid place-items-center"
            style="width: 36px; height: 36px; border-radius: 8px; border: 1px solid #D8DDD7; background: #fff; cursor: pointer;"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3A4A41" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="iconPaths.bell" />
          </button>
          <span
            class="absolute"
            style="top: 6px; right: 6px; width: 7px; height: 7px; border-radius: 999px; background: #E8920A; border: 1.5px solid #fff;"
          />
        </div>

        <!-- RouterView action slot -->
        <slot name="actions" />
      </header>

      <!-- Mobile drawer -->
      <div
        v-if="mobileOpen"
        class="lg:hidden absolute inset-0 z-40 flex"
        @click.self="mobileOpen = false"
      >
        <aside class="flex flex-col shrink-0" style="width: 232px; background: #1B4332; padding: 20px 14px; box-shadow: 4px 0 24px rgba(0,0,0,0.2);">
          <div
            style="padding: 4px 8px 14px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; cursor: pointer;"
            @click="() => { router.push({ name: 'Dashboard' }); mobileOpen = false }"
          >
            <svg width="20" height="20" viewBox="0 0 40 40" fill="none" style="flex-shrink: 0;">
              <line x1="10" y1="28" x2="30" y2="28" stroke="#E8920A" stroke-width="2"/>
              <line x1="10" y1="28" x2="20" y2="10" stroke="#E8920A" stroke-width="2"/>
              <line x1="20" y1="10" x2="30" y2="28" stroke="#E8920A" stroke-width="2"/>
              <circle cx="20" cy="10" r="3.5" fill="#E8920A"/>
              <circle cx="10" cy="28" r="3.5" fill="#E8920A"/>
              <circle cx="30" cy="28" r="3.5" fill="#E8920A"/>
            </svg>
            <span style="font-size: 16px; font-weight: 800; letter-spacing: -0.02em; color: #fff; font-family: 'Syne', sans-serif; line-height: 1;">
              trib<span style="color: #E8920A;">o</span>
            </span>
          </div>
          <nav style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
            <template v-for="link in navLinks" :key="link.id">
              <button
                v-if="link.to"
                class="flex items-center gap-3 w-full"
                style="padding: 9px 12px; border-radius: 8px; font-size: 13.5px; font-weight: 500; border: none; cursor: pointer; text-align: left; transition: background 0.15s;"
                :style="isActive(link)
                  ? { background: '#E8920A', color: '#13301F', fontWeight: '600' }
                  : { background: 'transparent', color: '#D4E0D8' }"
                @click="() => { router.push(link.to!); mobileOpen = false }"
              >
                <svg
                  width="17" height="17" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round" stroke-linejoin="round"
                  :style="{ color: isActive(link) ? '#13301F' : '#9DB7A8' }"
                  v-html="iconPaths[link.icon]"
                />
                <span>{{ link.label }}</span>
              </button>
            </template>
          </nav>
          <div style="border-top: 1px solid #13301F; padding-top: 12px;">
            <button
              class="w-full flex items-center gap-2 text-sm"
              style="padding: 8px 12px; border-radius: 8px; border: none; background: transparent; color: #9DB7A8; cursor: pointer;"
              @click="handleLogout"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>
      </div>

      <!-- Trial active banner (soft info) -->
      <div
        v-if="!bannerDismissed && trialActive"
        style="flex-shrink: 0; display: flex; align-items: center; gap: 12px; padding: 11px 24px; font-size: 13px; font-weight: 500; background: #EFF6FF; border-bottom: 1px solid #BFDBFE; color: #1E40AF;"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink: 0;">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/>
        </svg>
        <span style="flex: 1;">
          Estás en tu período de prueba gratuita. Te quedan <strong>{{ trialDaysLeft }} día{{ trialDaysLeft === 1 ? '' : 's' }}</strong>.
        </span>
        <button
          style="padding: 5px 14px; border-radius: 7px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; font-family: inherit; flex-shrink: 0; background: #1D4ED8; color: #fff;"
          @click="router.push({ name: 'Billing' })"
        >
          Activar plan
        </button>
        <button
          style="background: none; border: none; cursor: pointer; padding: 2px; opacity: 0.6; flex-shrink: 0; color: #1E40AF;"
          @click="bannerDismissed = true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Grace period / cancelled banner (non-trial subscriptions only) -->
      <div
        v-if="!bannerDismissed && billingStore.status && !billingStore.status.isActive && !isTrial && !trialExpired"
        style="flex-shrink: 0; display: flex; align-items: center; gap: 12px; padding: 11px 24px; font-size: 13px; font-weight: 500;"
        :style="billingStore.status.gracePeriod
          ? 'background: #FEF3C7; border-bottom: 1px solid #FDE68A; color: #854D0E;'
          : 'background: #FEE2E2; border-bottom: 1px solid #FECACA; color: #991B1B;'"
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
          :style="billingStore.status.gracePeriod
            ? 'background: #D97706; color: #fff;'
            : 'background: #DC2626; color: #fff;'"
          @click="router.push({ name: 'Billing' })"
        >
          Renovar plan
        </button>
        <button
          style="background: none; border: none; cursor: pointer; padding: 2px; opacity: 0.6; flex-shrink: 0;"
          :style="billingStore.status.gracePeriod ? 'color: #854D0E;' : 'color: #991B1B;'"
          @click="bannerDismissed = true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto" style="padding: 28px;">
        <RouterView />
      </main>
    </div>

    <!-- ── Toast global ── -->
    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="toast.visible.value"
          style="position: fixed; top: 24px; right: 24px; z-index: 9999; padding: 14px 20px; border-radius: 12px; display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,0.12); min-width: 280px; font-family: inherit;"
          :style="toast.type.value === 'success'
            ? { background: '#D1FAE5', color: '#16A34A', border: '1px solid #A7F3D0' }
            : { background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }"
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
          style="position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: grid; place-items: center; z-index: 9500; backdrop-filter: blur(4px); padding: 20px;"
        >
          <div style="background: #fff; border-radius: 20px; padding: 40px; max-width: 460px; width: 100%; box-shadow: 0 24px 64px rgba(0,0,0,0.22); text-align: center;">
            <div style="width: 64px; height: 64px; border-radius: 16px; background: #FEF3C7; display: grid; place-items: center; margin: 0 auto 20px;">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #0F1B14; margin-bottom: 10px;">Tu período de prueba ha terminado</div>
            <div style="font-size: 13px; color: #6B7A72; line-height: 1.7; margin-bottom: 28px;">
              Activa un plan para seguir usando Tribo y acceder a todas las funciones.
            </div>
            <button
              style="width: 100%; padding: 14px 16px; border-radius: 10px; background: #E8920A; border: none; font-size: 14px; font-weight: 700; color: #13301F; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 6px;"
              @click="router.push({ name: 'Billing' })"
            >
              Ver planes
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
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
          style="position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: grid; place-items: center; z-index: 9000; backdrop-filter: blur(3px); padding: 20px;"
          @click.self="planGate.dismiss()"
        >
          <div style="background: #fff; border-radius: 20px; padding: 40px; max-width: 460px; width: 100%; box-shadow: 0 24px 64px rgba(0,0,0,0.18);">

            <!-- PLAN_UPGRADE_REQUIRED -->
            <template v-if="planGate.event.value.code === 'PLAN_UPGRADE_REQUIRED'">
              <div style="width: 64px; height: 64px; border-radius: 16px; background: #FEE2E2; display: grid; place-items: center; margin-bottom: 20px;">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="5" y="10" width="14" height="10" rx="2"/><path d="M9 10V7a3 3 0 016 0v3"/>
                </svg>
              </div>
              <div style="font-size: 18px; font-weight: 800; color: #0F1B14; margin-bottom: 8px;">Función no incluida en tu plan</div>
              <div style="font-size: 13px; color: #6B7A72; line-height: 1.7; margin-bottom: 24px;">
                {{ planGate.event.value.message || 'Tu plan actual no incluye esta función. Actualiza para desbloquearla.' }}
              </div>
              <div style="display: flex; gap: 10px;">
                <button
                  style="flex: 1; padding: 12px 16px; border-radius: 10px; background: #F7F4EF; border: none; font-size: 13px; font-weight: 600; color: #3A4A41; cursor: pointer; font-family: inherit;"
                  @click="planGate.dismiss()"
                >
                  Cancelar
                </button>
                <button
                  style="flex: 1; padding: 12px 16px; border-radius: 10px; background: #E8920A; border: none; font-size: 13px; font-weight: 700; color: #13301F; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: inherit;"
                  @click="() => { planGate.dismiss(); router.push({ name: 'Billing' }) }"
                >
                  Ver planes
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </div>
            </template>

            <!-- WALLET_LIMIT_REACHED -->
            <template v-else-if="planGate.event.value.code === 'WALLET_LIMIT_REACHED'">
              <div style="width: 64px; height: 64px; border-radius: 16px; background: #FEF3C7; display: grid; place-items: center; margin-bottom: 20px;">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2l10 18H2L12 2z"/><path d="M12 9v4"/><circle cx="12" cy="17" r="0.5" fill="#D97706"/>
                </svg>
              </div>
              <div style="font-size: 18px; font-weight: 800; color: #0F1B14; margin-bottom: 8px;">Límite de wallets alcanzado</div>
              <div style="font-size: 13px; color: #6B7A72; line-height: 1.7; margin-bottom: 24px;">
                {{ planGate.event.value.message }}. Actualiza tu plan para crear más wallets.
              </div>
              <button
                style="width: 100%; padding: 12px 16px; border-radius: 10px; background: #1B4332; border: none; font-size: 13px; font-weight: 700; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: inherit;"
                @click="() => { planGate.dismiss(); router.push({ name: 'Billing' }) }"
              >
                Ver planes
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </template>

            <!-- PASS_LIMIT_REACHED -->
            <template v-else-if="planGate.event.value.code === 'PASS_LIMIT_REACHED'">
              <div style="width: 64px; height: 64px; border-radius: 16px; background: #FEF3C7; display: grid; place-items: center; margin-bottom: 20px;">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2l10 18H2L12 2z"/><path d="M12 9v4"/><circle cx="12" cy="17" r="0.5" fill="#D97706"/>
                </svg>
              </div>
              <div style="font-size: 18px; font-weight: 800; color: #0F1B14; margin-bottom: 8px;">Límite de pases alcanzado</div>
              <div style="font-size: 13px; color: #6B7A72; line-height: 1.7; margin-bottom: 24px;">
                {{ planGate.event.value.message }}. Actualiza tu plan para emitir pases ilimitados.
              </div>
              <button
                style="width: 100%; padding: 12px 16px; border-radius: 10px; background: #1B4332; border: none; font-size: 13px; font-weight: 700; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: inherit;"
                @click="() => { planGate.dismiss(); router.push({ name: 'Billing' }) }"
              >
                Ver planes
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </template>

          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-8px); }

.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active > div, .modal-leave-active > div { transition: transform 0.2s ease; }
.modal-enter-from > div, .modal-leave-to > div { transform: scale(0.96); }

@keyframes sk-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
.sk { animation: sk-pulse 1.4s ease-in-out infinite; }
</style>
