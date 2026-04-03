import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    component: () => import('@/pages/DashboardPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/records',
    component: () => import('@/pages/RecordsPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    component: () => import('@/pages/SettingsPage.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Restore session if not yet initialized
  if (auth.user === null && !auth.loading) {
    await auth.init()
  }

  if (to.meta.requiresAuth && !auth.user) {
    return '/login'
  }

  if (to.meta.guest && auth.user) {
    return '/dashboard'
  }
})

export default router
