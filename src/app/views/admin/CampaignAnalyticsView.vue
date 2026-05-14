<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '@/infrastructure/http/ApiClient'

const route  = useRoute()
const router = useRouter()
const id     = route.params.id as string

type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
type Channel        = 'sms' | 'email' | 'wallet_push'
type SegmentType    = 'all_org' | 'all_wallet' | 'near_completion' | 'inactive' | 'never_redeemed' | 'cashback_balance_gte' | 'frequent_visitors' | 'new_customers'

interface Campaign {
  id: string
  name: string
  channel: Channel
  status: CampaignStatus
  segment?: { type: SegmentType }
  segmentType?: SegmentType
  scheduledAt?: string
  sentAt?: string
  createdAt: string
  audienceSize?: number
  recipientCount?: number
  totalRecipients?: number
  delivered?: number
  totalSent?: number
  totalFailed?: number
  opened?: number
  messageTemplate?: string
  message?: string
}

interface CampaignStats {
  delivery: { sent: number; failed: number; skipped: number }
  conversions: number
  conversionRate: number
  avgHoursToConvert: number | null
  windowDays: number
}

const loading      = ref(false)
const statsLoading = ref(false)
const campaign     = ref<Campaign | null>(null)
const stats        = ref<CampaignStats | null>(null)
const windowDays   = ref<1 | 7 | 14 | 30>(7)

// ── Campaign derived ──
const audience  = computed(() => campaign.value?.audienceSize ?? campaign.value?.recipientCount ?? campaign.value?.totalRecipients ?? 0)
const delivered = computed(() => stats.value?.delivery.sent ?? campaign.value?.delivered ?? campaign.value?.totalSent ?? 0)
const failed    = computed(() => stats.value?.delivery.failed ?? campaign.value?.totalFailed ?? 0)
const skipped   = computed(() => stats.value?.delivery.skipped ?? 0)
const opened    = computed(() => campaign.value?.opened ?? 0)

const deliveryRate  = computed(() => audience.value  > 0 ? +(delivered.value / audience.value  * 100).toFixed(1) : 0)
const openRate      = computed(() => delivered.value > 0 ? +(opened.value    / delivered.value * 100).toFixed(1) : 0)
const failRate      = computed(() => audience.value  > 0 ? +(failed.value    / audience.value  * 100).toFixed(1) : 0)
const skippedRate   = computed(() => audience.value  > 0 ? +(skipped.value   / audience.value  * 100).toFixed(1) : 0)

// ── Stats derived ──
const convRate      = computed(() => stats.value?.conversionRate ?? 0)
const conversions   = computed(() => stats.value?.conversions ?? 0)
const avgHours      = computed(() => stats.value?.avgHoursToConvert ?? null)

const deliveryColor    = computed(() => deliveryRate.value >= 90 ? 'var(--primary-text)' : deliveryRate.value >= 70 ? 'var(--amber)' : 'var(--danger)')
const openColor        = computed(() => openRate.value >= 30 ? 'var(--primary-text)' : openRate.value >= 15 ? 'var(--amber)' : 'var(--text-muted)')
const conversionColor  = computed(() => convRate.value >= 30 ? '#8B5CF6' : convRate.value >= 15 ? 'var(--amber)' : 'var(--text-muted)')

const hasStats = computed(() => campaign.value?.status === 'sent' || campaign.value?.status === 'sending')

// SVG gauge arc (semicircle M9,45 A36,36 0 0,1 81,45 → half-circumference ≈ 113.1)
function gaugeArc(pct: number) {
  const half = Math.PI * 36
  const filled = Math.min(Math.max(pct, 0), 100) / 100 * half
  return `${filled.toFixed(2)} ${half.toFixed(2)}`
}

// Avg hours display helper
const avgHoursLabel = computed(() => {
  if (avgHours.value === null) return null
  if (avgHours.value < 1) return `${Math.round(avgHours.value * 60)} min`
  if (avgHours.value < 24) return `${avgHours.value.toFixed(1)} hrs`
  return `${(avgHours.value / 24).toFixed(1)} días`
})

const kpiIconPaths: Record<string, string> = {
  audience:    '<circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="7" r="2.5"/><path d="M16 14c3.5 0 6 2.5 6 6"/>',
  check:       '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  skip:        '<circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>',
  fail:        '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  rate:        '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>',
  eye:         '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  conversion:  '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/><path d="M3 3l18 18"/>',
  clock:       '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
}

const kpis = computed(() => {
  if (!campaign.value) return []
  return [
    { label: 'Audiencia',       value: audience.value.toLocaleString(),       icon: 'audience',   color: 'var(--primary-mid)' },
    { label: 'Entregados',      value: delivered.value.toLocaleString(),      icon: 'check',      color: 'var(--primary-text)',           valueColor: 'var(--primary-text)' },
    { label: 'Omitidos',        value: skipped.value.toLocaleString(),        icon: 'skip',       color: 'var(--text-faint)',           valueColor: skipped.value > 0 ? 'var(--text-muted)' : 'var(--text-faint)' },
    { label: 'Tasa de entrega', value: `${deliveryRate.value}%`,              icon: 'rate',       color: deliveryColor.value, valueColor: deliveryColor.value },
    { label: 'Aperturas',       value: opened.value > 0 ? opened.value.toLocaleString() : '—', icon: 'eye', color: '#0EA5E9', valueColor: opened.value > 0 ? '#0EA5E9' : 'var(--text-faint)' },
    { label: 'Fallidos',        value: failed.value.toLocaleString(),         icon: 'fail',       color: failed.value > 0 ? '#F97316' : 'var(--text-faint)', valueColor: failed.value > 0 ? '#F97316' : 'var(--text-faint)' },
  ]
})

const statusConfig: Record<CampaignStatus, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Borrador',   bg: 'var(--bg-subtle)', color: 'var(--text-muted)' },
  scheduled: { label: 'Programada', bg: 'var(--info-bg)', color: 'var(--info)' },
  sending:   { label: 'Enviando',   bg: 'var(--warning-bg)', color: 'var(--warning)' },
  sent:      { label: 'Enviada',    bg: 'var(--success-bg)', color: 'var(--success)' },
  cancelled: { label: 'Cancelada',  bg: 'var(--danger-bg)', color: 'var(--danger)' },
}

const channelLabels: Record<Channel, string>   = { sms: 'SMS', email: 'Email', wallet_push: 'WhatsApp' }
const segmentLabels: Record<SegmentType, string> = {
  all_org:              'Toda la organización',
  all_wallet:           'Todos los clientes del wallet',
  near_completion:      'Cerca de completar',
  inactive:             'Inactivos',
  never_redeemed:       'Nunca canjearon',
  cashback_balance_gte: 'Saldo cashback suficiente',
  frequent_visitors:    'Visitantes frecuentes',
  new_customers:        'Clientes nuevos',
}

function segmentType(c: Campaign): SegmentType {
  return (c.segment?.type ?? c.segmentType ?? 'all_org') as SegmentType
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

async function loadCampaign() {
  loading.value = true
  try {
    campaign.value = await apiClient.get<Campaign>(`/campaigns/${id}`)
  } catch {
    campaign.value = null
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  if (!hasStats.value) return
  statsLoading.value = true
  try {
    stats.value = await apiClient.get<CampaignStats>(`/campaigns/${id}/stats?windowDays=${windowDays.value}`)
  } catch {
    stats.value = null
  } finally {
    statsLoading.value = false
  }
}

watch(windowDays, loadStats)

onMounted(async () => {
  await loadCampaign()
  await loadStats()
})
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 20px; max-width: 1200px;">

    <!-- Header -->
    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
      <button
        style="font-size: 13px; color: var(--text-muted); background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; font-family: inherit; flex-shrink: 0;"
        @click="router.back()"
      >← Volver</button>
      <template v-if="campaign">
        <h2 style="font-size: 16px; font-weight: 700; color: var(--text-ink); margin: 0; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          {{ campaign.name }}
        </h2>
        <span
          style="font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 999px; flex-shrink: 0;"
          :style="{ background: statusConfig[campaign.status].bg, color: statusConfig[campaign.status].color }"
        >{{ statusConfig[campaign.status].label }}</span>
      </template>
    </div>

    <!-- Skeleton loading -->
    <div v-if="loading" class="kpi-grid">
      <div v-for="i in 6" :key="i" style="height: 104px; background: var(--bg-surface); border-radius: 14px; border: 1px solid var(--border); animation: pulse 1.5s ease-in-out infinite;" />
    </div>

    <!-- Not found -->
    <div v-else-if="!campaign" style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 48px; text-align: center; color: var(--text-muted);">
      <p style="font-size: 14px; font-weight: 600; margin: 0 0 4px;">Campaña no encontrada</p>
    </div>

    <template v-else>

      <!-- Campaign info banner -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px 20px; display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start;">
        <div style="display: flex; gap: 8px; flex-wrap: wrap; flex: 1; align-items: center;">
          <span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px; background: var(--bg-field); border-radius: 7px; font-size: 12px; font-weight: 600; color: var(--text-medium);">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--primary-text)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            {{ channelLabels[campaign.channel] }}
          </span>
          <span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px; background: var(--bg-field); border-radius: 7px; font-size: 12px; font-weight: 600; color: var(--text-medium);">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--primary-text)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6"/>
            </svg>
            {{ segmentLabels[segmentType(campaign)] }}
          </span>
          <span v-if="campaign.sentAt" style="font-size: 12px; color: var(--text-muted);">Enviado {{ formatDate(campaign.sentAt) }}</span>
          <span v-else-if="campaign.scheduledAt" style="display: inline-flex; padding: 4px 11px; background: var(--info-bg); border-radius: 7px; font-size: 12px; color: var(--info); font-weight: 600;">
            Programado {{ formatDate(campaign.scheduledAt) }}
          </span>
        </div>
        <div
          v-if="campaign.messageTemplate || campaign.message"
          style="width: 100%; background: var(--bg-field); border-radius: 10px; padding: 11px 14px; font-size: 12.5px; color: var(--text-medium); line-height: 1.6; white-space: pre-wrap; word-break: break-word; max-height: 72px; overflow: hidden; mask-image: linear-gradient(to bottom, black 55%, transparent 100%);"
        >{{ campaign.messageTemplate ?? campaign.message }}</div>
      </div>

      <!-- No stats yet -->
      <div
        v-if="!hasStats"
        style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 40px; text-align: center;"
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" stroke-linecap="round" style="margin: 0 auto 12px; display: block;">
          <path d="M3 21V5M3 21h18"/><path d="M7 17v-5M11 17V9M15 17v-3M19 17V7"/>
        </svg>
        <p style="font-size: 14px; font-weight: 600; color: var(--text-ink); margin: 0 0 4px;">Sin métricas aún</p>
        <p style="font-size: 12px; color: var(--text-muted); margin: 0;">
          Las métricas estarán disponibles cuando la campaña esté en estado <strong>Enviando</strong> o <strong>Enviada</strong>.
        </p>
      </div>

      <template v-else>

        <!-- ── KPI Cards ── -->
        <div class="kpi-grid">
          <div
            v-for="kpi in kpis"
            :key="kpi.label"
            style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 10px;"
          >
            <div
              style="width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center;"
              :style="{ background: kpi.color + '18' }"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" :stroke="kpi.color" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="kpiIconPaths[kpi.icon]" />
            </div>
            <div>
              <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.03em; line-height: 1;" :style="{ color: kpi.valueColor ?? 'var(--text-ink)' }">{{ kpi.value }}</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 3px; font-weight: 500;">{{ kpi.label }}</div>
            </div>
          </div>
        </div>

        <!-- ── Delivery + Open gauges ── -->
        <div class="gauges-grid">

          <!-- Delivery gauge -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 22px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
            <p style="font-size: 11px; font-weight: 700; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; margin: 0; align-self: flex-start;">Tasa de entrega</p>
            <div style="position: relative; width: 140px; height: 76px; overflow: hidden; flex-shrink: 0;">
              <svg width="140" height="76" viewBox="0 0 90 48" style="overflow: visible;">
                <path d="M9,45 A36,36 0 0,1 81,45" fill="none" stroke="var(--bg-subtle)" stroke-width="8" stroke-linecap="round"/>
                <path d="M9,45 A36,36 0 0,1 81,45" fill="none" :stroke="deliveryColor" stroke-width="8" stroke-linecap="round"
                  :stroke-dasharray="gaugeArc(deliveryRate)" stroke-dashoffset="0"/>
              </svg>
              <div style="position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); text-align: center; white-space: nowrap;">
                <div style="font-size: 22px; font-weight: 800; line-height: 1; letter-spacing: -0.03em;" :style="{ color: deliveryColor }">{{ deliveryRate }}%</div>
              </div>
            </div>
            <p style="font-size: 11px; color: var(--text-muted); margin: 0; text-align: center;">
              {{ delivered.toLocaleString() }} de {{ audience.toLocaleString() }}
            </p>
          </div>

          <!-- Open rate gauge (shown only if has opens) -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 22px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
            <p style="font-size: 11px; font-weight: 700; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; margin: 0; align-self: flex-start;">Tasa de apertura</p>
            <div style="position: relative; width: 140px; height: 76px; overflow: hidden; flex-shrink: 0;">
              <svg width="140" height="76" viewBox="0 0 90 48" style="overflow: visible;">
                <path d="M9,45 A36,36 0 0,1 81,45" fill="none" stroke="var(--bg-subtle)" stroke-width="8" stroke-linecap="round"/>
                <path d="M9,45 A36,36 0 0,1 81,45" fill="none" :stroke="openColor" stroke-width="8" stroke-linecap="round"
                  :stroke-dasharray="gaugeArc(openRate)" stroke-dashoffset="0"/>
              </svg>
              <div style="position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); text-align: center; white-space: nowrap;">
                <div style="font-size: 22px; font-weight: 800; line-height: 1; letter-spacing: -0.03em;" :style="{ color: openColor }">
                  {{ opened > 0 ? `${openRate}%` : '—' }}
                </div>
              </div>
            </div>
            <p style="font-size: 11px; color: var(--text-muted); margin: 0; text-align: center;">
              {{ opened > 0 ? `${opened.toLocaleString()} de ${delivered.toLocaleString()} entregados` : 'Sin datos de apertura' }}
            </p>
          </div>

          <!-- Breakdown mini (fallidos + omitidos) -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 22px; display: flex; flex-direction: column; gap: 14px;">
            <p style="font-size: 11px; font-weight: 700; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; margin: 0;">Problemas de entrega</p>
            <div v-if="failed === 0 && skipped === 0" style="display: flex; align-items: center; gap: 8px; padding: 12px; background: var(--bg-green); border-radius: 10px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-text)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span style="font-size: 12.5px; font-weight: 600; color: var(--primary-text);">Entrega perfecta</span>
            </div>
            <template v-else>
              <!-- Fallidos -->
              <div v-if="failed > 0">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 8px; height: 8px; border-radius: 2px; background: #F97316;" />
                    <span style="font-size: 12px; color: var(--text-medium); font-weight: 500;">Fallidos</span>
                  </div>
                  <span style="font-size: 12px; font-weight: 700; color: #F97316;">{{ failed.toLocaleString() }} <span style="font-weight: 400; color: var(--text-faint);">{{ failRate }}%</span></span>
                </div>
                <div style="height: 6px; background: #FEF3EA; border-radius: 999px; overflow: hidden;">
                  <div style="height: 100%; background: #F97316; border-radius: 999px;" :style="{ width: `${failRate}%` }" />
                </div>
              </div>
              <!-- Omitidos -->
              <div v-if="skipped > 0">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 8px; height: 8px; border-radius: 2px; background: var(--text-faint);" />
                    <span style="font-size: 12px; color: var(--text-medium); font-weight: 500;">Omitidos</span>
                  </div>
                  <span style="font-size: 12px; font-weight: 700; color: var(--text-muted);">{{ skipped.toLocaleString() }} <span style="font-weight: 400; color: var(--text-faint);">{{ skippedRate }}%</span></span>
                </div>
                <div style="height: 6px; background: var(--bg-subtle); border-radius: 999px; overflow: hidden;">
                  <div style="height: 100%; background: var(--text-faint); border-radius: 999px;" :style="{ width: `${skippedRate}%` }" />
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- ── Conversiones section ── -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden;">

          <!-- Section header + window selector -->
          <div style="padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
            <div>
              <h3 style="font-size: 14px; font-weight: 700; color: var(--text-ink); margin: 0 0 2px;">Conversiones</h3>
              <p style="font-size: 12px; color: var(--text-muted); margin: 0;">Clientes que recibieron la campaña y después escanearon su pase</p>
            </div>
            <div style="display: flex; gap: 2px; padding: 3px; background: var(--bg-subtle); border-radius: 9px; flex-shrink: 0;">
              <button
                v-for="w in ([1, 7, 14, 30] as const)"
                :key="w"
                style="padding: 5px 14px; border-radius: 7px; font-size: 12px; font-weight: 600; border: none; cursor: pointer; transition: all 0.12s; font-family: inherit;"
                :style="windowDays === w
                  ? { background: 'var(--bg-surface)', color: 'var(--text-ink)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                  : { background: 'transparent', color: 'var(--text-muted)' }"
                @click="windowDays = w"
              >{{ w }}d</button>
            </div>
          </div>

          <!-- Stats body -->
          <div style="padding: 20px;">

            <!-- Loading state -->
            <div v-if="statsLoading" style="display: flex; align-items: center; justify-content: center; padding: 32px; gap: 10px; color: var(--text-muted); font-size: 13px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="2" stroke-linecap="round" style="animation: spin 1s linear infinite;">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
              Calculando…
            </div>

            <div v-else-if="!stats" style="text-align: center; padding: 24px; color: var(--text-faint); font-size: 13px;">
              No se pudieron cargar las estadísticas de conversión.
            </div>

            <div v-else class="conversion-grid">

              <!-- Gauge conversión -->
              <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 8px;">
                <div style="position: relative; width: 160px; height: 88px; overflow: hidden; flex-shrink: 0;">
                  <svg width="160" height="88" viewBox="0 0 90 48" style="overflow: visible;">
                    <path d="M9,45 A36,36 0 0,1 81,45" fill="none" stroke="var(--bg-subtle)" stroke-width="9" stroke-linecap="round"/>
                    <path d="M9,45 A36,36 0 0,1 81,45" fill="none" :stroke="conversionColor" stroke-width="9" stroke-linecap="round"
                      :stroke-dasharray="gaugeArc(convRate)" stroke-dashoffset="0"
                      style="transition: stroke-dasharray 0.5s ease;"
                    />
                  </svg>
                  <div style="position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); text-align: center; white-space: nowrap;">
                    <div style="font-size: 26px; font-weight: 800; line-height: 1; letter-spacing: -0.04em;" :style="{ color: conversionColor }">
                      {{ convRate.toFixed(1) }}%
                    </div>
                  </div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 12px; font-weight: 600; color: var(--text-medium);">Tasa de conversión</div>
                  <div style="font-size: 11px; color: var(--text-faint); margin-top: 2px;">en {{ windowDays }} día{{ windowDays === 1 ? '' : 's' }}</div>
                </div>
              </div>

              <!-- Conversiones count -->
              <div style="display: flex; flex-direction: column; justify-content: center; gap: 16px; padding: 8px 12px; border-left: 1px solid var(--bg-subtle); border-right: 1px solid var(--bg-subtle);">
                <div>
                  <div style="font-size: 48px; font-weight: 800; letter-spacing: -0.04em; line-height: 1;" :style="{ color: conversionColor }">
                    {{ conversions.toLocaleString() }}
                  </div>
                  <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px; font-weight: 500;">
                    conversiones en {{ windowDays }}d
                  </div>
                </div>
                <!-- Context label -->
                <div
                  style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; align-self: flex-start;"
                  :style="convRate >= 30
                    ? { background: 'var(--bg-green)', color: 'var(--primary-text)' }
                    : convRate >= 15
                      ? { background: 'var(--warning-bg)', color: 'var(--warning)' }
                      : { background: 'var(--bg-field)', color: 'var(--text-muted)' }"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <template v-if="convRate >= 15">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                    </template>
                    <template v-else>
                      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
                    </template>
                  </svg>
                  <span style="font-size: 12px; font-weight: 600;">
                    {{ convRate >= 30 ? 'Excelente resultado' : convRate >= 15 ? 'Buen resultado' : 'Margen de mejora' }}
                  </span>
                </div>
              </div>

              <!-- Avg hours to convert -->
              <div style="display: flex; flex-direction: column; justify-content: center; gap: 14px; padding: 8px 8px 8px 16px;">
                <div>
                  <div style="font-size: 11px; font-weight: 700; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px;">
                    Tiempo hasta conversión
                  </div>
                  <div v-if="avgHoursLabel" style="display: flex; align-items: baseline; gap: 6px;">
                    <span style="font-size: 36px; font-weight: 800; color: var(--text-ink); letter-spacing: -0.04em; line-height: 1;">{{ avgHoursLabel }}</span>
                  </div>
                  <div v-else style="font-size: 28px; font-weight: 800; color: var(--text-faint); letter-spacing: -0.04em; line-height: 1;">—</div>
                  <div style="font-size: 12px; color: var(--text-muted); margin-top: 5px;">
                    {{ avgHoursLabel ? 'promedio entre envío y primera visita' : 'sin conversiones en esta ventana' }}
                  </div>
                </div>

                <!-- Speed indicator -->
                <div v-if="avgHours !== null" style="display: flex; flex-direction: column; gap: 4px;">
                  <div style="display: flex; gap: 3px;">
                    <div
                      v-for="n in 5" :key="n"
                      style="flex: 1; height: 5px; border-radius: 2px; transition: background 0.3s;"
                      :style="{
                        background: n <= (avgHours! < 2 ? 5 : avgHours! < 6 ? 4 : avgHours! < 12 ? 3 : avgHours! < 24 ? 2 : 1) ? '#8B5CF6' : 'var(--bg-subtle)'
                      }"
                    />
                  </div>
                  <div style="font-size: 10px; color: var(--text-faint);">
                    {{ avgHours! < 2 ? 'Muy rápido' : avgHours! < 6 ? 'Rápido' : avgHours! < 12 ? 'Moderado' : avgHours! < 24 ? 'Lento' : 'Muy lento' }}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- ── Delivery funnel bars ── -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px;">
          <h3 style="font-size: 14px; font-weight: 700; color: var(--text-ink); margin: 0 0 16px;">Embudo de entrega</h3>
          <div style="display: flex; flex-direction: column; gap: 11px;">

            <!-- Audiencia -->
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 9px; height: 9px; border-radius: 2px; background: var(--primary-mid); flex-shrink: 0;" />
              <span style="font-size: 12px; color: var(--text-medium); font-weight: 500; width: 110px; flex-shrink: 0;">Audiencia total</span>
              <div style="flex: 1; height: 9px; background: var(--bg-subtle); border-radius: 999px; overflow: hidden;">
                <div style="height: 100%; background: var(--primary-mid); border-radius: 999px;" style2="width: 100%" :style="{ width: '100%' }" />
              </div>
              <span style="font-size: 12px; font-weight: 700; color: var(--primary-mid); min-width: 52px; text-align: right;">{{ audience.toLocaleString() }}</span>
              <span style="font-size: 11px; color: var(--text-faint); min-width: 38px; text-align: right;">100%</span>
            </div>

            <!-- Entregados -->
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 9px; height: 9px; border-radius: 2px; background: var(--primary-text); flex-shrink: 0;" />
              <span style="font-size: 12px; color: var(--text-medium); font-weight: 500; width: 110px; flex-shrink: 0;">Entregados</span>
              <div style="flex: 1; height: 9px; background: var(--bg-subtle); border-radius: 999px; overflow: hidden;">
                <div style="height: 100%; background: var(--primary-text); border-radius: 999px; transition: width 0.5s;" :style="{ width: `${deliveryRate}%` }" />
              </div>
              <span style="font-size: 12px; font-weight: 700; color: var(--primary-text); min-width: 52px; text-align: right;">{{ delivered.toLocaleString() }}</span>
              <span style="font-size: 11px; color: var(--text-faint); min-width: 38px; text-align: right;">{{ deliveryRate }}%</span>
            </div>

            <!-- Aperturas -->
            <div v-if="opened > 0" style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 9px; height: 9px; border-radius: 2px; background: #0EA5E9; flex-shrink: 0;" />
              <span style="font-size: 12px; color: var(--text-medium); font-weight: 500; width: 110px; flex-shrink: 0;">Aperturas</span>
              <div style="flex: 1; height: 9px; background: var(--bg-subtle); border-radius: 999px; overflow: hidden;">
                <div style="height: 100%; background: #0EA5E9; border-radius: 999px; transition: width 0.5s;" :style="{ width: `${openRate}%` }" />
              </div>
              <span style="font-size: 12px; font-weight: 700; color: #0EA5E9; min-width: 52px; text-align: right;">{{ opened.toLocaleString() }}</span>
              <span style="font-size: 11px; color: var(--text-faint); min-width: 38px; text-align: right;">{{ openRate }}%</span>
            </div>

            <!-- Conversiones (from stats) -->
            <div v-if="stats && conversions > 0" style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 9px; height: 9px; border-radius: 2px; background: #8B5CF6; flex-shrink: 0;" />
              <span style="font-size: 12px; color: var(--text-medium); font-weight: 500; width: 110px; flex-shrink: 0;">Convirtieron</span>
              <div style="flex: 1; height: 9px; background: var(--bg-subtle); border-radius: 999px; overflow: hidden;">
                <div style="height: 100%; background: #8B5CF6; border-radius: 999px; transition: width 0.5s;" :style="{ width: `${convRate}%` }" />
              </div>
              <span style="font-size: 12px; font-weight: 700; color: #8B5CF6; min-width: 52px; text-align: right;">{{ conversions.toLocaleString() }}</span>
              <span style="font-size: 11px; color: var(--text-faint); min-width: 38px; text-align: right;">{{ convRate.toFixed(1) }}%</span>
            </div>

            <!-- Fallidos -->
            <div v-if="failed > 0" style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 9px; height: 9px; border-radius: 2px; background: #F97316; flex-shrink: 0;" />
              <span style="font-size: 12px; color: var(--text-medium); font-weight: 500; width: 110px; flex-shrink: 0;">Fallidos</span>
              <div style="flex: 1; height: 9px; background: #FEF3EA; border-radius: 999px; overflow: hidden;">
                <div style="height: 100%; background: #F97316; border-radius: 999px; transition: width 0.5s;" :style="{ width: `${failRate}%` }" />
              </div>
              <span style="font-size: 12px; font-weight: 700; color: #F97316; min-width: 52px; text-align: right;">{{ failed.toLocaleString() }}</span>
              <span style="font-size: 11px; color: var(--text-faint); min-width: 38px; text-align: right;">{{ failRate }}%</span>
            </div>

            <!-- Omitidos -->
            <div v-if="skipped > 0" style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 9px; height: 9px; border-radius: 2px; background: var(--border); flex-shrink: 0;" />
              <span style="font-size: 12px; color: var(--text-medium); font-weight: 500; width: 110px; flex-shrink: 0;">Omitidos</span>
              <div style="flex: 1; height: 9px; background: var(--bg-subtle); border-radius: 999px; overflow: hidden;">
                <div style="height: 100%; background: var(--border); border-radius: 999px; transition: width 0.5s;" :style="{ width: `${skippedRate}%` }" />
              </div>
              <span style="font-size: 12px; font-weight: 700; color: var(--text-muted); min-width: 52px; text-align: right;">{{ skipped.toLocaleString() }}</span>
              <span style="font-size: 11px; color: var(--text-faint); min-width: 38px; text-align: right;">{{ skippedRate }}%</span>
            </div>

          </div>
        </div>

      </template>
    </template>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
}
.gauges-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}
.conversion-grid {
  display: grid;
  grid-template-columns: 200px 1fr 1fr;
  gap: 0;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@media (max-width: 1100px) {
  .kpi-grid { grid-template-columns: repeat(3, 1fr); }
  .gauges-grid { grid-template-columns: 1fr 1fr; }
  .conversion-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 680px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .gauges-grid { grid-template-columns: 1fr; }
  .conversion-grid { grid-template-columns: 1fr; }
}
</style>
