<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { apiClient } from '@/infrastructure/http/ApiClient'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import TCGDrawer from '@/app/components/Shared/TCGDrawer/TCGDrawer.vue'

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

// ── UI constants ───────────────────────────────────────────────────────────
const PERIODS = [
  { key: '7d',  label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: '90d', label: '90 días' },
  { key: '1y',  label: '1 año' },
]
const FEED_PREVIEW = 5

// ── Activity config ────────────────────────────────────────────────────────
// icon = full SVG inner markup (so v-html renders it correctly).
// bg   = pre-computed rgba background (CSS vars can't have hex alpha appended).
const ACTIVITY_KINDS: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  stamp_added: {
    color: '#22C55E',
    bg:    'rgba(34,197,94,0.13)',
    icon:  '<path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
    label: 'Sello agregado',
  },
  pass_created: {
    color: '#A78BFA',
    bg:    'rgba(167,139,250,0.13)',
    icon:  '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    label: 'Pase creado',
  },
  redemption: {
    color: '#F59E0B',
    bg:    'rgba(245,158,11,0.13)',
    icon:  '<path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>',
    label: 'Canje realizado',
  },
  scan: {
    color: '#38BDF8',
    bg:    'rgba(56,189,248,0.13)',
    icon:  '<path d="M13 10V3L4 14h7v7l9-11h-7z"/>',
    label: 'Escaneo',
  },
  link_sent: {
    color: '#0EA5E9',
    bg:    'rgba(14,165,233,0.13)',
    icon:  '<path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>',
    label: 'Enlace enviado',
  },
  pass_deleted: {
    color: '#EF4444',
    bg:    'rgba(239,68,68,0.13)',
    icon:  '<path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>',
    label: 'Pase eliminado',
  },
  stamp_redeemed: {
    color: '#F59E0B',
    bg:    'rgba(245,158,11,0.13)',
    icon:  '<path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>',
    label: 'Sello canjeado',
  },
}

function kindConfig(type: string) {
  return ACTIVITY_KINDS[type] ?? {
    color: '#9CA3AF',
    bg:    'rgba(156,163,175,0.13)',
    icon:  '<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>',
    label: type,
  }
}

function activityMessage(evt: ActivityEvent): string {
  const name = `${evt.passFirstName} ${evt.passLastName}`.trim()
  switch (evt.type) {
    case 'stamp_added':    return `${name} recibió un sello`
    case 'pass_created':   return `${name} se unió con un nuevo pase`
    case 'redemption':     return `${name} canjeó su recompensa`
    case 'scan':           return `Pase de ${name} fue escaneado`
    case 'link_sent':      return `Enlace enviado a ${name}`
    case 'pass_deleted':   return `El pase de ${name} fue eliminado`
    case 'stamp_redeemed': return `${name} canjeó sellos acumulados`
    default:               return `${kindConfig(evt.type).label} — ${name}`
  }
}

// ── Event breakdown ────────────────────────────────────────────────────────
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

const DONUT_R = 78
const DONUT_C = 2 * Math.PI * DONUT_R

// ── Wallet icons ───────────────────────────────────────────────────────────
const WALLET_TYPE_ICONS: Record<string, string> = {
  stamps:     'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  membership: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  points:     'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  cashback:   'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  daypass:    'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
}

// ── Date & timezone helpers ────────────────────────────────────────────────
const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

// Compute local UTC offset label once (e.g. "UTC-7", "UTC+2")
const LOCAL_TZ = (() => {
  const off  = -new Date().getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const h    = Math.floor(Math.abs(off) / 60)
  const m    = Math.abs(off) % 60
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`
})()

function shortDate(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}
function dayLabel(iso: string) { return DAYS[new Date(iso).getDay()] }

// Short time in local timezone — "09:08 p.m."
function fmtTimeShort(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

// Full human datetime for drawer — "Hoy, 9:08 p.m." / "Ayer, 2:15 p.m." / "2 jun, 8:44 p.m."
function fmtDateTimeFull(iso: string) {
  const d   = new Date(iso)
  const now = new Date()
  const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString())
    return `Hoy, ${time}`
  if (d.toDateString() === new Date(now.getTime() - 86_400_000).toDateString())
    return `Ayer, ${time}`
  return d.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ISO string tooltip with UTC label for accessibility
function fmtIsoLabel(iso: string) {
  return `${new Date(iso).toLocaleString('es-MX')} (${LOCAL_TZ})`
}

// Group activity events by local calendar day for drawer
interface DayGroup { label: string; events: (ActivityEvent & { _idx: number })[] }
function groupByDay(events: ActivityEvent[]): DayGroup[] {
  const now  = new Date()
  const map  = new Map<string, DayGroup>()
  events.forEach((e, idx) => {
    const d       = new Date(e.createdAt)
    const dateKey = d.toDateString()
    let label: string
    if (dateKey === now.toDateString())
      label = 'Hoy'
    else if (dateKey === new Date(now.getTime() - 86_400_000).toDateString())
      label = 'Ayer'
    else
      label = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!map.has(dateKey)) map.set(dateKey, { label, events: [] })
    map.get(dateKey)!.events.push({ ...e, _idx: idx })
  })
  return Array.from(map.values())
}

// ── State ──────────────────────────────────────────────────────────────────
const orgStore       = useOrganizationStore()
const period         = ref('7d')
const loading        = ref(false)
const data           = ref<AnalyticsResponse | null>(null)
const hoveredBarIdx  = ref<number | null>(null)
const feedDrawerOpen = ref(false)

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
  return count === 0 ? 0 : Math.max((count / barMax.value) * 100, 2)
}

// ── KPI cards ──────────────────────────────────────────────────────────────
const kpis = computed(() => {
  const s = data.value?.summary
  if (!s) return []
  return [
    {
      key: 'scans',  label: 'Escaneos totales',
      display: s.totalScans.toLocaleString(),       suffix: '', delta: s.deltaScans,
      spark: barPoints.value.map(p => p.count),     highlight: false,
      iconPath: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v3M14 18v3M17 21h4"/>',
    },
    {
      key: 'passes', label: 'Pases activos',
      display: s.totalPasses.toLocaleString(),      suffix: '', delta: s.deltaPasses,
      spark: [] as number[],                        highlight: false,
      iconPath: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5" fill="currentColor" stroke="none"/>',
    },
    {
      key: 'new',    label: 'Nuevos pases',
      display: s.newPassesInPeriod.toLocaleString(), suffix: '', delta: s.deltaNewPasses,
      spark: [] as number[],                         highlight: false,
      iconPath: '<path d="M12 5v14M5 12h14"/>',
    },
    {
      key: 'redeem', label: 'Canjes totales',
      display: s.totalRedemptions.toLocaleString(), suffix: '', delta: s.deltaRedemptions,
      spark: [] as number[],                        highlight: false,
      iconPath: '<path d="M9 12l2 2 4-4"/><rect x="3" y="4" width="18" height="18" rx="2"/>',
    },
    {
      key: 'ret',    label: 'Retención',
      display: s.retentionRate.toFixed(1),          suffix: '%', delta: s.deltaRetention,
      spark: [] as number[],                        highlight: true,
      iconPath: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>',
    },
  ]
})

// ── Sparkline builder ──────────────────────────────────────────────────────
function buildSpark(counts: number[], w = 104, h = 36) {
  if (counts.length < 2) return { area: '', line: '', dot: [w, h / 2] as [number, number] }
  const mx  = Math.max(...counts), mn = Math.min(...counts), rng = (mx - mn) || 1
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
      key:        item.type,
      color:      EVENT_COLORS[i % EVENT_COLORS.length],
      dasharray:  `${len.toFixed(2)} ${(DONUT_C - len).toFixed(2)}`,
      dashoffset: -acc,
      label:      EVENT_LABELS[item.type] ?? item.type,
      count:      item.count,
      percent:    item.percent,
    }
    acc += len
    return seg
  })
})

// ── Feed slices ────────────────────────────────────────────────────────────
const previewFeed  = computed(() => (data.value?.recentActivity ?? []).slice(0, FEED_PREVIEW))
const drawerFeed   = computed(() => data.value?.recentActivity ?? [])
const drawerGroups = computed(() => groupByDay(drawerFeed.value))
const hasMoreFeed  = computed(() => (data.value?.recentActivity.length ?? 0) > FEED_PREVIEW)

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

    <!-- ── Loading ──────────────────────────────────────────────────────── -->
    <template v-if="loading">
      <div class="kpi-grid">
        <div v-for="i in 5" :key="i" class="skeleton" style="height: 106px;" />
      </div>
      <div class="skeleton" style="height: 300px;" />
      <div class="skeleton" style="height: 180px;" />
    </template>

    <!-- ── Data ─────────────────────────────────────────────────────────── -->
    <template v-else-if="data">

      <!-- KPI grid -->
      <div class="kpi-grid">
        <div
          v-for="kpi in kpis"
          :key="kpi.key"
          class="kpi-card"
          :class="{ 'kpi-card--hl': kpi.highlight }"
        >
          <div class="kpi-top">
            <div class="kpi-icon-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="kpi.iconPath" />
            </div>
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
                  <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stop-color="var(--primary-text)" stop-opacity="0.2"/>
                    <stop offset="100%" stop-color="var(--primary-text)" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path :d="buildSpark(kpi.spark).area" fill="url(#spark-grad)" />
                <path :d="buildSpark(kpi.spark).line" fill="none" stroke="var(--primary-text)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <circle :cx="buildSpark(kpi.spark).dot[0]" :cy="buildSpark(kpi.spark).dot[1]" r="2.5" fill="var(--primary-text)" />
              </svg>
            </div>
          </div>
          <div class="kpi-label">{{ kpi.label }}</div>
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
              <div class="chart-total-value">{{ hoveredBar ? hoveredBar.count : totalBarScans.toLocaleString() }}</div>
              <div class="chart-total-label">{{ hoveredBar ? shortDate(hoveredBar.date) : 'total período' }}</div>
            </div>
          </div>

          <div v-if="barPoints.length" class="bar-chart-wrap">
            <div class="bar-yaxis">
              <span>{{ barMax }}</span>
              <span>{{ Math.round(barMax / 2) }}</span>
              <span>0</span>
            </div>
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
                      <span class="bar-tooltip-val">{{ point.count }}</span>
                      <span class="bar-tooltip-sep">·</span>
                      {{ shortDate(point.date) }}
                    </div>
                    <span
                      v-if="period === '7d' && point.count > 0"
                      class="bar-val"
                      :class="{ 'bar-val--active': hoveredBarIdx === i }"
                    >{{ point.count }}</span>
                    <div
                      class="bar-fill"
                      :class="{
                        'bar-fill--active': hoveredBarIdx === i,
                        'bar-fill--zero':   point.count === 0,
                      }"
                      :style="point.count > 0 ? { height: `${barPct(point.count)}%` } : { height: '4px' }"
                    />
                  </div>
                </div>
              </div>
              <div class="bar-xlabels">
                <div v-for="(point, i) in barPoints" :key="i" class="bar-xl-col">
                  <template v-if="i % xLabelStep === 0 || i === barPoints.length - 1">
                    <span v-if="period === '7d'" class="bar-xl-day" :class="{ 'bar-xl--active': hoveredBarIdx === i }">{{ dayLabel(point.date) }}</span>
                    <span class="bar-xl-date" :class="{ 'bar-xl--active': hoveredBarIdx === i }">{{ shortDate(point.date) }}</span>
                  </template>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="chart-empty">Sin datos para este período</div>
        </div>

        <!-- Activity feed preview -->
        <div class="card feed-card">
          <div class="feed-head">
            <div>
              <h3 class="card-title">Actividad reciente</h3>
              <p class="card-sub">Últimos eventos registrados</p>
            </div>
            <button
              v-if="hasMoreFeed"
              class="feed-see-all"
              @click="feedDrawerOpen = true"
            >
              Ver todo
              <span class="feed-badge">{{ data.recentActivity.length }}</span>
            </button>
          </div>

          <div class="feed-list">
            <template v-if="previewFeed.length">
              <div
                v-for="(evt, i) in previewFeed"
                :key="i"
                class="feed-item"
                :class="{ 'feed-item--sep': i > 0 }"
              >
                <div class="feed-icon" :style="{ background: kindConfig(evt.type).bg }">
                  <svg
                    width="14" height="14" viewBox="0 0 24 24"
                    fill="none" :stroke="kindConfig(evt.type).color"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    v-html="kindConfig(evt.type).icon"
                  />
                </div>
                <div class="feed-body">
                  <span class="feed-action">{{ activityMessage(evt) }}</span>
                  <span class="feed-meta">{{ evt.walletName }}</span>
                </div>
                <span class="feed-time" :title="fmtIsoLabel(evt.createdAt)">
                  {{ fmtTimeShort(evt.createdAt) }}
                </span>
              </div>
            </template>
            <div v-else class="feed-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" stroke-linecap="round" style="margin: 0 auto 8px;">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Sin actividad reciente
            </div>
          </div>

          <!-- See all CTA when no badge (≤ FEED_PREVIEW items total) -->
          <div v-if="previewFeed.length && !hasMoreFeed" class="feed-footer">
            <button class="feed-footer-btn" @click="feedDrawerOpen = true">
              Ver detalle completo
            </button>
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
            <tr v-for="(w, i) in data.topWallets" :key="w.walletId" class="wallets-row">
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
                <span class="delta-chip" :class="w.delta7d >= 0 ? 'delta-up' : 'delta-down'">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                    <path :d="w.delta7d >= 0 ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'" />
                  </svg>
                  {{ Math.abs(w.delta7d) }}%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <!-- Mobile -->
        <div class="wallets-mobile">
          <div v-for="(w, i) in data.topWallets" :key="w.walletId" class="wallet-mob-item">
            <span class="wallet-mob-rank">{{ i + 1 }}</span>
            <div class="wallet-mob-body">
              <div class="wallet-mob-top">
                <span class="wtd-name" style="padding:0">{{ w.walletName }}</span>
                <span class="delta-chip" :class="w.delta7d >= 0 ? 'delta-up' : 'delta-down'">
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
                <span class="mob-stat">{{ w.totalScans.toLocaleString() }} escaneos</span>
                <span class="mob-stat">{{ w.activeCount.toLocaleString() }} activos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </template>

    <!-- ── Empty ─────────────────────────────────────────────────────────── -->
    <div v-else class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" stroke-linecap="round">
        <path d="M3 21V5M3 21h18"/><path d="M7 17v-5M11 17V9M15 17v-3M19 17V7"/>
      </svg>
      <p class="empty-title">Sin datos para este período</p>
      <p class="empty-sub">Prueba con un rango diferente</p>
    </div>

    <!-- ── Activity drawer ───────────────────────────────────────────────── -->
    <TCGDrawer
      v-model="feedDrawerOpen"
      position="end"
      :width="460"
      title="Actividad reciente"
    >
      <template #body>
        <div class="drawer-body">

          <!-- Timezone notice -->
          <div class="tz-notice">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
            Horarios en tu zona local
            <span class="tz-badge">{{ LOCAL_TZ }}</span>
          </div>

          <!-- No events -->
          <div v-if="!drawerFeed.length" class="drawer-empty">
            Sin actividad registrada en este período
          </div>

          <!-- Events grouped by day -->
          <div v-else class="drawer-groups">
            <div v-for="group in drawerGroups" :key="group.label" class="drawer-group">
              <div class="drawer-day-label">{{ group.label }}</div>
              <div
                v-for="(evt, idx) in group.events"
                :key="evt._idx"
                class="drawer-item"
                :class="{ 'drawer-item--sep': idx > 0 }"
              >
                <div
                  class="drawer-icon"
                  :style="{ background: kindConfig(evt.type).bg }"
                >
                  <svg
                    width="16" height="16" viewBox="0 0 24 24"
                    fill="none" :stroke="kindConfig(evt.type).color"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    v-html="kindConfig(evt.type).icon"
                  />
                </div>
                <div class="drawer-content">
                  <div class="drawer-action">{{ activityMessage(evt) }}</div>
                  <div class="drawer-sub">
                    <span class="drawer-kind-badge" :style="{ color: kindConfig(evt.type).color, background: kindConfig(evt.type).color + '14' }">
                      {{ kindConfig(evt.type).label }}
                    </span>
                    <span class="drawer-wallet">{{ evt.walletName }}</span>
                  </div>
                </div>
                <div class="drawer-time-col">
                  <span class="drawer-time" :title="fmtIsoLabel(evt.createdAt)">
                    {{ fmtDateTimeFull(evt.createdAt) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer note -->
          <p v-if="drawerFeed.length" class="drawer-limit-note">
            {{ drawerFeed.length }} evento{{ drawerFeed.length !== 1 ? 's' : '' }} en el período
          </p>
        </div>
      </template>
    </TCGDrawer>

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
.period-tab--active { background: var(--primary); color: #fff; }

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

.card-title { font-size: 15px; font-weight: 700; color: var(--text-ink); margin: 0; letter-spacing: -0.01em; }
.card-sub   { font-size: 12px; color: var(--text-faint); margin: 3px 0 0; }

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
  gap: 12px;
  min-width: 0;
}
.kpi-card--hl .kpi-value { color: var(--primary-text); }
.kpi-card--hl .kpi-suffix { color: var(--primary-text); opacity: 0.7; }
.kpi-card--hl .kpi-icon-wrap { color: var(--primary-text); background: var(--primary-light); }

.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.kpi-icon-wrap {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--bg-field);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kpi-bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
}

.kpi-value {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--text-ink);
  font-variant-numeric: tabular-nums;
}
.kpi-suffix {
  font-size: 18px;
  color: var(--text-muted);
  margin-left: 1px;
  font-weight: 700;
}

.kpi-spark  { flex-shrink: 0; margin-bottom: -2px; }
.kpi-label  { font-size: 12px; font-weight: 600; color: var(--text-muted); }

/* ── Charts row ─────────────────────────────────────────────────────────── */
.charts-row {
  display: grid;
  grid-template-columns: minmax(0, 2.1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

/* ── Bar chart ──────────────────────────────────────────────────────────── */
.chart-total       { text-align: right; flex-shrink: 0; }
.chart-total-value { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; color: var(--primary-text); font-variant-numeric: tabular-nums; }
.chart-total-label { font-size: 10.5px; color: var(--text-faint); margin-top: 3px; }

.bar-chart-wrap { display: flex; }

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

.bar-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

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
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 8px;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  pointer-events: none;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 5px;
}
.bar-tooltip-val { font-weight: 800; font-variant-numeric: tabular-nums; }
.bar-tooltip-sep { opacity: 0.4; }

.bar-val {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-faint);
  margin-bottom: 4px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.bar-val--active { color: var(--text-ink); }

.bar-fill {
  width: 100%;
  max-width: 56px;
  border-radius: 5px 5px 0 0;
  background: linear-gradient(180deg, var(--primary-text), var(--primary-mid));
  transition: background 0.1s;
}
.bar-fill--active { background: var(--primary-text) !important; }
.bar-fill--zero   { background: var(--border) !important; border-radius: 3px; opacity: 0.4; }

.bar-xlabels { display: flex; gap: 8px; padding: 7px 4px 0; }

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
.bar-xl-date { font-size: 10px; color: var(--text-faint); line-height: 1.2; }
.bar-xl--active { color: var(--primary-text) !important; }

.chart-empty {
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-faint);
}

/* ── Activity feed ──────────────────────────────────────────────────────── */
.feed-card { padding: 0; display: flex; flex-direction: column; }

.feed-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 22px 14px;
}

.feed-see-all {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-text);
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  margin-top: 2px;
  white-space: nowrap;
  flex-shrink: 0;
}
.feed-see-all:hover { opacity: 0.8; }

.feed-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  background: var(--primary-light);
  color: var(--primary-text);
  font-variant-numeric: tabular-nums;
}

.feed-list {
  padding: 0 22px 4px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.feed-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 11px 0;
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
.feed-action {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.35;
}
.feed-meta {
  font-size: 11.5px;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0;
  font-size: 13px;
  color: var(--text-faint);
  text-align: center;
}

.feed-footer {
  padding: 10px 22px 18px;
  border-top: 1px solid var(--border-subtle);
  margin-top: 4px;
}
.feed-footer-btn {
  width: 100%;
  padding: 9px;
  border-radius: 9px;
  background: var(--bg-field);
  border: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-medium);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.1s;
}
.feed-footer-btn:hover { background: var(--bg-subtle); }

/* ── Breakdown donut ────────────────────────────────────────────────────── */
.breakdown-body {
  display: flex;
  align-items: center;
  gap: 40px;
  flex-wrap: wrap;
}
.donut-wrap { position: relative; width: 192px; height: 192px; flex-shrink: 0; }
.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.donut-total { font-size: 36px; font-weight: 800; color: var(--text-ink); line-height: 1; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.donut-sub   { font-size: 12px; color: var(--text-faint); margin-top: 3px; }

.breakdown-legend { flex: 1; min-width: 260px; display: flex; flex-direction: column; gap: 14px; }
.legend-item  { display: flex; flex-direction: column; gap: 6px; }
.legend-row   { display: flex; align-items: center; gap: 9px; }
.legend-dot   { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
.legend-name  { flex: 1; font-size: 13.5px; font-weight: 600; color: var(--text-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.legend-count { font-size: 13.5px; font-weight: 700; color: var(--text-ink); font-variant-numeric: tabular-nums; flex-shrink: 0; }
.legend-pct   { font-size: 12px; color: var(--text-faint); min-width: 44px; text-align: right; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.legend-track { height: 5px; border-radius: 4px; background: var(--border); overflow: hidden; }
.legend-fill  { height: 100%; border-radius: 4px; transition: width 0.4s ease; }

/* ── Top wallets ────────────────────────────────────────────────────────── */
.wallets-card { padding: 0; overflow: hidden; }
.wallets-head { padding: 18px 22px 14px; border-bottom: 1px solid var(--border-subtle); }
.wallets-table { width: 100%; border-collapse: collapse; }

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

.wtd       { padding: 14px 10px; }
.wtd-rank  { padding-left: 22px; font-size: 12.5px; font-weight: 700; color: var(--text-faint); }
.wtd-name  { font-size: 13.5px; font-weight: 700; color: var(--text-ink); }
.wtd-num   { text-align: right; font-size: 13.5px; font-weight: 700; color: var(--text-ink); font-variant-numeric: tabular-nums; }
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

.wallets-mobile    { display: none; flex-direction: column; }
.wallet-mob-item   { display: flex; gap: 10px; align-items: flex-start; padding: 14px 16px; border-top: 1px solid var(--border-subtle); }
.wallet-mob-rank   { font-size: 12.5px; font-weight: 700; color: var(--text-faint); min-width: 18px; margin-top: 2px; }
.wallet-mob-body   { flex: 1; min-width: 0; }
.wallet-mob-top    { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.wallet-mob-meta   { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mob-stat          { font-size: 11.5px; color: var(--text-muted); }

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

/* ── Drawer body ────────────────────────────────────────────────────────── */
.drawer-body { display: flex; flex-direction: column; gap: 0; }

.tz-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  padding: 10px 4px 16px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 4px;
}
.tz-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 5px;
  background: var(--bg-field);
  border: 1px solid var(--border);
  color: var(--text-medium);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  margin-left: 2px;
}

.drawer-empty {
  padding: 48px 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-faint);
}

.drawer-groups { display: flex; flex-direction: column; gap: 20px; padding-top: 8px; }
.drawer-group  { display: flex; flex-direction: column; gap: 0; }

.drawer-day-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-faint);
  padding: 6px 0 10px;
}

.drawer-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 12px 0;
}
.drawer-item--sep { border-top: 1px solid var(--border-subtle); }

.drawer-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.drawer-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }

.drawer-action {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-ink);
  line-height: 1.35;
}

.drawer-sub {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.drawer-kind-badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 5px;
  white-space: nowrap;
}

.drawer-wallet {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-time-col { flex-shrink: 0; text-align: right; }
.drawer-time {
  font-size: 11.5px;
  color: var(--text-faint);
  white-space: nowrap;
  cursor: default;
  font-variant-numeric: tabular-nums;
}

.drawer-limit-note {
  margin: 20px 0 4px;
  text-align: center;
  font-size: 12px;
  color: var(--text-faint);
}

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
  .kpi-grid         { grid-template-columns: repeat(2, 1fr); }
  .breakdown-body   { flex-direction: column; align-items: flex-start; gap: 24px; }
  .breakdown-legend { min-width: 0; width: 100%; }
  .wallets-table    { display: none; }
  .wallets-mobile   { display: flex; }
}
@media (max-width: 480px) {
  .kpi-grid { grid-template-columns: 1fr; }
}
</style>
