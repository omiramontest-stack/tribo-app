<script setup lang="ts">
import { computed } from 'vue'
import type { ResolvedTheme } from '@/domain/wallet/entities/WalletTheme'

const props = defineProps<{
  back: ResolvedTheme['back']
}>()

const hasAny = computed(() =>
  !!(props.back.website || props.back.phone || props.back.address || props.back.instagram),
)
</script>

<template>
  <div v-if="hasAny" class="w-full max-w-sm bg-neutral-800/60 rounded-2xl px-5 py-4 space-y-3">
    <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Contacto</p>

    <a
      v-if="back.website"
      :href="back.website"
      target="_blank"
      rel="noopener"
      class="flex items-center gap-2.5 text-sm text-white/80 hover:text-white transition-colors"
    >
      <svg class="w-4 h-4 shrink-0 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
      {{ back.website }}
    </a>

    <a
      v-if="back.phone"
      :href="`tel:${back.phone}`"
      class="flex items-center gap-2.5 text-sm text-white/80 hover:text-white transition-colors"
    >
      <svg class="w-4 h-4 shrink-0 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.3 19.79 19.79 0 0 1 1.61 4.68 2 2 0 0 1 3.58 2.5h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 10a16 16 0 0 0 6.06 6.06l1.07-.87a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
      {{ back.phone }}
    </a>

    <p v-if="back.address" class="flex items-start gap-2.5 text-sm text-white/80">
      <svg class="w-4 h-4 shrink-0 mt-0.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      {{ back.address }}
    </p>

    <a
      v-if="back.instagram"
      :href="`https://instagram.com/${back.instagram}`"
      target="_blank"
      rel="noopener"
      class="flex items-center gap-2.5 text-sm text-white/80 hover:text-white transition-colors"
    >
      <svg class="w-4 h-4 shrink-0 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
      @{{ back.instagram }}
    </a>
  </div>
</template>
