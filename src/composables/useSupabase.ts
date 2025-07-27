import { createClient, type User, type Session } from '@supabase/supabase-js'
import { ref } from 'vue'

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
  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    // Clear user state immediately on sign out
    user.value = null
    session.value = null
    return { error }
  }

  const updatePassword = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
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
        console.log('Auth state change:', event, newSession?.user?.email)
        
        session.value = newSession
        user.value = newSession?.user ?? null
        
        // Handle token expiration
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully')
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out')
          session.value = null
          user.value = null
        } else if (event === 'SIGNED_IN') {
          console.log('User signed in')
        }
        
        loading.value = false
      })
      
    } catch (error) {
      console.error('Auth initialization error:', error)
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