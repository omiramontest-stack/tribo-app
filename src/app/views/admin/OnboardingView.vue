<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import CreateOrgForm from '@/app/components/Shared/CreateOrgForm.vue'
import type { OnboardingDto } from '@/domain/organization/repository/OrganizationRepository'

const router   = useRouter()
const orgStore = useOrganizationStore()

const loading = ref(false)
const error   = ref('')

async function handleSubmit(dto: OnboardingDto) {
  loading.value = true
  error.value   = ''
  try {
    await orgStore.onboarding(dto)
    router.push({ name: 'Dashboard' })
  } catch {
    error.value = 'Ocurrió un error al crear la organización'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div style="min-height: 100vh; background: var(--primary); display: flex; align-items: center; justify-content: center; padding: 24px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif;">
    <div style="width: 100%; max-width: 480px;">

      <!-- Logo -->
      <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 32px;">
        <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
          <line x1="10" y1="28" x2="30" y2="28" stroke="var(--amber)" stroke-width="2"/>
          <line x1="10" y1="28" x2="20" y2="10" stroke="var(--amber)" stroke-width="2"/>
          <line x1="20" y1="10" x2="30" y2="28" stroke="var(--amber)" stroke-width="2"/>
          <circle cx="20" cy="10" r="3.5" fill="var(--amber)"/>
          <circle cx="10" cy="28" r="3.5" fill="var(--amber)"/>
          <circle cx="30" cy="28" r="3.5" fill="var(--amber)"/>
        </svg>
        <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: #fff; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; line-height: 1;">
          trib<span style="color: var(--amber);">o</span>
        </span>
      </div>

      <!-- Card -->
      <div style="background: var(--bg-surface); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2);">
        <div style="height: 3px; background: linear-gradient(90deg, var(--primary), var(--amber));" />

        <div style="padding: 28px 28px 32px;">
          <div style="margin-bottom: 24px;">
            <h1 style="font-size: 20px; font-weight: 800; color: var(--text-ink); margin: 0 0 6px; letter-spacing: -0.01em;">
              Crea tu organización
            </h1>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.5;">
              Podrás cambiar estos datos después en configuración.
            </p>
          </div>

          <CreateOrgForm
            :loading="loading"
            :server-error="error"
            submit-label="Continuar al dashboard"
            @submit="handleSubmit"
          />
        </div>
      </div>

      <!-- Footer -->
      <p style="text-align: center; margin-top: 20px; font-size: 11px; color: rgba(255,255,255,0.4); line-height: 1.5;">
        Al continuar aceptas nuestros
        <a href="#" style="color: rgba(255,255,255,0.7); text-decoration: none; font-weight: 600;">Términos</a>
        y
        <a href="#" style="color: rgba(255,255,255,0.7); text-decoration: none; font-weight: 600;">Privacidad</a>
      </p>
    </div>
  </div>
</template>
