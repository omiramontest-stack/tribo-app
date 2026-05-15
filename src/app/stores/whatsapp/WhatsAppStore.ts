import { reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/infrastructure/http/ApiClient'

export type WhatsAppConnectionStatus = 'disconnected' | 'qr_pending' | 'connected'

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

  const status = computed(() => state.status)
  const phone = computed(() => state.phone)
  const qr = computed(() => state.qr)
  const isConnected = computed(() => state.status === 'connected')

  async function fetchStatus(orgId: string) {
    const res = await apiClient.get<{ status: WhatsAppConnectionStatus; phone: string | null }>(
      `/organizations/${orgId}/whatsapp/status`,
    )
    state.status = res.status
    state.phone = res.phone
  }

  async function connect(orgId: string) {
    await apiClient.post(`/organizations/${orgId}/whatsapp/connect`, {})
    state.status = 'qr_pending'
  }

  async function fetchQr(orgId: string): Promise<string | null> {
    const res = await apiClient.get<{ qr: string | null }>(`/organizations/${orgId}/whatsapp/qr`)
    state.qr = res.qr
    return res.qr
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
    fetchStatus,
    connect,
    fetchQr,
    disconnect,
    sendPass,
    updateTemplate,
  }
})
