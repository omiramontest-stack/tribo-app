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

// ─── Props / Emits ─────────────────────────────────────────────────────────────
const props = defineProps<{
  modelValue: boolean
  wallet: Wallet
  tier: WalletTier | null      // null = crear nuevo
  nextLevel: number            // nivel que se va a crear/editar
  prevThreshold: number        // umbral del nivel anterior (0 si es el primero después del base)
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  saved: [tier: WalletTier]
}>()

// ─── Store ──────────────────────────────────────────────────────────────────────
const tierStore = useTierStore()

// ─── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'info' | 'rules' | 'design'
const activeTab = ref<Tab>('info')

// ─── Form state ────────────────────────────────────────────────────────────────
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

// Threshold must be strictly > prevThreshold
const thresholdMin = computed(() => props.prevThreshold + 1)
const thresholdError = computed(() =>
  form.threshold < thresholdMin.value
    ? `Debe ser mayor al nivel anterior (mín. ${thresholdMin.value} ciclos)`
    : '',
)

// Base for ThemeEditor preview (uses wallet branding + tier theme background as override)
const themeBase = computed(() => ({
  primaryColor: props.wallet.primaryColor,
  accentColor:  props.wallet.accentColor,
  logoUrl:      props.wallet.logoUrl,
  businessName: form.name || props.wallet.businessName,
}))

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      Object.assign(form, buildForm())
      apiError.value  = ''
      apiSuccess.value = false
      activeTab.value = 'info'
    }
  },
)

// ─── Save ──────────────────────────────────────────────────────────────────────
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
</script>

<template>
  <Teleport to="body">
    <Transition name="edit-backdrop">
      <div v-if="modelValue" class="edit-backdrop" @click.self="close" />
    </Transition>

    <Transition name="edit-drawer">
      <div v-if="modelValue" class="edit-drawer" role="dialog" aria-modal="true">

        <!-- ── Header ────────────────────────────────────────────────────── -->
        <div class="drawer-header">
          <div class="drawer-title-row">
            <div class="drawer-title-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary-text)" stroke-width="2" stroke-linecap="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div>
              <h2 class="drawer-title">{{ tier ? 'Editar' : 'Añadir' }} Nivel {{ nextLevel }}</h2>
              <span class="drawer-subtitle">{{ wallet.businessName }}</span>
            </div>
          </div>
          <button class="drawer-close" :disabled="saving" @click="close" aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- ── Tabs ──────────────────────────────────────────────────────── -->
        <div class="drawer-tabs">
          <button class="tab-btn" :class="{ 'tab-btn--active': activeTab === 'info' }" @click="activeTab = 'info'">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            Info
          </button>
          <button class="tab-btn" :class="{ 'tab-btn--active': activeTab === 'rules' }" @click="activeTab = 'rules'">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            Reglas
          </button>
          <button class="tab-btn" :class="{ 'tab-btn--active': activeTab === 'design' }" @click="activeTab = 'design'">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="13.5" cy="6.5" r="2.5"/><circle cx="19" cy="17" r="2"/><circle cx="6" cy="17" r="2"/>
              <path d="M12 22s-5-2-5-10M12 22s5-2 5-10M6.5 8.5l3.5 7M17.5 8.5l-3.5 7"/>
            </svg>
            Diseño
          </button>
        </div>

        <!-- ── Body ──────────────────────────────────────────────────────── -->
        <div class="drawer-body">

          <!-- Banners -->
          <Transition name="banner">
            <div v-if="apiSuccess" class="banner banner--success">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>
              Nivel {{ tier ? 'actualizado' : 'creado' }} correctamente.
            </div>
          </Transition>
          <Transition name="banner">
            <div v-if="apiError" class="banner banner--error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              {{ apiError }}
            </div>
          </Transition>

          <!-- ── Tab: Info ────────────────────────────────────────────────── -->
          <template v-if="activeTab === 'info'">
            <section class="form-section">
              <p class="section-title">Identificación del nivel</p>

              <!-- Nivel (readonly) -->
              <div class="field">
                <label class="field-label">Nivel</label>
                <div class="readonly-chip">{{ nextLevel }}</div>
                <p class="field-hint">Los niveles son contiguos; solo puedes crear el siguiente ({{ nextLevel }}).</p>
              </div>

              <!-- Nombre -->
              <div class="field">
                <label class="field-label">Nombre <span class="required">*</span></label>
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="Ej. Duo Pass Plus"
                  class="field-input"
                />
              </div>

              <!-- Umbral de desbloqueo -->
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
                  <button
                    type="button" class="stepper-btn"
                    @click="form.threshold++"
                  >+</button>
                </div>
                <p v-if="thresholdError" class="field-error">{{ thresholdError }}</p>
                <p v-else class="field-hint">
                  El cliente necesita completar <strong>{{ form.threshold }} canjes</strong> (ciclos) en total para subir a este nivel.
                  Mínimo: {{ thresholdMin }}.
                </p>
              </div>
            </section>
          </template>

          <!-- ── Tab: Reglas ──────────────────────────────────────────────── -->
          <template v-else-if="activeTab === 'rules'">
            <section class="form-section">
              <p class="section-title">Reglas del nivel {{ nextLevel }}</p>
              <div class="rules-type-info">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                Tipo heredado de la wallet: <strong>{{ wallet.type }}</strong>. No se puede cambiar.
              </div>
              <WalletRulesForm :type="wallet.type" :rules="form.rules" />
            </section>
          </template>

          <!-- ── Tab: Diseño ──────────────────────────────────────────────── -->
          <template v-else-if="activeTab === 'design'">
            <section class="form-section">
              <p class="section-title">Diseño del nivel {{ nextLevel }}</p>
              <p class="section-hint">
                Opcional. Personaliza el aspecto de la tarjeta cuando el cliente alcance este nivel.
                Los campos vacíos heredan el diseño base de la wallet.
              </p>
              <ThemeEditor :theme="form.theme" :base="themeBase" />
            </section>
          </template>

        </div>

        <!-- ── Footer ────────────────────────────────────────────────────── -->
        <div class="drawer-footer">
          <button class="btn-cancel" :disabled="saving" @click="close">Cancelar</button>
          <button class="btn-save" :disabled="saving || !isValid" @click="save">
            <svg v-if="saving" class="spin" width="13" height="13" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9"/>
            </svg>
            {{ saving ? 'Guardando…' : (tier ? 'Guardar cambios' : `Crear Nivel ${nextLevel}`) }}
          </button>
        </div>

      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.edit-backdrop {
  position: fixed; inset: 0; z-index: 9100;
  background: var(--overlay); backdrop-filter: blur(2px);
}

.edit-drawer {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 9110;
  width: 100%; max-width: 520px;
  background: var(--bg-surface);
  box-shadow: -4px 0 40px rgba(0,0,0,0.14);
  display: flex; flex-direction: column; overflow: hidden;
}

.drawer-header {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 18px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}

.drawer-title-row { display: flex; align-items: center; gap: 10px; }

.drawer-title-icon {
  width: 34px; height: 34px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; background: var(--primary-light);
}

.drawer-title { font-size: 15px; font-weight: 700; color: var(--text-ink); margin: 0 0 2px; }
.drawer-subtitle { font-size: 11.5px; color: var(--text-muted); }

.drawer-close {
  width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg-surface); color: var(--text-muted);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: background 0.12s, color 0.12s;
}
.drawer-close:hover { background: var(--bg-page); color: var(--text-ink); }
.drawer-close:disabled { opacity: 0.4; cursor: not-allowed; }

.drawer-tabs {
  display: flex; gap: 4px; padding: 10px 20px;
  border-bottom: 1px solid var(--border); flex-shrink: 0;
}

.tab-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px; border: 1px solid transparent;
  background: none; font-size: 12.5px; font-weight: 600;
  color: var(--text-muted); cursor: pointer; font-family: inherit;
  transition: background 0.13s, color 0.13s;
}
.tab-btn:hover { background: var(--bg-page); color: var(--text-ink); }
.tab-btn--active { background: var(--primary-light); color: var(--primary-text); }

.drawer-body {
  flex: 1; overflow-y: auto; padding: 20px;
  display: flex; flex-direction: column; gap: 20px;
}

.banner {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 11px 14px; border-radius: 10px; font-size: 13px;
  font-weight: 500; line-height: 1.45;
}
.banner--success { background: var(--primary-light); color: var(--primary-text); border: 1px solid var(--primary-border, var(--border)); }
.banner--error   { background: var(--danger-bg); color: var(--danger); border: 1px solid var(--danger-border, var(--danger-bg)); }
.banner svg { flex-shrink: 0; margin-top: 1px; }

.form-section { display: flex; flex-direction: column; gap: 16px; }

.section-title {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.07em; color: var(--text-faint); margin: 0;
}

.section-hint { font-size: 12.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

.field { display: flex; flex-direction: column; gap: 6px; }

.field-label { font-size: 12.5px; font-weight: 600; color: var(--text-medium); }

.required { color: var(--danger); }

.field-input {
  width: 100%; padding: 9px 12px; border-radius: 9px;
  border: 1.5px solid var(--border); background: var(--bg-field, var(--bg-page));
  font-size: 13px; color: var(--text-ink); font-family: inherit;
  outline: none; transition: border-color 0.15s; box-sizing: border-box;
}
.field-input:focus { border-color: var(--primary-mid, var(--primary-text)); }

.field-hint { font-size: 11.5px; color: var(--text-faint); margin: 0; line-height: 1.5; }
.field-error { font-size: 11.5px; color: var(--danger); margin: 0; }

.readonly-chip {
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 36px; border-radius: 9px;
  background: var(--bg-page); border: 1.5px solid var(--border);
  font-size: 15px; font-weight: 700; color: var(--primary-text);
}

.stepper-wrap {
  display: flex; align-items: stretch; border: 1.5px solid var(--border);
  border-radius: 9px; overflow: hidden; background: var(--bg-surface);
  transition: border-color 0.2s;
}
.stepper-wrap:focus-within { border-color: var(--primary-mid, var(--primary-text)); }
.stepper-wrap--error { border-color: var(--danger); }

.stepper-btn {
  width: 40px; flex-shrink: 0; background: var(--bg-page); border: none;
  font-size: 17px; color: var(--text-medium); cursor: pointer;
  transition: background 0.12s; font-family: inherit; line-height: 1;
}
.stepper-btn:hover:not(:disabled) { background: var(--bg-subtle); }
.stepper-btn:disabled { opacity: 0.3; cursor: default; }

.stepper-input {
  border: none !important; border-radius: 0 !important; box-shadow: none !important;
  text-align: center;
  border-left: 1.5px solid var(--border) !important;
  border-right: 1.5px solid var(--border) !important;
}

.rules-type-info {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--text-muted);
  background: var(--bg-page); border: 1px solid var(--border);
  border-radius: 8px; padding: 9px 12px;
}

.drawer-footer {
  display: flex; gap: 10px; justify-content: flex-end;
  padding: 14px 20px; border-top: 1px solid var(--border);
  flex-shrink: 0; background: var(--bg-surface);
}

.btn-cancel {
  padding: 9px 18px; border-radius: 9px; border: 1px solid var(--border);
  background: var(--bg-surface); font-size: 13px; font-weight: 600;
  color: var(--text-medium); cursor: pointer; font-family: inherit;
  transition: background 0.12s;
}
.btn-cancel:hover:not(:disabled) { background: var(--bg-page); }
.btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-save {
  display: flex; align-items: center; gap: 7px;
  padding: 9px 20px; border-radius: 9px; border: none;
  background: var(--primary-text); color: #fff; font-size: 13px;
  font-weight: 700; cursor: pointer; font-family: inherit; transition: opacity 0.12s;
}
.btn-save:hover:not(:disabled) { opacity: 0.88; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

.edit-backdrop-enter-active, .edit-backdrop-leave-active { transition: opacity 0.22s ease; }
.edit-backdrop-enter-from, .edit-backdrop-leave-to { opacity: 0; }

.edit-drawer-enter-active, .edit-drawer-leave-active { transition: transform 0.26s cubic-bezier(0.4,0,0.2,1); }
.edit-drawer-enter-from, .edit-drawer-leave-to { transform: translateX(100%); }

.banner-enter-active, .banner-leave-active { transition: opacity 0.2s, transform 0.2s; }
.banner-enter-from, .banner-leave-to { opacity: 0; transform: translateY(-6px); }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
</style>
