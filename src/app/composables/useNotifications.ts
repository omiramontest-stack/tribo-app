import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { useWhatsAppStore } from '@/app/stores/whatsapp/WhatsAppStore'

export interface AppNotification {
  id: string
  type: 'info' | 'warning' | 'error'
  title: string
  body: string
  action?: {
    label: string
    to: RouteLocationRaw
  }
}

export function useNotifications() {
  const authStore = useAuthStore()
  const whatsappStore = useWhatsAppStore()

  const notifications = computed<AppNotification[]>(() => {
    const items: AppNotification[] = []

    if (authStore.admin?.emailVerified === false) {
      items.push({
        id: 'email-verification',
        type: 'warning',
        title: 'Verifica tu correo electrónico',
        body: `Revisa tu bandeja de entrada en ${authStore.admin.email} para activar tu cuenta.`,
      })
    }

    if (whatsappStore.statusKnown && !whatsappStore.isConnected) {
      items.push({
        id: 'whatsapp-disconnected',
        type: 'info',
        title: 'Conecta tu WhatsApp Business',
        body: 'Vincula tu número para enviar pases directamente a tus clientes por WhatsApp.',
        action: {
          label: 'Conectar ahora',
          to: { name: 'Settings', query: { tab: 'whatsapp' } },
        },
      })
    }

    return items
  })

  return { notifications }
}
