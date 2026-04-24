<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import { useAuthStore } from '@/app/stores/auth/AuthStore'

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function uploadToImgBB(file: File): Promise<string> {
  const base64 = await fileToBase64(file)
  const body = new FormData()
  body.append('key', IMGBB_API_KEY)
  body.append('image', base64)
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body })
  if (!res.ok) throw new Error('Error al subir imagen')
  const data = await res.json()
  return data.data.url as string
}

const router = useRouter()
const orgStore = useOrganizationStore()
const authStore = useAuthStore()

const countries = [
  { name: 'México', code: 'MX', dial: '+52', flag: '🇲🇽' },
  { name: 'Estados Unidos', code: 'US', dial: '+1', flag: '🇺🇸' },
  { name: 'Canada', code: 'CA', dial: '+1', flag: '🇨🇦' },
  { name: 'Argentina', code: 'AR', dial: '+54', flag: '🇦🇷' },
  { name: 'Brasil', code: 'BR', dial: '+55', flag: '🇧🇷' },
  { name: 'Chile', code: 'CL', dial: '+56', flag: '🇨🇱' },
  { name: 'Colombia', code: 'CO', dial: '+57', flag: '🇨🇴' },
  { name: 'Perú', code: 'PE', dial: '+51', flag: '🇵🇪' },
  { name: 'Venezuela', code: 'VE', dial: '+58', flag: '🇻🇪' },
  { name: 'Ecuador', code: 'EC', dial: '+593', flag: '🇪🇨' },
  { name: 'Bolivia', code: 'BO', dial: '+591', flag: '🇧🇴' },
  { name: 'Paraguay', code: 'PY', dial: '+595', flag: '🇵🇾' },
  { name: 'Uruguay', code: 'UY', dial: '+598', flag: '🇺🇾' },
  { name: 'Guatemala', code: 'GT', dial: '+502', flag: '🇬🇹' },
  { name: 'Cuba', code: 'CU', dial: '+53', flag: '🇨🇺' },
  { name: 'Honduras', code: 'HN', dial: '+504', flag: '🇭🇳' },
  { name: 'El Salvador', code: 'SV', dial: '+503', flag: '🇸🇻' },
  { name: 'Nicaragua', code: 'NI', dial: '+505', flag: '🇳🇮' },
  { name: 'Costa Rica', code: 'CR', dial: '+506', flag: '🇨🇷' },
  { name: 'Panamá', code: 'PA', dial: '+507', flag: '🇵🇦' },
  { name: 'República Dominicana', code: 'DO', dial: '+1809', flag: '🇩🇴' },
  { name: 'España', code: 'ES', dial: '+34', flag: '🇪🇸' },
  { name: 'Reino Unido', code: 'GB', dial: '+44', flag: '🇬🇧' },
  { name: 'Alemania', code: 'DE', dial: '+49', flag: '🇩🇪' },
  { name: 'Francia', code: 'FR', dial: '+33', flag: '🇫🇷' },
  { name: 'Italia', code: 'IT', dial: '+39', flag: '🇮🇹' },
  { name: 'Portugal', code: 'PT', dial: '+351', flag: '🇵🇹' },
  { name: 'Países Bajos', code: 'NL', dial: '+31', flag: '🇳🇱' },
  { name: 'Suiza', code: 'CH', dial: '+41', flag: '🇨🇭' },
  { name: 'Japón', code: 'JP', dial: '+81', flag: '🇯🇵' },
  { name: 'China', code: 'CN', dial: '+86', flag: '🇨🇳' },
  { name: 'India', code: 'IN', dial: '+91', flag: '🇮🇳' },
  { name: 'Australia', code: 'AU', dial: '+61', flag: '🇦🇺' },
]

const form = reactive({
  organizationName: '',
  industry: '',
  selectedCountry: countries[0],
  phoneNumber: '',
})
const logoPreview = ref<string>('')
const logoUrl = ref<string>('')
const logoUploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const error = ref('')

async function handleLogoChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  logoPreview.value = URL.createObjectURL(file)
  logoUploading.value = true
  try {
    logoUrl.value = await uploadToImgBB(file)
  } catch {
    error.value = 'No se pudo subir el logo, intenta de nuevo'
    logoPreview.value = ''
  } finally {
    logoUploading.value = false
  }
}

function removeLogo(fileInput: HTMLInputElement | null) {
  logoPreview.value = ''
  logoUrl.value = ''
  if (fileInput) fileInput.value = ''
}

const industries = [
  'Retail',
  'Food & Beverage',
  'Health & Wellness',
  'Beauty',
  'Entertainment',
  'Sports',
  'Education',
  'Other',
]

const fullPhone = computed(() =>
  form.phoneNumber ? `${form.selectedCountry.dial} ${form.phoneNumber}` : '',
)

async function handleSubmit() {
  if (!form.organizationName.trim()) {
    error.value = 'El nombre de la organización es requerido'
    return
  }
  try {
    loading.value = true
    error.value = ''
    const org = await orgStore.onboarding({
      organizationName: form.organizationName.trim(),
      industry: form.industry || undefined,
      country: form.selectedCountry.name,
      phone: fullPhone.value || undefined,
      logoUrl: logoUrl.value || undefined,
    })
    router.push({ name: 'Dashboard' })
  } catch {
    error.value = 'Ocurrió un error al crear la organización'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <span class="text-2xl font-bold text-white">Wallet SaaS</span>
        <p class="text-neutral-400 text-sm mt-2">Configura tu organización para comenzar</p>
      </div>

      <div class="bg-neutral-900 rounded-2xl border border-neutral-800 p-8 space-y-6">
        <div>
          <h1 class="text-lg font-semibold text-white">Crea tu organización</h1>
          <p class="text-neutral-400 text-sm mt-1">Podrás cambiar estos datos después en configuración.</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-neutral-300 mb-1.5">
              Nombre del negocio <span class="text-red-400">*</span>
            </label>
            <input
              v-model="form.organizationName"
              type="text"
              placeholder="Ej. Café La Estrella"
              class="w-full bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-500"
              @keyup.enter="handleSubmit"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-300 mb-1.5">Logo <span class="text-neutral-500 font-normal">(opcional)</span></label>
            <div class="flex items-center gap-4">
              <div
                class="w-16 h-16 rounded-xl border-2 border-dashed border-neutral-700 flex items-center justify-center overflow-hidden shrink-0 bg-neutral-800 relative"
              >
                <img v-if="logoPreview && !logoUploading" :src="logoPreview" class="w-full h-full object-cover" alt="logo" />
                <svg v-else-if="logoUploading" class="animate-spin w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                <span v-else class="text-neutral-500 text-2xl">🖼</span>
              </div>
              <div class="flex-1 space-y-2">
                <label
                  class="flex items-center justify-center gap-2 cursor-pointer bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 text-sm rounded-lg px-3 py-2 transition-colors"
                  :class="{ 'pointer-events-none opacity-50': logoUploading }"
                >
                  <span>{{ logoPreview ? 'Cambiar imagen' : 'Subir logo' }}</span>
                  <input
                    ref="fileInputRef"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleLogoChange"
                  />
                </label>
                <button
                  v-if="logoPreview"
                  type="button"
                  class="w-full text-xs text-neutral-500 hover:text-red-400 transition-colors"
                  @click="removeLogo(fileInputRef)"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-300 mb-1.5">Industria</label>
            <select
              v-model="form.industry"
              class="w-full bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar (opcional)</option>
              <option v-for="ind in industries" :key="ind" :value="ind">{{ ind }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-300 mb-1.5">País</label>
            <select
              v-model="form.selectedCountry"
              class="w-full bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option v-for="c in countries" :key="c.code" :value="c">
                {{ c.flag }} {{ c.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-300 mb-1.5">Teléfono</label>
            <div class="flex gap-2">
              <div class="flex items-center bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-white whitespace-nowrap select-none">
                {{ form.selectedCountry.flag }} {{ form.selectedCountry.dial }}
              </div>
              <input
                v-model="form.phoneNumber"
                type="tel"
                placeholder="55 0000 0000"
                class="flex-1 bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-500"
              />
            </div>
          </div>
        </div>

        <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>

        <button
          :disabled="loading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          @click="handleSubmit"
        >
          {{ loading ? 'Creando organización...' : 'Continuar al dashboard →' }}
        </button>
      </div>
    </div>
  </div>
</template>
