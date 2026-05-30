<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { OnboardingDto } from '@/domain/organization/repository/OrganizationRepository'

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY

const props = withDefaults(defineProps<{
  loading?: boolean
  serverError?: string
  submitLabel?: string
  showCancel?: boolean
}>(), {
  loading: false,
  serverError: '',
  submitLabel: 'Crear organización',
  showCancel: false,
})

const emit = defineEmits<{
  submit: [dto: OnboardingDto]
  cancel: []
}>()

const countries = [
  { name: 'México',               code: 'MX', dial: '+52',   flag: '🇲🇽' },
  { name: 'Estados Unidos',       code: 'US', dial: '+1',    flag: '🇺🇸' },
  { name: 'Canada',               code: 'CA', dial: '+1',    flag: '🇨🇦' },
  { name: 'Argentina',            code: 'AR', dial: '+54',   flag: '🇦🇷' },
  { name: 'Brasil',               code: 'BR', dial: '+55',   flag: '🇧🇷' },
  { name: 'Chile',                code: 'CL', dial: '+56',   flag: '🇨🇱' },
  { name: 'Colombia',             code: 'CO', dial: '+57',   flag: '🇨🇴' },
  { name: 'Perú',                 code: 'PE', dial: '+51',   flag: '🇵🇪' },
  { name: 'Venezuela',            code: 'VE', dial: '+58',   flag: '🇻🇪' },
  { name: 'Ecuador',              code: 'EC', dial: '+593',  flag: '🇪🇨' },
  { name: 'Bolivia',              code: 'BO', dial: '+591',  flag: '🇧🇴' },
  { name: 'Paraguay',             code: 'PY', dial: '+595',  flag: '🇵🇾' },
  { name: 'Uruguay',              code: 'UY', dial: '+598',  flag: '🇺🇾' },
  { name: 'Guatemala',            code: 'GT', dial: '+502',  flag: '🇬🇹' },
  { name: 'Cuba',                 code: 'CU', dial: '+53',   flag: '🇨🇺' },
  { name: 'Honduras',             code: 'HN', dial: '+504',  flag: '🇭🇳' },
  { name: 'El Salvador',          code: 'SV', dial: '+503',  flag: '🇸🇻' },
  { name: 'Nicaragua',            code: 'NI', dial: '+505',  flag: '🇳🇮' },
  { name: 'Costa Rica',           code: 'CR', dial: '+506',  flag: '🇨🇷' },
  { name: 'Panamá',               code: 'PA', dial: '+507',  flag: '🇵🇦' },
  { name: 'República Dominicana', code: 'DO', dial: '+1809', flag: '🇩🇴' },
  { name: 'España',               code: 'ES', dial: '+34',   flag: '🇪🇸' },
  { name: 'Reino Unido',          code: 'GB', dial: '+44',   flag: '🇬🇧' },
  { name: 'Alemania',             code: 'DE', dial: '+49',   flag: '🇩🇪' },
  { name: 'Francia',              code: 'FR', dial: '+33',   flag: '🇫🇷' },
  { name: 'Italia',               code: 'IT', dial: '+39',   flag: '🇮🇹' },
  { name: 'Portugal',             code: 'PT', dial: '+351',  flag: '🇵🇹' },
  { name: 'Países Bajos',         code: 'NL', dial: '+31',   flag: '🇳🇱' },
  { name: 'Suiza',                code: 'CH', dial: '+41',   flag: '🇨🇭' },
  { name: 'Japón',                code: 'JP', dial: '+81',   flag: '🇯🇵' },
  { name: 'China',                code: 'CN', dial: '+86',   flag: '🇨🇳' },
  { name: 'India',                code: 'IN', dial: '+91',   flag: '🇮🇳' },
  { name: 'Australia',            code: 'AU', dial: '+61',   flag: '🇦🇺' },
]

const industries = [
  'Retail', 'Food & Beverage', 'Health & Wellness', 'Beauty',
  'Entertainment', 'Sports', 'Education', 'Other',
]

const form = reactive({
  organizationName: '',
  industry: '',
  selectedCountry: countries[0],
  phoneNumber: '',
})

const logoPreview    = ref('')
const logoUrl        = ref('')
const logoUploading  = ref(false)
const fileInputRef   = ref<HTMLInputElement | null>(null)
const validationError = ref('')

const displayError = computed(() => validationError.value || props.serverError || '')

const fullPhone = computed(() =>
  form.phoneNumber
    ? `${form.selectedCountry.dial}${form.phoneNumber.replace(/^0+/, '')}`
    : ''
)

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
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

async function handleLogoFile(file: File) {
  logoPreview.value = URL.createObjectURL(file)
  logoUploading.value = true
  validationError.value = ''
  try {
    logoUrl.value = await uploadToImgBB(file)
  } catch {
    validationError.value = 'No se pudo subir el logo, intenta de nuevo'
    logoPreview.value = ''
    logoUrl.value = ''
  } finally {
    logoUploading.value = false
  }
}

function handleLogoChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) handleLogoFile(file)
}

function handleDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file) handleLogoFile(file)
}

function removeLogo() {
  logoPreview.value = ''
  logoUrl.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function handleSubmit() {
  if (!form.organizationName.trim()) {
    validationError.value = 'El nombre de la organización es requerido'
    return
  }
  if (logoUploading.value) return
  validationError.value = ''
  emit('submit', {
    organizationName: form.organizationName.trim(),
    industry:  form.industry || undefined,
    country:   form.selectedCountry.name,
    phone:     fullPhone.value || undefined,
    logoUrl:   logoUrl.value || undefined,
  })
}
</script>

<template>
  <form novalidate @submit.prevent="handleSubmit">
    <div style="display: flex; flex-direction: column; gap: 16px;">

      <!-- Nombre -->
      <div>
        <label class="field-label">
          Nombre del negocio <span style="color: var(--danger);">*</span>
        </label>
        <input
          v-model="form.organizationName"
          type="text"
          placeholder="Ej. Café La Estrella"
          class="field-input"
          @focus="(e) => { (e.target as HTMLInputElement).style.borderColor='var(--amber)'; (e.target as HTMLInputElement).style.boxShadow='0 0 0 3px var(--amber-bg)'; }"
          @blur="(e) => { (e.target as HTMLInputElement).style.borderColor='var(--border)'; (e.target as HTMLInputElement).style.boxShadow='none'; }"
        />
      </div>

      <!-- Logo -->
      <div>
        <label class="field-label">
          Logo <span style="font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--text-faint);">(opcional)</span>
        </label>
        <input ref="fileInputRef" type="file" accept="image/*" style="display: none;" @change="handleLogoChange" />

        <!-- Preview -->
        <div
          v-if="logoPreview && !logoUploading"
          style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg-surface);"
        >
          <img
            :src="logoPreview"
            alt="Logo"
            style="width: 44px; height: 44px; border-radius: 8px; object-fit: contain; background: var(--bg-page); padding: 4px; flex-shrink: 0;"
          />
          <div style="flex: 1; min-width: 0;">
            <p style="font-size: 12px; font-weight: 600; color: var(--text-ink); margin: 0 0 2px;">Logo cargado</p>
            <p style="font-size: 11px; color: var(--text-faint); margin: 0;">Listo para usar</p>
          </div>
          <button
            type="button"
            style="font-size: 11px; font-weight: 600; color: var(--text-muted); background: var(--bg-page); border: 1px solid var(--border); border-radius: 7px; padding: 5px 10px; cursor: pointer; white-space: nowrap;"
            @click="removeLogo"
          >
            Cambiar
          </button>
        </div>

        <!-- Upload zone / spinner -->
        <div
          v-else
          class="upload-zone"
          :style="logoUploading ? 'opacity: 0.6; pointer-events: none;' : ''"
          @click="fileInputRef?.click()"
          @dragover.prevent
          @drop.prevent="handleDrop"
        >
          <div v-if="logoUploading" style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="1.8" stroke-linecap="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <p style="font-size: 12px; color: var(--text-faint); font-weight: 500; margin: 0;">Subiendo logo...</p>
          </div>
          <div v-else style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
            <div style="width: 32px; height: 32px; border-radius: 9px; background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; margin-bottom: 2px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
            </div>
            <p style="font-size: 12.5px; font-weight: 600; color: var(--text-medium, var(--text-ink)); margin: 0;">Haz clic o arrastra tu logo</p>
            <p style="font-size: 11px; color: var(--text-faint); margin: 0;">PNG, JPG, SVG · Máx. 4 MB</p>
          </div>
        </div>
      </div>

      <!-- Industria -->
      <div>
        <label class="field-label">
          Industria <span style="font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--text-faint);">(opcional)</span>
        </label>
        <select
          v-model="form.industry"
          class="field-input"
          style="cursor: pointer;"
          @focus="(e) => { (e.target as HTMLSelectElement).style.borderColor='var(--amber)'; }"
          @blur="(e) => { (e.target as HTMLSelectElement).style.borderColor='var(--border)'; }"
        >
          <option value="">Seleccionar...</option>
          <option v-for="ind in industries" :key="ind" :value="ind">{{ ind }}</option>
        </select>
      </div>

      <!-- Teléfono -->
      <div>
        <label class="field-label">
          Teléfono <span style="font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--text-faint);">(opcional)</span>
        </label>
        <div style="display: flex; gap: 8px;">
          <select
            v-model="form.selectedCountry"
            class="field-input"
            style="flex-shrink: 0; width: auto; cursor: pointer; padding-left: 10px; padding-right: 10px;"
            @focus="(e) => { (e.target as HTMLSelectElement).style.borderColor='var(--amber)'; }"
            @blur="(e) => { (e.target as HTMLSelectElement).style.borderColor='var(--border)'; }"
          >
            <option v-for="c in countries" :key="c.code" :value="c">
              {{ c.flag }} {{ c.dial }}
            </option>
          </select>
          <input
            v-model="form.phoneNumber"
            type="tel"
            placeholder="55 0000 0000"
            class="field-input"
            style="flex: 1;"
            @focus="(e) => { (e.target as HTMLInputElement).style.borderColor='var(--amber)'; (e.target as HTMLInputElement).style.boxShadow='0 0 0 3px var(--amber-bg)'; }"
            @blur="(e) => { (e.target as HTMLInputElement).style.borderColor='var(--border)'; (e.target as HTMLInputElement).style.boxShadow='none'; }"
          />
        </div>
      </div>

      <!-- Error -->
      <div
        v-if="displayError"
        style="font-size: 12px; color: var(--danger); padding: 10px 12px; background: var(--danger-bg, rgba(239,68,68,.08)); border-radius: 8px;"
      >
        {{ displayError }}
      </div>

      <!-- Botones -->
      <div class="btn-row">
        <button
          v-if="showCancel"
          type="button"
          class="btn-cancel"
          :disabled="loading"
          @click="emit('cancel')"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="btn-submit"
          :class="{ full: !showCancel }"
          :disabled="loading || logoUploading"
          :style="(loading || logoUploading) ? 'opacity: 0.6; cursor: not-allowed;' : ''"
        >
          <svg v-if="loading" class="spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle style="opacity:.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path style="opacity:.75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          {{ loading ? 'Creando...' : submitLabel }}
          <svg v-if="!loading && !showCancel" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  </form>
</template>

<style scoped>
.field-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 7px;
}

.field-input {
  width: 100%;
  padding: 11px 13px;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: var(--bg-surface);
  font-size: 13px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: var(--text-ink);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
  appearance: auto;
}
.field-input::placeholder { color: var(--text-faint); }

.upload-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 20px;
  border-radius: 10px;
  border: 1.5px dashed var(--border);
  background: var(--bg-page);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.upload-zone:hover {
  border-color: var(--amber);
  background: var(--amber-bg, rgba(245,166,35,.06));
}

.btn-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.btn-cancel {
  padding: 11px 20px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-cancel:hover:not(:disabled) { background: var(--bg-page); }

.btn-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 20px;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-submit.full { width: 100%; }
.btn-submit:hover:not(:disabled) { background: var(--primary-mid, var(--primary)); }

.spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
