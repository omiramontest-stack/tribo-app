<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { BrowserQRCodeReader } from '@zxing/browser'
import { usePassStore } from '@/app/stores/pass/PassStore'
import { apiClient, ApiError } from '@/infrastructure/http/ApiClient'
import type { PassWithWallet } from '@/application/pass/useCase/GetPassByTokenUseCase'
import type { StampsRules, PointsRules, MembershipRules, CashbackRules, BundleRules, GiftcardRules, CouponRules } from '@/domain/wallet/entities/WalletRules'
import type { CashbackTransaction } from '@/domain/pass/repository/PassRepository'
import { PassErrorCodes } from '@/application/pass/error/enum/PassErrorCodes'
import { walletTypeConfig } from '@/app/config/walletTypeConfig'

type ScanStep = 'scanning' | 'confirm' | 'success' | 'error'

const PASS_ERROR_MESSAGES: Record<string, string> = {
  [PassErrorCodes.NO_USES_LEFT]:         'No quedan usos disponibles en este paquete.',
  [PassErrorCodes.INSUFFICIENT_BALANCE]: 'Saldo insuficiente.',
  [PassErrorCodes.COUPON_ALREADY_USED]:  'Este cupón ya fue canjeado.',
  [PassErrorCodes.COUPON_EXPIRED]:       'Este cupón ha expirado.',
  [PassErrorCodes.ALREADY_USED]:         'Este pase ya fue utilizado.',
}

function resolvePassError(e: unknown, fallback: string): string {
  const code = e instanceof ApiError
    ? (e.body as { error?: string } | null)?.error
    : undefined
  return PASS_ERROR_MESSAGES[code ?? ''] ?? fallback
}

const passStore = usePassStore()

const step = ref<ScanStep>('scanning')
const videoRef = ref<HTMLVideoElement | null>(null)
const scannedToken = ref<string | null>(null)
const passResult = ref<PassWithWallet | null>(null)
const errorMsg = ref('')
const pointsAmount = ref(1)
const loading = ref(false)
const successMsg = ref('')
// Cooldown tras un 429 en POST /passes/scan/:token
const scanRateLimitedUntil = ref<number | null>(null)
const scanRateLimitedSecs = ref(0)
let _scanCooldownTimer: ReturnType<typeof setInterval> | null = null

// Cashback modal
const showCashbackModal = ref(false)
const cashbackAction = ref<'add_cashback' | 'subtract_cashback'>('add_cashback')
const cashbackForm = ref({ purchaseAmount: '', cashbackPercent: '', amount: '', description: '' })
const cashbackModalError = ref('')
const transactions = ref<CashbackTransaction[]>([])
const loadingTx = ref(false)

// Giftcard modal
const showGiftcardModal = ref(false)
const giftcardAction = ref<'add_giftcard' | 'subtract_giftcard'>('add_giftcard')
const giftcardAmount = ref('')
const giftcardModalError = ref('')

// Renew / claim modal (stamps, points, bundle completed)
const showRenewModal = ref(false)
const renewError = ref('')

const renewRewardLabel = computed(() => {
  if (!passResult.value) return ''
  const { type } = passResult.value.pass.data
  const rules = passResult.value.wallet.rules
  if (type === 'stamps') return (rules as StampsRules).reward
  if (type === 'points') return (rules as PointsRules).reward
  if (type === 'bundle') return (rules as BundleRules).label
  return ''
})

const walletInitials = computed(() =>
  (passResult.value?.wallet.businessName ?? '')
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
)

const walletWt = computed(() =>
  walletTypeConfig.find(c => c.value === passResult.value?.wallet.type)
)

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
      ? '¡Cashback agregado correctamente!'
      : `¡${rules.currency} canjeado correctamente!`
    step.value = 'success'
  } catch {
    cashbackModalError.value = 'Ocurrió un error, intenta de nuevo'
  } finally {
    loading.value = false
  }
}

async function useBundle() {
  if (!scannedToken.value) return
  loading.value = true
  try {
    const result = await passStore.updatePassData({ token: scannedToken.value, action: 'use_bundle' })
    passResult.value = result
    successMsg.value = '¡Uso registrado correctamente!'
    step.value = 'success'
  } catch (e) {
    errorMsg.value = resolvePassError(e, 'No se pudo registrar el uso.')
    step.value = 'error'
  } finally {
    loading.value = false
  }
}

function openGiftcardModal(action: 'add_giftcard' | 'subtract_giftcard') {
  giftcardAction.value = action
  giftcardAmount.value = ''
  giftcardModalError.value = ''
  showGiftcardModal.value = true
}

async function submitGiftcard() {
  const amount = parseFloat(giftcardAmount.value)
  if (!amount || amount <= 0) { giftcardModalError.value = 'Ingresa un monto válido'; return }
  const rules = passResult.value?.wallet.rules as GiftcardRules
  loading.value = true
  giftcardModalError.value = ''
  try {
    const result = await passStore.updatePassData({ token: scannedToken.value!, action: giftcardAction.value, amount })
    passResult.value = result
    showGiftcardModal.value = false
    successMsg.value = giftcardAction.value === 'add_giftcard'
      ? `¡${rules.currency} ${amount.toFixed(2)} agregados!`
      : `¡${rules.currency} ${amount.toFixed(2)} canjeados!`
    step.value = 'success'
  } catch (e) {
    giftcardModalError.value = resolvePassError(e, 'Ocurrió un error, intenta de nuevo.')
  } finally {
    loading.value = false
  }
}

async function redeemCoupon() {
  if (!scannedToken.value) return
  loading.value = true
  try {
    const result = await passStore.updatePassData({ token: scannedToken.value, action: 'redeem_coupon' })
    passResult.value = result
    successMsg.value = '¡Cupón canjeado correctamente!'
    step.value = 'success'
  } catch (e) {
    errorMsg.value = resolvePassError(e, 'No se pudo canjear el cupón.')
    step.value = 'error'
  } finally {
    loading.value = false
  }
}

function _startScanCooldown(seconds: number) {
  scanRateLimitedSecs.value = seconds
  scanRateLimitedUntil.value = Date.now() + seconds * 1_000
  if (_scanCooldownTimer) clearInterval(_scanCooldownTimer)
  _scanCooldownTimer = setInterval(() => {
    const remaining = Math.ceil(((scanRateLimitedUntil.value ?? 0) - Date.now()) / 1_000)
    if (remaining <= 0) {
      scanRateLimitedSecs.value = 0
      scanRateLimitedUntil.value = null
      clearInterval(_scanCooldownTimer!)
      _scanCooldownTimer = null
    } else {
      scanRateLimitedSecs.value = remaining
    }
  }, 1_000)
}

async function markDaypassUsed() {
  if (!scannedToken.value || scanRateLimitedUntil.value) return
  loading.value = true
  try {
    await apiClient.post(`/passes/scan/${scannedToken.value}`)
    successMsg.value = '¡Pase validado correctamente!'
    step.value = 'success'
  } catch (e) {
    if (e instanceof ApiError && e.status === 429) {
      const seconds = e.retryAfter ?? 60
      errorMsg.value = `Demasiados intentos. Intenta de nuevo en ${seconds}s`
      _startScanCooldown(seconds)
      step.value = 'error'
    } else {
      errorMsg.value = resolvePassError(e, 'No se pudo validar el pase.')
      step.value = 'error'
    }
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
  return '¡Visita registrada!'
}

function openRenewModal() {
  renewError.value = ''
  showRenewModal.value = true
}

async function claimAndReset() {
  if (!scannedToken.value || !passResult.value) return
  loading.value = true
  renewError.value = ''
  try {
    const renewedPass = await passStore.renewPass(scannedToken.value)
    passResult.value = { pass: renewedPass, wallet: passResult.value.wallet }
    showRenewModal.value = false
    successMsg.value = renewedPass.data.type === 'bundle' ? 'Paquete recargado ✓' : 'Premio entregado ✓'
    step.value = 'success'
  } catch (e) {
    const code = e instanceof ApiError ? (e.body as { error?: string } | null)?.error : undefined
    if (code === PassErrorCodes.NOT_COMPLETED) {
      renewError.value = 'El pase no está completo aún.'
    } else if (e instanceof ApiError && e.status === 403) {
      renewError.value = 'Sin permiso para realizar esta acción.'
    } else {
      renewError.value = 'Ocurrió un error, intenta de nuevo.'
    }
  } finally {
    loading.value = false
  }
}

async function scanAnother() {
  await startScanner()
}

onUnmounted(() => {
  stopScanning?.()
  if (_scanCooldownTimer) clearInterval(_scanCooldownTimer)
})

startScanner()
</script>

<template>
  <div class="scan-page">

    <!-- ── Scanning ─────────────────────────────────────────── -->
    <div v-if="step === 'scanning'" class="scan-state">
      <div class="scan-header">
        <p class="scan-hint">Apunta la cámara al código QR del cliente</p>
      </div>

      <div class="viewfinder-wrap">
        <video ref="videoRef" class="viewfinder-video" autoplay muted playsinline />

        <!-- Corner brackets -->
        <div class="vf-overlay">
          <span class="corner tl" />
          <span class="corner tr" />
          <span class="corner bl" />
          <span class="corner br" />
          <div class="scan-line" />
        </div>
      </div>

      <div class="scan-status">
        <span class="scan-dot" />
        <span class="scan-status-text">Buscando código QR…</span>
      </div>
    </div>

    <!-- ── Confirm ─────────────────────────────────────────── -->
    <div v-else-if="step === 'confirm' && passResult" class="confirm-state">

      <!-- Pass identity card -->
      <div
        class="pass-card"
        :style="{ background: `linear-gradient(135deg, ${passResult.wallet.primaryColor}, ${passResult.wallet.accentColor})` }"
      >
        <div class="pass-card-header">
          <div class="pass-avatar" :style="{ background: 'rgba(255,255,255,0.2)' }">
            <img
              v-if="passResult.wallet.logoUrl"
              :src="passResult.wallet.logoUrl"
              :alt="passResult.wallet.businessName"
              class="pass-avatar-img"
            />
            <span v-else class="pass-avatar-initials">{{ walletInitials }}</span>
          </div>
          <div class="pass-card-meta">
            <p class="pass-business">{{ passResult.wallet.businessName }}</p>
            <p class="pass-customer">{{ passResult.pass.customerName }}</p>
          </div>
          <span v-if="walletWt" class="pass-type-badge" :style="{ background: 'rgba(255,255,255,0.18)', color: '#fff' }">
            {{ walletWt.label }}
          </span>
        </div>

        <!-- Type-specific data -->
        <div class="pass-data">
          <!-- Stamps progress -->
          <template v-if="passResult.pass.data.type === 'stamps'">
            <div class="pass-progress-row">
              <span class="pass-data-value">
                {{ passResult.pass.data.currentStamps }} / {{ (passResult.wallet.rules as StampsRules).totalStamps }}
              </span>
              <span class="pass-data-label">sellos</span>
            </div>
            <div class="progress-bar-wrap">
              <div
                class="progress-bar-fill"
                :style="{
                  width: `${Math.min(100, (passResult.pass.data.currentStamps / (passResult.wallet.rules as StampsRules).totalStamps) * 100)}%`
                }"
              />
            </div>
            <p v-if="passResult.pass.status === 'completed'" class="pass-reward-hint">
              🎁 Premio listo: {{ (passResult.wallet.rules as StampsRules).reward }}
            </p>
          </template>

          <!-- Points -->
          <template v-else-if="passResult.pass.data.type === 'points'">
            <div class="pass-progress-row">
              <span class="pass-data-value">{{ passResult.pass.data.currentPoints }}</span>
              <span class="pass-data-label">{{ (passResult.wallet.rules as PointsRules).pointsLabel }}</span>
            </div>
            <div class="progress-bar-wrap">
              <div
                class="progress-bar-fill"
                :style="{
                  width: `${Math.min(100, (passResult.pass.data.currentPoints / (passResult.wallet.rules as PointsRules).rewardThreshold) * 100)}%`
                }"
              />
            </div>
            <p class="pass-data-sub">Meta: {{ (passResult.wallet.rules as PointsRules).rewardThreshold }} · {{ (passResult.wallet.rules as PointsRules).reward }}</p>
            <p v-if="passResult.pass.status === 'completed'" class="pass-reward-hint">
              🎁 Premio listo: {{ (passResult.wallet.rules as PointsRules).reward }}
            </p>
          </template>

          <!-- Membership -->
          <template v-else-if="passResult.pass.data.type === 'membership'">
            <div class="membership-info">
              <!-- Photo or initials fallback -->
              <div class="member-avatar">
                <img
                  v-if="passResult.pass.photoUrl"
                  :src="passResult.pass.photoUrl"
                  class="member-photo"
                  alt="Foto del cliente"
                />
                <span v-else class="member-initials">
                  {{ passResult.pass.firstName?.[0]?.toUpperCase() ?? '' }}{{ passResult.pass.lastName?.[0]?.toUpperCase() ?? '' }}
                </span>
              </div>
              <div>
                <p class="pass-data-value" style="font-size: 20px;">{{ passResult.pass.customerName }}</p>
                <p class="pass-data-sub" style="margin-top: 2px;">{{ (passResult.wallet.rules as MembershipRules).level }} · Membresía activa</p>
                <p v-if="passResult.pass.data.expiresAt" class="pass-data-sub">
                  Vence {{ new Date(passResult.pass.data.expiresAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) }}
                </p>
              </div>
            </div>
          </template>

          <!-- Cashback -->
          <template v-else-if="passResult.pass.data.type === 'cashback'">
            <div class="pass-progress-row">
              <span class="pass-data-value">{{ (passResult.wallet.rules as CashbackRules).currency }} {{ passResult.pass.data.balance.toFixed(2) }}</span>
              <span class="pass-data-label">saldo</span>
            </div>
            <p class="pass-data-sub">{{ (passResult.wallet.rules as CashbackRules).cashbackPercent }}% de cashback por compra</p>
          </template>

          <!-- Bundle -->
          <template v-else-if="passResult.pass.data.type === 'bundle'">
            <div class="pass-progress-row">
              <span class="pass-data-value">{{ passResult.pass.data.remainingUses }}</span>
              <span class="pass-data-label">/ {{ (passResult.wallet.rules as BundleRules).totalUses }} {{ (passResult.wallet.rules as BundleRules).label }} restantes</span>
            </div>
            <div class="progress-bar-wrap">
              <div
                class="progress-bar-fill"
                :style="{
                  width: `${Math.min(100, (passResult.pass.data.remainingUses / (passResult.wallet.rules as BundleRules).totalUses) * 100)}%`
                }"
              />
            </div>
          </template>

          <!-- Giftcard -->
          <template v-else-if="passResult.pass.data.type === 'giftcard'">
            <div class="pass-progress-row">
              <span class="pass-data-value">{{ (passResult.wallet.rules as GiftcardRules).currency }} {{ passResult.pass.data.currentBalance.toFixed(2) }}</span>
              <span class="pass-data-label">disponibles</span>
            </div>
          </template>

          <!-- Coupon -->
          <template v-else-if="passResult.pass.data.type === 'coupon'">
            <p class="pass-data-value">
              {{ (passResult.wallet.rules as CouponRules).discountType === 'percent'
                ? `${(passResult.wallet.rules as CouponRules).discount}% OFF`
                : `${(passResult.wallet.rules as CouponRules).currency ?? ''} ${(passResult.wallet.rules as CouponRules).discount} OFF` }}
            </p>
            <p class="pass-data-sub">{{ passResult.pass.data.used ? 'Ya fue canjeado' : 'Válido · listo para canjear' }}</p>
          </template>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="action-group">

        <!-- Stamps -->
        <template v-if="passResult.pass.data.type === 'stamps'">
          <div v-if="passResult.pass.status === 'completed'" class="completed-state">
            <div class="completed-banner">
              <p class="completed-title">🎁 Premio listo</p>
              <p class="completed-reward">{{ (passResult.wallet.rules as StampsRules).reward }}</p>
            </div>
            <button class="btn-action-claim" :disabled="loading" @click="openRenewModal()">
              {{ loading ? 'Procesando…' : 'Reclamar premio' }}
            </button>
          </div>
          <button
            v-else
            class="btn-action-primary"
            :disabled="loading"
            @click="applyAction('add_stamp')"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            {{ loading ? 'Agregando…' : 'Agregar sello' }}
          </button>
        </template>

        <!-- Points -->
        <template v-else-if="passResult.pass.data.type === 'points'">
          <div v-if="passResult.pass.status === 'completed'" class="completed-state">
            <div class="completed-banner">
              <p class="completed-title">🎁 Premio listo</p>
              <p class="completed-reward">{{ (passResult.wallet.rules as PointsRules).reward }}</p>
            </div>
            <button class="btn-action-claim" :disabled="loading" @click="openRenewModal()">
              {{ loading ? 'Procesando…' : 'Canjear recompensa' }}
            </button>
          </div>
          <div v-else class="points-row">
            <div class="stepper-wrap">
              <button type="button" class="stepper-btn" :disabled="pointsAmount <= 1" @click="pointsAmount = Math.max(1, pointsAmount - 1)">−</button>
              <input v-model.number="pointsAmount" type="number" min="1" class="stepper-input" />
              <button type="button" class="stepper-btn" @click="pointsAmount++">+</button>
            </div>
            <button
              class="btn-action-primary"
              :disabled="loading || pointsAmount < 1"
              @click="applyAction('add_points')"
            >
              {{ loading ? 'Agregando…' : `+ Agregar ${(passResult.wallet.rules as PointsRules).pointsLabel}` }}
            </button>
          </div>
        </template>

        <!-- Membership -->
        <button
          v-else-if="passResult.pass.data.type === 'membership'"
          class="btn-action-primary"
          :disabled="loading"
          @click="applyAction('renew_membership')"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          {{ loading ? 'Registrando…' : 'Registrar visita' }}
        </button>

        <!-- Daypass -->
        <button
          v-else-if="passResult.pass.data.type === 'daypass'"
          class="btn-action-primary"
          :class="{ 'btn-disabled': passResult.pass.data.used || !!scanRateLimitedUntil }"
          :disabled="loading || passResult.pass.data.used || !!scanRateLimitedUntil"
          @click="markDaypassUsed"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          {{
            passResult.pass.data.used
              ? 'Pase ya utilizado'
              : scanRateLimitedUntil
                ? `Espera ${scanRateLimitedSecs}s…`
                : loading
                  ? 'Validando…'
                  : 'Validar pase'
          }}
        </button>

        <!-- Bundle -->
        <template v-else-if="passResult.pass.data.type === 'bundle'">
          <div v-if="passResult.pass.status === 'completed'" class="completed-state">
            <div class="completed-banner">
              <p class="completed-title">Paquete agotado</p>
              <p class="completed-reward">{{ (passResult.wallet.rules as BundleRules).label }}</p>
            </div>
            <button class="btn-action-claim" :disabled="loading" @click="openRenewModal()">
              {{ loading ? 'Procesando…' : 'Recargar paquete' }}
            </button>
          </div>
          <button
            v-else
            class="btn-action-primary"
            :class="{ 'btn-disabled': passResult.pass.data.remainingUses <= 0 }"
            :disabled="loading || passResult.pass.data.remainingUses <= 0"
            @click="useBundle"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            {{ passResult.pass.data.remainingUses <= 0
              ? 'Sin usos disponibles'
              : (loading ? 'Registrando…' : `Registrar uso`) }}
          </button>
        </template>

        <!-- Giftcard -->
        <template v-else-if="passResult.pass.data.type === 'giftcard'">
          <button class="btn-action-primary" :disabled="loading" @click="openGiftcardModal('add_giftcard')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Recargar saldo
          </button>
          <button
            class="btn-action-secondary"
            :disabled="loading || passResult.pass.data.currentBalance <= 0"
            @click="openGiftcardModal('subtract_giftcard')"
          >
            Canjear saldo
          </button>
        </template>

        <!-- Coupon -->
        <button
          v-else-if="passResult.pass.data.type === 'coupon'"
          class="btn-action-primary"
          :class="{ 'btn-disabled': passResult.pass.data.used }"
          :disabled="loading || passResult.pass.data.used"
          @click="redeemCoupon"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          {{ passResult.pass.data.used ? 'Cupón ya canjeado' : (loading ? 'Canjeando…' : 'Canjear cupón') }}
        </button>

        <!-- Cashback -->
        <template v-else-if="passResult.pass.data.type === 'cashback'">
          <button class="btn-action-primary" :disabled="loading" @click="openCashbackModal('add_cashback')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Agregar cashback
          </button>
          <button
            class="btn-action-secondary"
            :disabled="loading || passResult.pass.data.balance <= 0"
            @click="openCashbackModal('subtract_cashback')"
          >
            Canjear cashback
          </button>

          <!-- Transaction history -->
          <div class="tx-history">
            <p class="tx-title">Historial de transacciones</p>
            <div v-if="loadingTx" class="tx-empty">Cargando…</div>
            <div v-else-if="!transactions.length" class="tx-empty">Sin transacciones aún.</div>
            <div v-else class="tx-list">
              <div v-for="tx in transactions" :key="tx.id" class="tx-row">
                <div>
                  <p class="tx-detail">Compra: {{ (passResult.wallet.rules as CashbackRules).currency }} {{ tx.purchaseAmount.toFixed(2) }} · {{ tx.cashbackPercent }}%</p>
                  <p class="tx-date">{{ new Date(tx.createdAt).toLocaleDateString('es-MX') }}</p>
                </div>
                <p class="tx-amount" :class="tx.cashbackAmount >= 0 ? 'tx-amount--pos' : 'tx-amount--neg'">
                  {{ tx.cashbackAmount >= 0 ? '+' : '' }}{{ (passResult.wallet.rules as CashbackRules).currency }} {{ Math.abs(tx.cashbackAmount).toFixed(2) }}
                </p>
              </div>
            </div>
          </div>
        </template>
      </div>

      <button class="btn-cancel" @click="startScanner">
        Cancelar y escanear otro
      </button>
    </div>

    <!-- ── Success ──────────────────────────────────────────── -->
    <div v-else-if="step === 'success' && passResult" class="result-state">
      <div class="result-icon result-icon--success">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary-mid)" stroke-width="2.5" stroke-linecap="round">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </div>

      <div class="result-text">
        <p class="result-title">{{ successMsg }}</p>
        <p class="result-sub">{{ passResult.pass.customerName }}</p>
      </div>

      <!-- Updated state pill -->
      <div
        class="result-state-card"
        :style="{ background: `linear-gradient(135deg, ${passResult.wallet.primaryColor}, ${passResult.wallet.accentColor})` }"
      >
        <p class="result-business">{{ passResult.wallet.businessName }}</p>
        <template v-if="passResult.pass.data.type === 'stamps'">
          <p class="result-state-val">
            {{ passResult.pass.data.currentStamps }} / {{ (passResult.wallet.rules as StampsRules).totalStamps }} sellos
            <span v-if="passResult.pass.status === 'completed'"> · ¡Recompensa lista!</span>
          </p>
        </template>
        <template v-else-if="passResult.pass.data.type === 'points'">
          <p class="result-state-val">{{ passResult.pass.data.currentPoints }} {{ (passResult.wallet.rules as PointsRules).pointsLabel }}</p>
        </template>
        <template v-else-if="passResult.pass.data.type === 'membership'">
          <p class="result-state-val">{{ passResult.pass.customerName }} · Membresía activa</p>
        </template>
        <template v-else-if="passResult.pass.data.type === 'cashback'">
          <p class="result-state-val">{{ (passResult.wallet.rules as CashbackRules).currency }} {{ passResult.pass.data.balance.toFixed(2) }} de saldo</p>
        </template>
        <template v-else-if="passResult.pass.data.type === 'bundle'">
          <p class="result-state-val">
            {{ passResult.pass.data.remainingUses }} / {{ (passResult.wallet.rules as BundleRules).totalUses }} {{ (passResult.wallet.rules as BundleRules).label }} restantes
          </p>
        </template>
        <template v-else-if="passResult.pass.data.type === 'giftcard'">
          <p class="result-state-val">{{ (passResult.wallet.rules as GiftcardRules).currency }} {{ passResult.pass.data.currentBalance.toFixed(2) }} de saldo</p>
        </template>
        <template v-else-if="passResult.pass.data.type === 'coupon'">
          <p class="result-state-val">{{ passResult.pass.data.used ? 'Cupón canjeado' : 'Cupón válido' }}</p>
        </template>
      </div>

      <button class="btn-action-primary" @click="scanAnother">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
        </svg>
        Escanear otro pase
      </button>
    </div>

    <!-- ── Error ────────────────────────────────────────────── -->
    <div v-else-if="step === 'error'" class="result-state">
      <div class="result-icon result-icon--error">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.5" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </div>

      <div class="result-text">
        <p class="result-title">No se pudo procesar</p>
        <p class="result-sub error-msg">{{ errorMsg }}</p>
      </div>

      <button class="btn-action-primary" @click="startScanner">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </svg>
        Intentar de nuevo
      </button>
    </div>

    <!-- ── Renew / Claim Modal ───────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showRenewModal" class="modal-backdrop" @click.self="showRenewModal = false">
          <div class="modal-card">
            <div class="modal-header">
              <p class="modal-title">
                {{ passResult?.pass.data.type === 'bundle' ? 'Recargar paquete' : 'Entregar premio' }}
              </p>
              <p class="modal-sub">
                {{ passResult?.pass.data.type === 'bundle'
                  ? `¿Recargar el paquete "${renewRewardLabel}"?`
                  : `¿Entregar el premio: ${renewRewardLabel}?` }}
              </p>
            </div>
            <p v-if="renewError" class="modal-error">{{ renewError }}</p>
            <div class="modal-actions">
              <button class="modal-btn-cancel" :disabled="loading" @click="showRenewModal = false">Cancelar</button>
              <button class="modal-btn-confirm modal-btn-confirm--claim" :disabled="loading" @click="claimAndReset()">
                {{ loading ? 'Procesando…' : 'Confirmar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Giftcard Modal ───────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showGiftcardModal" class="modal-backdrop" @click.self="showGiftcardModal = false">
          <div class="modal-card">
            <div class="modal-header">
              <p class="modal-title">{{ giftcardAction === 'add_giftcard' ? 'Recargar saldo' : 'Canjear saldo' }}</p>
              <p class="modal-sub">
                {{ giftcardAction === 'subtract_giftcard'
                  ? `Máx. ${(passResult?.wallet.rules as GiftcardRules)?.currency} ${(passResult?.pass.data as any)?.currentBalance?.toFixed(2)}`
                  : 'Ingresa el monto a recargar' }}
              </p>
            </div>
            <div class="modal-field">
              <label class="field-label">Monto <span class="required">*</span></label>
              <input
                v-model="giftcardAmount"
                type="number" min="0" step="0.01" placeholder="0.00"
                class="field-input"
              />
            </div>
            <p v-if="giftcardModalError" class="modal-error">{{ giftcardModalError }}</p>
            <div class="modal-actions">
              <button class="modal-btn-cancel" @click="showGiftcardModal = false">Cancelar</button>
              <button
                class="modal-btn-confirm"
                :disabled="loading"
                @click="submitGiftcard"
              >
                {{ loading ? 'Procesando…' : 'Confirmar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Cashback Modal ───────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCashbackModal" class="modal-backdrop" @click.self="showCashbackModal = false">
          <div class="modal-card">
            <div class="modal-header">
              <p class="modal-title">{{ cashbackAction === 'add_cashback' ? 'Agregar cashback' : 'Canjear cashback' }}</p>
              <p v-if="cashbackAction === 'subtract_cashback'" class="modal-sub">
                Máx. {{ (passResult?.wallet.rules as CashbackRules)?.currency }} {{ (passResult?.pass.data as any)?.balance?.toFixed(2) }}
              </p>
            </div>

            <template v-if="cashbackAction === 'add_cashback'">
              <div class="modal-field">
                <label class="field-label">Monto de compra <span class="required">*</span></label>
                <input v-model="cashbackForm.purchaseAmount" type="number" min="0" step="0.01" placeholder="0.00" class="field-input" />
              </div>
              <div class="modal-field">
                <label class="field-label">
                  % Cashback
                  <span class="field-label-hint">(vacío = {{ (passResult?.wallet.rules as CashbackRules)?.cashbackPercent }}% configurado)</span>
                </label>
                <input
                  v-model="cashbackForm.cashbackPercent" type="number" min="1" max="100"
                  :placeholder="`${(passResult?.wallet.rules as CashbackRules)?.cashbackPercent ?? ''}`"
                  class="field-input"
                />
              </div>
              <div v-if="cashbackPreview() !== null" class="cashback-preview">
                <p class="cashback-preview-label">Cashback a agregar</p>
                <p class="cashback-preview-amount">
                  {{ (passResult?.wallet.rules as CashbackRules)?.currency }} {{ cashbackPreview()!.toFixed(2) }}
                </p>
              </div>
            </template>

            <template v-else>
              <div class="modal-field">
                <label class="field-label">Monto a canjear <span class="required">*</span></label>
                <input
                  v-model="cashbackForm.amount" type="number" min="0" step="0.01"
                  :max="(passResult?.pass.data as any)?.balance"
                  placeholder="0.00"
                  class="field-input"
                />
              </div>
            </template>

            <div class="modal-field">
              <label class="field-label">Descripción <span class="field-label-hint">(opcional)</span></label>
              <input
                v-model="cashbackForm.description" type="text"
                :placeholder="cashbackAction === 'add_cashback' ? 'Ej. Compra en tienda' : 'Ej. Canje en caja'"
                class="field-input"
              />
            </div>

            <p v-if="cashbackModalError" class="modal-error">{{ cashbackModalError }}</p>

            <div class="modal-actions">
              <button class="modal-btn-cancel" @click="showCashbackModal = false">Cancelar</button>
              <button class="modal-btn-confirm" :disabled="loading" @click="submitCashback">
                {{ loading ? 'Procesando…' : 'Confirmar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.scan-page {
  max-width: 420px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Scanning ──────────────────────────────────────────────── */
.scan-state { display: flex; flex-direction: column; gap: 16px; }

.scan-header { text-align: center; }

.scan-hint {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

.viewfinder-wrap {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  background: var(--primary);
  aspect-ratio: 1;
}

.viewfinder-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.vf-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.corner {
  position: absolute;
  width: 36px;
  height: 36px;
  border-color: var(--amber);
  border-style: solid;
  border-width: 0;
}
.corner.tl { top: 28px; left: 28px; border-top-width: 3px; border-left-width: 3px; border-radius: 4px 0 0 0; }
.corner.tr { top: 28px; right: 28px; border-top-width: 3px; border-right-width: 3px; border-radius: 0 4px 0 0; }
.corner.bl { bottom: 28px; left: 28px; border-bottom-width: 3px; border-left-width: 3px; border-radius: 0 0 0 4px; }
.corner.br { bottom: 28px; right: 28px; border-bottom-width: 3px; border-right-width: 3px; border-radius: 0 0 4px 0; }

.scan-line {
  position: absolute;
  left: 28px;
  right: 28px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--amber), transparent);
  animation: scan-sweep 2s ease-in-out infinite;
  border-radius: 2px;
}

@keyframes scan-sweep {
  0%   { top: 28px; opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { top: calc(100% - 28px); opacity: 0; }
}

.scan-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.scan-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--amber);
  animation: pulse-dot 1.4s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}

.scan-status-text {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

/* ── Confirm ───────────────────────────────────────────────── */
.confirm-state { display: flex; flex-direction: column; gap: 16px; }

.pass-card {
  border-radius: 18px;
  padding: 18px;
  color: #fff;
}

.pass-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.pass-avatar {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.pass-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}

.pass-avatar-initials {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: #fff;
}

.pass-card-meta { flex: 1; min-width: 0; }

.pass-business {
  font-size: 10px;
  font-weight: 700;
  opacity: 0.75;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 2px;
}

.pass-customer {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pass-type-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
}

.pass-data {}

.membership-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.member-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  border: 2px solid rgba(255,255,255,0.4);
  background: rgba(255,255,255,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
}

.member-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.member-initials {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.5px;
}

.pass-progress-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 8px;
}

.pass-data-value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
}

.pass-data-label {
  font-size: 13px;
  opacity: 0.8;
  font-weight: 500;
}

.pass-data-sub {
  font-size: 11px;
  opacity: 0.75;
  margin: 4px 0 0;
}

.pass-reward-hint {
  font-size: 12px;
  font-weight: 600;
  background: rgba(255,255,255,0.2);
  border-radius: 6px;
  padding: 4px 10px;
  margin-top: 8px;
  display: inline-block;
}

.progress-bar-wrap {
  height: 5px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 999px;
  transition: width 0.5s ease;
}

/* Action group */
.action-group { display: flex; flex-direction: column; gap: 10px; }

.points-row {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

/* Stepper (for points) */
.stepper-wrap {
  display: flex;
  align-items: stretch;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-surface);
  flex-shrink: 0;
}

.stepper-btn {
  width: 36px;
  background: var(--bg-page);
  border: none;
  font-size: 17px;
  color: var(--text-medium);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;
}
.stepper-btn:hover:not(:disabled) { background: var(--bg-subtle); }
.stepper-btn:disabled { opacity: 0.3; cursor: default; }

.stepper-input {
  width: 52px;
  border: none;
  border-left: 1.5px solid var(--border);
  border-right: 1.5px solid var(--border);
  background: var(--bg-surface);
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-ink);
  font-family: inherit;
  outline: none;
}

.btn-action-primary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 14px 20px;
  border-radius: 12px;
  background: var(--primary);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  border: none;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.btn-action-primary:hover:not(:disabled):not(.btn-disabled) { background: var(--primary-mid); }
.btn-action-primary:disabled,
.btn-action-primary.btn-disabled { opacity: 0.45; cursor: not-allowed; }

.btn-action-secondary {
  width: 100%;
  padding: 13px 20px;
  border-radius: 12px;
  background: var(--bg-surface);
  color: var(--text-medium);
  font-size: 14px;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  border: 1.5px solid var(--border);
  cursor: pointer;
  transition: background 0.12s;
}
.btn-action-secondary:hover:not(:disabled) { background: var(--bg-page); }
.btn-action-secondary:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-cancel {
  width: 100%;
  padding: 10px;
  font-size: 13px;
  color: var(--text-faint);
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.15s;
  text-align: center;
}
.btn-cancel:hover { color: var(--text-muted); }

/* Cashback tx history */
.tx-history {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.tx-title {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  margin: 0;
}

.tx-empty {
  padding: 16px 14px;
  font-size: 12px;
  color: var(--text-faint);
  text-align: center;
}

.tx-list {
  max-height: 180px;
  overflow-y: auto;
}

.tx-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 9px 14px;
  border-bottom: 1px solid var(--border);
  gap: 12px;
}
.tx-row:last-child { border-bottom: none; }

.tx-detail { font-size: 12px; color: var(--text-medium); margin: 0 0 2px; }
.tx-date { font-size: 10px; color: var(--text-faint); margin: 0; }

.tx-amount {
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  margin: 0;
}
.tx-amount--pos { color: var(--primary-mid); }
.tx-amount--neg { color: var(--danger); }

/* ── Success / Error ───────────────────────────────────────── */
.result-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.result-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.result-icon--success { background: var(--primary-light); }
.result-icon--error   { background: var(--danger-bg); }

.result-text { display: flex; flex-direction: column; gap: 4px; }

.result-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0;
}

.result-sub {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

.error-msg { color: var(--danger); }

.result-state-card {
  width: 100%;
  border-radius: 14px;
  padding: 14px 18px;
  color: #fff;
}

.result-business {
  font-size: 10px;
  font-weight: 700;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 4px;
}

.result-state-val {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
}

/* ── Modals ────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  background: var(--overlay);
  backdrop-filter: blur(2px);
}

@media (min-width: 480px) {
  .modal-backdrop { align-items: center; }
}

.modal-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-surface);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(15, 27, 20, 0.2);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-header { display: flex; flex-direction: column; gap: 3px; }

.modal-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0;
}

.modal-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

.modal-field { display: flex; flex-direction: column; gap: 6px; }

.field-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.field-label-hint {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text-faint);
}

.required { color: var(--danger); }

.field-input {
  width: 100%;
  padding: 11px 13px;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: var(--bg-surface);
  font-size: 13px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: var(--text-ink);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}
.field-input::placeholder { color: var(--text-faint); }
.field-input:focus {
  border-color: var(--amber);
  box-shadow: 0 0 0 3px var(--amber-bg);
}

.cashback-preview {
  background: var(--bg-page);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 16px;
  text-align: center;
}
.cashback-preview-label { font-size: 11px; color: var(--text-muted); margin: 0 0 4px; }
.cashback-preview-amount { font-size: 20px; font-weight: 700; color: var(--text-ink); margin: 0; }

.modal-error { font-size: 11px; color: var(--danger); margin: 0; }

.modal-actions { display: flex; gap: 10px; }

.modal-btn-cancel {
  flex: 1;
  padding: 11px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--bg-surface);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-medium);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;
}
.modal-btn-cancel:hover { background: var(--bg-page); }

.modal-btn-confirm {
  flex: 1;
  padding: 11px;
  border-radius: 10px;
  border: none;
  background: var(--primary);
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, opacity 0.15s;
}
.modal-btn-confirm:hover:not(:disabled) { background: var(--primary-mid); }
.modal-btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-card,
.modal-leave-active .modal-card { transition: transform 0.2s ease; }
.modal-enter-from .modal-card,
.modal-leave-to .modal-card { transform: translateY(16px) scale(0.98); }

.modal-btn-confirm--claim { background: #d97706; }
.modal-btn-confirm--claim:hover:not(:disabled) { background: #b45309; }

/* ── Completed state (premio listo / paquete agotado) ──── */
.completed-state { display: flex; flex-direction: column; gap: 10px; }

.completed-banner {
  background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(251,191,36,0.12));
  border: 1.5px solid rgba(245,158,11,0.3);
  border-radius: 12px;
  padding: 14px 16px;
  text-align: center;
}

.completed-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0 0 4px;
}

.completed-reward {
  font-size: 13px;
  color: var(--text-medium);
  margin: 0;
}

.btn-action-claim {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 14px 20px;
  border-radius: 12px;
  background: #d97706;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  border: none;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.btn-action-claim:hover:not(:disabled) { background: #b45309; }
.btn-action-claim:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
