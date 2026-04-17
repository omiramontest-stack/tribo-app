<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { BrowserQRCodeReader } from '@zxing/browser'
import { usePassStore } from '@/app/stores/pass/PassStore'
import type { PassWithWallet } from '@/application/pass/useCase/GetPassByTokenUseCase'
import type { StampsRules, PointsRules, MembershipRules } from '@/domain/wallet/entities/WalletRules'

type ScanStep = 'scanning' | 'confirm' | 'success' | 'error'

const passStore = usePassStore()

const step = ref<ScanStep>('scanning')
const videoRef = ref<HTMLVideoElement | null>(null)
const scannedToken = ref<string | null>(null)
const passResult = ref<PassWithWallet | null>(null)
const errorMsg = ref('')
const pointsAmount = ref(1)
const loading = ref(false)
const successMsg = ref('')

let stopScanning: (() => void) | null = null

async function startScanner() {
  step.value = 'scanning'
  scannedToken.value = null
  passResult.value = null
  errorMsg.value = ''

  await new Promise((r) => setTimeout(r, 100))
  if (!videoRef.value) return

  const reader = new BrowserQRCodeReader()
  const controls = await reader.decodeFromVideoDevice(undefined, videoRef.value, async (result, err, ctrl) => {
    if (!result) return
    ctrl.stop()
    const text = result.getText()
    const token = extractToken(text)
    if (!token) {
      errorMsg.value = 'QR inválido — no corresponde a un pase.'
      step.value = 'error'
      return
    }
    scannedToken.value = token
    await loadPass(token)
  })

  stopScanning = () => controls.stop()
}

function extractToken(url: string): string | null {
  const match = url.match(/\/w\/([^/?#]+)/)
  return match ? match[1] : null
}

async function loadPass(token: string) {
  try {
    await passStore.fetchPassByToken(token)
    passResult.value = { pass: passStore.currentPass!, wallet: passStore.currentPassWallet! }
    step.value = 'confirm'
  } catch {
    errorMsg.value = 'Pase no encontrado. Verifica que el QR sea correcto.'
    step.value = 'error'
  }
}

async function applyAction(action: 'add_stamp' | 'add_points' | 'renew_membership') {
  if (!scannedToken.value) return
  loading.value = true
  try {
    const result = await passStore.updatePassData({
      token: scannedToken.value,
      action,
      amount: action === 'add_points' ? pointsAmount.value : undefined,
    })
    passResult.value = result
    successMsg.value = getSuccessMessage(action)
    step.value = 'success'
  } catch {
    errorMsg.value = 'No se pudo actualizar el pase.'
    step.value = 'error'
  } finally {
    loading.value = false
  }
}

function getSuccessMessage(action: 'add_stamp' | 'add_points' | 'renew_membership'): string {
  if (action === 'add_stamp') return '¡Sello agregado correctamente!'
  if (action === 'add_points') return `¡${pointsAmount.value} ${(passResult.value!.wallet.rules as PointsRules).pointsLabel} agregados!`
  return '¡Membresía renovada!'
}

async function scanAnother() {
  await startScanner()
}

onUnmounted(() => stopScanning?.())

startScanner()
</script>

<template>
  <div class="max-w-sm mx-auto space-y-6">
    <h1 class="text-2xl font-bold text-neutral-800 dark:text-white">Escanear Pase</h1>

    <!-- SCANNING -->
    <div v-if="step === 'scanning'" class="space-y-4">
      <p class="text-sm text-neutral-500 dark:text-neutral-400">
        Apunta la cámara al QR del cliente para cargar su pase.
      </p>
      <div class="relative rounded-2xl overflow-hidden bg-black aspect-square">
        <video ref="videoRef" class="w-full h-full object-cover" autoplay muted playsinline />
        <!-- viewfinder overlay -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="w-48 h-48 border-2 border-white/70 rounded-xl" />
        </div>
      </div>
      <p class="text-xs text-center text-neutral-400">Buscando código QR...</p>
    </div>

    <!-- CONFIRM (pass loaded) -->
    <div v-else-if="step === 'confirm' && passResult" class="space-y-4">
      <!-- Pass summary card -->
      <div
        class="rounded-2xl p-5 text-white space-y-1"
        :style="{ background: `linear-gradient(135deg, ${passResult.wallet.primaryColor}, ${passResult.wallet.accentColor})` }"
      >
        <p class="text-xs opacity-75 font-medium uppercase tracking-wide">
          {{ passResult.wallet.businessName }}
        </p>
        <p class="text-xl font-bold">{{ passResult.pass.customerName }}</p>

        <!-- stamps progress -->
        <template v-if="passResult.pass.data.type === 'stamps'">
          <p class="text-sm opacity-90">
            {{ passResult.pass.data.currentStamps }} /
            {{ (passResult.wallet.rules as StampsRules).totalStamps }} sellos
          </p>
        </template>

        <!-- points progress -->
        <template v-else-if="passResult.pass.data.type === 'points'">
          <p class="text-sm opacity-90">
            {{ passResult.pass.data.currentPoints }}
            {{ (passResult.wallet.rules as PointsRules).pointsLabel }}
          </p>
        </template>

        <!-- membership -->
        <template v-else-if="passResult.pass.data.type === 'membership'">
          <p class="text-sm opacity-90">
            {{ (passResult.wallet.rules as MembershipRules).level }}
          </p>
        </template>
      </div>

      <!-- Action buttons -->
      <div class="space-y-2">
        <button
          v-if="passResult.pass.data.type === 'stamps'"
          class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          :disabled="loading"
          @click="applyAction('add_stamp')"
        >
          + Agregar sello
        </button>

        <template v-else-if="passResult.pass.data.type === 'points'">
          <div class="flex gap-2">
            <input
              v-model.number="pointsAmount"
              type="number"
              min="1"
              class="flex-1 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-white"
              placeholder="Cantidad"
            />
            <button
              class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
              :disabled="loading || pointsAmount < 1"
              @click="applyAction('add_points')"
            >
              + Agregar
            </button>
          </div>
          <p class="text-xs text-neutral-400 text-center">
            {{ (passResult.wallet.rules as PointsRules).pointsLabel }}
          </p>
        </template>

        <button
          v-else-if="passResult.pass.data.type === 'membership'"
          class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          :disabled="loading"
          @click="applyAction('renew_membership')"
        >
          Renovar membresía
        </button>
      </div>

      <button
        class="w-full py-2 text-sm text-neutral-400 hover:text-neutral-600"
        @click="startScanner"
      >
        Cancelar y escanear otro
      </button>
    </div>

    <!-- SUCCESS -->
    <div v-else-if="step === 'success' && passResult" class="space-y-4 text-center">
      <div class="flex justify-center">
        <div class="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-3xl">
          ✓
        </div>
      </div>
      <p class="text-lg font-semibold text-neutral-800 dark:text-white">{{ successMsg }}</p>
      <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ passResult.pass.customerName }}</p>

      <!-- Updated state -->
      <div
        class="rounded-2xl p-4 text-white text-sm"
        :style="{ background: `linear-gradient(135deg, ${passResult.wallet.primaryColor}, ${passResult.wallet.accentColor})` }"
      >
        <template v-if="passResult.pass.data.type === 'stamps'">
          {{ passResult.pass.data.currentStamps }} /
          {{ (passResult.wallet.rules as StampsRules).totalStamps }} sellos
          <span
            v-if="passResult.pass.data.currentStamps >= (passResult.wallet.rules as StampsRules).totalStamps"
            class="ml-1"
          >— ¡Recompensa lista!</span>
        </template>
        <template v-else-if="passResult.pass.data.type === 'points'">
          {{ passResult.pass.data.currentPoints }}
          {{ (passResult.wallet.rules as PointsRules).pointsLabel }}
        </template>
        <template v-else-if="passResult.pass.data.type === 'membership'">
          Membresía activa
        </template>
      </div>

      <button
        class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
        @click="scanAnother"
      >
        Escanear otro pase
      </button>
    </div>

    <!-- ERROR -->
    <div v-else-if="step === 'error'" class="space-y-4 text-center">
      <div class="flex justify-center">
        <div class="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-3xl">
          ✕
        </div>
      </div>
      <p class="text-sm text-red-500 font-medium">{{ errorMsg }}</p>
      <button
        class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
        @click="startScanner"
      >
        Intentar de nuevo
      </button>
    </div>
  </div>
</template>
