<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { useBillingStore } from '@/app/stores/billing/BillingStore'
import type { Organization } from '@/domain/organization/entities/Organization'

const props = withDefaults(defineProps<{ dark?: boolean }>(), { dark: false })

const orgStore = useOrganizationStore()
const authStore = useAuthStore()
const billingStore = useBillingStore()
const router = useRouter()
const open = ref(false)
const trigger = ref<HTMLElement | null>(null)
const switching = ref(false)

function getInitials(name: string = ''): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

const trialDaysLeft = computed(() => {
  const info = billingStore.status?.trialInfo
  if (info) return info.daysRemaining
  const endsAt = billingStore.status?.trialEndsAt
  if (!endsAt) return null
  const days = Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000)
  return days > 0 ? days : 0
})

const isTrial = computed(() => trialDaysLeft.value !== null)
const trialUrgent = computed(() => isTrial.value && trialDaysLeft.value! <= 3)

const planLabel = computed(() => {
  if (isTrial.value) return 'Trial'
  const planName = billingStore.status?.plan?.name
  if (planName?.toLowerCase().includes('prueba') || planName?.toLowerCase().includes('trial')) return 'Trial'
  return planName ?? '—'
})

const planColor = computed(() => {
  if (trialUrgent.value) return 'var(--danger)'
  if (isTrial.value) return 'var(--text-nav-icon)'
  return 'var(--text-ink)'
})

async function select(org: Organization) {
  if (org.id === orgStore.activeOrg?.id) { open.value = false; return }
  switching.value = true
  open.value = false
  try {
    await authStore.switchOrg(org)
  } finally {
    switching.value = false
  }
}

function goOnboarding() {
  open.value = false
  router.push({ name: 'Onboarding' })
}

function handleOutsideClick(e: MouseEvent) {
  if (trigger.value && !trigger.value.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', handleOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', handleOutsideClick))
</script>

<template>
  <div ref="trigger" class="relative">
    <!-- Trigger -->
    <button
      class="w-full flex items-center gap-2.5 text-left transition-colors"
      :style="dark
        ? 'padding: 10px 12px; background: var(--bg-surface); border-radius: 10px; border: 1px solid var(--border-nav); cursor: pointer;'
        : 'padding: 8px 10px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-surface); cursor: pointer; box-shadow: 0 1px 3px var(--shadow-card);'"
      @click="open = !open"
    >
      <!-- Initials avatar -->
      <template v-if="orgStore.activeOrg">
        <img
          v-if="orgStore.activeOrg.logoUrl"
          :src="orgStore.activeOrg.logoUrl"
          :alt="orgStore.activeOrg.name"
          class="shrink-0 w-7 h-7 rounded-lg object-cover"
        />
        <span
          v-else
          class="shrink-0 grid place-items-center font-bold text-xs rounded-lg"
          style="width: 28px; height: 28px;"
          :style="dark
            ? 'background: var(--amber); color: var(--primary);'
            : 'background: var(--primary); color: var(--bg-surface);'"
        >
          {{ getInitials(orgStore.activeOrg.name) }}
        </span>
      </template>
      <span v-else class="shrink-0 w-7 h-7 rounded-lg" :style="dark ? 'background: var(--bg-field);' : 'background: var(--bg-subtle);'" />

      <!-- Name + plan -->
      <div style="flex: 1; min-width: 0;">
        <div
          class="font-semibold truncate"
          style="font-size: 13px; line-height: 1.2;"
          :style="dark ? 'color: var(--bg-surface);' : 'color: var(--text-ink);'"
          :class="{ 'opacity-50': switching }"
        >
          {{ orgStore.activeOrg?.name ?? 'Sin organización' }}
        </div>
        <div
          v-if="orgStore.activeOrg"
          style="display: flex; align-items: center; gap: 5px; margin-top: 3px;"
        >
          <span :style="`font-size: 11px; font-weight: 600; color: ${planColor}; line-height: 1.2;`">
            {{ planLabel }}
          </span>
          <template v-if="billingStore.status?.smsCredits != null">
            <span :style="`width: 2px; height: 2px; border-radius: 50%; flex-shrink: 0; background: ${dark ? 'var(--border)' : 'var(--text-ink)'};`" />
            <span :style="`display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 500; white-space: nowrap; color: ${dark ? 'var(--text-nav-user)' : 'var(--text-ink)'};`">

             ©️ {{ billingStore.status.smsCredits.toLocaleString() }} créditos
            </span>
          </template>
        </div>
      </div>

      <!-- Spinner / Chevron -->
      <svg v-if="switching" class="w-3.5 h-3.5 shrink-0 animate-spin" :style="dark ? 'color: var(--text-faint)' : 'color: var(--text-faint)'" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      <svg
        v-else
        class="w-3.5 h-3.5 shrink-0 transition-transform"
        :class="{ 'rotate-180': open }"
        fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24"
        :style="dark ? 'color: var(--text-faint)' : 'color: var(--text-faint)'"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <!-- Dropdown -->
    <div
      v-if="open"
      class="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl shadow-lg overflow-hidden"
      :style="dark
        ? 'background: var(--bg-surface); border: 1px solid var(--border-nav);'
        : 'background: var(--bg-surface); border: 1px solid var(--border);'"
    >
      <div class="py-1">
        <button
          v-for="org in orgStore.organizations"
          :key="org.id"
          class="w-full flex items-center gap-2.5 text-left transition-colors"
          style="padding: 8px 12px; border: none; cursor: pointer; background: transparent;"
          :style="dark ? 'color: var(--bg-surface);' : 'color: var(--text-ink);'"
          @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background = dark ? 'rgba(255,255,255,0.06)' : 'var(--bg-page)'"
          @mouseleave="(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'"
          @click="select(org)"
        >
          <img
            v-if="org.logoUrl"
            :src="org.logoUrl" :alt="org.name"
            class="shrink-0 w-6 h-6 rounded-md object-cover"
          />
          <span
            v-else
            class="shrink-0 grid place-items-center font-bold text-xs rounded-md"
            style="width: 24px; height: 24px;"
            :style="dark ? 'background: var(--bg-field); color: var(--amber);' : 'background: var(--primary-light); color: var(--primary-text);'"
          >
            {{ getInitials(org.name) }}
          </span>
          <span class="flex-1 truncate" style="font-size: 13px;">{{ org.name }}</span>
          <svg
            v-if="orgStore.activeOrg?.id === org.id"
            class="w-3.5 h-3.5 shrink-0"
            fill="none" stroke="var(--amber)" stroke-width="2.5" stroke-linecap="round" viewBox="0 0 24 24"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>

      <div
        class="py-1"
        :style="dark ? 'border-top: 1px solid var(--border-nav);' : 'border-top: 1px solid var(--border);'"
      >
        <button
          class="w-full flex items-center gap-2 text-left"
          style="padding: 8px 12px; border: none; background: transparent; cursor: pointer; font-size: 13px;"
          :style="dark ? 'color: var(--amber);' : 'color: var(--primary-text);'"
          @click="goOnboarding"
        >
          <span style="font-size: 16px; line-height: 1;">+</span>
          Crear organización
        </button>
      </div>
    </div>
  </div>
</template>
