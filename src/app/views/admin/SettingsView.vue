<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import { useToast } from '@/app/composables/useToast'
import { ApiError } from '@/infrastructure/http/ApiClient'
import type { MemberRole } from '@/domain/organization/entities/OrganizationMember'

// ── Stores / router ──────────────────────────────────────────────────────────
const router = useRouter()
const authStore = useAuthStore()
const orgStore = useOrganizationStore()
const toast = useToast()
const { admin } = storeToRefs(authStore)
const { activeOrgId, activeOrg, members } = storeToRefs(orgStore)

// ── Tab navigation ────────────────────────────────────────────────────────────
type Tab = 'account' | 'organization' | 'members' | 'billing'
const activeTab = ref<Tab>('account')

const currentMember = computed(() =>
  members.value.find((m) => m.adminId === admin.value?.id),
)
const currentRole = computed<MemberRole>(() => currentMember.value?.role ?? 'staff')
const isOwnerOrAdmin = computed(() => currentRole.value === 'owner' || currentRole.value === 'admin')
const isOwner = computed(() => currentRole.value === 'owner')

const tabs = computed(() => [
  { id: 'account' as Tab, label: 'Cuenta' },
  ...(isOwnerOrAdmin.value ? [{ id: 'organization' as Tab, label: 'Organización' }] : []),
  { id: 'members' as Tab, label: 'Miembros' },
  { id: 'billing' as Tab, label: 'Facturación' },
])

function selectTab(tab: Tab) {
  if (tab === 'billing') {
    router.push({ name: 'Billing' })
    return
  }
  activeTab.value = tab
}

// ── CUENTA: Cambiar email ─────────────────────────────────────────────────────
const emailForm = ref({ newEmail: '' })
const emailLoading = ref(false)
const emailError = ref('')
const emailSent = ref(false)

async function handleChangeEmail() {
  emailError.value = ''
  const newEmail = emailForm.value.newEmail.trim()
  if (!newEmail || !newEmail.includes('@')) {
    emailError.value = 'Ingresa un correo válido'
    return
  }
  emailLoading.value = true
  try {
    await authStore.changeEmail(newEmail)
    emailSent.value = true
    emailForm.value.newEmail = ''
  } catch (e) {
    const code = getErrorCode(e)
    emailError.value =
      code === 'EMAIL_ALREADY_IN_USE'
        ? 'Este correo ya está registrado'
        : 'Error al solicitar el cambio de correo'
  } finally {
    emailLoading.value = false
  }
}

// ── CUENTA: Cambiar contraseña ────────────────────────────────────────────────
const passwordForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordLoading = ref(false)
const passwordError = ref('')
const passwordSuccess = ref(false)

const passwordStrength = computed(() => {
  const p = passwordForm.value.newPassword
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})

const strengthLabel = computed(() => {
  const s = passwordStrength.value
  if (s <= 1) return { text: 'Débil', color: '#DC2626' }
  if (s <= 3) return { text: 'Media', color: '#D97706' }
  return { text: 'Fuerte', color: '#16A34A' }
})

async function handleChangePassword() {
  passwordError.value = ''
  passwordSuccess.value = false
  const { currentPassword, newPassword, confirmPassword } = passwordForm.value
  if (newPassword.length < 8) {
    passwordError.value = 'La nueva contraseña debe tener al menos 8 caracteres'
    return
  }
  if (newPassword !== confirmPassword) {
    passwordError.value = 'Las contraseñas no coinciden'
    return
  }
  passwordLoading.value = true
  try {
    await authStore.changePassword(newPassword, currentPassword || undefined)
    passwordSuccess.value = true
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    toast.show('Contraseña actualizada correctamente', 'success')
  } catch (e) {
    const code = getErrorCode(e)
    passwordError.value =
      code === 'INVALID_CREDENTIALS'
        ? 'La contraseña actual es incorrecta'
        : 'Error al cambiar la contraseña'
  } finally {
    passwordLoading.value = false
  }
}

// ── ORGANIZACIÓN ──────────────────────────────────────────────────────────────
const orgForm = ref({ name: '', industry: '', country: '', phone: '', logoUrl: '' })
const orgLoading = ref(false)
const orgError = ref('')

watch(
  activeOrg,
  (org) => {
    if (org) {
      orgForm.value = {
        name: org.name ?? '',
        industry: org.industry ?? '',
        country: org.country ?? '',
        phone: org.phone ?? '',
        logoUrl: org.logoUrl ?? '',
      }
    }
  },
  { immediate: true },
)

async function handleSaveOrg() {
  orgError.value = ''
  if (!orgForm.value.name.trim()) {
    orgError.value = 'El nombre de la organización es requerido'
    return
  }
  orgLoading.value = true
  try {
    await orgStore.updateOrg({
      name: orgForm.value.name.trim(),
      industry: orgForm.value.industry.trim() || null,
      country: orgForm.value.country.trim() || null,
      phone: orgForm.value.phone.trim() || null,
      logoUrl: orgForm.value.logoUrl.trim() || null,
    })
    toast.show('Organización actualizada correctamente', 'success')
  } catch {
    orgError.value = 'Error al guardar los cambios'
  } finally {
    orgLoading.value = false
  }
}

// ── MIEMBROS ──────────────────────────────────────────────────────────────────
const membersLoading = ref(false)

// Invite
const inviteEmail = ref('')
const inviteRole = ref<'admin' | 'staff'>('staff')
const inviteLoading = ref(false)
const inviteError = ref('')
const showInviteForm = ref(false)

async function handleInvite() {
  inviteError.value = ''
  if (!inviteEmail.value.trim()) { inviteError.value = 'El email es requerido'; return }
  if (!orgStore.activeOrg) return
  inviteLoading.value = true
  try {
    await orgStore.inviteMember({ organizationId: orgStore.activeOrg.id, email: inviteEmail.value.trim(), role: inviteRole.value })
    toast.show(`Invitación enviada a ${inviteEmail.value.trim()}`, 'success')
    inviteEmail.value = ''
    inviteRole.value = 'staff'
    showInviteForm.value = false
  } catch (e) {
    const code = getErrorCode(e)
    inviteError.value =
      code === 'ALREADY_MEMBER' ? 'Ya es miembro de la organización'
      : code === 'INVITATION_PENDING' ? 'Ya tiene una invitación pendiente'
      : 'Error al enviar la invitación'
  } finally {
    inviteLoading.value = false
  }
}

// Change role
const roleEditingId = ref<string | null>(null)
const roleLoading = ref<string | null>(null)

async function handleRoleChange(memberId: string, role: 'admin' | 'staff') {
  roleLoading.value = memberId
  try {
    await orgStore.updateMemberRole(memberId, role)
    roleEditingId.value = null
    toast.show('Rol actualizado', 'success')
  } catch (e) {
    const code = getErrorCode(e)
    const msg =
      code === 'CANNOT_CHANGE_OWN_ROLE' ? 'No puedes cambiar tu propio rol'
      : code === 'CANNOT_ASSIGN_OWNER' ? 'No se puede asignar el rol de propietario'
      : code === 'FORBIDDEN' ? 'Sin permisos para esta acción'
      : 'Error al cambiar el rol'
    toast.show(msg, 'error')
  } finally {
    roleLoading.value = null
  }
}

// Remove member
const confirmRemoveId = ref<string | null>(null)
const removeLoading = ref(false)

async function handleRemoveMember() {
  if (!confirmRemoveId.value) return
  removeLoading.value = true
  try {
    await orgStore.removeMember(confirmRemoveId.value)
    confirmRemoveId.value = null
    toast.show('Miembro eliminado', 'success')
  } catch (e) {
    const code = getErrorCode(e)
    const msg =
      code === 'CANNOT_REMOVE_SELF' ? 'No puedes eliminarte a ti mismo'
      : code === 'CANNOT_REMOVE_OWNER' ? 'No se puede eliminar al propietario'
      : code === 'FORBIDDEN' ? 'Sin permisos para esta acción'
      : 'Error al eliminar el miembro'
    toast.show(msg, 'error')
    confirmRemoveId.value = null
  } finally {
    removeLoading.value = false
  }
}

const confirmRemoveMember = computed(() =>
  members.value.find((m) => m.id === confirmRemoveId.value),
)

function canChangeRole(memberId: string, memberRole: MemberRole): boolean {
  if (!isOwner.value) return false
  if (memberId === currentMember.value?.id) return false
  return memberRole !== 'owner'
}

function canRemoveMember(memberId: string, memberRole: MemberRole): boolean {
  if (memberId === currentMember.value?.id) return false
  if (memberRole === 'owner') return false
  if (isOwner.value) return true
  if (currentRole.value === 'admin' && memberRole === 'staff') return true
  return false
}

// Load members when entering members tab
watch(
  [activeTab, activeOrgId],
  async ([tab, orgId]) => {
    if (tab !== 'members' || !orgId) return
    membersLoading.value = true
    orgStore.clearMembers()
    try {
      await orgStore.fetchMembers(orgId)
    } finally {
      membersLoading.value = false
    }
  },
  { immediate: true },
)

// ── Helpers ───────────────────────────────────────────────────────────────────
function getErrorCode(e: unknown): string {
  return ((e as { body?: { error?: string } })?.body?.error) ?? ''
}

const roleLabel: Record<MemberRole, string> = {
  owner: 'Propietario',
  admin: 'Admin',
  staff: 'Staff',
}

const roleBadgeStyle: Record<MemberRole, string> = {
  owner: 'background:#EDE9FE;color:#6D28D9;',
  admin: 'background:#DBEAFE;color:#1D4ED8;',
  staff: 'background:#F3F4F6;color:#374151;',
}

function formatDate(value?: string): string {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-MX')
}

function getInitials(email = ''): string {
  return email.slice(0, 2).toUpperCase()
}
</script>

<template>
  <div style="max-width: 720px; display: flex; flex-direction: column; gap: 24px;">

    <!-- ── Tab navigation ── -->
    <div style="display: flex; gap: 2px; border-bottom: 1px solid #ECEFEB; padding-bottom: 0;">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        style="padding: 10px 18px; font-size: 13.5px; font-weight: 600; border: none; background: transparent; cursor: pointer; font-family: inherit; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color 0.15s, border-color 0.15s;"
        :style="activeTab === tab.id
          ? { color: '#1B4332', borderBottomColor: '#E8920A' }
          : { color: '#6B7A72', borderBottomColor: 'transparent' }"
        @click="selectTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ═══════════════════════════════ CUENTA ═══════════════════════════════ -->
    <div v-if="activeTab === 'account'" style="display: flex; flex-direction: column; gap: 20px;">

      <!-- Cambiar correo electrónico -->
      <section style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 24px;">
        <div style="margin-bottom: 18px;">
          <h2 style="font-size: 15px; font-weight: 700; color: #0F1B14; margin-bottom: 4px;">Correo electrónico</h2>
          <p style="font-size: 13px; color: #6B7A72;">
            Correo actual: <strong style="color: #0F1B14;">{{ admin?.email }}</strong>
          </p>
        </div>

        <template v-if="emailSent">
          <div style="display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; background: #D1FAE5; border-radius: 10px; border: 1px solid #A7F3D0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;">
              <path d="M5 12l5 5L20 7"/>
            </svg>
            <div>
              <p style="font-size: 13.5px; font-weight: 600; color: #15803D; margin-bottom: 2px;">Revisa tu bandeja de entrada</p>
              <p style="font-size: 12.5px; color: #16A34A;">Enviamos un enlace de confirmación a tu nuevo correo. Haz clic en él para completar el cambio.</p>
            </div>
          </div>
          <button
            style="margin-top: 12px; background: none; border: none; cursor: pointer; font-size: 12.5px; color: #6B7A72; font-family: inherit; padding: 0; text-decoration: underline;"
            @click="emailSent = false"
          >
            Solicitar otro cambio
          </button>
        </template>

        <template v-else>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; color: #3A4A41; margin-bottom: 6px;">Nuevo correo electrónico</label>
              <input
                v-model="emailForm.newEmail"
                type="email"
                placeholder="nuevo@correo.com"
                style="width: 100%; padding: 9px 12px; border: 1px solid #D8DDD7; border-radius: 8px; font-size: 13.5px; font-family: inherit; outline: none; box-sizing: border-box; color: #0F1B14; background: #fff;"
                @keyup.enter="handleChangeEmail"
              />
              <p v-if="emailError" style="margin-top: 6px; font-size: 12px; color: #DC2626;">{{ emailError }}</p>
            </div>
            <div>
              <button
                :disabled="emailLoading"
                style="padding: 10px 20px; background: #1B4332; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity 0.15s;"
                :style="{ opacity: emailLoading ? '0.6' : '1' }"
                @click="handleChangeEmail"
              >
                {{ emailLoading ? 'Enviando…' : 'Solicitar cambio de correo' }}
              </button>
            </div>
          </div>
        </template>
      </section>

      <!-- Cambiar contraseña -->
      <section style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 24px;">
        <div style="margin-bottom: 18px;">
          <h2 style="font-size: 15px; font-weight: 700; color: #0F1B14; margin-bottom: 4px;">Contraseña</h2>
          <p style="font-size: 13px; color: #6B7A72;">Cambia tu contraseña de acceso.</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Current password -->
          <div>
            <label style="display: block; font-size: 12px; font-weight: 600; color: #3A4A41; margin-bottom: 6px;">
              Contraseña actual
              <span style="font-weight: 400; color: #A8B3AC;"> (déjala en blanco si te registraste con Google)</span>
            </label>
            <input
              v-model="passwordForm.currentPassword"
              type="password"
              placeholder="••••••••"
              style="width: 100%; padding: 9px 12px; border: 1px solid #D8DDD7; border-radius: 8px; font-size: 13.5px; font-family: inherit; outline: none; box-sizing: border-box; color: #0F1B14; background: #fff;"
            />
          </div>

          <!-- New password -->
          <div>
            <label style="display: block; font-size: 12px; font-weight: 600; color: #3A4A41; margin-bottom: 6px;">Nueva contraseña</label>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              placeholder="Mínimo 8 caracteres"
              style="width: 100%; padding: 9px 12px; border: 1px solid #D8DDD7; border-radius: 8px; font-size: 13.5px; font-family: inherit; outline: none; box-sizing: border-box; color: #0F1B14; background: #fff;"
            />
            <!-- Strength indicator -->
            <div v-if="passwordForm.newPassword" style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; display: flex; gap: 3px;">
                <div
                  v-for="i in 5"
                  :key="i"
                  style="height: 4px; flex: 1; border-radius: 2px; transition: background 0.2s;"
                  :style="{ background: i <= passwordStrength ? strengthLabel.color : '#ECEFEB' }"
                />
              </div>
              <span style="font-size: 11.5px; font-weight: 600;" :style="{ color: strengthLabel.color }">
                {{ strengthLabel.text }}
              </span>
            </div>
          </div>

          <!-- Confirm password -->
          <div>
            <label style="display: block; font-size: 12px; font-weight: 600; color: #3A4A41; margin-bottom: 6px;">Confirmar nueva contraseña</label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              placeholder="Repite la nueva contraseña"
              style="width: 100%; padding: 9px 12px; border: 1px solid #D8DDD7; border-radius: 8px; font-size: 13.5px; font-family: inherit; outline: none; box-sizing: border-box; color: #0F1B14; background: #fff;"
              @keyup.enter="handleChangePassword"
            />
          </div>

          <p v-if="passwordError" style="font-size: 12px; color: #DC2626; margin: 0;">{{ passwordError }}</p>

          <div>
            <button
              :disabled="passwordLoading"
              style="padding: 10px 20px; background: #1B4332; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity 0.15s;"
              :style="{ opacity: passwordLoading ? '0.6' : '1' }"
              @click="handleChangePassword"
            >
              {{ passwordLoading ? 'Guardando…' : 'Cambiar contraseña' }}
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- ══════════════════════════ ORGANIZACIÓN ══════════════════════════════ -->
    <div v-if="activeTab === 'organization'">
      <section style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 24px;">
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 15px; font-weight: 700; color: #0F1B14; margin-bottom: 4px;">Datos de la organización</h2>
          <p style="font-size: 13px; color: #6B7A72;">La información pública de tu organización.</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div>
            <label style="display: block; font-size: 12px; font-weight: 600; color: #3A4A41; margin-bottom: 6px;">Nombre <span style="color:#DC2626;">*</span></label>
            <input
              v-model="orgForm.name"
              type="text"
              placeholder="Mi empresa"
              style="width: 100%; padding: 9px 12px; border: 1px solid #D8DDD7; border-radius: 8px; font-size: 13.5px; font-family: inherit; outline: none; box-sizing: border-box; color: #0F1B14; background: #fff;"
            />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; color: #3A4A41; margin-bottom: 6px;">Industria</label>
              <input
                v-model="orgForm.industry"
                type="text"
                placeholder="Retail, F&B, etc."
                style="width: 100%; padding: 9px 12px; border: 1px solid #D8DDD7; border-radius: 8px; font-size: 13.5px; font-family: inherit; outline: none; box-sizing: border-box; color: #0F1B14; background: #fff;"
              />
            </div>
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; color: #3A4A41; margin-bottom: 6px;">País</label>
              <input
                v-model="orgForm.country"
                type="text"
                placeholder="México"
                style="width: 100%; padding: 9px 12px; border: 1px solid #D8DDD7; border-radius: 8px; font-size: 13.5px; font-family: inherit; outline: none; box-sizing: border-box; color: #0F1B14; background: #fff;"
              />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; color: #3A4A41; margin-bottom: 6px;">Teléfono</label>
              <input
                v-model="orgForm.phone"
                type="tel"
                placeholder="+52 55 1234 5678"
                style="width: 100%; padding: 9px 12px; border: 1px solid #D8DDD7; border-radius: 8px; font-size: 13.5px; font-family: inherit; outline: none; box-sizing: border-box; color: #0F1B14; background: #fff;"
              />
            </div>
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; color: #3A4A41; margin-bottom: 6px;">Logo URL</label>
              <input
                v-model="orgForm.logoUrl"
                type="url"
                placeholder="https://tu-logo.png"
                style="width: 100%; padding: 9px 12px; border: 1px solid #D8DDD7; border-radius: 8px; font-size: 13.5px; font-family: inherit; outline: none; box-sizing: border-box; color: #0F1B14; background: #fff;"
              />
            </div>
          </div>

          <p v-if="orgError" style="font-size: 12px; color: #DC2626; margin: 0;">{{ orgError }}</p>

          <div>
            <button
              :disabled="orgLoading"
              style="padding: 10px 20px; background: #1B4332; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity 0.15s;"
              :style="{ opacity: orgLoading ? '0.6' : '1' }"
              @click="handleSaveOrg"
            >
              {{ orgLoading ? 'Guardando…' : 'Guardar cambios' }}
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- ══════════════════════════════ MIEMBROS ══════════════════════════════ -->
    <div v-if="activeTab === 'members'" style="display: flex; flex-direction: column; gap: 16px;">

      <!-- Invite header -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 style="font-size: 15px; font-weight: 700; color: #0F1B14;">Miembros del equipo</h2>
          <p v-if="activeOrg" style="font-size: 12.5px; color: #6B7A72; margin-top: 2px;">{{ activeOrg.name }}</p>
        </div>
        <button
          style="display: flex; align-items: center; gap: 6px; padding: 9px 16px; background: #1B4332; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;"
          @click="showInviteForm = !showInviteForm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Invitar miembro
        </button>
      </div>

      <!-- Invite form -->
      <div v-if="showInviteForm" style="background: #fff; border: 1px solid #ECEFEB; border-radius: 12px; padding: 18px;">
        <p style="font-size: 12.5px; font-weight: 600; color: #0F1B14; margin-bottom: 12px;">Enviar invitación por email</p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <input
            v-model="inviteEmail"
            type="email"
            placeholder="colaborador@empresa.com"
            style="flex: 1; min-width: 200px; padding: 9px 12px; border: 1px solid #D8DDD7; border-radius: 8px; font-size: 13px; font-family: inherit; outline: none; color: #0F1B14; background: #fff;"
            @keyup.enter="handleInvite"
          />
          <select
            v-model="inviteRole"
            style="padding: 9px 12px; border: 1px solid #D8DDD7; border-radius: 8px; font-size: 13px; font-family: inherit; outline: none; color: #0F1B14; background: #fff; cursor: pointer;"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          <button
            :disabled="inviteLoading"
            style="padding: 9px 18px; background: #E8920A; color: #13301F; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; transition: opacity 0.15s; white-space: nowrap;"
            :style="{ opacity: inviteLoading ? '0.6' : '1' }"
            @click="handleInvite"
          >
            {{ inviteLoading ? '…' : 'Invitar' }}
          </button>
        </div>
        <p v-if="inviteError" style="margin-top: 8px; font-size: 12px; color: #DC2626;">{{ inviteError }}</p>
        <p style="margin-top: 8px; font-size: 11.5px; color: #A8B3AC;">Se enviará un enlace de invitación al correo indicado.</p>
      </div>

      <!-- Members list -->
      <div style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; overflow: hidden;">
        <div style="padding: 14px 20px; border-bottom: 1px solid #ECEFEB;">
          <span style="font-size: 12.5px; font-weight: 600; color: #0F1B14;">
            <template v-if="membersLoading">
              <span style="display: inline-block; height: 14px; width: 80px; background: #EFEAE0; border-radius: 4px; animation: sk-pulse 1.4s ease-in-out infinite;" />
            </template>
            <template v-else>Miembros ({{ members.length }})</template>
          </span>
        </div>

        <!-- Skeleton -->
        <div v-if="membersLoading" style="display: flex; flex-direction: column; divide-y: 1px solid #ECEFEB;">
          <div v-for="i in 3" :key="i" style="padding: 14px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #ECEFEB;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: #EFEAE0; animation: sk-pulse 1.4s ease-in-out infinite;" />
            <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
              <div style="height: 13px; width: 180px; background: #EFEAE0; border-radius: 4px; animation: sk-pulse 1.4s ease-in-out infinite;" />
              <div style="height: 11px; width: 100px; background: #F7F4EF; border-radius: 4px; animation: sk-pulse 1.4s ease-in-out infinite;" />
            </div>
            <div style="height: 24px; width: 60px; background: #EFEAE0; border-radius: 12px; animation: sk-pulse 1.4s ease-in-out infinite;" />
          </div>
        </div>

        <!-- Real members -->
        <div v-else-if="members.length">
          <div
            v-for="member in members"
            :key="member.id"
            style="padding: 12px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #F7F4EF;"
          >
            <!-- Avatar -->
            <div
              style="width: 36px; height: 36px; border-radius: 50%; background: #E8F5EC; color: #1B4332; font-size: 12px; font-weight: 700; display: grid; place-items: center; flex-shrink: 0;"
            >
              {{ getInitials(member.email ?? member.adminId) }}
            </div>

            <!-- Info -->
            <div style="flex: 1; min-width: 0;">
              <p style="font-size: 13.5px; font-weight: 600; color: #0F1B14; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                {{ member.email ?? member.adminId }}
                <span v-if="member.adminId === admin?.id" style="font-size: 11px; font-weight: 500; color: #9DB7A8; margin-left: 4px;">(tú)</span>
              </p>
              <p style="font-size: 11.5px; color: #A8B3AC; margin-top: 1px;">Desde {{ formatDate(member.createdAt) }}</p>
            </div>

            <!-- Role badge or select -->
            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
              <template v-if="canChangeRole(member.id, member.role) && roleEditingId === member.id">
                <select
                  :disabled="roleLoading === member.id"
                  style="padding: 5px 8px; border: 1px solid #D8DDD7; border-radius: 7px; font-size: 12.5px; font-family: inherit; outline: none; background: #fff; color: #0F1B14; cursor: pointer;"
                  :value="member.role"
                  @change="handleRoleChange(member.id, ($event.target as HTMLSelectElement).value as 'admin' | 'staff')"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  style="background: none; border: none; cursor: pointer; padding: 4px; color: #A8B3AC;"
                  @click="roleEditingId = null"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </template>
              <template v-else>
                <span
                  style="font-size: 11.5px; font-weight: 600; padding: 3px 10px; border-radius: 999px; white-space: nowrap;"
                  :style="roleBadgeStyle[member.role]"
                >
                  {{ roleLabel[member.role] }}
                </span>
              </template>
            </div>

            <!-- Actions -->
            <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
              <button
                v-if="canChangeRole(member.id, member.role) && roleEditingId !== member.id"
                style="padding: 5px 10px; border: 1px solid #D8DDD7; border-radius: 7px; background: #fff; font-size: 11.5px; font-weight: 600; color: #3A4A41; cursor: pointer; font-family: inherit; white-space: nowrap;"
                @click="roleEditingId = member.id"
              >
                Cambiar rol
              </button>
              <button
                v-if="canRemoveMember(member.id, member.role)"
                style="padding: 5px 8px; border: none; border-radius: 7px; background: transparent; font-size: 12px; color: #DC2626; cursor: pointer; font-family: inherit;"
                title="Eliminar miembro"
                @click="confirmRemoveId = member.id"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div v-else style="padding: 32px 20px; text-align: center; color: #A8B3AC; font-size: 13px;">
          No hay miembros aún.
        </div>
      </div>
    </div>

    <!-- ════════════════ MODAL: Confirmar eliminación ════════════════════════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="confirmRemoveId"
          style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: grid; place-items: center; z-index: 9100; backdrop-filter: blur(3px); padding: 20px;"
          @click.self="confirmRemoveId = null"
        >
          <div style="background: #fff; border-radius: 18px; padding: 32px; max-width: 420px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.16);">
            <div style="width: 52px; height: 52px; border-radius: 14px; background: #FEE2E2; display: grid; place-items: center; margin-bottom: 18px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </div>
            <h3 style="font-size: 17px; font-weight: 800; color: #0F1B14; margin-bottom: 8px;">Eliminar miembro</h3>
            <p style="font-size: 13px; color: #6B7A72; line-height: 1.6; margin-bottom: 24px;">
              ¿Estás seguro de que deseas eliminar a
              <strong style="color: #0F1B14;">{{ confirmRemoveMember?.email ?? confirmRemoveMember?.adminId }}</strong>
              del equipo? Esta acción no se puede deshacer.
            </p>
            <div style="display: flex; gap: 10px;">
              <button
                style="flex: 1; padding: 11px 16px; border-radius: 9px; background: #F7F4EF; border: none; font-size: 13px; font-weight: 600; color: #3A4A41; cursor: pointer; font-family: inherit;"
                :disabled="removeLoading"
                @click="confirmRemoveId = null"
              >
                Cancelar
              </button>
              <button
                style="flex: 1; padding: 11px 16px; border-radius: 9px; background: #DC2626; border: none; font-size: 13px; font-weight: 700; color: #fff; cursor: pointer; font-family: inherit; transition: opacity 0.15s;"
                :style="{ opacity: removeLoading ? '0.6' : '1' }"
                :disabled="removeLoading"
                @click="handleRemoveMember"
              >
                {{ removeLoading ? 'Eliminando…' : 'Sí, eliminar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
@keyframes sk-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active > div, .modal-leave-active > div { transition: transform 0.2s ease; }
.modal-enter-from > div, .modal-leave-to > div { transform: scale(0.96); }

input:focus, select:focus {
  border-color: #1B4332 !important;
  box-shadow: 0 0 0 3px rgba(27, 67, 50, 0.08);
}

button:not(:disabled):hover {
  opacity: 0.88;
}
</style>
