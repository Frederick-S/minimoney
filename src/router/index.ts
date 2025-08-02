import { createRouter, createWebHashHistory } from 'vue-router'
import { useSupabase } from '../composables/useSupabase'
import HomeView from '../components/HomeView.vue'
import ChartsView from '../components/ChartsView.vue'
import Auth from '../components/Auth.vue'

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/login',
    name: 'Login',
    component: Auth
  },
  {
    path: '/home',
    name: 'Home',
    component: HomeView,
    props: true,
    meta: { requiresAuth: true }
  },
  {
    path: '/charts',
    name: 'Charts',
    component: ChartsView,
    props: true,
    meta: { requiresAuth: true }
  },
  {
    // Catch-all route for Supabase auth redirects
    path: '/:pathMatch(.*)*',
    name: 'AuthHandler',
    component: Auth
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// Route guard for authentication
router.beforeEach(async (to, from, next) => {
  const { user, loading, initAuth } = useSupabase()
  
  // Initialize auth if not already done
  if (loading.value) {
    await initAuth()
  }
  
  // Wait for auth initialization to complete
  if (loading.value) {
    // Still loading, wait a bit more
    return next(false)
  }
  
  // Check if route requires authentication
  if (to.meta.requiresAuth && !user.value) {
    next('/login')
  } else if (to.path === '/login' && user.value) {
    next('/home')
  } else {
    next()
  }
})

export default router
