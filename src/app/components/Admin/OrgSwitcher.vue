<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { useBillingStore } from '@/app/stores/billing/BillingStore'
import { useTheme } from '@/app/composables/useTheme'
import { useToast } from '@/app/composables/useToast'
import { ApiError } from '@/infrastructure/http/ApiClient'
import CreateOrgForm from '@/app/components/Shared/CreateOrgForm.vue'
import type { Organization } from '@/domain/organization/entities/Organization'
import type { OnboardingDto } from '@/domain/organization/repository/OrganizationRepository'

const props = withDefaults(defineProps<{ dark?: boolean }>(), { dark: false })
const { isDark } = useTheme()

const onCardText = computed(() => props.dark
  ? (isDark.value ? 'var(--on-primary)' : 'var(--text-ink)')
  : 'var(--text-ink)'
)
const onCardTextMuted = computed(() => props.dark
  ? (isDark.value ? 'var(--on-primary-muted)' : 'var(--text-muted)')
  : 'var(--text-muted)'
)
const onCardDot = computed(() => props.dark
  ? (isDark.value ? 'var(--on-primary-faint)' : 'var(--text-faint)')
  : 'var(--text-faint)'
)

const orgStore    = useOrganizationStore()
const authStore   = useAuthStore()
const billingStore = useBillingStore()
const router      = useRouter()
const toast       = useToast()

const open        = ref(false)
const trigger     = ref<HTMLElement | null>(null)
const switching   = ref(false)
const loadingList = ref(false)

// Modal state
const showCreate  = ref(false)
const creating    = ref(false)
const createError = ref('')

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

const isTrial    = computed(() => trialDaysLeft.value !== null)
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

async function openDropdown() {
  open.value = !open.value
  if (!open.value) return
  const needsSkeleton = orgStore.organizations.length === 0
  if (needsSkeleton) loadingList.value = true
  orgStore.fetchMyOrganizations().finally(() => { loadingList.value = false })
}

async function select(org: Organization) {
  if (org.id === orgStore.activeOrg?.id) { open.value = false; return }
  switching.value = true
  open.value = false
  try {
    await authStore.switchOrg(org)
    toast.show('Organización cambiada', 'success')
    router.push({ name: 'Dashboard' })
  } catch {
    toast.show('Error al cambiar de organización', 'error')
  } finally {
    switching.value = false
  }
}

function openCreate() {
  open.value = false
  createError.value = ''
  showCreate.value = true
}

async function handleCreateSubmit(dto: OnboardingDto) {
  creating.value = true
  createError.value = ''
  try {
    const newOrg = await orgStore.createOrg(dto)
    await authStore.switchOrg(newOrg)
    showCreate.value = false
    toast.show('Organización creada', 'success')
    router.push({ name: 'Dashboard' })
  } catch (e: unknown) {
    const body = e instanceof ApiError ? (e.body as { message?: string } | null) : null
    createError.value = body?.message ?? 'Error al crear la organización'
    toast.show(createError.value, 'error')
  } finally {
    creating.value = false
  }
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
        ? 'padding: 10px 12px; background: var(--on-primary-card); border-radius: 10px; border: 1px solid var(--on-primary-border); cursor: pointer;'
        : 'padding: 8px 10px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-surface); cursor: pointer; box-shadow: 0 1px 3px var(--shadow-card);'"
      @click="openDropdown"
    >
      <!-- Avatar -->
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
          :style="`color: ${onCardText};`"
          :class="{ 'opacity-50': switching }"
        >
          {{ orgStore.activeOrg?.name ?? 'Sin organización' }}
        </div>
        <div v-if="orgStore.activeOrg" style="display: flex; align-items: center; gap: 5px; margin-top: 3px;">
          <span :style="`font-size: 11px; font-weight: 600; color: ${planColor}; line-height: 1.2;`">
            {{ planLabel }}
          </span>
          <template v-if="billingStore.status?.smsCredits != null">
            <span :style="`width: 2px; height: 2px; border-radius: 50%; flex-shrink: 0; background: ${onCardDot};`" />
            <span :style="`display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 500; white-space: nowrap; color: ${onCardTextMuted};`">
              ©️ {{ billingStore.status.smsCredits.toLocaleString() }} créditos
            </span>
          </template>
        </div>
      </div>

      <!-- Spinner / Chevron -->
      <svg v-if="switching" class="w-3.5 h-3.5 shrink-0 animate-spin" style="color: var(--text-faint)" fill="none" viewBox="0 0 24 24">
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
        ? 'background: var(--on-primary-card); border: 1px solid var(--on-primary-border);'
        : 'background: var(--bg-surface); border: 1px solid var(--border);'"
    >
      <!-- Skeleton while loading -->
      <div v-if="loadingList" class="py-2 px-3 flex flex-col gap-2">
        <div
          v-for="i in 2" :key="i"
          class="flex items-center gap-2.5 animate-pulse"
          style="padding: 6px 0;"
        >
          <span class="shrink-0 rounded-md" style="width: 24px; height: 24px; background: var(--bg-subtle);" />
          <span class="rounded" style="height: 12px; flex: 1; background: var(--bg-subtle);" />
        </div>
      </div>

      <!-- Org list -->
      <div v-else class="py-1">
        <button
          v-for="org in orgStore.organizations"
          :key="org.id"
          class="w-full flex items-center gap-2.5 text-left transition-colors"
          style="padding: 8px 12px; border: none; cursor: pointer; background: transparent;"
          :style="`color: ${onCardText};`"
          @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background = dark ? 'var(--on-primary-surface)' : 'var(--bg-page)'"
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

      <!-- Nueva organización (solo owners) -->
      <div
        v-if="orgStore.isOwner"
        class="py-1"
        :style="dark ? 'border-top: 1px solid var(--border-nav);' : 'border-top: 1px solid var(--border);'"
      >
        <button
          class="w-full flex items-center gap-2 text-left"
          style="padding: 8px 12px; border: none; background: transparent; cursor: pointer; font-size: 13px;"
          :style="dark ? 'color: var(--amber);' : 'color: var(--primary-text);'"
          @click="openCreate"
        >
          <span style="font-size: 16px; line-height: 1;">+</span>
          Nueva organización
        </button>
      </div>
    </div>
  </div>

  <!-- Modal: Crear organización -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="showCreate"
        class="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style="background: rgba(0,0,0,0.5);"
        @mousedown.self="showCreate = false"
      >
        <div
          class="w-full rounded-2xl shadow-2xl flex flex-col"
          style="max-width: 520px; max-height: calc(100dvh - 48px); background: var(--bg-surface); border: 1px solid var(--border); overflow: hidden;"
        >
          <!-- Header fijo -->
          <div
            class="flex items-center justify-between shrink-0"
            style="padding: 20px 24px 16px; border-bottom: 1px solid var(--border);"
          >
            <div>
              <h2 style="font-size: 16px; font-weight: 800; color: var(--text-ink); margin: 0 0 3px; letter-spacing: -0.01em;">
                Nueva organización
              </h2>
              <p style="font-size: 12px; color: var(--text-muted); margin: 0;">
                Serás el owner y tendrás un trial de 14 días.
              </p>
            </div>
            <button
              style="background: none; border: none; cursor: pointer; padding: 6px; border-radius: 8px; color: var(--text-muted); display: grid; place-items: center; flex-shrink: 0;"
              @click="showCreate = false"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Formulario scrollable -->
          <div style="padding: 20px 24px 24px; overflow-y: auto;">
            <CreateOrgForm
              :loading="creating"
              :server-error="createError"
              submit-label="Crear organización"
              :show-cancel="true"
              @submit="handleCreateSubmit"
              @cancel="showCreate = false"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}
.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.18s ease, opacity 0.18s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.97) translateY(8px);
  opacity: 0;
}
</style>
