<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { apiClient } from '@/infrastructure/http/ApiClient'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'

// ── Types ──────────────────────────────────────────────────────────────────
interface Summary {
  activeWallets: number
  totalPasses: number
  totalScans: number
  totalRedemptions: number
  retentionRate: number
  newPassesInPeriod: number
  deltaScans?: number
  deltaPasses?: number
  deltaNewPasses?: number
  deltaRedemptions?: number
  deltaRetention?: number
}
interface ChartPoint     { date: string; count: number }
interface ActivityEvent  { type: string; passFirstName: string; passLastName: string; walletName: string; createdAt: string }
interface TopWallet      { walletId: string; walletName: string; walletType: string; activeCount: number; totalScans: number; delta7d: number }
interface EventBreakdown { type: string; count: number; percent: number }
interface AnalyticsResponse {
  summary: Summary
  chartByDay: ChartPoint[]
  recentActivity: ActivityEvent[]
  topWallets: TopWallet[]
  eventBreakdown: EventBreakdown[]
}

// ── Constants ──────────────────────────────────────────────────────────────
const PERIODS = [
  { key: '7d',  label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: '90d', label: '90 días' },
  { key: '1y',  label: '1 año' },
]

const EVENT_LABELS: Record<string, string> = {
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

const EVENT_COLORS = ['#3CBA76', '#46B7F0', '#A78BFA', '#F5A623', '#F87171', '#0EA5E9', '#FBBF24', '#34D399']

const ACTIVITY_LABELS: Record<string, string> = {
  stamp_added:  'Sello añadido',
  pass_created: 'Pase creado',
  redemption:   'Canje realizado',
  scan:         'Escaneo',
  pass_deleted: 'Pase eliminado',
}

const ACTIVITY_CONFIG: Record<string, { color: string; icon: string }> = {
  stamp_added:  { color: 'var(--primary-text)', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  pass_created: { color: '#A78BFA',             icon: 'M12 5v14M5 12h14' },
  redemption:   { color: 'var(--amber)',         icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
  scan:         { color: '#46B7F0',             icon: 'M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z' },
  pass_deleted: { color: 'var(--danger)',        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
}

const WALLET_TYPE_ICONS: Record<string, string> = {
  stamps:     'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  membership: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  points:     'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  cashback:   'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  daypass:    'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
}

const DONUT_R = 78
const DONUT_C = 2 * Math.PI * DONUT_R

const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

// ── State ──────────────────────────────────────────────────────────────────
const orgStore       = useOrganizationStore()
const period         = ref('7d')
const loading        = ref(false)
const data           = ref<AnalyticsResponse | null>(null)
const hoveredBarIdx  = ref<number | null>(null)

// ── Bar chart ──────────────────────────────────────────────────────────────
const barPoints     = computed(() => data.value?.chartByDay ?? [])
const barMax        = computed(() => Math.max(...barPoints.value.map(p => p.count), 1))
const totalBarScans = computed(() => barPoints.value.reduce((s, p) => s + p.count, 0))
const hoveredBar    = computed(() => hoveredBarIdx.value !== null ? barPoints.value[hoveredBarIdx.value] : null)

const xLabelStep = computed(() => {
  const n = barPoints.value.length
  if (n <= 10) return 1
  if (n <= 31) return 5
  return 15
})

function barPct(count: number) {
  if (count === 0) return 0
  return Math.max((count / barMax.value) * 100, 2)
}

// ── KPI cards ──────────────────────────────────────────────────────────────
const kpis = computed(() => {
  const s = data.value?.summary
  if (!s) return []
  return [
    {
      key: 'scans',
      label: 'Escaneos totales',
      display: s.totalScans.toLocaleString(),
      suffix: '',
      delta: s.deltaScans,
      spark: barPoints.value.map(p => p.count),
      highlight: false,
      iconPath: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v3M14 18v3M17 21h4"/>',
    },
    {
      key: 'passes',
      label: 'Pases activos',
      display: s.totalPasses.toLocaleString(),
      suffix: '',
      delta: s.deltaPasses,
      spark: [] as number[],
      highlight: false,
      iconPath: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5" fill="currentColor" stroke="none"/>',
    },
    {
      key: 'new',
      label: 'Nuevos pases',
      display: s.newPassesInPeriod.toLocaleString(),
      suffix: '',
      delta: s.deltaNewPasses,
      spark: [] as number[],
      highlight: false,
      iconPath: '<path d="M12 5v14M5 12h14"/>',
    },
    {
      key: 'redeem',
      label: 'Canjes totales',
      display: s.totalRedemptions.toLocaleString(),
      suffix: '',
      delta: s.deltaRedemptions,
      spark: [] as number[],
      highlight: false,
      iconPath: '<path d="M9 12l2 2 4-4"/><rect x="3" y="4" width="18" height="18" rx="2"/>',
    },
    {
      key: 'ret',
      label: 'Retención',
      display: s.retentionRate.toFixed(1),
      suffix: '%',
      delta: s.deltaRetention,
      spark: [] as number[],
      highlight: true,
      iconPath: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>',
    },
  ]
})

// ── Sparkline ──────────────────────────────────────────────────────────────
function buildSparkPaths(counts: number[], w = 104, h = 36) {
  if (counts.length < 2) return { area: '', line: '', dot: [w, h / 2] as [number, number] }
  const mx  = Math.max(...counts)
  const mn  = Math.min(...counts)
  const rng = (mx - mn) || 1
  const step = w / (counts.length - 1)
  const pts  = counts.map((v, i) => [i * step, h - 4 - ((v - mn) / rng) * (h - 8)] as [number, number])
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return { area: `${line} L${w},${h} L0,${h} Z`, line, dot: pts[pts.length - 1] }
}

// ── Donut ──────────────────────────────────────────────────────────────────
const totalEvents = computed(() => data.value?.eventBreakdown.reduce((s, e) => s + e.count, 0) ?? 0)

const donutSegments = computed(() => {
  const bd = data.value?.eventBreakdown ?? []
  let acc = 0
  return bd.map((item, i) => {
    const len = (item.percent / 100) * DONUT_C
    const seg = {
      key:       item.type,
      color:     EVENT_COLORS[i % EVENT_COLORS.length],
      dasharray: `${len.toFixed(2)} ${(DONUT_C - len).toFixed(2)}`,
      dashoffset: -acc,
      label:     EVENT_LABELS[item.type] ?? item.type,
      count:     item.count,
      percent:   item.percent,
    }
    acc += len
    return seg
  })
})

// ── Activity ───────────────────────────────────────────────────────────────
function activityConfig(type: string) {
  return ACTIVITY_CONFIG[type] ?? { color: 'var(--text-muted)', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function shortDate(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

function dayLabel(iso: string) {
  return DAYS[new Date(iso).getDay()]
}

function localTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function localDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Fetch ──────────────────────────────────────────────────────────────────
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
  <div class="analytics-root">

    <!-- ── Controls ─────────────────────────────────────────────────────── -->
    <div class="controls-row">
      <div class="period-tabs">
        <button
          v-for="p in PERIODS"
          :key="p.key"
          class="period-tab"
          :class="{ 'period-tab--active': period === p.key }"
          @click="period = p.key"
        >{{ p.label }}</button>
      </div>
      <button class="export-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Exportar
      </button>
    </div>

    <!-- ── Loading skeleton ─────────────────────────────────────────────── -->
    <template v-if="loading">
      <div class="kpi-grid">
        <div v-for="i in 5" :key="i" class="skeleton" style="height: 106px;" />
      </div>
      <div class="skeleton" style="height: 280px;" />
      <div class="skeleton" style="height: 180px;" />
    </template>

    <!-- ── Data ─────────────────────────────────────────────────────────── -->
    <template v-else-if="data">

      <!-- KPI Grid -->
      <div class="kpi-grid">
        <div
          v-for="kpi in kpis"
          :key="kpi.key"
          class="kpi-card"
          :class="{ 'kpi-card--highlight': kpi.highlight }"
        >
          <div class="kpi-top">
            <span class="kpi-label">{{ kpi.label }}</span>
            <span
              v-if="kpi.delta !== undefined"
              class="delta-chip"
              :class="kpi.delta >= 0 ? 'delta-up' : 'delta-down'"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path :d="kpi.delta >= 0 ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'" />
              </svg>
              {{ kpi.delta >= 0 ? '+' : '' }}{{ kpi.delta }}%
            </span>
          </div>
          <div class="kpi-bottom">
            <div class="kpi-value">
              {{ kpi.display }}<span v-if="kpi.suffix" class="kpi-suffix">{{ kpi.suffix }}</span>
            </div>
            <div v-if="kpi.spark.length >= 2" class="kpi-spark">
              <svg width="104" height="36" viewBox="0 0 104 36" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="spark-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stop-color="var(--primary-text)" stop-opacity="0.2"/>
                    <stop offset="100%" stop-color="var(--primary-text)" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path :d="buildSparkPaths(kpi.spark).area" fill="url(#spark-area-grad)" />
                <path :d="buildSparkPaths(kpi.spark).line" fill="none" stroke="var(--primary-text)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <circle
                  :cx="buildSparkPaths(kpi.spark).dot[0]"
                  :cy="buildSparkPaths(kpi.spark).dot[1]"
                  r="2.5" fill="var(--primary-text)"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts + Feed -->
      <div class="charts-row">

        <!-- Bar chart -->
        <div class="card">
          <div class="card-head">
            <div>
              <h3 class="card-title">Escaneos por día</h3>
              <p class="card-sub">Actividad en el período seleccionado</p>
            </div>
            <div class="chart-total">
              <div class="chart-total-value">
                {{ hoveredBar ? hoveredBar.count : totalBarScans.toLocaleString() }}
              </div>
              <div class="chart-total-label">
                {{ hoveredBar ? shortDate(hoveredBar.date) : 'total período' }}
              </div>
            </div>
          </div>

          <div v-if="barPoints.length" class="bar-chart-wrap">
            <!-- Y axis -->
            <div class="bar-yaxis">
              <span>{{ barMax }}</span>
              <span>{{ Math.round(barMax / 2) }}</span>
              <span>0</span>
            </div>
            <!-- Chart + X labels -->
            <div class="bar-main">
              <div class="bar-area">
                <div class="bar-grid-line" style="top: 0;" />
                <div class="bar-grid-line" style="top: 50%;" />
                <div class="bar-columns">
                  <div
                    v-for="(point, i) in barPoints"
                    :key="point.date"
                    class="bar-col"
                    @mouseenter="hoveredBarIdx = i"
                    @mouseleave="hoveredBarIdx = null"
                  >
                    <div v-if="hoveredBarIdx === i && point.count > 0" class="bar-tooltip">
                      <span>{{ point.count }}</span> · {{ shortDate(point.date) }}
                    </div>
                    <span
                      v-if="period === '7d' && point.count > 0"
                      class="bar-val-label"
                      :class="{ 'bar-val-label--active': hoveredBarIdx === i }"
                    >{{ point.count }}</span>
                    <div
                      class="bar-fill"
                      :class="{
                        'bar-fill--active': hoveredBarIdx === i,
                        'bar-fill--zero':   point.count === 0,
                      }"
                      :style="point.count > 0
                        ? { height: `${barPct(point.count)}%` }
                        : { height: '4px' }"
                    />
                  </div>
                </div>
              </div>
              <!-- X labels -->
              <div class="bar-xlabels">
                <div v-for="(point, i) in barPoints" :key="i" class="bar-xl-col">
                  <template v-if="i % xLabelStep === 0 || i === barPoints.length - 1">
                    <span v-if="period === '7d'" class="bar-xl-day" :class="{ 'bar-xl-active': hoveredBarIdx === i }">{{ dayLabel(point.date) }}</span>
                    <span class="bar-xl-date" :class="{ 'bar-xl-active': hoveredBarIdx === i }">{{ shortDate(point.date) }}</span>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="chart-empty">Sin datos para este período</div>
        </div>

        <!-- Activity feed -->
        <div class="card feed-card">
          <div class="feed-head">
            <h3 class="card-title">Actividad reciente</h3>
            <span class="feed-see-all">Ver todo</span>
          </div>
          <div class="feed-list">
            <template v-if="data.recentActivity?.length">
              <div
                v-for="(evt, i) in data.recentActivity"
                :key="i"
                class="feed-item"
                :class="{ 'feed-item--sep': i > 0 }"
              >
                <div
                  class="feed-icon"
                  :style="{ background: activityConfig(evt.type).color + '1A' }"
                >
                  <svg
                    width="14" height="14" viewBox="0 0 24 24"
                    fill="none"
                    :stroke="activityConfig(evt.type).color"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    v-html="activityConfig(evt.type).icon"
                  />
                </div>
                <div class="feed-body">
                  <span class="feed-type">{{ ACTIVITY_LABELS[evt.type] ?? evt.type }}</span>
                  <span class="feed-who">{{ evt.passFirstName }} {{ evt.passLastName }} · {{ evt.walletName }}</span>
                </div>
                <span class="feed-time" :title="localDateTime(evt.createdAt)">
                  {{ localTime(evt.createdAt) }}
                </span>
              </div>
            </template>
            <p v-else class="feed-empty">Sin actividad reciente</p>
          </div>
        </div>
      </div>

      <!-- Event breakdown -->
      <div v-if="donutSegments.length" class="card">
        <div class="card-head">
          <div>
            <h3 class="card-title">Actividad por tipo de evento</h3>
            <p class="card-sub">Distribución de eventos en el período seleccionado</p>
          </div>
        </div>
        <div class="breakdown-body">
          <div class="donut-wrap">
            <svg width="192" height="192" viewBox="0 0 192 192" style="transform: rotate(-90deg); display: block;">
              <circle cx="96" cy="96" r="78" fill="none" stroke="var(--border)" stroke-width="22" />
              <circle
                v-for="seg in donutSegments"
                :key="seg.key"
                cx="96" cy="96" r="78"
                fill="none"
                :stroke="seg.color"
                stroke-width="22"
                :stroke-dasharray="seg.dasharray"
                :stroke-dashoffset="seg.dashoffset"
                stroke-linecap="butt"
              />
            </svg>
            <div class="donut-center">
              <div class="donut-total">{{ totalEvents.toLocaleString() }}</div>
              <div class="donut-sub">eventos</div>
            </div>
          </div>
          <div class="breakdown-legend">
            <div v-for="seg in donutSegments" :key="seg.key" class="legend-item">
              <div class="legend-row">
                <span class="legend-dot" :style="{ background: seg.color }" />
                <span class="legend-name">{{ seg.label }}</span>
                <span class="legend-count">{{ seg.count.toLocaleString() }}</span>
                <span class="legend-pct">{{ seg.percent.toFixed(1) }}%</span>
              </div>
              <div class="legend-track">
                <div class="legend-fill" :style="{ width: `${seg.percent}%`, background: seg.color }" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top wallets -->
      <div v-if="data.topWallets?.length" class="card wallets-card">
        <div class="wallets-head">
          <h3 class="card-title">Top wallets</h3>
          <p class="card-sub">Las más activas en el período</p>
        </div>
        <!-- Desktop table -->
        <table class="wallets-table">
          <thead>
            <tr>
              <th class="wth wth-left wth-rank">#</th>
              <th class="wth wth-left">Wallet</th>
              <th class="wth wth-left">Tipo</th>
              <th class="wth wth-right">Escaneos</th>
              <th class="wth wth-right">Pases activos</th>
              <th class="wth wth-right wth-last">Δ 7d</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(w, i) in data.topWallets"
              :key="w.walletId"
              class="wallets-row"
            >
              <td class="wtd wtd-rank">{{ i + 1 }}</td>
              <td class="wtd wtd-name">{{ w.walletName }}</td>
              <td class="wtd">
                <span class="type-badge">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--primary-text)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path :d="WALLET_TYPE_ICONS[w.walletType] ?? WALLET_TYPE_ICONS.stamps" />
                  </svg>
                  {{ w.walletType }}
                </span>
              </td>
              <td class="wtd wtd-num">{{ w.totalScans.toLocaleString() }}</td>
              <td class="wtd wtd-muted">{{ w.activeCount.toLocaleString() }}</td>
              <td class="wtd wtd-last">
                <span
                  class="delta-chip"
                  :class="w.delta7d >= 0 ? 'delta-up' : 'delta-down'"
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
        <!-- Mobile cards -->
        <div class="wallets-mobile">
          <div
            v-for="(w, i) in data.topWallets"
            :key="w.walletId"
            class="wallet-mob-item"
          >
            <span class="wallet-mob-rank">{{ i + 1 }}</span>
            <div class="wallet-mob-body">
              <div class="wallet-mob-top">
                <span class="wtd-name" style="padding: 0;">{{ w.walletName }}</span>
                <span
                  class="delta-chip"
                  :class="w.delta7d >= 0 ? 'delta-up' : 'delta-down'"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                    <path :d="w.delta7d >= 0 ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'" />
                  </svg>
                  {{ Math.abs(w.delta7d) }}%
                </span>
              </div>
              <div class="wallet-mob-meta">
                <span class="type-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--primary-text)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path :d="WALLET_TYPE_ICONS[w.walletType] ?? WALLET_TYPE_ICONS.stamps" />
                  </svg>
                  {{ w.walletType }}
                </span>
                <span class="wallet-mob-stat">{{ w.totalScans.toLocaleString() }} escaneos</span>
                <span class="wallet-mob-stat">{{ w.activeCount.toLocaleString() }} activos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </template>

    <!-- ── Empty state ───────────────────────────────────────────────────── -->
    <div v-else class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" stroke-linecap="round">
        <path d="M3 21V5M3 21h18"/><path d="M7 17v-5M11 17V9M15 17v-3M19 17V7"/>
      </svg>
      <p class="empty-title">Sin datos para este período</p>
      <p class="empty-sub">Prueba con un rango diferente</p>
    </div>

  </div>
</template>

<style scoped>
/* ── Root ───────────────────────────────────────────────────────────────── */
.analytics-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Controls ───────────────────────────────────────────────────────────── */
.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.period-tabs {
  display: flex;
  gap: 3px;
  padding: 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.period-tab {
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  font-family: inherit;
  background: transparent;
  color: var(--text-muted);
}
.period-tab--active {
  background: var(--primary);
  color: #fff;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 11px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-medium);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.1s;
}
.export-btn:hover { background: var(--bg-subtle); }

/* ── Card base ──────────────────────────────────────────────────────────── */
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 22px;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0;
  letter-spacing: -0.01em;
}

.card-sub {
  font-size: 12px;
  color: var(--text-faint);
  margin: 3px 0 0;
}

/* ── Skeleton ───────────────────────────────────────────────────────────── */
.skeleton {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  animation: pulse 1.5s ease-in-out infinite;
}

/* ── Delta chip ─────────────────────────────────────────────────────────── */
.delta-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 700;
  padding: 3px 7px 3px 5px;
  border-radius: 7px;
  white-space: nowrap;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.delta-up   { background: var(--success-bg); color: var(--success); }
.delta-down { background: var(--danger-bg);  color: var(--danger); }

/* ── KPI grid ───────────────────────────────────────────────────────────── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
}

.kpi-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.kpi-card--highlight .kpi-value { color: var(--primary-text); }
.kpi-card--highlight .kpi-suffix { color: var(--primary-text); opacity: 0.7; }

.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.kpi-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi-bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
}

.kpi-value {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 0.95;
  color: var(--text-ink);
  font-variant-numeric: tabular-nums;
}

.kpi-suffix {
  font-size: 20px;
  color: var(--text-muted);
  margin-left: 1px;
  font-weight: 700;
}

.kpi-spark {
  flex-shrink: 0;
  margin-bottom: -2px;
}

/* ── Charts row ─────────────────────────────────────────────────────────── */
.charts-row {
  display: grid;
  grid-template-columns: minmax(0, 2.1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

/* ── Bar chart ──────────────────────────────────────────────────────────── */
.chart-total        { text-align: right; flex-shrink: 0; }
.chart-total-value  { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; color: var(--primary-text); font-variant-numeric: tabular-nums; }
.chart-total-label  { font-size: 10.5px; color: var(--text-faint); margin-top: 3px; }

.bar-chart-wrap {
  display: flex;
  gap: 0;
}

.bar-yaxis {
  width: 32px;
  height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  padding-right: 8px;
  flex-shrink: 0;
  font-size: 9.5px;
  color: var(--text-faint);
  line-height: 1;
}

.bar-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.bar-area {
  height: 180px;
  position: relative;
  border-bottom: 1px solid var(--border);
  border-left: 1px solid var(--border-subtle);
}

.bar-grid-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px dashed var(--border);
  pointer-events: none;
}

.bar-columns {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 0 4px;
}

.bar-col {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  position: relative;
  cursor: default;
}

.bar-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--text-ink);
  color: var(--bg-surface);
  font-size: 11.5px;
  font-weight: 700;
  padding: 5px 9px;
  border-radius: 8px;
  white-space: nowrap;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  z-index: 10;
  font-variant-numeric: tabular-nums;
}

.bar-val-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-faint);
  margin-bottom: 4px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.bar-val-label--active { color: var(--text-ink); }

.bar-fill {
  width: 100%;
  max-width: 56px;
  border-radius: 5px 5px 0 0;
  background: linear-gradient(180deg, var(--primary-text), var(--primary-mid));
  transition: background 0.1s;
}
.bar-fill--active { background: var(--primary-text) !important; }
.bar-fill--zero   { background: var(--border) !important; border-radius: 3px; opacity: 0.45; }

.bar-xlabels {
  display: flex;
  gap: 8px;
  padding: 7px 4px 0;
}

.bar-xl-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 2px;
  min-width: 0;
}

.bar-xl-day  { font-size: 11.5px; font-weight: 600; color: var(--text-medium); line-height: 1.2; }
.bar-xl-date { font-size: 10px;   color: var(--text-faint); line-height: 1.2; }
.bar-xl-active { color: var(--primary-text) !important; }

.chart-empty {
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-faint);
}

/* ── Activity feed ──────────────────────────────────────────────────────── */
.feed-card { padding: 0; }

.feed-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px 14px;
}

.feed-see-all {
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-text);
  cursor: pointer;
}

.feed-list {
  padding: 0 22px 16px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  max-height: 290px;
}

.feed-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 0;
}
.feed-item--sep { border-top: 1px solid var(--border-subtle); }

.feed-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feed-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.feed-type {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.feed-who {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.feed-time {
  font-size: 11px;
  color: var(--text-faint);
  white-space: nowrap;
  flex-shrink: 0;
  margin-top: 2px;
  cursor: default;
}

.feed-empty {
  font-size: 13px;
  color: var(--text-faint);
  text-align: center;
  padding: 32px 0;
  margin: 0;
}

/* ── Event breakdown ────────────────────────────────────────────────────── */
.breakdown-body {
  display: flex;
  align-items: center;
  gap: 40px;
  flex-wrap: wrap;
}

.donut-wrap {
  position: relative;
  width: 192px;
  height: 192px;
  flex-shrink: 0;
}

.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.donut-total {
  font-size: 36px;
  font-weight: 800;
  color: var(--text-ink);
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.donut-sub {
  font-size: 12px;
  color: var(--text-faint);
  margin-top: 3px;
}

.breakdown-legend {
  flex: 1;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.legend-item { display: flex; flex-direction: column; gap: 6px; }

.legend-row {
  display: flex;
  align-items: center;
  gap: 9px;
}

.legend-dot  { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
.legend-name { flex: 1; font-size: 13.5px; font-weight: 600; color: var(--text-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.legend-count { font-size: 13.5px; font-weight: 700; color: var(--text-ink); font-variant-numeric: tabular-nums; flex-shrink: 0; }
.legend-pct   { font-size: 12px; color: var(--text-faint); min-width: 44px; text-align: right; font-variant-numeric: tabular-nums; flex-shrink: 0; }

.legend-track {
  height: 5px;
  border-radius: 4px;
  background: var(--border);
  overflow: hidden;
}
.legend-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

/* ── Top wallets ────────────────────────────────────────────────────────── */
.wallets-card    { padding: 0; overflow: hidden; }
.wallets-head    { padding: 18px 22px 14px; border-bottom: 1px solid var(--border-subtle); }
.wallets-table   { width: 100%; border-collapse: collapse; }

.wth {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 11px 10px;
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--border);
}
.wth-left  { text-align: left; }
.wth-right { text-align: right; }
.wth-rank  { padding-left: 22px; width: 44px; }
.wth-last  { padding-right: 22px; }

.wallets-row { border-top: 1px solid var(--border-subtle); transition: background 0.1s; }
.wallets-row:hover { background: var(--bg-subtle); }

.wtd      { padding: 14px 10px; }
.wtd-rank { padding-left: 22px; font-size: 12.5px; font-weight: 700; color: var(--text-faint); }
.wtd-name { font-size: 13.5px; font-weight: 700; color: var(--text-ink); }
.wtd-num  { text-align: right; font-size: 13.5px; font-weight: 700; color: var(--text-ink); font-variant-numeric: tabular-nums; }
.wtd-muted { text-align: right; font-size: 13px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.wtd-last  { text-align: right; padding-right: 22px; }

.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-medium);
  padding: 5px 10px;
  border-radius: 8px;
  background: var(--bg-field);
  border: 1px solid var(--border);
  text-transform: capitalize;
}

/* Mobile wallets */
.wallets-mobile    { display: none; flex-direction: column; }
.wallet-mob-item   { display: flex; gap: 10px; align-items: flex-start; padding: 14px 16px; border-top: 1px solid var(--border-subtle); }
.wallet-mob-rank   { font-size: 12.5px; font-weight: 700; color: var(--text-faint); min-width: 18px; margin-top: 2px; }
.wallet-mob-body   { flex: 1; min-width: 0; }
.wallet-mob-top    { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.wallet-mob-meta   { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.wallet-mob-stat   { font-size: 11.5px; color: var(--text-muted); }

/* ── Empty state ────────────────────────────────────────────────────────── */
.empty-state {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 56px 32px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.empty-title { font-size: 14px; font-weight: 700; color: var(--text-ink); margin: 0; }
.empty-sub   { font-size: 12.5px; color: var(--text-faint); margin: 0; }

/* ── Animations ─────────────────────────────────────────────────────────── */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 1280px) {
  .kpi-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 1024px) {
  .charts-row { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .kpi-grid          { grid-template-columns: repeat(2, 1fr); }
  .breakdown-body    { flex-direction: column; align-items: flex-start; gap: 24px; }
  .breakdown-legend  { min-width: 0; width: 100%; }
  .wallets-table     { display: none; }
  .wallets-mobile    { display: flex; }
}
@media (max-width: 480px) {
  .kpi-grid { grid-template-columns: 1fr; }
}
</style>
