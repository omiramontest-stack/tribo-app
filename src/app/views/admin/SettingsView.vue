<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import { useToast } from '@/app/composables/useToast'
import type { MemberRole } from '@/domain/organization/entities/OrganizationMember'

const router   = useRouter()
const authStore = useAuthStore()
const orgStore  = useOrganizationStore()
const toast     = useToast()
const { admin }                          = storeToRefs(authStore)
const { activeOrgId, activeOrg, members } = storeToRefs(orgStore)

// ── Tab navigation ────────────────────────────────────────────────────────────
type Tab = 'account' | 'organization' | 'members' | 'billing'
const activeTab = ref<Tab>('account')

const currentMember    = computed(() => members.value.find(m => m.adminId === admin.value?.id))
const currentRole      = computed<MemberRole>(() => currentMember.value?.role ?? 'staff')
const isOwnerOrAdmin   = computed(() => currentRole.value === 'owner' || currentRole.value === 'admin')
const isOwner          = computed(() => currentRole.value === 'owner')

const tabs = computed(() => [
  { id: 'account'      as Tab, label: 'Cuenta' },
  ...(isOwnerOrAdmin.value ? [{ id: 'organization' as Tab, label: 'Organización' }] : []),
  { id: 'members'      as Tab, label: 'Miembros' },
  { id: 'billing'      as Tab, label: 'Facturación' },
])

const tabIconPaths: Record<string, string> = {
  account:      '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>',
  organization: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  members:      '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
  billing:      '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
}

function selectTab(tab: Tab) {
  if (tab === 'billing') { router.push({ name: 'Billing' }); return }
  activeTab.value = tab
}

// ── CUENTA: Cambiar email ─────────────────────────────────────────────────────
const emailForm    = ref({ newEmail: '' })
const emailLoading = ref(false)
const emailError   = ref('')
const emailSent    = ref(false)

async function handleChangeEmail() {
  emailError.value = ''
  const newEmail = emailForm.value.newEmail.trim()
  if (!newEmail || !newEmail.includes('@')) { emailError.value = 'Ingresa un correo válido'; return }
  emailLoading.value = true
  try {
    await authStore.changeEmail(newEmail)
    emailSent.value = true
    emailForm.value.newEmail = ''
  } catch (e) {
    const code = getErrorCode(e)
    emailError.value = code === 'EMAIL_ALREADY_IN_USE'
      ? 'Este correo ya está registrado'
      : 'Error al solicitar el cambio de correo'
  } finally {
    emailLoading.value = false
  }
}

// ── CUENTA: Cambiar contraseña ────────────────────────────────────────────────
const passwordForm    = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordLoading = ref(false)
const passwordError   = ref('')

const passwordStrength = computed(() => {
  const p = passwordForm.value.newPassword
  if (!p) return 0
  let score = 0
  if (p.length >= 8)          score++
  if (p.length >= 12)         score++
  if (/[A-Z]/.test(p))        score++
  if (/[0-9]/.test(p))        score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})

const strengthLabel = computed(() => {
  const s = passwordStrength.value
  if (s <= 1) return { text: 'Débil',  color: 'var(--danger)' }
  if (s <= 3) return { text: 'Media',  color: 'var(--warning)' }
  return             { text: 'Fuerte', color: 'var(--success)' }
})

async function handleChangePassword() {
  passwordError.value = ''
  const { currentPassword, newPassword, confirmPassword } = passwordForm.value
  if (newPassword.length < 8)       { passwordError.value = 'La nueva contraseña debe tener al menos 8 caracteres'; return }
  if (newPassword !== confirmPassword) { passwordError.value = 'Las contraseñas no coinciden'; return }
  passwordLoading.value = true
  try {
    await authStore.changePassword(newPassword, currentPassword || undefined)
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    toast.show('Contraseña actualizada correctamente', 'success')
  } catch (e) {
    const code = getErrorCode(e)
    passwordError.value = code === 'INVALID_CREDENTIALS'
      ? 'La contraseña actual es incorrecta'
      : 'Error al cambiar la contraseña'
  } finally {
    passwordLoading.value = false
  }
}

// ── ORGANIZACIÓN ──────────────────────────────────────────────────────────────
const orgForm    = ref({ name: '', industry: '', country: '', phone: '', logoUrl: '' })
const orgLoading = ref(false)
const orgError   = ref('')

watch(activeOrg, (org) => {
  if (org) orgForm.value = {
    name: org.name ?? '', industry: org.industry ?? '',
    country: org.country ?? '', phone: org.phone ?? '', logoUrl: org.logoUrl ?? '',
  }
}, { immediate: true })

async function handleSaveOrg() {
  orgError.value = ''
  if (!orgForm.value.name.trim()) { orgError.value = 'El nombre de la organización es requerido'; return }
  orgLoading.value = true
  try {
    await orgStore.updateOrg({
      name:     orgForm.value.name.trim(),
      industry: orgForm.value.industry.trim() || null,
      country:  orgForm.value.country.trim()  || null,
      phone:    orgForm.value.phone.trim()    || null,
      logoUrl:  orgForm.value.logoUrl.trim()  || null,
    })
    toast.show('Organización actualizada correctamente', 'success')
  } catch {
    orgError.value = 'Error al guardar los cambios'
  } finally {
    orgLoading.value = false
  }
}

// ── MIEMBROS ──────────────────────────────────────────────────────────────────
const membersLoading  = ref(false)
const inviteEmail     = ref('')
const inviteRole      = ref<'admin' | 'staff'>('staff')
const inviteLoading   = ref(false)
const inviteError     = ref('')
const showInviteForm  = ref(false)
const roleEditingId   = ref<string | null>(null)
const roleLoading     = ref<string | null>(null)
const confirmRemoveId = ref<string | null>(null)
const removeLoading   = ref(false)

async function handleInvite() {
  inviteError.value = ''
  if (!inviteEmail.value.trim()) { inviteError.value = 'El email es requerido'; return }
  if (!orgStore.activeOrg) return
  inviteLoading.value = true
  try {
    await orgStore.inviteMember({ organizationId: orgStore.activeOrg.id, email: inviteEmail.value.trim(), role: inviteRole.value })
    toast.show(`Invitación enviada a ${inviteEmail.value.trim()}`, 'success')
    inviteEmail.value = ''
    inviteRole.value  = 'staff'
    showInviteForm.value = false
  } catch (e) {
    const code = getErrorCode(e)
    inviteError.value =
      code === 'ALREADY_MEMBER'       ? 'Ya es miembro de la organización' :
      code === 'INVITATION_PENDING'   ? 'Ya tiene una invitación pendiente' :
      'Error al enviar la invitación'
  } finally {
    inviteLoading.value = false
  }
}

async function handleRoleChange(memberId: string, role: 'admin' | 'staff') {
  roleLoading.value = memberId
  try {
    await orgStore.updateMemberRole(memberId, role)
    roleEditingId.value = null
    toast.show('Rol actualizado', 'success')
  } catch (e) {
    const code = getErrorCode(e)
    const msg =
      code === 'CANNOT_CHANGE_OWN_ROLE' ? 'No puedes cambiar tu propio rol' :
      code === 'CANNOT_ASSIGN_OWNER'    ? 'No se puede asignar el rol de propietario' :
      code === 'FORBIDDEN'              ? 'Sin permisos para esta acción' :
      'Error al cambiar el rol'
    toast.show(msg, 'error')
  } finally {
    roleLoading.value = null
  }
}

const confirmRemoveMember = computed(() => members.value.find(m => m.id === confirmRemoveId.value))

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
      code === 'CANNOT_REMOVE_SELF'  ? 'No puedes eliminarte a ti mismo' :
      code === 'CANNOT_REMOVE_OWNER' ? 'No se puede eliminar al propietario' :
      code === 'FORBIDDEN'           ? 'Sin permisos para esta acción' :
      'Error al eliminar el miembro'
    toast.show(msg, 'error')
    confirmRemoveId.value = null
  } finally {
    removeLoading.value = false
  }
}

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

watch([activeTab, activeOrgId], async ([tab, orgId]) => {
  if (tab !== 'members' || !orgId) return
  membersLoading.value = true
  orgStore.clearMembers()
  try { await orgStore.fetchMembers(orgId) }
  finally { membersLoading.value = false }
}, { immediate: true })

// ── Helpers ───────────────────────────────────────────────────────────────────
function getErrorCode(e: unknown): string {
  return ((e as { body?: { error?: string } })?.body?.error) ?? ''
}

const roleLabel: Record<MemberRole, string> = { owner: 'Propietario', admin: 'Admin', staff: 'Staff' }

const roleBadgeStyle: Record<MemberRole, string> = {
  owner: 'background:var(--info-bg);color:var(--info);',
  admin: 'background:var(--info-bg);color:var(--info);',
  staff: 'background:var(--bg-subtle);color:var(--text-medium);',
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
  <div class="settings-root">

    <!-- ── Sidebar nav (desktop) / Scrollable pills (mobile) ── -->
    <nav class="settings-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="nav-item"
        :class="{ 'is-active': activeTab === tab.id }"
        @click="selectTab(tab.id)"
      >
        <svg
          width="15" height="15" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"
          class="nav-item__icon"
          v-html="tabIconPaths[tab.id]"
        />
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <!-- ── Content area ── -->
    <div class="settings-content">

      <!-- ══════════════════════════════ CUENTA ══════════════════════════════ -->
      <div v-if="activeTab === 'account'" class="tab-pane">

        <!-- Profile card -->
        <div class="profile-card">
          <div class="profile-card__avatar">{{ getInitials(admin?.email) }}</div>
          <div>
            <p class="profile-card__email">{{ admin?.email }}</p>
            <span class="profile-card__badge">Administrador</span>
          </div>
        </div>

        <!-- Email section -->
        <section class="settings-section">
          <div class="section-head">
            <div class="section-head__icon" style="background:var(--info-bg);color:var(--info);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div>
              <h2 class="section-head__title">Correo electrónico</h2>
              <p class="section-head__sub">Correo actual: <strong style="color:var(--text-ink);">{{ admin?.email }}</strong></p>
            </div>
          </div>

          <!-- Sent state -->
          <template v-if="emailSent">
            <div class="alert alert--success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink:0;">
                <path d="M5 12l5 5L20 7"/>
              </svg>
              <div>
                <p class="alert__title">Revisa tu bandeja de entrada</p>
                <p class="alert__body">Enviamos un enlace de confirmación a tu nuevo correo. Haz clic en él para completar el cambio.</p>
              </div>
            </div>
            <button class="link-btn" @click="emailSent = false">Solicitar otro cambio</button>
          </template>

          <!-- Form -->
          <div v-else class="field-group">
            <div class="field">
              <label class="field__label">Nuevo correo electrónico</label>
              <input
                v-model="emailForm.newEmail"
                type="email"
                placeholder="nuevo@correo.com"
                class="field__input"
                @keyup.enter="handleChangeEmail"
              />
              <p v-if="emailError" class="field__error">{{ emailError }}</p>
            </div>
            <div>
              <button class="btn-primary" :disabled="emailLoading" @click="handleChangeEmail">
                {{ emailLoading ? 'Enviando…' : 'Solicitar cambio' }}
              </button>
            </div>
          </div>
        </section>

        <!-- Password section -->
        <section class="settings-section">
          <div class="section-head">
            <div class="section-head__icon" style="background:var(--bg-subtle);color:var(--success);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <div>
              <h2 class="section-head__title">Contraseña</h2>
              <p class="section-head__sub">Cambia tu contraseña de acceso.</p>
            </div>
          </div>

          <div class="field-group">
            <div class="field">
              <label class="field__label">
                Contraseña actual
                <span class="field__hint"> — déjala en blanco si te registraste con Google</span>
              </label>
              <input v-model="passwordForm.currentPassword" type="password" placeholder="••••••••" class="field__input" />
            </div>
            <div class="field-row">
              <div class="field">
                <label class="field__label">Nueva contraseña</label>
                <input v-model="passwordForm.newPassword" type="password" placeholder="Mínimo 8 caracteres" class="field__input" />
                <div v-if="passwordForm.newPassword" class="strength-bar">
                  <div class="strength-bar__track">
                    <div v-for="i in 5" :key="i" class="strength-bar__seg" :style="{ background: i <= passwordStrength ? strengthLabel.color : 'var(--border)' }" />
                  </div>
                  <span class="strength-bar__label" :style="{ color: strengthLabel.color }">{{ strengthLabel.text }}</span>
                </div>
              </div>
              <div class="field">
                <label class="field__label">Confirmar nueva contraseña</label>
                <input v-model="passwordForm.confirmPassword" type="password" placeholder="Repite la contraseña" class="field__input" @keyup.enter="handleChangePassword" />
              </div>
            </div>
            <p v-if="passwordError" class="field__error">{{ passwordError }}</p>
            <div>
              <button class="btn-primary" :disabled="passwordLoading" @click="handleChangePassword">
                {{ passwordLoading ? 'Guardando…' : 'Cambiar contraseña' }}
              </button>
            </div>
          </div>
        </section>
      </div>

      <!-- ════════════════════════════ ORGANIZACIÓN ════════════════════════════ -->
      <div v-if="activeTab === 'organization'" class="tab-pane">

        <!-- Org identity card -->
        <div class="org-card">
          <div class="org-card__avatar">{{ getInitials(activeOrg?.name) }}</div>
          <div>
            <p class="org-card__name">{{ activeOrg?.name || '—' }}</p>
            <p class="org-card__sub">Organización activa</p>
          </div>
        </div>

        <section class="settings-section">
          <div class="section-head">
            <div class="section-head__icon" style="background:var(--warning-bg);color:var(--warning);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <h2 class="section-head__title">Datos de la organización</h2>
              <p class="section-head__sub">La información pública de tu empresa.</p>
            </div>
          </div>

          <div class="field-group">
            <div class="field">
              <label class="field__label">Nombre <span style="color:var(--danger);">*</span></label>
              <input v-model="orgForm.name" type="text" placeholder="Mi empresa" class="field__input" />
            </div>
            <div class="field-row">
              <div class="field">
                <label class="field__label">Industria</label>
                <input v-model="orgForm.industry" type="text" placeholder="Retail, F&amp;B, etc." class="field__input" />
              </div>
              <div class="field">
                <label class="field__label">País</label>
                <input v-model="orgForm.country" type="text" placeholder="México" class="field__input" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label class="field__label">Teléfono</label>
                <input v-model="orgForm.phone" type="tel" placeholder="+52 55 1234 5678" class="field__input" />
              </div>
              <div class="field">
                <label class="field__label">Logo URL</label>
                <input v-model="orgForm.logoUrl" type="url" placeholder="https://tu-logo.png" class="field__input" />
              </div>
            </div>
            <p v-if="orgError" class="field__error">{{ orgError }}</p>
            <div>
              <button class="btn-primary" :disabled="orgLoading" @click="handleSaveOrg">
                {{ orgLoading ? 'Guardando…' : 'Guardar cambios' }}
              </button>
            </div>
          </div>
        </section>
      </div>

      <!-- ═══════════════════════════════ MIEMBROS ═════════════════════════════ -->
      <div v-if="activeTab === 'members'" class="tab-pane">

        <!-- Tab header -->
        <div class="members-head">
          <div>
            <h2 class="members-head__title">Equipo</h2>
            <p v-if="activeOrg" class="members-head__sub">{{ activeOrg.name }}</p>
          </div>
          <button class="btn-primary" @click="showInviteForm = !showInviteForm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Invitar
          </button>
        </div>

        <!-- Invite form (animated) -->
        <Transition name="slide-down">
          <div v-if="showInviteForm" class="invite-form">
            <p class="invite-form__title">Invitar por correo electrónico</p>
            <div class="invite-form__fields">
              <input
                v-model="inviteEmail"
                type="email"
                placeholder="colaborador@empresa.com"
                class="field__input"
                @keyup.enter="handleInvite"
              />
              <select v-model="inviteRole" class="field__input field__select">
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              <button class="btn-orange" :disabled="inviteLoading" @click="handleInvite">
                {{ inviteLoading ? '…' : 'Enviar invitación' }}
              </button>
            </div>
            <p v-if="inviteError" class="field__error">{{ inviteError }}</p>
            <p class="invite-form__hint">Se enviará un enlace de invitación al correo indicado.</p>
          </div>
        </Transition>

        <!-- Members list card -->
        <div class="members-list">
          <div class="members-list__header">
            <span v-if="membersLoading" class="skeleton" style="width:80px;height:14px;" />
            <span v-else class="members-list__count">
              {{ members.length }} {{ members.length === 1 ? 'miembro' : 'miembros' }}
            </span>
          </div>

          <!-- Loading skeleton -->
          <div v-if="membersLoading">
            <div v-for="i in 3" :key="i" class="member-row">
              <div class="skeleton" style="width:40px;height:40px;border-radius:12px;flex-shrink:0;" />
              <div style="flex:1;display:flex;flex-direction:column;gap:6px;min-width:0;">
                <div class="skeleton" style="width:180px;max-width:60%;height:13px;" />
                <div class="skeleton" style="width:90px;height:11px;" />
              </div>
              <div class="skeleton" style="width:64px;height:24px;border-radius:12px;" />
            </div>
          </div>

          <!-- Real members -->
          <div v-else-if="members.length">
            <div v-for="member in members" :key="member.id" class="member-row">

              <!-- Avatar -->
              <div class="member-avatar">{{ getInitials(member.email ?? member.adminId) }}</div>

              <!-- Info -->
              <div class="member-info">
                <p class="member-info__email">
                  {{ member.email ?? member.adminId }}
                  <span v-if="member.adminId === admin?.id" class="member-info__you">(tú)</span>
                </p>
                <p class="member-info__since">Desde {{ formatDate(member.createdAt) }}</p>
              </div>

              <!-- Role badge or inline select -->
              <div class="member-role">
                <template v-if="canChangeRole(member.id, member.role) && roleEditingId === member.id">
                  <select
                    class="field__input field__select field__select--sm"
                    :disabled="roleLoading === member.id"
                    :value="member.role"
                    @change="handleRoleChange(member.id, ($event.target as HTMLSelectElement).value as 'admin' | 'staff')"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button class="icon-btn" title="Cancelar" @click="roleEditingId = null">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </template>
                <span v-else class="role-badge" :style="roleBadgeStyle[member.role]">
                  {{ roleLabel[member.role] }}
                </span>
              </div>

              <!-- Actions -->
              <div class="member-actions">
                <button
                  v-if="canChangeRole(member.id, member.role) && roleEditingId !== member.id"
                  class="action-btn"
                  title="Cambiar rol"
                  @click="roleEditingId = member.id"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  v-if="canRemoveMember(member.id, member.role)"
                  class="action-btn action-btn--danger"
                  title="Eliminar miembro"
                  @click="confirmRemoveId = member.id"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div v-else class="members-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <p>No hay miembros aún.</p>
          </div>
        </div>
      </div>

    </div><!-- /settings-content -->

    <!-- ════════════════ MODAL: Confirmar eliminación ═══════════════════════════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="confirmRemoveId" class="modal-overlay" @click.self="confirmRemoveId = null">
          <div class="modal-box">
            <div class="modal-box__icon modal-box__icon--danger">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="1.8" stroke-linecap="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </div>
            <h3 class="modal-box__title">Eliminar miembro</h3>
            <p class="modal-box__body">
              ¿Estás seguro de que deseas eliminar a
              <strong style="color:var(--text-ink);">{{ confirmRemoveMember?.email ?? confirmRemoveMember?.adminId }}</strong>
              del equipo? Esta acción no se puede deshacer.
            </p>
            <div class="modal-box__actions">
              <button class="btn-secondary" :disabled="removeLoading" @click="confirmRemoveId = null">Cancelar</button>
              <button class="btn-danger"    :disabled="removeLoading" @click="handleRemoveMember">
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
/* ── Root: sidebar + content grid ── */
.settings-root {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 24px;
  align-items: start;
  max-width: 940px;
}

/* ── Sidebar nav ── */
.settings-nav {
  position: sticky;
  top: 20px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 8px;
  box-shadow: 0 1px 0 var(--shadow-card);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: none;
  background: transparent;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  width: 100%;
  transition: background 0.12s, color 0.12s;
}
.nav-item:hover   { background: var(--bg-page); color: var(--text-ink); }
.nav-item.is-active { background: var(--bg-subtle); color: var(--primary); }
.nav-item__icon   { flex-shrink: 0; }

/* ── Content area ── */
.settings-content { min-width: 0; }
.tab-pane { display: flex; flex-direction: column; gap: 20px; }

/* ── Profile card ── */
.profile-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 1px 0 var(--shadow-card);
}
.profile-card__avatar {
  width: 52px; height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--primary), var(--primary-mid));
  color: var(--bg-surface);
  font-size: 16px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  letter-spacing: 0.03em;
}
.profile-card__email {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-ink);
  margin: 0 0 5px;
  word-break: break-all;
}
.profile-card__badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 999px;
  background: var(--info-bg);
  color: var(--info);
}

/* ── Org card ── */
.org-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px 20px;
  box-shadow: 0 1px 0 var(--shadow-card);
}
.org-card__avatar {
  width: 44px; height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--warning-bg), var(--amber-bg));
  color: var(--warning);
  font-size: 14px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.org-card__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0 0 2px;
}
.org-card__sub {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

/* ── Settings section card ── */
.settings-section {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 1px 0 var(--shadow-card);
}

.section-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--bg-subtle);
}
.section-head__icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.section-head__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0 0 3px;
}
.section-head__sub {
  font-size: 12.5px;
  color: var(--text-muted);
  margin: 0;
}

/* ── Form fields ── */
.field-group { display: flex; flex-direction: column; gap: 16px; }
.field       { display: flex; flex-direction: column; gap: 6px; }
.field-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

.field__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-medium);
}
.field__hint     { font-size: 11px; font-weight: 400; color: var(--text-faint); }
.field__required { color: var(--danger); }

.field__input {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid var(--border);
  border-radius: 9px;
  font-size: 13.5px;
  font-family: inherit;
  color: var(--text-ink);
  background: var(--bg-surface);
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field__input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(27,67,50,0.08);
}
.field__error  { font-size: 12px; color: var(--danger); margin: 0; }
.field__select { cursor: pointer; }
.field__select--sm { padding: 6px 8px; font-size: 12.5px; width: auto; }

/* ── Password strength ── */
.strength-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.strength-bar__track { flex: 1; display: flex; gap: 3px; }
.strength-bar__seg {
  height: 4px;
  flex: 1;
  border-radius: 2px;
  transition: background 0.2s;
}
.strength-bar__label { font-size: 11.5px; font-weight: 600; white-space: nowrap; }

/* ── Alert ── */
.alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid transparent;
}
.alert--success { background: var(--success-bg); border-color: var(--success-bg); color: var(--success); }
.alert__title   { font-size: 13.5px; font-weight: 600; margin-bottom: 2px; }
.alert__body    { font-size: 12.5px; line-height: 1.5; }

/* ── Buttons ── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: var(--primary);
  color: var(--bg-surface);
  border: none;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.btn-primary:disabled         { opacity: 0.6; cursor: default; }
.btn-primary:not(:disabled):hover { opacity: 0.88; }

.btn-orange {
  padding: 10px 18px;
  background: var(--amber);
  color: var(--primary);
  border: none;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: opacity 0.15s;
}
.btn-orange:disabled          { opacity: 0.6; cursor: default; }
.btn-orange:not(:disabled):hover { opacity: 0.88; }

.btn-secondary {
  flex: 1;
  padding: 11px 16px;
  border-radius: 9px;
  background: var(--bg-page);
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-medium);
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
}
.btn-secondary:not(:disabled):hover { opacity: 0.88; }

.btn-danger {
  flex: 1;
  padding: 11px 16px;
  border-radius: 9px;
  background: var(--danger);
  border: none;
  font-size: 13px;
  font-weight: 700;
  color: var(--bg-surface);
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
}
.btn-danger:disabled          { opacity: 0.6; }
.btn-danger:not(:disabled):hover { opacity: 0.88; }

.link-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--text-muted);
  font-family: inherit;
  padding: 0;
  text-decoration: underline;
  align-self: flex-start;
}

/* ── Members section ── */
.members-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.members-head__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0 0 2px;
}
.members-head__sub { font-size: 12.5px; color: var(--text-muted); margin: 0; }

/* ── Invite form ── */
.invite-form {
  background: var(--bg-subtle);
  border: 1.5px dashed var(--border);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.invite-form__title  { font-size: 13px; font-weight: 600; color: var(--text-ink); margin: 0; }
.invite-form__fields { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-start; }
.invite-form__fields .field__input:not(select) { flex: 1; min-width: 180px; }
.invite-form__hint   { font-size: 11.5px; color: var(--text-faint); margin: 0; }

/* ── Members list card ── */
.members-list {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 0 var(--shadow-card);
}
.members-list__header {
  padding: 13px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
}
.members-list__count { font-size: 13px; font-weight: 600; color: var(--text-ink); }

.member-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 20px;
  border-bottom: 1px solid var(--bg-page);
  transition: background 0.1s;
}
.member-row:last-child { border-bottom: none; }
.member-row:hover      { background: var(--bg-subtle); }

.member-avatar {
  width: 40px; height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-light), var(--success-bg));
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.member-info { flex: 1; min-width: 0; }
.member-info__email {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 0 2px;
}
.member-info__you   { font-size: 11px; font-weight: 400; color: var(--text-nav-icon); margin-left: 4px; }
.member-info__since { font-size: 11.5px; color: var(--text-faint); margin: 0; }

.member-role {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.role-badge {
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.member-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }

.action-btn {
  width: 32px; height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--text-muted);
  transition: background 0.12s, color 0.12s, border-color 0.12s;
  flex-shrink: 0;
}
.action-btn:hover { background: var(--bg-page); color: var(--text-ink); border-color: var(--border); }
.action-btn--danger { color: var(--danger); border-color: var(--border); }
.action-btn--danger:hover { background: var(--danger-bg); border-color: var(--border); }

.icon-btn {
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-faint);
  display: flex;
  align-items: center;
  justify-content: center;
}

.members-empty {
  padding: 44px 20px;
  text-align: center;
  color: var(--text-faint);
  font-size: 13px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

/* ── Skeleton ── */
.skeleton {
  background: var(--bg-subtle);
  border-radius: 4px;
  animation: sk-pulse 1.4s ease-in-out infinite;
  display: block;
}

/* ── Modal ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  display: grid;
  place-items: center;
  z-index: 9100;
  backdrop-filter: blur(3px);
  padding: 20px;
}
.modal-box {
  background: var(--bg-surface);
  border-radius: 20px;
  padding: 32px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.16);
}
.modal-box__icon {
  width: 52px; height: 52px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
}
.modal-box__icon--danger { background: var(--danger-bg); }
.modal-box__title  { font-size: 18px; font-weight: 800; color: var(--text-ink); margin-bottom: 8px; }
.modal-box__body   { font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-bottom: 24px; }
.modal-box__actions { display: flex; gap: 10px; }

/* ── Keyframes ── */
@keyframes sk-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.45; }
}

/* ── Transitions ── */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from,   .modal-leave-to     { opacity: 0; }
.modal-enter-active .modal-box,
.modal-leave-active .modal-box           { transition: transform 0.2s ease; }
.modal-enter-from .modal-box,
.modal-leave-to .modal-box               { transform: scale(0.96); }

.slide-down-enter-active {
  transition: opacity 0.2s ease, max-height 0.25s ease;
  overflow: hidden;
  max-height: 320px;
}
.slide-down-leave-active {
  transition: opacity 0.15s ease, max-height 0.2s ease;
  overflow: hidden;
  max-height: 320px;
}
.slide-down-enter-from,
.slide-down-leave-to { max-height: 0; opacity: 0; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .settings-root {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .settings-nav {
    position: static;
    flex-direction: row;
    overflow-x: auto;
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-top: none;
    padding: 10px 16px;
    gap: 6px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    margin: 0 -16px;
    padding-left: 16px;
    padding-right: 16px;
  }
  .settings-nav::-webkit-scrollbar { display: none; }

  .nav-item {
    flex-shrink: 0;
    width: auto;
    padding: 8px 14px;
    border-radius: 999px;
    font-size: 13px;
    gap: 6px;
  }
  .nav-item.is-active {
    background: var(--primary);
    color: var(--bg-surface);
  }
  .nav-item:hover:not(.is-active) { background: var(--bg-page); }

  .settings-content {
    padding-top: 20px;
  }

  .field-row { grid-template-columns: 1fr; }

  .invite-form__fields { flex-direction: column; }
  .invite-form__fields .field__input:not(select) { min-width: unset; }

  .member-row   { padding: 12px 16px; gap: 10px; }
  .member-avatar { width: 36px; height: 36px; border-radius: 10px; font-size: 12px; }
  .members-list__header { padding: 11px 16px; }
  .action-btn   { width: 30px; height: 30px; }
}

@media (max-width: 480px) {
  .member-info__since { display: none; }
  .profile-card { gap: 12px; padding: 16px; }
  .profile-card__avatar { width: 44px; height: 44px; font-size: 14px; border-radius: 12px; }
  .settings-section { padding: 18px 16px; }
  .section-head { gap: 12px; }
  .section-head__icon { width: 34px; height: 34px; }
}
</style>
