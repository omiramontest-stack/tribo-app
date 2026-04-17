<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { Wallet } from '@/domain/wallet/entities/Wallet'

const props = defineProps<{ wallet: Wallet }>()
const router = useRouter()

const typeLabel: Record<string, string> = {
  stamps: 'Sellos',
  membership: 'Membresía',
  points: 'Puntos',
}

const typeEmoji: Record<string, string> = {
  stamps: '☕',
  membership: '🎖️',
  points: '⭐',
}
</script>

<template>
  <div
    class="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    @click="router.push({ name: 'WalletDetail', params: { id: props.wallet.id } })"
  >
    <!-- Color strip -->
    <div class="h-2" :style="{ background: `linear-gradient(90deg, ${wallet.primaryColor}, ${wallet.accentColor})` }" />

    <div class="p-4 space-y-3">
      <div class="flex items-start justify-between">
        <div>
          <p class="font-semibold text-sm text-neutral-800 dark:text-white leading-tight">
            {{ wallet.businessName }}
          </p>
          <p v-if="wallet.description" class="text-xs text-neutral-400 mt-0.5 line-clamp-1">
            {{ wallet.description }}
          </p>
        </div>
        <span class="text-xl">{{ typeEmoji[wallet.type] }}</span>
      </div>

      <div class="flex items-center justify-between">
        <span
          class="text-xs font-medium px-2 py-0.5 rounded-full"
          :style="{ backgroundColor: wallet.primaryColor + '20', color: wallet.primaryColor }"
        >
          {{ typeLabel[wallet.type] }}
        </span>
        <span class="text-xs text-neutral-400">
          {{ new Date(wallet.createdAt).toLocaleDateString('es-MX') }}
        </span>
      </div>
    </div>
  </div>
</template>
