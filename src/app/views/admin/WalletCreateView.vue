<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { walletTypeConfig, findWalletTypeConfig } from '@/app/config/walletTypeConfig'
import { useImgbbUpload } from '@/app/composables/useImgbbUpload'
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

const router    = useRouter()
const walletStore = useWalletStore()

const step    = ref(1)
const loading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const { uploading: uploadingLogo, error: uploadError, upload: uploadImage } = useImgbbUpload()

const form = reactive<CreateWalletDto>({
  type: 'stamps',
  businessName: '',
  logoUrl: '',
  primaryColor: '#1B3A2D',
  accentColor: '#F5A623',
  description: '',
  businessRules: '',
  rules: findWalletTypeConfig('stamps').defaultRules(),
})

watch(
  () => form.type,
  (type: WalletType) => { form.rules = findWalletTypeConfig(type).defaultRules() },
)

const selectedWt = computed(() => findWalletTypeConfig(form.type))

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

async function handleLogoFile(file: File) {
  const url = await uploadImage(file)
  if (url) form.logoUrl = url
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
    await walletStore.createWallet({
      ...form,
      businessRules: form.businessRules?.trim() || null,
    })
    router.push({ name: 'Wallets' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="create-page">

    <!-- Back nav -->
    <button class="btn-back-nav" @click="router.back()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
      Volver
    </button>

    <!-- Step indicator -->
    <div class="step-bar">
      <template v-for="(s, i) in steps" :key="s.n">
        <div class="step-item">
          <div
            class="step-bubble"
            :class="{
              'step-bubble--done': step > s.n,
              'step-bubble--active': step === s.n,
            }"
          >
            <svg v-if="step > s.n" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <span v-else>{{ s.n }}</span>
          </div>
          <span class="step-label" :class="step === s.n ? 'step-label--active' : 'step-label--idle'">
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

    <!-- Selected type context chip (steps 2-4) -->
    <Transition name="chip">
      <div v-if="step > 1" class="type-context-chip">
        <div class="chip-icon" :style="{ background: selectedWt.iconBg }">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke-width="1.8"
               stroke-linecap="round" stroke-linejoin="round" :stroke="selectedWt.iconColor">
            <path :d="selectedWt.iconPath" />
          </svg>
        </div>
        <span class="chip-label">{{ selectedWt.label }}</span>
        <button class="chip-change" @click="step = 1">Cambiar</button>
      </div>
    </Transition>

    <!-- ── Step 1: Tipo ─────────────────────────────────────── -->
    <div v-if="step === 1" class="step-content">
      <div class="step-heading">
        <h2 class="step-title">¿Qué tipo de wallet quieres crear?</h2>
        <p class="step-subtitle">Cada tipo genera un pase digital distinto para tus clientes.</p>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round" :stroke="wt.iconColor">
              <path :d="wt.iconPath"/>
            </svg>
          </div>
          <p class="type-name">{{ wt.label }}</p>
          <p class="type-desc">{{ wt.desc }}</p>

          <span v-if="form.type === wt.value" class="type-check">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </span>
        </button>
      </div>

      <div class="step-actions">
        <button class="btn-primary" @click="step = 2">
          Continuar
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ── Step 2: Branding ────────────────────────────────── -->
    <div v-if="step === 2" class="step-content">
      <div class="step-heading">
        <h2 class="step-title">Personaliza tu wallet</h2>
        <p class="step-subtitle">Nombre, logo y colores que aparecerán en el pase del cliente.</p>
      </div>

      <div class="form-card">
        <div class="form-grid">
          <!-- Business name -->
          <div class="field full-span">
            <label class="field-label">Nombre del negocio <span class="required">*</span></label>
            <input
              v-model="form.businessName"
              type="text"
              placeholder="Ej. Cucara Macara Espresso"
              class="field-input"
            />
          </div>

          <!-- Logo upload -->
          <div class="field full-span">
            <label class="field-label">Logo <span class="field-label-hint">(opcional)</span></label>
            <input ref="fileInput" type="file" accept="image/*" style="display: none;" @change="onFileChange" />

            <div v-if="form.logoUrl && !uploadingLogo" class="image-preview-row">
              <img :src="form.logoUrl" alt="Logo" class="image-thumb-square" />
              <div class="image-preview-info">
                <p class="image-preview-title">Logo cargado</p>
                <p class="image-preview-url">{{ form.logoUrl }}</p>
              </div>
              <button type="button" class="btn-change" @click="form.logoUrl = ''">Cambiar</button>
            </div>

            <div
              v-else
              class="upload-zone"
              :class="{ 'upload-zone--disabled': uploadingLogo }"
              @click="fileInput?.click()"
              @dragover.prevent
              @drop.prevent="onDrop"
            >
              <div v-if="uploadingLogo" class="upload-state">
                <svg class="spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="1.8" stroke-linecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                <p class="upload-label">Subiendo imagen...</p>
              </div>
              <div v-else class="upload-state">
                <div class="upload-icon-wrap">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                </div>
                <p class="upload-title">Haz clic o arrastra una imagen</p>
                <p class="upload-label">PNG, JPG, SVG · Máx. 4 MB</p>
              </div>
            </div>

            <p v-if="uploadError" class="field-error">{{ uploadError }}</p>
          </div>

          <!-- Colors -->
          <div class="field">
            <label class="field-label">Color principal</label>
            <div class="color-picker-row">
              <input v-model="form.primaryColor" type="color" class="color-swatch" />
              <span class="color-hex">{{ form.primaryColor }}</span>
              <span class="color-preview" :style="{ background: form.primaryColor }" />
            </div>
          </div>
          <div class="field">
            <label class="field-label">Color acento</label>
            <div class="color-picker-row">
              <input v-model="form.accentColor" type="color" class="color-swatch" />
              <span class="color-hex">{{ form.accentColor }}</span>
              <span class="color-preview accent" :style="{ background: form.accentColor }" />
            </div>
          </div>

          <!-- Description -->
          <div class="field full-span">
            <label class="field-label">Descripción <span class="field-label-hint">(opcional)</span></label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="Descripción breve del programa de lealtad..."
              class="field-input"
              style="resize: none;"
            />
          </div>

          <!-- Business rules / T&C -->
          <div class="field full-span">
            <label class="field-label">
              Reglas del negocio / Términos y condiciones
              <span class="field-label-hint">(opcional)</span>
            </label>
            <textarea
              v-model="form.businessRules"
              rows="4"
              placeholder="Ej: Válido solo en sucursal principal. No acumulable con otras promociones. El establecimiento se reserva el derecho de modificar los términos."
              class="field-input"
              style="resize: vertical;"
            />
            <p class="field-hint">
              Este texto aparece en el reverso del pase físico (Apple Wallet y Google Wallet) de tus clientes.
            </p>
          </div>
        </div>

        <!-- Color preview strip -->
        <div class="color-preview-strip">
          <div class="strip-fill" :style="{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.accentColor})` }" />
          <div class="strip-info">
            <div class="strip-dot" :style="{ background: form.primaryColor }" />
            <span class="strip-label">Vista previa de colores</span>
            <div class="strip-dot accent" :style="{ background: form.accentColor }" />
          </div>
        </div>
      </div>

      <div class="step-actions">
        <button class="btn-back" @click="step = 1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Atrás
        </button>
        <button class="btn-primary" :disabled="!form.businessName" @click="step = 3">
          Continuar
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ── Step 3: Reglas ──────────────────────────────────── -->
    <div v-if="step === 3" class="step-content">
      <div class="step-heading">
        <h2 class="step-title">Configura las reglas</h2>
        <p class="step-subtitle">Define cómo funciona este tipo de wallet para tus clientes.</p>
      </div>

      <div class="form-card">
        <div style="display: flex; flex-direction: column; gap: 18px;">
          <WalletRulesForm :type="form.type" :rules="form.rules" />
        </div>
      </div>

      <div class="step-actions">
        <button class="btn-back" @click="step = 2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Atrás
        </button>
        <button class="btn-primary" @click="step = 4">
          Ver vista previa
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ── Step 4: Vista previa ────────────────────────────── -->
    <div v-if="step === 4" class="step-content">
      <div class="step-heading">
        <h2 class="step-title">Vista previa del pase</h2>
        <p class="step-subtitle">Así verá el cliente su pase digital antes de descargarlo.</p>
      </div>

      <!-- Card preview -->
      <div class="card-preview-wrap">
        <StampsCard     v-if="form.type === 'stamps'"     :pass="getPreviewPass()" :wallet="(form as any)" />
        <MembershipCard v-else-if="form.type === 'membership'" :pass="getPreviewPass()" :wallet="(form as any)" />
        <PointsCard     v-else-if="form.type === 'points'"    :pass="getPreviewPass()" :wallet="(form as any)" />
        <CashbackCard   v-else-if="form.type === 'cashback'"  :pass="getPreviewPass()" :wallet="(form as any)" />
        <DaypassCard    v-else-if="form.type === 'daypass'"   :pass="getPreviewPass()" :wallet="(form as any)" />
        <BundleCard     v-else-if="form.type === 'bundle'"    :pass="getPreviewPass()" :wallet="(form as any)" />
        <GiftcardCard   v-else-if="form.type === 'giftcard'"  :pass="getPreviewPass()" :wallet="(form as any)" />
        <CouponCard     v-else-if="form.type === 'coupon'"    :pass="getPreviewPass()" :wallet="(form as any)" />
        <p class="card-preview-caption">Vista previa · No representa el diseño final exacto</p>
      </div>

      <!-- Summary -->
      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-key">Negocio</span>
          <span class="summary-val">{{ form.businessName }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-key">Tipo</span>
          <span class="summary-val" :style="{ color: selectedWt.iconColor }">{{ selectedWt.label }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-key">Colores</span>
          <span class="summary-val summary-colors">
            <span class="color-dot" :style="{ background: form.primaryColor }" :title="form.primaryColor" />
            <span class="color-dot" :style="{ background: form.accentColor }" :title="form.accentColor" />
            <span style="font-size: 11px; color: var(--text-muted); font-family: monospace;">
              {{ form.primaryColor }} · {{ form.accentColor }}
            </span>
          </span>
        </div>
      </div>

      <div class="step-actions">
        <button class="btn-back" @click="step = 3">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Atrás
        </button>
        <button class="btn-primary" :disabled="loading" @click="handleSubmit">
          <svg v-if="loading" class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9"/>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          {{ loading ? 'Guardando…' : 'Crear wallet' }}
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.create-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Back nav */
.btn-back-nav {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
  transition: color 0.15s;
}
.btn-back-nav:hover { color: var(--text-ink); }

/* Step bar */
.step-bar {
  display: flex;
  align-items: center;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px 20px;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
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
  transition: background 0.2s, color 0.2s;
  background: var(--border);
  color: var(--text-muted);
}
.step-bubble--done   { background: var(--primary); color: var(--bg-surface); }
.step-bubble--active { background: var(--amber); color: var(--bg-surface); }

.step-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
.step-label--active { color: var(--text-ink); }
.step-label--idle   { color: var(--text-faint); }

.step-connector {
  flex: 1;
  height: 2px;
  margin: 0 6px;
  margin-bottom: 22px;
  border-radius: 2px;
  background: var(--border);
  transition: background 0.2s;
}
.step-connector--done { background: var(--primary); }

@media (max-width: 480px) { .step-label { display: none; } }

/* Type context chip */
.type-context-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px 7px 8px;
  background: var(--bg-field);
  border: 1px solid var(--border);
  border-radius: 999px;
  width: fit-content;
}

.chip-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chip-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-ink);
}

.chip-change {
  font-size: 11px;
  font-weight: 600;
  color: var(--primary-mid);
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
  transition: color 0.12s;
}
.chip-change:hover { color: var(--primary-text); text-decoration: underline; }

.chip-enter-active, .chip-leave-active { transition: opacity 0.2s, transform 0.2s; }
.chip-enter-from, .chip-leave-to { opacity: 0; transform: translateY(-6px); }

/* Step content */
.step-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-heading { display: flex; flex-direction: column; gap: 4px; }

.step-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0;
}

.step-subtitle {
  font-size: 12.5px;
  color: var(--text-muted);
  margin: 0;
}

/* Type selector grid */
.type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
@media (max-width: 600px) { .type-grid { grid-template-columns: repeat(2, 1fr); } }

.type-card {
  position: relative;
  padding: 14px;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  border: 1.5px solid var(--border);
  background: var(--bg-surface);
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s, transform 0.12s;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}
.type-card:hover {
  box-shadow: 0 2px 10px var(--shadow-card);
  transform: translateY(-1px);
}
.type-card--selected {
  border-color: var(--primary-text);
  border-width: 2px;
  background: var(--primary-light);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(27, 58, 45, 0.12);
}

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

.type-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0 0 3px;
}

.type-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
  margin: 0;
}

.type-check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-text);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Form card */
.form-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
  overflow: hidden;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 520px) { .form-grid { grid-template-columns: 1fr; } }

.field { display: flex; flex-direction: column; gap: 6px; }
.full-span { grid-column: 1 / -1; }

.field-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.field-label-hint {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text-faint);
}

.required { color: var(--danger); }

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
}
.field-input::placeholder { color: var(--text-faint); }
.field-input:focus {
  border-color: var(--amber);
  box-shadow: 0 0 0 3px var(--amber-bg);
}

.field-error { font-size: 11px; color: var(--danger); }

/* Color picker */
.color-picker-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: var(--bg-surface);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.color-picker-row:focus-within {
  border-color: var(--amber);
  box-shadow: 0 0 0 3px var(--amber-bg);
}

.color-swatch {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  padding: 0;
  background: none;
  flex-shrink: 0;
}

.color-hex {
  flex: 1;
  font-size: 12px;
  color: var(--text-medium);
  font-family: monospace;
  font-weight: 600;
}

.color-preview {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}
.color-preview.accent { opacity: 0.75; }

/* Color strip preview */
.color-preview-strip {
  margin-top: 16px;
  margin-left: -20px;
  margin-right: -20px;
  margin-bottom: -20px;
  overflow: hidden;
}

.strip-fill {
  height: 6px;
}

.strip-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: var(--bg-field);
  border-top: 1px solid var(--border);
}

.strip-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  border: 1px solid rgba(0,0,0,0.08);
}
.strip-dot.accent { opacity: 0.75; }

.strip-label {
  flex: 1;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Image upload */
.image-preview-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--bg-surface);
}

.image-thumb-square {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: contain;
  background: var(--bg-field);
  padding: 4px;
  flex-shrink: 0;
  border: 1px solid var(--border);
}

.image-preview-info {
  flex: 1;
  min-width: 0;
}
.image-preview-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-ink);
  margin: 0 0 2px;
}
.image-preview-url {
  font-size: 11px;
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
}

.btn-change {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-field);
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 5px 10px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  font-family: inherit;
  transition: background 0.12s;
}
.btn-change:hover { background: var(--bg-subtle); }

.upload-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 20px;
  border-radius: 10px;
  border: 1.5px dashed var(--border);
  background: var(--bg-field);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.upload-zone:hover { border-color: var(--amber); background: var(--amber-bg); }
.upload-zone--disabled { pointer-events: none; opacity: 0.6; }

.upload-state { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.upload-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--bg-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}
.upload-title { font-size: 13px; font-weight: 600; color: var(--text-medium); margin: 0; }
.upload-label { font-size: 11px; color: var(--text-faint); margin: 0; }

/* Card preview (step 4) */
.card-preview-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
  max-width: 390px;
  margin: 0 auto;
  width: 100%;
}

.card-preview-caption {
  font-size: 11px;
  color: var(--text-faint);
  margin: 0;
  text-align: center;
}

/* Summary card */
.summary-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--border);
}
.summary-row:last-child { border-bottom: none; }

.summary-key {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  width: 72px;
  flex-shrink: 0;
}

.summary-val {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-ink);
}

.summary-colors {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

/* Step actions */
.step-actions {
  display: flex;
  gap: 10px;
}

.btn-primary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 12px 18px;
  border-radius: 10px;
  background: var(--primary-text);
  color: var(--bg-surface);
  font-size: 13px;
  font-weight: 700;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  border: none;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.btn-primary:hover:not(:disabled) { background: var(--primary-mid); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-back {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 18px;
  border-radius: 10px;
  background: var(--bg-surface);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  border: 1.5px solid var(--border);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}
.btn-back:hover { background: var(--bg-field); color: var(--text-ink); }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
</style>
