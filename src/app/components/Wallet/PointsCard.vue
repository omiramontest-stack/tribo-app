<script setup lang="ts">
import type { Pass } from '@/domain/pass/entities/Pass'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { PointsData } from '@/domain/pass/entities/PassData'
import type { PointsRules } from '@/domain/wallet/entities/WalletRules'

const props = defineProps<{ pass: Pass; wallet: Wallet }>()

const rules = props.wallet.rules as PointsRules
const data = props.pass.data as PointsData

const progress = Math.min((data.currentPoints / rules.rewardThreshold) * 100, 100)
const reached = data.currentPoints >= rules.rewardThreshold
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

    <!-- Points -->
    <div class="mx-5 my-3 bg-white/10 rounded-xl p-4">
      <div class="text-center mb-3">
        <p class="text-white/70 text-xs uppercase tracking-widest">Tus {{ rules.pointsLabel }}</p>
        <p class="text-white font-bold text-4xl mt-1">{{ data.currentPoints }}</p>
      </div>

      <!-- Progress bar -->
      <div class="bg-white/20 rounded-full h-2 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          :style="{ width: `${progress}%`, backgroundColor: 'white' }"
        />
      </div>
      <div class="flex justify-between mt-1.5">
        <p class="text-white/60 text-xs">0</p>
        <p class="text-white/60 text-xs">{{ rules.rewardThreshold }}</p>
      </div>

      <p v-if="reached" class="text-center text-white font-semibold text-sm mt-2">
        🎉 ¡Recompensa disponible! {{ rules.reward }}
      </p>
      <p v-else class="text-center text-white/70 text-xs mt-2">
        {{ rules.rewardThreshold - data.currentPoints }} {{ rules.pointsLabel }} para: {{ rules.reward }}
      </p>
    </div>

    <!-- Footer -->
    <div class="px-5 pb-5">
      <p class="text-white/60 text-xs uppercase tracking-wide">Nombre</p>
      <p class="text-white font-semibold text-sm">{{ pass.firstName }} {{ pass.lastName }}</p>
    </div>
  </div>
</template>
