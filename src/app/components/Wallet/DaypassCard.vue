<script setup lang="ts">
import type { Pass } from '@/domain/pass/entities/Pass'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { DaypassData } from '@/domain/pass/entities/PassData'
import type { DaypassRules } from '@/domain/wallet/entities/WalletRules'

const props = defineProps<{ pass: Pass; wallet: Wallet }>()

const rules = props.wallet.rules as DaypassRules
const data = props.pass.data as DaypassData

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="w-full max-w-sm rounded-2xl overflow-hidden shadow-xl">
    <!-- Banner / Background -->
    <div
      class="relative px-5 pt-6 pb-8"
      :style="rules.imageUrl
        ? { backgroundImage: `url(${rules.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: `linear-gradient(135deg, ${wallet.primaryColor}, ${wallet.accentColor})` }
      "
    >
      <!-- Overlay for readability when using image -->
      <div v-if="rules.imageUrl" class="absolute inset-0 bg-black/50 rounded-t-2xl" />

      <div class="relative z-10">
        <div class="flex items-center justify-between mb-4">
          <img v-if="wallet.logoUrl" :src="wallet.logoUrl" class="w-10 h-10 rounded-full object-cover" alt="" />
          <span
            class="ml-auto text-xs font-semibold px-3 py-1 rounded-full"
            :class="data.used
              ? 'bg-red-500/80 text-white'
              : 'bg-green-400/90 text-green-900'"
          >
            {{ data.used ? 'Usado' : 'Válido' }}
          </span>
        </div>

        <p class="text-white/70 text-xs uppercase tracking-widest">Pase de acceso</p>
        <h2 class="text-white font-bold text-2xl mt-1 leading-tight">{{ rules.eventName }}</h2>
      </div>
    </div>

    <!-- Event details -->
    <div
      class="px-5 py-4 space-y-3"
      :style="{ background: `linear-gradient(to bottom, ${wallet.primaryColor}cc, ${wallet.accentColor})` }"
    >
      <div class="flex items-start gap-2">
        <span class="text-white/60 text-lg">📅</span>
        <div>
          <p class="text-white/60 text-xs uppercase tracking-wide">Fecha</p>
          <p class="text-white font-semibold text-sm">{{ formatDate(rules.eventDate) }}</p>
        </div>
      </div>
      <div class="flex items-start gap-2">
        <span class="text-white/60 text-lg">📍</span>
        <div>
          <p class="text-white/60 text-xs uppercase tracking-wide">Lugar</p>
          <p class="text-white font-semibold text-sm">{{ rules.venue }}</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div
      class="px-5 pb-5 pt-3 border-t border-white/10"
      :style="{ backgroundColor: wallet.accentColor }"
    >
      <p class="text-white/60 text-xs uppercase tracking-wide">Titular</p>
      <p class="text-white font-semibold text-sm">{{ pass.firstName }} {{ pass.lastName }}</p>
    </div>
  </div>
</template>
