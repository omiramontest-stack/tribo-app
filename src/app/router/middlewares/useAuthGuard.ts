import type { Router } from 'vue-router'
import { useAuthStore } from '@/app/stores/auth/AuthStore'

export function useAuthGuard(router: Router) {
  router.beforeEach((to, _from, next) => {
    const authStore = useAuthStore()

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      next({ name: 'Login' })
    } else if (to.name === 'Login' && authStore.isAuthenticated) {
      next({ name: 'Dashboard' })
    } else {
      next()
    }
  })
}
