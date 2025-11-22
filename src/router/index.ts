import { createRouter, createWebHashHistory } from 'vue-router'
import { useSupabase } from '../composables/useSupabase'
import HomeView from '../components/HomeView.vue'
import ChartsView from '../components/ChartsView.vue'
import Auth from '../components/Auth.vue'
import ResetPassword from '../components/ResetPassword.vue'

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
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPassword
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
router.beforeEach(async (to, _from, next) => {
  const { user, loading, initAuth, supabase } = useSupabase()
  
  // Handle malformed hash redirection from Supabase (access_token interpreted as path)
  if (to.fullPath.includes('access_token=') && to.fullPath.includes('type=recovery')) {
    console.log('Detected recovery token in path, handling manual redirect...')
    // Extract parameters from the path/hash
    // The path might look like /access_token=...&type=recovery...
    const paramsString = to.fullPath.startsWith('/') ? to.fullPath.substring(1) : to.fullPath
    const params = new URLSearchParams(paramsString)
    
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    
    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      return next('/reset-password')
    }
  }

  // Allow access to reset password page without auth check (session comes from URL)
  if (to.path === '/reset-password') {
    return next()
  }
  
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
