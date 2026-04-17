<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import WalletPublicLayout from '@/app/layouts/WalletPublicLayout.vue'
import StampsCard from '@/app/components/Wallet/StampsCard.vue'
import MembershipCard from '@/app/components/Wallet/MembershipCard.vue'
import PointsCard from '@/app/components/Wallet/PointsCard.vue'
import WalletQR from '@/app/components/Wallet/WalletQR.vue'
import { usePassStore } from '@/app/stores/pass/PassStore'

const route = useRoute()
const passStore = usePassStore()

const loading = ref(true)
const error = ref(false)

onMounted(async () => {
  try {
    await passStore.fetchPassByToken(route.params.token as string)
  } catch {
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
        v-else
        :pass="passStore.currentPass"
        :wallet="passStore.currentPassWallet"
      />

      <div class="bg-neutral-800 rounded-2xl p-5 flex flex-col items-center gap-3">
        <p class="text-xs text-neutral-400">Muestra este QR al negocio</p>
        <WalletQR :url="$router.resolve({ name: 'PassView', params: { token: passStore.currentPass.token } }).href" />
      </div>
    </div>
  </WalletPublicLayout>
</template>
