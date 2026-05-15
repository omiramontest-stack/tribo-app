import { reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/infrastructure/http/ApiClient'

export type WhatsAppConnectionStatus = 'disconnected' | 'qr_pending' | 'connected' | 'reconnecting'

export const useWhatsAppStore = defineStore('WhatsAppStore', () => {
  const state = reactive<{
    status: WhatsAppConnectionStatus
    phone: string | null
    qr: string | null
  }>({
    status: 'disconnected',
    phone: null,
    qr: null,
  })

  let _es: EventSource | null = null

  const status = computed(() => state.status)
  const phone = computed(() => state.phone)
  const qr = computed(() => state.qr)
  const isConnected = computed(() => state.status === 'connected')

  // ── SSE stream ────────────────────────────────────────────────────────────

  function startStream(orgId: string) {
    stopStream()
    const token = apiClient.getToken()
    if (!token) return

    // Relative path → intercepted by Vite proxy (dev) or Cloudflare proxy (prod),
    // avoiding cross-origin restrictions on EventSource.
    const url = `/organizations/${orgId}/whatsapp/stream?token=${encodeURIComponent(token)}`
    _es = new EventSource(url)

    _es.addEventListener('status', (e) => {
      const { status: s, phone: p } = JSON.parse(e.data)
      state.status = s
      state.phone = p
    })

    _es.addEventListener('qr', (e) => {
      const { qr } = JSON.parse(e.data)
      state.qr = qr
      state.status = 'qr_pending'
    })

    _es.addEventListener('connected', (e) => {
      const { phone } = JSON.parse(e.data)
      state.status = 'connected'
      state.phone = phone
      state.qr = null
    })

    _es.addEventListener('disconnected', () => {
      state.status = 'disconnected'
      state.phone = null
      state.qr = null
    })

    _es.addEventListener('reconnecting', () => {
      state.status = 'reconnecting'
      state.qr = null
    })

    // EventSource reconnects automatically on error — no manual retry needed
  }

  function stopStream() {
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
    startStream,
    stopStream,
    connect,
    disconnect,
    sendPass,
    updateTemplate,
  }
})
