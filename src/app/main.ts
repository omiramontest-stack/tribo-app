import '@/app/assets/css/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@vueuse/head'

import App from './App.vue'
import i18n from '@/app/plugins/i18n.settings'
import router from './router'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import { apiClient } from '@/infrastructure/http/ApiClient'

const pinia = createPinia()
const app = createApp(App)
const head = createHead()

app.use(pinia)

const authStore = useAuthStore()

// Exchange one-time Google OAuth code for a real session before the router guard
// runs. The code is single-use and expires in 60 s, so we strip it from the URL
// immediately to prevent sharing or replay via browser history.
// The backend redirects to the root URL (https://www.tribowallet.me?code=<UUID>),
// not to /auth/google/callback, so we only check for the presence of ?code=.
const _googleCode = new URLSearchParams(window.location.search).get('code')

if (_googleCode) {
  window.history.replaceState({}, '', window.location.pathname)
  try {
    await authStore.exchangeGoogleSession(_googleCode)
  } catch {
    window.history.replaceState({}, '', '/login?error=google_auth_failed')
  }
} else {
  await authStore.init()
}

// When any request returns 403 "No organization context", reset org state and
// navigate back through the auth guard, which will re-call switch-org.
apiClient.onNoOrgContext = () => {
  useOrganizationStore().reset()
  router.push({ name: 'Dashboard' })
}

app.use(router)
app.use(i18n)
app.use(head)

app.mount('#app')
