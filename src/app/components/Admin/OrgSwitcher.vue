<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { useBillingStore } from '@/app/stores/billing/BillingStore'
import { useTheme } from '@/app/composables/useTheme'
import { useToast } from '@/app/composables/useToast'
import { ApiError } from '@/infrastructure/http/ApiClient'
import type { Organization } from '@/domain/organization/entities/Organization'
import type { OnboardingDto } from '@/app/stores/organization/OrganizationStore'

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

const orgStore = useOrganizationStore()
const authStore = useAuthStore()
const billingStore = useBillingStore()
const router = useRouter()
const toast = useToast()

const open = ref(false)
const trigger = ref<HTMLElement | null>(null)
const switching = ref(false)
const loadingList = ref(false)

// Create org modal
const showCreate = ref(false)
const creating = ref(false)
const formError = ref('')
const form = reactive<OnboardingDto & { industry: string; country: string; phone: string; logoUrl: string }>({
  organizationName: '',
  industry: '',
  country: '',
  phone: '',
  logoUrl: '',
})

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

async function openDropdown() {
  open.value = !open.value
  if (!open.value) return
  // Fetch always but only show skeleton when the list is empty
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
  form.organizationName = ''
  form.industry = ''
  form.country = ''
  form.phone = ''
  form.logoUrl = ''
  formError.value = ''
  showCreate.value = true
}

async function submitCreate() {
  if (!form.organizationName.trim()) {
    formError.value = 'El nombre es requerido'
    return
  }
  creating.value = true
  formError.value = ''
  try {
    const dto: OnboardingDto = {
      organizationName: form.organizationName.trim(),
      ...(form.industry?.trim() && { industry: form.industry.trim() }),
      ...(form.country?.trim() && { country: form.country.trim() }),
      ...(form.phone?.trim() && { phone: form.phone.trim() }),
      ...(form.logoUrl?.trim() && { logoUrl: form.logoUrl.trim() }),
    }
    const newOrg = await orgStore.createOrg(dto)
    await authStore.switchOrg(newOrg)
    showCreate.value = false
    toast.show('Organización creada', 'success')
    router.push({ name: 'Dashboard' })
  } catch (e: unknown) {
    const body = e instanceof ApiError ? (e.body as { message?: string } | null) : null
    const msg = body?.message ?? 'Error al crear la organización'
    formError.value = msg
    toast.show(msg, 'error')
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
          :style="`color: ${onCardText};`"
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

      <div
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

  <!-- Create Org Modal -->
  <Teleport to="body">
    <div
      v-if="showCreate"
      class="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style="background: rgba(0,0,0,0.45);"
      @mousedown.self="showCreate = false"
    >
      <div
        class="w-full max-w-md rounded-2xl shadow-2xl"
        style="background: var(--bg-surface); border: 1px solid var(--border);"
      >
        <!-- Header -->
        <div class="flex items-center justify-between" style="padding: 20px 24px 0;">
          <h2 style="font-size: 16px; font-weight: 700; color: var(--text-ink); margin: 0;">
            Nueva organización
          </h2>
          <button
            style="background: none; border: none; cursor: pointer; padding: 4px; border-radius: 6px; color: var(--text-muted); display: grid; place-items: center;"
            @click="showCreate = false"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Form -->
        <form style="padding: 20px 24px 24px;" @submit.prevent="submitCreate">
          <!-- Organization name -->
          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 5px;">
              Nombre <span style="color: var(--danger);">*</span>
            </label>
            <input
              v-model="form.organizationName"
              type="text"
              placeholder="Mi empresa"
              autofocus
              style="width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-field, var(--bg-page)); color: var(--text-ink); font-size: 14px; outline: none; box-sizing: border-box;"
              :style="formError && !form.organizationName.trim() ? 'border-color: var(--danger);' : ''"
              @focus="(e) => ((e.target as HTMLElement).style.borderColor = 'var(--primary)')"
              @blur="(e) => ((e.target as HTMLElement).style.borderColor = (formError && !form.organizationName.trim()) ? 'var(--danger)' : 'var(--border)')"
            />
          </div>

          <!-- Industry -->
          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 5px;">
              Industria
            </label>
            <input
              v-model="form.industry"
              type="text"
              placeholder="Retail, Hospitalidad…"
              style="width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-field, var(--bg-page)); color: var(--text-ink); font-size: 14px; outline: none; box-sizing: border-box;"
              @focus="(e) => ((e.target as HTMLElement).style.borderColor = 'var(--primary)')"
              @blur="(e) => ((e.target as HTMLElement).style.borderColor = 'var(--border)')"
            />
          </div>

          <!-- Country + Phone (2 cols) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 5px;">
                País
              </label>
              <input
                v-model="form.country"
                type="text"
                placeholder="México"
                style="width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-field, var(--bg-page)); color: var(--text-ink); font-size: 14px; outline: none; box-sizing: border-box;"
                @focus="(e) => ((e.target as HTMLElement).style.borderColor = 'var(--primary)')"
                @blur="(e) => ((e.target as HTMLElement).style.borderColor = 'var(--border)')"
              />
            </div>
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 5px;">
                Teléfono
              </label>
              <input
                v-model="form.phone"
                type="tel"
                placeholder="+52 33 1234 5678"
                style="width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-field, var(--bg-page)); color: var(--text-ink); font-size: 14px; outline: none; box-sizing: border-box;"
                @focus="(e) => ((e.target as HTMLElement).style.borderColor = 'var(--primary)')"
                @blur="(e) => ((e.target as HTMLElement).style.borderColor = 'var(--border)')"
              />
            </div>
          </div>

          <!-- Logo URL -->
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 5px;">
              Logo URL
            </label>
            <input
              v-model="form.logoUrl"
              type="url"
              placeholder="https://…"
              style="width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-field, var(--bg-page)); color: var(--text-ink); font-size: 14px; outline: none; box-sizing: border-box;"
              @focus="(e) => ((e.target as HTMLElement).style.borderColor = 'var(--primary)')"
              @blur="(e) => ((e.target as HTMLElement).style.borderColor = 'var(--border)')"
            />
          </div>

          <!-- Error message -->
          <p v-if="formError" style="font-size: 13px; color: var(--danger); margin: 0 0 14px; line-height: 1.4;">
            {{ formError }}
          </p>

          <!-- Actions -->
          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button
              type="button"
              style="padding: 9px 18px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--text-ink); font-size: 14px; font-weight: 500; cursor: pointer;"
              :disabled="creating"
              @click="showCreate = false"
            >
              Cancelar
            </button>
            <button
              type="submit"
              style="padding: 9px 18px; border-radius: 8px; border: none; background: var(--primary); color: var(--bg-surface); font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;"
              :style="creating ? 'opacity: 0.7; cursor: not-allowed;' : ''"
              :disabled="creating"
            >
              <svg v-if="creating" class="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              {{ creating ? 'Creando…' : 'Crear organización' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
