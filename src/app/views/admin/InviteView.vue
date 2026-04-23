<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import type { Invitation } from '@/domain/organization/entities/Invitation'

const route = useRoute()
const router = useRouter()
const orgStore = useOrganizationStore()

const token = route.params.token as string
const invitation = ref<Invitation | null>(null)
const loadingInvite = ref(true)
const inviteError = ref('')

const password = ref('')
const submitting = ref(false)
const submitError = ref('')

onMounted(async () => {
  try {
    invitation.value = await orgStore.getInvitation(token)
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status
    if (status === 410) {
      inviteError.value = 'Esta invitación ya no es válida (expirada o ya aceptada).'
    } else if (status === 404) {
      inviteError.value = 'Invitación no encontrada.'
    } else {
      inviteError.value = 'No se pudo cargar la invitación.'
    }
  } finally {
    loadingInvite.value = false
  }
})

async function handleAccept() {
  if (password.value.length < 8) {
    submitError.value = 'La contraseña debe tener al menos 8 caracteres'
    return
  }
  try {
    submitting.value = true
    submitError.value = ''
    await orgStore.acceptInvitation({ token, password: password.value })
    await orgStore.fetchMyOrganizations()
    router.push({ name: 'Dashboard' })
  } catch (e: unknown) {
    const code = (e as { body?: { error?: string } })?.body?.error
    if (code === 'INVITATION_EXPIRED' || code === 'INVITATION_INVALID') {
      submitError.value = 'Esta invitación ya no es válida.'
    } else if (code === 'INVITATION_NOT_FOUND') {
      submitError.value = 'Invitación no encontrada.'
    } else {
      submitError.value = 'Error al aceptar la invitación.'
    }
  } finally {
    submitting.value = false
  }
}

const roleLabel: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  staff: 'Staff',
}
</script>

<template>
  <div class="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <span class="text-2xl font-bold text-white">Wallet SaaS</span>
      </div>

      <!-- Loading -->
      <div v-if="loadingInvite" class="text-center text-neutral-400 text-sm">
        Cargando invitación...
      </div>

      <!-- Invalid invite -->
      <div
        v-else-if="inviteError"
        class="bg-neutral-900 rounded-2xl border border-neutral-800 p-8 text-center space-y-4"
      >
        <div class="text-4xl">✗</div>
        <p class="text-white font-semibold">Invitación no válida</p>
        <p class="text-neutral-400 text-sm">{{ inviteError }}</p>
        <router-link
          :to="{ name: 'Login' }"
          class="inline-block text-blue-400 hover:text-blue-300 text-sm underline"
        >
          Ir al inicio de sesión
        </router-link>
      </div>

      <!-- Valid invite -->
      <div
        v-else-if="invitation"
        class="bg-neutral-900 rounded-2xl border border-neutral-800 p-8 space-y-6"
      >
        <div>
          <h1 class="text-lg font-semibold text-white">Fuiste invitado</h1>
          <p class="text-neutral-400 text-sm mt-1">
            Únete a <span class="text-white font-medium">{{ invitation.organization.name }}</span>
            como <span class="text-white font-medium">{{ roleLabel[invitation.role] ?? invitation.role }}</span>.
          </p>
          <p class="text-neutral-500 text-xs mt-1">Invitación para: {{ invitation.email }}</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-neutral-300 mb-1.5">
              Contraseña <span class="text-red-400">*</span>
            </label>
            <input
              v-model="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              class="w-full bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-500"
              @keyup.enter="handleAccept"
            />
            <p class="text-neutral-500 text-xs mt-1">
              Si ya tienes cuenta, usa tu contraseña actual.
            </p>
          </div>
        </div>

        <p v-if="submitError" class="text-red-400 text-sm">{{ submitError }}</p>

        <button
          :disabled="submitting"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          @click="handleAccept"
        >
          {{ submitting ? 'Uniéndome...' : 'Aceptar invitación' }}
        </button>
      </div>
    </div>
  </div>
</template>
