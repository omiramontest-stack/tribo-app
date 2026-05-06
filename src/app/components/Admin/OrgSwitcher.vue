<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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
        ? 'padding: 10px 12px; background: #13301F; border-radius: 10px; border: 1px solid #2D6A4F; cursor: pointer;'
        : 'padding: 8px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer;'"
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
            ? 'background: #E8920A; color: #13301F;'
            : 'background: #E6EFE9; color: #1B4332;'"
        >
          {{ getInitials(orgStore.activeOrg.name) }}
        </span>
      </template>
      <span v-else class="shrink-0 w-7 h-7 rounded-lg" :style="dark ? 'background: #2D6A4F;' : 'background: #EFEAE0;'" />

      <!-- Name + plan -->
      <div style="flex: 1; min-width: 0;">
        <div
          class="font-semibold truncate"
          style="font-size: 13px; line-height: 1.2;"
          :style="dark ? 'color: #fff;' : 'color: #0F1B14;'"
          :class="{ 'opacity-50': switching }"
        >
          {{ orgStore.activeOrg?.name ?? 'Sin organización' }}
        </div>
        <div
          v-if="dark && orgStore.activeOrg"
          style="display: flex; align-items: center; gap: 5px; margin-top: 3px;"
        >
          <span style="font-size: 11px; font-weight: 600; color: #F5B942; line-height: 1.2;">
            {{ billingStore.status?.plan?.name ?? '—' }}
          </span>
          <template v-if="billingStore.status?.smsCredits != null">
            <span style="width: 2px; height: 2px; border-radius: 50%; background: #4A7A5E; flex-shrink: 0;" />
            <span style="display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 500; color: #9DB7A8; white-space: nowrap;">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.7;">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
              {{ billingStore.status.smsCredits.toLocaleString() }} créditos
            </span>
          </template>
        </div>
      </div>

      <!-- Spinner / Chevron -->
      <svg v-if="switching" class="w-3.5 h-3.5 shrink-0 animate-spin" :style="dark ? 'color:#9DB7A8' : 'color:#A8B3AC'" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      <svg
        v-else
        class="w-3.5 h-3.5 shrink-0 transition-transform"
        :class="{ 'rotate-180': open }"
        fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24"
        :style="dark ? 'color:#A7C3B0' : 'color:#A8B3AC'"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <!-- Dropdown -->
    <div
      v-if="open"
      class="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl shadow-lg overflow-hidden"
      :style="dark
        ? 'background: #13301F; border: 1px solid #2D6A4F;'
        : 'background: #fff; border: 1px solid #ECEFEB;'"
    >
      <div class="py-1">
        <button
          v-for="org in orgStore.organizations"
          :key="org.id"
          class="w-full flex items-center gap-2.5 text-left transition-colors"
          style="padding: 8px 12px; border: none; cursor: pointer; background: transparent;"
          :style="dark ? 'color: #fff;' : 'color: #0F1B14;'"
          @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background = dark ? 'rgba(255,255,255,0.06)' : '#F7F4EF'"
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
            :style="dark ? 'background: #2D6A4F; color: #F5B942;' : 'background: #E6EFE9; color: #1B4332;'"
          >
            {{ getInitials(org.name) }}
          </span>
          <span class="flex-1 truncate" style="font-size: 13px;">{{ org.name }}</span>
          <svg
            v-if="orgStore.activeOrg?.id === org.id"
            class="w-3.5 h-3.5 shrink-0"
            fill="none" stroke="#E8920A" stroke-width="2.5" stroke-linecap="round" viewBox="0 0 24 24"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>

      <div
        class="py-1"
        :style="dark ? 'border-top: 1px solid #2D6A4F;' : 'border-top: 1px solid #ECEFEB;'"
      >
        <button
          class="w-full flex items-center gap-2 text-left"
          style="padding: 8px 12px; border: none; background: transparent; cursor: pointer; font-size: 13px;"
          :style="dark ? 'color: #F5B942;' : 'color: #1B4332;'"
          @click="goOnboarding"
        >
          <span style="font-size: 16px; line-height: 1;">+</span>
          Crear organización
        </button>
      </div>
    </div>
  </div>
</template>
