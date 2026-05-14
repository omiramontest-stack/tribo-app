<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { apiClient } from '@/infrastructure/http/ApiClient'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'

const orgStore = useOrganizationStore()

interface Summary {
  activeWallets: number
  totalPasses: number
  totalScans: number
  totalRedemptions: number
  retentionRate: number
  newPassesInPeriod: number
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
interface EventBreakdown { type: string; count: number; percent: number }
interface AnalyticsResponse {
  summary: Summary
  chartByDay: ChartPoint[]
  recentActivity: ActivityEvent[]
  topWallets: TopWallet[]
  eventBreakdown: EventBreakdown[]
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
  const retentionColor = s.retentionRate >= 40 ? 'var(--primary)' : s.retentionRate >= 20 ? 'var(--amber)' : 'var(--danger)'
  return [
    { label: 'Escaneos totales',  value: s.totalScans.toLocaleString(),       icon: 'scan',      color: 'var(--primary)' },
    { label: 'Pases activos',     value: s.totalPasses.toLocaleString(),       icon: 'pass',      color: 'var(--amber)' },
    { label: 'Wallets activas',   value: s.activeWallets.toLocaleString(),     icon: 'users',     color: 'var(--primary-mid)' },
    { label: 'Canjes totales',    value: s.totalRedemptions.toLocaleString(),  icon: 'revenue',   color: 'var(--text-muted)' },
    {
      label: 'Retención',
      value: `${s.retentionRate}%`,
      icon: 'retention',
      color: retentionColor,
      valueColor: retentionColor,
      tooltip: 'Porcentaje de pases activos que tuvieron actividad en el periodo',
    },
    { label: 'Nuevos pases',      value: s.newPassesInPeriod.toLocaleString(), icon: 'new',      color: '#0EA5E9' },
  ]
})

const barPoints      = computed(() => data.value?.chartByDay ?? [])
const barMax         = computed(() => Math.max(...barPoints.value.map(p => p.count), 1))
const totalBarScans  = computed(() => barPoints.value.reduce((s, p) => s + p.count, 0))
const hoveredBar     = ref<{ date: string; count: number } | null>(null)


const activityTypeLabels: Record<string, string> = {
  stamp_added:  'Sello añadido',
  pass_created: 'Pase creado',
  redemption:   'Canje realizado',
  scan:         'Escaneo',
  pass_deleted: 'Pase eliminado',
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
  scan:      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v3M14 18v3M17 21h4"/>',
  pass:      '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5" fill="currentColor" stroke="none"/>',
  users:     '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h5M17 10h5"/>',
  revenue:   '<path d="M9 12l2 2 4-4"/><rect x="3" y="4" width="18" height="18" rx="2"/>',
  retention: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>',
  new:       '<path d="M12 5v14M5 12h14"/>',
}

const eventLabels: Record<string, string> = {
  pass_created:       'Pases creados',
  pass_deleted:       'Pases eliminados',
  link_sent:          'Links enviados',
  stamp_added:        'Sellos agregados',
  stamp_redeemed:     'Sellos canjeados',
  points_added:       'Puntos agregados',
  points_redeemed:    'Puntos canjeados',
  cashback_added:     'Cashback agregado',
  cashback_redeemed:  'Cashback canjeado',
  membership_renewed: 'Membresías renovadas',
  daypass_scanned:    'Daypasses escaneados',
}

const donutColors = ['#1B3A2D', '#2D6A4F', '#52B788', '#F5A623', '#8B5CF6', '#0EA5E9', '#DC2626', '#F59E0B', '#A78BFA', '#06B6D4', '#6B7A72']

const donutSegments = computed(() => {
  const breakdown = data.value?.eventBreakdown ?? []
  let cum = 0
  return breakdown.map((item, i) => {
    const seg = {
      key: item.type,
      color: donutColors[i % donutColors.length],
      dasharray: `${item.percent} ${100 - item.percent}`,
      dashoffset: 25 - cum,
      label: eventLabels[item.type] ?? item.type,
      count: item.count,
      percent: item.percent,
    }
    cum += item.percent
    return seg
  })
})

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

const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
function shortDate(iso: string) {
  const p = iso.split('-')
  return `${parseInt(p[2])} ${MONTHS[parseInt(p[1]) - 1]}`
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
  <div style="display: flex; flex-direction: column; gap: 24px;">

    <!-- Header row -->
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <div style="display: flex; gap: 6px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; padding: 4px;">
        <button
          v-for="p in periods"
          :key="p.key"
          style="padding: 6px 14px; border-radius: 7px; font-size: 12.5px; font-weight: 600; border: none; cursor: pointer; transition: background 0.12s, color 0.12s; font-family: inherit;"
          :style="period === p.key ? { background: 'var(--primary)', color: 'var(--bg-surface)' } : { background: 'transparent', color: 'var(--text-muted)' }"
          @click="period = p.key"
        >{{ p.label }}</button>
      </div>
      <button style="display: flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 9px; background: var(--bg-surface); border: 1.5px solid var(--border); font-size: 13px; font-weight: 600; color: var(--text-medium); cursor: pointer; font-family: inherit;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Exportar
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="kpi-grid">
      <div v-for="i in 6" :key="i" style="height: 100px; background: var(--bg-surface); border-radius: 12px; border: 1px solid var(--border); animation: pulse 1.5s ease-in-out infinite;" />
    </div>

    <!-- KPI Cards -->
    <div v-else-if="data" class="kpi-grid">
      <div
        v-for="kpi in kpis"
        :key="kpi.label"
        style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 12px; cursor: default;"
        :title="kpi.tooltip ?? ''"
      >
        <div style="width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center;" :style="{ background: kpi.color + '18' }">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" :stroke="kpi.color" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="kpiIconPaths[kpi.icon]" />
        </div>
        <div>
          <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.03em; line-height: 1;" :style="{ color: kpi.valueColor ?? 'var(--text-ink)' }">{{ kpi.value }}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px; font-weight: 500;">{{ kpi.label }}</div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!loading" style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 48px; text-align: center; color: var(--text-muted);">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" stroke-linecap="round" style="margin: 0 auto 12px;">
        <path d="M3 21V5M3 21h18"/><path d="M7 17v-5M11 17V9M15 17v-3M19 17V7"/>
      </svg>
      <p style="font-size: 14px; font-weight: 600; margin: 0 0 4px; color: var(--text-ink);">Sin datos para este período</p>
      <p style="font-size: 12px; margin: 0;">Prueba con un rango diferente</p>
    </div>

    <!-- Charts + Activity -->
    <div v-if="data" class="charts-row">

      <!-- Bar chart -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px; flex: 1; min-width: 0;">

        <!-- Header -->
        <div style="margin-bottom: 16px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;">
          <div>
            <h3 style="font-size: 14px; font-weight: 700; color: var(--text-ink); margin: 0;">Escaneos por día</h3>
            <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0;">Actividad en el período seleccionado</p>
          </div>
          <div style="text-align: right; flex-shrink: 0; min-width: 72px;">
            <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; color: var(--primary-text);">
              {{ hoveredBar ? hoveredBar.count : totalBarScans.toLocaleString() }}
            </div>
            <div style="font-size: 10.5px; color: var(--text-faint); margin-top: 3px;">
              {{ hoveredBar ? shortDate(hoveredBar.date) : 'total período' }}
            </div>
          </div>
        </div>

        <div v-if="barPoints.length" style="display: flex; gap: 0; align-items: stretch;">
          <!-- Eje Y -->
          <div style="width: 34px; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; padding-bottom: 20px; padding-right: 8px; flex-shrink: 0;">
            <span style="font-size: 9px; color: var(--text-faint); line-height: 1;">{{ barMax }}</span>
            <span style="font-size: 9px; color: var(--text-faint); line-height: 1;">{{ Math.round(barMax / 2) }}</span>
            <span style="font-size: 9px; color: var(--text-faint); line-height: 1;">0</span>
          </div>

          <div style="flex: 1; min-width: 0;">
            <!-- Área de barras con grid -->
            <div style="position: relative; height: 128px; border-bottom: 1px solid var(--border); border-left: 1px solid var(--border-subtle);">
              <div style="position: absolute; top: 0;   left: 0; right: 0; border-top: 1px dashed var(--border-subtle);" />
              <div style="position: absolute; top: 50%; left: 0; right: 0; border-top: 1px dashed var(--border-subtle);" />
              <!-- Barras -->
              <div style="position: absolute; inset: 0; display: flex; align-items: flex-end; gap: 2px; padding: 0 1px;">
                <div
                  v-for="point in barPoints"
                  :key="point.date"
                  style="flex: 1; height: 100%; display: flex; align-items: flex-end; cursor: default;"
                  @mouseenter="hoveredBar = point"
                  @mouseleave="hoveredBar = null"
                >
                  <div
                    style="width: 100%; border-radius: 3px 3px 0 0; min-height: 2px; transition: background 0.12s, height 0.2s;"
                    :style="{
                      height: point.count > 0 ? `${Math.round((point.count / barMax) * 124)}px` : '2px',
                      background: hoveredBar?.date === point.date
                        ? '#52B788'
                        : point.count > 0 ? 'var(--primary-text)' : 'var(--border)',
                    }"
                  />
                </div>
              </div>
            </div>

            <!-- Eje X -->
            <div style="position: relative; height: 20px; margin-top: 5px;">
              <template v-for="(point, i) in barPoints" :key="i">
                <span
                  v-if="i === 0 || i === barPoints.length - 1 || i % 7 === 0"
                  style="position: absolute; top: 0; font-size: 9.5px; white-space: nowrap; transition: color 0.1s;"
                  :style="[
                    i === 0                    ? { left: '0' } :
                    i === barPoints.length - 1 ? { right: '0' } :
                    { left: `${(i / (barPoints.length - 1)) * 100}%`, transform: 'translateX(-50%)' },
                    { color: hoveredBar?.date === point.date ? 'var(--primary-text)' : 'var(--text-faint)',
                      fontWeight: hoveredBar?.date === point.date ? '700' : '400' },
                  ]"
                >{{ shortDate(point.date) }}</span>
              </template>
            </div>
          </div>
        </div>

        <div v-else style="height: 148px; display: flex; align-items: center; justify-content: center; color: var(--text-faint); font-size: 13px;">Sin datos</div>
      </div>

      <!-- Activity feed -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px; width: 300px; flex-shrink: 0;">
        <h3 style="font-size: 14px; font-weight: 700; color: var(--text-ink); margin: 0 0 16px;">Actividad reciente</h3>
        <div style="display: flex; flex-direction: column; overflow-y: auto; max-height: 260px;">
          <template v-if="data.recentActivity?.length">
            <div
              v-for="(evt, i) in data.recentActivity"
              :key="i"
              style="display: flex; gap: 10px; align-items: flex-start; padding: 10px 0;"
              :style="i > 0 ? { borderTop: '1px solid var(--border-subtle)' } : {}"
            >
              <div style="width: 30px; height: 30px; border-radius: 8px; background: var(--bg-field); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--primary-text);">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="activityIcons[evt.type] ?? activityIcons.default" />
              </div>
              <div style="flex: 1; min-width: 0;">
                <p style="font-size: 12.5px; color: var(--text-ink); margin: 0; font-weight: 500; line-height: 1.4;">{{ activityDescription(evt) }}</p>
                <p style="font-size: 11px; color: var(--text-faint); margin: 2px 0 0;">{{ evt.walletName }}</p>
              </div>
              <span style="font-size: 10.5px; color: var(--text-faint); white-space: nowrap; flex-shrink: 0; margin-top: 2px;">{{ relativeTime(evt.createdAt) }}</span>
            </div>
          </template>
          <p v-else style="font-size: 13px; color: var(--text-faint); text-align: center; padding: 24px 0; margin: 0;">Sin actividad reciente</p>
        </div>
      </div>
    </div>

    <!-- Event Breakdown Donut — full width -->
    <div v-if="data" style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 24px;">
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 14px; font-weight: 700; color: var(--text-ink); margin: 0;">Actividad por tipo de evento</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0;">Distribución de eventos en el período seleccionado</p>
      </div>

      <div v-if="donutSegments.length" class="donut-layout">
        <!-- Donut -->
        <div class="donut-svg-wrap">
          <svg width="200" height="200" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9155" fill="none" style="stroke: var(--border-subtle);" stroke-width="3" />
            <circle
              v-for="seg in donutSegments"
              :key="seg.key"
              cx="18" cy="18" r="15.9155"
              fill="none"
              :stroke="seg.color"
              stroke-width="3"
              :stroke-dasharray="seg.dasharray"
              :stroke-dashoffset="seg.dashoffset"
              stroke-linecap="butt"
            />
          </svg>
        </div>

        <!-- Legend -->
        <div class="donut-legend">
          <div
            v-for="seg in donutSegments"
            :key="seg.key"
            style="display: flex; align-items: center; gap: 8px; min-width: 0;"
          >
            <div style="width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0;" :style="{ background: seg.color }" />
            <span style="flex: 1; font-size: 12px; color: var(--text-medium); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ seg.label }}</span>
            <span style="font-size: 12px; font-weight: 700; color: var(--text-ink); margin-left: 6px; flex-shrink: 0;">{{ seg.count.toLocaleString() }}</span>
            <span style="font-size: 11px; color: var(--text-muted); min-width: 36px; text-align: right; flex-shrink: 0;">{{ seg.percent }}%</span>
          </div>
        </div>
      </div>

      <p v-else style="font-size: 13px; color: var(--text-faint); text-align: center; padding: 32px 0; margin: 0;">Sin actividad en este periodo</p>
    </div>

    <!-- Top wallets -->
    <div v-if="data?.topWallets?.length" style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden;">
      <div style="padding: 18px 20px 14px; border-bottom: 1px solid var(--border-subtle);">
        <h3 style="font-size: 14px; font-weight: 700; color: var(--text-ink); margin: 0;">Top wallets</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0;">Las más activas en el período</p>
      </div>
      <!-- Mobile cards -->
      <div class="top-wallets-cards">
        <div
          v-for="(w, i) in data.topWallets"
          :key="w.walletId"
          style="padding: 14px 20px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: flex-start; gap: 10px;"
        >
          <span style="font-size: 12px; font-weight: 700; color: var(--text-faint); min-width: 18px; margin-top: 2px;">{{ i + 1 }}</span>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="font-size: 13px; font-weight: 600; color: var(--text-ink); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ w.walletName }}</span>
              <span
                style="display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 999px; flex-shrink: 0;"
                :style="w.delta7d >= 0 ? { background: 'var(--success-bg)', color: 'var(--success)' } : { background: 'var(--danger-bg)', color: 'var(--danger)' }"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                  <path :d="w.delta7d >= 0 ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'" />
                </svg>
                {{ Math.abs(w.delta7d) }}%
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 5px;">
                <div style="width: 20px; height: 20px; border-radius: 5px; background: var(--bg-field); display: flex; align-items: center; justify-content: center; color: var(--primary-text);">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                    <path :d="typeIconPaths[w.walletType] ?? typeIconPaths.stamps" />
                  </svg>
                </div>
                <span style="font-size: 11.5px; color: var(--text-muted); text-transform: capitalize;">{{ w.walletType }}</span>
              </div>
              <span style="font-size: 11.5px; font-weight: 600; color: var(--text-medium);">{{ w.totalScans.toLocaleString() }} escaneos</span>
              <span style="font-size: 11.5px; color: var(--text-muted);">{{ w.activeCount.toLocaleString() }} activos</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop table -->
      <table class="top-wallets-table">
        <thead>
          <tr style="background: var(--bg-subtle);">
            <th style="text-align: left; font-size: 10.5px; font-weight: 700; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 20px;">#</th>
            <th style="text-align: left; font-size: 10.5px; font-weight: 700; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 8px;">Wallet</th>
            <th style="text-align: left; font-size: 10.5px; font-weight: 700; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 8px;">Tipo</th>
            <th style="text-align: right; font-size: 10.5px; font-weight: 700; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 8px;">Escaneos</th>
            <th style="text-align: right; font-size: 10.5px; font-weight: 700; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 8px;">Pases activos</th>
            <th style="text-align: right; font-size: 10.5px; font-weight: 700; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 20px;">Δ 7d</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(w, i) in data.topWallets"
            :key="w.walletId"
            style="border-top: 1px solid var(--border-subtle); transition: background 0.1s;"
            @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background='var(--bg-subtle)'"
            @mouseleave="(e) => (e.currentTarget as HTMLElement).style.background=''"
          >
            <td style="padding: 13px 20px; font-size: 12.5px; font-weight: 700; color: var(--text-faint);">{{ i + 1 }}</td>
            <td style="padding: 13px 8px; font-size: 13px; font-weight: 600; color: var(--text-ink);">{{ w.walletName }}</td>
            <td style="padding: 13px 8px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 24px; height: 24px; border-radius: 6px; background: var(--bg-field); display: flex; align-items: center; justify-content: center; color: var(--primary-text);">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path :d="typeIconPaths[w.walletType] ?? typeIconPaths.stamps" />
                  </svg>
                </div>
                <span style="font-size: 12px; color: var(--text-muted); text-transform: capitalize;">{{ w.walletType }}</span>
              </div>
            </td>
            <td style="padding: 13px 8px; text-align: right; font-size: 13px; font-weight: 700; color: var(--text-ink);">{{ w.totalScans.toLocaleString() }}</td>
            <td style="padding: 13px 8px; text-align: right; font-size: 13px; color: var(--text-muted);">{{ w.activeCount.toLocaleString() }}</td>
            <td style="padding: 13px 20px; text-align: right;">
              <span
                style="display: inline-flex; align-items: center; gap: 3px; font-size: 11.5px; font-weight: 700; padding: 3px 8px; border-radius: 999px;"
                :style="w.delta7d >= 0 ? { background: 'var(--success-bg)', color: 'var(--success)' } : { background: 'var(--danger-bg)', color: 'var(--danger)' }"
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
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
}
.charts-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

/* Donut */
.donut-layout {
  display: flex;
  gap: 40px;
  align-items: center;
  width: 100%;
}
.donut-svg-wrap { flex-shrink: 0; }
.donut-legend {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 40px;
  align-content: center;
}

/* Top wallets */
.top-wallets-table { width: 100%; border-collapse: collapse; }
.top-wallets-cards { display: none; flex-direction: column; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 1024px) {
  .charts-row { flex-direction: column; }
  .charts-row > div:last-child { width: 100% !important; }
}
@media (max-width: 640px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .donut-layout { flex-direction: column; align-items: center; gap: 20px; }
  .donut-legend { grid-template-columns: 1fr; gap: 8px; }
  .top-wallets-table { display: none; }
  .top-wallets-cards { display: flex; }
}
</style>
