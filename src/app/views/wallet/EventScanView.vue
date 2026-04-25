<script setup lang="ts">
import { ref } from 'vue'
import { BrowserQRCodeReader } from '@zxing/browser'
import { apiClient } from '@/infrastructure/http/ApiClient'

type ScanStep = 'scanning' | 'success' | 'already_used' | 'not_found' | 'error'

interface ScanResult {
  used: boolean
  firstName: string
  lastName: string
  eventName: string
}

const step = ref<ScanStep>('scanning')
const videoRef = ref<HTMLVideoElement | null>(null)
const result = ref<ScanResult | null>(null)

let stopScanning: (() => void) | null = null

async function startScanner() {
  step.value = 'scanning'
  result.value = null
  await new Promise((r) => setTimeout(r, 100))
  if (!videoRef.value) return

  const reader = new BrowserQRCodeReader()
  const controls = await reader.decodeFromVideoDevice(undefined, videoRef.value, async (qr, _err, ctrl) => {
    if (!qr) return
    ctrl.stop()
    const token = extractToken(qr.getText())
    if (!token) { step.value = 'error'; return }
    await scanPass(token)
  })
  stopScanning = () => controls.stop()
}

function extractToken(url: string): string | null {
  const match = url.match(/\/w\/([^/?#]+)/)
  return match ? match[1] : null
}

async function scanPass(token: string) {
  try {
    const data = await apiClient.post<ScanResult>(`/passes/scan/${token}`)
    result.value = data
    step.value = 'success'
  } catch (e: any) {
    const body = e?.body as { error?: string } | null
    if (e?.status === 409 && body?.error === 'PASS_ALREADY_USED') {
      step.value = 'already_used'
    } else if (e?.status === 404) {
      step.value = 'not_found'
    } else {
      step.value = 'error'
    }
  }
}

import { onUnmounted } from 'vue'
onUnmounted(() => stopScanning?.())
startScanner()
</script>

<template>
  <div class="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6">
    <!-- SCANNING -->
    <div v-if="step === 'scanning'" class="w-full max-w-sm space-y-4 text-center">
      <h1 class="text-white text-2xl font-bold">Escanear pase</h1>
      <p class="text-neutral-400 text-sm">Apunta la cámara al QR del asistente</p>
      <div class="relative rounded-2xl overflow-hidden bg-black aspect-square">
        <video ref="videoRef" class="w-full h-full object-cover" autoplay muted playsinline />
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="w-52 h-52 border-2 border-white/70 rounded-xl" />
        </div>
      </div>
      <p class="text-xs text-neutral-500">Buscando código QR...</p>
    </div>

    <!-- SUCCESS -->
    <div v-else-if="step === 'success' && result" class="w-full max-w-sm text-center space-y-6">
      <div class="flex justify-center">
        <div class="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center">
          <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <div>
        <p class="text-green-400 text-sm font-semibold uppercase tracking-widest mb-1">Acceso permitido</p>
        <p class="text-white text-3xl font-bold">{{ result.firstName }} {{ result.lastName }}</p>
        <p class="text-neutral-400 text-sm mt-2">{{ result.eventName }}</p>
      </div>
      <button
        class="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-sm transition-colors"
        @click="startScanner"
      >
        Escanear otro
      </button>
    </div>

    <!-- ALREADY USED -->
    <div v-else-if="step === 'already_used'" class="w-full max-w-sm text-center space-y-6">
      <div class="flex justify-center">
        <div class="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center">
          <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      </div>
      <div>
        <p class="text-red-400 text-sm font-semibold uppercase tracking-widest mb-1">Acceso denegado</p>
        <p class="text-white text-2xl font-bold">Este pase ya fue utilizado</p>
      </div>
      <button
        class="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-sm transition-colors"
        @click="startScanner"
      >
        Escanear otro
      </button>
    </div>

    <!-- NOT FOUND -->
    <div v-else-if="step === 'not_found'" class="w-full max-w-sm text-center space-y-6">
      <div class="flex justify-center">
        <div class="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center">
          <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      </div>
      <div>
        <p class="text-red-400 text-sm font-semibold uppercase tracking-widest mb-1">Acceso denegado</p>
        <p class="text-white text-2xl font-bold">Pase no encontrado</p>
      </div>
      <button
        class="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-sm transition-colors"
        @click="startScanner"
      >
        Intentar de nuevo
      </button>
    </div>

    <!-- ERROR GENÉRICO -->
    <div v-else class="w-full max-w-sm text-center space-y-6">
      <div class="flex justify-center">
        <div class="w-24 h-24 rounded-full bg-neutral-700 flex items-center justify-center">
          <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      </div>
      <div>
        <p class="text-neutral-400 text-sm font-semibold uppercase tracking-widest mb-1">Error</p>
        <p class="text-white text-2xl font-bold">QR inválido</p>
      </div>
      <button
        class="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-sm transition-colors"
        @click="startScanner"
      >
        Intentar de nuevo
      </button>
    </div>
  </div>
</template>
