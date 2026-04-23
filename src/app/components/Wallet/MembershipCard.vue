<script setup lang="ts">
import type { Pass } from '@/domain/pass/entities/Pass'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { MembershipData } from '@/domain/pass/entities/PassData'
import type { MembershipRules } from '@/domain/wallet/entities/WalletRules'

const props = defineProps<{ pass: Pass; wallet: Wallet }>()

const rules = props.wallet.rules as MembershipRules
const data = props.pass.data as MembershipData

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
}
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

    <!-- Level badge -->
    <div class="mx-5 my-3 bg-white/10 rounded-xl p-4 text-center">
      <p class="text-white/70 text-xs uppercase tracking-widest mb-1">Nivel</p>
      <p class="text-white font-bold text-2xl">{{ rules.level }}</p>
      <p class="text-white/60 text-xs mt-2">Miembro desde {{ formatDate(data.memberSince) }}</p>
    </div>

    <!-- Footer -->
    <div class="px-5 pb-5 flex items-center justify-between">
      <div>
        <p class="text-white/60 text-xs uppercase tracking-wide">Nombre</p>
        <p class="text-white font-semibold text-sm">{{ pass.firstName }} {{ pass.lastName }}</p>
      </div>
      <div class="text-right">
        <p class="text-white/60 text-xs uppercase tracking-wide">Vencimiento</p>
        <p class="text-white text-sm">
          {{ data.expiresAt ? formatDate(data.expiresAt) : 'Sin vencimiento' }}
        </p>
      </div>
    </div>
  </div>
</template>
