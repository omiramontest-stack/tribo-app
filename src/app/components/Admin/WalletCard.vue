<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { Wallet } from '@/domain/wallet/entities/Wallet'

const props = defineProps<{ wallet: Wallet }>()
const router = useRouter()

const typeConfig: Record<string, { label: string; accent: string; bg: string; iconPath: string }> = {
  stamps:     { label: 'Sellos',    accent: '#7C5E3C', bg: '#F1E6D4', iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  membership: { label: 'Membresía', accent: '#1B4332', bg: '#D9E5DD', iconPath: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
  points:     { label: 'Puntos',    accent: '#8B5CF6', bg: '#EBE3FB', iconPath: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  cashback:   { label: 'Cashback',  accent: '#E8920A', bg: '#FCEBC4', iconPath: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  daypass:    { label: 'Day Pass',  accent: '#0EA5E9', bg: '#D6EEFB', iconPath: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' },
}

const wt = (type: string) => typeConfig[type] ?? { label: type, accent: '#6B7A72', bg: '#F7F4EF', iconPath: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' }
</script>

<template>
  <div
    style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; overflow: hidden; cursor: pointer; transition: box-shadow 0.15s;"
    @mouseenter="(e) => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(15,27,20,0.08)'"
    @mouseleave="(e) => (e.currentTarget as HTMLElement).style.boxShadow = 'none'"
    @click="router.push({ name: 'WalletDetail', params: { id: wallet.id } })"
  >
    <!-- Color strip -->
    <div style="height: 3px;" :style="{ background: wallet.primaryColor || wt(wallet.type).accent }" />

    <div style="padding: 18px; padding-bottom: 14px;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <div style="min-width: 0; flex: 1;">
          <div style="font-size: 13.5px; font-weight: 700; color: #0F1B14; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            {{ wallet.businessName }}
          </div>
          <div v-if="wallet.description" style="font-size: 11.5px; color: #6B7A72; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            {{ wallet.description }}
          </div>
        </div>
        <div
          class="grid place-items-center shrink-0"
          style="width: 28px; height: 28px; border-radius: 8px; margin-left: 10px;"
          :style="{ background: wt(wallet.type).bg }"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" :stroke="wt(wallet.type).accent">
            <path :d="wt(wallet.type).iconPath" />
          </svg>
        </div>
      </div>

      <!-- Stats row -->
      <div style="display: flex; gap: 14px; padding: 10px 0; border-top: 1px solid #ECEFEB; border-bottom: 1px solid #ECEFEB; margin-bottom: 12px;">
        <div style="flex: 1;">
          <div style="font-size: 10px; color: #6B7A72; font-weight: 600; margin-bottom: 2px; letter-spacing: 0.04em;">TIPO</div>
          <div style="font-size: 12px; font-weight: 600; color: #0F1B14;">{{ wt(wallet.type).label }}</div>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 10px; color: #6B7A72; font-weight: 600; margin-bottom: 2px; letter-spacing: 0.04em;">CREADO</div>
          <div style="font-size: 12px; font-weight: 600; color: #0F1B14; font-variant-numeric: tabular-nums;">
            {{ new Date(wallet.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) }}
          </div>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 10px; color: #6B7A72; font-weight: 600; margin-bottom: 2px; letter-spacing: 0.04em;">COLOR</div>
          <div style="display: flex; align-items: center; gap: 5px;">
            <div style="width: 12px; height: 12px; border-radius: 3px;" :style="{ background: wallet.primaryColor }" />
            <div style="width: 12px; height: 12px; border-radius: 3px; opacity: 0.7;" :style="{ background: wallet.accentColor }" />
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span
          style="display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px;"
          :style="{ color: wt(wallet.type).accent, background: wt(wallet.type).bg }"
        >
          {{ wt(wallet.type).label }}
        </span>
        <span style="font-size: 12px; font-weight: 600; color: #2D6A4F;">Detalles →</span>
      </div>
    </div>
  </div>
</template>
