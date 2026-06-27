<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WalletThemeOverrides, BarcodeFormat, FontKey } from '@/domain/wallet/entities/WalletTheme'
import { resolveTheme } from '@/application/wallet/utils/themeResolver'
import { meetsWcagAA, isValidHex } from '@/application/wallet/utils/contrastValidator'
import { useImgbbUpload } from '@/app/composables/useImgbbUpload'

interface WalletBase {
  primaryColor: string
  accentColor: string
  logoUrl: string | null
  businessName: string
}

// Mutates `theme` directly — same pattern as WalletRulesForm
const props = defineProps<{
  theme: WalletThemeOverrides
  base: WalletBase
  /** Show the live mini-preview card above the fields. Default: false */
  showPreview?: boolean
  /** Hide the logo URL override field (e.g. when logo is handled upstream). Default: false */
  hideLogoOverride?: boolean
}>()

// ── Upload state ───────────────────────────────────────────────────────────
const logoFileInput  = ref<HTMLInputElement | null>(null)
const stripFileInput = ref<HTMLInputElement | null>(null)

const { uploading: uploadingLogo,  error: logoUploadError,  upload: uploadLogoImg  } = useImgbbUpload()
const { uploading: uploadingStrip, error: stripUploadError, upload: uploadStripImg } = useImgbbUpload()

async function handleLogoFile(file: File) {
  ensureAssets()
  const url = await uploadLogoImg(file)
  if (url) props.theme.assets!.logoUrl = url
}

async function handleStripFile(file: File) {
  ensureAssets()
  const url = await uploadStripImg(file)
  if (url) props.theme.assets!.stripImageUrl = url
}

// ── Resolve & contrast ─────────────────────────────────────────────────────
const resolved = computed(() => resolveTheme(props.theme, props.base))

const previewStyle = computed(() => {
  const bg = resolved.value.background
  const to = resolved.value.gradientTo
  return {
    background: to ? `linear-gradient(135deg, ${bg}, ${to})` : bg,
    color: resolved.value.foreground,
    fontFamily: fontFamilyMap[resolved.value.fontKey],
  }
})

const foregroundOk = computed(() => {
  const fg = props.theme.colors?.foreground
  if (!fg || !isValidHex(fg)) return true
  return meetsWcagAA(fg, resolved.value.background)
})

const labelOk = computed(() => {
  const lbl = props.theme.colors?.label
  if (!lbl || !isValidHex(lbl)) return true
  return meetsWcagAA(lbl, resolved.value.background)
})

// ── Constants ──────────────────────────────────────────────────────────────
const fontFamilyMap: Record<FontKey, string> = {
  system:  'system-ui, -apple-system, sans-serif',
  rounded: '"Plus Jakarta Sans", system-ui, sans-serif',
  serif:   'Georgia, "Times New Roman", serif',
  mono:    '"Menlo", "Consolas", "Courier New", monospace',
}

const FONT_OPTIONS: { value: FontKey; label: string }[] = [
  { value: 'system',  label: 'Sistema'    },
  { value: 'rounded', label: 'Redondeada' },
  { value: 'serif',   label: 'Serif'      },
  { value: 'mono',    label: 'Mono'       },
]

const BARCODE_OPTIONS: { value: BarcodeFormat; label: string; hint: string }[] = [
  { value: 'qr',      label: 'QR Code',  hint: 'Universal'    },
  { value: 'pdf417',  label: 'PDF417',   hint: 'Apple Wallet' },
  { value: 'code128', label: 'Code 128', hint: 'Lineal'       },
]

// ── Mutations ──────────────────────────────────────────────────────────────
function ensureColors()     { if (!props.theme.colors)     props.theme.colors     = {} }
function ensureTypography() { if (!props.theme.typography) props.theme.typography = {} }
function ensureBarcode()    { if (!props.theme.barcode)    props.theme.barcode    = {} }
function ensureAssets()     { if (!props.theme.assets)     props.theme.assets     = {} }
function ensureBack()       { if (!props.theme.back)       props.theme.back       = {} }

function setColor(key: keyof NonNullable<WalletThemeOverrides['colors']>, value: string) {
  ensureColors()
  ;(props.theme.colors as Record<string, string>)[key] = value
}

function clearColor(key: keyof NonNullable<WalletThemeOverrides['colors']>) {
  if (props.theme.colors) delete (props.theme.colors as Record<string, unknown>)[key]
}

function toggleGradient() {
  ensureColors()
  if (props.theme.colors!.gradientTo !== undefined) {
    delete props.theme.colors!.gradientTo
  } else {
    props.theme.colors!.gradientTo = resolved.value.accent
  }
}

function setFontKey(v: FontKey) {
  ensureTypography()
  props.theme.typography!.fontKey = v
}

function setBarcodeFormat(v: BarcodeFormat) {
  ensureBarcode()
  props.theme.barcode!.format = v
}
</script>

<template>
  <!-- ── Live preview (opt-in) ─────────────────────────────────────────────── -->
  <div v-if="showPreview" class="te-preview-wrap">
    <div class="te-preview-card" :style="previewStyle">
      <div class="te-preview-header">
        <img
          v-if="resolved.assets.logoUrl"
          :src="resolved.assets.logoUrl"
          alt="Logo"
          class="te-preview-logo"
        />
        <span class="te-preview-name">{{ base.businessName }}</span>
        <span class="te-preview-badge" :style="{ color: resolved.accent }">
          Nivel 1
        </span>
      </div>
      <div class="te-preview-barcode">
        <div v-if="resolved.barcode.format === 'qr'" class="te-barcode-qr">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="2" y="2" width="15" height="15" rx="2" fill="currentColor" opacity="0.9"/>
            <rect x="5" y="5" width="9" height="9" rx="1" :fill="resolved.background"/>
            <rect x="23" y="2" width="15" height="15" rx="2" fill="currentColor" opacity="0.9"/>
            <rect x="26" y="5" width="9" height="9" rx="1" :fill="resolved.background"/>
            <rect x="2" y="23" width="15" height="15" rx="2" fill="currentColor" opacity="0.9"/>
            <rect x="5" y="26" width="9" height="9" rx="1" :fill="resolved.background"/>
            <rect x="23" y="23" width="4" height="4" fill="currentColor" opacity="0.9"/>
            <rect x="29" y="23" width="4" height="4" fill="currentColor" opacity="0.9"/>
            <rect x="23" y="29" width="4" height="4" fill="currentColor" opacity="0.9"/>
            <rect x="29" y="29" width="4" height="4" fill="currentColor" opacity="0.9"/>
          </svg>
        </div>
        <div v-else class="te-barcode-linear">
          <svg width="80" height="32" viewBox="0 0 80 32" preserveAspectRatio="none">
            <rect v-for="i in 20" :key="i"
              :x="(i - 1) * 4" y="0"
              :width="i % 3 === 0 ? 3 : 2"
              height="32"
              fill="currentColor"
              :opacity="0.6 + (i % 4) * 0.1"
            />
          </svg>
        </div>
        <span class="te-barcode-label">{{ resolved.barcode.format.toUpperCase() }}</span>
      </div>
    </div>
    <p class="te-preview-note">Vista previa en tiempo real · La tarjeta real varía por dispositivo</p>
  </div>

  <!-- ── Colores ───────────────────────────────────────────────────────────── -->
  <div class="te-section">
    <p class="te-section-title">Colores</p>

    <div class="field">
      <label class="field-label">Fondo</label>
      <div class="color-row">
        <input
          type="color"
          class="color-swatch"
          :value="resolved.background"
          @input="setColor('background', ($event.target as HTMLInputElement).value)"
        />
        <span class="color-hex">{{ resolved.background }}</span>
        <button
          v-if="theme.colors?.background"
          type="button"
          class="color-reset"
          title="Restaurar default"
          @click="clearColor('background')"
        >↩</button>
        <span v-else class="color-default-tag">default</span>
      </div>
    </div>

    <div class="field">
      <label class="field-label">Texto principal</label>
      <div class="color-row">
        <input
          type="color"
          class="color-swatch"
          :value="resolved.foreground"
          @input="setColor('foreground', ($event.target as HTMLInputElement).value)"
        />
        <span class="color-hex">{{ resolved.foreground }}</span>
        <button
          v-if="theme.colors?.foreground"
          type="button"
          class="color-reset"
          title="Restaurar default (#FFFFFF)"
          @click="clearColor('foreground')"
        >↩</button>
        <span v-else class="color-default-tag">default</span>
      </div>
      <div v-if="!foregroundOk" class="contrast-warning">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>
        </svg>
        Contraste insuficiente (WCAG AA requiere 4.5:1). El backend rechazará este color.
      </div>
    </div>

    <div class="field">
      <label class="field-label">Etiquetas</label>
      <div class="color-row">
        <input
          type="color"
          class="color-swatch"
          :value="resolved.label"
          @input="setColor('label', ($event.target as HTMLInputElement).value)"
        />
        <span class="color-hex">{{ resolved.label }}</span>
        <button
          v-if="theme.colors?.label"
          type="button"
          class="color-reset"
          title="Restaurar default (#FFFFFF)"
          @click="clearColor('label')"
        >↩</button>
        <span v-else class="color-default-tag">default</span>
      </div>
      <div v-if="!labelOk" class="contrast-warning">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>
        </svg>
        Contraste insuficiente (WCAG AA requiere 4.5:1). El backend rechazará este color.
      </div>
    </div>

    <div class="field">
      <label class="field-label">Color acento</label>
      <div class="color-row">
        <input
          type="color"
          class="color-swatch"
          :value="resolved.accent"
          @input="setColor('accent', ($event.target as HTMLInputElement).value)"
        />
        <span class="color-hex">{{ resolved.accent }}</span>
        <button
          v-if="theme.colors?.accent"
          type="button"
          class="color-reset"
          title="Restaurar default (color acento de la wallet)"
          @click="clearColor('accent')"
        >↩</button>
        <span v-else class="color-default-tag">default</span>
      </div>
    </div>

    <div class="field">
      <div class="gradient-toggle-row">
        <label class="field-label">Degradado de fondo</label>
        <button type="button" class="toggle-switch" :class="{ 'toggle-switch--on': theme.colors?.gradientTo !== undefined }" @click="toggleGradient">
          <span class="toggle-knob" />
        </button>
      </div>
      <p class="field-hint">Añade un degradado del color de fondo hacia un segundo tono.</p>
      <div v-if="theme.colors?.gradientTo !== undefined" class="color-row" style="margin-top: 6px;">
        <input
          type="color"
          class="color-swatch"
          :value="theme.colors.gradientTo || resolved.accent"
          @input="setColor('gradientTo', ($event.target as HTMLInputElement).value)"
        />
        <span class="color-hex">{{ theme.colors.gradientTo || resolved.accent }}</span>
      </div>
    </div>
  </div>

  <!-- ── Tipografía ────────────────────────────────────────────────────────── -->
  <div class="te-section">
    <p class="te-section-title">Tipografía</p>
    <div class="field">
      <label class="field-label">Fuente</label>
      <div class="pill-group">
        <button
          v-for="opt in FONT_OPTIONS"
          :key="opt.value"
          type="button"
          class="pill"
          :class="{ 'pill--active': resolved.fontKey === opt.value }"
          :style="{ fontFamily: fontFamilyMap[opt.value] }"
          @click="setFontKey(opt.value)"
        >{{ opt.label }}</button>
      </div>
      <p class="field-hint">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="vertical-align: middle; margin-right: 3px;">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
        </svg>
        Aplica a la <strong>vista web</strong> del pase. Apple Wallet y Google Wallet usan siempre la fuente del sistema operativo.
      </p>
    </div>
  </div>

  <!-- ── Código de barras ──────────────────────────────────────────────────── -->
  <div class="te-section">
    <p class="te-section-title">Código de barras</p>
    <div class="field">
      <label class="field-label">Formato</label>
      <div class="pill-group">
        <button
          v-for="opt in BARCODE_OPTIONS"
          :key="opt.value"
          type="button"
          class="pill pill--with-hint"
          :class="{ 'pill--active': resolved.barcode.format === opt.value }"
          @click="setBarcodeFormat(opt.value)"
        >
          <span class="pill-label">{{ opt.label }}</span>
          <span class="pill-sublabel">{{ opt.hint }}</span>
        </button>
      </div>
    </div>
    <div class="field">
      <label class="field-label">Texto alternativo <span class="field-label-hint">(opcional)</span></label>
      <input
        type="text"
        class="field-input"
        placeholder="Ej. ID del pase"
        :value="theme.barcode?.altText ?? ''"
        @input="(ensureBarcode(), props.theme.barcode!.altText = ($event.target as HTMLInputElement).value || null)"
      />
      <p class="field-hint">Texto visible debajo del código. Déjalo vacío para usar el valor por defecto.</p>
    </div>
  </div>

  <!-- ── Assets visuales ──────────────────────────────────────────────────── -->
  <div class="te-section">
    <p class="te-section-title">Assets visuales</p>

    <!-- Logo override (hidden when managed upstream, e.g. creation wizard) -->
    <div v-if="!hideLogoOverride" class="field">
      <label class="field-label">
        Logo
        <span class="field-label-hint">(sobreescribe el logo de la wallet)</span>
      </label>
      <input
        ref="logoFileInput"
        type="file"
        accept="image/*"
        style="display: none;"
        @change="(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleLogoFile(f) }"
      />

      <div v-if="theme.assets?.logoUrl && !uploadingLogo" class="image-preview-row">
        <img :src="theme.assets.logoUrl" alt="Logo" class="image-thumb-square" />
        <div class="image-preview-info">
          <p class="image-preview-title">Logo cargado</p>
          <p class="image-preview-url">{{ theme.assets.logoUrl }}</p>
        </div>
        <button type="button" class="btn-change" @click="(ensureAssets(), props.theme.assets!.logoUrl = null)">
          Cambiar
        </button>
      </div>

      <div
        v-else
        class="upload-zone"
        :class="{ 'upload-zone--disabled': uploadingLogo }"
        @click="logoFileInput?.click()"
        @dragover.prevent
        @drop.prevent="(e) => { const f = e.dataTransfer?.files?.[0]; if (f) handleLogoFile(f) }"
      >
        <div v-if="uploadingLogo" class="upload-state">
          <svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="1.8" stroke-linecap="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          <p class="upload-label">Subiendo...</p>
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

      <p v-if="logoUploadError" class="field-error">{{ logoUploadError }}</p>
    </div>

    <!-- Strip image -->
    <div class="field">
      <label class="field-label">
        Imagen de franja
        <span class="field-label-hint">(stripImage · Apple Wallet)</span>
      </label>
      <input
        ref="stripFileInput"
        type="file"
        accept="image/*"
        style="display: none;"
        @change="(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleStripFile(f) }"
      />

      <div v-if="theme.assets?.stripImageUrl && !uploadingStrip" class="image-preview-row">
        <img :src="theme.assets.stripImageUrl" alt="Strip" class="image-thumb-strip" />
        <div class="image-preview-info">
          <p class="image-preview-title">Imagen cargada</p>
          <p class="image-preview-url">{{ theme.assets.stripImageUrl }}</p>
        </div>
        <button type="button" class="btn-change" @click="(ensureAssets(), props.theme.assets!.stripImageUrl = null)">
          Cambiar
        </button>
      </div>

      <div
        v-else
        class="upload-zone"
        :class="{ 'upload-zone--disabled': uploadingStrip }"
        @click="stripFileInput?.click()"
        @dragover.prevent
        @drop.prevent="(e) => { const f = e.dataTransfer?.files?.[0]; if (f) handleStripFile(f) }"
      >
        <div v-if="uploadingStrip" class="upload-state">
          <svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="1.8" stroke-linecap="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          <p class="upload-label">Subiendo...</p>
        </div>
        <div v-else class="upload-state">
          <div class="upload-icon-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          </div>
          <p class="upload-title">Haz clic o arrastra una imagen</p>
          <p class="upload-label">PNG, JPG · 1125 × 432 px recomendado</p>
        </div>
      </div>

      <p v-if="stripUploadError" class="field-error">{{ stripUploadError }}</p>
      <p class="field-hint">Imagen rectangular que Apple Wallet muestra en la parte superior de la tarjeta.</p>
    </div>
  </div>

  <!-- ── Datos de contacto (reverso) ──────────────────────────────────────── -->
  <div class="te-section">
    <p class="te-section-title">Datos de contacto (reverso del pase)</p>
    <div class="field">
      <label class="field-label">Sitio web</label>
      <input
        type="url"
        class="field-input"
        placeholder="https://tunegocio.com"
        :value="theme.back?.website ?? ''"
        @input="(ensureBack(), props.theme.back!.website = ($event.target as HTMLInputElement).value || null)"
      />
    </div>
    <div class="field">
      <label class="field-label">Teléfono</label>
      <input
        type="tel"
        class="field-input"
        placeholder="+52 81 1234 5678"
        :value="theme.back?.phone ?? ''"
        @input="(ensureBack(), props.theme.back!.phone = ($event.target as HTMLInputElement).value || null)"
      />
    </div>
    <div class="field">
      <label class="field-label">Dirección</label>
      <input
        type="text"
        class="field-input"
        placeholder="Av. Principal 123, Ciudad"
        :value="theme.back?.address ?? ''"
        @input="(ensureBack(), props.theme.back!.address = ($event.target as HTMLInputElement).value || null)"
      />
    </div>
    <div class="field">
      <label class="field-label">Instagram</label>
      <div class="input-prefix-wrap">
        <span class="input-prefix">@</span>
        <input
          type="text"
          class="field-input has-prefix"
          placeholder="tunegocio"
          :value="theme.back?.instagram ?? ''"
          @input="(ensureBack(), props.theme.back!.instagram = ($event.target as HTMLInputElement).value || null)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Preview ─────────────────────────────────────────────────────────────── */
.te-preview-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.te-preview-card {
  width: 100%;
  max-width: 320px;
  border-radius: 16px;
  padding: 16px 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  transition: background 0.2s, color 0.2s;
  min-height: 130px;
}

.te-preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.te-preview-logo {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: contain;
  background: rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
}

.te-preview-name {
  flex: 1;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.95;
}

.te-preview-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  white-space: nowrap;
  flex-shrink: 0;
}

.te-preview-barcode {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  opacity: 0.9;
}

.te-barcode-qr,
.te-barcode-linear {
  display: flex;
  align-items: center;
  justify-content: center;
}

.te-barcode-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  opacity: 0.6;
}

.te-preview-note {
  font-size: 10.5px;
  color: var(--text-faint);
  margin: 0;
  text-align: center;
}

/* ── Sections ────────────────────────────────────────────────────────────── */
.te-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.te-section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-faint);
  margin: 0;
}

/* ── Fields ──────────────────────────────────────────────────────────────── */
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

.field-hint {
  font-size: 11.5px;
  color: var(--text-faint);
  margin: 0;
  line-height: 1.5;
}

.field-error { font-size: 11px; color: var(--danger); }

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

/* ── Color row ───────────────────────────────────────────────────────────── */
.color-row {
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
  flex: 1;
}

.color-reset {
  font-size: 14px;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 5px;
  transition: background 0.12s;
  line-height: 1;
}
.color-reset:hover { background: var(--bg-page); }

.color-default-tag {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-faint);
  background: var(--bg-page);
  border: 1px solid var(--border);
  padding: 2px 7px;
  border-radius: 999px;
  letter-spacing: 0.04em;
}

/* ── Contrast warning ────────────────────────────────────────────────────── */
.contrast-warning {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11.5px;
  color: var(--amber, #b45309);
  background: var(--amber-bg, #fef3c7);
  border: 1px solid rgba(180, 83, 9, 0.25);
  border-radius: 8px;
  padding: 8px 10px;
  line-height: 1.4;
}
.contrast-warning svg { flex-shrink: 0; margin-top: 1px; }

/* ── Gradient toggle ─────────────────────────────────────────────────────── */
.gradient-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toggle-switch {
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background: var(--border);
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.18s;
  flex-shrink: 0;
}
.toggle-switch--on { background: var(--primary-text); }

.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.18s;
  display: block;
}
.toggle-switch--on .toggle-knob { transform: translateX(16px); }

/* ── Pills ───────────────────────────────────────────────────────────────── */
.pill-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pill {
  padding: 8px 14px;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: var(--bg-surface);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.13s;
  line-height: 1;
}
.pill:hover { border-color: var(--text-faint); background: var(--bg-page); }
.pill--active {
  border-color: var(--primary-text);
  background: var(--primary-light);
  color: var(--primary-text);
}

.pill--with-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  flex: 1;
  min-width: 80px;
}

.pill-label    { font-size: 12px; font-weight: 700; }
.pill-sublabel { font-size: 10px; font-weight: 500; opacity: 0.65; }

/* ── Input with prefix ───────────────────────────────────────────────────── */
.input-prefix-wrap { position: relative; }

.input-prefix {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 600;
  pointer-events: none;
}

.field-input.has-prefix { padding-left: 26px; }

/* ── Image upload / preview ──────────────────────────────────────────────── */
.image-preview-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: var(--bg-surface);
}

.image-thumb-square {
  width: 44px;
  height: 44px;
  border-radius: 7px;
  object-fit: contain;
  background: var(--bg-field);
  padding: 3px;
  flex-shrink: 0;
  border: 1px solid var(--border);
}

.image-thumb-strip {
  width: 72px;
  height: 28px;
  border-radius: 5px;
  object-fit: cover;
  background: var(--bg-field);
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
  padding: 22px 16px;
  border-radius: 9px;
  border: 1.5px dashed var(--border);
  background: var(--bg-field);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.upload-zone:hover    { border-color: var(--amber); background: var(--amber-bg); }
.upload-zone--disabled { pointer-events: none; opacity: 0.6; }

.upload-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.upload-icon-wrap {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--bg-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
}

.upload-title { font-size: 12px; font-weight: 600; color: var(--text-medium); margin: 0; }
.upload-label { font-size: 10.5px; color: var(--text-faint); margin: 0; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
</style>
