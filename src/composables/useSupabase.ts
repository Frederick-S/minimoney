import { createClient, type User, type Session } from '@supabase/supabase-js'
import { ref } from 'vue'

// Supabase configuration - replace with your actual values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit' // Use implicit flow to allow password reset links to work across browsers
  }
})

// Global reactive state
const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)
const initialized = ref(false)

export function useSupabase() {
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
        await initializeUserCategoriesForNewUser(userId)
      }
    } catch (error) {
      console.error('Error ensuring user has categories:', error)
    }
  }

  const signUp = async (email: string, password: string) => {
    // Use current origin for redirect, fallback to env variable
    const redirectUrl = import.meta.env.VITE_SUPABASE_REDIRECT_URL || window.location.origin
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    })

    if (data.user && !error) {
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

  const resetPasswordForEmail = async (email: string) => {
    // Use current origin for redirect, fallback to env variable
    const baseUrl = import.meta.env.VITE_SUPABASE_REDIRECT_URL || window.location.origin
    const redirectUrl = baseUrl.endsWith('/') ? `${baseUrl}#/reset-password` : `${baseUrl}/#/reset-password`
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
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
    resetPasswordForEmail,
    initAuth,
  }
}