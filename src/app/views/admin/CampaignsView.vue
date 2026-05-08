<script setup lang="ts">
import { ref, computed, onMounted, reactive, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient, ApiError } from '@/infrastructure/http/ApiClient'
import { useWalletStore } from '@/app/stores/wallet/WalletStore'

const router = useRouter()
const walletStore = useWalletStore()

type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
type Channel = 'sms' | 'email' | 'wallet_push'
type SegmentType =
  | 'all_org' | 'all_wallet' | 'near_completion' | 'inactive'
  | 'never_redeemed' | 'cashback_balance_gte' | 'frequent_visitors' | 'new_customers'

interface Campaign {
  id: string
  name: string
  channel: Channel
  status: CampaignStatus
  segment?: { type: SegmentType }
  segmentType?: SegmentType
  scheduledAt?: string
  sentAt?: string
  audienceSize?: number
  recipientCount?: number
  totalRecipients?: number
  delivered?: number
  totalSent?: number
  totalFailed?: number
  opened?: number
  messageTemplate?: string
  message?: string
  createdAt: string
  smsCost?: { creditsNeeded: number; creditsAvailable: number; hasEnough: boolean }
}

function audienceCount(c: Campaign): number | null {
  return c.audienceSize ?? c.recipientCount ?? c.totalRecipients ?? null
}

function deliveredCount(c: Campaign): number | null {
  return c.delivered ?? c.totalSent ?? null
}

interface SmsCost { segmentsPerMessage: number; creditsNeeded: number; creditsAvailable: number; hasEnough: boolean; exceedsLimit?: boolean }
interface AudiencePreview { count: number; sample: { firstName: string; lastName: string; phone?: string }[]; smsCost?: SmsCost }

const loading = ref(false)
const campaigns = ref<Campaign[]>([])
const activeFilter = ref<string>('all')
const campaignsPage = ref(1)
const campaignsMeta = ref({ total: 0, page: 1, limit: 20, totalPages: 1 })

const filters = [
  { key: 'all',       label: 'Todas' },
  { key: 'draft',     label: 'Borrador' },
  { key: 'scheduled', label: 'Programada' },
  { key: 'sending',   label: 'Enviando' },
  { key: 'sent',      label: 'Enviada' },
]

const filtered = computed(() =>
  activeFilter.value === 'all'
    ? campaigns.value
    : campaigns.value.filter((c) => c.status === activeFilter.value)
)

async function load(page = 1) {
  loading.value = true
  try {
    const res = await apiClient.get<{ data: Campaign[]; meta: typeof campaignsMeta.value }>(`/campaigns?page=${page}&limit=20`)
    campaigns.value = res?.data ?? []
    if (res?.meta) campaignsMeta.value = res.meta
  } catch {
    campaigns.value = []
  } finally {
    loading.value = false
  }
}

async function goToCampaignsPage(page: number) {
  campaignsPage.value = page
  await load(page)
}

onMounted(async () => {
  await Promise.all([load(), walletStore.fetchWallets()])
})

// ── Status config ──
const statusConfig: Record<CampaignStatus, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Borrador',   bg: '#F3F5F2', color: '#6B7A72' },
  scheduled: { label: 'Programada', bg: '#EFF6FF', color: '#1D4ED8' },
  sending:   { label: 'Enviando',   bg: '#FEF9C3', color: '#854D0E' },
  sent:      { label: 'Enviada',    bg: '#D1FAE5', color: '#065F46' },
  cancelled: { label: 'Cancelada',  bg: '#FEE2E2', color: '#991B1B' },
}

const channelLabels: Record<Channel, string> = {
  sms:         'SMS',
  email:       'Email',
  wallet_push: 'WhatsApp',
}

const channelIcons: Record<Channel, string> = {
  sms:         '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
  email:       '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  wallet_push: '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.855L.054 23.454a.5.5 0 0 0 .492.592l5.797-1.52A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.028-1.384l-.36-.214-3.733.979 1-3.64-.235-.374A9.818 9.818 0 1 1 12 21.818z"/>',
}

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

function progressPct(c: Campaign) {
  const total = audienceCount(c)
  const sent = deliveredCount(c)
  if (!total || !sent) return 0
  return Math.min(100, Math.round((sent / total) * 100))
}

function campaignSegmentType(c: Campaign): SegmentType {
  return (c.segment?.type ?? c.segmentType ?? 'all_org') as SegmentType
}

function campaignMessage(c: Campaign): string {
  return c.messageTemplate ?? c.message ?? ''
}

function formatDate(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

// ── Create modal ──
const showModal = ref(false)
const step = ref(1)
const creating = ref(false)
const createError = ref('')
const audiencePreview = ref<AudiencePreview | null>(null)
const loadingPreview = ref(false)

const form = reactive({
  name: '',
  channel: 'sms' as Channel,
  segmentType: 'all_org' as SegmentType,
  walletId: '',
  messageTemplate: '',
  scheduledAt: '',
  // segment extra fields
  thresholdPercent: 80,
  inactiveDays: 30,
  minBalance: 0,
  minEvents: 3,
  withinDays: '',
})

const segments: { key: SegmentType; label: string }[] = [
  { key: 'all_org',              label: 'Toda la organización' },
  { key: 'all_wallet',           label: 'Todos los clientes del wallet' },
  { key: 'near_completion',      label: 'Cerca de completar (sellos/puntos)' },
  { key: 'inactive',             label: 'Inactivos (sin visitar N días)' },
  { key: 'never_redeemed',       label: 'Nunca canjearon' },
  { key: 'cashback_balance_gte', label: 'Saldo cashback suficiente' },
  { key: 'frequent_visitors',    label: 'Visitantes frecuentes' },
  { key: 'new_customers',        label: 'Clientes nuevos (<7 días)' },
]

const needsWallet = computed(() =>
  ['all_wallet', 'near_completion'].includes(form.segmentType)
)

function buildSegment(): Record<string, unknown> {
  const base: Record<string, unknown> = { type: form.segmentType }
  if (needsWallet.value && form.walletId) base.walletId = form.walletId
  if (form.segmentType === 'near_completion') base.thresholdPercent = form.thresholdPercent
  if (form.segmentType === 'inactive') base.inactiveDays = form.inactiveDays
  if (form.segmentType === 'cashback_balance_gte') base.minBalance = form.minBalance
  if (form.segmentType === 'frequent_visitors') {
    base.minEvents = form.minEvents
    if (form.withinDays) base.withinDays = Number(form.withinDays)
  }
  return base
}

const textareaRef = ref<HTMLTextAreaElement | null>(null)

const selectedWallet = computed(() => walletStore.wallets.find((w) => w.id === form.walletId))

interface MsgVar { label: string; desc: string }
const messageVars = computed<MsgVar[]>(() => {
  const base: MsgVar[] = [
    { label: '{{firstName}}',       desc: 'Nombre' },
    { label: '{{lastName}}',        desc: 'Apellido' },
    { label: '{{fullName}}',        desc: 'Nombre completo' },
    { label: '{{phone}}',           desc: 'Teléfono' },
    { label: '{{businessName}}',    desc: 'Negocio' },
    { label: '{{organizationName}}',desc: 'Organización' },
    { label: '{{passUrl}}',         desc: 'Link al pase' },
  ]
  const type = selectedWallet.value?.type
  if (type === 'stamps')   base.push({ label: '{{stamps}}',  desc: 'Sellos actuales' })
  if (type === 'points')   base.push({ label: '{{points}}',  desc: 'Puntos actuales' })
  if (type === 'cashback') base.push({ label: '{{balance}}', desc: 'Saldo cashback' })
  return base
})

const messagePreview = computed(() =>
  form.messageTemplate
    .replaceAll('{{firstName}}',        'Oscar')
    .replaceAll('{{lastName}}',         'Raygoza')
    .replaceAll('{{fullName}}',         'Oscar Raygoza')
    .replaceAll('{{phone}}',            '+52 33 1234 5678')
    .replaceAll('{{businessName}}',     'Mi Wallet')
    .replaceAll('{{organizationName}}', 'Mi Empresa')
    .replaceAll('{{passUrl}}',          'https://tribo.app/passes/w/abc123')
    .replaceAll('{{stamps}}',           '7')
    .replaceAll('{{points}}',           '320')
    .replaceAll('{{balance}}',          '$45.00')
)

const MSG_MAX = 320

function insertVar(v: string) {
  const el = textareaRef.value
  const start = el ? (el.selectionStart ?? form.messageTemplate.length) : form.messageTemplate.length
  const end   = el ? (el.selectionEnd   ?? form.messageTemplate.length) : form.messageTemplate.length
  const next = form.messageTemplate.slice(0, start) + v + form.messageTemplate.slice(end)
  if (next.length > MSG_MAX) return
  form.messageTemplate = next
  nextTick(() => {
    el?.focus()
    el?.setSelectionRange(start + v.length, start + v.length)
  })
}

const msgTooLong = computed(() => form.messageTemplate.length > MSG_MAX)

async function loadPreview() {
  loadingPreview.value = true
  createError.value = ''
  try {
    audiencePreview.value = await apiClient.post<AudiencePreview>(
      '/campaigns/preview-audience',
      { segment: buildSegment(), channel: form.channel, messageTemplate: form.messageTemplate.trim() || undefined }
    )
  } catch (e) {
    audiencePreview.value = null
    createError.value = extractApiMessage(e)
  } finally {
    loadingPreview.value = false
  }
}

function openModal() {
  step.value = 1
  createError.value = ''
  audiencePreview.value = null
  form.name = ''
  form.channel = 'sms'
  form.segmentType = 'all_org'
  form.walletId = ''
  form.messageTemplate = ''
  form.scheduledAt = ''
  form.thresholdPercent = 80
  form.inactiveDays = 30
  form.minBalance = 0
  form.minEvents = 3
  form.withinDays = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function nextStep() {
  createError.value = ''
  if (step.value === 1) {
    if (!form.name.trim()) { createError.value = 'El nombre es requerido'; return }
    step.value = 2
  } else if (step.value === 2) {
    if (!form.messageTemplate.trim()) { createError.value = 'El mensaje es requerido'; return }
    if (msgTooLong.value) { createError.value = `El mensaje supera los ${MSG_MAX} caracteres`; return }
    await loadPreview()
    step.value = 3
  }
}

function extractApiMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const body = e.body as Record<string, unknown> | null
    const msg = body?.message ?? body?.error ?? body?.detail
    if (typeof msg === 'string' && msg) return msg
    if (Array.isArray(body?.message)) return (body!.message as string[]).join(', ')
    return `Error del servidor (${(e as ApiError).status})`
  }
  return 'Error inesperado. Verifica los datos.'
}

async function submit() {
  createError.value = ''
  creating.value = true
  try {
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      channel: form.channel,
      messageTemplate: form.messageTemplate.trim(),
      segment: buildSegment(),
      ...(needsWallet.value && form.walletId ? { walletId: form.walletId } : {}),
    }

    const created = await apiClient.post<Campaign>('/campaigns', payload)

    if (form.scheduledAt) {
      // datetime-local gives "YYYY-MM-DDTHH:mm" — append :00 so Date parses it unambiguously
      const isoDate = new Date(form.scheduledAt + ':00').toISOString()
      await apiClient.post(`/campaigns/${created.id}/schedule`, { scheduledAt: isoDate })
      created.status = 'scheduled'
      created.scheduledAt = isoDate
    }

    campaigns.value.unshift(created)
    closeModal()
  } catch (e) {
    createError.value = extractApiMessage(e)
  } finally {
    creating.value = false
  }
}

// ── Detail modal ──
const detailCampaign = ref<Campaign | null>(null)
function openDetail(c: Campaign) { detailCampaign.value = c }
function closeDetail() { detailCampaign.value = null }
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 20px; max-width: 1200px;">

    <!-- Header row -->
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <!-- Filter pills -->
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button
          v-for="f in filters"
          :key="f.key"
          style="padding: 6px 14px; border-radius: 20px; font-size: 12.5px; font-weight: 600; border: 1.5px solid; cursor: pointer; transition: all 0.12s; font-family: inherit;"
          :style="activeFilter === f.key
            ? { background: '#1B4332', color: '#fff', borderColor: '#1B4332' }
            : { background: '#fff', color: '#6B7A72', borderColor: '#ECEFEB' }"
          @click="activeFilter = f.key"
        >
          {{ f.label }}
          <span
            v-if="f.key !== 'all'"
            style="margin-left: 4px; font-size: 11px; opacity: 0.7;"
          >{{ campaigns.filter(c => c.status === f.key).length }}</span>
        </button>
      </div>

      <!-- Nueva campaña -->
      <button
        style="display: flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: 9px; background: #E8920A; color: #fff; font-size: 13px; font-weight: 700; border: none; cursor: pointer; font-family: inherit; transition: background 0.12s;"
        @mouseenter="(e) => (e.currentTarget as HTMLButtonElement).style.background='#D17D09'"
        @mouseleave="(e) => (e.currentTarget as HTMLButtonElement).style.background='#E8920A'"
        @click="openModal"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Nueva campaña
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="campaign-grid">
      <div v-for="i in 4" :key="i" style="height: 160px; background: #fff; border-radius: 14px; border: 1px solid #ECEFEB; animation: pulse 1.5s ease-in-out infinite;" />
    </div>

    <!-- Empty -->
    <div
      v-else-if="!filtered.length"
      style="background: #fff; border: 1px solid #ECEFEB; border-radius: 14px; padding: 64px 32px; text-align: center;"
    >
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#D8DDD7" stroke-width="1.5" stroke-linecap="round" style="margin: 0 auto 14px;">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
      <p style="font-size: 15px; font-weight: 700; color: #0F1B14; margin: 0 0 6px;">No hay campañas</p>
      <p style="font-size: 13px; color: #6B7A72; margin: 0 0 20px;">Crea tu primera campaña para llegar a tus clientes</p>
      <button
        style="padding: 9px 20px; border-radius: 9px; background: #E8920A; color: #fff; font-size: 13px; font-weight: 700; border: none; cursor: pointer; font-family: inherit;"
        @click="openModal"
      >
        Nueva campaña
      </button>
    </div>

    <!-- Campaign cards -->
    <div v-else class="campaign-grid">
      <div
        v-for="c in filtered"
        :key="c.id"
        style="background: #fff; border: 1.5px solid #ECEFEB; border-radius: 14px; padding: 18px 20px; display: flex; flex-direction: column; gap: 0; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;"
        @mouseenter="(e) => { (e.currentTarget as HTMLElement).style.borderColor='#1B4332'; (e.currentTarget as HTMLElement).style.boxShadow='0 4px 16px rgba(27,67,50,0.08)'; }"
        @mouseleave="(e) => { (e.currentTarget as HTMLElement).style.borderColor='#ECEFEB'; (e.currentTarget as HTMLElement).style.boxShadow='none'; }"
        @click="openDetail(c)"
      >
        <!-- Top -->
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 10px;">
          <div style="flex: 1; min-width: 0;">
            <h3 style="font-size: 14px; font-weight: 700; color: #0F1B14; margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ c.name }}</h3>
            <p style="font-size: 12px; color: #6B7A72; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">{{ campaignMessage(c) }}</p>
          </div>
          <span
            style="display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; white-space: nowrap; flex-shrink: 0;"
            :style="{ background: statusConfig[c.status].bg, color: statusConfig[c.status].color }"
          >
            {{ statusConfig[c.status].label }}
          </span>
        </div>

        <!-- Channel + Segment -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 5px; padding: 4px 10px; background: #F7F4EF; border-radius: 6px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1B4332" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="channelIcons[c.channel]" />
            <span style="font-size: 11.5px; font-weight: 600; color: #3A4A41;">{{ channelLabels[c.channel] }}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 5px; padding: 4px 10px; background: #F7F4EF; border-radius: 6px; min-width: 0; overflow: hidden;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1B4332" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
              <circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6"/>
            </svg>
            <span style="font-size: 11.5px; font-weight: 600; color: #3A4A41; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ segmentLabels[campaignSegmentType(c)] }}</span>
          </div>
        </div>

        <!-- Progress bar (sending / sent) -->
        <div v-if="c.status === 'sending' || c.status === 'sent'" style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 11.5px; color: #6B7A72;">Entregados {{ deliveredCount(c)?.toLocaleString() ?? 0 }} / {{ audienceCount(c)?.toLocaleString() ?? '—' }}</span>
            <span style="font-size: 11.5px; font-weight: 700; color: #1B4332;">{{ progressPct(c) }}%</span>
          </div>
          <div style="height: 6px; background: #ECEFEB; border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; background: #1B4332; border-radius: 3px; transition: width 0.4s;" :style="{ width: `${progressPct(c)}%` }" />
          </div>
          <div v-if="c.opened" style="margin-top: 6px; font-size: 11px; color: #A8B3AC;">
            {{ c.opened!.toLocaleString() }} aperturas · {{ audienceCount(c) ? Math.round((c.opened! / audienceCount(c)!) * 100) : 0 }}% tasa
          </div>
        </div>

        <!-- Footer meta -->
        <div style="padding-top: 10px; border-top: 1px solid #F3F5F2; margin-top: auto; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 11px; color: #A8B3AC;">
              {{ audienceCount(c) != null ? audienceCount(c)!.toLocaleString() + ' contactos' : '—' }}
            </span>
            <span style="font-size: 11px; color: #A8B3AC;">
              {{ c.scheduledAt ? formatDate(c.scheduledAt) : formatDate(c.createdAt) }}
            </span>
          </div>
          <div v-if="c.smsCost && c.channel === 'sms'" style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 11px; display: flex; align-items: center; gap: 4px;"
              :style="{ color: c.smsCost.hasEnough ? '#6B7A72' : '#DC2626' }"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              {{ c.smsCost.creditsNeeded }} créditos SMS
            </span>
            <span style="font-size: 11px; font-weight: 600;"
              :style="{ color: c.smsCost.hasEnough ? '#1B4332' : '#DC2626' }"
            >
              {{ c.smsCost.hasEnough ? c.smsCost.creditsAvailable + ' disponibles' : 'Créditos insuficientes' }}
            </span>
          </div>
          <button
            v-if="c.status === 'sent' || c.status === 'sending'"
            style="display: flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 7px; background: #F0F5F2; border: 1px solid #D1E8DA; color: #1B4332; font-size: 11.5px; font-weight: 600; cursor: pointer; font-family: inherit; align-self: flex-start;"
            @click.stop="router.push({ name: 'CampaignAnalytics', params: { id: c.id } })"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 21V5M3 21h18"/><path d="M7 17v-5M11 17V9M15 17v-3M19 17V7"/>
            </svg>
            Ver analytics
          </button>
        </div>
      </div>
    </div>

    <!-- Paginator -->
    <div
      v-if="campaignsMeta.totalPages > 1"
      style="display: flex; align-items: center; justify-content: center; gap: 8px;"
    >
      <button
        :disabled="campaignsPage <= 1"
        style="padding: 5px 12px; border-radius: 7px; border: 1px solid #ECEFEB; background: #fff; font-size: 12px; cursor: pointer; color: #3A4A41; font-family: inherit;"
        :style="campaignsPage <= 1 ? 'opacity:0.4;cursor:default;' : ''"
        @click="goToCampaignsPage(campaignsPage - 1)"
      >← Anterior</button>
      <span style="font-size: 12px; color: #6B7A72;">
        Página {{ campaignsPage }} de {{ campaignsMeta.totalPages }}
      </span>
      <button
        :disabled="campaignsPage >= campaignsMeta.totalPages"
        style="padding: 5px 12px; border-radius: 7px; border: 1px solid #ECEFEB; background: #fff; font-size: 12px; cursor: pointer; color: #3A4A41; font-family: inherit;"
        :style="campaignsPage >= campaignsMeta.totalPages ? 'opacity:0.4;cursor:default;' : ''"
        @click="goToCampaignsPage(campaignsPage + 1)"
      >Siguiente →</button>
    </div>

  </div>

  <!-- ── Create campaign modal ── -->
  <Teleport to="body">
    <div
      v-if="showModal"
      style="position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(15,27,20,0.5);"
      @click.self="closeModal"
    >
      <div style="background: #fff; border-radius: 18px; box-shadow: 0 24px 64px rgba(15,27,20,0.18); width: 100%; max-width: 520px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh;">

        <!-- Modal header -->
        <div style="padding: 20px 22px 16px; border-bottom: 1px solid #ECEFEB; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
          <div>
            <h3 style="font-size: 15px; font-weight: 700; color: #0F1B14; margin: 0;">Nueva campaña</h3>
            <p style="font-size: 12px; color: #6B7A72; margin: 3px 0 0;">Paso {{ step }} de 3 — {{ ['Configuración', 'Mensaje', 'Audiencia'][step - 1] }}</p>
          </div>
          <button
            style="width: 30px; height: 30px; border-radius: 8px; border: 1px solid #ECEFEB; background: #F7F4EF; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6B7A72;"
            @click="closeModal"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Step indicator -->
        <div style="display: flex; padding: 0 22px; gap: 0; flex-shrink: 0;">
          <div v-for="s in 3" :key="s" style="flex: 1; height: 3px; margin-top: 0;" :style="{ background: s <= step ? '#1B4332' : '#ECEFEB' }" />
        </div>

        <!-- Modal body -->
        <div style="padding: 22px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px;">

          <!-- Step 1: Config -->
          <template v-if="step === 1">
            <div>
              <label style="display: block; font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">Nombre de la campaña *</label>
              <input
                v-model="form.name"
                type="text"
                placeholder="Ej: Promo fin de semana"
                style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1.5px solid #ECEFEB; background: #F7F4EF; color: #0F1B14; font-size: 13px; outline: none; box-sizing: border-box; font-family: inherit;"
                @focus="(e) => { (e.target as HTMLInputElement).style.borderColor='#E8920A'; (e.target as HTMLInputElement).style.boxShadow='0 0 0 3px #FCEBC4'; }"
                @blur="(e) => { (e.target as HTMLInputElement).style.borderColor='#ECEFEB'; (e.target as HTMLInputElement).style.boxShadow='none'; }"
              />
            </div>

            <div>
              <label style="display: block; font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">Canal</label>
              <div style="display: flex; gap: 8px;">
                <button
                  v-for="ch in (['sms', 'email', 'wallet_push'] as Channel[])"
                  :key="ch"
                  :disabled="ch === 'wallet_push'"
                  style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 8px; border-radius: 10px; border: 2px solid; font-family: inherit; transition: all 0.12s; position: relative;"
                  :style="ch === 'wallet_push'
                    ? { borderColor: '#ECEFEB', background: '#F7F4EF', cursor: 'not-allowed', opacity: '0.55' }
                    : form.channel === ch
                      ? { borderColor: '#1B4332', background: '#F0F5F2', cursor: 'pointer' }
                      : { borderColor: '#ECEFEB', background: '#fff', cursor: 'pointer' }"
                  @click="ch !== 'wallet_push' && (form.channel = ch)"
                >
                  <svg
                    width="18" height="18" viewBox="0 0 24 24"
                    :fill="ch === 'wallet_push' ? 'currentColor' : 'none'"
                    :stroke="ch === 'wallet_push' ? 'none' : (form.channel === ch ? '#1B4332' : '#A8B3AC')"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    :style="{ color: ch === 'wallet_push' ? '#A8B3AC' : 'inherit' }"
                    v-html="channelIcons[ch]"
                  />
                  <span style="font-size: 11.5px; font-weight: 600;" :style="{ color: ch === 'wallet_push' ? '#A8B3AC' : form.channel === ch ? '#1B4332' : '#6B7A72' }">{{ channelLabels[ch] }}</span>
                </button>
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">Segmento</label>
              <select
                v-model="form.segmentType"
                style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1.5px solid #ECEFEB; background: #F7F4EF; color: #0F1B14; font-size: 13px; outline: none; cursor: pointer; font-family: inherit;"
                @focus="(e) => (e.target as HTMLSelectElement).style.borderColor='#E8920A'"
                @blur="(e) => (e.target as HTMLSelectElement).style.borderColor='#ECEFEB'"
              >
                <option v-for="s in segments" :key="s.key" :value="s.key">{{ s.label }}</option>
              </select>
            </div>

            <div v-if="needsWallet">
              <label style="display: block; font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">Wallet</label>
              <select
                v-model="form.walletId"
                style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1.5px solid #ECEFEB; background: #F7F4EF; color: #0F1B14; font-size: 13px; outline: none; cursor: pointer; font-family: inherit;"
                @focus="(e) => (e.target as HTMLSelectElement).style.borderColor='#E8920A'"
                @blur="(e) => (e.target as HTMLSelectElement).style.borderColor='#ECEFEB'"
              >
                <option value="">Seleccionar wallet…</option>
                <option v-for="w in walletStore.wallets" :key="w.id" :value="w.id">{{ w.businessName }}</option>
              </select>
            </div>

            <!-- near_completion -->
            <div v-if="form.segmentType === 'near_completion'">
              <label style="display: block; font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">Umbral de completado (%) *</label>
              <input v-model.number="form.thresholdPercent" type="number" min="1" max="100"
                style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1.5px solid #ECEFEB; background: #F7F4EF; color: #0F1B14; font-size: 13px; outline: none; box-sizing: border-box; font-family: inherit;"
                @focus="(e) => (e.target as HTMLInputElement).style.borderColor='#E8920A'"
                @blur="(e) => (e.target as HTMLInputElement).style.borderColor='#ECEFEB'"
              />
            </div>

            <!-- inactive -->
            <div v-if="form.segmentType === 'inactive'">
              <label style="display: block; font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">Días sin visitar *</label>
              <input v-model.number="form.inactiveDays" type="number" min="1"
                style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1.5px solid #ECEFEB; background: #F7F4EF; color: #0F1B14; font-size: 13px; outline: none; box-sizing: border-box; font-family: inherit;"
                @focus="(e) => (e.target as HTMLInputElement).style.borderColor='#E8920A'"
                @blur="(e) => (e.target as HTMLInputElement).style.borderColor='#ECEFEB'"
              />
            </div>

            <!-- cashback_balance_gte -->
            <div v-if="form.segmentType === 'cashback_balance_gte'">
              <label style="display: block; font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">Saldo mínimo *</label>
              <input v-model.number="form.minBalance" type="number" min="0" step="0.01"
                style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1.5px solid #ECEFEB; background: #F7F4EF; color: #0F1B14; font-size: 13px; outline: none; box-sizing: border-box; font-family: inherit;"
                @focus="(e) => (e.target as HTMLInputElement).style.borderColor='#E8920A'"
                @blur="(e) => (e.target as HTMLInputElement).style.borderColor='#ECEFEB'"
              />
            </div>

            <!-- frequent_visitors -->
            <template v-if="form.segmentType === 'frequent_visitors'">
              <div>
                <label style="display: block; font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">Mínimo de visitas *</label>
                <input v-model.number="form.minEvents" type="number" min="1"
                  style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1.5px solid #ECEFEB; background: #F7F4EF; color: #0F1B14; font-size: 13px; outline: none; box-sizing: border-box; font-family: inherit;"
                  @focus="(e) => (e.target as HTMLInputElement).style.borderColor='#E8920A'"
                  @blur="(e) => (e.target as HTMLInputElement).style.borderColor='#ECEFEB'"
                />
              </div>
              <div>
                <label style="display: block; font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">En los últimos N días <span style="font-weight: 400; text-transform: none; letter-spacing: 0; color: #A8B3AC;">(opcional)</span></label>
                <input v-model="form.withinDays" type="number" min="1" placeholder="Ej: 30"
                  style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1.5px solid #ECEFEB; background: #F7F4EF; color: #0F1B14; font-size: 13px; outline: none; box-sizing: border-box; font-family: inherit;"
                  @focus="(e) => (e.target as HTMLInputElement).style.borderColor='#E8920A'"
                  @blur="(e) => (e.target as HTMLInputElement).style.borderColor='#ECEFEB'"
                />
              </div>
            </template>

            <div>
              <label style="display: block; font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">Programar envío <span style="font-weight: 400; text-transform: none; letter-spacing: 0; color: #A8B3AC;">(opcional)</span></label>
              <input
                v-model="form.scheduledAt"
                type="datetime-local"
                style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1.5px solid #ECEFEB; background: #F7F4EF; color: #0F1B14; font-size: 13px; outline: none; box-sizing: border-box; font-family: inherit;"
                @focus="(e) => (e.target as HTMLInputElement).style.borderColor='#E8920A'"
                @blur="(e) => (e.target as HTMLInputElement).style.borderColor='#ECEFEB'"
              />
            </div>
          </template>

          <!-- Step 2: Message -->
          <template v-else-if="step === 2">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <label style="display: block; font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em;">Mensaje *</label>
                <span style="font-size: 11px; font-weight: 600;" :style="{ color: msgTooLong ? '#DC2626' : '#A8B3AC' }">{{ form.messageTemplate.length }} / {{ MSG_MAX }}</span>
              </div>
              <textarea
                ref="textareaRef"
                v-model="form.messageTemplate"
                placeholder="Hola {{firstName}}, tienes una oferta especial esperándote en {{businessName}}…"
                maxlength="320"
                rows="5"
                style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1.5px solid #ECEFEB; background: #F7F4EF; color: #0F1B14; font-size: 13px; outline: none; resize: vertical; box-sizing: border-box; font-family: inherit; line-height: 1.5;"
                @focus="(e) => { (e.target as HTMLTextAreaElement).style.borderColor='#E8920A'; (e.target as HTMLTextAreaElement).style.boxShadow='0 0 0 3px #FCEBC4'; }"
                @blur="(e) => { (e.target as HTMLTextAreaElement).style.borderColor='#ECEFEB'; (e.target as HTMLTextAreaElement).style.boxShadow='none'; }"
              />
            </div>

            <!-- Variable chips -->
            <div>
              <p style="font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 8px;">Variables disponibles</p>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button
                  v-for="v in messageVars"
                  :key="v.label"
                  :title="v.desc"
                  style="padding: 4px 10px; border-radius: 6px; background: #F7F4EF; border: 1px solid #ECEFEB; font-size: 12px; font-weight: 600; color: #1B4332; cursor: pointer; font-family: monospace; transition: background 0.1s, border-color 0.1s;"
                  @mouseenter="(e) => { (e.currentTarget as HTMLButtonElement).style.background='#E6EFE9'; (e.currentTarget as HTMLButtonElement).style.borderColor='#1B4332'; }"
                  @mouseleave="(e) => { (e.currentTarget as HTMLButtonElement).style.background='#F7F4EF'; (e.currentTarget as HTMLButtonElement).style.borderColor='#ECEFEB'; }"
                  @click="insertVar(v.label)"
                >{{ v.label }}</button>
              </div>
            </div>

            <!-- Preview card -->
            <div v-if="form.messageTemplate" style="border: 1.5px solid #ECEFEB; border-radius: 12px; overflow: hidden;">
              <div style="padding: 10px 14px; background: #F7F4EF; border-bottom: 1px solid #ECEFEB; font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em; display: flex; align-items: center; gap: 6px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" :stroke="'#6B7A72'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="channelIcons[form.channel]" />
                Preview — {{ channelLabels[form.channel] }}
              </div>
              <div style="padding: 16px; background: #fff;">
                <div style="background: #E8F5E9; border-radius: 12px 12px 12px 2px; padding: 12px 14px; max-width: 80%; font-size: 13px; color: #0F1B14; line-height: 1.5; white-space: pre-wrap; word-break: break-word;">
                  {{ messagePreview }}
                </div>
              </div>
            </div>
          </template>

          <!-- Step 3: Audience -->
          <template v-else>
            <div v-if="loadingPreview" style="text-align: center; padding: 32px; color: #6B7A72; font-size: 13px;">Calculando audiencia…</div>
            <template v-else>
              <div style="background: #F0F5F2; border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px;">
                <div style="width: 52px; height: 52px; border-radius: 14px; background: #1B4332; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="7" r="2.5"/><path d="M16 14c3.5 0 6 2.5 6 6"/>
                  </svg>
                </div>
                <div>
                  <div style="font-size: 28px; font-weight: 800; color: #0F1B14; line-height: 1; letter-spacing: -0.03em;">
                    {{ audiencePreview?.count?.toLocaleString() ?? '—' }}
                  </div>
                  <div style="font-size: 13px; color: #6B7A72; margin-top: 3px; font-weight: 500;">contactos recibirán esta campaña</div>
                </div>
              </div>

              <div v-if="audiencePreview?.sample?.length" style="background: #fff; border: 1px solid #ECEFEB; border-radius: 12px; overflow: hidden;">
                <div style="padding: 12px 14px; background: #F7F4EF; border-bottom: 1px solid #ECEFEB; font-size: 11px; font-weight: 700; color: #6B7A72; text-transform: uppercase; letter-spacing: 0.06em;">
                  Muestra de audiencia
                </div>
                <div style="display: flex; flex-direction: column;">
                  <div
                    v-for="(person, i) in audiencePreview.sample.slice(0, 5)"
                    :key="i"
                    style="display: flex; align-items: center; gap: 10px; padding: 10px 14px;"
                    :style="i > 0 ? { borderTop: '1px solid #F3F5F2' } : {}"
                  >
                    <div style="width: 28px; height: 28px; border-radius: 8px; background: #1B4332; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0;">
                      {{ (person.firstName || '?')[0].toUpperCase() }}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-size: 13px; color: #0F1B14; font-weight: 500;">{{ person.firstName }} {{ person.lastName }}</div>
                      <div v-if="person.phone" style="font-size: 11px; color: #6B7A72; margin-top: 1px;">{{ person.phone }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- SMS cost -->
              <div v-if="audiencePreview?.smsCost"
                style="border-radius: 10px; overflow: hidden;"
                :style="audiencePreview.smsCost.hasEnough ? 'border: 1px solid #A7C8B4;' : 'border: 1px solid #FECACA;'"
              >
                <div style="padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px;"
                  :style="audiencePreview.smsCost.hasEnough ? 'background: #F0F5F2;' : 'background: #FEE2E2;'"
                >
                  <span style="font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 7px;"
                    :style="{ color: audiencePreview.smsCost.hasEnough ? '#1B4332' : '#DC2626' }"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                    </svg>
                    {{ audiencePreview.smsCost.creditsNeeded }} créditos
                  </span>
                  <span style="font-size: 12px; font-weight: 600;"
                    :style="{ color: audiencePreview.smsCost.hasEnough ? '#2D6A4F' : '#DC2626' }"
                  >
                    {{ audiencePreview.smsCost.hasEnough ? audiencePreview.smsCost.creditsAvailable + ' disponibles' : 'Créditos insuficientes' }}
                  </span>
                </div>
                <div style="padding: 8px 16px; background: rgba(0,0,0,0.03); display: flex; gap: 16px;">
                  <span style="font-size: 11px; color: #6B7A72;">
                    <strong style="color: #3A4A41;">{{ audiencePreview.smsCost.segmentsPerMessage }}</strong> {{ audiencePreview.smsCost.segmentsPerMessage === 1 ? 'segmento' : 'segmentos' }} por mensaje
                  </span>
                  <span style="font-size: 11px; color: #6B7A72;">
                    <strong style="color: #3A4A41;">{{ audiencePreview.count }}</strong> contactos × <strong style="color: #3A4A41;">{{ audiencePreview.smsCost.segmentsPerMessage }}</strong> = <strong style="color: #3A4A41;">{{ audiencePreview.smsCost.creditsNeeded }}</strong> créditos
                  </span>
                </div>
              </div>

              <!-- exceedsLimit warning -->
              <div
                v-if="audiencePreview?.smsCost?.exceedsLimit"
                style="background: #FEE2E2; border: 1px solid #FECACA; border-radius: 10px; padding: 12px 14px; font-size: 12.5px; color: #DC2626; line-height: 1.5; display: flex; align-items: flex-start; gap: 8px;"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink: 0; margin-top: 1px;">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>Tu mensaje es demasiado largo una vez que se sustituyen las variables. Reduce el texto a máximo 3 segmentos SMS ({{ MSG_MAX }} caracteres).</span>
              </div>

              <div style="background: #FEF9C3; border: 1px solid #FDE68A; border-radius: 10px; padding: 12px 14px; font-size: 12.5px; color: #854D0E; line-height: 1.5;">
                Al confirmar, la campaña se creará en estado <strong>borrador</strong> y podrás programar o enviar manualmente desde el panel.
              </div>
            </template>
          </template>

          <!-- Error -->
          <p v-if="createError" style="font-size: 12px; color: #DC2626; padding: 8px 12px; background: #FEE2E2; border-radius: 8px; margin: 0;">{{ createError }}</p>
        </div>

        <!-- Modal footer -->
        <div style="padding: 16px 22px; border-top: 1px solid #ECEFEB; display: flex; gap: 10px; flex-shrink: 0;">
          <button
            v-if="step > 1"
            style="padding: 10px 18px; border-radius: 9px; background: #fff; color: #6B7A72; font-size: 13px; font-weight: 600; border: 1.5px solid #ECEFEB; cursor: pointer; font-family: inherit;"
            @click="step--"
          >
            Atrás
          </button>
          <button
            style="flex: 1; padding: 10px 18px; border-radius: 9px; background: #fff; color: #6B7A72; font-size: 13px; font-weight: 600; border: 1.5px solid #ECEFEB; cursor: pointer; font-family: inherit;"
            @click="closeModal"
          >
            Cancelar
          </button>
          <button
            v-if="step < 3"
            :disabled="step === 2 && msgTooLong"
            style="flex: 1; padding: 10px 18px; border-radius: 9px; background: #1B4332; color: #fff; font-size: 13px; font-weight: 700; border: none; font-family: inherit; transition: background 0.12s;"
            :style="(step === 2 && msgTooLong) ? 'opacity: 0.45; cursor: not-allowed;' : 'cursor: pointer;'"
            @mouseenter="(e) => { if (!(step === 2 && msgTooLong)) (e.currentTarget as HTMLButtonElement).style.background='#2D6A4F' }"
            @mouseleave="(e) => (e.currentTarget as HTMLButtonElement).style.background='#1B4332'"
            @click="nextStep"
          >
            Continuar →
          </button>
          <button
            v-else
            :disabled="creating || audiencePreview?.smsCost?.hasEnough === false || audiencePreview?.smsCost?.exceedsLimit === true"
            style="flex: 1; padding: 10px 18px; border-radius: 9px; background: #E8920A; color: #fff; font-size: 13px; font-weight: 700; border: none; font-family: inherit; transition: background 0.12s;"
            :style="(creating || audiencePreview?.smsCost?.hasEnough === false || audiencePreview?.smsCost?.exceedsLimit === true) ? 'opacity: 0.5; cursor: not-allowed;' : 'cursor: pointer;'"
            @click="submit"
          >
            {{ creating ? 'Creando…' : 'Crear campaña' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── Detail modal ── -->
  <Teleport to="body">
    <div
      v-if="detailCampaign"
      style="position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(15,27,20,0.5);"
      @click.self="closeDetail"
    >
      <div style="background: #fff; border-radius: 18px; box-shadow: 0 24px 64px rgba(15,27,20,0.18); width: 100%; max-width: 480px; overflow: hidden;">
        <!-- Header -->
        <div style="padding: 20px 22px 16px; border-bottom: 1px solid #ECEFEB; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <h3 style="font-size: 15px; font-weight: 700; color: #0F1B14; margin: 0;">{{ detailCampaign.name }}</h3>
              <span
                style="font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px;"
                :style="{ background: statusConfig[detailCampaign.status].bg, color: statusConfig[detailCampaign.status].color }"
              >{{ statusConfig[detailCampaign.status].label }}</span>
            </div>
            <p style="font-size: 12px; color: #6B7A72; margin: 0;">
              {{ channelLabels[detailCampaign.channel] }} · {{ segmentLabels[campaignSegmentType(detailCampaign)] }}
            </p>
          </div>
          <button
            style="width: 30px; height: 30px; border-radius: 8px; border: 1px solid #ECEFEB; background: #F7F4EF; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;"
            @click="closeDetail"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7A72" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <!-- Body -->
        <div style="padding: 20px 22px; display: flex; flex-direction: column; gap: 16px;">
          <div style="background: #F7F4EF; border-radius: 10px; padding: 14px; font-size: 13px; color: #0F1B14; line-height: 1.6; white-space: pre-wrap; word-break: break-word;">
            {{ campaignMessage(detailCampaign) }}
          </div>
          <div class="detail-grid">
            <div>
              <p style="font-size: 11px; font-weight: 700; color: #A8B3AC; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 3px;">Audiencia</p>
              <p style="font-size: 16px; font-weight: 800; color: #0F1B14; margin: 0;">{{ audienceCount(detailCampaign)?.toLocaleString() ?? '—' }}</p>
            </div>
            <div v-if="deliveredCount(detailCampaign)">
              <p style="font-size: 11px; font-weight: 700; color: #A8B3AC; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 3px;">Entregados</p>
              <p style="font-size: 16px; font-weight: 800; color: #0F1B14; margin: 0;">{{ deliveredCount(detailCampaign)!.toLocaleString() }}</p>
            </div>
            <div v-if="detailCampaign.opened">
              <p style="font-size: 11px; font-weight: 700; color: #A8B3AC; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 3px;">Aperturas</p>
              <p style="font-size: 16px; font-weight: 800; color: #0F1B14; margin: 0;">{{ detailCampaign.opened.toLocaleString() }}</p>
            </div>
            <div v-if="detailCampaign.scheduledAt">
              <p style="font-size: 11px; font-weight: 700; color: #A8B3AC; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 3px;">Programada</p>
              <p style="font-size: 13px; font-weight: 600; color: #0F1B14; margin: 0;">{{ formatDate(detailCampaign.scheduledAt) }}</p>
            </div>
          </div>

          <!-- SMS cost detail -->
          <div v-if="detailCampaign.smsCost && detailCampaign.channel === 'sms'"
            style="border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px;"
            :style="detailCampaign.smsCost.hasEnough
              ? 'background: #F0F5F2; border: 1px solid #A7C8B4;'
              : 'background: #FEE2E2; border: 1px solid #FECACA;'"
          >
            <span style="font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px;"
              :style="{ color: detailCampaign.smsCost.hasEnough ? '#1B4332' : '#DC2626' }"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              <span>Esta campaña usa <strong>{{ detailCampaign.smsCost.creditsNeeded }} créditos SMS</strong></span>
            </span>
            <span style="font-size: 12px; font-weight: 700;"
              :style="{ color: detailCampaign.smsCost.hasEnough ? '#1B4332' : '#DC2626' }"
            >
              {{ detailCampaign.smsCost.creditsAvailable }} disponibles
            </span>
          </div>

          <div v-if="detailCampaign.status === 'sending' || detailCampaign.status === 'sent'">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 12px; color: #6B7A72;">Progreso de entrega</span>
              <span style="font-size: 12px; font-weight: 700; color: #1B4332;">{{ progressPct(detailCampaign) }}%</span>
            </div>
            <div style="height: 8px; background: #ECEFEB; border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; background: #1B4332; border-radius: 4px;" :style="{ width: `${progressPct(detailCampaign)}%` }" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.campaign-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@media (max-width: 1024px) {
  .campaign-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .campaign-grid { grid-template-columns: 1fr; }
  .detail-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
