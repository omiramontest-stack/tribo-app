<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps<{ value: string }>()

const canvas = ref<HTMLCanvasElement | null>(null)

async function render() {
  if (!canvas.value || !props.value) return
  await QRCode.toCanvas(canvas.value, props.value, {
    width: 220,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

onMounted(render)
watch(() => props.value, render)
</script>

<template>
  <canvas ref="canvas" class="wa-qr-canvas" />
</template>

<style scoped>
.wa-qr-canvas {
  display: block;
  border-radius: 14px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}
</style>
