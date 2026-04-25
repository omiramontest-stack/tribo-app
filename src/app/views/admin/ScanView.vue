<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { BrowserQRCodeReader } from '@zxing/browser'
import { usePassStore } from '@/app/stores/pass/PassStore'
import { apiClient } from '@/infrastructure/http/ApiClient'
import type { PassWithWallet } from '@/application/pass/useCase/GetPassByTokenUseCase'
import type { StampsRules, PointsRules, MembershipRules, CashbackRules } from '@/domain/wallet/entities/WalletRules'
import type { CashbackTransaction } from '@/domain/pass/repository/PassRepository'

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

// Cashback modal
const showCashbackModal = ref(false)
const cashbackAction = ref<'add_cashback' | 'subtract_cashback'>('add_cashback')
const cashbackForm = ref({ purchaseAmount: '', cashbackPercent: '', amount: '', description: '' })
const cashbackModalError = ref('')
const transactions = ref<CashbackTransaction[]>([])
const loadingTx = ref(false)

function cashbackPreview() {
  const purchase = parseFloat(cashbackForm.value.purchaseAmount)
  const rules = passResult.value?.wallet.rules as CashbackRules | undefined
  const pct = parseFloat(cashbackForm.value.cashbackPercent) || rules?.cashbackPercent || 0
  if (!purchase || !pct) return null
  return (purchase * pct) / 100
}

function openCashbackModal(action: 'add_cashback' | 'subtract_cashback') {
  cashbackAction.value = action
  cashbackForm.value = { purchaseAmount: '', cashbackPercent: '', amount: '', description: '' }
  cashbackModalError.value = ''
  showCashbackModal.value = true
}

async function submitCashback() {
  const rules = passResult.value?.wallet.rules as CashbackRules
  loading.value = true
  cashbackModalError.value = ''
  try {
    let dto: Parameters<typeof passStore.updatePassData>[0]
    if (cashbackAction.value === 'add_cashback') {
      const purchase = parseFloat(cashbackForm.value.purchaseAmount)
      if (!purchase || purchase <= 0) { cashbackModalError.value = 'Ingresa un monto válido'; loading.value = false; return }
      dto = {
        token: scannedToken.value!,
        action: 'add_cashback',
        purchaseAmount: purchase,
        cashbackPercent: parseFloat(cashbackForm.value.cashbackPercent) || undefined,
        description: cashbackForm.value.description || undefined,
      }
    } else {
      const amount = parseFloat(cashbackForm.value.amount)
      if (!amount || amount <= 0) { cashbackModalError.value = 'Ingresa un monto válido'; loading.value = false; return }
      dto = {
        token: scannedToken.value!,
        action: 'subtract_cashback',
        amount,
        description: cashbackForm.value.description || undefined,
      }
    }
    const result = await passStore.updatePassData(dto)
    passResult.value = result
    showCashbackModal.value = false
    successMsg.value = cashbackAction.value === 'add_cashback'
      ? `¡Cashback agregado correctamente!`
      : `¡${rules.currency} canjeado correctamente!`
    step.value = 'success'
  } catch {
    cashbackModalError.value = 'Ocurrió un error, intenta de nuevo'
  } finally {
    loading.value = false
  }
}

async function markDaypassUsed() {
  if (!scannedToken.value) return
  loading.value = true
  try {
    await apiClient.post(`/passes/scan/${scannedToken.value}`)
    successMsg.value = '¡Pase validado correctamente!'
    step.value = 'success'
  } catch (e: any) {
    const body = e?.body as { error?: string } | null
    if (e?.status === 409 && body?.error === 'PASS_ALREADY_USED') {
      errorMsg.value = 'Este pase ya fue utilizado.'
    } else {
      errorMsg.value = 'No se pudo validar el pase.'
    }
    step.value = 'error'
  } finally {
    loading.value = false
  }
}

async function loadTransactions(token: string) {
  loadingTx.value = true
  try {
    transactions.value = await passStore.fetchTransactions(token)
  } finally {
    loadingTx.value = false
  }
}

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
    if (passStore.currentPassWallet?.type === 'cashback') {
      await loadTransactions(token)
    }
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

        <button
          v-else-if="passResult.pass.data.type === 'daypass'"
          class="w-full py-3 rounded-xl text-white font-semibold text-sm transition-colors disabled:opacity-50"
          :class="passResult.pass.data.used ? 'bg-neutral-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'"
          :disabled="loading || passResult.pass.data.used"
          @click="markDaypassUsed"
        >
          {{ passResult.pass.data.used ? 'Pase ya utilizado' : 'Marcar como usado ✓' }}
        </button>

        <template v-else-if="passResult.pass.data.type === 'cashback'">
          <button
            class="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors"
            :disabled="loading"
            @click="openCashbackModal('add_cashback')"
          >
            + Agregar cashback
          </button>
          <button
            class="w-full py-3 rounded-xl bg-neutral-600 hover:bg-neutral-500 text-white font-semibold text-sm transition-colors"
            :disabled="loading || passResult.pass.data.balance <= 0"
            @click="openCashbackModal('subtract_cashback')"
          >
            Canjear cashback
          </button>

          <!-- Historial de transacciones -->
          <div class="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 overflow-hidden mt-2">
            <p class="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide border-b border-neutral-100 dark:border-neutral-700">
              Historial
            </p>
            <div v-if="loadingTx" class="px-4 py-4 text-center text-neutral-400 text-xs">Cargando...</div>
            <div v-else-if="!transactions.length" class="px-4 py-4 text-center text-neutral-400 text-xs">Sin transacciones</div>
            <div v-else class="divide-y divide-neutral-100 dark:divide-neutral-700 max-h-48 overflow-y-auto">
              <div v-for="tx in transactions" :key="tx.id" class="px-4 py-2 flex justify-between items-start text-xs">
                <div>
                  <p class="text-neutral-700 dark:text-neutral-200">Compra: {{ (passResult.wallet.rules as CashbackRules).currency }} {{ tx.purchaseAmount.toFixed(2) }} · {{ tx.cashbackPercent }}%</p>
                  <p class="text-neutral-400">{{ new Date(tx.createdAt).toLocaleDateString('es-MX') }}</p>
                </div>
                <p :class="tx.cashbackAmount >= 0 ? 'text-green-500' : 'text-red-500'" class="font-semibold">
                  {{ tx.cashbackAmount >= 0 ? '+' : '' }}{{ (passResult.wallet.rules as CashbackRules).currency }} {{ Math.abs(tx.cashbackAmount).toFixed(2) }}
                </p>
              </div>
            </div>
          </div>
        </template>
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
        <template v-else-if="passResult.pass.data.type === 'cashback'">
          {{ (passResult.wallet.rules as CashbackRules).currency }} {{ passResult.pass.data.balance.toFixed(2) }} de saldo
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

    <!-- Cashback modal -->
    <Teleport to="body">
      <div
        v-if="showCashbackModal"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-4 sm:pb-0"
        @click.self="showCashbackModal = false"
      >
        <div class="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 space-y-4">
          <h3 class="font-semibold text-neutral-800 dark:text-white">
            {{ cashbackAction === 'add_cashback' ? 'Agregar cashback' : 'Canjear cashback' }}
          </h3>

          <!-- Agregar cashback -->
          <template v-if="cashbackAction === 'add_cashback'">
            <div>
              <label class="block text-xs text-neutral-500 mb-1">Monto de compra *</label>
              <input v-model="cashbackForm.purchaseAmount" type="number" min="0" step="0.01" placeholder="0.00"
                class="w-full border border-neutral-200 dark:border-neutral-700 bg-transparent dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-xs text-neutral-500 mb-1">
                % Cashback
                <span class="text-neutral-400">(vacío = {{ (passResult?.wallet.rules as CashbackRules)?.cashbackPercent }}% configurado)</span>
              </label>
              <input v-model="cashbackForm.cashbackPercent" type="number" min="1" max="100"
                :placeholder="`${(passResult?.wallet.rules as CashbackRules)?.cashbackPercent ?? ''}`"
                class="w-full border border-neutral-200 dark:border-neutral-700 bg-transparent dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div v-if="cashbackPreview() !== null" class="bg-neutral-100 dark:bg-neutral-800 rounded-lg px-4 py-2 text-center">
              <p class="text-neutral-500 text-xs">Cashback a agregar</p>
              <p class="font-bold text-lg text-neutral-800 dark:text-white">
                {{ (passResult?.wallet.rules as CashbackRules)?.currency }} {{ cashbackPreview()!.toFixed(2) }}
              </p>
            </div>
          </template>

          <!-- Canjear cashback -->
          <template v-else>
            <div>
              <label class="block text-xs text-neutral-500 mb-1">
                Monto a canjear *
                <span class="text-neutral-400">
                  (máx. {{ (passResult?.wallet.rules as CashbackRules)?.currency }}
                  {{ (passResult?.pass.data as any)?.balance?.toFixed(2) }})
                </span>
              </label>
              <input
                v-model="cashbackForm.amount"
                type="number"
                min="0"
                step="0.01"
                :max="(passResult?.pass.data as any)?.balance"
                placeholder="0.00"
                class="w-full border border-neutral-200 dark:border-neutral-700 bg-transparent dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </template>

          <div>
            <label class="block text-xs text-neutral-500 mb-1">Descripción (opcional)</label>
            <input v-model="cashbackForm.description" type="text"
              :placeholder="cashbackAction === 'add_cashback' ? 'Ej. Compra en tienda' : 'Ej. Canje en caja'"
              class="w-full border border-neutral-200 dark:border-neutral-700 bg-transparent dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <p v-if="cashbackModalError" class="text-red-500 text-xs">{{ cashbackModalError }}</p>
          <div class="flex gap-2">
            <button class="flex-1 border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 py-2.5 rounded-lg text-sm" @click="showCashbackModal = false">Cancelar</button>
            <button
              :disabled="loading"
              class="flex-1 text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-50"
              :class="cashbackAction === 'add_cashback' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'"
              @click="submitCashback"
            >
              {{ loading ? 'Procesando...' : 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
