<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { Pass } from '@/domain/pass/entities/Pass'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { StampsData, PointsData } from '@/domain/pass/entities/PassData'
import type { StampsRules, PointsRules } from '@/domain/wallet/entities/WalletRules'

const props = defineProps<{ passes: Pass[]; wallet: Wallet }>()
const router = useRouter()

function copyLink(token: string) {
  const url = window.location.origin + router.resolve({ name: 'PassView', params: { token } }).href
  navigator.clipboard.writeText(url)
}

function getProgress(pass: Pass): { label: string; value: number; max: number; text: string } | null {
  if (pass.data.type === 'stamps') {
    const data = pass.data as StampsData
    const rules = props.wallet.rules as StampsRules
    return {
      label: 'sellos',
      value: data.currentStamps,
      max: rules.totalStamps,
      text: `${data.currentStamps}/${rules.totalStamps} sellos`,
    }
  }
  if (pass.data.type === 'points') {
    const data = pass.data as PointsData
    const rules = props.wallet.rules as PointsRules
    return {
      label: rules.pointsLabel,
      value: data.currentPoints,
      max: rules.rewardThreshold,
      text: `${data.currentPoints}/${rules.rewardThreshold} ${rules.pointsLabel}`,
    }
  }
  if (pass.data.type === 'membership') {
    return null
  }
  return null
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
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-xs text-neutral-400 uppercase tracking-wide border-b border-neutral-100 dark:border-neutral-700">
          <th class="px-5 py-3 font-medium">Cliente</th>
          <th class="px-5 py-3 font-medium">Progreso</th>
          <th class="px-5 py-3 font-medium">Creado</th>
          <th class="px-5 py-3 font-medium">Acciones</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-neutral-100 dark:divide-neutral-700">
        <tr
          v-for="pass in passes"
          :key="pass.id"
          class="hover:bg-neutral-50 dark:hover:bg-neutral-700/30"
        >
          <td class="px-5 py-3 text-neutral-800 dark:text-white font-medium">
            {{ pass.customerName }}
          </td>

          <!-- Progreso -->
          <td class="px-5 py-3 min-w-[160px]">
            <!-- Stamps / Points: barra de progreso -->
            <template v-if="getProgress(pass) !== null">
              <p class="text-xs text-neutral-600 dark:text-neutral-300 mb-1 font-medium">
                {{ getProgress(pass)!.text }}
              </p>
              <div class="bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :style="{
                    width: `${Math.min((getProgress(pass)!.value / getProgress(pass)!.max) * 100, 100)}%`,
                    backgroundColor: wallet.primaryColor,
                  }"
                />
              </div>
              <p
                v-if="getProgress(pass)!.value >= getProgress(pass)!.max"
                class="text-xs text-green-500 font-medium mt-0.5"
              >
                ¡Recompensa lista! 🎉
              </p>
            </template>

            <!-- Membership: badge de vencimiento -->
            <template v-else>
              <span
                class="text-xs px-2 py-0.5 rounded-full font-medium"
                :class="
                  getMembershipLabel(pass) === 'Vencida'
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                "
              >
                {{ getMembershipLabel(pass) }}
              </span>
            </template>
          </td>

          <td class="px-5 py-3 text-neutral-400 text-xs">
            {{ new Date(pass.createdAt).toLocaleDateString('es-MX') }}
          </td>

          <td class="px-5 py-3">
            <div class="flex items-center gap-3">
              <button
                class="text-xs text-blue-500 hover:text-blue-700"
                @click="copyLink(pass.token)"
              >
                Copiar enlace
              </button>
              <a
                :href="`/w/${pass.token}`"
                target="_blank"
                class="text-xs text-neutral-400 hover:text-neutral-600"
              >
                Ver →
              </a>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-else class="px-5 py-8 text-center text-neutral-400 text-sm">
    No hay passes generados aún.
  </div>
</template>
