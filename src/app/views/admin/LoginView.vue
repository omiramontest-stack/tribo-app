<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import WalletPublicLayout from '@/app/layouts/WalletPublicLayout.vue'
import { useAuthStore } from '@/app/stores/auth/AuthStore'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  try {
    loading.value = true
    error.value = ''
    await authStore.login(email.value, password.value)
    await router.push({ name: 'Dashboard' })
  } catch {
    error.value = 'Credenciales incorrectas'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <WalletPublicLayout>
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-white">Wallet SaaS</h1>
        <p class="text-neutral-400 text-sm mt-1">Panel de administración</p>
      </div>

      <form
        class="bg-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl"
        @submit.prevent="handleLogin"
      >
        <div>
          <label class="block text-sm text-neutral-300 mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="admin@wallet.com"
            class="w-full bg-neutral-700 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm text-neutral-300 mb-1">Contraseña</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full bg-neutral-700 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
        >
          {{ loading ? 'Entrando...' : 'Iniciar sesión' }}
        </button>

        <p class="text-center text-xs text-neutral-500">
          Demo: admin@wallet.com / admin123
        </p>
      </form>
    </div>
  </WalletPublicLayout>
</template>
