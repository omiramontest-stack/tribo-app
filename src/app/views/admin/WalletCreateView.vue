<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { walletTypeConfig, findWalletTypeConfig } from '@/app/config/walletTypeConfig'
import WalletRulesForm from '@/app/components/Wallet/WalletRulesForm.vue'
import StampsCard from '@/app/components/Wallet/StampsCard.vue'
import MembershipCard from '@/app/components/Wallet/MembershipCard.vue'
import PointsCard from '@/app/components/Wallet/PointsCard.vue'
import CashbackCard from '@/app/components/Wallet/CashbackCard.vue'
import DaypassCard from '@/app/components/Wallet/DaypassCard.vue'
import BundleCard from '@/app/components/Wallet/BundleCard.vue'
import GiftcardCard from '@/app/components/Wallet/GiftcardCard.vue'
import CouponCard from '@/app/components/Wallet/CouponCard.vue'
import type { CreateWalletDto } from '@/application/wallet/dto/CreateWalletDto'
import type { WalletType } from '@/domain/wallet/entities/Wallet'
import type { Pass } from '@/domain/pass/entities/Pass'

const router = useRouter()
const walletStore = useWalletStore()

const step = ref(1)
const loading = ref(false)
const uploadingLogo = ref(false)
const uploadError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY

const form = reactive<CreateWalletDto>({
  type: 'stamps',
  businessName: '',
  logoUrl: '',
  primaryColor: '#1B4332',
  accentColor: '#E8920A',
  description: '',
  rules: findWalletTypeConfig('stamps').defaultRules(),
})

watch(
  () => form.type,
  (type: WalletType) => { form.rules = findWalletTypeConfig(type).defaultRules() },
)

const previewPass: Pass = {
  id: 'preview',
  walletId: 'preview',
  token: 'preview',
  firstName: 'Juan',
  lastName: 'Pérez',
  phone: '',
  customerName: 'Juan Pérez',
  createdAt: new Date().toISOString(),
  data: { type: 'stamps', currentStamps: 3 },
}

function getPreviewPass(): Pass {
  return { ...previewPass, data: findWalletTypeConfig(form.type).previewData(form.rules) }
}

const steps = [
  { n: 1, label: 'Tipo' },
  { n: 2, label: 'Branding' },
  { n: 3, label: 'Reglas' },
  { n: 4, label: 'Vista previa' },
]

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function triggerUpload() {
  fileInput.value?.click()
}

async function handleLogoFile(file: File) {
  if (!file.type.startsWith('image/')) { uploadError.value = 'Solo se permiten imágenes'; return }
  if (file.size > 4 * 1024 * 1024) { uploadError.value = 'La imagen debe pesar menos de 4 MB'; return }
  uploadError.value = ''
  uploadingLogo.value = true
  try {
    const base64 = await fileToBase64(file)
    const body = new FormData()
    body.append('key', IMGBB_API_KEY)
    body.append('image', base64)
    const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body })
    if (!res.ok) throw new Error()
    const data = await res.json()
    form.logoUrl = data.data.url as string
  } catch {
    uploadError.value = 'No se pudo subir la imagen'
  } finally {
    uploadingLogo.value = false
  }
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleLogoFile(file)
}

function onDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file) handleLogoFile(file)
}

async function handleSubmit() {
  try {
    loading.value = true
    await walletStore.createWallet(form)
    router.push({ name: 'Wallets' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 20px;">

    <!-- Header -->
    <div style="display: flex; align-items: center; gap: 12px;">
      <button class="btn-back-nav" @click="router.back()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Volver
      </button>
    </div>

    <!-- Step indicator -->
    <div style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 18px 20px;">
      <div style="display: flex; align-items: center;">
        <template v-for="(s, i) in steps" :key="s.n">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0;">
            <div
              class="step-bubble"
              :class="{
                'step-bubble--done': step > s.n,
                'step-bubble--active': step === s.n,
              }"
            >
              <svg v-if="step > s.n" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              <span v-else>{{ s.n }}</span>
            </div>
            <span
              class="step-label"
              :class="step === s.n ? 'step-label--active' : 'step-label--inactive'"
            >
              {{ s.label }}
            </span>
          </div>
          <div
            v-if="i < steps.length - 1"
            class="step-connector"
            :class="{ 'step-connector--done': step > s.n }"
          />
        </template>
      </div>
    </div>

    <!-- ── Step 1: Tipo ─────────────────────────────────────── -->
    <div v-if="step === 1" style="display: flex; flex-direction: column; gap: 14px;">
      <div style="font-size: 13px; font-weight: 700; color: #0F1B14;">
        ¿Qué tipo de wallet quieres crear?
      </div>

      <div class="type-grid">
        <button
          v-for="wt in walletTypeConfig"
          :key="wt.value"
          class="type-card"
          :class="{ 'type-card--selected': form.type === wt.value }"
          @click="form.type = wt.value"
        >
          <div class="type-icon" :style="{ background: wt.iconBg }">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" :stroke="wt.iconColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path :d="wt.iconPath"/>
            </svg>
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #0F1B14; margin-bottom: 3px; text-align: left;">{{ wt.label }}</div>
          <div style="font-size: 11.5px; color: #6B7A72; line-height: 1.4; text-align: left;">{{ wt.desc }}</div>

          <div v-if="form.type === wt.value" class="type-check">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
        </button>
      </div>

      <button class="btn-primary" @click="step = 2">
        Continuar
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>

    <!-- ── Step 2: Branding ────────────────────────────────── -->
    <div v-if="step === 2" style="display: flex; flex-direction: column; gap: 14px;">
      <div style="font-size: 13px; font-weight: 700; color: #0F1B14;">Personaliza tu wallet</div>

      <div style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;" class="form-grid">
        <div style="grid-column: 1 / -1;">
          <label class="field-label">Nombre del negocio *</label>
          <input
            v-model="form.businessName"
            type="text"
            placeholder="Ej. Cucara Macara Espresso"
            class="field-input"
          />
        </div>

        <!-- Logo upload -->
        <div style="grid-column: 1 / -1;">
          <label class="field-label">Logo <span class="field-label-hint">(opcional)</span></label>

          <input ref="fileInput" type="file" accept="image/*" style="display: none;" @change="onFileChange" />

          <!-- Preview state -->
          <div v-if="form.logoUrl && !uploadingLogo" style="display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 10px; border: 1.5px solid #ECEFEB; background: #fff;">
            <img :src="form.logoUrl" alt="Logo" style="width: 48px; height: 48px; border-radius: 8px; object-fit: contain; background: #F7F4EF; padding: 4px;" />
            <div style="flex: 1; min-width: 0;">
              <p style="font-size: 12px; font-weight: 600; color: #0F1B14; margin-bottom: 2px;">Logo cargado</p>
              <p style="font-size: 11px; color: #A8B3AC; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ form.logoUrl }}</p>
            </div>
            <button
              type="button"
              style="font-size: 11px; font-weight: 600; color: #6B7A72; background: #F7F4EF; border: 1px solid #ECEFEB; border-radius: 7px; padding: 5px 10px; cursor: pointer; white-space: nowrap; flex-shrink: 0;"
              @click="form.logoUrl = ''"
            >
              Cambiar
            </button>
          </div>

          <!-- Upload zone -->
          <div
            v-else
            class="upload-zone"
            :class="{ 'upload-zone--disabled': uploadingLogo }"
            @click="triggerUpload"
            @dragover.prevent
            @drop.prevent="onDrop"
          >
            <div v-if="uploadingLogo" style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8B3AC" stroke-width="1.8" stroke-linecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              <p style="font-size: 12px; color: #A8B3AC; font-weight: 500;">Subiendo imagen...</p>
            </div>
            <div v-else style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: #EFEAE0; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7A72" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
              </div>
              <p style="font-size: 13px; font-weight: 600; color: #3A4A41;">Haz clic o arrastra una imagen</p>
              <p style="font-size: 11px; color: #A8B3AC;">PNG, JPG, SVG · Máx. 4 MB</p>
            </div>
          </div>

          <p v-if="uploadError" style="font-size: 11px; color: #DC2626; margin-top: 5px;">{{ uploadError }}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; grid-column: 1 / -1;">
          <div>
            <label class="field-label">Color principal</label>
            <div class="color-picker-row">
              <input v-model="form.primaryColor" type="color" class="color-swatch" />
              <span class="color-hex">{{ form.primaryColor }}</span>
            </div>
          </div>
          <div>
            <label class="field-label">Color acento</label>
            <div class="color-picker-row">
              <input v-model="form.accentColor" type="color" class="color-swatch" />
              <span class="color-hex">{{ form.accentColor }}</span>
            </div>
          </div>
        </div>

        <div style="grid-column: 1 / -1;">
          <label class="field-label">Descripción <span class="field-label-hint">(opcional)</span></label>
          <textarea
            v-model="form.description"
            rows="2"
            placeholder="Descripción breve del programa..."
            class="field-input"
            style="resize: none;"
          />
        </div>
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn-back" @click="step = 1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Atrás
        </button>
        <button class="btn-primary" :disabled="!form.businessName" @click="step = 3">
          Continuar
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>

    <!-- ── Step 3: Reglas ──────────────────────────────────── -->
    <div v-if="step === 3" style="display: flex; flex-direction: column; gap: 14px;">
      <div style="font-size: 13px; font-weight: 700; color: #0F1B14;">Configura las reglas</div>

      <div style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 16px;">
        <WalletRulesForm :type="form.type" :rules="form.rules" />
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn-back" @click="step = 2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Atrás
        </button>
        <button class="btn-primary" @click="step = 4">
          Vista previa
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>

    <!-- ── Step 4: Vista previa ────────────────────────────── -->
    <div v-if="step === 4" style="display: flex; flex-direction: column; gap: 14px;">
      <div style="font-size: 13px; font-weight: 700; color: #0F1B14;">Vista previa del pase</div>

      <div style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 28px; display: flex; justify-content: center;">
        <StampsCard     v-if="form.type === 'stamps'"     :pass="getPreviewPass()" :wallet="(form as any)" />
        <MembershipCard v-else-if="form.type === 'membership'" :pass="getPreviewPass()" :wallet="(form as any)" />
        <PointsCard     v-else-if="form.type === 'points'"    :pass="getPreviewPass()" :wallet="(form as any)" />
        <CashbackCard   v-else-if="form.type === 'cashback'"  :pass="getPreviewPass()" :wallet="(form as any)" />
        <DaypassCard    v-else-if="form.type === 'daypass'"   :pass="getPreviewPass()" :wallet="(form as any)" />
        <BundleCard     v-else-if="form.type === 'bundle'"    :pass="getPreviewPass()" :wallet="(form as any)" />
        <GiftcardCard   v-else-if="form.type === 'giftcard'"  :pass="getPreviewPass()" :wallet="(form as any)" />
        <CouponCard     v-else-if="form.type === 'coupon'"    :pass="getPreviewPass()" :wallet="(form as any)" />
      </div>

      <!-- Summary pill -->
      <div style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #E6EFE9; border-radius: 10px; border: 1px solid #C6D9CC;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
        <span style="font-size: 12px; color: #2D6A4F; font-weight: 600;">
          {{ form.businessName }} · {{ findWalletTypeConfig(form.type).label }}
        </span>
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn-back" @click="step = 3">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Atrás
        </button>
        <button class="btn-primary" :disabled="loading" @click="handleSubmit">
          <svg v-if="!loading" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>
          {{ loading ? 'Guardando...' : 'Crear wallet' }}
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.type-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}
@media (max-width: 900px) { .type-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 560px) { .type-grid { grid-template-columns: repeat(2, 1fr); } }

.type-card {
  position: relative;
  padding: 16px;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  border: 1.5px solid #ECEFEB;
  background: #fff;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}
.type-card:hover { box-shadow: 0 2px 8px rgba(15,27,20,0.06); }
.type-card--selected { border: 2px solid #1B4332; background: #E6EFE9; }

.type-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-bottom: 10px;
}

.type-check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #1B4332;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-bubble {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.2s;
  background: #ECEFEB;
  color: #6B7A72;
}
.step-bubble--done    { background: #1B4332; color: #fff; }
.step-bubble--active  { background: #E8920A; color: #fff; }

.step-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
.step-label--active   { color: #0F1B14; }
.step-label--inactive { color: #A8B3AC; }

.step-connector {
  flex: 1;
  height: 2px;
  margin: 0 6px;
  margin-bottom: 22px;
  border-radius: 2px;
  background: #ECEFEB;
  transition: background 0.2s;
}
.step-connector--done { background: #1B4332; }

@media (max-width: 480px) { .step-label { display: none; } }

.form-grid { grid-template-columns: 1fr 1fr; }
@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr !important; }
  .form-grid > * { grid-column: 1 / -1 !important; }
}

.field-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #6B7A72;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 7px;
}
.field-label-hint {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: #A8B3AC;
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
}
.field-input::placeholder { color: #A8B3AC; }
.field-input:focus {
  border-color: #E8920A;
  box-shadow: 0 0 0 3px #FCEBC4;
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 9px;
  border: 1.5px solid #ECEFEB;
  background: #fff;
}
.color-swatch {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  padding: 0;
  background: none;
}
.color-hex {
  font-size: 12px;
  color: #3A4A41;
  font-family: monospace;
  font-weight: 600;
}

.upload-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 20px;
  border-radius: 10px;
  border: 1.5px dashed #D8DDD7;
  background: #F7F4EF;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.upload-zone:hover    { border-color: #E8920A; background: #FCEBC4; }
.upload-zone--disabled { pointer-events: none; opacity: 0.6; }

.btn-back-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #6B7A72;
  background: none;
  border: none;
  cursor: pointer;
}

.btn-primary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 12px 18px;
  border-radius: 10px;
  background: #1B4332;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  border: none;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.btn-primary:hover:not(:disabled) { background: #2D6A4F; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-back {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 18px;
  border-radius: 10px;
  background: #fff;
  color: #6B7A72;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  border: 1.5px solid #ECEFEB;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.btn-back:hover { background: #F7F4EF; color: #0F1B14; }
</style>
