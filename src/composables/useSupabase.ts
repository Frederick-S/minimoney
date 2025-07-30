import { createClient, type User, type Session } from '@supabase/supabase-js'
import { ref } from 'vue'
import { useToast } from './useToast'

// Supabase configuration - replace with your actual values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Global reactive state
const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)
const initialized = ref(false)

export function useSupabase() {
  const { showSuccess, showError } = useToast()

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    if (error) {
      showError('注册失败: ' + error.message)
    } else if (data.user) {
      showSuccess('注册成功，请检查邮箱验证链接')
    }
    
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      showError('登录失败: ' + error.message)
    } else if (data.user) {
      showSuccess('登录成功')
    }
    
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    // Clear user state immediately on sign out
    user.value = null
    session.value = null
    
    if (error) {
      showError('登出失败: ' + error.message)
    } else {
      showSuccess('已成功登出')
    }
    
    return { error }
  }

  const updatePassword = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (error) {
      showError('密码更新失败: ' + error.message)
    } else {
      showSuccess('密码更新成功')
    }
    
    return { data, error }
  }

  const initAuth = async () => {
    if (initialized.value) return
    
    loading.value = true
    
    try {
      // Get initial session from localStorage/storage
      const { data: { session: initialSession }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        showError('会话获取失败')
        // Clear any corrupted session data
        await supabase.auth.signOut()
        session.value = null
        user.value = null
      } else {
        session.value = initialSession
        user.value = initialSession?.user ?? null
      }
      
      // Listen for auth changes (login, logout, token refresh)
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        session.value = newSession
        user.value = newSession?.user ?? null
        
        // Handle token expiration
        if (event === 'TOKEN_REFRESHED') {
          // Token refreshed successfully
        } else if (event === 'SIGNED_OUT') {
          session.value = null
          user.value = null
        } else if (event === 'SIGNED_IN') {
          // User signed in
        }
        
        loading.value = false
      })
      
    } catch (error) {
      console.error('Auth initialization error:', error)
      showError('认证初始化失败')
      session.value = null
      user.value = null
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  return {
    supabase,
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updatePassword,
    initAuth,
  }
}