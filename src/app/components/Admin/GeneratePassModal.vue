<script setup lang="ts">
import { reactive, ref } from 'vue'
import { usePassStore } from '@/app/stores/pass/PassStore'
import { ApiError } from '@/infrastructure/http/ApiClient'

const props = defineProps<{ walletId: string; modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  generated: []
}>()

const passStore = usePassStore()
const loading = ref(false)
const error = ref('')

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

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dialCode: dialCodes[0],
})

function close() {
  form.firstName = ''
  form.lastName = ''
  form.email = ''
  form.phone = ''
  form.dialCode = dialCodes[0]
  error.value = ''
  emit('update:modelValue', false)
}

async function handleGenerate() {
  if (!form.firstName.trim() || !form.lastName.trim()) {
    error.value = 'Nombre y apellido son requeridos'
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
      style="position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(15,27,20,0.5);"
      @click.self="close"
    >
      <div style="background: #fff; border-radius: 16px; box-shadow: 0 20px 60px rgba(15,27,20,0.15); width: 100%; max-width: 400px; overflow: hidden;">

        <!-- Header -->
        <div style="padding: 18px 20px 16px; border-bottom: 1px solid #ECEFEB; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h3 style="font-size: 15px; font-weight: 700; color: #0F1B14; margin: 0;">Generar pase</h3>
            <p style="font-size: 11.5px; color: #6B7A72; margin: 2px 0 0;">Los datos del cliente para el pase digital</p>
          </div>
          <button
            style="width: 28px; height: 28px; border-radius: 8px; border: 1px solid #ECEFEB; background: #F7F4EF; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6B7A72; font-size: 16px; line-height: 1;"
            @click="close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Body -->
        <div style="padding: 20px; display: flex; flex-direction: column; gap: 14px;">

          <!-- Nombre + Apellido -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="display: block; font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">
                Nombre *
              </label>
              <input
                v-model="form.firstName"
                type="text"
                placeholder="Oscar"
                style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1.5px solid #ECEFEB; background: #F7F4EF; color: #0F1B14; font-size: 13px; outline: none; box-sizing: border-box; font-family: inherit;"
                @focus="(e) => { (e.target as HTMLInputElement).style.borderColor='#E8920A'; (e.target as HTMLInputElement).style.boxShadow='0 0 0 3px #FCEBC4'; }"
                @blur="(e) => { (e.target as HTMLInputElement).style.borderColor='#ECEFEB'; (e.target as HTMLInputElement).style.boxShadow='none'; }"
                @keyup.enter="handleGenerate"
              />
            </div>
            <div>
              <label style="display: block; font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">
                Apellido *
              </label>
              <input
                v-model="form.lastName"
                type="text"
                placeholder="Raygoza"
                style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1.5px solid #ECEFEB; background: #F7F4EF; color: #0F1B14; font-size: 13px; outline: none; box-sizing: border-box; font-family: inherit;"
                @focus="(e) => { (e.target as HTMLInputElement).style.borderColor='#E8920A'; (e.target as HTMLInputElement).style.boxShadow='0 0 0 3px #FCEBC4'; }"
                @blur="(e) => { (e.target as HTMLInputElement).style.borderColor='#ECEFEB'; (e.target as HTMLInputElement).style.boxShadow='none'; }"
                @keyup.enter="handleGenerate"
              />
            </div>
          </div>

          <!-- Email -->
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">
              Email <span style="font-weight: 400; text-transform: none; letter-spacing: 0; color: #A8B3AC;">(opcional)</span>
            </label>
            <input
              v-model="form.email"
              type="email"
              placeholder="oscar@ejemplo.com"
              style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1.5px solid #ECEFEB; background: #F7F4EF; color: #0F1B14; font-size: 13px; outline: none; box-sizing: border-box; font-family: inherit;"
              @focus="(e) => { (e.target as HTMLInputElement).style.borderColor='#E8920A'; (e.target as HTMLInputElement).style.boxShadow='0 0 0 3px #FCEBC4'; }"
              @blur="(e) => { (e.target as HTMLInputElement).style.borderColor='#ECEFEB'; (e.target as HTMLInputElement).style.boxShadow='none'; }"
              @keyup.enter="handleGenerate"
            />
          </div>

          <!-- Teléfono con selector de país -->
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">
              Teléfono <span style="font-weight: 400; text-transform: none; letter-spacing: 0; color: #A8B3AC;">(opcional)</span>
            </label>
            <div style="display: flex; gap: 8px;">
              <!-- Country dial selector -->
              <select
                v-model="form.dialCode"
                style="padding: 10px 8px; border-radius: 8px; border: 1.5px solid #ECEFEB; background: #F7F4EF; color: #0F1B14; font-size: 12px; font-weight: 600; outline: none; cursor: pointer; font-family: inherit; flex-shrink: 0;"
                @focus="(e) => { (e.target as HTMLSelectElement).style.borderColor='#E8920A'; }"
                @blur="(e) => { (e.target as HTMLSelectElement).style.borderColor='#ECEFEB'; }"
              >
                <option v-for="d in dialCodes" :key="d.code" :value="d">
                  {{ d.flag }} {{ d.dial }}
                </option>
              </select>
              <!-- Phone number -->
              <input
                v-model="form.phone"
                type="tel"
                placeholder="33 1234 5678"
                style="flex: 1; padding: 10px 12px; border-radius: 8px; border: 1.5px solid #ECEFEB; background: #F7F4EF; color: #0F1B14; font-size: 13px; outline: none; box-sizing: border-box; font-family: inherit;"
                @focus="(e) => { (e.target as HTMLInputElement).style.borderColor='#E8920A'; (e.target as HTMLInputElement).style.boxShadow='0 0 0 3px #FCEBC4'; }"
                @blur="(e) => { (e.target as HTMLInputElement).style.borderColor='#ECEFEB'; (e.target as HTMLInputElement).style.boxShadow='none'; }"
                @keyup.enter="handleGenerate"
              />
            </div>
          </div>

          <!-- Error -->
          <p v-if="error" style="font-size: 12px; color: #DC2626; padding: 8px 12px; background: #FEE2E2; border-radius: 8px; margin: 0;">
            {{ error }}
          </p>
        </div>

        <!-- Footer -->
        <div style="padding: 0 20px 20px; display: flex; gap: 10px;">
          <button
            style="flex: 1; padding: 11px 16px; border-radius: 9px; background: #fff; color: #6B7A72; font-size: 13px; font-weight: 600; border: 1.5px solid #ECEFEB; cursor: pointer; font-family: inherit; transition: background 0.12s;"
            @mouseenter="(e) => (e.currentTarget as HTMLButtonElement).style.background='#F7F4EF'"
            @mouseleave="(e) => (e.currentTarget as HTMLButtonElement).style.background='#fff'"
            @click="close"
          >
            Cancelar
          </button>
          <button
            :disabled="loading"
            style="flex: 1; padding: 11px 16px; border-radius: 9px; background: #1B4332; color: #fff; font-size: 13px; font-weight: 700; border: none; cursor: pointer; font-family: inherit; transition: background 0.15s, opacity 0.15s;"
            :style="loading ? 'opacity: 0.6; cursor: not-allowed;' : ''"
            @mouseenter="(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background='#2D6A4F' }"
            @mouseleave="(e) => (e.currentTarget as HTMLButtonElement).style.background='#1B4332'"
            @click="handleGenerate"
          >
            {{ loading ? 'Generando...' : 'Generar pase' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
