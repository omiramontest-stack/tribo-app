<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { usePassStore } from '@/app/stores/pass/PassStore'
import { ApiError } from '@/infrastructure/http/ApiClient'

const props = defineProps<{ walletId: string; walletType: string; modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  generated: []
}>()

const passStore = usePassStore()
const loading = ref(false)
const error = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const photoUploading = ref(false)
const photoPreview = ref<string | null>(null)

const isMembership = computed(() => props.walletType === 'membership')

const dialCodes = [
  { flag: '🇲🇽', code: 'MX', dial: '+52' },
  { flag: '🇺🇸', code: 'US', dial: '+1' },
  { flag: '🇨🇦', code: 'CA', dial: '+1' },
  { flag: '🇦🇷', code: 'AR', dial: '+54' },
  { flag: '🇧🇷', code: 'BR', dial: '+55' },
  { flag: '🇨🇱', code: 'CL', dial: '+56' },
  { flag: '🇨🇴', code: 'CO', dial: '+57' },
  { flag: '🇵🇪', code: 'PE', dial: '+51' },
  { flag: '🇻🇪', code: 'VE', dial: '+58' },
  { flag: '🇪🇨', code: 'EC', dial: '+593' },
  { flag: '🇬🇹', code: 'GT', dial: '+502' },
  { flag: '🇨🇷', code: 'CR', dial: '+506' },
  { flag: '🇵🇦', code: 'PA', dial: '+507' },
  { flag: '🇩🇴', code: 'DO', dial: '+1809' },
  { flag: '🇪🇸', code: 'ES', dial: '+34' },
]

const INITIAL_FORM = { firstName: '', lastName: '', email: '', phone: '', photoUrl: '' }
const form = reactive({ ...INITIAL_FORM, dialCode: dialCodes[0] })

function close() {
  Object.assign(form, INITIAL_FORM)
  form.dialCode = dialCodes[0]
  error.value = ''
  photoPreview.value = null
  emit('update:modelValue', false)
}

async function uploadToImgbb(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('image', file)
  const res = await fetch(
    `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`,
    { method: 'POST', body: fd },
  )
  if (!res.ok) throw new Error('upload_failed')
  const json = await res.json()
  return json.data.url as string
}

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!fileInputRef.value) return
  fileInputRef.value.value = ''
  if (!file) return

  photoUploading.value = true
  error.value = ''
  try {
    form.photoUrl = await uploadToImgbb(file)
    photoPreview.value = form.photoUrl
  } catch {
    error.value = 'No se pudo subir la foto. Intenta de nuevo.'
  } finally {
    photoUploading.value = false
  }
}

function removePhoto() {
  form.photoUrl = ''
  photoPreview.value = null
}

async function handleGenerate() {
  if (!form.firstName.trim() || !form.lastName.trim()) {
    error.value = 'Nombre y apellido son requeridos'
    return
  }
  if (isMembership.value && !form.photoUrl) {
    error.value = 'La foto del cliente es requerida para membresías'
    return
  }
  try {
    loading.value = true
    error.value = ''
    const fullPhone = form.phone.trim()
      ? `${form.dialCode.dial}${form.phone.trim().replace(/^0+/, '')}`
      : ''
    await passStore.generatePass({
      walletId: props.walletId,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      phone: fullPhone,
      photoUrl: form.photoUrl || undefined,
    })
    emit('generated')
    close()
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) { close(); return }
    error.value = 'Error al generar el pase'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      style="position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; background: var(--overlay);"
      @click.self="close"
    >
      <div style="background: var(--bg-surface); border-radius: 16px; box-shadow: 0 20px 60px var(--shadow-card); width: 100%; max-width: 400px; overflow: hidden;">

        <!-- Header -->
        <div style="padding: 18px 20px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h3 style="font-size: 15px; font-weight: 700; color: var(--text-ink); margin: 0;">Generar pase</h3>
            <p style="font-size: 11.5px; color: var(--text-muted); margin: 2px 0 0;">Los datos del cliente para el pase digital</p>
          </div>
          <button
            style="width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-page); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); font-size: 16px; line-height: 1;"
            @click="close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Body -->
        <div style="padding: 20px; display: flex; flex-direction: column; gap: 14px;">

          <!-- Photo upload — membership only -->
          <div v-if="isMembership">
            <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px;">
              Foto del cliente *
            </label>

            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              style="display: none;"
              @change="onFileChange"
            />

            <div class="photo-area" @click="!photoUploading && fileInputRef?.click()">
              <!-- Uploading spinner -->
              <div v-if="photoUploading" class="photo-state">
                <svg class="photo-spinner" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2.2" stroke-linecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                <span style="font-size: 12px; color: var(--text-muted);">Subiendo…</span>
              </div>

              <!-- Preview -->
              <div v-else-if="photoPreview" class="photo-preview-wrap">
                <img :src="photoPreview" class="photo-preview-img" alt="Foto del cliente" />
                <button class="photo-remove" @click.stop="removePhoto">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <!-- Empty placeholder -->
              <div v-else class="photo-state">
                <div class="photo-avatar-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </div>
                <span style="font-size: 12px; color: var(--text-muted); font-weight: 500;">Subir foto</span>
                <span style="font-size: 11px; color: var(--text-faint);">JPG, PNG · máx 5 MB</span>
              </div>
            </div>
          </div>

          <!-- Nombre + Apellido -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">
                Nombre *
              </label>
              <input
                v-model="form.firstName"
                type="text"
                placeholder="Oscar"
                class="form-input"
                @keyup.enter="handleGenerate"
              />
            </div>
            <div>
              <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">
                Apellido *
              </label>
              <input
                v-model="form.lastName"
                type="text"
                placeholder="Raygoza"
                class="form-input"
                @keyup.enter="handleGenerate"
              />
            </div>
          </div>

          <!-- Email -->
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">
              Email <span style="font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--text-faint);">(opcional)</span>
            </label>
            <input
              v-model="form.email"
              type="email"
              placeholder="oscar@ejemplo.com"
              style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--bg-field); color: var(--text-ink); font-size: 13px; outline: none; box-sizing: border-box; font-family: inherit;"
              @focus="(e) => { (e.target as HTMLInputElement).style.borderColor='var(--amber)'; (e.target as HTMLInputElement).style.boxShadow='0 0 0 3px var(--amber-bg)'; }"
              @blur="(e) => { (e.target as HTMLInputElement).style.borderColor='var(--border)'; (e.target as HTMLInputElement).style.boxShadow='none'; }"
              @keyup.enter="handleGenerate"
            />
          </div>

          <!-- Teléfono con selector de país -->
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">
              Teléfono <span style="font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--text-faint);">(opcional)</span>
            </label>
            <div style="display: flex; gap: 8px;">
              <select v-model="form.dialCode" class="form-input form-select">
                <option v-for="d in dialCodes" :key="d.code" :value="d">
                  {{ d.flag }} {{ d.dial }}
                </option>
              </select>
              <input
                v-model="form.phone"
                type="tel"
                placeholder="33 1234 5678"
                style="flex: 1; padding: 10px 12px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--bg-field); color: var(--text-ink); font-size: 13px; outline: none; box-sizing: border-box; font-family: inherit;"
                @focus="(e) => { (e.target as HTMLInputElement).style.borderColor='var(--amber)'; (e.target as HTMLInputElement).style.boxShadow='0 0 0 3px var(--amber-bg)'; }"
                @blur="(e) => { (e.target as HTMLInputElement).style.borderColor='var(--border)'; (e.target as HTMLInputElement).style.boxShadow='none'; }"
                @keyup.enter="handleGenerate"
              />
            </div>
          </div>

          <!-- Error -->
          <p v-if="error" style="font-size: 12px; color: var(--danger); padding: 8px 12px; background: var(--danger-bg); border-radius: 8px; margin: 0;">
            {{ error }}
          </p>
        </div>

        <!-- Footer -->
        <div style="padding: 0 20px 20px; display: flex; gap: 10px;">
          <button class="btn-cancel" @click="close">Cancelar</button>
          <button
            class="btn-submit"
            :class="{ 'btn-submit--loading': loading }"
            :disabled="loading || photoUploading"
            @click="handleGenerate"
          >
            {{ loading ? 'Generando...' : 'Generar pase' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.form-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--bg-field);
  color: var(--text-ink);
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.form-input:focus {
  border-color: var(--amber);
  box-shadow: 0 0 0 3px var(--amber-bg);
}
.form-input::placeholder { color: var(--text-faint); }

.form-select {
  width: auto;
  min-width: 96px;
  cursor: pointer;
}

/* ── Photo upload area ── */
.photo-area {
  border: 1.5px dashed var(--border);
  border-radius: 12px;
  background: var(--bg-field);
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s, background 0.15s;
  min-height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.photo-area:hover { border-color: var(--amber); background: var(--amber-bg); }

.photo-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px;
}

.photo-avatar-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--bg-subtle);
  display: grid;
  place-items: center;
  margin-bottom: 2px;
}

.photo-preview-wrap {
  position: relative;
  width: 100%;
}
.photo-preview-img {
  width: 100%;
  max-height: 180px;
  object-fit: cover;
  display: block;
}
.photo-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0,0,0,0.55);
  border: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  color: #fff;
  transition: background 0.12s;
}
.photo-remove:hover { background: rgba(0,0,0,0.8); }

@keyframes spin { to { transform: rotate(360deg); } }
.photo-spinner { animation: spin 0.9s linear infinite; }

/* ── Buttons ── */
.btn-cancel {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--bg-field);
  color: var(--text-medium);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;
}
.btn-cancel:hover { background: var(--bg-subtle); }

.btn-submit {
  flex: 2;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: var(--amber);
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s, opacity 0.12s;
}
.btn-submit:hover:not(:disabled) { background: #D4820A; }
.btn-submit:disabled { opacity: 0.6; cursor: default; }
</style>
