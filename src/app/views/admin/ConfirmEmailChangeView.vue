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

onMounted(async () => {
  const token = route.query.token as string | undefined

  if (!token) {
    state.value = 'no_token'
    return
  }

  try {
    await authStore.confirmEmailChange(token)
    state.value = 'success'
    setTimeout(() => router.push({ name: 'Dashboard' }), 2500)
  } catch (e) {
    const err = e as ApiError
    const code = (err?.body as { error?: string })?.error ?? ''
    state.value = code === 'INVALID_OR_EXPIRED_TOKEN' ? 'error_invalid' : 'error_generic'
  }
})
</script>

<template>
  <div
    style="min-height: 100vh; background: var(--bg-page); display: grid; place-items: center; padding: 24px; font-family: inherit;"
  >
    <div
      style="background: var(--bg-surface); border-radius: 20px; padding: 48px 40px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.06);"
    >
      <!-- Logo -->
      <div style="display: flex; justify-content: center; margin-bottom: 32px;">
        <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
          <line x1="10" y1="28" x2="30" y2="28" stroke="var(--amber)" stroke-width="2"/>
          <line x1="10" y1="28" x2="20" y2="10" stroke="var(--amber)" stroke-width="2"/>
          <line x1="20" y1="10" x2="30" y2="28" stroke="var(--amber)" stroke-width="2"/>
          <circle cx="20" cy="10" r="3.5" fill="var(--amber)"/>
          <circle cx="10" cy="28" r="3.5" fill="var(--amber)"/>
          <circle cx="30" cy="28" r="3.5" fill="var(--amber)"/>
        </svg>
      </div>

      <!-- Loading -->
      <template v-if="state === 'loading'">
        <div
          style="width: 48px; height: 48px; border-radius: 50%; border: 3px solid var(--amber); border-top-color: transparent; margin: 0 auto 24px; animation: spin 0.8s linear infinite;"
        />
        <h1 style="font-size: 20px; font-weight: 700; color: var(--text-ink); margin-bottom: 8px;">
          Confirmando tu correo…
        </h1>
        <p style="font-size: 14px; color: var(--text-muted);">
          Un momento, estamos validando el enlace.
        </p>
      </template>

      <!-- Success -->
      <template v-else-if="state === 'success'">
        <div
          style="width: 56px; height: 56px; border-radius: 50%; background: var(--success-bg); display: grid; place-items: center; margin: 0 auto 24px;"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12l5 5L20 7"/>
          </svg>
        </div>
        <h1 style="font-size: 20px; font-weight: 700; color: var(--text-ink); margin-bottom: 8px;">
          ¡Correo actualizado!
        </h1>
        <p style="font-size: 14px; color: var(--text-muted);">
          Tu correo electrónico ha sido cambiado correctamente. Redirigiendo al dashboard…
        </p>
      </template>

      <!-- Error: invalid or expired token -->
      <template v-else-if="state === 'error_invalid'">
        <div
          style="width: 56px; height: 56px; border-radius: 50%; background: var(--danger-bg); display: grid; place-items: center; margin: 0 auto 24px;"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <h1 style="font-size: 20px; font-weight: 700; color: var(--text-ink); margin-bottom: 8px;">
          Enlace inválido o expirado
        </h1>
        <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 28px;">
          El enlace expiró o es inválido. Solicita un nuevo cambio de correo desde los ajustes.
        </p>
        <button
          style="width: 100%; padding: 12px; border-radius: 10px; background: var(--primary); color: var(--bg-surface); font-size: 14px; font-weight: 600; border: none; cursor: pointer; font-family: inherit;"
          @click="router.push({ name: 'Settings' })"
        >
          Ir a Ajustes
        </button>
      </template>

      <!-- Error: generic / no token -->
      <template v-else>
        <div
          style="width: 56px; height: 56px; border-radius: 50%; background: var(--danger-bg); display: grid; place-items: center; margin: 0 auto 24px;"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </div>
        <h1 style="font-size: 20px; font-weight: 700; color: var(--text-ink); margin-bottom: 8px;">
          Algo salió mal
        </h1>
        <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 28px;">
          No pudimos procesar este enlace. Intenta de nuevo desde los ajustes.
        </p>
        <button
          style="width: 100%; padding: 12px; border-radius: 10px; background: var(--primary); color: var(--bg-surface); font-size: 14px; font-weight: 600; border: none; cursor: pointer; font-family: inherit;"
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
