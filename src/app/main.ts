import '@/app/assets/css/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@vueuse/head'

import App from './App.vue'
import i18n from '@/app/plugins/i18n.settings'
import router from './router'
import { useAuthStore } from '@/app/stores/auth/AuthStore'

const pinia = createPinia()
const app = createApp(App)
const head = createHead()

app.use(pinia)

// Verify active session before the router guard runs (top-level await)
const authStore = useAuthStore()
await authStore.init()

app.use(router)
app.use(i18n)
app.use(head)

app.mount('#app')
