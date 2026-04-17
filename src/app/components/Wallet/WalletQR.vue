<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps<{ url: string }>()

const canvas = ref<HTMLCanvasElement | null>(null)

async function render() {
  if (!canvas.value || !props.url) return
  await QRCode.toCanvas(canvas.value, props.url, {
    width: 180,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

onMounted(render)
watch(() => props.url, render)
</script>

<template>
  <canvas ref="canvas" class="rounded-lg" />
</template>
