import { apiClient } from '@/infrastructure/http/ApiClient'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)))
}

function isSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

async function getOrCreateSubscription(
  registration: ServiceWorkerRegistration,
): Promise<PushSubscription> {
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!).buffer as ArrayBuffer,
  })
}

/**
 * Registers this browser for Web Push and saves the subscription to the backend.
 * Safe to call on every pass load — skips silently if already subscribed or unsupported.
 */
export async function registerWebPush(passToken: string): Promise<void> {
  if (!isSupported()) return
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[WebPush] VITE_VAPID_PUBLIC_KEY is not set — skipping push registration')
    return
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    await navigator.serviceWorker.ready

    // Don't ask again if permission already denied
    if (Notification.permission === 'denied') return

    // Ask permission only if not yet granted
    if (Notification.permission !== 'granted') {
      const result = await Notification.requestPermission()
      if (result !== 'granted') return
    }

    const subscription = await getOrCreateSubscription(registration)
    const subJson = subscription.toJSON() as {
      endpoint: string
      keys?: { p256dh: string; auth: string }
    }

    await apiClient.post(`/passes/${passToken}/register-push`, {
      subscription: {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh ?? '',
          auth: subJson.keys?.auth ?? '',
        },
      },
      platform: 'web',
    })
  } catch (err) {
    // Never crash the pass view due to push errors
    console.error('[WebPush] Registration failed:', err)
  }
}
