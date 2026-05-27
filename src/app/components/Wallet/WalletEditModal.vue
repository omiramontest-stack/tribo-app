<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import { walletTypeConfig } from '@/app/config/walletTypeConfig'
import { useImgbbUpload } from '@/app/composables/useImgbbUpload'
import { parseApiError } from '@/app/composables/useApiError'
import WalletRulesForm from '@/app/components/Wallet/WalletRulesForm.vue'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { WalletRules } from '@/domain/wallet/entities/WalletRules'

// ─── Props / Emits ─────────────────────────────────────────────────────────────
const props = defineProps<{ modelValue: boolean; wallet: Wallet }>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  updated: [wallet: Wallet]
}>()

// ─── Store ──────────────────────────────────────────────────────────────────────
const walletStore = useWalletStore()

// ─── Logo upload (composable reutilizable) ──────────────────────────────────────
const logoFileInput = ref<HTMLInputElement | null>(null)
const { uploading: uploadingLogo, error: uploadError, upload: uploadImage } = useImgbbUpload()

async function handleLogoFile(file: File) {
  const url = await uploadImage(file)
  if (url) form.logoUrl = url
}

function onLogoFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleLogoFile(file)
}

function onLogoDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file) handleLogoFile(file)
}

// ─── Type config ───────────────────────────────────────────────────────────────
const wt = computed(
  () => walletTypeConfig.find(c => c.value === props.wallet.type)
    ?? { label: props.wallet.type, iconColor: 'var(--text-muted)', iconBg: 'var(--bg-page)', iconPath: '' },
)

// ─── Form state ────────────────────────────────────────────────────────────────
// Deep-clone on every open so canceling leaves the original intact.
interface EditForm {
  businessName: string
  logoUrl: string
  primaryColor: string
  accentColor: string
  description: string
  businessRules: string
  rules: WalletRules
}

function buildForm(w: Wallet): EditForm {
  return {
    businessName:  w.businessName,
    logoUrl:       w.logoUrl ?? '',
    primaryColor:  w.primaryColor,
    accentColor:   w.accentColor,
    description:   w.description ?? '',
    businessRules: w.businessRules ?? '',
    rules:         JSON.parse(JSON.stringify(w.rules)) as WalletRules,
  }
}

const form = reactive<EditForm>(buildForm(props.wallet))

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      // Re-sync with the current wallet every time the drawer opens
      Object.assign(form, buildForm(props.wallet))
      uploadError.value = ''
      apiError.value    = ''
      apiSuccess.value  = false
    }
  },
)

// ─── Save ──────────────────────────────────────────────────────────────────────
const saving     = ref(false)
const apiError   = ref('')
const apiSuccess = ref(false)

async function save() {
  if (!form.businessName.trim()) return

  saving.value     = true
  apiError.value   = ''
  apiSuccess.value = false

  try {
    const updated = await walletStore.updateWallet(props.wallet.id, {
      businessName:  form.businessName.trim(),
      logoUrl:       form.logoUrl.trim() || null,
      primaryColor:  form.primaryColor,
      accentColor:   form.accentColor,
      description:   form.description.trim(),
      businessRules: form.businessRules.trim() || null,
      rules:         form.rules,
    })
    apiSuccess.value = true
    emit('updated', updated)
    setTimeout(() => emit('update:modelValue', false), 900)
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

        <!-- ── Drawer header ─────────────────────────────────────────────── -->
        <div class="drawer-header">
          <div class="drawer-title-row">
            <div class="drawer-title-icon" :style="{ background: wt.iconBg }">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                   stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"
                   :stroke="wt.iconColor">
                <path :d="wt.iconPath" />
              </svg>
            </div>
            <div>
              <h2 class="drawer-title">Editar wallet</h2>
              <span class="drawer-type-badge" :style="{ color: wt.iconColor, background: wt.iconBg }">
                {{ wt.label }}
              </span>
            </div>
          </div>
          <button class="drawer-close" :disabled="saving" @click="close" aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- ── Scrollable body ───────────────────────────────────────────── -->
        <div class="drawer-body">

          <!-- Success banner -->
          <Transition name="banner">
            <div v-if="apiSuccess" class="banner banner--success">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
              Wallet actualizada. Los dispositivos de tus clientes se actualizarán automáticamente.
            </div>
          </Transition>

          <!-- Error banner -->
          <Transition name="banner">
            <div v-if="apiError" class="banner banner--error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              {{ apiError }}
            </div>
          </Transition>

          <!-- ── Branding section ──────────────────────────────────────── -->
          <section class="form-section">
            <p class="section-title">Branding</p>

            <!-- Business name -->
            <div class="field">
              <label class="field-label">Nombre del negocio <span class="required">*</span></label>
              <input
                v-model="form.businessName"
                type="text"
                placeholder="Ej. Cucara Macara Espresso"
                class="field-input"
              />
            </div>

            <!-- Logo upload -->
            <div class="field">
              <label class="field-label">Logo <span class="field-label-hint">(opcional)</span></label>
              <input ref="logoFileInput" type="file" accept="image/*" style="display:none;" @change="onLogoFileChange" />

              <div v-if="form.logoUrl && !uploadingLogo" class="image-preview-row">
                <img :src="form.logoUrl" alt="Logo" class="image-thumb" />
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
                @click="logoFileInput?.click()"
                @dragover.prevent
                @drop.prevent="onLogoDrop"
              >
                <div v-if="uploadingLogo" class="upload-state">
                  <svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="1.8" stroke-linecap="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  <p class="upload-label">Subiendo imagen…</p>
                </div>
                <div v-else class="upload-state">
                  <div class="upload-icon-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
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
            <div class="form-grid-2">
              <div class="field">
                <label class="field-label">Color principal</label>
                <div class="color-picker-row">
                  <input v-model="form.primaryColor" type="color" class="color-swatch" />
                  <span class="color-hex">{{ form.primaryColor }}</span>
                  <span class="color-preview-dot" :style="{ background: form.primaryColor }" />
                </div>
              </div>
              <div class="field">
                <label class="field-label">Color acento</label>
                <div class="color-picker-row">
                  <input v-model="form.accentColor" type="color" class="color-swatch" />
                  <span class="color-hex">{{ form.accentColor }}</span>
                  <span class="color-preview-dot accent" :style="{ background: form.accentColor }" />
                </div>
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

            <!-- Description -->
            <div class="field">
              <label class="field-label">Descripción <span class="field-label-hint">(opcional)</span></label>
              <textarea
                v-model="form.description"
                rows="2"
                placeholder="Descripción breve del programa de lealtad…"
                class="field-input"
                style="resize: none;"
              />
            </div>

            <!-- Business rules / T&C -->
            <div class="field">
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
          </section>

          <!-- ── Rules section ─────────────────────────────────────────── -->
          <section class="form-section">
            <p class="section-title">Reglas de {{ wt.label }}</p>
            <WalletRulesForm :type="wallet.type" :rules="form.rules" />
          </section>

        </div>

        <!-- ── Sticky footer ─────────────────────────────────────────────── -->
        <div class="drawer-footer">
          <button class="btn-cancel" :disabled="saving" @click="close">Cancelar</button>
          <button
            class="btn-save"
            :disabled="saving || !form.businessName.trim()"
            @click="save"
          >
            <svg v-if="saving" class="spin" width="13" height="13" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9"/>
            </svg>
            {{ saving ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </div>

      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Backdrop ──────────────────────────────────────────────────────────────── */
.edit-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9100;
  background: var(--overlay);
  backdrop-filter: blur(2px);
}

/* ── Drawer ────────────────────────────────────────────────────────────────── */
.edit-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 9110;
  width: 100%;
  max-width: 560px;
  background: var(--bg-surface);
  box-shadow: -4px 0 40px rgba(0, 0, 0, 0.14);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ────────────────────────────────────────────────────────────────── */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.drawer-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drawer-title-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.drawer-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0 0 3px;
}

.drawer-type-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}

.drawer-close {
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
.drawer-close:hover { background: var(--bg-page); color: var(--text-ink); }
.drawer-close:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Body ──────────────────────────────────────────────────────────────────── */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Banners ───────────────────────────────────────────────────────────────── */
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
.banner--success {
  background: var(--primary-light);
  color: var(--primary-text);
  border: 1px solid var(--primary-border, var(--border));
}
.banner--error {
  background: var(--danger-bg);
  color: var(--danger);
  border: 1px solid var(--danger-border, var(--danger-bg));
}
.banner svg { flex-shrink: 0; margin-top: 1px; }

/* ── Form sections ─────────────────────────────────────────────────────────── */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-faint);
  margin: 0;
}

/* ── Fields (shared with WalletCreateView) ─────────────────────────────────── */
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

.field-label-hint {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-faint);
}

.required { color: var(--danger); margin-left: 1px; }

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

.field-hint {
  font-size: 11.5px;
  color: var(--text-faint);
  margin: 0;
  line-height: 1.5;
}

.field-error {
  font-size: 11.5px;
  color: var(--danger);
  margin: 0;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* ── Logo upload ───────────────────────────────────────────────────────────── */
.upload-zone {
  border: 2px dashed var(--border);
  border-radius: 10px;
  padding: 18px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  text-align: center;
}
.upload-zone:hover:not(.upload-zone--disabled) {
  border-color: var(--amber);
  background: var(--amber-bg);
}
.upload-zone--disabled { cursor: not-allowed; opacity: 0.6; }

.upload-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
}

.upload-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--bg-subtle);
  display: grid;
  place-items: center;
}

.upload-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-medium);
  margin: 0;
}

.upload-label {
  font-size: 11px;
  color: var(--text-faint);
  margin: 0;
}

.image-preview-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  background: var(--bg-field, var(--bg-page));
}

.image-thumb {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  object-fit: contain;
  background: var(--bg-page);
  flex-shrink: 0;
}

.image-preview-info {
  flex: 1;
  min-width: 0;
}

.image-preview-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-medium);
  margin: 0 0 2px;
}

.image-preview-url {
  font-size: 11px;
  color: var(--text-faint);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-change {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--primary-mid, var(--primary-text));
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  padding: 0;
}

/* ── Color picker ──────────────────────────────────────────────────────────── */
.color-picker-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  padding: 2px;
  cursor: pointer;
  background: none;
  flex-shrink: 0;
}

.color-hex {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-medium);
  font-family: 'Menlo', 'Consolas', monospace;
}

.color-preview-dot {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}
.color-preview-dot.accent { opacity: 0.75; }

.color-preview-strip {
  border-radius: 10px;
  overflow: hidden;
  height: 36px;
  position: relative;
}

.strip-fill {
  position: absolute;
  inset: 0;
}

.strip-info {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.strip-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.03em;
}

.strip-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  border: 1.5px solid rgba(255,255,255,0.4);
}
.strip-dot.accent { opacity: 0.75; }

/* ── Footer ────────────────────────────────────────────────────────────────── */
.drawer-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--bg-surface);
}

.btn-cancel {
  padding: 9px 18px;
  border-radius: 9px;
  border: 1px solid var(--border);
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
  padding: 9px 20px;
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

/* ── Transitions ───────────────────────────────────────────────────────────── */
.edit-backdrop-enter-active,
.edit-backdrop-leave-active { transition: opacity 0.22s ease; }
.edit-backdrop-enter-from,
.edit-backdrop-leave-to { opacity: 0; }

.edit-drawer-enter-active,
.edit-drawer-leave-active { transition: transform 0.26s cubic-bezier(0.4, 0, 0.2, 1); }
.edit-drawer-enter-from,
.edit-drawer-leave-to { transform: translateX(100%); }

.banner-enter-active,
.banner-leave-active { transition: opacity 0.2s, transform 0.2s; }
.banner-enter-from,
.banner-leave-to { opacity: 0; transform: translateY(-6px); }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
</style>
