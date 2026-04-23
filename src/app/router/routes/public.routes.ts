import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/app/views/admin/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('@/app/views/admin/OnboardingView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/invite/:token',
    name: 'Invite',
    component: () => import('@/app/views/admin/InviteView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/w/:token',
    name: 'PassView',
    component: () => import('@/app/views/wallet/PassView.vue'),
    meta: { requiresAuth: false },
  },
]

export default routes
