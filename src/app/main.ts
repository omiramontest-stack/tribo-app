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

// Verify active session before the router guard runs (top-level await)
const authStore = useAuthStore()
await authStore.init()

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
