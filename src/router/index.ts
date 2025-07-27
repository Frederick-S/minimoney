import { createRouter, createWebHistory } from 'vue-router'
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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Route guard for authentication
router.beforeEach(async (to, from, next) => {
  const { user, initAuth } = useSupabase()
  
  // Initialize auth if not already done
  if (user.value === undefined) {
    await initAuth()
  }
  
  console.log('Router guard:', { 
    to: to.path, 
    from: from.path, 
    user: user.value?.id || 'no user',
    requiresAuth: to.meta.requiresAuth 
  })
  
  // Check if route requires authentication
  if (to.meta.requiresAuth && !user.value) {
    console.log('Redirecting to login - no user for protected route')
    next('/login')
  } else if (to.path === '/login' && user.value) {
    console.log('Redirecting to home - user already authenticated')
    next('/home')
  } else {
    console.log('Allowing navigation')
    next()
  }
})

export default router
