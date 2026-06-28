<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { walletTypeConfig, findWalletTypeConfig } from '@/app/config/walletTypeConfig'
import { useImgbbUpload } from '@/app/composables/useImgbbUpload'
import WalletRulesForm from '@/app/components/Wallet/WalletRulesForm.vue'
import ThemeEditor from '@/app/components/Wallet/ThemeEditor.vue'
import StampsCard from '@/app/components/Wallet/StampsCard.vue'
import MembershipCard from '@/app/components/Wallet/MembershipCard.vue'
import PointsCard from '@/app/components/Wallet/PointsCard.vue'
import CashbackCard from '@/app/components/Wallet/CashbackCard.vue'
import DaypassCard from '@/app/components/Wallet/DaypassCard.vue'
import BundleCard from '@/app/components/Wallet/BundleCard.vue'
import GiftcardCard from '@/app/components/Wallet/GiftcardCard.vue'
import CouponCard from '@/app/components/Wallet/CouponCard.vue'
import type { CreateWalletDto } from '@/application/wallet/dto/CreateWalletDto'
import type { WalletThemeOverrides } from '@/domain/wallet/entities/WalletTheme'
import type { WalletType } from '@/domain/wallet/entities/Wallet'
import type { Pass } from '@/domain/pass/entities/Pass'

const props = defineProps<{ modelValue: boolean }>()
const emit  = defineEmits<{ 'update:modelValue': [v: boolean] }>()

const walletStore = useWalletStore()

const step               = ref(1)
const loading            = ref(false)
const fileInput          = ref<HTMLInputElement | null>(null)
const showOptionalFields = ref(false)

const { uploading: uploadingLogo, error: uploadError, upload: uploadImage } = useImgbbUpload()

function freshForm(): CreateWalletDto {
  return {
    type:          'stamps',
    businessName:  '',
    logoUrl:       '',
    primaryColor:  '#1B3A2D',
    accentColor:   '#F5A623',
    description:   '',
    businessRules: '',
    theme:         {} as WalletThemeOverrides,
    rules:         findWalletTypeConfig('stamps').defaultRules(),
  }
}

const form = reactive<CreateWalletDto>(freshForm())

const formTheme = computed<WalletThemeOverrides>(() => (form.theme as WalletThemeOverrides) ?? {})

const themeBase = computed(() => ({
  primaryColor: form.primaryColor,
  accentColor:  form.accentColor,
  logoUrl:      form.logoUrl || null,
  businessName: form.businessName || 'Vista previa',
}))

watch(
  () => form.type,
  (type: WalletType) => { form.rules = findWalletTypeConfig(type).defaultRules() },
)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      // reset on open
      Object.assign(form, freshForm())
      step.value               = 1
      showOptionalFields.value = false
    }
  },
)

const selectedWt = computed(() => findWalletTypeConfig(form.type))

const previewGradient = computed(() =>
  `linear-gradient(135deg, ${form.primaryColor}, ${form.accentColor})`,
)

const previewPass: Pass = {
  id: 'preview', walletId: 'preview', token: 'preview',
  firstName: 'Juan', lastName: 'Pérez', phone: '', customerName: 'Juan Pérez',
  createdAt: new Date().toISOString(), data: { type: 'stamps', currentStamps: 3 },
}

function getPreviewPass(): Pass {
  return { ...previewPass, data: findWalletTypeConfig(form.type).previewData(form.rules) }
}

const STEPS = [
  { n: 1, label: 'Tipo',         optional: false },
  { n: 2, label: 'Branding',     optional: false },
  { n: 3, label: 'Diseno',       optional: true  },
  { n: 4, label: 'Reglas',       optional: false },
  { n: 5, label: 'Vista previa', optional: false },
]

const canGoNext = computed(() => {
  if (step.value === 2) return form.businessName.trim().length > 0
  return true
})

const nextLabel = computed(() => {
  if (step.value === 4) return 'Ver vista previa'
  if (step.value === 5) return loading.value ? 'Creando...' : 'Crear wallet'
  return 'Continuar'
})

function goToStep(n: number) {
  if (n <= step.value) step.value = n
}

function handleNext() {
  if (step.value < 5) step.value++
  else handleSubmit()
}

function handleBack() {
  if (step.value > 1) step.value--
  else close()
}

function close() {
  if (loading.value) return
  emit('update:modelValue', false)
}

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
    const theme = form.theme as WalletThemeOverrides | undefined
    await walletStore.createWallet({
      ...form,
      businessRules: form.businessRules?.trim() || null,
      theme: theme && Object.keys(theme).length > 0 ? theme : null,
    })
    close()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="wcm-fade">
      <div v-if="modelValue" class="wcm-backdrop" @click.self="close">
        <Transition name="wcm-dialog" appear>
          <div v-if="modelValue" class="wcm-dialog" role="dialog" aria-modal="true">

            <!-- ── Header ────────────────────────────────────────────── -->
            <div class="wcm-header">
              <div class="wcm-header-left">
                <div class="wcm-header-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary-text)" stroke-width="2" stroke-linecap="round">
                    <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
                  </svg>
                </div>
                <div>
                  <h1 class="wcm-title">Nueva Wallet</h1>
                  <span class="wcm-subtitle">{{ selectedWt.label }}</span>
                </div>
              </div>
              <button class="wcm-close" :disabled="loading" @click="close" aria-label="Cerrar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- ── Body ──────────────────────────────────────────────── -->
            <div class="wcm-body">

              <!-- Sidebar -->
              <aside class="wcm-sidebar">
                <nav class="wcm-steps">
                  <button
                    v-for="s in STEPS"
                    :key="s.n"
                    class="wcm-step"
                    :class="{
                      'wcm-step--done':   step > s.n,
                      'wcm-step--active': step === s.n,
                      'wcm-step--locked': step < s.n,
                    }"
                    :disabled="step < s.n"
                    @click="goToStep(s.n)"
                  >
                    <div class="wcm-step-dot">
                      <svg v-if="step > s.n" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      <span v-else>{{ s.n }}</span>
                    </div>
                    <span class="wcm-step-label">{{ s.label }}</span>
                    <span v-if="s.optional" class="wcm-step-badge">Opcional</span>
                  </button>
                </nav>

                <!-- Live mini preview (step ≥ 2) -->
                <Transition name="preview-in">
                  <div v-if="step >= 2" class="wcm-preview">
                    <p class="wcm-preview-label">Vista previa</p>
                    <div class="wcm-preview-card" :style="{ background: previewGradient }">
                      <div class="wcm-preview-top">
                        <img v-if="form.logoUrl" :src="form.logoUrl" class="wcm-preview-logo" alt="" />
                        <span class="wcm-preview-biz">{{ form.businessName || 'Tu negocio' }}</span>
                      </div>
                      <div class="wcm-preview-type">
                        <div class="wcm-type-dot" :style="{ background: selectedWt.iconBg }">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke-width="1.8"
                               stroke-linecap="round" stroke-linejoin="round" :stroke="selectedWt.iconColor">
                            <path :d="selectedWt.iconPath"/>
                          </svg>
                        </div>
                        <span class="wcm-type-label">{{ selectedWt.label }}</span>
                      </div>
                    </div>
                    <p class="wcm-preview-note">Actualiza en tiempo real</p>
                  </div>
                </Transition>

                <div class="wcm-sidebar-stat">
                  <span class="wcm-stat-label">Progreso</span>
                  <span class="wcm-stat-val">{{ step }} / {{ STEPS.length }}</span>
                </div>
              </aside>

              <!-- Content -->
              <div class="wcm-content">
                <div class="wcm-inner">

                <!-- Step 1: Tipo -->
                <template v-if="step === 1">
                  <div class="tab-header">
                    <p class="tab-title">¿Qué tipo de wallet quieres crear?</p>
                    <p class="tab-desc">Cada tipo genera un pase digital distinto para tus clientes.</p>
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
                      <p class="type-desc-text">{{ wt.desc }}</p>
                      <span v-if="form.type === wt.value" class="type-check">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                      </span>
                    </button>
                  </div>
                </template>

                <!-- Step 2: Branding -->
                <template v-else-if="step === 2">
                  <div class="tab-header">
                    <p class="tab-title">Personaliza tu wallet</p>
                    <p class="tab-desc">Nombre, logo y colores que aparecerán en el pase del cliente.</p>
                  </div>
                  <div class="form-card">
                    <div class="form-grid">
                      <div class="field full-span">
                        <label class="field-label">Nombre del negocio <span class="req">*</span></label>
                        <input v-model="form.businessName" type="text" placeholder="Ej. Cucara Macara Espresso" class="field-input" />
                      </div>

                      <div class="field full-span">
                        <label class="field-label">Logo <span class="opt-hint">(opcional)</span></label>
                        <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFileChange" />
                        <div v-if="form.logoUrl && !uploadingLogo" class="img-row">
                          <img :src="form.logoUrl" alt="Logo" class="img-thumb" />
                          <div class="img-info">
                            <p class="img-title">Logo cargado</p>
                            <p class="img-url">{{ form.logoUrl }}</p>
                          </div>
                          <button type="button" class="btn-change" @click="form.logoUrl = ''">Cambiar</button>
                        </div>
                        <div v-else class="upload-zone" :class="{ 'upload-zone--off': uploadingLogo }"
                             @click="fileInput?.click()" @dragover.prevent @drop.prevent="onDrop">
                          <div v-if="uploadingLogo" class="upload-state">
                            <svg class="spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="1.8" stroke-linecap="round">
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                            </svg>
                            <p class="upload-lbl">Subiendo imagen...</p>
                          </div>
                          <div v-else class="upload-state">
                            <div class="upload-icon">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                              </svg>
                            </div>
                            <p class="upload-title">Haz clic o arrastra una imagen</p>
                            <p class="upload-lbl">PNG, JPG, SVG · Máx. 4 MB</p>
                          </div>
                        </div>
                        <p v-if="uploadError" class="field-error">{{ uploadError }}</p>
                      </div>

                      <div class="field">
                        <label class="field-label">Color principal</label>
                        <div class="color-row">
                          <input v-model="form.primaryColor" type="color" class="color-swatch" />
                          <span class="color-hex">{{ form.primaryColor }}</span>
                          <span class="color-dot" :style="{ background: form.primaryColor }" />
                        </div>
                      </div>
                      <div class="field">
                        <label class="field-label">Color acento</label>
                        <div class="color-row">
                          <input v-model="form.accentColor" type="color" class="color-swatch" />
                          <span class="color-hex">{{ form.accentColor }}</span>
                          <span class="color-dot accent" :style="{ background: form.accentColor }" />
                        </div>
                      </div>

                      <div class="field full-span">
                        <button type="button" class="opt-toggle" @click="showOptionalFields = !showOptionalFields">
                          <span class="opt-toggle-label">Descripcion y terminos de uso</span>
                          <span class="opt-badge">Opcional</span>
                          <svg class="opt-chevron" :class="{ 'opt-chevron--open': showOptionalFields }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        </button>
                        <Transition name="opt-collapse">
                          <div v-if="showOptionalFields" class="opt-body">
                            <div class="field">
                              <label class="field-label">Descripcion</label>
                              <textarea v-model="form.description" rows="2" placeholder="Descripcion breve del programa de lealtad..." class="field-input" style="resize:none" />
                            </div>
                            <div class="field">
                              <label class="field-label">Reglas / Terminos y condiciones</label>
                              <textarea v-model="form.businessRules" rows="3" placeholder="Ej: Valido solo en sucursal principal..." class="field-input" style="resize:vertical" />
                              <p class="field-hint">Aparece en el reverso del pase en Apple/Google Wallet.</p>
                            </div>
                          </div>
                        </Transition>
                      </div>
                    </div>

                    <div class="color-strip">
                      <div class="strip-fill" :style="{ background: previewGradient }" />
                      <div class="strip-row">
                        <span class="strip-dot" :style="{ background: form.primaryColor }" />
                        <span class="strip-lbl">Vista previa de colores</span>
                        <span class="strip-dot" :style="{ background: form.accentColor, opacity: 0.75 }" />
                      </div>
                    </div>
                  </div>
                </template>

                <!-- Step 3: Diseño -->
                <template v-else-if="step === 3">
                  <div class="tab-header">
                    <div class="tab-header-row">
                      <div>
                        <p class="tab-title">Personaliza el diseño</p>
                        <p class="tab-desc">Colores, tipografia, codigo de barras y contacto del pase.</p>
                      </div>
                      <span class="badge-opt">Opcional</span>
                    </div>
                    <p class="skip-hint">Puedes omitirlo y ajustarlo desde la configuracion del wallet.</p>
                  </div>
                  <ThemeEditor :theme="formTheme" :base="themeBase" :hide-logo-override="true" />
                </template>

                <!-- Step 4: Reglas -->
                <template v-else-if="step === 4">
                  <div class="tab-header">
                    <p class="tab-title">Configura las reglas</p>
                    <p class="tab-desc">Define cómo funciona este tipo de wallet para tus clientes.</p>
                  </div>
                  <div class="rules-note">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                    Tipo de wallet: <strong>{{ selectedWt.label }}</strong>
                  </div>
                  <WalletRulesForm :type="form.type" :rules="form.rules" />
                </template>

                <!-- Step 5: Vista previa -->
                <template v-else-if="step === 5">
                  <div class="tab-header">
                    <p class="tab-title">Todo listo para crear</p>
                    <p class="tab-desc">Revisa como quedara el pase de tus clientes antes de confirmar.</p>
                  </div>
                  <div class="preview-wrap">
                    <div class="preview-card-zone">
                      <StampsCard     v-if="form.type === 'stamps'"     :pass="getPreviewPass()" :wallet="(form as any)" />
                      <MembershipCard v-else-if="form.type === 'membership'" :pass="getPreviewPass()" :wallet="(form as any)" />
                      <PointsCard     v-else-if="form.type === 'points'"     :pass="getPreviewPass()" :wallet="(form as any)" />
                      <CashbackCard   v-else-if="form.type === 'cashback'"   :pass="getPreviewPass()" :wallet="(form as any)" />
                      <DaypassCard    v-else-if="form.type === 'daypass'"    :pass="getPreviewPass()" :wallet="(form as any)" />
                      <BundleCard     v-else-if="form.type === 'bundle'"     :pass="getPreviewPass()" :wallet="(form as any)" />
                      <GiftcardCard   v-else-if="form.type === 'giftcard'"   :pass="getPreviewPass()" :wallet="(form as any)" />
                      <CouponCard     v-else-if="form.type === 'coupon'"     :pass="getPreviewPass()" :wallet="(form as any)" />
                      <p class="preview-caption">Vista previa · El diseño final puede variar por dispositivo</p>
                    </div>
                    <div class="summary-card">
                      <div class="summary-row">
                        <span class="summary-k">Negocio</span>
                        <span class="summary-v">{{ form.businessName }}</span>
                      </div>
                      <div class="summary-row">
                        <span class="summary-k">Tipo</span>
                        <span class="summary-v" :style="{ color: selectedWt.iconColor }">{{ selectedWt.label }}</span>
                      </div>
                      <div class="summary-row">
                        <span class="summary-k">Colores</span>
                        <span class="summary-v summary-colors">
                          <span class="sum-dot" :style="{ background: form.primaryColor }" />
                          <span class="sum-dot" :style="{ background: form.accentColor }" />
                          <span style="font-size:11px;color:var(--text-muted);font-family:monospace">{{ form.primaryColor }} · {{ form.accentColor }}</span>
                        </span>
                      </div>
                      <div v-if="form.description" class="summary-row">
                        <span class="summary-k">Desc.</span>
                        <span class="summary-v summary-v--muted">{{ form.description }}</span>
                      </div>
                      <div v-if="form.logoUrl" class="summary-row">
                        <span class="summary-k">Logo</span>
                        <img :src="form.logoUrl" alt="Logo" class="sum-logo" />
                      </div>
                    </div>
                  </div>
                </template>

                </div><!-- /wcm-inner -->
              </div>
            </div>

            <!-- ── Footer ────────────────────────────────────────────── -->
            <div class="wcm-footer">
              <button class="btn-cancel" :disabled="loading" @click="handleBack">
                <svg v-if="step > 1" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
                {{ step === 1 ? 'Cancelar' : 'Atrás' }}
              </button>
              <div class="footer-right">
                <button v-if="step === 3" class="btn-ghost" @click="step = 4">Omitir</button>
                <button class="btn-primary" :disabled="!canGoNext || (step === 5 && loading)" @click="handleNext">
                  <svg v-if="step === 5 && loading" class="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9"/>
                  </svg>
                  <svg v-else-if="step === 5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  {{ nextLabel }}
                  <svg v-if="step < 5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Backdrop ──────────────────────────────────────────────────────────────── */
.wcm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--overlay, rgba(0,0,0,0.45));
  backdrop-filter: blur(3px);
}

/* ── Dialog ────────────────────────────────────────────────────────────────── */
.wcm-dialog {
  width: 100%;
  max-width: 920px;
  max-height: 90vh;
  background: var(--bg-surface);
  border-radius: 20px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.22), 0 0 0 1px var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ────────────────────────────────────────────────────────────────── */
.wcm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.wcm-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.wcm-header-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wcm-title    { font-size: 15px; font-weight: 700; color: var(--text-ink); margin: 0 0 2px; }
.wcm-subtitle { font-size: 12px; color: var(--text-muted); }

.wcm-close {
  width: 32px; height: 32px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--bg-surface);
  color: var(--text-muted); display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: background 0.12s, color 0.12s;
}
.wcm-close:hover    { background: var(--bg-page); color: var(--text-ink); }
.wcm-close:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Body ──────────────────────────────────────────────────────────────────── */
.wcm-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

/* ── Sidebar ───────────────────────────────────────────────────────────────── */
.wcm-sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: var(--bg-page, var(--bg-field));
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  overflow-y: auto;
  gap: 0;
}

.wcm-steps   { display: flex; flex-direction: column; gap: 2px; margin-bottom: 20px; }

.wcm-step {
  display: flex; align-items: center; gap: 9px;
  width: 100%; padding: 9px 10px; border-radius: 9px;
  border: none; background: none;
  font-size: 12.5px; font-weight: 600; color: var(--text-faint);
  cursor: pointer; font-family: inherit; text-align: left;
  transition: background 0.13s, color 0.13s;
}
.wcm-step:not(:disabled):hover { background: var(--bg-subtle); color: var(--text-ink); }
.wcm-step--active { background: var(--primary-light); color: var(--primary-text); cursor: default; }
.wcm-step--done   { color: var(--text-medium); }
.wcm-step--locked { opacity: 0.4; cursor: not-allowed; }

.wcm-step-dot {
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800; flex-shrink: 0;
  background: var(--border); color: var(--text-muted);
  transition: background 0.2s, color 0.2s;
}
.wcm-step--active .wcm-step-dot,
.wcm-step--done   .wcm-step-dot { background: var(--primary-text); color: #fff; }

.wcm-step-label { flex: 1; }

.wcm-step-badge {
  font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--text-faint); background: var(--bg-surface);
  border: 1px solid var(--border); border-radius: 999px; padding: 1px 6px; flex-shrink: 0;
}

/* Mini preview */
.wcm-preview { padding: 0 4px; margin-bottom: 16px; }

.wcm-preview-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--text-faint); margin: 0 0 8px;
}

.wcm-preview-card {
  border-radius: 12px; padding: 14px 12px 12px;
  display: flex; flex-direction: column; gap: 10px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.14); min-height: 88px;
  transition: background 0.3s;
}

.wcm-preview-top { display: flex; align-items: center; gap: 7px; }

.wcm-preview-logo {
  width: 22px; height: 22px; border-radius: 5px; object-fit: contain;
  background: rgba(255,255,255,0.2); flex-shrink: 0;
}

.wcm-preview-biz {
  font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.9);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.wcm-preview-type { display: flex; align-items: center; gap: 5px; }

.wcm-type-dot {
  width: 18px; height: 18px; border-radius: 5px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.wcm-type-label { font-size: 10.5px; font-weight: 600; color: rgba(255,255,255,0.85); }

.wcm-preview-note { font-size: 10px; color: var(--text-faint); margin: 4px 0 0; text-align: center; }

/* Stat */
.wcm-sidebar-stat {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 8px; border-radius: 9px;
  background: var(--bg-surface); border: 1px solid var(--border);
  margin-top: auto;
}
.wcm-stat-label { font-size: 11px; color: var(--text-faint); font-weight: 500; }
.wcm-stat-val   { font-size: 13px; font-weight: 700; color: var(--primary-text); }

/* ── Content ───────────────────────────────────────────────────────────────── */
/* wcm-content: only scroll, no layout */
.wcm-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  min-width: 0;
}

/* wcm-inner: layout wrapper inside the scroller */
.wcm-inner {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 28px;
  min-height: 100%;
  box-sizing: border-box;
}

/* Tab heading */
.tab-header { display: flex; flex-direction: column; gap: 4px; padding-bottom: 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.tab-header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.tab-title   { font-size: 14px; font-weight: 700; color: var(--text-ink); margin: 0; }
.tab-desc    { font-size: 12.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

.badge-opt {
  flex-shrink: 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--text-faint); background: var(--bg-field); border: 1px solid var(--border);
  border-radius: 999px; padding: 3px 10px;
}
.skip-hint { font-size: 11.5px; color: var(--text-faint); margin: 6px 0 0; line-height: 1.45; }

/* Type grid */
.type-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
}

.type-card {
  position: relative; padding: 14px; border-radius: 12px; cursor: pointer; text-align: left;
  border: 1.5px solid var(--border); background: var(--bg-surface);
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s, transform 0.12s;
  font-family: inherit;
}
.type-card:hover { box-shadow: 0 2px 10px var(--shadow-card); transform: translateY(-1px); }
.type-card--selected {
  border-color: var(--primary-text); border-width: 2px;
  background: var(--primary-light); transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(27,58,45,0.12);
}

.type-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-bottom: 10px;
}
.type-name      { font-size: 13px; font-weight: 700; color: var(--text-ink); margin: 0 0 3px; }
.type-desc-text { font-size: 11px; color: var(--text-muted); line-height: 1.4; margin: 0; }

.type-check {
  position: absolute; top: 10px; right: 10px;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--primary-text); display: flex; align-items: center; justify-content: center;
}

/* Form card */
.form-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px; overflow: hidden; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.field      { display: flex; flex-direction: column; gap: 6px; }
.full-span  { grid-column: 1 / -1; }

.field-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.opt-hint    { font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--text-faint); }
.field-hint  { font-size: 11.5px; color: var(--text-faint); margin: 0; line-height: 1.5; }
.field-error { font-size: 11px; color: var(--danger); }
.req         { color: var(--danger); }

.field-input {
  width: 100%; padding: 11px 13px; border-radius: 9px;
  border: 1.5px solid var(--border); background: var(--bg-surface);
  font-size: 13px; font-family: inherit; color: var(--text-ink);
  outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;
}
.field-input::placeholder { color: var(--text-faint); }
.field-input:focus { border-color: var(--amber); box-shadow: 0 0 0 3px var(--amber-bg); }

.color-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border-radius: 9px; border: 1.5px solid var(--border); background: var(--bg-surface);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.color-row:focus-within { border-color: var(--amber); box-shadow: 0 0 0 3px var(--amber-bg); }

.color-swatch { width: 28px; height: 28px; border: none; border-radius: 6px; cursor: pointer; padding: 0; background: none; flex-shrink: 0; }
.color-hex    { flex: 1; font-size: 12px; color: var(--text-medium); font-family: monospace; font-weight: 600; }
.color-dot    { width: 16px; height: 16px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.08); flex-shrink: 0; }
.accent       { opacity: 0.75; }

/* Color strip */
.color-strip   { margin: 16px -20px -20px; overflow: hidden; }
.strip-fill    { height: 6px; }
.strip-row     { display: flex; align-items: center; gap: 8px; padding: 8px 20px; background: var(--bg-field); border-top: 1px solid var(--border); }
.strip-dot     { width: 10px; height: 10px; border-radius: 3px; border: 1px solid rgba(0,0,0,0.08); }
.strip-lbl     { flex: 1; font-size: 10px; font-weight: 600; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.05em; }

/* Image upload */
.img-row { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg-surface); }
.img-thumb { width: 48px; height: 48px; border-radius: 8px; object-fit: contain; background: var(--bg-field); padding: 4px; flex-shrink: 0; border: 1px solid var(--border); }
.img-info  { flex: 1; min-width: 0; }
.img-title { font-size: 12px; font-weight: 600; color: var(--text-ink); margin: 0 0 2px; }
.img-url   { font-size: 11px; color: var(--text-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0; }

.btn-change {
  font-size: 11px; font-weight: 600; color: var(--text-muted);
  background: var(--bg-field); border: 1px solid var(--border); border-radius: 7px;
  padding: 5px 10px; cursor: pointer; white-space: nowrap; flex-shrink: 0;
  font-family: inherit; transition: background 0.12s;
}
.btn-change:hover { background: var(--bg-subtle); }

.upload-zone {
  display: flex; align-items: center; justify-content: center;
  padding: 28px 20px; border-radius: 10px; border: 1.5px dashed var(--border);
  background: var(--bg-field); cursor: pointer; transition: border-color 0.15s, background 0.15s;
}
.upload-zone:hover     { border-color: var(--amber); background: var(--amber-bg); }
.upload-zone--off      { pointer-events: none; opacity: 0.6; }
.upload-state          { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.upload-icon           { width: 36px; height: 36px; border-radius: 10px; background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
.upload-title          { font-size: 13px; font-weight: 600; color: var(--text-medium); margin: 0; }
.upload-lbl            { font-size: 11px; color: var(--text-faint); margin: 0; }

/* Optional collapse */
.opt-toggle {
  width: 100%; display: flex; align-items: center; gap: 8px;
  background: var(--bg-field); border: 1.5px solid var(--border); border-radius: 9px;
  padding: 10px 14px; cursor: pointer; font-family: inherit; text-align: left;
  transition: border-color 0.15s, background 0.15s;
}
.opt-toggle:hover        { border-color: var(--text-faint); background: var(--bg-subtle); }
.opt-toggle-label        { flex: 1; font-size: 12.5px; font-weight: 600; color: var(--text-medium); }
.opt-badge               { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-faint); background: var(--bg-surface); border: 1px solid var(--border); border-radius: 999px; padding: 2px 7px; flex-shrink: 0; }
.opt-chevron             { color: var(--text-faint); flex-shrink: 0; transition: transform 0.22s ease; }
.opt-chevron--open       { transform: rotate(180deg); }
.opt-body                { display: flex; flex-direction: column; gap: 14px; padding-top: 14px; }

.opt-collapse-enter-active { transition: max-height 0.28s ease, opacity 0.22s ease; overflow: hidden; max-height: 500px; }
.opt-collapse-leave-active { transition: max-height 0.22s ease, opacity 0.18s ease; overflow: hidden; max-height: 500px; }
.opt-collapse-enter-from, .opt-collapse-leave-to { max-height: 0 !important; opacity: 0; }

/* Rules note */
.rules-note {
  display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted);
  background: var(--bg-page); border: 1px solid var(--border); border-radius: 8px; padding: 9px 12px;
}

/* Step 5: preview */
.preview-wrap       { display: flex; flex-direction: column; gap: 20px; }
.preview-card-zone  { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 20px; background: var(--bg-page); border: 1px solid var(--border); border-radius: 14px; }
.preview-caption    { font-size: 11px; color: var(--text-faint); margin: 0; text-align: center; }

.summary-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.summary-row  { display: flex; align-items: center; gap: 12px; padding: 11px 16px; border-bottom: 1px solid var(--border); }
.summary-row:last-child { border-bottom: none; }
.summary-k    { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; width: 60px; flex-shrink: 0; }
.summary-v    { font-size: 13px; font-weight: 600; color: var(--text-ink); }
.summary-v--muted { font-size: 12px; font-weight: 400; color: var(--text-muted); white-space: normal; line-height: 1.4; }
.summary-colors { display: flex; align-items: center; gap: 6px; }
.sum-dot      { display: inline-block; width: 14px; height: 14px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.08); }
.sum-logo     { width: 32px; height: 32px; border-radius: 6px; object-fit: contain; border: 1px solid var(--border); padding: 2px; }

/* ── Footer ────────────────────────────────────────────────────────────────── */
.wcm-footer {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 22px; border-top: 1px solid var(--border);
  flex-shrink: 0; background: var(--bg-surface);
}

.footer-right { display: flex; align-items: center; gap: 8px; margin-left: auto; }

.btn-cancel {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 18px; border-radius: 9px;
  border: 1.5px solid var(--border); background: var(--bg-surface);
  font-size: 13px; font-weight: 600; color: var(--text-medium);
  cursor: pointer; font-family: inherit; transition: background 0.12s; white-space: nowrap;
}
.btn-cancel:hover:not(:disabled)  { background: var(--bg-page); color: var(--text-ink); }
.btn-cancel:disabled               { opacity: 0.5; cursor: not-allowed; }

.btn-ghost {
  display: flex; align-items: center; padding: 9px 16px; border-radius: 9px;
  background: transparent; color: var(--text-muted);
  font-size: 13px; font-weight: 600; font-family: inherit;
  border: none; cursor: pointer; transition: color 0.12s, background 0.12s; white-space: nowrap;
}
.btn-ghost:hover { color: var(--text-ink); background: var(--bg-field); }

.btn-primary {
  display: flex; align-items: center; justify-content: center; gap: 7px;
  padding: 9px 20px; border-radius: 9px;
  background: var(--primary-text); color: #fff;
  font-size: 13px; font-weight: 700; font-family: inherit;
  border: none; cursor: pointer; transition: opacity 0.15s; white-space: nowrap;
}
.btn-primary:hover:not(:disabled) { opacity: 0.88; }
.btn-primary:disabled              { opacity: 0.45; cursor: not-allowed; }

/* ── Mobile ────────────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .wcm-backdrop {
    padding: 0;
    align-items: flex-end;
  }

  .wcm-dialog {
    max-width: 100%;
    max-height: 96dvh;
    border-radius: 20px 20px 0 0;
  }

  .wcm-body {
    flex-direction: column;
  }

  /* Sidebar → horizontal mini stepper row */
  .wcm-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border);
    flex-direction: row;
    align-items: center;
    padding: 12px 16px;
    gap: 6px;
    overflow-x: auto;
    overflow-y: visible;
    flex-shrink: 0;
  }

  .wcm-steps {
    flex-direction: row;
    margin-bottom: 0;
    gap: 4px;
    flex: 1;
  }

  .wcm-step {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: 6px 4px;
    border-radius: 8px;
    gap: 4px;
    min-width: 44px;
  }

  .wcm-step-label  { font-size: 9px; text-align: center; white-space: nowrap; }
  .wcm-step-badge  { display: none; }
  .wcm-step-dot    { width: 20px; height: 20px; font-size: 10px; }

  .wcm-preview,
  .wcm-sidebar-stat { display: none; }

  .wcm-inner { padding: 16px; }

  /* Type grid 2 cols on mobile */
  .type-grid { grid-template-columns: repeat(2, 1fr); }

  /* Footer: stack on very small screens */
  .wcm-footer { flex-wrap: wrap; padding: 12px 16px; gap: 8px; }
  .btn-cancel  { flex: 1; justify-content: center; }
  .footer-right { width: 100%; }
  .btn-primary { flex: 1; }
}

/* ── Transitions ───────────────────────────────────────────────────────────── */
.wcm-fade-enter-active,  .wcm-fade-leave-active  { transition: opacity 0.22s ease; }
.wcm-fade-enter-from,    .wcm-fade-leave-to      { opacity: 0; }

.wcm-dialog-enter-active { transition: opacity 0.22s ease, transform 0.26s cubic-bezier(0.34, 1.4, 0.64, 1); }
.wcm-dialog-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.wcm-dialog-enter-from   { opacity: 0; transform: scale(0.94) translateY(12px); }
.wcm-dialog-leave-to     { opacity: 0; transform: scale(0.96); }

/* Mobile: slide up from bottom */
@media (max-width: 640px) {
  .wcm-dialog-enter-from { transform: translateY(40px); }
  .wcm-dialog-leave-to   { transform: translateY(20px); }
}

.preview-in-enter-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.preview-in-enter-from   { opacity: 0; transform: translateY(8px); }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
</style>
