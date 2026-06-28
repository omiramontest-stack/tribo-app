<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import { useTierStore } from '@/app/stores/tier/TierStore'
import { parseApiError } from '@/app/composables/useApiError'
import WalletRulesForm from '@/app/components/Wallet/WalletRulesForm.vue'
import ThemeEditor from '@/app/components/Wallet/ThemeEditor.vue'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { WalletTier } from '@/domain/wallet/entities/WalletTier'
import type { WalletRules } from '@/domain/wallet/entities/WalletRules'
import type { WalletThemeOverrides } from '@/domain/wallet/entities/WalletTheme'

const props = defineProps<{
  modelValue: boolean
  wallet: Wallet
  tier: WalletTier | null
  nextLevel: number
  prevThreshold: number
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  saved: [tier: WalletTier]
}>()

const tierStore = useTierStore()

type Tab = 'info' | 'rules' | 'design'
const activeTab = ref<Tab>('info')

interface TierForm {
  name: string
  threshold: number
  rules: WalletRules
  theme: WalletThemeOverrides
}

function buildForm(): TierForm {
  if (props.tier) {
    return {
      name:      props.tier.name,
      threshold: props.tier.unlockRule.threshold,
      rules:     JSON.parse(JSON.stringify(props.tier.rules)) as WalletRules,
      theme:     JSON.parse(JSON.stringify(props.tier.config ?? {})) as WalletThemeOverrides,
    }
  }
  return {
    name:      `Nivel ${props.nextLevel}`,
    threshold: props.prevThreshold + 1,
    rules:     JSON.parse(JSON.stringify(props.wallet.rules)) as WalletRules,
    theme:     {},
  }
}

const form = reactive<TierForm>(buildForm())

const thresholdMin = computed(() => props.prevThreshold + 1)
const thresholdError = computed(() =>
  form.threshold < thresholdMin.value
    ? `Minimo ${thresholdMin.value} ciclos`
    : '',
)

const themeBase = computed(() => ({
  primaryColor: props.wallet.primaryColor,
  accentColor:  props.wallet.accentColor,
  logoUrl:      props.wallet.logoUrl,
  businessName: form.name || props.wallet.businessName,
}))

// Color shown in mini sidebar preview
const previewBg = computed(() =>
  form.theme.colors?.background ?? props.wallet.primaryColor,
)
const previewGradient = computed(() => {
  const to = form.theme.colors?.gradientTo
  return to
    ? `linear-gradient(135deg, ${previewBg.value}, ${to})`
    : `linear-gradient(135deg, ${previewBg.value}, ${props.wallet.accentColor})`
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      Object.assign(form, buildForm())
      apiError.value   = ''
      apiSuccess.value = false
      activeTab.value  = 'info'
    }
  },
)

const saving     = ref(false)
const apiError   = ref('')
const apiSuccess = ref(false)

const isValid = computed(() =>
  form.name.trim().length > 0 && !thresholdError.value,
)

async function save() {
  if (!isValid.value) return
  saving.value     = true
  apiError.value   = ''
  apiSuccess.value = false
  const themePayload = Object.keys(form.theme).length > 0 ? form.theme : null
  try {
    let saved: WalletTier
    if (props.tier) {
      saved = await tierStore.updateTier(props.wallet.id, props.tier.id, {
        name:       form.name.trim(),
        rules:      form.rules,
        config:     themePayload,
        unlockRule: { type: 'cycles_completed', threshold: form.threshold },
      })
    } else {
      saved = await tierStore.createTier(props.wallet.id, {
        level:      props.nextLevel,
        name:       form.name.trim(),
        rules:      form.rules,
        config:     themePayload,
        unlockRule: { type: 'cycles_completed', threshold: form.threshold },
      })
    }
    apiSuccess.value = true
    emit('saved', saved)
    setTimeout(() => emit('update:modelValue', false), 800)
  } catch (e) {
    apiError.value = parseApiError(e)
  } finally {
    saving.value = false
  }
}

function close() {
  if (saving.value) return
  emit('update:modelValue', false)
}

const NAV_ITEMS: { id: Tab; label: string; iconPath: string }[] = [
  {
    id: 'info',
    label: 'Info',
    iconPath: 'M12 8v4M12 16h.01M12 2a10 10 0 100 20A10 10 0 0012 2z',
  },
  {
    id: 'rules',
    label: 'Reglas',
    iconPath: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
  },
  {
    id: 'design',
    label: 'Diseno',
    iconPath: 'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
  },
]
</script>

<template>
  <Teleport to="body">
    <Transition name="tem-fade">
      <div v-if="modelValue" class="tem-backdrop" @click.self="close">
        <Transition name="tem-dialog" appear>
          <div v-if="modelValue" class="tem-dialog" role="dialog" aria-modal="true">

            <!-- ── Header ──────────────────────────────────────────────── -->
            <div class="tem-header">
              <div class="tem-header-left">
                <div class="tem-header-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary-text)" stroke-width="2" stroke-linecap="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div>
                  <h2 class="tem-title">{{ tier ? 'Editar' : 'Crear' }} Nivel {{ nextLevel }}</h2>
                  <span class="tem-subtitle">{{ wallet.businessName }}</span>
                </div>
              </div>
              <button class="tem-close" :disabled="saving" @click="close" aria-label="Cerrar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- ── Body: sidebar + content ─────────────────────────────── -->
            <div class="tem-body">

              <!-- Left sidebar -->
              <aside class="tem-sidebar">
                <nav class="tem-nav">
                  <button
                    v-for="item in NAV_ITEMS"
                    :key="item.id"
                    class="tem-nav-item"
                    :class="{ 'tem-nav-item--active': activeTab === item.id }"
                    @click="activeTab = item.id"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                      <path :d="item.iconPath"/>
                    </svg>
                    {{ item.label }}
                  </button>
                </nav>

                <!-- Mini level preview card -->
                <div class="tem-preview-wrap">
                  <p class="tem-preview-label">Vista del nivel</p>
                  <div class="tem-preview-card" :style="{ background: previewGradient }">
                    <div class="tem-preview-top">
                      <img
                        v-if="wallet.logoUrl"
                        :src="wallet.logoUrl"
                        class="tem-preview-logo"
                        alt=""
                      />
                      <span class="tem-preview-business">{{ wallet.businessName }}</span>
                    </div>
                    <div class="tem-preview-level-badge">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      {{ form.name || `Nivel ${nextLevel}` }}
                    </div>
                  </div>
                  <p class="tem-preview-note">Actualiza en tiempo real</p>
                </div>

                <!-- Threshold summary -->
                <div class="tem-sidebar-stat">
                  <span class="tem-sidebar-stat-label">Ciclos para subir</span>
                  <span class="tem-sidebar-stat-val">{{ form.threshold }}</span>
                </div>
              </aside>

              <!-- Main content -->
              <div class="tem-content">
                <div class="tem-inner">

                <!-- Banners -->
                <Transition name="banner">
                  <div v-if="apiSuccess" class="banner banner--success">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>
                    Nivel {{ tier ? 'actualizado' : 'creado' }} correctamente.
                  </div>
                </Transition>
                <Transition name="banner">
                  <div v-if="apiError" class="banner banner--error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                    {{ apiError }}
                  </div>
                </Transition>

                <!-- Tab: Info -->
                <template v-if="activeTab === 'info'">
                  <div class="tab-header">
                    <p class="tab-title">Identificacion del nivel</p>
                    <p class="tab-desc">Define el nombre y los ciclos necesarios para que el cliente alcance este nivel.</p>
                  </div>
                  <div class="form-fields">
                    <div class="field-row">
                      <div class="field">
                        <label class="field-label">Nivel</label>
                        <div class="readonly-chip">{{ nextLevel }}</div>
                        <p class="field-hint">Los niveles son contiguos.</p>
                      </div>
                      <div class="field" style="flex: 1;">
                        <label class="field-label">Nombre <span class="required">*</span></label>
                        <input
                          v-model="form.name"
                          type="text"
                          placeholder="Ej. Gold Plus"
                          class="field-input"
                        />
                      </div>
                    </div>

                    <div class="field">
                      <label class="field-label">Ciclos acumulados para desbloquear <span class="required">*</span></label>
                      <div class="stepper-wrap" :class="{ 'stepper-wrap--error': thresholdError }">
                        <button
                          type="button" class="stepper-btn"
                          :disabled="form.threshold <= thresholdMin"
                          @click="form.threshold = Math.max(thresholdMin, form.threshold - 1)"
                        >−</button>
                        <input
                          v-model.number="form.threshold"
                          type="number"
                          :min="thresholdMin"
                          class="field-input stepper-input"
                        />
                        <button type="button" class="stepper-btn" @click="form.threshold++">+</button>
                      </div>
                      <p v-if="thresholdError" class="field-error">{{ thresholdError }}</p>
                      <p v-else class="field-hint">
                        El cliente necesita <strong>{{ form.threshold }} canjes</strong> en total para subir a este nivel. Minimo: {{ thresholdMin }}.
                      </p>
                    </div>
                  </div>
                </template>

                <!-- Tab: Reglas -->
                <template v-else-if="activeTab === 'rules'">
                  <div class="tab-header">
                    <p class="tab-title">Reglas del nivel {{ nextLevel }}</p>
                    <p class="tab-desc">Configura como funciona el programa de lealtad en este nivel.</p>
                  </div>
                  <div class="rules-type-info">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                    Tipo de wallet: <strong>{{ wallet.type }}</strong> — no se puede cambiar.
                  </div>
                  <WalletRulesForm :type="wallet.type" :rules="form.rules" />
                </template>

                <!-- Tab: Diseño -->
                <template v-else-if="activeTab === 'design'">
                  <div class="tab-header">
                    <p class="tab-title">Diseno del nivel {{ nextLevel }}</p>
                    <p class="tab-desc">Opcional. Los campos vacios heredan el diseno base de la wallet.</p>
                  </div>
                  <ThemeEditor :theme="form.theme" :base="themeBase" />
                </template>

                </div><!-- /tem-inner -->
              </div>
            </div>

            <!-- ── Footer ────────────────────────────────────────────── -->
            <div class="tem-footer">
              <button class="btn-cancel" :disabled="saving" @click="close">Cancelar</button>
              <button class="btn-save" :disabled="saving || !isValid" @click="save">
                <svg v-if="saving" class="spin" width="13" height="13" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9"/>
                </svg>
                {{ saving ? 'Guardando...' : (tier ? 'Guardar cambios' : `Crear Nivel ${nextLevel}`) }}
              </button>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Backdrop ─────────────────────────────────────────────────────────────── */
.tem-backdrop {
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

/* ── Dialog ───────────────────────────────────────────────────────────────── */
.tem-dialog {
  width: 100%;
  max-width: 860px;
  max-height: 90vh;
  background: var(--bg-surface);
  border-radius: 20px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22), 0 0 0 1px var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ───────────────────────────────────────────────────────────────── */
.tem-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.tem-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tem-header-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tem-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0 0 2px;
}

.tem-subtitle {
  font-size: 12px;
  color: var(--text-muted);
}

.tem-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;
}
.tem-close:hover { background: var(--bg-page); color: var(--text-ink); }
.tem-close:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Body layout: sidebar + content ───────────────────────────────────────── */
.tem-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

/* ── Sidebar ──────────────────────────────────────────────────────────────── */
.tem-sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: var(--bg-page, var(--bg-field));
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  padding: 16px 12px;
}

/* Vertical nav */
.tem-nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 20px;
}

.tem-nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px 12px;
  border-radius: 9px;
  border: none;
  background: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.13s, color 0.13s;
}
.tem-nav-item:hover { background: var(--bg-subtle); color: var(--text-ink); }
.tem-nav-item--active {
  background: var(--primary-light);
  color: var(--primary-text);
}
.tem-nav-item--active svg { stroke: var(--primary-text); }

/* Mini preview card */
.tem-preview-wrap {
  padding: 0 4px;
  margin-bottom: 16px;
}

.tem-preview-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
  margin: 0 0 8px;
}

.tem-preview-card {
  border-radius: 12px;
  padding: 14px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14);
  min-height: 90px;
  transition: background 0.3s;
}

.tem-preview-top {
  display: flex;
  align-items: center;
  gap: 7px;
}

.tem-preview-logo {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  object-fit: contain;
  background: rgba(255,255,255,0.2);
  flex-shrink: 0;
}

.tem-preview-business {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,255,255,0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tem-preview-level-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 700;
  color: rgba(255,255,255,0.95);
  background: rgba(255,255,255,0.18);
  border-radius: 999px;
  padding: 3px 9px;
  width: fit-content;
}

.tem-preview-note {
  font-size: 10px;
  color: var(--text-faint);
  margin: 6px 0 0;
  text-align: center;
}

/* Sidebar stat */
.tem-sidebar-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 8px;
  border-radius: 9px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
}

.tem-sidebar-stat-label {
  font-size: 11px;
  color: var(--text-faint);
  font-weight: 500;
}

.tem-sidebar-stat-val {
  font-size: 14px;
  font-weight: 700;
  color: var(--primary-text);
}

/* ── Content area ─────────────────────────────────────────────────────────── */
.tem-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  min-width: 0;
}

.tem-inner {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 28px;
  box-sizing: border-box;
}

/* Tab heading */
.tab-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.tab-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0;
}

.tab-desc {
  font-size: 12.5px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}

/* Banners */
.banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 11px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
}
.banner--success { background: var(--primary-light); color: var(--primary-text); }
.banner--error   { background: var(--danger-bg); color: var(--danger); }
.banner svg { flex-shrink: 0; margin-top: 1px; }

/* Form fields */
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-medium);
}

.required { color: var(--danger); }

.field-input {
  width: 100%;
  padding: 9px 12px;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: var(--bg-field, var(--bg-page));
  font-size: 13px;
  color: var(--text-ink);
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.field-input:focus { border-color: var(--primary-mid, var(--primary-text)); }

.field-hint  { font-size: 11.5px; color: var(--text-faint); margin: 0; line-height: 1.5; }
.field-error { font-size: 11.5px; color: var(--danger); margin: 0; }

.readonly-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 38px;
  border-radius: 9px;
  background: var(--bg-page);
  border: 1.5px solid var(--border);
  font-size: 16px;
  font-weight: 800;
  color: var(--primary-text);
  flex-shrink: 0;
}

.stepper-wrap {
  display: flex;
  align-items: stretch;
  border: 1.5px solid var(--border);
  border-radius: 9px;
  overflow: hidden;
  background: var(--bg-surface);
  transition: border-color 0.2s;
}
.stepper-wrap:focus-within { border-color: var(--primary-mid, var(--primary-text)); }
.stepper-wrap--error { border-color: var(--danger); }

.stepper-btn {
  width: 44px;
  flex-shrink: 0;
  background: var(--bg-page);
  border: none;
  font-size: 18px;
  color: var(--text-medium);
  cursor: pointer;
  transition: background 0.12s;
  font-family: inherit;
  line-height: 1;
}
.stepper-btn:hover:not(:disabled) { background: var(--bg-subtle); }
.stepper-btn:disabled { opacity: 0.3; cursor: default; }

.stepper-input {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  text-align: center;
  border-left: 1.5px solid var(--border) !important;
  border-right: 1.5px solid var(--border) !important;
}

.rules-type-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-page);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 12px;
}

/* ── Footer ───────────────────────────────────────────────────────────────── */
.tem-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
  padding: 14px 22px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--bg-surface);
}

.btn-cancel {
  padding: 9px 20px;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: var(--bg-surface);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-medium);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;
}
.btn-cancel:hover:not(:disabled) { background: var(--bg-page); }
.btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-save {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 22px;
  border-radius: 9px;
  border: none;
  background: var(--primary-text);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.12s;
}
.btn-save:hover:not(:disabled) { opacity: 0.88; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Mobile: stack sidebar on top ─────────────────────────────────────────── */
@media (max-width: 680px) {
  .tem-backdrop { padding: 0; align-items: flex-end; }

  .tem-dialog {
    max-width: 100%;
    max-height: 95vh;
    border-radius: 20px 20px 0 0;
  }

  .tem-body { flex-direction: column; }

  .tem-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border);
    flex-direction: row;
    align-items: center;
    padding: 10px 16px;
    gap: 0;
    overflow-x: auto;
    overflow-y: visible;
  }

  .tem-nav {
    flex-direction: row;
    gap: 4px;
    margin-bottom: 0;
    flex-shrink: 0;
  }

  .tem-preview-wrap,
  .tem-sidebar-stat { display: none; }

  .tem-inner { padding: 16px; }
}

/* ── Transitions ──────────────────────────────────────────────────────────── */
.tem-fade-enter-active, .tem-fade-leave-active { transition: opacity 0.22s ease; }
.tem-fade-enter-from, .tem-fade-leave-to { opacity: 0; }

.tem-dialog-enter-active { transition: opacity 0.22s ease, transform 0.24s cubic-bezier(0.34, 1.4, 0.64, 1); }
.tem-dialog-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.tem-dialog-enter-from { opacity: 0; transform: scale(0.94) translateY(10px); }
.tem-dialog-leave-to   { opacity: 0; transform: scale(0.96); }

.banner-enter-active, .banner-leave-active { transition: opacity 0.2s, transform 0.2s; }
.banner-enter-from, .banner-leave-to { opacity: 0; transform: translateY(-6px); }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
</style>
