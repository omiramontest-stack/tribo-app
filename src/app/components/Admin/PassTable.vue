<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePassStore } from '@/app/stores/pass/PassStore'
import { useWhatsAppStore } from '@/app/stores/whatsapp/WhatsAppStore'
import { useToast } from '@/app/composables/useToast'
import { apiClient } from '@/infrastructure/http/ApiClient'
import type { Pass } from '@/domain/pass/entities/Pass'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type {
  StampsData, PointsData, CashbackData,
  DaypassData, MembershipData, BundleData, GiftcardData,
} from '@/domain/pass/entities/PassData'
import type { StampsRules, PointsRules, CashbackRules } from '@/domain/wallet/entities/WalletRules'

const props = defineProps<{ passes: Pass[]; wallet: Wallet }>()
const router        = useRouter()
const passStore     = usePassStore()
const whatsappStore = useWhatsAppStore()
const toast         = useToast()

const sendingToken   = ref<string | null>(null)
const sendingWaToken = ref<string | null>(null)
const copiedToken    = ref<string | null>(null)
const passToDelete   = ref<Pass | null>(null)
const deleting       = ref(false)

// ── Actions ────────────────────────────────────────────────────────────────
function copyLink(token: string) {
  const url = window.location.origin + router.resolve({ name: 'PassView', params: { token } }).href
  navigator.clipboard.writeText(url)
  copiedToken.value = token
  setTimeout(() => { copiedToken.value = null }, 2000)
}

async function sendSms(pass: Pass) {
  if (sendingToken.value) return
  sendingToken.value = pass.token
  try {
    await apiClient.post(`/passes/${pass.token}/send-link`, {})
  } finally {
    sendingToken.value = null
  }
}

async function sendWhatsApp(pass: Pass) {
  if (sendingWaToken.value) return
  sendingWaToken.value = pass.token
  try {
    await whatsappStore.sendPass(pass.token)
    toast.show('Enviado por WhatsApp ✓', 'success')
  } catch (e) {
    const err = e as { status?: number; body?: { error?: string } }
    const code = err?.body?.error ?? ''
    toast.show(
      err?.status === 429
        ? 'Espera unos segundos antes de reenviar'
        : code === 'WHATSAPP_NOT_CONNECTED'
          ? 'Conecta WhatsApp en Ajustes primero'
          : 'Error al enviar por WhatsApp',
      'error',
    )
  } finally {
    sendingWaToken.value = null
  }
}

async function confirmDelete() {
  if (!passToDelete.value) return
  deleting.value = true
  try {
    await passStore.deletePass(passToDelete.value.token)
    passToDelete.value = null
  } finally {
    deleting.value = false
  }
}

// ── Data derivation ────────────────────────────────────────────────────────
function getProgress(pass: Pass): { value: number; max: number; text: string } | null {
  const { data } = pass
  if (data.type === 'stamps') {
    const d = data as StampsData
    const r = props.wallet.rules as StampsRules
    return { value: d.currentStamps, max: r.totalStamps, text: `${d.currentStamps}/${r.totalStamps} sellos` }
  }
  if (data.type === 'points') {
    const d = data as PointsData
    const r = props.wallet.rules as PointsRules
    return { value: d.currentPoints, max: r.rewardThreshold, text: `${d.currentPoints}/${r.rewardThreshold} ${r.pointsLabel}` }
  }
  if (data.type === 'cashback') {
    const d = data as CashbackData
    const r = props.wallet.rules as CashbackRules
    return { value: d.balance, max: d.balance, text: `${r.currency} ${d.balance.toFixed(2)}` }
  }
  return null
}

function formatExpiresAt(iso: string | null | undefined): { label: string; ok: boolean } {
  if (!iso) return { label: 'Sin vencimiento', ok: true }
  const date = new Date(iso)
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000)
  if (days < 0) return { label: 'Vencido', ok: false }
  if (days === 0) return { label: 'Vence hoy', ok: false }
  const formatted = date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
  return { label: `Vence el ${formatted}`, ok: true }
}

function getStatusBadge(pass: Pass): { label: string; ok: boolean } | null {
  if (pass.data.type === 'daypass') {
    const used = (pass.data as DaypassData).used
    return { label: used ? 'Usado' : 'Válido', ok: !used }
  }
  if (pass.data.type === 'membership') {
    const expiresAt = (pass.data as MembershipData).expiresAt
    if (!expiresAt) return { label: 'Activa', ok: true }
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000)
    if (days < 0) return { label: 'Vencida', ok: false }
    if (days === 0) return { label: 'Vence hoy', ok: false }
    return { label: `Vence en ${days}d`, ok: true }
  }
  if (pass.data.type === 'stamps')   return formatExpiresAt((pass.data as StampsData).expiresAt)
  if (pass.data.type === 'points')   return formatExpiresAt((pass.data as PointsData).expiresAt)
  if (pass.data.type === 'cashback') return formatExpiresAt((pass.data as CashbackData).expiresAt)
  if (pass.data.type === 'bundle')   return formatExpiresAt((pass.data as BundleData).expiresAt)
  if (pass.data.type === 'giftcard') return formatExpiresAt((pass.data as GiftcardData).expiresAt)
  return null
}

function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function getInitials(pass: Pass): string {
  return [pass.firstName, pass.lastName]
    .filter(Boolean).map(s => s[0].toUpperCase()).join('').slice(0, 2)
}

function getExpiryLabel(pass: Pass): string | null {
  const { data } = pass
  let expiresAt: string | null | undefined
  if (data.type === 'stamps')   expiresAt = (data as StampsData).expiresAt
  else if (data.type === 'points')   expiresAt = (data as PointsData).expiresAt
  else if (data.type === 'cashback') expiresAt = (data as CashbackData).expiresAt
  else return null
  if (!expiresAt) return 'Sin vencimiento'
  const date = new Date(expiresAt)
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000)
  if (days < 0) return 'Vencido'
  if (days === 0) return 'Vence hoy'
  return `Vence el ${date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

// Pre-compute once — no repeated calls in the template
const rows = computed(() => props.passes.map(pass => ({
  pass,
  progress:   getProgress(pass),
  badge:      getStatusBadge(pass),
  expiry:     getExpiryLabel(pass),
  date:       relativeDate(pass.createdAt),
  initials:   getInitials(pass),
  passUrl:    `/w/${pass.token}`,
})))
</script>

<template>
  <!-- ── Empty ─────────────────────────────────────────────────────────── -->
  <div v-if="!rows.length" class="empty-passes">
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary-light)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/>
    </svg>
    <p>No hay pases generados aún.</p>
  </div>

  <template v-else>

    <!-- ── Mobile cards (hidden on desktop) ─────────────────────────────── -->
    <div class="pass-cards">
      <div v-for="row in rows" :key="row.pass.id" class="pass-card">

        <!-- Top row: avatar + name + date -->
        <div class="pc-top">
          <div
            class="pc-avatar"
            :style="{ background: wallet.primaryColor + '1A', color: wallet.primaryColor }"
          >
            {{ row.initials }}
          </div>
          <div class="pc-identity">
            <span class="pc-name">{{ row.pass.firstName }} {{ row.pass.lastName }}</span>
            <span v-if="row.pass.phone" class="pc-phone">{{ row.pass.phone }}</span>
          </div>
          <span class="pc-date">{{ row.date }}</span>
        </div>

        <!-- Progress / badge -->
        <div v-if="row.progress" class="pc-progress">
          <div class="pc-progress-header">
            <span class="pc-progress-text">{{ row.progress.text }}</span>
            <span
              v-if="row.progress.value >= row.progress.max"
              class="pc-reward"
            >🎉 Recompensa lista</span>
          </div>
          <div class="pc-bar-track">
            <div
              class="pc-bar-fill"
              :style="{
                width: `${Math.min((row.progress.value / row.progress.max) * 100, 100)}%`,
                background: wallet.primaryColor,
              }"
            />
          </div>
          <span v-if="row.expiry" class="pc-expiry" :class="{ 'pc-expiry--warn': row.expiry === 'Vencido' || row.expiry === 'Vence hoy' }">
            {{ row.expiry }}
          </span>
        </div>

        <div v-else-if="row.badge" class="pc-badge-row">
          <span
            class="pc-badge"
            :class="row.badge.ok ? 'pc-badge--ok' : 'pc-badge--warn'"
          >{{ row.badge.label }}</span>
        </div>

        <!-- Action bar -->
        <div class="pc-actions">
          <button
            class="pc-action-btn"
            :class="{ 'pc-action-btn--copied': copiedToken === row.pass.token }"
            @click="copyLink(row.pass.token)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            {{ copiedToken === row.pass.token ? '¡Copiado!' : 'Copiar' }}
          </button>

          <a :href="row.passUrl" target="_blank" class="pc-action-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
            Ver
          </a>

          <button
            class="pc-action-btn"
            :disabled="sendingToken === row.pass.token"
            @click="sendSms(row.pass)"
          >
            <svg v-if="sendingToken !== row.pass.token" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.78 1.18 2 2 0 012.76 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="spin">
              <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9"/>
            </svg>
            {{ sendingToken === row.pass.token ? 'Enviando…' : 'SMS' }}
          </button>

          <button
            class="pc-action-btn pc-action-btn--wa"
            :disabled="sendingWaToken === row.pass.token"
            @click="sendWhatsApp(row.pass)"
          >
            <svg v-if="sendingWaToken !== row.pass.token" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
            </svg>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="spin">
              <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9"/>
            </svg>
            WA
          </button>

          <!-- Spacer -->
          <div style="flex: 1;" />

          <button
            class="pc-delete-btn"
            title="Eliminar pase"
            @click="passToDelete = row.pass"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Desktop table (hidden on mobile) ─────────────────────────────── -->
    <div class="pass-table-wrap">
      <table class="pass-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Progreso</th>
            <th>Creado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.pass.id" class="pass-row">

            <!-- Cliente -->
            <td class="td-user">
              <div
                class="tbl-avatar"
                :style="{ background: wallet.primaryColor + '1A', color: wallet.primaryColor }"
              >{{ row.initials }}</div>
              <div>
                <p class="tbl-name">{{ row.pass.firstName }} {{ row.pass.lastName }}</p>
                <p v-if="row.pass.phone" class="tbl-phone">{{ row.pass.phone }}</p>
              </div>
            </td>

            <!-- Progreso -->
            <td class="td-progress">
              <template v-if="row.progress">
                <p class="tbl-progress-text">{{ row.progress.text }}</p>
                <div class="tbl-bar-track">
                  <div
                    class="tbl-bar-fill"
                    :style="{
                      width: `${Math.min((row.progress.value / row.progress.max) * 100, 100)}%`,
                      background: wallet.primaryColor,
                    }"
                  />
                </div>
                <p v-if="row.progress.value >= row.progress.max" class="tbl-reward">🎉 Recompensa lista</p>
                <p v-else-if="row.expiry" class="tbl-expiry" :class="{ 'tbl-expiry--warn': row.expiry === 'Vencido' || row.expiry === 'Vence hoy' }">
                  {{ row.expiry }}
                </p>
              </template>
              <span
                v-else-if="row.badge"
                class="tbl-badge"
                :class="row.badge.ok ? 'tbl-badge--ok' : 'tbl-badge--warn'"
              >{{ row.badge.label }}</span>
            </td>

            <!-- Fecha -->
            <td class="td-date">{{ row.date }}</td>

            <!-- Acciones -->
            <td class="td-actions">
              <button
                class="tbl-icon-btn"
                :class="{ 'tbl-icon-btn--copied': copiedToken === row.pass.token }"
                :title="copiedToken === row.pass.token ? '¡Copiado!' : 'Copiar enlace'"
                @click="copyLink(row.pass.token)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
              </button>

              <a :href="row.passUrl" target="_blank" class="tbl-icon-btn" title="Ver pase">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                </svg>
              </a>

              <button
                class="tbl-icon-btn"
                :disabled="sendingToken === row.pass.token"
                title="Enviar por SMS"
                @click="sendSms(row.pass)"
              >
                <svg v-if="sendingToken !== row.pass.token" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.78 1.18 2 2 0 012.76 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="spin">
                  <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9"/>
                </svg>
              </button>

              <button
                class="tbl-icon-btn tbl-icon-btn--wa"
                :disabled="sendingWaToken === row.pass.token"
                title="Enviar por WhatsApp"
                @click="sendWhatsApp(row.pass)"
              >
                <svg v-if="sendingWaToken !== row.pass.token" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="spin">
                  <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9"/>
                </svg>
              </button>

              <button
                class="tbl-icon-btn tbl-icon-btn--danger"
                title="Eliminar pase"
                @click="passToDelete = row.pass"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </template>

  <!-- ── Delete confirmation modal ─────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="passToDelete"
        class="modal-backdrop"
        @click.self="passToDelete = null"
      >
        <div class="modal-card">
          <div class="modal-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </div>
          <div>
            <p class="modal-title">Eliminar pase</p>
            <p class="modal-body">
              ¿Eliminar el pase de
              <strong>{{ passToDelete.firstName }} {{ passToDelete.lastName }}</strong>?
              Esta acción no se puede deshacer.
            </p>
          </div>
          <div class="modal-actions">
            <button class="modal-btn-cancel" :disabled="deleting" @click="passToDelete = null">
              Cancelar
            </button>
            <button class="modal-btn-confirm" :disabled="deleting" @click="confirmDelete">
              <svg v-if="deleting" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="spin">
                <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9"/>
              </svg>
              {{ deleting ? 'Eliminando…' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Empty ── */
.empty-passes {
  padding: 52px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--text-nav-icon);
  font-size: 13px;
}

/* ── Mobile cards (default: visible) ── */
.pass-cards {
  display: flex;
  flex-direction: column;
}

.pass-card {
  padding: 16px;
  border-bottom: 1px solid var(--bg-subtle);
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-surface);
  transition: background 0.12s;
}
.pass-card:last-child { border-bottom: none; }
.pass-card:active { background: var(--bg-surface); }

/* Top row */
.pc-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pc-avatar {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.pc-identity {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pc-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pc-phone {
  font-size: 11.5px;
  color: var(--text-nav-icon);
}

.pc-date {
  font-size: 11px;
  color: var(--text-faint);
  flex-shrink: 0;
}

/* Progress */
.pc-progress { display: flex; flex-direction: column; gap: 5px; }

.pc-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pc-progress-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-medium);
}

.pc-reward {
  font-size: 11px;
  font-weight: 600;
  color: var(--success);
}

.pc-expiry {
  font-size: 10.5px;
  font-weight: 500;
  color: var(--text-faint);
}
.pc-expiry--warn {
  color: var(--danger);
  font-weight: 600;
}

.pc-bar-track {
  height: 5px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.pc-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}

/* Badge */
.pc-badge-row { display: flex; }

.pc-badge {
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
}
.pc-badge--ok   { background: var(--primary-light); color: var(--success); }
.pc-badge--warn { background: var(--danger-bg); color: var(--danger); }

/* Action bar */
.pc-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pc-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-page);
  color: var(--text-medium);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  text-decoration: none;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  -webkit-tap-highlight-color: transparent;
}
.pc-action-btn:hover { background: var(--bg-subtle); }
.pc-action-btn--copied { background: var(--primary-light); border-color: var(--primary-light); color: var(--success); }
.pc-action-btn--wa { color: var(--success); border-color: var(--success-bg); background: var(--success-bg); }
.pc-action-btn--wa:hover { background: color-mix(in srgb, var(--success) 18%, transparent); border-color: var(--success); }
.pc-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.pc-delete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--danger-bg);
  background: var(--danger-bg);
  color: var(--danger);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s;
  -webkit-tap-highlight-color: transparent;
}
.pc-delete-btn:hover { background: var(--danger-bg); }

/* ── Desktop table (hidden on mobile) ── */
.pass-table-wrap { display: none; overflow-x: auto; }

/* ── Responsive breakpoint ── */
@media (min-width: 768px) {
  .pass-cards      { display: none; }
  .pass-table-wrap { display: block; }
}

/* Table */
.pass-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.pass-table thead tr {
  font-size: 10.5px;
  color: var(--text-muted);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: var(--bg-page);
  border-bottom: 1px solid var(--border);
}

.pass-table thead th {
  text-align: left;
  padding: 10px 16px;
  white-space: nowrap;
}

.pass-row {
  border-bottom: 1px solid var(--bg-subtle);
  transition: background 0.1s;
}
.pass-row:hover { background: var(--bg-surface); }
.pass-row:last-child { border-bottom: none; }

/* Cells */
.td-user {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.tbl-avatar {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.tbl-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-ink);
  margin: 0;
}

.tbl-phone {
  font-size: 11px;
  color: var(--text-nav-icon);
  margin: 2px 0 0;
}

.td-progress { padding: 12px 16px; min-width: 160px; }

.tbl-progress-text {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-medium);
  margin: 0 0 5px;
}

.tbl-bar-track {
  height: 5px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.tbl-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.tbl-reward {
  font-size: 10.5px;
  color: var(--success);
  font-weight: 600;
  margin: 4px 0 0;
}

.tbl-expiry {
  font-size: 10.5px;
  color: var(--text-faint);
  font-weight: 500;
  margin: 4px 0 0;
}
.tbl-expiry--warn {
  color: var(--danger);
  font-weight: 600;
}

.tbl-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
}
.tbl-badge--ok   { background: var(--primary-light); color: var(--success); }
.tbl-badge--warn { background: var(--danger-bg); color: var(--danger); }

.td-date {
  padding: 12px 16px;
  color: var(--text-nav-icon);
  font-size: 12px;
  white-space: nowrap;
}

.td-actions { padding: 12px 16px; }

/* Icon action buttons */
.tbl-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
  margin-right: 4px;
}
.tbl-icon-btn:hover { background: var(--bg-page); color: var(--text-ink); }
.tbl-icon-btn--copied { background: var(--primary-light); border-color: var(--primary-light); color: var(--success); }
.tbl-icon-btn--wa { color: var(--success); border-color: var(--success-bg); background: var(--success-bg); }
.tbl-icon-btn--wa:hover { background: color-mix(in srgb, var(--success) 18%, transparent); border-color: var(--success); }
.tbl-icon-btn--danger:hover { background: var(--danger-bg); border-color: var(--danger-bg); color: var(--danger); }
.tbl-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Delete modal ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--overlay);
  backdrop-filter: blur(2px);
}

.modal-card {
  background: var(--bg-surface);
  border-radius: 18px;
  box-shadow: 0 20px 60px rgba(15, 27, 20, 0.18);
  width: 100%;
  max-width: 380px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--danger-bg);
  display: grid;
  place-items: center;
}

.modal-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0 0 6px;
}

.modal-body {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.55;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.modal-btn-cancel {
  padding: 9px 18px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-medium);
  cursor: pointer;
  font-family: inherit;
}

.modal-btn-confirm {
  padding: 9px 18px;
  border-radius: 9px;
  border: none;
  background: var(--danger);
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.15s;
}
.modal-btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }

/* ── Transitions ── */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from,  .modal-leave-to      { opacity: 0; }
.modal-enter-active .modal-card,
.modal-leave-active .modal-card          { transition: transform 0.2s ease; }
.modal-enter-from   .modal-card,
.modal-leave-to     .modal-card          { transform: scale(0.96); }

/* ── Spinner ── */
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
</style>
