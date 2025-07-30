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

  // Function to initialize user categories for new users
  const initializeUserCategoriesForNewUser = async (userId: string) => {
    const { error } = await supabase.rpc('create_categories_for_new_user', {
      user_uuid: userId,
      p_category_set: 'default',
      p_locale: 'zh_CN'
    })

    if (error) {
      console.error('Error initializing user categories:', error)
      throw error
    }
  }

  // Function to check if user has categories and initialize if needed
  const ensureUserHasCategories = async (userId: string) => {
    try {
      // Check if user has any categories
      const { data: existingCategories, error } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .limit(1)

      if (error) {
        console.error('Error checking user categories:', error)
        return
      }

      // If no categories exist, initialize them
      if (!existingCategories || existingCategories.length === 0) {
        console.log('Initializing categories for new user:', userId)
        await initializeUserCategoriesForNewUser(userId)
      }
    } catch (error) {
      console.error('Error ensuring user has categories:', error)
    }
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    if (error) {
      showError('注册失败: ' + error.message)
    } else if (data.user) {
      showSuccess('注册成功，请检查邮箱验证链接')
      
      // Initialize user categories after successful signup
      try {
        await initializeUserCategoriesForNewUser(data.user.id)
      } catch (categoryError) {
        console.error('Failed to initialize categories for new user:', categoryError)
        // Don't show error to user as signup was successful, just log it
      }
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
        
        // If user is already signed in, ensure they have categories
        if (initialSession?.user?.id) {
          ensureUserHasCategories(initialSession.user.id)
        }
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
          // User signed in - ensure they have categories
          if (newSession?.user?.id) {
            ensureUserHasCategories(newSession.user.id)
          }
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