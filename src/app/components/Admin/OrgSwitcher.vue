<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import type { Organization } from '@/domain/organization/entities/Organization'

const orgStore = useOrganizationStore()
const authStore = useAuthStore()
const router = useRouter()
const open = ref(false)
const trigger = ref<HTMLElement | null>(null)

function getInitials(name: string = ''): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// Deterministic color from org name
const COLORS = [
  'bg-blue-600',
  'bg-violet-600',
  'bg-emerald-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-cyan-600',
  'bg-pink-600',
  'bg-indigo-600',
]
function orgColor(name: string = ''): string {
  if (!name) return COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

const canCreateOrg = computed(() => orgStore.organizations.length === 0)
const switching = ref(false)

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
    <!-- Trigger button -->
    <button
      class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
      @click="open = !open"
    >
      <!-- Logo / Initials -->
      <template v-if="orgStore.activeOrg">
        <img
          v-if="orgStore.activeOrg.logoUrl"
          :src="orgStore.activeOrg.logoUrl"
          :alt="orgStore.activeOrg.name"
          class="flex-shrink-0 w-7 h-7 rounded-md object-cover"
        />
        <span
          v-else
          class="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold"
          :class="orgColor(orgStore.activeOrg.name)"
        >
          {{ getInitials(orgStore.activeOrg.name) }}
        </span>
      </template>
      <span
        v-else
        class="flex-shrink-0 w-7 h-7 rounded-md bg-neutral-300 dark:bg-neutral-700"
      />

      <span
        class="flex-1 truncate text-sm font-medium text-neutral-700 dark:text-neutral-200 transition-opacity"
        :class="{ 'opacity-50': switching }"
      >
        {{ orgStore.activeOrg?.name ?? 'Sin organización' }}
      </span>

      <!-- Spinner while switching -->
      <svg v-if="switching" class="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>

      <!-- Chevron -->
      <svg
        v-else
        class="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 transition-transform"
        :class="{ 'rotate-180': open }"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown -->
    <div
      v-if="open"
      class="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden"
    >
      <div class="py-1">
        <button
          v-for="org in orgStore.organizations"
          :key="org.id"
          class="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
          @click="select(org)"
        >
          <img
            v-if="org.logoUrl"
            :src="org.logoUrl"
            :alt="org.name"
            class="flex-shrink-0 w-6 h-6 rounded-md object-cover"
          />
          <span
            v-else
            class="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
            :class="orgColor(org.name)"
          >
            {{ getInitials(org.name) }}
          </span>
          <span class="flex-1 truncate text-sm text-neutral-700 dark:text-neutral-200">{{ org.name }}</span>
          <svg
            v-if="orgStore.activeOrg?.id === org.id"
            class="w-3.5 h-3.5 text-blue-500 flex-shrink-0"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>

      <div v-if="canCreateOrg" class="border-t border-neutral-100 dark:border-neutral-800 py-1">
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
          @click="goOnboarding"
        >
          <span class="text-base leading-none">+</span>
          Crear organización
        </button>
      </div>
    </div>
  </div>
</template>
