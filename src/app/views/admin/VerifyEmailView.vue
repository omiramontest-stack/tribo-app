<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { ApiError } from '@/infrastructure/http/ApiClient'

type State = 'loading' | 'success' | 'error_invalid' | 'error_generic' | 'no_token'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const state = ref<State>('loading')
const resending = ref(false)
const resendDone = ref(false)

onMounted(async () => {
  const token = route.query.token as string | undefined

  if (!token) {
    state.value = 'no_token'
    return
  }

  try {
    await authStore.verifyEmail(token)
    state.value = 'success'
    setTimeout(() => router.push({ name: 'Dashboard' }), 2000)
  } catch (e) {
    const err = e as ApiError
    if (err?.status === 400 && (err?.body as { error?: string })?.error === 'INVALID_OR_EXPIRED_TOKEN') {
      state.value = 'error_invalid'
    } else {
      state.value = 'error_generic'
    }
  }
})

async function handleResend() {
  if (resending.value || resendDone.value) return
  resending.value = true
  try {
    await authStore.resendVerification()
    resendDone.value = true
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <div
    style="min-height: 100vh; background: #F7F4EF; display: grid; place-items: center; padding: 24px; font-family: inherit;"
  >
    <div
      style="background: #fff; border-radius: 20px; padding: 48px 40px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.06);"
    >
      <!-- Logo -->
      <div style="display: flex; justify-content: center; margin-bottom: 32px;">
        <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
          <line x1="10" y1="28" x2="30" y2="28" stroke="#E8920A" stroke-width="2"/>
          <line x1="10" y1="28" x2="20" y2="10" stroke="#E8920A" stroke-width="2"/>
          <line x1="20" y1="10" x2="30" y2="28" stroke="#E8920A" stroke-width="2"/>
          <circle cx="20" cy="10" r="3.5" fill="#E8920A"/>
          <circle cx="10" cy="28" r="3.5" fill="#E8920A"/>
          <circle cx="30" cy="28" r="3.5" fill="#E8920A"/>
        </svg>
      </div>

      <!-- Loading -->
      <template v-if="state === 'loading'">
        <div
          style="width: 48px; height: 48px; border-radius: 50%; border: 3px solid #E8920A; border-top-color: transparent; margin: 0 auto 24px; animation: spin 0.8s linear infinite;"
        />
        <h1 style="font-size: 20px; font-weight: 700; color: #0F1B14; margin-bottom: 8px;">
          Verificando tu correo…
        </h1>
        <p style="font-size: 14px; color: #6B7A72;">
          Un momento, estamos validando tu enlace.
        </p>
      </template>

      <!-- Success -->
      <template v-else-if="state === 'success'">
        <div
          style="width: 56px; height: 56px; border-radius: 50%; background: #D1FAE5; display: grid; place-items: center; margin: 0 auto 24px;"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12l5 5L20 7"/>
          </svg>
        </div>
        <h1 style="font-size: 20px; font-weight: 700; color: #0F1B14; margin-bottom: 8px;">
          ¡Correo verificado!
        </h1>
        <p style="font-size: 14px; color: #6B7A72;">
          Tu cuenta está activa. Redirigiendo al dashboard…
        </p>
      </template>

      <!-- Error: invalid or expired token -->
      <template v-else-if="state === 'error_invalid'">
        <div
          style="width: 56px; height: 56px; border-radius: 50%; background: #FEE2E2; display: grid; place-items: center; margin: 0 auto 24px;"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <h1 style="font-size: 20px; font-weight: 700; color: #0F1B14; margin-bottom: 8px;">
          Enlace inválido o expirado
        </h1>
        <p style="font-size: 14px; color: #6B7A72; margin-bottom: 28px;">
          El enlace de verificación ya no es válido. Puedes solicitar uno nuevo.
        </p>

        <template v-if="resendDone">
          <p style="font-size: 14px; font-weight: 600; color: #16A34A;">
            ¡Listo! Revisa tu bandeja de entrada.
          </p>
        </template>
        <template v-else>
          <button
            :disabled="resending"
            style="width: 100%; padding: 12px; border-radius: 10px; background: #1B4332; color: #fff; font-size: 14px; font-weight: 600; border: none; cursor: pointer; font-family: inherit; transition: opacity 0.15s;"
            :style="{ opacity: resending ? '0.6' : '1' }"
            @click="handleResend"
          >
            {{ resending ? 'Enviando…' : 'Reenviar email de verificación' }}
          </button>
        </template>

        <button
          style="margin-top: 14px; background: none; border: none; cursor: pointer; font-size: 13px; color: #6B7A72; font-family: inherit; text-decoration: underline;"
          @click="router.push({ name: 'Dashboard' })"
        >
          Ir al dashboard
        </button>
      </template>

      <!-- Error: generic -->
      <template v-else-if="state === 'error_generic' || state === 'no_token'">
        <div
          style="width: 56px; height: 56px; border-radius: 50%; background: #FEE2E2; display: grid; place-items: center; margin: 0 auto 24px;"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </div>
        <h1 style="font-size: 20px; font-weight: 700; color: #0F1B14; margin-bottom: 8px;">
          Algo salió mal
        </h1>
        <p style="font-size: 14px; color: #6B7A72; margin-bottom: 28px;">
          No pudimos procesar este enlace. Intenta de nuevo desde el dashboard.
        </p>
        <button
          style="width: 100%; padding: 12px; border-radius: 10px; background: #1B4332; color: #fff; font-size: 14px; font-weight: 600; border: none; cursor: pointer; font-family: inherit;"
          @click="router.push({ name: 'Dashboard' })"
        >
          Ir al dashboard
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
