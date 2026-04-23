import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '',
    redirect: { name: 'Dashboard' },
  },
  {
    path: 'dashboard',
    name: 'Dashboard',
    component: () => import('@/app/views/admin/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: 'wallets',
    name: 'Wallets',
    component: () => import('@/app/views/admin/WalletsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: 'wallets/create',
    name: 'WalletCreate',
    component: () => import('@/app/views/admin/WalletCreateView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: 'wallets/:id',
    name: 'WalletDetail',
    component: () => import('@/app/views/admin/WalletDetailView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: 'scan',
    name: 'Scan',
    component: () => import('@/app/views/admin/ScanView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: 'team',
    name: 'Team',
    component: () => import('@/app/views/admin/TeamView.vue'),
    meta: { requiresAuth: true },
  },
]

export default routes
