<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import type { MemberRole } from '@/domain/organization/entities/OrganizationMember'

const orgStore = useOrganizationStore()
const { activeOrgId } = storeToRefs(orgStore)

const showForm = ref(false)
const email = ref('')
const role = ref<MemberRole>('staff')
const loading = ref(false)
const error = ref('')
const successMsg = ref('')
const fetchingMembers = ref(false)

watch(
  activeOrgId,
  async (id) => {
    if (!id) return
    fetchingMembers.value = true
    orgStore.clearMembers()
    try {
      await orgStore.fetchMembers(id)
    } finally {
      fetchingMembers.value = false
    }
  },
  { immediate: true },
)

async function handleInvite() {
  if (!email.value.trim()) { error.value = 'El email es requerido'; return }
  if (!orgStore.activeOrg) return
  try {
    loading.value = true
    error.value = ''
    successMsg.value = ''
    await orgStore.inviteMember({ organizationId: orgStore.activeOrg.id, email: email.value.trim(), role: role.value })
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

const roleStyle: Record<MemberRole, { color: string; bg: string }> = {
  owner: { color: '#7C3AED', bg: '#F0E6FB' },
  admin: { color: 'var(--primary)', bg: 'var(--primary-light)' },
  staff: { color: 'var(--text-muted)', bg: 'var(--bg-subtle)' },
}

function memberInitials(emailOrId: string): string {
  return emailOrId.slice(0, 2).toUpperCase()
}

function memberColor(role: MemberRole): string {
  return roleStyle[role]?.color ?? 'var(--text-muted)'
}

function formatDate(value?: string): string {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="team-page">

    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">Equipo</h1>
        <p v-if="orgStore.activeOrg" class="page-subtitle">{{ orgStore.activeOrg.name }}</p>
      </div>
      <button class="btn-invite" @click="showForm = !showForm">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M19 8v6M22 11h-6"/>
        </svg>
        Invitar miembro
      </button>
    </div>

    <!-- Success banner -->
    <Transition name="fade">
      <div v-if="successMsg" class="success-banner">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary-mid)" stroke-width="2.5" stroke-linecap="round">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        {{ successMsg }}
      </div>
    </Transition>

    <!-- Invite form -->
    <Transition name="slide-down">
      <div v-if="showForm" class="invite-card">
        <div class="invite-card-header">
          <div class="invite-icon-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M19 8v6M22 11h-6"/>
            </svg>
          </div>
          <div>
            <p class="invite-title">Invitar por email</p>
            <p class="invite-sub">Se enviará un correo con enlace para unirse a la organización.</p>
          </div>
        </div>

        <div class="invite-form-row">
          <div class="invite-email-wrap">
            <label class="field-label">Email del colaborador</label>
            <input
              v-model="email"
              type="email"
              placeholder="barista@negocio.com"
              class="field-input"
              @keyup.enter="handleInvite"
            />
          </div>
          <div class="invite-role-wrap">
            <label class="field-label">Rol</label>
            <select v-model="role" class="field-input field-select">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <p v-if="error" class="field-error">{{ error }}</p>

        <div class="invite-actions">
          <button class="btn-cancel-invite" @click="showForm = false; error = ''">Cancelar</button>
          <button class="btn-send" :disabled="loading" @click="handleInvite">
            <svg v-if="loading" class="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9"/>
            </svg>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
            {{ loading ? 'Enviando…' : 'Enviar invitación' }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Members card -->
    <div class="members-card">
      <!-- Card header -->
      <div class="members-header">
        <p class="members-title">
          Miembros
          <span v-if="!fetchingMembers" class="members-count">{{ orgStore.members.length }}</span>
        </p>
        <div v-if="fetchingMembers" class="skeleton-pill" />
      </div>

      <!-- Skeleton rows -->
      <div v-if="fetchingMembers">
        <div v-for="i in 3" :key="i" class="member-row">
          <div class="skeleton-avatar" />
          <div class="skeleton-lines">
            <div class="skeleton-line w-40" />
            <div class="skeleton-line w-24" />
          </div>
          <div class="skeleton-badge" />
        </div>
      </div>

      <!-- Real rows -->
      <div v-else-if="orgStore.members.length">
        <div
          v-for="member in orgStore.members"
          :key="member.id"
          class="member-row"
        >
          <div
            class="member-avatar"
            :style="{ background: roleStyle[member.role].bg, color: roleStyle[member.role].color }"
          >
            {{ memberInitials(member.email ?? member.adminId) }}
          </div>

          <div class="member-info">
            <p class="member-email">{{ member.email ?? member.adminId }}</p>
            <p class="member-since">Miembro desde {{ formatDate(member.createdAt) }}</p>
          </div>

          <span
            class="role-badge"
            :style="{ color: roleStyle[member.role].color, background: roleStyle[member.role].bg }"
          >
            <svg
              v-if="member.role === 'owner'"
              width="9" height="9" viewBox="0 0 24 24" fill="none"
              :stroke="memberColor(member.role)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
            </svg>
            {{ roleLabel[member.role] }}
          </span>
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="members-empty">
        <div class="empty-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <p class="empty-text">No hay miembros aún.</p>
        <button class="empty-cta" @click="showForm = true">Invitar el primero</button>
      </div>
    </div>

    <!-- Role legend -->
    <div class="role-legend">
      <div v-for="(style, r) in roleStyle" :key="r" class="legend-item">
        <span class="legend-dot" :style="{ background: style.color }" />
        <span class="legend-label">{{ roleLabel[r as MemberRole] }}</span>
        <span class="legend-desc">
          {{ r === 'owner' ? 'Control total' : r === 'admin' ? 'Gestión avanzada' : 'Operaciones básicas' }}
        </span>
      </div>
    </div>

  </div>
</template>

<style scoped>
.team-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 640px;
}

/* Header */
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0 0 3px;
}

.page-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

.btn-invite {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.btn-invite:hover { background: var(--primary-mid); }

/* Success banner */
.success-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 16px;
  background: var(--primary-light);
  border: 1px solid var(--primary-light);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-mid);
}

/* Invite form card */
.invite-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 4px 16px var(--shadow-card);
}

.invite-card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.invite-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.invite-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0 0 3px;
}

.invite-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.4;
}

.invite-form-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: end;
}

@media (max-width: 480px) {
  .invite-form-row { grid-template-columns: 1fr; }
}

.invite-email-wrap,
.invite-role-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.field-input {
  width: 100%;
  padding: 11px 13px;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: var(--bg-surface);
  font-size: 13px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: var(--text-ink);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}
.field-input::placeholder { color: var(--text-faint); }
.field-input:focus {
  border-color: var(--amber);
  box-shadow: 0 0 0 3px var(--amber-bg);
}

.field-select {
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7A72' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.field-error {
  font-size: 11px;
  color: var(--danger);
  margin: 0;
}

.invite-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-cancel-invite {
  padding: 9px 16px;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: var(--bg-surface);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;
}
.btn-cancel-invite:hover { background: var(--bg-page); color: var(--text-ink); }

.btn-send {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border-radius: 9px;
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  border: none;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.btn-send:hover:not(:disabled) { background: var(--primary-mid); }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }

/* Members card */
.members-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 0 rgba(15, 27, 20, 0.02);
}

.members-header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 10px;
}

.members-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.members-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-subtle);
  padding: 2px 7px;
  border-radius: 999px;
}

.skeleton-pill {
  height: 18px;
  width: 80px;
  background: var(--bg-subtle);
  border-radius: 999px;
  animation: pulse 1.5s ease-in-out infinite;
}

/* Member rows */
.member-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  transition: background 0.12s;
}
.member-row:last-child { border-bottom: none; }
.member-row:hover { background: var(--bg-surface); }

.member-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: -0.5px;
}

.member-info { flex: 1; min-width: 0; }

.member-email {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-ink);
  margin: 0 0 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-since {
  font-size: 11px;
  color: var(--text-faint);
  margin: 0;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Skeleton */
.skeleton-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--bg-subtle);
  flex-shrink: 0;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }

.skeleton-line {
  height: 10px;
  background: var(--bg-subtle);
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}
.skeleton-line.w-40 { width: 60%; }
.skeleton-line.w-24 { width: 38%; }

.skeleton-badge {
  width: 60px;
  height: 22px;
  border-radius: 999px;
  background: var(--bg-subtle);
  animation: pulse 1.5s ease-in-out infinite;
}

/* Empty */
.members-empty {
  padding: 48px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.empty-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--bg-subtle);
  display: grid;
  place-items: center;
  margin-bottom: 4px;
}

.empty-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-ink);
  margin: 0;
}

.empty-cta {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-mid);
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
  padding: 0;
  transition: color 0.15s;
}
.empty-cta:hover { color: var(--primary); }

/* Role legend */
.role-legend {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--bg-page);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-medium);
}

.legend-desc {
  font-size: 11px;
  color: var(--text-faint);
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-down-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.slide-down-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-8px); }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
</style>
