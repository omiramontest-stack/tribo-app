<script setup lang="ts">
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
        URL imagen de fondo
        <span class="field-label-hint">(opcional)</span>
      </label>
      <input
        v-model="(rules as DaypassRules).imageUrl"
        type="url" placeholder="https://..."
        class="field-input"
      />
      <p class="field-hint">Imagen horizontal (landscape) recomendada.</p>
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
</style>
