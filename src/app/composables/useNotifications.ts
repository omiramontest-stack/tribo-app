import { computed } from 'vue'
import { useAuthStore } from '@/app/stores/auth/AuthStore'

export interface AppNotification {
  id: string
  type: 'info' | 'warning' | 'error'
  title: string
  body: string
}

export function useNotifications() {
  const authStore = useAuthStore()

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

    return items
  })

  return { notifications }
}
