<script setup lang="ts">
import { ref } from 'vue'
import type { WalletType } from '@/domain/wallet/entities/Wallet'
import type {
  WalletRules, StampsRules, MembershipRules, PointsRules,
  CashbackRules, DaypassRules, BundleRules, GiftcardRules, CouponRules,
} from '@/domain/wallet/entities/WalletRules'
import { STAMP_ICONS } from '@/app/config/stampIcons'

defineProps<{ type: WalletType; rules: WalletRules }>()

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY
const uploadingImage = ref(false)
const uploadImageError = ref('')
const imageFileInput = ref<HTMLInputElement | null>(null)

const CURRENCIES = ['MXN', 'USD', 'EUR', 'COP', 'ARS', 'CLP', 'PEN', 'BRL']

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function handleImageFile(file: File, rules: DaypassRules) {
  if (!file.type.startsWith('image/')) { uploadImageError.value = 'Solo se permiten imágenes'; return }
  if (file.size > 4 * 1024 * 1024) { uploadImageError.value = 'La imagen debe pesar menos de 4 MB'; return }
  uploadImageError.value = ''
  uploadingImage.value = true
  try {
    const base64 = await fileToBase64(file)
    const body = new FormData()
    body.append('key', IMGBB_API_KEY)
    body.append('image', base64)
    const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body })
    if (!res.ok) throw new Error()
    const data = await res.json()
    rules.imageUrl = data.data.url as string
  } catch {
    uploadImageError.value = 'No se pudo subir la imagen'
  } finally {
    uploadingImage.value = false
  }
}

function onImageFileChange(e: Event, rules: DaypassRules) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleImageFile(file, rules)
}

function onImageDrop(e: DragEvent, rules: DaypassRules) {
  const file = e.dataTransfer?.files?.[0]
  if (file) handleImageFile(file, rules)
}
</script>

<template>
  <!-- ── Stamps ─────────────────────────────────────────────── -->
  <template v-if="type === 'stamps'">
    <div class="field">
      <label class="field-label">Total de sellos para recompensa</label>
      <div class="stepper-wrap">
        <button
          type="button" class="stepper-btn"
          :disabled="(rules as StampsRules).totalStamps <= 2"
          @click="(rules as StampsRules).totalStamps = Math.max(2, (rules as StampsRules).totalStamps - 1)"
        >−</button>
        <input
          v-model.number="(rules as StampsRules).totalStamps"
          type="number" min="2" max="20"
          class="field-input stepper-input"
        />
        <button
          type="button" class="stepper-btn"
          :disabled="(rules as StampsRules).totalStamps >= 20"
          @click="(rules as StampsRules).totalStamps = Math.min(20, (rules as StampsRules).totalStamps + 1)"
        >+</button>
      </div>
      <p class="field-hint">Cuántos sellos necesita el cliente para reclamar su recompensa (mín. 2, máx. 20).</p>
    </div>
    <div class="field">
      <label class="field-label">Recompensa al completar</label>
      <input
        v-model="(rules as StampsRules).reward"
        type="text" placeholder="Ej. 1 café gratis"
        class="field-input"
      />
      <p class="field-hint">Texto visible para el cliente al completar la tarjeta de sellos.</p>
    </div>
    <div class="field">
      <label class="field-label">Ícono del sello</label>
      <div class="stamp-icon-grid">
        <button
          v-for="ic in STAMP_ICONS"
          :key="ic.id"
          type="button"
          class="stamp-icon-btn"
          :class="{ 'stamp-icon-btn--active': ((rules as StampsRules).stampIcon ?? 'check') === ic.id }"
          :title="ic.label"
          @click="(rules as StampsRules).stampIcon = ic.id"
        >
          <svg viewBox="0 0 24 24" class="stamp-icon-svg" v-html="ic.svg" />
          <span class="stamp-icon-label">{{ ic.label }}</span>
        </button>
      </div>
    </div>
    <div class="field">
      <label class="field-label">
        Vencimiento (días)
        <span class="field-label-hint">(vacío = sin vencimiento)</span>
      </label>
      <div class="stepper-wrap">
        <button
          type="button" class="stepper-btn"
          :disabled="!((rules as StampsRules).expiresInDays)"
          @click="(rules as StampsRules).expiresInDays = Math.max(1, ((rules as StampsRules).expiresInDays ?? 1) - 1)"
        >−</button>
        <input
          v-model.number="(rules as StampsRules).expiresInDays"
          type="number" min="1" placeholder="Sin vencimiento (dejar vacío)"
          class="field-input stepper-input"
        />
        <button
          type="button" class="stepper-btn"
          @click="(rules as StampsRules).expiresInDays = ((rules as StampsRules).expiresInDays ?? 0) + 1"
        >+</button>
      </div>
      <p class="field-hint">Los sellos vencen N días después de emitir el pase.</p>
    </div>
  </template>

  <!-- ── Membership ─────────────────────────────────────────── -->
  <template v-else-if="type === 'membership'">
    <div class="field">
      <label class="field-label">Nivel de membresía</label>
      <input
        v-model="(rules as MembershipRules).level"
        type="text" placeholder="Ej. Gold Member"
        class="field-input"
      />
      <p class="field-hint">Etiqueta de nivel que aparecerá en la tarjeta del cliente.</p>
    </div>
    <div class="field">
      <label class="field-label">
        Vigencia en días
        <span class="field-label-hint">(vacío = sin vencimiento)</span>
      </label>
      <div class="stepper-wrap">
        <button
          type="button" class="stepper-btn"
          :disabled="!((rules as MembershipRules).expiresInDays)"
          @click="(rules as MembershipRules).expiresInDays = Math.max(1, ((rules as MembershipRules).expiresInDays ?? 1) - 1)"
        >−</button>
        <input
          v-model.number="(rules as MembershipRules).expiresInDays"
          type="number" min="1" placeholder="365"
          class="field-input stepper-input"
        />
        <button
          type="button" class="stepper-btn"
          @click="(rules as MembershipRules).expiresInDays = ((rules as MembershipRules).expiresInDays ?? 0) + 1"
        >+</button>
      </div>
      <p class="field-hint">Deja vacío si la membresía no tiene fecha de caducidad.</p>
    </div>
  </template>

  <!-- ── Points ─────────────────────────────────────────────── -->
  <template v-else-if="type === 'points'">
    <div class="field">
      <label class="field-label">Nombre de los puntos</label>
      <input
        v-model="(rules as PointsRules).pointsLabel"
        type="text" placeholder="Ej. puntos"
        class="field-input"
      />
      <p class="field-hint">Cómo se llaman en tu programa. Se muestra en la tarjeta del cliente.</p>
    </div>
    <div class="field">
      <label class="field-label">Puntos para desbloquear recompensa</label>
      <div class="stepper-wrap">
        <button
          type="button" class="stepper-btn"
          :disabled="(rules as PointsRules).rewardThreshold <= 10"
          @click="(rules as PointsRules).rewardThreshold = Math.max(1, (rules as PointsRules).rewardThreshold - 10)"
        >−</button>
        <input
          v-model.number="(rules as PointsRules).rewardThreshold"
          type="number" min="1"
          class="field-input stepper-input"
        />
        <button
          type="button" class="stepper-btn"
          @click="(rules as PointsRules).rewardThreshold += 10"
        >+</button>
      </div>
      <p class="field-hint">Umbral de acumulación para que el cliente pueda canjear la recompensa.</p>
    </div>
    <div class="field">
      <label class="field-label">Recompensa</label>
      <input
        v-model="(rules as PointsRules).reward"
        type="text" placeholder="Ej. Descuento 10%"
        class="field-input"
      />
      <p class="field-hint">Descripción de lo que recibe el cliente al alcanzar el umbral.</p>
    </div>
    <div class="field">
      <label class="field-label">
        Vencimiento (días)
        <span class="field-label-hint">(vacío = sin vencimiento)</span>
      </label>
      <div class="stepper-wrap">
        <button
          type="button" class="stepper-btn"
          :disabled="!((rules as PointsRules).expiresInDays)"
          @click="(rules as PointsRules).expiresInDays = Math.max(1, ((rules as PointsRules).expiresInDays ?? 1) - 1)"
        >−</button>
        <input
          v-model.number="(rules as PointsRules).expiresInDays"
          type="number" min="1" placeholder="Sin vencimiento (dejar vacío)"
          class="field-input stepper-input"
        />
        <button
          type="button" class="stepper-btn"
          @click="(rules as PointsRules).expiresInDays = ((rules as PointsRules).expiresInDays ?? 0) + 1"
        >+</button>
      </div>
      <p class="field-hint">Los puntos vencen N días después de emitir el pase.</p>
    </div>
  </template>

  <!-- ── Cashback ────────────────────────────────────────────── -->
  <template v-else-if="type === 'cashback'">
    <div class="field">
      <label class="field-label">Porcentaje de cashback</label>
      <div class="input-affix-wrap">
        <input
          v-model.number="(rules as CashbackRules).cashbackPercent"
          type="number" min="1" max="100" placeholder="5"
          class="field-input has-suffix"
        />
        <span class="input-suffix">%</span>
      </div>
      <p class="field-hint">Por cada peso gastado, el cliente acumula este porcentaje en su saldo.</p>
    </div>
    <div class="field">
      <label class="field-label">Moneda</label>
      <select v-model="(rules as CashbackRules).currency" class="field-input field-select">
        <option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label">
        Vencimiento (días)
        <span class="field-label-hint">(vacío = sin vencimiento)</span>
      </label>
      <div class="stepper-wrap">
        <button
          type="button" class="stepper-btn"
          :disabled="!((rules as CashbackRules).expiresInDays)"
          @click="(rules as CashbackRules).expiresInDays = Math.max(1, ((rules as CashbackRules).expiresInDays ?? 1) - 1)"
        >−</button>
        <input
          v-model.number="(rules as CashbackRules).expiresInDays"
          type="number" min="1" placeholder="Sin vencimiento (dejar vacío)"
          class="field-input stepper-input"
        />
        <button
          type="button" class="stepper-btn"
          @click="(rules as CashbackRules).expiresInDays = ((rules as CashbackRules).expiresInDays ?? 0) + 1"
        >+</button>
      </div>
      <p class="field-hint">El saldo de cashback vence a los N días.</p>
    </div>
  </template>

  <!-- ── Daypass ─────────────────────────────────────────────── -->
  <template v-else-if="type === 'daypass'">
    <div class="field">
      <label class="field-label">Nombre del evento <span class="required">*</span></label>
      <input
        v-model="(rules as DaypassRules).eventName"
        type="text" placeholder="Ej. Festival de Verano 2026"
        class="field-input"
      />
    </div>
    <div class="field">
      <label class="field-label">Fecha del evento <span class="required">*</span></label>
      <input
        v-model="(rules as DaypassRules).eventDate"
        type="datetime-local"
        class="field-input"
      />
    </div>
    <div class="field">
      <label class="field-label">Lugar / Venue <span class="required">*</span></label>
      <input
        v-model="(rules as DaypassRules).venue"
        type="text" placeholder="Ej. Parque Fundidora, Monterrey"
        class="field-input"
      />
      <p class="field-hint">Nombre del lugar donde se llevará a cabo el evento.</p>
    </div>
    <div class="field">
      <label class="field-label">
        Imagen de fondo
        <span class="field-label-hint">(opcional)</span>
      </label>

      <input
        ref="imageFileInput"
        type="file" accept="image/*"
        style="display: none;"
        @change="onImageFileChange($event, (rules as DaypassRules))"
      />

      <div
        v-if="(rules as DaypassRules).imageUrl && !uploadingImage"
        class="image-preview-row"
      >
        <img :src="(rules as DaypassRules).imageUrl" alt="Imagen de fondo" class="image-thumb" />
        <div class="image-preview-info">
          <p class="image-preview-title">Imagen cargada</p>
          <p class="image-preview-url">{{ (rules as DaypassRules).imageUrl }}</p>
        </div>
        <button type="button" class="btn-change" @click="(rules as DaypassRules).imageUrl = ''">Cambiar</button>
      </div>

      <div
        v-else
        class="upload-zone"
        :class="{ 'upload-zone--disabled': uploadingImage }"
        @click="imageFileInput?.click()"
        @dragover.prevent
        @drop.prevent="onImageDrop($event, (rules as DaypassRules))"
      >
        <div v-if="uploadingImage" class="upload-state">
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
          <p class="upload-label">PNG, JPG · Máx. 4 MB · Landscape recomendado</p>
        </div>
      </div>

      <p v-if="uploadImageError" class="field-error">{{ uploadImageError }}</p>
    </div>
  </template>

  <!-- ── Bundle ──────────────────────────────────────────────── -->
  <template v-else-if="type === 'bundle'">
    <div class="field">
      <label class="field-label">Total de usos del paquete</label>
      <div class="stepper-wrap">
        <button
          type="button" class="stepper-btn"
          :disabled="(rules as BundleRules).totalUses <= 1"
          @click="(rules as BundleRules).totalUses = Math.max(1, (rules as BundleRules).totalUses - 1)"
        >−</button>
        <input
          v-model.number="(rules as BundleRules).totalUses"
          type="number" min="1"
          class="field-input stepper-input"
        />
        <button
          type="button" class="stepper-btn"
          @click="(rules as BundleRules).totalUses++"
        >+</button>
      </div>
      <p class="field-hint">Número total de veces que el cliente puede usar el paquete.</p>
    </div>
    <div class="field">
      <label class="field-label">Etiqueta de usos</label>
      <input
        v-model="(rules as BundleRules).label"
        type="text" placeholder="Ej. clases, sesiones, lavados"
        class="field-input"
      />
      <p class="field-hint">Cómo se llama cada uso en tu servicio (aparece en la tarjeta).</p>
    </div>
    <div class="field">
      <label class="field-label">
        Vencimiento (días)
        <span class="field-label-hint">(vacío = sin vencimiento)</span>
      </label>
      <div class="stepper-wrap">
        <button
          type="button" class="stepper-btn"
          :disabled="!((rules as BundleRules).expiresInDays)"
          @click="(rules as BundleRules).expiresInDays = Math.max(1, ((rules as BundleRules).expiresInDays ?? 1) - 1)"
        >−</button>
        <input
          v-model.number="(rules as BundleRules).expiresInDays"
          type="number" min="1" placeholder="Sin vencimiento (dejar vacío)"
          class="field-input stepper-input"
        />
        <button
          type="button" class="stepper-btn"
          @click="(rules as BundleRules).expiresInDays = ((rules as BundleRules).expiresInDays ?? 0) + 1"
        >+</button>
      </div>
      <p class="field-hint">El paquete vence N días después de ser emitido.</p>
    </div>
  </template>

  <!-- ── Giftcard ────────────────────────────────────────────── -->
  <template v-else-if="type === 'giftcard'">
    <div class="field">
      <label class="field-label">Saldo inicial</label>
      <input
        v-model.number="(rules as GiftcardRules).initialBalance"
        type="number" min="1" placeholder="500"
        class="field-input"
      />
      <p class="field-hint">Monto prepagado que tendrá cada tarjeta al emitirse.</p>
    </div>
    <div class="field">
      <label class="field-label">Moneda</label>
      <select v-model="(rules as GiftcardRules).currency" class="field-input field-select">
        <option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label">
        Vencimiento (días)
        <span class="field-label-hint">(vacío = sin vencimiento)</span>
      </label>
      <div class="stepper-wrap">
        <button
          type="button" class="stepper-btn"
          :disabled="!((rules as GiftcardRules).expiresInDays)"
          @click="(rules as GiftcardRules).expiresInDays = Math.max(1, ((rules as GiftcardRules).expiresInDays ?? 1) - 1)"
        >−</button>
        <input
          v-model.number="(rules as GiftcardRules).expiresInDays"
          type="number" min="1" placeholder="Sin vencimiento (dejar vacío)"
          class="field-input stepper-input"
        />
        <button
          type="button" class="stepper-btn"
          @click="(rules as GiftcardRules).expiresInDays = ((rules as GiftcardRules).expiresInDays ?? 0) + 1"
        >+</button>
      </div>
      <p class="field-hint">La gift card vence a los N días.</p>
    </div>
  </template>

  <!-- ── Coupon ──────────────────────────────────────────────── -->
  <template v-else-if="type === 'coupon'">
    <div class="field">
      <label class="field-label">Tipo de descuento</label>
      <div class="discount-toggle-group">
        <button
          type="button"
          class="discount-toggle"
          :class="{ 'discount-toggle--active': (rules as CouponRules).discountType === 'percent' }"
          @click="(rules as CouponRules).discountType = 'percent'"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
          </svg>
          Porcentaje
        </button>
        <button
          type="button"
          class="discount-toggle"
          :class="{ 'discount-toggle--active': (rules as CouponRules).discountType === 'fixed' }"
          @click="(rules as CouponRules).discountType = 'fixed'"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
          Cantidad fija
        </button>
      </div>
    </div>
    <div class="field">
      <label class="field-label">Valor del descuento</label>
      <div class="input-affix-wrap">
        <input
          v-model.number="(rules as CouponRules).discount"
          type="number" min="1" placeholder="10"
          class="field-input has-suffix"
        />
        <span class="input-suffix">{{ (rules as CouponRules).discountType === 'percent' ? '%' : '$' }}</span>
      </div>
      <p class="field-hint">
        {{ (rules as CouponRules).discountType === 'percent'
          ? 'Porcentaje de descuento aplicado sobre el total de la compra.'
          : 'Monto fijo de descuento en la moneda configurada.' }}
      </p>
    </div>
    <div v-if="(rules as CouponRules).discountType === 'fixed'" class="field">
      <label class="field-label">Moneda</label>
      <select v-model="(rules as CouponRules).currency" class="field-input field-select">
        <option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label">
        Vigencia en días
        <span class="field-label-hint">(vacío = sin vencimiento)</span>
      </label>
      <div class="stepper-wrap">
        <button
          type="button" class="stepper-btn"
          :disabled="!((rules as CouponRules).expiresInDays)"
          @click="(rules as CouponRules).expiresInDays = Math.max(1, ((rules as CouponRules).expiresInDays ?? 1) - 1)"
        >−</button>
        <input
          v-model.number="(rules as CouponRules).expiresInDays"
          type="number" min="1" placeholder="30"
          class="field-input stepper-input"
        />
        <button
          type="button" class="stepper-btn"
          @click="(rules as CouponRules).expiresInDays = ((rules as CouponRules).expiresInDays ?? 0) + 1"
        >+</button>
      </div>
      <p class="field-hint">Deja vacío si el cupón no tiene fecha de caducidad.</p>
    </div>
  </template>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  display: block;
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
.field-input.has-suffix { padding-right: 36px; }

.field-select {
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7A72' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.field-hint {
  font-size: 11px;
  color: var(--text-faint);
  line-height: 1.45;
}

.field-error {
  font-size: 11px;
  color: var(--danger);
}

/* Stepper */
.stepper-wrap {
  display: flex;
  align-items: stretch;
  border: 1.5px solid var(--border);
  border-radius: 9px;
  overflow: hidden;
  background: var(--bg-surface);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.stepper-wrap:focus-within {
  border-color: var(--amber);
  box-shadow: 0 0 0 3px var(--amber-bg);
}

.stepper-btn {
  width: 40px;
  flex-shrink: 0;
  background: var(--bg-page);
  border: none;
  font-size: 17px;
  color: var(--text-medium);
  cursor: pointer;
  transition: background 0.12s;
  font-family: inherit;
  line-height: 1;
}
.stepper-btn:hover:not(:disabled) { background: var(--bg-subtle); color: var(--text-ink); }
.stepper-btn:disabled { opacity: 0.3; cursor: default; }

.stepper-input {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  text-align: center;
  border-left: 1.5px solid var(--border) !important;
  border-right: 1.5px solid var(--border) !important;
}

/* Input with suffix */
.input-affix-wrap { position: relative; }

.input-suffix {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 600;
  pointer-events: none;
}

/* Discount type toggle */
.discount-toggle-group {
  display: flex;
  gap: 8px;
}

.discount-toggle {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: var(--bg-surface);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  transition: all 0.15s;
}
.discount-toggle:hover { border-color: var(--border); background: var(--bg-page); }
.discount-toggle--active {
  border-color: var(--primary);
  background: var(--primary-light);
  color: var(--primary);
}

/* Image preview */
.image-preview-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--bg-surface);
}

.image-thumb {
  width: 64px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
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
  background: var(--bg-page);
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

/* Upload zone */
.upload-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 20px;
  border-radius: 10px;
  border: 1.5px dashed var(--border);
  background: var(--bg-page);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.upload-zone:hover { border-color: var(--amber); background: var(--amber-bg); }
.upload-zone--disabled { pointer-events: none; opacity: 0.6; }

.upload-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

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

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.9s linear infinite; }

/* Stamp icon picker */
.stamp-icon-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.stamp-icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 10px 6px 8px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--bg-surface);
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}
.stamp-icon-btn:hover {
  border-color: var(--amber);
  background: var(--amber-bg);
}
.stamp-icon-btn--active {
  border-color: var(--primary-text);
  border-width: 2px;
  background: var(--primary-light);
  box-shadow: 0 2px 8px rgba(27, 58, 45, 0.12);
}

.stamp-icon-svg {
  width: 22px;
  height: 22px;
  color: var(--text-muted);
}
.stamp-icon-btn--active .stamp-icon-svg {
  color: var(--primary-text);
}

.stamp-icon-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-faint);
  text-align: center;
  line-height: 1;
}
.stamp-icon-btn--active .stamp-icon-label {
  color: var(--primary-text);
}
</style>
