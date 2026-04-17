<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'
import type { CreateWalletDto } from '@/application/wallet/dto/CreateWalletDto'
import type { WalletType } from '@/domain/wallet/entities/Wallet'
import type { StampsRules, MembershipRules, PointsRules } from '@/domain/wallet/entities/WalletRules'
import StampsCard from '@/app/components/Wallet/StampsCard.vue'
import MembershipCard from '@/app/components/Wallet/MembershipCard.vue'
import PointsCard from '@/app/components/Wallet/PointsCard.vue'
import type { Pass } from '@/domain/pass/entities/Pass'

const router = useRouter()
const walletStore = useWalletStore()

const step = ref(1)
const loading = ref(false)

const form = reactive<CreateWalletDto>({
  type: 'stamps',
  businessName: '',
  logoUrl: '',
  primaryColor: '#2563EB',
  accentColor: '#FACC15',
  description: '',
  rules: { type: 'stamps', totalStamps: 10, reward: 'Un producto gratis' },
})

watch(
  () => form.type,
  (type: WalletType) => {
    if (type === 'stamps') {
      form.rules = { type: 'stamps', totalStamps: 10, reward: 'Un producto gratis' }
    } else if (type === 'membership') {
      form.rules = { type: 'membership', level: 'Gold Member', expiresInDays: null }
    } else {
      form.rules = { type: 'points', pointsLabel: 'puntos', reward: 'Descuento 10%', rewardThreshold: 100 }
    }
  },
)

const walletTypes: { value: WalletType; label: string; emoji: string; desc: string }[] = [
  { value: 'stamps', label: 'Sellos', emoji: '☕', desc: 'Tarjeta de lealtad con sellos' },
  { value: 'membership', label: 'Membresía', emoji: '🎖️', desc: 'Tarjeta de miembro con nivel' },
  { value: 'points', label: 'Puntos', emoji: '⭐', desc: 'Acumulación de puntos canjeables' },
]

const previewPass: Pass = {
  id: 'preview',
  walletId: 'preview',
  token: 'preview',
  customerName: 'Juan Pérez',
  createdAt: new Date().toISOString(),
  data: { type: 'stamps', currentStamps: 3 },
}

function getPreviewPass(): Pass {
  if (form.type === 'stamps') return { ...previewPass, data: { type: 'stamps', currentStamps: 3 } }
  if (form.type === 'membership') return { ...previewPass, data: { type: 'membership', memberSince: new Date().toISOString(), expiresAt: null } }
  return { ...previewPass, data: { type: 'points', currentPoints: 45 } }
}

async function handleSubmit() {
  try {
    loading.value = true
    await walletStore.createWallet(form)
    router.push({ name: 'Wallets' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="flex items-center gap-3">
      <button class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200" @click="router.back()">
        ← Volver
      </button>
      <h1 class="text-2xl font-bold text-neutral-800 dark:text-white">Nueva Wallet</h1>
    </div>

    <!-- Step indicator -->
    <div class="flex gap-2">
      <div
        v-for="s in 4"
        :key="s"
        class="h-1.5 flex-1 rounded-full transition-colors"
        :class="s <= step ? 'bg-blue-600' : 'bg-neutral-200 dark:bg-neutral-700'"
      />
    </div>

    <!-- Step 1: Tipo -->
    <div v-if="step === 1" class="space-y-4">
      <h2 class="font-semibold text-neutral-700 dark:text-neutral-200">1. Tipo de wallet</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          v-for="wt in walletTypes"
          :key="wt.value"
          class="p-4 rounded-xl border-2 text-left transition-all"
          :class="
            form.type === wt.value
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
          "
          @click="form.type = wt.value"
        >
          <span class="text-2xl">{{ wt.emoji }}</span>
          <p class="font-medium text-sm mt-2 text-neutral-800 dark:text-white">{{ wt.label }}</p>
          <p class="text-xs text-neutral-500 mt-0.5">{{ wt.desc }}</p>
        </button>
      </div>
      <button class="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium" @click="step = 2">
        Continuar →
      </button>
    </div>

    <!-- Step 2: Branding -->
    <div v-if="step === 2" class="space-y-4">
      <h2 class="font-semibold text-neutral-700 dark:text-neutral-200">2. Branding</h2>
      <div class="bg-white dark:bg-neutral-800 rounded-xl p-5 space-y-4 border border-neutral-100 dark:border-neutral-700">
        <div>
          <label class="block text-sm text-neutral-600 dark:text-neutral-300 mb-1">Nombre del negocio *</label>
          <input v-model="form.businessName" type="text" placeholder="Ej. Cucara Macara Espresso" class="w-full border border-neutral-200 dark:border-neutral-600 bg-transparent dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label class="block text-sm text-neutral-600 dark:text-neutral-300 mb-1">URL del logo (opcional)</label>
          <input v-model="form.logoUrl" type="url" placeholder="https://..." class="w-full border border-neutral-200 dark:border-neutral-600 bg-transparent dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div class="flex gap-4">
          <div class="flex-1">
            <label class="block text-sm text-neutral-600 dark:text-neutral-300 mb-1">Color principal</label>
            <div class="flex items-center gap-2">
              <input v-model="form.primaryColor" type="color" class="w-10 h-10 rounded cursor-pointer border-0" />
              <span class="text-sm text-neutral-500 font-mono">{{ form.primaryColor }}</span>
            </div>
          </div>
          <div class="flex-1">
            <label class="block text-sm text-neutral-600 dark:text-neutral-300 mb-1">Color acento</label>
            <div class="flex items-center gap-2">
              <input v-model="form.accentColor" type="color" class="w-10 h-10 rounded cursor-pointer border-0" />
              <span class="text-sm text-neutral-500 font-mono">{{ form.accentColor }}</span>
            </div>
          </div>
        </div>
        <div>
          <label class="block text-sm text-neutral-600 dark:text-neutral-300 mb-1">Descripción</label>
          <textarea v-model="form.description" rows="2" placeholder="Descripción breve del programa..." class="w-full border border-neutral-200 dark:border-neutral-600 bg-transparent dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
      </div>
      <div class="flex gap-3">
        <button class="flex-1 border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 py-2.5 rounded-lg text-sm" @click="step = 1">← Atrás</button>
        <button :disabled="!form.businessName" class="flex-1 bg-blue-600 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium" @click="step = 3">Continuar →</button>
      </div>
    </div>

    <!-- Step 3: Reglas -->
    <div v-if="step === 3" class="space-y-4">
      <h2 class="font-semibold text-neutral-700 dark:text-neutral-200">3. Reglas</h2>
      <div class="bg-white dark:bg-neutral-800 rounded-xl p-5 space-y-4 border border-neutral-100 dark:border-neutral-700">
        <!-- Stamps -->
        <template v-if="form.type === 'stamps'">
          <div>
            <label class="block text-sm text-neutral-600 dark:text-neutral-300 mb-1">Total de sellos</label>
            <input v-model.number="(form.rules as StampsRules).totalStamps" type="number" min="2" max="20" class="w-full border border-neutral-200 dark:border-neutral-600 bg-transparent dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm text-neutral-600 dark:text-neutral-300 mb-1">Recompensa</label>
            <input v-model="(form.rules as StampsRules).reward" type="text" placeholder="Ej. 1 café gratis" class="w-full border border-neutral-200 dark:border-neutral-600 bg-transparent dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </template>
        <!-- Membership -->
        <template v-else-if="form.type === 'membership'">
          <div>
            <label class="block text-sm text-neutral-600 dark:text-neutral-300 mb-1">Nivel de membresía</label>
            <input v-model="(form.rules as MembershipRules).level" type="text" placeholder="Ej. Gold Member" class="w-full border border-neutral-200 dark:border-neutral-600 bg-transparent dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm text-neutral-600 dark:text-neutral-300 mb-1">Vencimiento (días, dejar vacío = sin vencimiento)</label>
            <input v-model.number="(form.rules as MembershipRules).expiresInDays" type="number" min="1" placeholder="365" class="w-full border border-neutral-200 dark:border-neutral-600 bg-transparent dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </template>
        <!-- Points -->
        <template v-else>
          <div>
            <label class="block text-sm text-neutral-600 dark:text-neutral-300 mb-1">Nombre de los puntos</label>
            <input v-model="(form.rules as PointsRules).pointsLabel" type="text" placeholder="Ej. puntos" class="w-full border border-neutral-200 dark:border-neutral-600 bg-transparent dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm text-neutral-600 dark:text-neutral-300 mb-1">Recompensa al llegar a</label>
            <input v-model.number="(form.rules as PointsRules).rewardThreshold" type="number" min="1" class="w-full border border-neutral-200 dark:border-neutral-600 bg-transparent dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm text-neutral-600 dark:text-neutral-300 mb-1">Recompensa</label>
            <input v-model="(form.rules as PointsRules).reward" type="text" placeholder="Ej. Descuento 10%" class="w-full border border-neutral-200 dark:border-neutral-600 bg-transparent dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </template>
      </div>
      <div class="flex gap-3">
        <button class="flex-1 border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 py-2.5 rounded-lg text-sm" @click="step = 2">← Atrás</button>
        <button class="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium" @click="step = 4">Vista previa →</button>
      </div>
    </div>

    <!-- Step 4: Preview -->
    <div v-if="step === 4" class="space-y-4">
      <h2 class="font-semibold text-neutral-700 dark:text-neutral-200">4. Vista previa</h2>
      <div class="flex justify-center">
        <StampsCard v-if="form.type === 'stamps'" :pass="getPreviewPass()" :wallet="(form as any)" />
        <MembershipCard v-else-if="form.type === 'membership'" :pass="getPreviewPass()" :wallet="(form as any)" />
        <PointsCard v-else :pass="getPreviewPass()" :wallet="(form as any)" />
      </div>
      <div class="flex gap-3">
        <button class="flex-1 border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 py-2.5 rounded-lg text-sm" @click="step = 3">← Atrás</button>
        <button
          :disabled="loading"
          class="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium"
          @click="handleSubmit"
        >
          {{ loading ? 'Guardando...' : 'Crear Wallet ✓' }}
        </button>
      </div>
    </div>
  </div>
</template>
