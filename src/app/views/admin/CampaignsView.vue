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
interface SamplePerson { passToken: string; firstName: string; lastName: string; phone?: string }
interface AudiencePreview { count: number; sample: SamplePerson[]; smsCost?: SmsCost }

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
  draft:     { label: 'Borrador',   bg: 'var(--bg-subtle)', color: 'var(--text-muted)' },
  scheduled: { label: 'Programada', bg: 'var(--info-bg)',   color: 'var(--info)' },
  sending:   { label: 'Enviando',   bg: 'var(--warning-bg)', color: 'var(--warning)' },
  sent:      { label: 'Enviada',    bg: 'var(--success-bg)', color: 'var(--success)' },
  cancelled: { label: 'Cancelada',  bg: 'var(--danger-bg)', color: 'var(--danger)' },
}

const channelLabels: Record<Channel, string> = {
  sms:         'SMS',
  email:       'Email',
  wallet_push: 'Apple Wallet',
}

const channelIcons: Record<Channel, string> = {
  sms:         '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
  email:       '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  wallet_push: '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
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
const excludedPeople = ref<SamplePerson[]>([])

const excludedTokens = computed(() => excludedPeople.value.map(p => p.passToken))
const visibleSample  = computed(() =>
  (audiencePreview.value?.sample ?? []).filter(p => !excludedTokens.value.includes(p.passToken))
)
const adjustedCount  = computed(() =>
  Math.max(0, (audiencePreview.value?.count ?? 0) - excludedPeople.value.length)
)

function excludePerson(person: SamplePerson) {
  if (!excludedPeople.value.some(p => p.passToken === person.passToken)) {
    excludedPeople.value.push(person)
  }
}
function includePerson(passToken: string) {
  excludedPeople.value = excludedPeople.value.filter(p => p.passToken !== passToken)
}

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
  if (excludedTokens.value.length) base.excludedPassTokens = excludedTokens.value
  return base
}

const textareaRef = ref<HTMLTextAreaElement | null>(null)

const selectedWallet = computed(() => walletStore.wallets.find((w) => w.id === form.walletId))

interface MsgVar { label: string; desc: string }
const messageVars = computed<MsgVar[]>(() => {
  const isWalletPush = form.channel === 'wallet_push'
  const vars: MsgVar[] = [
    { label: '{{firstName}}',       desc: 'Nombre' },
    { label: '{{lastName}}',        desc: 'Apellido' },
    { label: '{{fullName}}',        desc: 'Nombre completo' },
  ]
  if (!isWalletPush) vars.push({ label: '{{phone}}', desc: 'Teléfono' })
  vars.push(
    { label: '{{businessName}}',    desc: 'Negocio' },
    { label: '{{organizationName}}',desc: 'Organización' },
  )
  if (!isWalletPush) vars.push({ label: '{{passUrl}}', desc: 'Link al pase' })
  const type = selectedWallet.value?.type
  if (type === 'stamps')   vars.push({ label: '{{stamps}}',  desc: 'Sellos actuales' })
  if (type === 'points')   vars.push({ label: '{{points}}',  desc: 'Puntos actuales' })
  if (type === 'cashback') vars.push({ label: '{{balance}}', desc: 'Saldo cashback' })
  return vars
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
const WALLET_PUSH_SOFT_LIMIT = 100
const msgOverSoftLimit = computed(() => form.channel === 'wallet_push' && form.messageTemplate.length > WALLET_PUSH_SOFT_LIMIT)

async function loadPreview() {
  loadingPreview.value = true
  createError.value = ''
  try {
    const body: Record<string, unknown> = {
      segment: buildSegment(),
      channel: form.channel,
      messageTemplate: form.messageTemplate.trim() || undefined,
    }
    if (excludedTokens.value.length) body.excludedPassTokens = excludedTokens.value
    audiencePreview.value = await apiClient.post<AudiencePreview>('/campaigns/preview-audience', body)
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
  excludedPeople.value = []
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
  <div class="campaigns-page">

    <!-- Page header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Campañas</h1>
        <p class="page-subtitle">
          {{ loading ? 'Cargando…' : `${campaigns.length} campaña${campaigns.length !== 1 ? 's' : ''}` }}
        </p>
      </div>
      <button class="btn-new" @click="openModal">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Nueva campaña
      </button>
    </div>

    <!-- Filter pills -->
    <div class="filter-pills">
      <button
        v-for="f in filters"
        :key="f.key"
        class="filter-pill"
        :class="{ 'filter-pill--active': activeFilter === f.key }"
        @click="activeFilter = f.key"
      >
        {{ f.label }}
        <span class="pill-count">{{ f.key === 'all' ? campaigns.length : campaigns.filter(c => c.status === f.key).length }}</span>
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="campaign-grid">
      <div v-for="i in 6" :key="i" class="skeleton-card">
        <div class="sk-row">
          <div class="sk-block sk-title" />
          <div class="sk-block sk-badge" />
        </div>
        <div class="sk-block sk-text" />
        <div class="sk-chips">
          <div class="sk-block sk-chip" />
          <div class="sk-block sk-chip" />
        </div>
        <div class="sk-block sk-footer" />
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!filtered.length" class="empty-state">
      <svg class="empty-icon" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" stroke-linecap="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
      <p class="empty-title">No hay campañas</p>
      <p class="empty-sub">Crea tu primera campaña para llegar a tus clientes</p>
      <button class="btn-new" @click="openModal">Nueva campaña</button>
    </div>

    <!-- Campaign cards -->
    <div v-else class="campaign-grid">
      <div
        v-for="c in filtered"
        :key="c.id"
        class="campaign-card"
        @click="openDetail(c)"
      >
        <!-- Top: name + status -->
        <div class="card-top">
          <div class="card-name-wrap">
            <h3 class="card-name">{{ c.name }}</h3>
            <p class="card-msg">{{ campaignMessage(c) }}</p>
          </div>
          <span class="status-badge" :style="{ background: statusConfig[c.status].bg, color: statusConfig[c.status].color }">
            {{ statusConfig[c.status].label }}
          </span>
        </div>

        <!-- Channel + Segment chips -->
        <div class="card-chips">
          <div class="chip">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="channelIcons[c.channel]" />
            <span class="chip-label">{{ channelLabels[c.channel] }}</span>
          </div>
          <div class="chip chip--wide">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
              <circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6"/>
            </svg>
            <span class="chip-label chip-label--ellipsis">{{ segmentLabels[campaignSegmentType(c)] }}</span>
          </div>
        </div>

        <!-- Progress bar (sending / sent) -->
        <div v-if="c.status === 'sending' || c.status === 'sent'" class="progress-wrap">
          <div class="progress-meta">
            <span class="progress-label">Entregados {{ deliveredCount(c)?.toLocaleString() ?? 0 }} / {{ audienceCount(c)?.toLocaleString() ?? '—' }}</span>
            <span class="progress-pct">{{ progressPct(c) }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${progressPct(c)}%` }" />
          </div>
          <div v-if="c.opened" class="progress-opens">
            {{ c.opened!.toLocaleString() }} aperturas · {{ audienceCount(c) ? Math.round((c.opened! / audienceCount(c)!) * 100) : 0 }}% tasa
          </div>
        </div>

        <!-- Card footer -->
        <div class="card-footer">
          <div class="card-footer-row">
            <span class="card-meta">{{ audienceCount(c) != null ? audienceCount(c)!.toLocaleString() + ' contactos' : '—' }}</span>
            <span class="card-meta">{{ c.scheduledAt ? formatDate(c.scheduledAt) : formatDate(c.createdAt) }}</span>
          </div>
          <div v-if="c.smsCost && c.channel === 'sms'" class="card-footer-row">
            <span class="sms-credits" :class="{ 'sms--warn': !c.smsCost.hasEnough }">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              {{ c.smsCost.creditsNeeded }} créditos SMS
            </span>
            <span class="sms-avail" :class="{ 'sms--warn': !c.smsCost.hasEnough }">
              {{ c.smsCost.hasEnough ? c.smsCost.creditsAvailable + ' disponibles' : 'Créditos insuficientes' }}
            </span>
          </div>
          <button
            v-if="c.status === 'sent' || c.status === 'sending'"
            class="btn-analytics"
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
    <div v-if="campaignsMeta.totalPages > 1" class="paginator">
      <button class="page-btn" :disabled="campaignsPage <= 1" @click="goToCampaignsPage(campaignsPage - 1)">← Anterior</button>
      <span class="page-info">Página {{ campaignsPage }} de {{ campaignsMeta.totalPages }}</span>
      <button class="page-btn" :disabled="campaignsPage >= campaignsMeta.totalPages" @click="goToCampaignsPage(campaignsPage + 1)">Siguiente →</button>
    </div>

  </div>

  <!-- ── Create campaign modal ── -->
  <Teleport to="body">
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card modal-card--tall">

        <!-- Modal header -->
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Nueva campaña</h3>
            <p class="modal-sub">Paso {{ step }} de 3 — {{ ['Configuración', 'Mensaje', 'Audiencia'][step - 1] }}</p>
          </div>
          <button class="modal-close" @click="closeModal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Step indicator -->
        <div class="step-track">
          <div v-for="s in 3" :key="s" class="step-seg" :class="{ 'step-seg--active': s <= step }" />
        </div>

        <!-- Modal body -->
        <div class="modal-body">

          <!-- Step 1: Config -->
          <template v-if="step === 1">
            <div class="field">
              <label class="field-label">Nombre de la campaña <span class="required">*</span></label>
              <input v-model="form.name" type="text" class="field-input" placeholder="Ej: Promo fin de semana" />
            </div>

            <div class="field">
              <label class="field-label">Canal</label>
              <div class="channel-grid">
                <button
                  v-for="ch in (['sms', 'email', 'wallet_push'] as Channel[])"
                  :key="ch"
                  class="channel-btn"
                  :class="{ 'channel-btn--selected': form.channel === ch }"
                  @click="form.channel = ch"
                >
                  <svg
                    width="18" height="18" viewBox="0 0 24 24"
                    fill="none"
                    :stroke="form.channel === ch ? 'var(--primary)' : 'var(--text-faint)'"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    v-html="channelIcons[ch]"
                  />
                  <span
                    class="channel-label"
                    :class="{ 'channel-label--selected': form.channel === ch }"
                  >{{ channelLabels[ch] }}</span>
                </button>
              </div>
            </div>

            <div class="field">
              <label class="field-label">Segmento</label>
              <select v-model="form.segmentType" class="field-input field-select">
                <option v-for="s in segments" :key="s.key" :value="s.key">{{ s.label }}</option>
              </select>
            </div>

            <div v-if="needsWallet" class="field">
              <label class="field-label">Wallet</label>
              <select v-model="form.walletId" class="field-input field-select">
                <option value="">Seleccionar wallet…</option>
                <option v-for="w in walletStore.wallets" :key="w.id" :value="w.id">{{ w.businessName }}</option>
              </select>
            </div>

            <div v-if="form.segmentType === 'near_completion'" class="field">
              <label class="field-label">Umbral de completado (%) <span class="required">*</span></label>
              <input v-model.number="form.thresholdPercent" type="number" min="1" max="100" class="field-input" />
            </div>

            <div v-if="form.segmentType === 'inactive'" class="field">
              <label class="field-label">Días sin visitar <span class="required">*</span></label>
              <input v-model.number="form.inactiveDays" type="number" min="1" class="field-input" />
            </div>

            <div v-if="form.segmentType === 'cashback_balance_gte'" class="field">
              <label class="field-label">Saldo mínimo <span class="required">*</span></label>
              <input v-model.number="form.minBalance" type="number" min="0" step="0.01" class="field-input" />
            </div>

            <template v-if="form.segmentType === 'frequent_visitors'">
              <div class="field">
                <label class="field-label">Mínimo de visitas <span class="required">*</span></label>
                <input v-model.number="form.minEvents" type="number" min="1" class="field-input" />
              </div>
              <div class="field">
                <label class="field-label">En los últimos N días <span class="field-optional">(opcional)</span></label>
                <input v-model="form.withinDays" type="number" min="1" placeholder="Ej: 30" class="field-input" />
              </div>
            </template>

            <div class="field">
              <label class="field-label">Programar envío <span class="field-optional">(opcional)</span></label>
              <input v-model="form.scheduledAt" type="datetime-local" class="field-input" />
            </div>
          </template>

          <!-- Step 2: Message -->
          <template v-else-if="step === 2">
            <div v-if="form.channel === 'wallet_push'" class="info-banner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink: 0; margin-top: 1px;">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>Este mensaje aparece como notificación push en el iPhone. Apple Wallet pone automáticamente el nombre de tu organización como título. Solo llega a usuarios con el pase descargado.</span>
            </div>
            <div class="field">
              <div class="field-header-row">
                <label class="field-label">Mensaje <span class="required">*</span></label>
                <span
                  class="char-count"
                  :class="{ 'char-count--warn': msgTooLong || msgOverSoftLimit }"
                >
                  {{ form.messageTemplate.length }} / {{ form.channel === 'wallet_push' ? `${WALLET_PUSH_SOFT_LIMIT} rec.` : MSG_MAX }}
                </span>
              </div>
              <textarea
                ref="textareaRef"
                v-model="form.messageTemplate"
                class="field-input field-textarea"
                :placeholder="form.channel === 'wallet_push'
                  ? '{{firstName}}, tenemos una oferta especial para ti hoy 🎉'
                  : 'Hola {{firstName}}, tienes una oferta especial esperándote en {{businessName}}…'"
                maxlength="320"
                rows="5"
              />
            </div>

            <!-- Variable chips -->
            <div class="field">
              <p class="field-label" style="margin: 0 0 8px;">Variables disponibles</p>
              <div class="var-chips">
                <button
                  v-for="v in messageVars"
                  :key="v.label"
                  :title="v.desc"
                  class="var-chip"
                  @click="insertVar(v.label)"
                >{{ v.label }}</button>
              </div>
            </div>

            <!-- Preview card -->
            <div v-if="form.messageTemplate" class="preview-card">
              <div class="preview-header">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="channelIcons[form.channel]" />
                Preview — {{ channelLabels[form.channel] }}
              </div>
              <div class="preview-body">
                <div class="preview-bubble">{{ messagePreview }}</div>
              </div>
            </div>
          </template>

          <!-- Step 3: Audience -->
          <template v-else>
            <div v-if="loadingPreview" class="loading-preview">Calculando audiencia…</div>
            <template v-else>
              <div class="audience-hero">
                <div class="audience-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="7" r="2.5"/><path d="M16 14c3.5 0 6 2.5 6 6"/>
                  </svg>
                </div>
                <div>
                  <div class="audience-count">{{ adjustedCount.toLocaleString() }}</div>
                  <div class="audience-label">
                    contactos recibirán esta campaña
                    <span v-if="excludedPeople.length" class="excluded-badge">
                      {{ excludedPeople.length }} excluido{{ excludedPeople.length !== 1 ? 's' : '' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Active audience sample -->
              <div v-if="visibleSample.length" class="audience-sample">
                <div class="sample-header">
                  <span>Audiencia</span>
                  <span class="sample-hint">Toca × para excluir</span>
                </div>
                <div class="sample-list">
                  <div
                    v-for="(person, i) in visibleSample"
                    :key="person.passToken"
                    class="sample-row"
                    :class="{ 'sample-row--border': i > 0 }"
                  >
                    <div class="sample-avatar">{{ (person.firstName || '?')[0].toUpperCase() }}</div>
                    <div class="sample-info">
                      <div class="sample-name">{{ person.firstName }} {{ person.lastName }}</div>
                      <div v-if="person.phone" class="sample-phone">{{ person.phone }}</div>
                    </div>
                    <button class="exclude-btn" title="Excluir de la campaña" @click="excludePerson(person)">×</button>
                  </div>
                </div>
              </div>

              <!-- Excluded people -->
              <div v-if="excludedPeople.length" class="audience-sample excluded-section">
                <div class="sample-header">
                  <span>Excluidos</span>
                  <span class="sample-hint">{{ excludedPeople.length }} persona{{ excludedPeople.length !== 1 ? 's' : '' }}</span>
                </div>
                <div class="sample-list">
                  <div
                    v-for="(person, i) in excludedPeople"
                    :key="person.passToken"
                    class="sample-row sample-row--excluded"
                    :class="{ 'sample-row--border': i > 0 }"
                  >
                    <div class="sample-avatar sample-avatar--excluded">{{ (person.firstName || '?')[0].toUpperCase() }}</div>
                    <div class="sample-info">
                      <div class="sample-name sample-name--excluded">{{ person.firstName }} {{ person.lastName }}</div>
                      <div v-if="person.phone" class="sample-phone">{{ person.phone }}</div>
                    </div>
                    <button class="undo-btn" title="Deshacer exclusión" @click="includePerson(person.passToken)">↩</button>
                  </div>
                </div>
              </div>

              <!-- SMS cost -->
              <div
                v-if="audiencePreview?.smsCost"
                class="sms-cost-card"
                :class="audiencePreview.smsCost.hasEnough ? 'sms-cost-card--ok' : 'sms-cost-card--err'"
              >
                <div class="sms-cost-row">
                  <span class="sms-cost-main" :class="audiencePreview.smsCost.hasEnough ? 'sms-ok' : 'sms-err'">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                    </svg>
                    {{ audiencePreview.smsCost.creditsNeeded }} créditos
                  </span>
                  <span class="sms-cost-avail" :class="audiencePreview.smsCost.hasEnough ? 'sms-ok' : 'sms-err'">
                    {{ audiencePreview.smsCost.hasEnough ? audiencePreview.smsCost.creditsAvailable + ' disponibles' : 'Créditos insuficientes' }}
                  </span>
                </div>
                <div class="sms-cost-detail">
                  <span><strong>{{ audiencePreview.smsCost.segmentsPerMessage }}</strong> {{ audiencePreview.smsCost.segmentsPerMessage === 1 ? 'segmento' : 'segmentos' }} por mensaje</span>
                  <span><strong>{{ audiencePreview.count }}</strong> contactos × <strong>{{ audiencePreview.smsCost.segmentsPerMessage }}</strong> = <strong>{{ audiencePreview.smsCost.creditsNeeded }}</strong> créditos</span>
                </div>
              </div>

              <!-- exceedsLimit warning -->
              <div v-if="audiencePreview?.smsCost?.exceedsLimit" class="warn-card warn-card--red">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink: 0; margin-top: 1px;">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>Tu mensaje es demasiado largo una vez que se sustituyen las variables. Reduce el texto a máximo 3 segmentos SMS ({{ MSG_MAX }} caracteres).</span>
              </div>

              <div class="warn-card warn-card--yellow">
                Al confirmar, la campaña se creará en estado <strong>borrador</strong> y podrás programar o enviar manualmente desde el panel.
              </div>
            </template>
          </template>

          <!-- Error -->
          <p v-if="createError" class="form-error">{{ createError }}</p>
        </div>

        <!-- Modal footer -->
        <div class="modal-footer">
          <button v-if="step > 1" class="btn-back" @click="step--">Atrás</button>
          <button class="btn-cancel" @click="closeModal">Cancelar</button>
          <button
            v-if="step < 3"
            class="btn-continue"
            :class="{ 'btn--disabled': step === 2 && msgTooLong }"
            :disabled="step === 2 && msgTooLong"
            @click="nextStep"
          >Continuar →</button>
          <button
            v-else
            class="btn-submit"
            :class="{ 'btn--disabled': creating || audiencePreview?.smsCost?.hasEnough === false || audiencePreview?.smsCost?.exceedsLimit === true }"
            :disabled="creating || audiencePreview?.smsCost?.hasEnough === false || audiencePreview?.smsCost?.exceedsLimit === true"
            @click="submit"
          >{{ creating ? 'Creando…' : 'Crear campaña' }}</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── Detail modal ── -->
  <Teleport to="body">
    <div v-if="detailCampaign" class="modal-backdrop" @click.self="closeDetail">
      <div class="modal-card">
        <!-- Header -->
        <div class="modal-header">
          <div>
            <div class="detail-title-row">
              <h3 class="modal-title">{{ detailCampaign.name }}</h3>
              <span
                class="status-badge"
                :style="{ background: statusConfig[detailCampaign.status].bg, color: statusConfig[detailCampaign.status].color }"
              >{{ statusConfig[detailCampaign.status].label }}</span>
            </div>
            <p class="modal-sub">{{ channelLabels[detailCampaign.channel] }} · {{ segmentLabels[campaignSegmentType(detailCampaign)] }}</p>
          </div>
          <button class="modal-close" @click="closeDetail">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <!-- Body -->
        <div class="modal-body">
          <div class="detail-msg">{{ campaignMessage(detailCampaign) }}</div>
          <div class="detail-grid">
            <div>
              <p class="stat-label">Audiencia</p>
              <p class="stat-value">{{ audienceCount(detailCampaign)?.toLocaleString() ?? '—' }}</p>
            </div>
            <div v-if="deliveredCount(detailCampaign)">
              <p class="stat-label">Entregados</p>
              <p class="stat-value">{{ deliveredCount(detailCampaign)!.toLocaleString() }}</p>
            </div>
            <div v-if="detailCampaign.opened">
              <p class="stat-label">Aperturas</p>
              <p class="stat-value">{{ detailCampaign.opened.toLocaleString() }}</p>
            </div>
            <div v-if="detailCampaign.scheduledAt">
              <p class="stat-label">Programada</p>
              <p class="stat-value stat-value--sm">{{ formatDate(detailCampaign.scheduledAt) }}</p>
            </div>
          </div>

          <!-- SMS cost detail -->
          <div
            v-if="detailCampaign.smsCost && detailCampaign.channel === 'sms'"
            class="sms-detail-cost"
            :class="detailCampaign.smsCost.hasEnough ? 'sms-cost-card--ok' : 'sms-cost-card--err'"
          >
            <span class="sms-cost-main" :class="detailCampaign.smsCost.hasEnough ? 'sms-ok' : 'sms-err'">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              <span>Esta campaña usa <strong>{{ detailCampaign.smsCost.creditsNeeded }} créditos SMS</strong></span>
            </span>
            <span class="sms-cost-avail" :class="detailCampaign.smsCost.hasEnough ? 'sms-ok' : 'sms-err'">
              {{ detailCampaign.smsCost.creditsAvailable }} disponibles
            </span>
          </div>

          <div v-if="detailCampaign.status === 'sending' || detailCampaign.status === 'sent'">
            <div class="progress-meta" style="margin-bottom: 6px;">
              <span style="font-size: 12px; color: var(--text-muted);">Progreso de entrega</span>
              <span class="progress-pct">{{ progressPct(detailCampaign) }}%</span>
            </div>
            <div class="progress-bar progress-bar--lg">
              <div class="progress-fill" :style="{ width: `${progressPct(detailCampaign)}%` }" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Layout ── */
.campaigns-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1200px;
}

/* ── Page header ── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.page-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-ink);
  margin: 0 0 3px;
  letter-spacing: -0.02em;
}
.page-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  font-weight: 500;
}

/* ── Buttons ── */
.btn-new {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border-radius: 9px;
  background: var(--amber);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, transform 0.1s;
}
.btn-new:hover { background: #D17D09; transform: translateY(-1px); }

/* ── Filter pills ── */
.filter-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12.5px;
  font-weight: 600;
  border: 1.5px solid var(--border);
  cursor: pointer;
  transition: all 0.12s;
  font-family: inherit;
  background: var(--bg-surface);
  color: var(--text-muted);
}
.filter-pill:hover { border-color: var(--primary); color: var(--primary); }
.filter-pill--active { background: var(--primary); color: var(--bg-surface); border-color: var(--primary); }
.filter-pill--active:hover { background: var(--primary-mid); }
.pill-count { font-size: 11px; opacity: 0.75; }

/* ── Skeleton ── */
.skeleton-card {
  background: var(--bg-surface);
  border-radius: 14px;
  border: 1px solid var(--border);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: pulse 1.5s ease-in-out infinite;
}
.sk-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.sk-block { background: var(--bg-subtle); border-radius: 6px; }
.sk-title  { height: 14px; width: 55%; }
.sk-badge  { height: 20px; width: 22%; border-radius: 999px; }
.sk-text   { height: 12px; width: 80%; }
.sk-chips  { display: flex; gap: 8px; }
.sk-chip   { height: 24px; width: 80px; border-radius: 6px; }
.sk-footer { height: 12px; width: 100%; margin-top: 4px; }

/* ── Empty state ── */
.empty-state {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 64px 32px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-icon  { margin-bottom: 14px; }
.empty-title { font-size: 15px; font-weight: 700; color: var(--text-ink); margin: 0 0 6px; }
.empty-sub   { font-size: 13px; color: var(--text-muted); margin: 0 0 20px; }

/* ── Campaign card ── */
.campaign-card {
  background: var(--bg-surface);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.1s;
}
.campaign-card:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 16px rgba(27, 58, 45, 0.08);
  transform: translateY(-1px);
}

/* Card top */
.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.card-name-wrap { flex: 1; min-width: 0; }
.card-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-msg {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Status badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Card chips */
.card-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: var(--bg-page);
  border-radius: 6px;
}
.chip--wide { min-width: 0; overflow: hidden; }
.chip-label { font-size: 11.5px; font-weight: 600; color: var(--text-medium); }
.chip-label--ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Progress */
.progress-wrap { margin-bottom: 12px; }
.progress-meta { display: flex; justify-content: space-between; }
.progress-label { font-size: 11.5px; color: var(--text-muted); }
.progress-pct   { font-size: 11.5px; font-weight: 700; color: var(--primary); }
.progress-bar {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 6px;
}
.progress-bar--lg { height: 8px; border-radius: 4px; margin-top: 6px; }
.progress-fill {
  height: 100%;
  background: var(--primary);
  border-radius: inherit;
  transition: width 0.4s;
}
.progress-opens { margin-top: 6px; font-size: 11px; color: var(--text-faint); }

/* Card footer */
.card-footer {
  padding-top: 10px;
  border-top: 1px solid var(--bg-subtle);
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.card-footer-row { display: flex; align-items: center; justify-content: space-between; }
.card-meta { font-size: 11px; color: var(--text-faint); }

/* SMS credits on card */
.sms-credits { font-size: 11px; display: flex; align-items: center; gap: 4px; color: var(--text-muted); }
.sms-avail   { font-size: 11px; font-weight: 600; color: var(--primary); }
.sms--warn   { color: var(--danger) !important; }

/* Analytics button */
.btn-analytics {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 7px;
  background: var(--bg-green);
  border: 1px solid var(--primary-light);
  color: var(--primary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  align-self: flex-start;
  transition: background 0.12s;
}
.btn-analytics:hover { background: var(--primary-light); }

/* ── Paginator ── */
.paginator { display: flex; align-items: center; justify-content: center; gap: 8px; }
.page-btn {
  padding: 5px 12px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  font-size: 12px;
  cursor: pointer;
  color: var(--text-medium);
  font-family: inherit;
  transition: background 0.12s, border-color 0.12s;
}
.page-btn:hover:not(:disabled) { background: var(--bg-green); border-color: var(--primary); }
.page-btn:disabled { opacity: 0.4; cursor: default; }
.page-info { font-size: 12px; color: var(--text-muted); }

/* ── Modal ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--overlay);
  backdrop-filter: blur(2px);
}
.modal-card {
  background: var(--bg-surface);
  border-radius: 18px;
  box-shadow: 0 24px 64px rgba(15, 27, 20, 0.18);
  width: 100%;
  max-width: 480px;
  overflow: hidden;
}
.modal-card--tall {
  max-width: 520px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.modal-header {
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.modal-title { font-size: 15px; font-weight: 700; color: var(--text-ink); margin: 0; }
.modal-sub   { font-size: 12px; color: var(--text-muted); margin: 3px 0 0; }
.modal-close {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-page);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-muted);
  flex-shrink: 0;
  transition: background 0.12s;
}
.modal-close:hover { background: var(--border); }

/* Step track */
.step-track { display: flex; padding: 0 22px; flex-shrink: 0; }
.step-seg { flex: 1; height: 3px; background: var(--border); }
.step-seg--active { background: var(--primary); }

/* Modal body & footer */
.modal-body {
  padding: 22px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.modal-footer {
  padding: 16px 22px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

/* ── Form fields ── */
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.field-optional { font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--text-faint); }
.required { color: var(--danger); }
.field-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--bg-field);
  color: var(--text-ink);
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.field-input:focus { border-color: var(--amber); box-shadow: 0 0 0 3px var(--amber-bg); }
.field-select  { cursor: pointer; }
.field-textarea { resize: vertical; line-height: 1.5; }
.field-header-row { display: flex; align-items: center; justify-content: space-between; }
.char-count { font-size: 11px; font-weight: 600; color: var(--text-faint); }
.char-count--warn { color: var(--danger); }

/* Channel selector */
.channel-grid { display: flex; gap: 8px; }
.channel-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  border-radius: 10px;
  border: 2px solid var(--border);
  background: var(--bg-surface);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.12s;
}
.channel-btn:hover:not(.channel-btn--disabled) { border-color: var(--primary-light); background: var(--bg-green); }
.channel-btn--selected { border-color: var(--primary); background: var(--bg-green); }
.channel-btn--disabled { opacity: 0.55; cursor: not-allowed; }
.channel-label { font-size: 11.5px; font-weight: 600; color: var(--text-muted); }
.channel-label--selected { color: var(--primary); }
.channel-label--disabled { color: var(--text-faint); }

/* Variable chips */
.var-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.var-chip {
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--bg-page);
  border: 1px solid var(--border);
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
  font-family: monospace;
  transition: background 0.1s, border-color 0.1s;
}
.var-chip:hover { background: var(--primary-light); border-color: var(--primary); }

/* Preview */
.preview-card { border: 1.5px solid var(--border); border-radius: 12px; overflow: hidden; }
.preview-header {
  padding: 10px 14px;
  background: var(--bg-page);
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: flex;
  align-items: center;
  gap: 6px;
}
.preview-body { padding: 16px; background: var(--bg-surface); }
.preview-bubble {
  background: var(--primary-light);
  border-radius: 12px 12px 12px 2px;
  padding: 12px 14px;
  max-width: 80%;
  font-size: 13px;
  color: var(--text-ink);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Audience step */
.loading-preview { text-align: center; padding: 32px; color: var(--text-muted); font-size: 13px; }
.audience-hero {
  background: var(--bg-green);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.audience-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.audience-count { font-size: 28px; font-weight: 800; color: var(--text-ink); line-height: 1; letter-spacing: -0.03em; }
.audience-label { font-size: 13px; color: var(--text-muted); margin-top: 3px; font-weight: 500; }

.audience-sample { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.excluded-section { opacity: 0.75; }
.sample-header {
  padding: 10px 14px;
  background: var(--bg-page);
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sample-hint { font-size: 10.5px; text-transform: none; letter-spacing: 0; font-weight: 500; opacity: 0.65; }
.sample-list  { display: flex; flex-direction: column; }
.sample-row   { display: flex; align-items: center; gap: 10px; padding: 10px 14px; }
.sample-row--border { border-top: 1px solid var(--bg-subtle); }
.sample-row--excluded { background: var(--bg-subtle); }
.sample-avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.sample-avatar--excluded { background: var(--text-faint); }
.sample-info  { flex: 1; min-width: 0; }
.sample-name  { font-size: 13px; color: var(--text-ink); font-weight: 500; }
.sample-name--excluded { color: var(--text-muted); text-decoration: line-through; }
.sample-phone { font-size: 11px; color: var(--text-muted); margin-top: 1px; }

.exclude-btn {
  width: 24px; height: 24px;
  border-radius: 6px; border: none;
  background: var(--danger-bg); color: var(--danger);
  font-size: 16px; line-height: 1;
  cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.15s;
}
.sample-row:hover .exclude-btn { opacity: 1; }
.exclude-btn:hover { opacity: 1 !important; filter: brightness(0.9); }

.undo-btn {
  width: 24px; height: 24px;
  border-radius: 6px; border: none;
  background: var(--bg-subtle); color: var(--text-muted);
  font-size: 13px; cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.undo-btn:hover { background: var(--primary-light, #e0f0ff); color: var(--primary); }

.excluded-badge {
  display: inline-block;
  background: var(--danger-bg); color: var(--danger);
  font-size: 11px; font-weight: 600;
  padding: 2px 8px; border-radius: 999px;
  margin-left: 8px; vertical-align: middle;
}

/* SMS cost */
.sms-cost-card { border-radius: 10px; overflow: hidden; }
.sms-cost-card--ok { border: 1px solid var(--primary-light); }
.sms-cost-card--err { border: 1px solid var(--danger-bg); }
.sms-cost-row {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.sms-cost-card--ok .sms-cost-row { background: var(--bg-green); }
.sms-cost-card--err .sms-cost-row { background: var(--danger-bg); }
.sms-cost-main {
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 7px;
}
.sms-cost-avail { font-size: 12px; font-weight: 600; }
.sms-ok  { color: var(--primary); }
.sms-err { color: var(--danger); }
.sms-cost-detail {
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.03);
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: var(--text-muted);
  flex-wrap: wrap;
}
.sms-cost-detail strong { color: var(--text-medium); }

/* Detail modal SMS cost */
.sms-detail-cost {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 10px;
}

/* Warning cards */
.warn-card {
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 12.5px;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.warn-card--red    { background: var(--danger-bg); border: 1px solid var(--danger-bg); color: var(--danger); }
.warn-card--yellow { background: var(--warning-bg); border: 1px solid var(--warning-bg); color: var(--warning); }

.info-banner {
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 12.5px;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--info-bg, #e8f4fd);
  border: 1px solid var(--info-border, #b3d9f5);
  color: var(--info, #0070c9);
  margin-bottom: 4px;
}

/* Form error */
.form-error {
  font-size: 12px;
  color: var(--danger);
  padding: 8px 12px;
  background: var(--danger-bg);
  border-radius: 8px;
  margin: 0;
}

/* Modal footer buttons */
.btn-back {
  padding: 10px 18px;
  border-radius: 9px;
  background: var(--bg-surface);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  border: 1.5px solid var(--border);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;
}
.btn-back:hover { background: var(--bg-page); }
.btn-cancel {
  flex: 1;
  padding: 10px 18px;
  border-radius: 9px;
  background: var(--bg-surface);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  border: 1.5px solid var(--border);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;
}
.btn-cancel:hover { background: var(--bg-page); }
.btn-continue {
  flex: 1;
  padding: 10px 18px;
  border-radius: 9px;
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  border: none;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s;
}
.btn-continue:hover:not(:disabled) { background: var(--primary-mid); }
.btn-submit {
  flex: 1;
  padding: 10px 18px;
  border-radius: 9px;
  background: var(--amber);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  border: none;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s;
}
.btn-submit:hover:not(:disabled) { background: #D17D09; }
.btn--disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Detail modal ── */
.detail-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.detail-msg {
  background: var(--bg-page);
  border-radius: 10px;
  padding: 14px;
  font-size: 13px;
  color: var(--text-ink);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.stat-label { font-size: 11px; font-weight: 700; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 3px; }
.stat-value { font-size: 16px; font-weight: 800; color: var(--text-ink); margin: 0; }
.stat-value--sm { font-size: 13px; font-weight: 600; }

/* ── Grids ── */
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

/* ── Animations ── */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .campaign-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .campaign-grid { grid-template-columns: 1fr; }
  .detail-grid   { grid-template-columns: repeat(2, 1fr); }
  .page-title    { font-size: 20px; }
  .sms-cost-detail { flex-direction: column; gap: 4px; }
}
</style>
