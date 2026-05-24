import { reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/infrastructure/http/ApiClient'

export type WhatsAppConnectionStatus = 'disconnected' | 'qr_pending' | 'connected' | 'reconnecting'

export const useWhatsAppStore = defineStore('WhatsAppStore', () => {
  const state = reactive<{
    status: WhatsAppConnectionStatus
    phone: string | null
    qr: string | null
    statusKnown: boolean
  }>({
    status: 'disconnected',
    phone: null,
    qr: null,
    statusKnown: false,
  })

  let _es: EventSource | null = null
  let _reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let _stopped = false

  const status = computed(() => state.status)
  const phone = computed(() => state.phone)
  const qr = computed(() => state.qr)
  const isConnected = computed(() => state.status === 'connected')
  const statusKnown = computed(() => state.statusKnown)

  // ── One-shot status check (used by AdminLayout for notifications) ──────────

  async function fetchStatus(orgId: string) {
    try {
      const res = await apiClient.get<{ status: WhatsAppConnectionStatus; phone: string | null }>(
        `/organizations/${orgId}/whatsapp/status`,
      )
      state.status = res.status
      state.phone = res.phone
    } catch {
      // Non-critical — silently ignore (e.g. 403 for staff roles)
    } finally {
      state.statusKnown = true
    }
  }

  // ── SSE stream ────────────────────────────────────────────────────────────

  /** Requests a one-shot ephemeral token (60 s TTL) from the backend. */
  async function _fetchStreamToken(orgId: string): Promise<string | null> {
    try {
      const res = await apiClient.post<{ token: string }>(
        `/organizations/${orgId}/whatsapp/stream-token`,
        {},
      )
      return res.token
    } catch {
      return null
    }
  }

  /**
   * Opens the SSE connection using a fresh ephemeral token.
   * Each reconnection must call this again — tokens are one-shot and expire in 60 s.
   */
  async function startStream(orgId: string) {
    stopStream()
    _stopped = false

    const streamToken = await _fetchStreamToken(orgId)
    if (!streamToken || _stopped) return

    const base = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? 'https://api.tribowallet.me')
    const url = `${base}/organizations/${orgId}/whatsapp/stream?t=${encodeURIComponent(streamToken)}`
    _es = new EventSource(url)

    _es.addEventListener('status', (e) => {
      const { status: s, phone: p } = JSON.parse(e.data)
      state.status = s
      state.phone = p
      state.statusKnown = true
    })

    _es.addEventListener('qr', (e) => {
      const { qr } = JSON.parse(e.data)
      state.qr = qr
      state.status = 'qr_pending'
      state.statusKnown = true
    })

    _es.addEventListener('connected', (e) => {
      const { phone } = JSON.parse(e.data)
      state.status = 'connected'
      state.phone = phone
      state.qr = null
      state.statusKnown = true
    })

    _es.addEventListener('disconnected', () => {
      state.status = 'disconnected'
      state.phone = null
      state.qr = null
      state.statusKnown = true
    })

    _es.addEventListener('reconnecting', () => {
      state.status = 'reconnecting'
      state.qr = null
      state.statusKnown = true
    })

    // EventSource does not expose HTTP status codes on error, so we can't
    // distinguish a 401 (expired token) from a transient network drop.
    // In both cases the token is no longer valid, so we always request a
    // new one. A 3 s delay avoids hammering the server on repeated failures.
    _es.onerror = () => {
      _es?.close()
      _es = null
      if (_stopped) return
      _reconnectTimer = setTimeout(() => startStream(orgId), 3_000)
    }
  }

  function stopStream() {
    _stopped = true
    if (_reconnectTimer !== null) {
      clearTimeout(_reconnectTimer)
      _reconnectTimer = null
    }
    _es?.close()
    _es = null
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async function connect(orgId: string) {
    await apiClient.post(`/organizations/${orgId}/whatsapp/connect`, {})
  }

  async function disconnect(orgId: string) {
    await apiClient.delete(`/organizations/${orgId}/whatsapp/disconnect`)
    state.status = 'disconnected'
    state.phone = null
    state.qr = null
  }

  async function sendPass(token: string): Promise<void> {
    await apiClient.post(`/passes/${token}/send-whatsapp`, {})
  }

  async function updateTemplate(orgId: string, template: string): Promise<void> {
    await apiClient.patch(`/organizations/${orgId}`, { whatsappMessageTemplate: template })
  }

  return {
    status,
    phone,
    qr,
    isConnected,
    statusKnown,
    fetchStatus,
    startStream,
    stopStream,
    connect,
    disconnect,
    sendPass,
    updateTemplate,
  }
})
