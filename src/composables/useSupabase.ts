import { createClient, type User, type Session } from '@supabase/supabase-js'
import { ref, onMounted } from 'vue'

// Supabase configuration - replace with your actual values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Global reactive state
const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)

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
    return { error }
  }

  const updatePassword = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { data, error }
  }

  const initAuth = async () => {
    loading.value = true
    
    // Get initial session
    const { data: { session: initialSession } } = await supabase.auth.getSession()
    session.value = initialSession
    user.value = initialSession?.user ?? null
    
    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
      user.value = newSession?.user ?? null
      loading.value = false
    })
    
    loading.value = false
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