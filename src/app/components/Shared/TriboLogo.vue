<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'dark' | 'light' | 'accent'
  size?: number
  showText?: boolean
}>(), {
  variant: 'dark',
  size: 40,
  showText: true,
})

const colors = {
  dark:   { icon: '#E8920A', text: '#FFFFFF' },
  light:  { icon: '#1B4332', text: '#1B4332' },
  accent: { icon: '#1B4332', text: '#1B4332' },
}

const c = colors[props.variant]
const textSize = `${Math.round(props.size * 0.44)}px`
</script>

<template>
  <div style="display: flex; align-items: center; gap: 8px; user-select: none;">
    <svg :width="size" :height="size" viewBox="0 0 40 40" fill="none" style="flex-shrink: 0; display: block;">
      <line x1="10" y1="28" x2="30" y2="28" :stroke="c.icon" stroke-width="2.2"/>
      <line x1="10" y1="28" x2="20" y2="10" :stroke="c.icon" stroke-width="2.2"/>
      <line x1="20" y1="10" x2="30" y2="28" :stroke="c.icon" stroke-width="2.2"/>
      <circle cx="20" cy="10" r="3.5" :fill="c.icon"/>
      <circle cx="10" cy="28" r="3.5" :fill="c.icon"/>
      <circle cx="30" cy="28" r="3.5" :fill="c.icon"/>
    </svg>
    <span
      v-if="showText"
      :style="{ fontSize: textSize, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, color: c.text, fontFamily: '\'Syne\', sans-serif' }"
    >
      trib<span :style="{ color: '#E8920A' }">o</span>
    </span>
  </div>
</template>
