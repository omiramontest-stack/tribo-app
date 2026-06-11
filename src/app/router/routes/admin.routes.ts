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
    path: 'wallets/:id/analytics',
    name: 'WalletAnalytics',
    component: () => import('@/app/views/admin/WalletAnalyticsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: 'wallets/:id/geofences',
    name: 'WalletGeofences',
    component: () => import('@/app/views/admin/WalletGeofencesView.vue'),
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
  {
    path: 'analytics',
    name: 'Analytics',
    component: () => import('@/app/views/admin/AnalyticsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: 'campaigns',
    name: 'Campaigns',
    component: () => import('@/app/views/admin/CampaignsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: 'campaigns/:id/analytics',
    name: 'CampaignAnalytics',
    component: () => import('@/app/views/admin/CampaignAnalyticsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: 'billing',
    name: 'Billing',
    component: () => import('@/app/views/admin/BillingView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: 'settings',
    name: 'Settings',
    component: () => import('@/app/views/admin/SettingsView.vue'),
    meta: { requiresAuth: true },
  },
]

export default routes
