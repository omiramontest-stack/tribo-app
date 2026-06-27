<script setup lang="ts">
defineProps<{
  tierLevel?: number
  completedCycles?: number
}>()
</script>

<template>
  <div v-if="tierLevel && tierLevel > 1" class="flex items-center gap-2">
    <span class="inline-flex items-center gap-1 text-xs font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full">
      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      Nivel {{ tierLevel }}
    </span>
    <span v-if="completedCycles !== undefined" class="text-xs text-white/60">
      {{ completedCycles }} {{ completedCycles === 1 ? 'canje completado' : 'canjes completados' }}
    </span>
  </div>
</template>
