<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import type { MemberRole } from '@/domain/organization/entities/OrganizationMember'

const orgStore = useOrganizationStore()

const showForm = ref(false)
const email = ref('')
const role = ref<MemberRole>('staff')
const loading = ref(false)
const error = ref('')
const successMsg = ref('')

onMounted(async () => {
  if (!orgStore.initialized) await orgStore.fetchMyOrganizations()
  if (orgStore.currentOrg) {
    await orgStore.fetchMembers(orgStore.currentOrg.id)
  }
})

async function handleInvite() {
  if (!email.value.trim()) { error.value = 'El email es requerido'; return }
  if (!orgStore.currentOrg) return
  try {
    loading.value = true
    error.value = ''
    successMsg.value = ''
    await orgStore.inviteMember({ organizationId: orgStore.currentOrg.id, email: email.value.trim(), role: role.value })
    successMsg.value = `Invitación enviada a ${email.value.trim()}`
    email.value = ''
    role.value = 'staff'
    showForm.value = false
  } catch (e: unknown) {
    const body = (e as { body?: { error?: string } })?.body
    error.value = body?.error === 'ALREADY_MEMBER'
      ? 'Ya es miembro de la organización'
      : body?.error === 'INVITATION_PENDING'
        ? 'Ya tiene una invitación pendiente'
        : 'Error al enviar la invitación'
  } finally {
    loading.value = false
  }
}

const roleLabel: Record<MemberRole, string> = {
  owner: 'Propietario',
  admin: 'Admin',
  staff: 'Staff',
}

function formatDate(value?: string): string {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-MX')
}

const roleBadge: Record<MemberRole, string> = {
  owner: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  staff: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
}
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-neutral-800 dark:text-white">Equipo</h1>
        <p v-if="orgStore.currentOrg" class="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          {{ orgStore.currentOrg.name }}
        </p>
      </div>
      <button
        class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        @click="showForm = !showForm"
      >
        + Invitar miembro
      </button>
    </div>

    <!-- Success message -->
    <p v-if="successMsg" class="text-green-400 text-sm px-1">{{ successMsg }}</p>

    <!-- Invite form -->
    <div v-if="showForm" class="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 p-5 space-y-4">
      <h3 class="font-medium text-neutral-800 dark:text-white text-sm">Invitar por email</h3>
      <div class="flex gap-3">
        <div class="flex-1">
          <input
            v-model="email"
            type="email"
            placeholder="barista@negocio.com"
            class="w-full border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-400"
            @keyup.enter="handleInvite"
          />
        </div>
        <select
          v-model="role"
          class="border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
        <button
          :disabled="loading"
          class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
          @click="handleInvite"
        >
          {{ loading ? '...' : 'Invitar' }}
        </button>
      </div>
      <p v-if="error" class="text-red-400 text-xs">{{ error }}</p>
      <p class="text-xs text-neutral-400">Se enviará un correo con el link para unirse a la organización.</p>
    </div>

    <!-- Members list -->
    <div class="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
      <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-700">
        <h2 class="font-semibold text-neutral-800 dark:text-white text-sm">
          Miembros ({{ orgStore.members.length }})
        </h2>
      </div>

      <div v-if="orgStore.members.length" class="divide-y divide-neutral-100 dark:divide-neutral-700">
        <div
          v-for="member in orgStore.members"
          :key="member.id"
          class="flex items-center justify-between px-5 py-3"
        >
          <div>
            <p class="text-sm font-medium text-neutral-800 dark:text-white">
              {{ member.email ?? member.adminId }}
            </p>
            <p class="text-xs text-neutral-400 mt-0.5">
              Desde {{ formatDate(member.createdAt) }}
            </p>
          </div>
          <span
            class="text-xs font-medium px-2.5 py-1 rounded-full"
            :class="roleBadge[member.role]"
          >
            {{ roleLabel[member.role] }}
          </span>
        </div>
      </div>

      <div v-else class="px-5 py-8 text-center text-neutral-400 text-sm">
        No hay miembros aún.
      </div>
    </div>
  </div>
</template>
