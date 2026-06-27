<script setup lang="ts">
import { computed } from 'vue'
import type { Pass } from '@/domain/pass/entities/Pass'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { CouponData } from '@/domain/pass/entities/PassData'
import type { CouponRules } from '@/domain/wallet/entities/WalletRules'
import { usePassTheme } from '@/app/composables/usePassTheme'

const props = defineProps<{ pass: Pass; wallet: Wallet }>()

const { bgStyle, logoUrl } = usePassTheme(props.wallet)

const rules = props.wallet.rules as CouponRules
const data = props.pass.data as CouponData

const discountLabel = computed(() =>
  rules.discountType === 'percent'
    ? `${rules.discount}% OFF`
    : `${rules.currency ?? ''} ${rules.discount} OFF`.trim(),
)

const isExpired = computed(() =>
  data.expiresAt ? new Date(data.expiresAt) < new Date() : false,
)

const statusLabel = computed(() => {
  if (data.used) return 'Canjeado'
  if (isExpired.value) return 'Expirado'
  return 'Válido'
})

const expiryFormatted = computed(() => {
  if (!data.expiresAt) return null
  return new Date(data.expiresAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
})
</script>

<template>
  <div
    class="w-full max-w-sm rounded-2xl overflow-hidden shadow-xl"
    :style="bgStyle"
  >
    <!-- Header -->
    <div class="px-5 pt-5 pb-3 flex items-center justify-between">
      <div>
        <p class="text-white font-bold text-lg leading-tight">{{ wallet.businessName }}</p>
        <p v-if="wallet.description" class="text-white/70 text-xs mt-0.5">{{ wallet.description }}</p>
      </div>
      <img v-if="logoUrl" :src="logoUrl" class="w-10 h-10 rounded-full object-cover" alt="" />
    </div>

    <!-- Discount -->
    <div class="mx-5 my-3 bg-white/10 rounded-xl p-4 text-center">
      <p class="text-white/70 text-xs uppercase tracking-widest">Descuento</p>
      <p class="text-white font-bold text-4xl mt-1">{{ discountLabel }}</p>

      <!-- Status badge -->
      <div class="mt-3 flex justify-center">
        <span
          class="text-xs font-semibold px-3 py-1 rounded-full"
          :class="data.used || isExpired ? 'bg-white/10 text-white/50 line-through' : 'bg-white/20 text-white'"
        >
          {{ statusLabel }}
        </span>
      </div>

      <p v-if="expiryFormatted && !data.used" class="text-white/50 text-xs mt-2">
        {{ isExpired ? 'Expiró' : 'Expira' }} {{ expiryFormatted }}
      </p>
    </div>

    <!-- Footer -->
    <div class="px-5 pb-5">
      <p class="text-white/60 text-xs uppercase tracking-wide">Titular</p>
      <p class="text-white font-semibold text-sm">{{ pass.firstName }} {{ pass.lastName }}</p>
    </div>
  </div>
</template>
