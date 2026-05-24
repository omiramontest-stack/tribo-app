<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '@/infrastructure/http/ApiClient'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'

const route  = useRoute()
const router = useRouter()
const orgStore  = useOrganizationStore()
const walletId  = route.params.id as string

interface WalletSummary {
  totalIssued: number
  activeCount: number
  totalScans: number
  totalRedemptions: number
  redemptionRate: number
  inactiveCount: number
}
interface TopCustomer {
  firstName: string
  lastName: string
  eventCount: number
}
interface WalletInsights {
  bestHour: number | null
  bestDayOfWeek: number | null
  topCustomers: TopCustomer[]
}
interface WalletAnalyticsResponse {
  summary: WalletSummary
  insights: WalletInsights
}

const periods = [
  { key: '7d',  label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: '90d', label: '90 días' },
  { key: '1y',  label: '1 año' },
]
const period  = ref('7d')
const loading = ref(false)
const data    = ref<WalletAnalyticsResponse | null>(null)

const dayNames    = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const dayNamesFull = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const kpis = computed(() => {
  const s = data.value?.summary
  if (!s) return []
  const redemptionColor = s.redemptionRate >= 30 ? 'var(--primary-text)' : s.redemptionRate >= 10 ? 'var(--amber)' : 'var(--danger)'
  const inactiveColor   = s.inactiveCount > 0 ? '#F97316' : 'var(--primary-text)'
  return [
    { label: 'Pases emitidos',  value: s.totalIssued.toLocaleString(),      icon: 'issued',   color: 'var(--amber)' },
    { label: 'Pases activos',   value: s.activeCount.toLocaleString(),       icon: 'active',   color: 'var(--primary-text)' },
    { label: 'Escaneos',        value: s.totalScans.toLocaleString(),        icon: 'scan',     color: 'var(--primary-mid)' },
    { label: 'Canjes',          value: s.totalRedemptions.toLocaleString(),  icon: 'redeem',   color: '#8B5CF6' },
    {
      label: 'Tasa de canje',
      value: `${s.redemptionRate}%`,
      icon: 'rate',
      color: redemptionColor,
      valueColor: redemptionColor,
      tooltip: 'Porcentaje de interacciones que resultaron en un canje o redención',
    },
    {
      label: 'Pases inactivos',
      value: s.inactiveCount.toLocaleString(),
      subtext: 'sin actividad en 30 días',
      icon: 'inactive',
      color: inactiveColor,
      valueColor: inactiveColor,
    },
  ]
})

const bestHourLabel = computed(() => {
  const h = data.value?.insights?.bestHour
  return h == null ? null : `${String(h).padStart(2, '0')}:00`
})

const bestDayIndex = computed(() => data.value?.insights?.bestDayOfWeek ?? null)

const topCustomers    = computed(() => data.value?.insights?.topCustomers ?? [])
const customerBarMax  = computed(() => Math.max(...topCustomers.value.map(c => c.eventCount), 1))

// ── Redemption arc gauge (SVG semicircle) ──
const redemptionArc = computed(() => {
  const rate = data.value?.summary?.redemptionRate ?? 0
  const r = 28
  const circ = Math.PI * r       // half-circle circumference ≈ 88
  const dash = (rate / 100) * circ
  return { dasharray: `${dash.toFixed(1)} ${circ.toFixed(1)}`, circ: circ.toFixed(1) }
})

const kpiIconPaths: Record<string, string> = {
  issued:   '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M7 15h2M15 15h2"/>',
  active:   '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  scan:     '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v3M14 18v3M17 21h4"/>',
  redeem:   '<path d="M9 12l2 2 4-4"/><rect x="3" y="4" width="18" height="18" rx="2"/>',
  rate:     '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>',
  inactive: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
}

async function load() {
  const orgId = orgStore.activeOrgId
  if (!orgId || !walletId) return
  loading.value = true
  try {
    data.value = await apiClient.get<WalletAnalyticsResponse>(
      `/organizations/${orgId}/wallets/${walletId}/analytics?period=${period.value}`
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

    <!-- Header -->
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <button
        style="font-size: 13px; color: var(--text-muted); background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; font-family: inherit;"
        @click="router.back()"
      >
        ← Volver
      </button>
      <div style="display: flex; gap: 6px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; padding: 4px;">
        <button
          v-for="p in periods"
          :key="p.key"
          style="padding: 6px 14px; border-radius: 7px; font-size: 12.5px; font-weight: 600; border: none; cursor: pointer; transition: background 0.12s, color 0.12s; font-family: inherit;"
          :style="period === p.key ? { background: 'var(--primary)', color: 'var(--bg-surface)' } : { background: 'transparent', color: 'var(--text-muted)' }"
          @click="period = p.key"
        >{{ p.label }}</button>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="kpi-grid">
      <div v-for="i in 6" :key="i" style="height: 104px; background: var(--bg-surface); border-radius: 12px; border: 1px solid var(--border); animation: pulse 1.5s ease-in-out infinite;" />
    </div>

    <!-- KPI Cards -->
    <div v-else-if="data" class="kpi-grid">
      <div
        v-for="kpi in kpis"
        :key="kpi.label"
        style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 10px; cursor: default;"
        :title="kpi.tooltip ?? ''"
      >
        <div style="width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center;" :style="{ background: kpi.color + '18' }">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" :stroke="kpi.color" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="kpiIconPaths[kpi.icon]" />
        </div>
        <div>
          <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.03em; line-height: 1;" :style="{ color: kpi.valueColor ?? 'var(--text-ink)' }">{{ kpi.value }}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 3px; font-weight: 500;">{{ kpi.label }}</div>
          <div v-if="kpi.subtext" style="font-size: 10.5px; color: var(--text-faint); margin-top: 2px;">{{ kpi.subtext }}</div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!loading" style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 48px; text-align: center; color: var(--text-muted);">
      <p style="font-size: 14px; font-weight: 600; margin: 0 0 4px;">Sin datos para este período</p>
      <p style="font-size: 12px; margin: 0;">Prueba con un rango diferente</p>
    </div>

    <!-- Insights row: gauge + day grid + best hour -->
    <div v-if="data" class="insights-grid">

      <!-- Redemption gauge -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 12px;">
        <p style="font-size: 11px; font-weight: 700; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; margin: 0; align-self: flex-start;">Tasa de canje</p>
        <div style="position: relative; width: 120px; height: 64px; overflow: hidden;">
          <svg width="120" height="64" viewBox="0 0 80 44" style="overflow: visible;">
            <!-- Track -->
            <path d="M8,40 A32,32 0 0,1 72,40" fill="none" stroke="var(--bg-subtle)" stroke-width="7" stroke-linecap="round"/>
            <!-- Fill -->
            <path
              d="M8,40 A32,32 0 0,1 72,40"
              fill="none"
              :stroke="data.summary.redemptionRate >= 30 ? 'var(--primary)' : data.summary.redemptionRate >= 10 ? 'var(--amber)' : 'var(--danger)'"
              stroke-width="7"
              stroke-linecap="round"
              :stroke-dasharray="`${(data.summary.redemptionRate / 100) * 100.5} 100.5`"
            />
          </svg>
          <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); text-align: center;">
            <div style="font-size: 20px; font-weight: 800; line-height: 1;" :style="{ color: data.summary.redemptionRate >= 30 ? 'var(--primary)' : data.summary.redemptionRate >= 10 ? 'var(--amber)' : 'var(--danger)' }">
              {{ data.summary.redemptionRate }}%
            </div>
          </div>
        </div>
        <p style="font-size: 11px; color: var(--text-muted); margin: 0; text-align: center; line-height: 1.4;">de interacciones terminan en canje</p>
      </div>

      <!-- Day-of-week grid -->
      <div class="insights-day-card" style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px;">
        <p style="font-size: 11px; font-weight: 700; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 14px;">Mejor día de la semana</p>
        <div style="display: flex; gap: 6px;">
          <div
            v-for="(day, i) in dayNames"
            :key="i"
            style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 4px; border-radius: 10px; transition: all 0.2s; cursor: default;"
            :style="bestDayIndex === i
              ? { background: 'var(--primary)', color: 'var(--bg-surface)' }
              : { background: 'var(--bg-field)', color: 'var(--text-muted)' }"
          >
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">{{ day }}</span>
            <div style="width: 5px; height: 5px; border-radius: 999px;" :style="bestDayIndex === i ? { background: 'rgba(255,255,255,0.6)' } : { background: 'var(--border)' }" />
          </div>
        </div>
        <p style="font-size: 11px; color: var(--text-muted); margin: 12px 0 0; text-align: center;">
          {{ bestDayIndex != null ? `${dayNamesFull[bestDayIndex]} tiene mayor actividad histórica` : 'Sin datos suficientes' }}
        </p>
      </div>

      <!-- Best hour -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 8px;">
        <p style="font-size: 11px; font-weight: 700; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; margin: 0;">Mejor horario</p>
        <div style="margin-top: auto;">
          <div style="font-size: 32px; font-weight: 800; color: var(--text-ink); letter-spacing: -0.03em; line-height: 1;">
            {{ bestHourLabel ?? '—' }}
          </div>
          <p style="font-size: 11px; color: var(--text-muted); margin: 6px 0 0;">Mayor actividad del día</p>
        </div>
      </div>
    </div>

    <!-- Top clientes — horizontal bar chart -->
    <div v-if="data" style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden;">
      <div style="padding: 18px 20px 14px; border-bottom: 1px solid var(--bg-subtle);">
        <h3 style="font-size: 14px; font-weight: 700; color: var(--text-ink); margin: 0;">Top clientes</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0;">Clientes con más interacciones en el período</p>
      </div>

      <div v-if="topCustomers.length" style="padding: 16px 20px; display: flex; flex-direction: column; gap: 10px;">
        <div
          v-for="(c, i) in topCustomers.slice(0, 10)"
          :key="i"
          style="display: flex; align-items: center; gap: 12px;"
        >
          <!-- Rank/crown -->
          <div style="width: 22px; text-align: center; flex-shrink: 0;">
            <span v-if="i === 0" style="font-size: 14px;" title="Top cliente">👑</span>
            <span v-else style="font-size: 11px; font-weight: 700; color: var(--text-faint);">{{ i + 1 }}</span>
          </div>

          <!-- Name -->
          <div class="customer-name" style="font-size: 12.5px; font-weight: 600; color: var(--text-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            {{ c.firstName }} {{ c.lastName }}
          </div>

          <!-- Bar -->
          <div style="flex: 1; height: 8px; background: var(--bg-subtle); border-radius: 999px; overflow: hidden;">
            <div
              style="height: 100%; border-radius: 999px; background: linear-gradient(to right, var(--primary-text), var(--primary-mid)); transition: width 0.5s ease;"
              :style="{ width: `${(c.eventCount / customerBarMax) * 100}%` }"
            />
          </div>

          <!-- Count -->
          <span style="font-size: 12.5px; font-weight: 700; color: var(--primary-text); min-width: 32px; text-align: right; flex-shrink: 0;">
            {{ c.eventCount }}
          </span>
        </div>
      </div>

      <p v-else style="font-size: 13px; color: var(--text-faint); text-align: center; padding: 32px 20px; margin: 0;">
        Sin datos suficientes
      </p>
    </div>

  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
}

.insights-grid {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 16px;
  align-items: stretch;
}

.customer-name {
  width: 150px;
  flex-shrink: 0;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@media (max-width: 1100px) {
  .kpi-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .insights-grid { grid-template-columns: 1fr 1fr; }
  .insights-day-card {
    order: 1;
    grid-column: 1 / -1;
  }
  .customer-name { width: auto; flex: 1; max-width: 120px; }
}

@media (max-width: 520px) {
  .insights-grid { grid-template-columns: 1fr; }
  .insights-day-card { order: 0; grid-column: auto; }
}
</style>
