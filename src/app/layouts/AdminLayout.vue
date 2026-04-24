<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import OrgSwitcher from '@/app/components/Admin/OrgSwitcher.vue'

const router = useRouter()
const authStore = useAuthStore()
const mobileOpen = ref(false)

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'Login' })
}

const navLinks = [
  { name: 'Dashboard', to: '/admin/dashboard', icon: '▪' },
  { name: 'Wallets', to: '/admin/wallets', icon: '▫' },
  { name: 'Escanear', to: '/admin/scan', icon: '⊡' },
  { name: 'Equipo', to: '/admin/team', icon: '◈' },
]
</script>

<template>
  <div class="flex h-screen bg-background-light dark:bg-background-dark overflow-hidden">
    <!-- Sidebar desktop -->
    <aside
      class="hidden lg:flex flex-col w-60 bg-default-light dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 shrink-0"
    >
      <div class="px-3 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <p class="px-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Wallet SaaS</p>
        <OrgSwitcher />
      </div>

      <nav class="flex-1 px-3 py-4 space-y-1">
        <router-link
          v-for="link in navLinks"
          :key="link.name"
          :to="link.to"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          active-class="bg-brand-primary-light/10 text-brand-primary-light dark:bg-brand-primary-dark/10 dark:text-brand-primary-dark"
        >
          <span>{{ link.icon }}</span>
          {{ link.name }}
        </router-link>
      </nav>

      <div class="px-3 py-4 border-t border-neutral-200 dark:border-neutral-800">
        <p class="px-3 text-xs text-neutral-400 truncate mb-2">{{ authStore.admin?.email }}</p>
        <button
          class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          @click="handleLogout"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>

    <!-- Main area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Top bar mobile -->
      <header
        class="lg:hidden flex items-center justify-between px-4 py-3 bg-default-light dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800"
      >
        <span class="font-bold text-brand-primary-light dark:text-brand-primary-dark">Wallet SaaS</span>
        <button
          class="p-2 rounded-lg text-neutral-600 dark:text-neutral-300"
          @click="mobileOpen = !mobileOpen"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              v-if="!mobileOpen"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </header>

      <!-- Mobile menu drawer -->
      <div
        v-if="mobileOpen"
        class="lg:hidden absolute inset-0 z-40 flex"
        @click.self="mobileOpen = false"
      >
        <div class="w-60 bg-default-light dark:bg-neutral-900 shadow-xl flex flex-col">
          <div class="px-3 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <p class="px-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Wallet SaaS</p>
            <OrgSwitcher />
          </div>
          <nav class="flex-1 px-3 py-4 space-y-1">
            <router-link
              v-for="link in navLinks"
              :key="link.name"
              :to="link.to"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              active-class="bg-brand-primary-light/10 text-brand-primary-light"
              @click="mobileOpen = false"
            >
              <span>{{ link.icon }}</span>
              {{ link.name }}
            </router-link>
          </nav>
          <div class="px-3 py-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500"
              @click="handleLogout"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
