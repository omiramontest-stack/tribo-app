<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import { useAuthStore } from '@/app/stores/auth/AuthStore'

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY

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

const router = useRouter()
const orgStore = useOrganizationStore()
const authStore = useAuthStore()

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

const logoPreview  = ref<string>('')
const logoUrl      = ref<string>('')
const logoUploading = ref(false)
const fileInputRef  = ref<HTMLInputElement | null>(null)
const loading  = ref(false)
const error    = ref('')

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

function removeLogo() {
  logoPreview.value = ''
  logoUrl.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const fullPhone = computed(() =>
  form.phoneNumber ? `${form.selectedCountry.dial}${form.phoneNumber.replace(/^0+/, '')}` : '',
)

async function handleSubmit() {
  if (!form.organizationName.trim()) {
    error.value = 'El nombre de la organización es requerido'
    return
  }
  try {
    loading.value = true
    error.value = ''
    await orgStore.onboarding({
      organizationName: form.organizationName.trim(),
      industry: form.industry || undefined,
      country: form.selectedCountry.name,
      phone: fullPhone.value || undefined,
      logoUrl: logoUrl.value || undefined,
    })
    // Refresca la sesión para que el guard reciba el JWT con contexto de org
    // que el backend emitió en /auth/onboarding, igual que haría un F5
    router.push({ name: 'Dashboard' })
  } catch {
    error.value = 'Ocurrió un error al crear la organización'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div style="min-height: 100vh; background: #1B4332; display: flex; align-items: center; justify-content: center; padding: 24px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif;">
    <div style="width: 100%; max-width: 480px;">

      <!-- Logo -->
      <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 32px;">
        <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
          <line x1="10" y1="28" x2="30" y2="28" stroke="#E8920A" stroke-width="2"/>
          <line x1="10" y1="28" x2="20" y2="10" stroke="#E8920A" stroke-width="2"/>
          <line x1="20" y1="10" x2="30" y2="28" stroke="#E8920A" stroke-width="2"/>
          <circle cx="20" cy="10" r="3.5" fill="#E8920A"/>
          <circle cx="10" cy="28" r="3.5" fill="#E8920A"/>
          <circle cx="30" cy="28" r="3.5" fill="#E8920A"/>
        </svg>
        <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: #fff; font-family: 'Syne', sans-serif; line-height: 1;">
          trib<span style="color: #E8920A;">o</span>
        </span>
      </div>

      <!-- Card -->
      <div style="background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2);">

        <!-- Top accent -->
        <div style="height: 3px; background: linear-gradient(90deg, #1B4332, #E8920A);" />

        <div style="padding: 28px 28px 32px;">

          <!-- Heading -->
          <div style="margin-bottom: 24px;">
            <h1 style="font-size: 20px; font-weight: 800; color: #0F1B14; margin: 0 0 6px; letter-spacing: -0.01em;">
              Crea tu organización
            </h1>
            <p style="font-size: 13px; color: #6B7A72; margin: 0; line-height: 1.5;">
              Podrás cambiar estos datos después en configuración.
            </p>
          </div>

          <!-- Fields -->
          <div style="display: flex; flex-direction: column; gap: 16px;">

            <!-- Nombre -->
            <div>
              <label class="field-label">
                Nombre del negocio <span style="color: #DC2626;">*</span>
              </label>
              <input
                v-model="form.organizationName"
                type="text"
                placeholder="Ej. Café La Estrella"
                class="field-input"
                @focus="(e) => { (e.target as HTMLInputElement).style.borderColor='#E8920A'; (e.target as HTMLInputElement).style.boxShadow='0 0 0 3px #FCEBC4'; }"
                @blur="(e) => { (e.target as HTMLInputElement).style.borderColor='#ECEFEB'; (e.target as HTMLInputElement).style.boxShadow='none'; }"
                @keyup.enter="handleSubmit"
              />
            </div>

            <!-- Logo upload -->
            <div>
              <label class="field-label">
                Logo <span style="font-weight: 400; text-transform: none; letter-spacing: 0; color: #A8B3AC;">(opcional)</span>
              </label>
              <input ref="fileInputRef" type="file" accept="image/*" style="display: none;" @change="handleLogoChange" />

              <!-- Preview -->
              <div v-if="logoPreview && !logoUploading" style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #ECEFEB; background: #fff;">
                <img :src="logoPreview" alt="Logo" style="width: 44px; height: 44px; border-radius: 8px; object-fit: contain; background: #F7F4EF; padding: 4px; flex-shrink: 0;" />
                <div style="flex: 1; min-width: 0;">
                  <p style="font-size: 12px; font-weight: 600; color: #0F1B14; margin: 0 0 2px;">Logo cargado</p>
                  <p style="font-size: 11px; color: #A8B3AC; margin: 0;">Listo para usar</p>
                </div>
                <button
                  type="button"
                  style="font-size: 11px; font-weight: 600; color: #6B7A72; background: #F7F4EF; border: 1px solid #ECEFEB; border-radius: 7px; padding: 5px 10px; cursor: pointer; white-space: nowrap;"
                  @click="removeLogo"
                >
                  Cambiar
                </button>
              </div>

              <!-- Upload zone -->
              <div
                v-else
                class="upload-zone"
                :style="logoUploading ? 'opacity: 0.6; pointer-events: none;' : ''"
                @click="fileInputRef?.click()"
                @dragover.prevent
                @drop.prevent="(e) => { const f = e.dataTransfer?.files?.[0]; if(f) { const ev = { target: { files: [f] } } as any; handleLogoChange(ev); } }"
              >
                <div v-if="logoUploading" style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A8B3AC" stroke-width="1.8" stroke-linecap="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  <p style="font-size: 12px; color: #A8B3AC; font-weight: 500; margin: 0;">Subiendo logo...</p>
                </div>
                <div v-else style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <div style="width: 32px; height: 32px; border-radius: 9px; background: #EFEAE0; display: flex; align-items: center; justify-content: center; margin-bottom: 2px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7A72" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                    </svg>
                  </div>
                  <p style="font-size: 12.5px; font-weight: 600; color: #3A4A41; margin: 0;">Haz clic o arrastra tu logo</p>
                  <p style="font-size: 11px; color: #A8B3AC; margin: 0;">PNG, JPG, SVG · Máx. 4 MB</p>
                </div>
              </div>
            </div>

            <!-- Industria -->
            <div>
              <label class="field-label">Industria <span style="font-weight: 400; text-transform: none; letter-spacing: 0; color: #A8B3AC;">(opcional)</span></label>
              <select
                v-model="form.industry"
                class="field-input"
                style="cursor: pointer;"
                @focus="(e) => { (e.target as HTMLSelectElement).style.borderColor='#E8920A'; }"
                @blur="(e) => { (e.target as HTMLSelectElement).style.borderColor='#ECEFEB'; }"
              >
                <option value="">Seleccionar...</option>
                <option v-for="ind in industries" :key="ind" :value="ind">{{ ind }}</option>
              </select>
            </div>

            <!-- País + Teléfono -->
            <div>
              <label class="field-label">Teléfono <span style="font-weight: 400; text-transform: none; letter-spacing: 0; color: #A8B3AC;">(opcional)</span></label>
              <div style="display: flex; gap: 8px;">
                <select
                  v-model="form.selectedCountry"
                  class="field-input"
                  style="flex-shrink: 0; width: auto; cursor: pointer; padding-left: 10px; padding-right: 10px;"
                  @focus="(e) => { (e.target as HTMLSelectElement).style.borderColor='#E8920A'; }"
                  @blur="(e) => { (e.target as HTMLSelectElement).style.borderColor='#ECEFEB'; }"
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
                  @focus="(e) => { (e.target as HTMLInputElement).style.borderColor='#E8920A'; (e.target as HTMLInputElement).style.boxShadow='0 0 0 3px #FCEBC4'; }"
                  @blur="(e) => { (e.target as HTMLInputElement).style.borderColor='#ECEFEB'; (e.target as HTMLInputElement).style.boxShadow='none'; }"
                />
              </div>
            </div>

            <!-- Error -->
            <div v-if="error" style="font-size: 12px; color: #DC2626; padding: 10px 12px; background: #FEE2E2; border-radius: 8px;">
              {{ error }}
            </div>

            <!-- Submit -->
            <button
              :disabled="loading"
              class="btn-submit"
              :style="loading ? 'opacity: 0.6; cursor: not-allowed;' : ''"
              @click="handleSubmit"
            >
              {{ loading ? 'Creando organización...' : 'Continuar al dashboard' }}
              <svg v-if="!loading" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <p style="text-align: center; margin-top: 20px; font-size: 11px; color: rgba(255,255,255,0.4); line-height: 1.5;">
        Al continuar aceptas nuestros
        <a href="#" style="color: rgba(255,255,255,0.7); text-decoration: none; font-weight: 600;">Términos</a>
        y
        <a href="#" style="color: rgba(255,255,255,0.7); text-decoration: none; font-weight: 600;">Privacidad</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.field-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #6B7A72;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 7px;
}
.field-input {
  width: 100%;
  padding: 11px 13px;
  border-radius: 9px;
  border: 1.5px solid #ECEFEB;
  background: #fff;
  font-size: 13px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: #0F1B14;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
  appearance: auto;
}
.field-input::placeholder { color: #A8B3AC; }

.upload-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 20px;
  border-radius: 10px;
  border: 1.5px dashed #D8DDD7;
  background: #F7F4EF;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.upload-zone:hover {
  border-color: #E8920A;
  background: #FCEBC4;
}

.btn-submit {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 16px;
  border-radius: 10px;
  background: #1B4332;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
  margin-top: 4px;
}
.btn-submit:hover:not(:disabled) { background: #2D6A4F; }
</style>
