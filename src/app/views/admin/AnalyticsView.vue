<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { apiClient } from '@/infrastructure/http/ApiClient'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'

const orgStore = useOrganizationStore()

// ── Real API shape ──
interface Summary {
  activeWallets: number
  totalPasses: number
  totalScans: number
  totalRedemptions: number
}
interface ChartPoint { date: string; count: number }
interface ActivityEvent {
  type: string
  passFirstName: string
  passLastName: string
  walletName: string
  createdAt: string
}
interface TopWallet {
  walletId: string
  walletName: string
  walletType: string
  activeCount: number
  totalScans: number
  delta7d: number
}
interface AnalyticsResponse {
  summary: Summary
  chartByDay: ChartPoint[]
  recentActivity: ActivityEvent[]
  topWallets: TopWallet[]
}

const periods = [
  { key: '7d',  label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: '90d', label: '90 días' },
  { key: '1y',  label: '1 año' },
]
const period = ref('30d')
const loading = ref(false)
const data = ref<AnalyticsResponse | null>(null)

const kpis = computed(() => {
  const s = data.value?.summary
  if (!s) return []
  return [
    { label: 'Escaneos totales',   value: s.totalScans.toLocaleString(),      icon: 'scan',    color: '#1B4332' },
    { label: 'Pases activos',      value: s.totalPasses.toLocaleString(),      icon: 'pass',    color: '#E8920A' },
    { label: 'Wallets activas',    value: s.activeWallets.toLocaleString(),    icon: 'users',   color: '#2D6A4F' },
    { label: 'Canjes totales',     value: s.totalRedemptions.toLocaleString(), icon: 'revenue', color: '#6B7A72' },
  ]
})

const barPoints = computed(() => data.value?.chartByDay ?? [])
const barMax = computed(() => Math.max(...barPoints.value.map((p) => p.count), 1))

const activityTypeLabels: Record<string, string> = {
  stamp_added:    'Sello añadido',
  pass_created:   'Pase creado',
  redemption:     'Canje realizado',
  scan:           'Escaneo',
  pass_deleted:   'Pase eliminado',
}

const activityIcons: Record<string, string> = {
  stamp_added:  '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>',
  pass_created: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  redemption:   '<path d="M9 12l2 2 4-4"/><rect x="3" y="4" width="18" height="18" rx="2"/>',
  scan:         '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  default:      '<circle cx="12" cy="12" r="9"/>',
}

const typeIconPaths: Record<string, string> = {
  stamps:     'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  membership: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  points:     'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  cashback:   'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  daypass:    'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
}

const kpiIconPaths: Record<string, string> = {
  scan:    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v3M14 18v3M17 21h4"/>',
  pass:    '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5" fill="currentColor" stroke="none"/>',
  users:   '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h5M17 10h5"/>',
  revenue: '<path d="M9 12l2 2 4-4"/><rect x="3" y="4" width="18" height="18" rx="2"/>',
}

function activityDescription(evt: ActivityEvent): string {
  const label = activityTypeLabels[evt.type] ?? evt.type
  return `${label} — ${evt.passFirstName} ${evt.passLastName}`
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

function shortDate(iso: string) {
  return iso.slice(5) // MM-DD
}

async function load() {
  const orgId = orgStore.activeOrgId
  if (!orgId) return
  loading.value = true
  try {
    data.value = await apiClient.get<AnalyticsResponse>(
      `/organizations/${orgId}/analytics?period=${period.value}`
    )
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }
}

watch(period, load)
onMounted(load)
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 24px; max-width: 1200px;">

    <!-- Header row -->
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <!-- Period pills -->
      <div style="display: flex; gap: 6px; background: #fff; border: 1px solid #ECEFEB; border-radius: 10px; padding: 4px;">
        <button
          v-for="p in periods"
          :key="p.key"
          style="padding: 6px 14px; border-radius: 7px; font-size: 12.5px; font-weight: 600; border: none; cursor: pointer; transition: background 0.12s, color 0.12s; font-family: inherit;"
          :style="period === p.key
            ? { background: '#1B4332', color: '#fff' }
            : { background: 'transparent', color: '#6B7A72' }"
          @click="period = p.key"
        >
          {{ p.label }}
        </button>
      </div>

      <!-- Export button -->
      <button style="display: flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 9px; background: #fff; border: 1.5px solid #ECEFEB; font-size: 13px; font-weight: 600; color: #3A4A41; cursor: pointer; font-family: inherit;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Exportar
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="kpi-grid">
      <div v-for="i in 4" :key="i" style="height: 100px; background: #fff; border-radius: 12px; border: 1px solid #ECEFEB; animation: pulse 1.5s ease-in-out infinite;" />
    </div>

    <!-- KPI Cards -->
    <div v-else-if="data" class="kpi-grid">
      <div
        v-for="kpi in kpis"
        :key="kpi.label"
        style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 12px;"
      >
        <div
          style="width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center;"
          :style="{ background: kpi.color + '18' }"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" :stroke="kpi.color" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="kpiIconPaths[kpi.icon]" />
        </div>
        <div>
          <div style="font-size: 28px; font-weight: 800; color: #0F1B14; letter-spacing: -0.03em; line-height: 1;">{{ kpi.value }}</div>
          <div style="font-size: 12px; color: #6B7A72; margin-top: 4px; font-weight: 500;">{{ kpi.label }}</div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!loading" style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 48px; text-align: center; color: #6B7A72;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D8DDD7" stroke-width="1.5" stroke-linecap="round" style="margin: 0 auto 12px;">
        <path d="M3 21V5M3 21h18"/><path d="M7 17v-5M11 17V9M15 17v-3M19 17V7"/>
      </svg>
      <p style="font-size: 14px; font-weight: 600; margin: 0 0 4px;">Sin datos para este período</p>
      <p style="font-size: 12px; margin: 0;">Prueba con un rango diferente</p>
    </div>

    <!-- Charts + Activity -->
    <div v-if="data" class="charts-row">

      <!-- Bar chart -->
      <div style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 20px; flex: 1; min-width: 0;">
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: 700; color: #0F1B14; margin: 0;">Escaneos por día</h3>
          <p style="font-size: 12px; color: #6B7A72; margin: 2px 0 0;">Actividad en el período seleccionado</p>
        </div>
        <div style="display: flex; align-items: flex-end; gap: 3px; height: 160px; padding-bottom: 28px; position: relative;">
          <template v-if="barPoints.length">
            <div
              v-for="point in barPoints"
              :key="point.date"
              style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; position: relative; cursor: default;"
              :title="point.date + ': ' + point.count"
            >
              <div
                style="width: 100%; border-radius: 4px 4px 0 0; min-height: 3px; transition: height 0.3s;"
                :style="{
                  height: point.count > 0 ? `${Math.round((point.count / barMax) * 132)}px` : '3px',
                  background: point.count > 0 ? '#1B4332' : '#ECEFEB',
                }"
              />
              <span
                v-if="barPoints.length <= 14"
                style="font-size: 9px; color: #A8B3AC; position: absolute; bottom: -22px; white-space: nowrap;"
              >
                {{ shortDate(point.date) }}
              </span>
            </div>
          </template>
          <div v-else style="flex: 1; display: flex; align-items: center; justify-content: center; color: #D8DDD7; font-size: 13px;">Sin datos</div>
        </div>
      </div>

      <!-- Activity feed -->
      <div style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 20px; width: 300px; flex-shrink: 0;">
        <h3 style="font-size: 14px; font-weight: 700; color: #0F1B14; margin: 0 0 16px;">Actividad reciente</h3>
        <div style="display: flex; flex-direction: column; overflow-y: auto; max-height: 260px;">
          <template v-if="data.recentActivity?.length">
            <div
              v-for="(evt, i) in data.recentActivity"
              :key="i"
              style="display: flex; gap: 10px; align-items: flex-start; padding: 10px 0;"
              :style="i > 0 ? { borderTop: '1px solid #F3F5F2' } : {}"
            >
              <div style="width: 30px; height: 30px; border-radius: 8px; background: #F7F4EF; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1B4332" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="activityIcons[evt.type] ?? activityIcons.default" />
              </div>
              <div style="flex: 1; min-width: 0;">
                <p style="font-size: 12.5px; color: #0F1B14; margin: 0; font-weight: 500; line-height: 1.4;">
                  {{ activityDescription(evt) }}
                </p>
                <p style="font-size: 11px; color: #A8B3AC; margin: 2px 0 0;">{{ evt.walletName }}</p>
              </div>
              <span style="font-size: 10.5px; color: #A8B3AC; white-space: nowrap; flex-shrink: 0; margin-top: 2px;">
                {{ relativeTime(evt.createdAt) }}
              </span>
            </div>
          </template>
          <p v-else style="font-size: 13px; color: #A8B3AC; text-align: center; padding: 24px 0; margin: 0;">Sin actividad reciente</p>
        </div>
      </div>
    </div>

    <!-- Top wallets -->
    <div v-if="data?.topWallets?.length" style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; overflow: hidden;">
      <div style="padding: 18px 20px 14px; border-bottom: 1px solid #F3F5F2;">
        <h3 style="font-size: 14px; font-weight: 700; color: #0F1B14; margin: 0;">Top wallets</h3>
        <p style="font-size: 12px; color: #6B7A72; margin: 2px 0 0;">Las más activas en el período</p>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #FAFAF9;">
            <th style="text-align: left; font-size: 10.5px; font-weight: 700; color: #A8B3AC; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 20px;">#</th>
            <th style="text-align: left; font-size: 10.5px; font-weight: 700; color: #A8B3AC; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 8px;">Wallet</th>
            <th style="text-align: left; font-size: 10.5px; font-weight: 700; color: #A8B3AC; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 8px;">Tipo</th>
            <th style="text-align: right; font-size: 10.5px; font-weight: 700; color: #A8B3AC; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 8px;">Escaneos</th>
            <th style="text-align: right; font-size: 10.5px; font-weight: 700; color: #A8B3AC; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 8px;">Pases activos</th>
            <th style="text-align: right; font-size: 10.5px; font-weight: 700; color: #A8B3AC; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 20px;">Δ 7d</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(w, i) in data.topWallets"
            :key="w.walletId"
            style="border-top: 1px solid #F3F5F2; transition: background 0.1s;"
            @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background='#FAFAF9'"
            @mouseleave="(e) => (e.currentTarget as HTMLElement).style.background=''"
          >
            <td style="padding: 13px 20px; font-size: 12.5px; font-weight: 700; color: #A8B3AC;">{{ i + 1 }}</td>
            <td style="padding: 13px 8px; font-size: 13px; font-weight: 600; color: #0F1B14;">{{ w.walletName }}</td>
            <td style="padding: 13px 8px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 24px; height: 24px; border-radius: 6px; background: #F7F4EF; display: flex; align-items: center; justify-content: center;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1B4332" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path :d="typeIconPaths[w.walletType] ?? typeIconPaths.stamps" />
                  </svg>
                </div>
                <span style="font-size: 12px; color: #6B7A72; text-transform: capitalize;">{{ w.walletType }}</span>
              </div>
            </td>
            <td style="padding: 13px 8px; text-align: right; font-size: 13px; font-weight: 700; color: #0F1B14;">{{ w.totalScans.toLocaleString() }}</td>
            <td style="padding: 13px 8px; text-align: right; font-size: 13px; color: #6B7A72;">{{ w.activeCount.toLocaleString() }}</td>
            <td style="padding: 13px 20px; text-align: right;">
              <span
                style="display: inline-flex; align-items: center; gap: 3px; font-size: 11.5px; font-weight: 700; padding: 3px 8px; border-radius: 999px;"
                :style="w.delta7d >= 0
                  ? { background: '#D1FAE5', color: '#065F46' }
                  : { background: '#FEE2E2', color: '#991B1B' }"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                  <path :d="w.delta7d >= 0 ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'" />
                </svg>
                {{ Math.abs(w.delta7d) }}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.charts-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@media (max-width: 1024px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .charts-row { flex-direction: column; }
  .charts-row > div:last-child { width: 100% !important; }
}
@media (max-width: 600px) {
  .kpi-grid { grid-template-columns: 1fr 1fr; }
}
</style>
