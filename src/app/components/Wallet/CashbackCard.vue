<script setup lang="ts">
import type { Pass } from '@/domain/pass/entities/Pass'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { CashbackData } from '@/domain/pass/entities/PassData'
import type { CashbackRules } from '@/domain/wallet/entities/WalletRules'

const props = defineProps<{ pass: Pass; wallet: Wallet }>()

const rules = props.wallet.rules as CashbackRules
const data = props.pass.data as CashbackData
</script>

<template>
  <div
    class="w-full max-w-sm rounded-2xl overflow-hidden shadow-xl"
    :style="{ background: `linear-gradient(135deg, ${wallet.primaryColor}, ${wallet.accentColor})` }"
  >
    <!-- Header -->
    <div class="px-5 pt-5 pb-3 flex items-center justify-between">
      <div>
        <p class="text-white font-bold text-lg leading-tight">{{ wallet.businessName }}</p>
        <p v-if="wallet.description" class="text-white/70 text-xs mt-0.5">{{ wallet.description }}</p>
      </div>
      <img v-if="wallet.logoUrl" :src="wallet.logoUrl" class="w-10 h-10 rounded-full object-cover" alt="" />
    </div>

    <!-- Balance -->
    <div class="mx-5 my-3 bg-white/10 rounded-xl p-4">
      <p class="text-white/70 text-xs uppercase tracking-widest text-center">Saldo cashback</p>
      <p class="text-white font-bold text-4xl mt-1 text-center">
        {{ rules.currency }} {{ data.balance.toFixed(2) }}
      </p>
      <div class="mt-3 flex justify-center">
        <span class="bg-white/20 text-white text-xs px-3 py-1 rounded-full">
          {{ rules.cashbackPercent }}% por cada compra
        </span>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-5 pb-5">
      <p class="text-white/60 text-xs uppercase tracking-wide">Titular</p>
      <p class="text-white font-semibold text-sm">{{ pass.firstName }} {{ pass.lastName }}</p>
    </div>
  </div>
</template>
