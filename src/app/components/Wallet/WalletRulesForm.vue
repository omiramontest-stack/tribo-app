<script setup lang="ts">
import { ref } from 'vue'
import type { WalletType } from '@/domain/wallet/entities/Wallet'
import type {
  WalletRules,
  StampsRules,
  MembershipRules,
  PointsRules,
  CashbackRules,
  DaypassRules,
  BundleRules,
  GiftcardRules,
  CouponRules,
} from '@/domain/wallet/entities/WalletRules'

defineProps<{ type: WalletType; rules: WalletRules }>()

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY

const uploadingImage = ref(false)
const uploadImageError = ref('')
const imageFileInput = ref<HTMLInputElement | null>(null)

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
  <!-- Stamps -->
  <template v-if="type === 'stamps'">
    <div>
      <label class="field-label">Total de sellos para recompensa</label>
      <input
        v-model.number="(rules as StampsRules).totalStamps"
        type="number" min="2" max="20"
        class="field-input"
      />
    </div>
    <div>
      <label class="field-label">Recompensa al completar</label>
      <input
        v-model="(rules as StampsRules).reward"
        type="text" placeholder="Ej. 1 café gratis"
        class="field-input"
      />
    </div>
  </template>

  <!-- Membership -->
  <template v-else-if="type === 'membership'">
    <div>
      <label class="field-label">Nivel de membresía</label>
      <input
        v-model="(rules as MembershipRules).level"
        type="text" placeholder="Ej. Gold Member"
        class="field-input"
      />
    </div>
    <div>
      <label class="field-label">
        Vigencia en días
        <span class="field-label-hint">(vacío = sin vencimiento)</span>
      </label>
      <input
        v-model.number="(rules as MembershipRules).expiresInDays"
        type="number" min="1" placeholder="365"
        class="field-input"
      />
    </div>
  </template>

  <!-- Points -->
  <template v-else-if="type === 'points'">
    <div>
      <label class="field-label">Nombre de los puntos</label>
      <input
        v-model="(rules as PointsRules).pointsLabel"
        type="text" placeholder="Ej. puntos"
        class="field-input"
      />
    </div>
    <div>
      <label class="field-label">Puntos necesarios para recompensa</label>
      <input
        v-model.number="(rules as PointsRules).rewardThreshold"
        type="number" min="1"
        class="field-input"
      />
    </div>
    <div>
      <label class="field-label">Recompensa</label>
      <input
        v-model="(rules as PointsRules).reward"
        type="text" placeholder="Ej. Descuento 10%"
        class="field-input"
      />
    </div>
  </template>

  <!-- Cashback -->
  <template v-else-if="type === 'cashback'">
    <div>
      <label class="field-label">Porcentaje de cashback</label>
      <div style="position: relative;">
        <input
          v-model.number="(rules as CashbackRules).cashbackPercent"
          type="number" min="1" max="100" placeholder="5"
          class="field-input"
          style="padding-right: 36px;"
        />
        <span class="input-suffix">%</span>
      </div>
    </div>
    <div>
      <label class="field-label">Moneda</label>
      <input
        v-model="(rules as CashbackRules).currency"
        type="text" placeholder="MXN"
        class="field-input"
      />
    </div>
  </template>

  <!-- Daypass -->
  <template v-else-if="type === 'daypass'">
    <div>
      <label class="field-label">Nombre del evento *</label>
      <input
        v-model="(rules as DaypassRules).eventName"
        type="text" placeholder="Ej. Festival de Verano 2026"
        class="field-input"
      />
    </div>
    <div>
      <label class="field-label">Fecha del evento *</label>
      <input
        v-model="(rules as DaypassRules).eventDate"
        type="datetime-local"
        class="field-input"
      />
    </div>
    <div>
      <label class="field-label">Lugar / Venue *</label>
      <input
        v-model="(rules as DaypassRules).venue"
        type="text" placeholder="Ej. Parque Fundidora, Monterrey"
        class="field-input"
      />
    </div>
    <div>
      <label class="field-label">
        Imagen de fondo
        <span class="field-label-hint">(opcional)</span>
      </label>

      <input
        ref="imageFileInput"
        type="file"
        accept="image/*"
        style="display: none;"
        @change="onImageFileChange($event, (rules as DaypassRules))"
      />

      <!-- Preview state -->
      <div
        v-if="(rules as DaypassRules).imageUrl && !uploadingImage"
        style="display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 10px; border: 1.5px solid #ECEFEB; background: #fff;"
      >
        <img
          :src="(rules as DaypassRules).imageUrl"
          alt="Imagen de fondo"
          style="width: 64px; height: 40px; border-radius: 6px; object-fit: cover; background: #F7F4EF;"
        />
        <div style="flex: 1; min-width: 0;">
          <p style="font-size: 12px; font-weight: 600; color: #0F1B14; margin-bottom: 2px;">Imagen cargada</p>
          <p style="font-size: 11px; color: #A8B3AC; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ (rules as DaypassRules).imageUrl }}</p>
        </div>
        <button
          type="button"
          style="font-size: 11px; font-weight: 600; color: #6B7A72; background: #F7F4EF; border: 1px solid #ECEFEB; border-radius: 7px; padding: 5px 10px; cursor: pointer; white-space: nowrap; flex-shrink: 0;"
          @click="(rules as DaypassRules).imageUrl = ''"
        >
          Cambiar
        </button>
      </div>

      <!-- Upload zone -->
      <div
        v-else
        class="upload-zone"
        :class="{ 'upload-zone--disabled': uploadingImage }"
        @click="imageFileInput?.click()"
        @dragover.prevent
        @drop.prevent="onImageDrop($event, (rules as DaypassRules))"
      >
        <div v-if="uploadingImage" style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
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
          <p style="font-size: 11px; color: #A8B3AC;">PNG, JPG · Máx. 4 MB · Landscape recomendado</p>
        </div>
      </div>

      <p v-if="uploadImageError" style="font-size: 11px; color: #DC2626; margin-top: 5px;">{{ uploadImageError }}</p>
    </div>
  </template>

  <!-- Bundle -->
  <template v-else-if="type === 'bundle'">
    <div>
      <label class="field-label">Total de usos del paquete</label>
      <input
        v-model.number="(rules as BundleRules).totalUses"
        type="number" min="1"
        class="field-input"
      />
    </div>
    <div>
      <label class="field-label">Etiqueta de usos</label>
      <input
        v-model="(rules as BundleRules).label"
        type="text" placeholder="Ej. clases, sesiones, lavados"
        class="field-input"
      />
    </div>
  </template>

  <!-- Giftcard -->
  <template v-else-if="type === 'giftcard'">
    <div>
      <label class="field-label">Saldo inicial</label>
      <input
        v-model.number="(rules as GiftcardRules).initialBalance"
        type="number" min="1" placeholder="500"
        class="field-input"
      />
    </div>
    <div>
      <label class="field-label">Moneda</label>
      <input
        v-model="(rules as GiftcardRules).currency"
        type="text" placeholder="MXN"
        class="field-input"
      />
    </div>
  </template>

  <!-- Coupon -->
  <template v-else-if="type === 'coupon'">
    <div>
      <label class="field-label">Tipo de descuento</label>
      <div style="display: flex; gap: 8px;">
        <button
          type="button"
          class="field-input discount-toggle"
          :class="{ 'discount-toggle--active': (rules as CouponRules).discountType === 'percent' }"
          @click="(rules as CouponRules).discountType = 'percent'"
        >
          % Porcentaje
        </button>
        <button
          type="button"
          class="field-input discount-toggle"
          :class="{ 'discount-toggle--active': (rules as CouponRules).discountType === 'fixed' }"
          @click="(rules as CouponRules).discountType = 'fixed'"
        >
          $ Fijo
        </button>
      </div>
    </div>
    <div>
      <label class="field-label">Valor del descuento</label>
      <div style="position: relative;">
        <input
          v-model.number="(rules as CouponRules).discount"
          type="number" min="1" placeholder="10"
          class="field-input"
          style="padding-right: 36px;"
        />
        <span class="input-suffix">{{ (rules as CouponRules).discountType === 'percent' ? '%' : '$' }}</span>
      </div>
    </div>
    <div v-if="(rules as CouponRules).discountType === 'fixed'">
      <label class="field-label">Moneda</label>
      <input
        v-model="(rules as CouponRules).currency"
        type="text" placeholder="MXN"
        class="field-input"
      />
    </div>
    <div>
      <label class="field-label">
        Vigencia en días
        <span class="field-label-hint">(vacío = sin vencimiento)</span>
      </label>
      <input
        v-model.number="(rules as CouponRules).expiresInDays"
        type="number" min="1" placeholder="30"
        class="field-input"
      />
    </div>
  </template>
</template>

<style scoped>
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

.field-input::placeholder {
  color: #A8B3AC;
}

.field-input:focus {
  border-color: #E8920A;
  box-shadow: 0 0 0 3px #FCEBC4;
}

.input-suffix {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: #6B7A72;
  font-weight: 600;
}

.field-hint {
  font-size: 11px;
  color: #A8B3AC;
  margin-top: 5px;
}

.discount-toggle {
  flex: 1;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
}

.discount-toggle--active {
  border-color: #1B4332;
  background: #E6EFE9;
  font-weight: 700;
  color: #1B4332;
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
</style>
