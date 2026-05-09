<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WalletPublicLayout from '@/app/layouts/WalletPublicLayout.vue'
import StampsCard from '@/app/components/Wallet/StampsCard.vue'
import MembershipCard from '@/app/components/Wallet/MembershipCard.vue'
import PointsCard from '@/app/components/Wallet/PointsCard.vue'
import CashbackCard from '@/app/components/Wallet/CashbackCard.vue'
import DaypassCard from '@/app/components/Wallet/DaypassCard.vue'
import BundleCard from '@/app/components/Wallet/BundleCard.vue'
import GiftcardCard from '@/app/components/Wallet/GiftcardCard.vue'
import CouponCard from '@/app/components/Wallet/CouponCard.vue'
import WalletQR from '@/app/components/Wallet/WalletQR.vue'
import { usePassStore } from '@/app/stores/pass/PassStore'
import { ApiError, apiClient } from '@/infrastructure/http/ApiClient'
import type { CashbackRules } from '@/domain/wallet/entities/WalletRules'
import type { CashbackTransaction } from '@/domain/pass/repository/PassRepository'

const route = useRoute()
const router = useRouter()
const passStore = usePassStore()

const loading = ref(true)
const error = ref(false)
const transactions = ref<CashbackTransaction[]>([])
const loadingTx = ref(false)
const secondsLeft = ref<number | null>(null)
let countdownTimer: ReturnType<typeof setInterval> | null = null

function startCountdown(dlExpiresAt: string) {
  const tick = () => {
    const s = Math.floor((new Date(dlExpiresAt).getTime() - Date.now()) / 1000)
    if (s <= 0) {
      secondsLeft.value = 0
      if (countdownTimer) clearInterval(countdownTimer)
      router.replace({ name: 'LinkExpired' })
    } else {
      secondsLeft.value = s
    }
  }
  tick()
  countdownTimer = setInterval(tick, 1000)
}

onUnmounted(() => { if (countdownTimer) clearInterval(countdownTimer) })

const dl = computed(() => route.query.dl as string | undefined)

const isCashback = computed(() => passStore.currentPassWallet?.type === 'cashback')
const isDaypass = computed(() => passStore.currentPassWallet?.type === 'daypass')
const isBundle = computed(() => passStore.currentPassWallet?.type === 'bundle')
const isGiftcard = computed(() => passStore.currentPassWallet?.type === 'giftcard')
const isCoupon = computed(() => passStore.currentPassWallet?.type === 'coupon')

const cashbackRules = computed(() =>
  isCashback.value ? (passStore.currentPassWallet!.rules as CashbackRules) : null,
)

function dlParam(sep: '?' | '&' = '?') {
  return dl.value ? `${sep}dl=${encodeURIComponent(dl.value)}` : ''
}

async function loadTransactions() {
  if (!isCashback.value || !passStore.currentPass) return
  loadingTx.value = true
  try {
    transactions.value = await passStore.fetchTransactions(passStore.currentPass.token)
  } finally {
    loadingTx.value = false
  }
}

onMounted(async () => {
  const token = route.params.token as string

  try {
    await passStore.fetchPassByToken(token, dl.value)
    if (passStore.currentPass?.dlExpiresAt) startCountdown(passStore.currentPass.dlExpiresAt)
    if (isCashback.value) await loadTransactions()
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      router.replace({ name: 'LinkExpired' })
      return
    }
    error.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <WalletPublicLayout>
    <div v-if="loading" class="text-neutral-400 text-sm">Cargando wallet...</div>

    <div v-else-if="error" class="text-center text-neutral-400">
      <p class="text-4xl mb-3">😕</p>
      <p class="font-medium text-white">Wallet no encontrada</p>
      <p class="text-sm mt-1">El enlace puede ser incorrecto o haber expirado.</p>
    </div>

    <div v-else-if="passStore.currentPass && passStore.currentPassWallet" class="w-full max-w-sm space-y-4">
      <!-- Download-link countdown -->
      <div
        v-if="secondsLeft !== null"
        style="display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); font-size: 12px; color: #9DB7A8;"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink: 0;">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
        <span style="flex: 1;">Este enlace expira en</span>
        <span style="font-variant-numeric: tabular-nums; font-weight: 700; color: #fff;">
          {{ Math.floor(secondsLeft / 60).toString().padStart(2, '0') }}:{{ (secondsLeft % 60).toString().padStart(2, '0') }}
        </span>
      </div>
      <StampsCard
        v-if="passStore.currentPassWallet.type === 'stamps'"
        :pass="passStore.currentPass"
        :wallet="passStore.currentPassWallet"
      />
      <MembershipCard
        v-else-if="passStore.currentPassWallet.type === 'membership'"
        :pass="passStore.currentPass"
        :wallet="passStore.currentPassWallet"
      />
      <PointsCard
        v-else-if="passStore.currentPassWallet.type === 'points'"
        :pass="passStore.currentPass"
        :wallet="passStore.currentPassWallet"
      />
      <CashbackCard
        v-else-if="isCashback"
        :pass="passStore.currentPass"
        :wallet="passStore.currentPassWallet"
      />
      <DaypassCard
        v-else-if="isDaypass"
        :pass="passStore.currentPass"
        :wallet="passStore.currentPassWallet"
      />
      <BundleCard
        v-else-if="isBundle"
        :pass="passStore.currentPass"
        :wallet="passStore.currentPassWallet"
      />
      <GiftcardCard
        v-else-if="isGiftcard"
        :pass="passStore.currentPass"
        :wallet="passStore.currentPassWallet"
      />
      <CouponCard
        v-else-if="isCoupon"
        :pass="passStore.currentPass"
        :wallet="passStore.currentPassWallet"
      />

      <!-- QR -->
      <div v-if="(!isDaypass && !isCoupon) || !(passStore.currentPass.data as any).used" class="bg-neutral-800 rounded-2xl p-5 flex flex-col items-center gap-3">
        <p class="text-xs text-neutral-400">Muestra este QR al negocio</p>
        <WalletQR :url="$router.resolve({ name: 'PassView', params: { token: passStore.currentPass.token } }).href" />
      </div>

      <a
        :href="apiClient.urlFor(`/passes/${passStore.currentPass.token}/apple${dlParam()}`)"
        class="flex justify-center"
      >
        <img src="/add-to-wallet.png" alt="Add to Apple Wallet" class="h-10" />
      </a>


      <!-- Cashback: historial de transacciones (solo lectura) -->
      <div v-if="isCashback" class="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
        <div class="px-4 py-3 border-b border-neutral-800">
          <h3 class="text-white font-semibold text-sm">Historial de transacciones</h3>
        </div>
        <div v-if="loadingTx" class="px-4 py-6 text-center text-neutral-500 text-xs">Cargando...</div>
        <div v-else-if="!transactions.length" class="px-4 py-6 text-center text-neutral-500 text-xs">
          Sin transacciones aún
        </div>
        <div v-else class="divide-y divide-neutral-800">
          <div
            v-for="tx in transactions"
            :key="tx.id"
            class="px-4 py-3 flex items-start justify-between gap-2"
          >
            <div class="min-w-0">
              <p class="text-white text-xs font-medium">
                Compra: {{ cashbackRules?.currency }} {{ tx.purchaseAmount.toFixed(2) }} · {{ tx.cashbackPercent }}%
              </p>
              <p v-if="tx.description" class="text-neutral-400 text-xs mt-0.5 truncate">{{ tx.description }}</p>
              <p class="text-neutral-500 text-xs mt-0.5">
                {{ new Date(tx.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
              </p>
            </div>
            <p
              class="text-sm font-bold shrink-0"
              :class="tx.cashbackAmount >= 0 ? 'text-green-400' : 'text-red-400'"
            >
              {{ tx.cashbackAmount >= 0 ? '+' : '' }}{{ cashbackRules?.currency }} {{ Math.abs(tx.cashbackAmount).toFixed(2) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </WalletPublicLayout>
</template>
