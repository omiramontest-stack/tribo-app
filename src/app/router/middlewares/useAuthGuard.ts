import type { Router } from 'vue-router'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'

export function useAuthGuard(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore()
    const orgStore = useOrganizationStore()

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      return next({ name: 'Login' })
    }

    if (authStore.isAuthenticated) {
      if (!orgStore.initialized) {
        await orgStore.fetchMyOrganizations()
        const activeOrg = orgStore.activeOrg
        if (activeOrg) await authStore.switchOrg(activeOrg)
      }

      const hasOrg = orgStore.organizations.length > 0

      if (to.name === 'Onboarding') {
        return hasOrg ? next({ name: 'Dashboard' }) : next()
      }

      if (to.name === 'Login') {
        return next({ name: hasOrg ? 'Dashboard' : 'Onboarding' })
      }

      if (to.meta.requiresAuth && !hasOrg) {
        return next({ name: 'Onboarding' })
      }
    }

    next()
  })
}
