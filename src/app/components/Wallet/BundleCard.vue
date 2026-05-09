<script setup lang="ts">
import type { Pass } from '@/domain/pass/entities/Pass'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { BundleData } from '@/domain/pass/entities/PassData'
import type { BundleRules } from '@/domain/wallet/entities/WalletRules'

const props = defineProps<{ pass: Pass; wallet: Wallet }>()

const rules = props.wallet.rules as BundleRules
const data = props.pass.data as BundleData
const usedCount = rules.totalUses - data.remainingUses
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

    <!-- Uses -->
    <div class="mx-5 my-3 bg-white/10 rounded-xl p-4">
      <p class="text-white/70 text-xs uppercase tracking-widest text-center">{{ rules.label }}</p>
      <p class="text-white font-bold text-4xl mt-1 text-center">{{ data.remainingUses }}</p>
      <p class="text-white/60 text-xs text-center mt-0.5">de {{ rules.totalUses }} usos restantes</p>

      <!-- Progress dots -->
      <div class="mt-3 flex justify-center gap-1.5 flex-wrap">
        <div
          v-for="i in rules.totalUses"
          :key="i"
          class="w-5 h-5 rounded-full"
          :class="i <= usedCount ? 'bg-white/30' : 'bg-white'"
        />
      </div>
    </div>

    <!-- Footer -->
    <div class="px-5 pb-5">
      <p class="text-white/60 text-xs uppercase tracking-wide">Titular</p>
      <p class="text-white font-semibold text-sm">{{ pass.firstName }} {{ pass.lastName }}</p>
    </div>
  </div>
</template>
