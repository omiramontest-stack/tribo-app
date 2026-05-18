<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { useNotifications, type AppNotification } from '@/app/composables/useNotifications'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { useToast } from '@/app/composables/useToast'

const authStore = useAuthStore()
const toast = useToast()
const { notifications } = useNotifications()

const open = ref(false)
const panel = ref<HTMLElement | null>(null)
const resending = ref(false)
const resent = ref(false)

onClickOutside(panel, () => { open.value = false })

const TYPE_STYLES: Record<AppNotification['type'], { bg: string; color: string }> = {
  info:    { bg: 'var(--info-bg)', color: 'var(--info)' },
  warning: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  error:   { bg: 'var(--danger-bg)', color: 'var(--danger)' },
}

async function handleResend() {
  if (resending.value || resent.value) return
  resending.value = true
  try {
    await authStore.resendVerification()
    resent.value = true
    toast.show('Email de verificación enviado', 'success')
  } catch {
    toast.show('No se pudo enviar el email. Intenta de nuevo.', 'error')
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <div ref="panel" class="relative">

    <!-- Bell button -->
    <button
      class="grid place-items-center"
      style="width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-surface); cursor: pointer; position: relative;"
      @click="open = !open"
    >
      <svg
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
        :stroke="open ? 'var(--amber)' : 'var(--text-medium)'"
        style="transition: stroke 0.15s;"
      >
        <path d="M6 8a6 6 0 1112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/>
        <path d="M10 21a2 2 0 004 0"/>
      </svg>

      <!-- Pulse badge -->
      <Transition name="badge">
        <span v-if="notifications.length > 0" class="bell-badge">
          <span class="bell-badge__ping" />
        </span>
      </Transition>
    </button>

    <!-- Dropdown panel -->
    <Transition name="dropdown">
      <div v-if="open" class="notif-panel">

        <!-- Header -->
        <div class="notif-panel__header">
          <span class="notif-panel__title">Notificaciones</span>
          <span v-if="notifications.length > 0" class="notif-panel__count">
            {{ notifications.length }}
          </span>
        </div>

        <!-- Notification list -->
        <div v-if="notifications.length > 0">
          <div v-for="n in notifications" :key="n.id" class="notif-item">

            <!-- Icon -->
            <div
              class="notif-item__icon"
              :style="{ background: TYPE_STYLES[n.type].bg, color: TYPE_STYLES[n.type].color }"
            >
              <svg v-if="n.type === 'warning'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <svg v-else-if="n.type === 'info'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M12 2l10 18H2L12 2z"/>
                <path d="M12 9v4M12 17h.01"/>
              </svg>
            </div>

            <!-- Content -->
            <div class="notif-item__content">
              <p class="notif-item__title">{{ n.title }}</p>
              <p class="notif-item__body">{{ n.body }}</p>

              <div v-if="n.id === 'email-verification'" style="margin-top: 12px;">
                <button
                  :disabled="resending || resent"
                  class="notif-item__action"
                  :class="{ 'notif-item__action--sent': resent }"
                  :style="{ opacity: resending ? '0.6' : '1' }"
                  @click="handleResend"
                >
                  {{ resent ? 'Email enviado ✓' : resending ? 'Enviando…' : 'Reenviar email' }}
                </button>
              </div>
              <div v-else-if="n.action" style="margin-top: 12px;">
                <RouterLink
                  :to="n.action.to"
                  class="notif-item__action"
                  style="display: inline-block; text-decoration: none;"
                  @click="open = false"
                >
                  {{ n.action.label }}
                </RouterLink>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="notif-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 8a6 6 0 1112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/>
            <path d="M10 21a2 2 0 004 0"/>
          </svg>
          <p class="notif-empty__title">Todo al día</p>
          <p class="notif-empty__sub">No tienes notificaciones pendientes.</p>
        </div>

      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ── Bell badge ── */
.bell-badge {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 8px;
  height: 8px;
  display: grid;
  place-items: center;
}

.bell-badge::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: var(--amber);
  border: 1.5px solid var(--bg-surface);
}

.bell-badge__ping {
  position: absolute;
  inset: -3px;
  border-radius: 999px;
  background: var(--amber);
  opacity: 0.5;
  animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {
  0%   { transform: scale(0.8); opacity: 0.5; }
  70%  { transform: scale(2);   opacity: 0; }
  100% { transform: scale(2);   opacity: 0; }
}

/* ── Panel ── */
.notif-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: min(360px, calc(100vw - 24px));
  background: var(--bg-surface);
  border-radius: 16px;
  border: 1px solid var(--border);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  z-index: 200;
  overflow: hidden;
}

.notif-panel__header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--bg-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.notif-panel__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-ink);
  letter-spacing: -0.01em;
}

.notif-panel__count {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--amber);
  color: var(--bg-surface);
}

/* ── Notification item ── */
.notif-item {
  padding: 16px 20px;
  border-bottom: 1px solid var(--bg-page);
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.notif-item__icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.notif-item__content {
  flex: 1;
  min-width: 0;
}

.notif-item__title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-ink);
  margin-bottom: 4px;
  line-height: 1.3;
}

.notif-item__body {
  font-size: 12.5px;
  color: var(--text-muted);
  line-height: 1.55;
}

.notif-item__action {
  font-size: 12.5px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  background: var(--primary);
  color: var(--bg-surface);
  transition: opacity 0.15s, background 0.2s;
}

.notif-item__action--sent {
  background: var(--success-bg);
  color: var(--success);
  cursor: default;
}

/* ── Empty state ── */
.notif-empty {
  padding: 40px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.notif-empty__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-medium);
}

.notif-empty__sub {
  font-size: 12.5px;
  color: var(--text-faint);
}

/* ── Transitions ── */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.badge-enter-active,
.badge-leave-active {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
}
.badge-enter-from,
.badge-leave-to {
  transform: scale(0);
  opacity: 0;
}
</style>
