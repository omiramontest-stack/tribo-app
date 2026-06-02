<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/app/stores/auth/AuthStore'

const router = useRouter()
const authStore = useAuthStore()

// By the time this component mounts, main.ts has already exchanged the code
// (or marked the exchange as failed). We just redirect based on auth state.
onMounted(() => {
  if (authStore.isAuthenticated) {
    router.replace({ name: 'Dashboard' })
  } else {
    router.replace({ name: 'Login', query: { error: 'google_auth_failed' } })
  }
})
</script>

<template>
  <div
    style="min-height: 100vh; background: var(--bg-page); display: grid; place-items: center;"
  >
    <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <line x1="10" y1="28" x2="30" y2="28" stroke="var(--amber)" stroke-width="2"/>
        <line x1="10" y1="28" x2="20" y2="10" stroke="var(--amber)" stroke-width="2"/>
        <line x1="20" y1="10" x2="30" y2="28" stroke="var(--amber)" stroke-width="2"/>
        <circle cx="20" cy="10" r="3.5" fill="var(--amber)"/>
        <circle cx="10" cy="28" r="3.5" fill="var(--amber)"/>
        <circle cx="30" cy="28" r="3.5" fill="var(--amber)"/>
      </svg>
      <div
        style="width: 40px; height: 40px; border-radius: 50%; border: 3px solid var(--amber); border-top-color: transparent; animation: spin 0.8s linear infinite;"
      />
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
