<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import { usePassStore } from '@/app/stores/pass/PassStore'
import { apiClient } from '@/infrastructure/http/ApiClient'
import type { Pass } from '@/domain/pass/entities/Pass'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { StampsData, PointsData, CashbackData, DaypassData } from '@/domain/pass/entities/PassData'
import type { StampsRules, PointsRules, CashbackRules } from '@/domain/wallet/entities/WalletRules'

const props = defineProps<{ passes: Pass[]; wallet: Wallet }>()
const router = useRouter()
const passStore = usePassStore()
const sendingToken = ref<string | null>(null)
const passToDelete = ref<Pass | null>(null)
const deleting = ref(false)

function handleDelete(pass: Pass) {
  passToDelete.value = pass
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

function copyLink(token: string) {
  const url = window.location.origin + router.resolve({ name: 'PassView', params: { token } }).href
  navigator.clipboard.writeText(url)
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

function getProgress(pass: Pass): { label: string; value: number; max: number; text: string } | null {
  if (pass.data.type === 'stamps') {
    const data = pass.data as StampsData
    const rules = props.wallet.rules as StampsRules
    return { label: 'sellos', value: data.currentStamps, max: rules.totalStamps, text: `${data.currentStamps}/${rules.totalStamps} sellos` }
  }
  if (pass.data.type === 'points') {
    const data = pass.data as PointsData
    const rules = props.wallet.rules as PointsRules
    return { label: rules.pointsLabel, value: data.currentPoints, max: rules.rewardThreshold, text: `${data.currentPoints}/${rules.rewardThreshold} ${rules.pointsLabel}` }
  }
  if (pass.data.type === 'cashback') {
    const data = pass.data as CashbackData
    const rules = props.wallet.rules as CashbackRules
    return { label: 'cashback', value: data.balance, max: data.balance, text: `${rules.currency} ${data.balance.toFixed(2)}` }
  }
  return null
}

function getDaypassBadge(pass: Pass): string | null {
  if (pass.data.type !== 'daypass') return null
  return (pass.data as DaypassData).used ? 'Usado' : 'Válido'
}

function getMembershipLabel(pass: Pass): string {
  if (pass.data.type !== 'membership') return ''
  const expiresAt = pass.data.expiresAt
  if (!expiresAt) return 'Sin vencimiento'
  const date = new Date(expiresAt)
  const now = new Date()
  const days = Math.ceil((date.getTime() - now.getTime()) / 86400000)
  if (days < 0) return 'Vencida'
  if (days === 0) return 'Vence hoy'
  return `Vence en ${days}d`
}
</script>

<template>
  <div v-if="passes.length" class="overflow-x-auto">
    <table class="w-full" style="font-size: 13px; border-collapse: collapse;">
      <thead>
        <tr style="font-size: 10.5px; color: #6B7A72; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; background: #F7F4EF; border-bottom: 1px solid #ECEFEB;">
          <th style="text-align: left; padding: 10px 20px;">Usuario</th>
          <th style="text-align: left; padding: 10px 12px; min-width: 160px;">Progreso</th>
          <th style="text-align: left; padding: 10px 12px;">Creado</th>
          <th style="text-align: left; padding: 10px 20px;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="pass in passes"
          :key="pass.id"
          style="border-bottom: 1px solid #ECEFEB; transition: background 0.1s;"
          @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background = '#F7F4EF'"
          @mouseleave="(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'"
        >
          <!-- Cliente -->
          <td style="padding: 12px 20px;">
            <p style="font-weight: 600; color: #0F1B14;">{{ pass.firstName }} {{ pass.lastName }}</p>
            <p v-if="pass.phone" style="font-size: 11px; color: #6B7A72; margin-top: 1px;">{{ pass.phone }}</p>
          </td>

          <!-- Progreso -->
          <td style="padding: 12px;">
            <template v-if="getProgress(pass) !== null">
              <p style="font-size: 11px; color: #3A4A41; margin-bottom: 4px; font-weight: 600;">
                {{ getProgress(pass)!.text }}
              </p>
              <div style="background: #ECEFEB; border-radius: 999px; height: 5px; overflow: hidden;">
                <div
                  style="height: 100%; border-radius: 999px; transition: width 0.3s;"
                  :style="{
                    width: `${Math.min((getProgress(pass)!.value / getProgress(pass)!.max) * 100, 100)}%`,
                    backgroundColor: wallet.primaryColor,
                  }"
                />
              </div>
              <p
                v-if="getProgress(pass)!.value >= getProgress(pass)!.max"
                style="font-size: 10px; color: #16A34A; font-weight: 600; margin-top: 3px;"
              >
                ¡Recompensa lista! 🎉
              </p>
            </template>

            <template v-else-if="pass.data.type === 'membership'">
              <span
                style="font-size: 11px; padding: 3px 8px; border-radius: 999px; font-weight: 600;"
                :style="getMembershipLabel(pass) === 'Vencida'
                  ? 'background: #FEE2E2; color: #DC2626;'
                  : 'background: #E6EFE9; color: #16A34A;'"
              >
                {{ getMembershipLabel(pass) }}
              </span>
            </template>

            <template v-else-if="pass.data.type === 'daypass'">
              <span
                style="font-size: 11px; padding: 3px 8px; border-radius: 999px; font-weight: 600;"
                :style="getDaypassBadge(pass) === 'Usado'
                  ? 'background: #FEE2E2; color: #DC2626;'
                  : 'background: #E6EFE9; color: #16A34A;'"
              >
                {{ getDaypassBadge(pass) }}
              </span>
            </template>
          </td>

          <!-- Fecha -->
          <td style="padding: 12px; color: #6B7A72; font-size: 12px; white-space: nowrap;">
            {{ new Date(pass.createdAt).toLocaleDateString('es-MX') }}
          </td>

          <!-- Acciones -->
          <td style="padding: 12px 20px;">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <button
                style="font-size: 11px; font-weight: 600; color: #2D6A4F; background: none; border: none; cursor: pointer; padding: 0;"
                @click="copyLink(pass.token)"
              >
                Copiar enlace
              </button>
              <a
                :href="`/w/${pass.token}`"
                target="_blank"
                style="font-size: 11px; font-weight: 600; color: #6B7A72; text-decoration: none;"
              >
                Ver →
              </a>
              <button
                :disabled="sendingToken === pass.token"
                style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; background: none; border: none; padding: 0;"
                :style="sendingToken === pass.token ? 'color: #A8B3AC; cursor: not-allowed;' : 'color: #6B7A72; cursor: pointer;'"
                @click="sendSms(pass)"
              >
                <svg v-if="sendingToken !== pass.token" viewBox="0 0 24 24" style="width: 13px; height: 13px; flex-shrink: 0;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.78 1.18 2 2 0 012.76 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" style="width: 13px; height: 13px; flex-shrink: 0; animation: spin 0.8s linear infinite;" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9" />
                </svg>
                {{ sendingToken === pass.token ? 'Enviando…' : 'Enviar' }}
              </button>
              <button
                style="font-size: 11px; font-weight: 600; color: #DC2626; background: none; border: none; cursor: pointer; padding: 0;"
                @click="handleDelete(pass)"
              >
                Eliminar
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-else style="padding: 48px 20px; text-align: center; color: #6B7A72; font-size: 13px;">
    No hay passes generados aún.
  </div>

  <!-- Delete confirmation modal -->
  <Teleport to="body">
  <div
    v-if="passToDelete"
    style="position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(15,27,20,0.45);"
    @click.self="passToDelete = null"
  >
    <div style="background: #fff; border-radius: 16px; box-shadow: 0 20px 60px rgba(15,27,20,0.18); width: 100%; max-width: 380px; padding: 28px 28px 24px; display: flex; flex-direction: column; gap: 16px;">
      <!-- Icon -->
      <div style="width: 44px; height: 44px; border-radius: 12px; background: #FEE2E2; display: flex; align-items: center; justify-content: center;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
      </div>
      <!-- Text -->
      <div>
        <p style="font-size: 15px; font-weight: 700; color: #0F1B14; margin: 0 0 6px;">Eliminar pass</p>
        <p style="font-size: 13px; color: #6B7A72; margin: 0; line-height: 1.5;">
          ¿Estás seguro de que quieres eliminar el pass de
          <strong style="color: #0F1B14;">{{ passToDelete.firstName }} {{ passToDelete.lastName }}</strong>?
          Esta acción no se puede deshacer.
        </p>
      </div>
      <!-- Actions -->
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button
          :disabled="deleting"
          style="padding: 8px 18px; border-radius: 9px; border: 1px solid #ECEFEB; background: #fff; font-size: 13px; font-weight: 600; color: #3A4A41; cursor: pointer; font-family: inherit;"
          @click="passToDelete = null"
        >Cancelar</button>
        <button
          :disabled="deleting"
          style="padding: 8px 18px; border-radius: 9px; border: none; background: #DC2626; font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px;"
          :style="deleting ? 'opacity: 0.6; cursor: not-allowed;' : ''"
          @click="confirmDelete"
        >
          <svg v-if="deleting" viewBox="0 0 24 24" style="width: 13px; height: 13px; animation: spin 0.8s linear infinite;" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9"/>
          </svg>
          {{ deleting ? 'Eliminando…' : 'Eliminar' }}
        </button>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg); } }
</style>
