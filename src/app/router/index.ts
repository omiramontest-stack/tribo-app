import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import AdminLayout from '@/app/layouts/AdminLayout.vue'

import adminRoutes from './routes/admin.routes'
import publicRoutes from './routes/public.routes'
import sharedRoutes from './routes/shared.routes'

import { useFlyonUIMiddleware } from './middlewares/useFlyonUIMiddleware'
import { useAuthGuard } from './middlewares/useAuthGuard'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/admin/dashboard',
  },
  {
    path: '/admin',
    component: AdminLayout,
    children: adminRoutes,
  },
  ...publicRoutes,
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: AdminLayout,
    children: sharedRoutes,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes,
})

useFlyonUIMiddleware(router)
useAuthGuard(router)

export default router
