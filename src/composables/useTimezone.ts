import { ref, computed } from 'vue'
import { useSupabase } from './useSupabase'
import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz'
import { parseISO, isValid, format } from 'date-fns'

/**
 * Composable for managing user timezone preferences and timezone conversions
 * 
 * This composable provides:
 * - Getting user's timezone from preferences or browser
 * - Saving timezone preference to database
 * - Converting dates between timezones
 * - Formatting dates in specific timezones
 */
export function useTimezone() {
  const { supabase, user } = useSupabase()
  
  // Reactive state for timezone
  const userTimezone = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Get the browser's detected timezone
   * Falls back to 'UTC' if detection fails
   */
  const getBrowserTimezone = (): string => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    } catch (e) {
      console.warn('Failed to detect browser timezone, falling back to UTC', e)
      return 'UTC'
    }
  }

  /**
   * Get user's timezone preference from database
   * Returns null if not found
   */
  const getTimezoneFromPreferences = async (): Promise<string | null> => {
    if (!user.value?.id) {
      return null
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('user_preferences')
        .select('value')
        .eq('user_id', user.value.id)
        .eq('category', 'general')
        .eq('key', 'timezone')
        .maybeSingle()

      if (fetchError) {
        console.error('Error fetching timezone preference:', fetchError)
        return null
      }

      return data?.value || null
    } catch (e) {
      console.error('Error getting timezone from preferences:', e)
      return null
    }
  }

  /**
   * Get user's timezone with fallback logic:
   * 1. Try to get from database preferences
   * 2. Fall back to browser timezone
   * 3. Fall back to UTC
   * 
   * This function caches the result in userTimezone ref
   */
  const getUserTimezone = async (): Promise<string> => {
    loading.value = true
    error.value = null

    try {
      // Try to get from preferences first
      const preferenceTimezone = await getTimezoneFromPreferences()
      
      if (preferenceTimezone) {
        userTimezone.value = preferenceTimezone
        return preferenceTimezone
      }

      // Fall back to browser timezone
      const browserTimezone = getBrowserTimezone()
      userTimezone.value = browserTimezone
      return browserTimezone
    } catch (e) {
      console.error('Error getting user timezone:', e)
      error.value = 'Failed to get timezone'
      
      // Final fallback to UTC
      const fallback = 'UTC'
      userTimezone.value = fallback
      return fallback
    } finally {
      loading.value = false
    }
  }

  /**
   * Save user's timezone preference to database
   * Creates or updates the preference record
   */
  const saveUserTimezone = async (timezone: string): Promise<boolean> => {
    if (!user.value?.id) {
      error.value = 'User not authenticated'
      return false
    }

    loading.value = true
    error.value = null

    try {
      // Validate timezone string (basic check)
      if (!timezone || timezone.trim() === '') {
        throw new Error('Invalid timezone')
      }

      // Use upsert to create or update the preference
      const { error: upsertError } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.value.id,
            category: 'general',
            key: 'timezone',
            value: timezone,
          },
          {
            onConflict: 'user_id,category,key',
          }
        )

      if (upsertError) {
        console.error('Error saving timezone preference:', upsertError)
        error.value = 'Failed to save timezone preference'
        return false
      }

      // Update local state
      userTimezone.value = timezone
      return true
    } catch (e) {
      console.error('Error saving timezone:', e)
      error.value = e instanceof Error ? e.message : 'Failed to save timezone'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Convert a date from user's timezone to UTC
   * 
   * @param dateString - ISO date string or Date object in user's timezone
   * @param timezone - Timezone to convert from (defaults to user's timezone)
   * @returns Date object in UTC
   */
  const convertToUtc = (dateString: string | Date, timezone?: string): Date => {
    try {
      const tz = timezone || userTimezone.value || getBrowserTimezone()
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
      
      if (!isValid(date)) {
        throw new Error('Invalid date')
      }

      return fromZonedTime(date, tz)
    } catch (e) {
      console.error('Error converting to UTC:', e)
      throw e
    }
  }

  /**
   * Convert a UTC date to user's timezone
   * 
   * @param dateString - ISO date string or Date object in UTC
   * @param timezone - Timezone to convert to (defaults to user's timezone)
   * @returns Date object in user's timezone
   */
  const convertFromUtc = (dateString: string | Date, timezone?: string): Date => {
    try {
      const tz = timezone || userTimezone.value || getBrowserTimezone()
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
      
      if (!isValid(date)) {
        throw new Error('Invalid date')
      }

      return toZonedTime(date, tz)
    } catch (e) {
      console.error('Error converting from UTC:', e)
      throw e
    }
  }

  /**
   * Format a date in a specific timezone
   * 
   * @param date - Date to format
   * @param formatString - Format string (date-fns format)
   * @param timezone - Timezone to format in (defaults to user's timezone)
   * @returns Formatted date string
   */
  const formatInTimezone = (
    date: string | Date,
    formatString: string,
    timezone?: string
  ): string => {
    try {
      const tz = timezone || userTimezone.value || getBrowserTimezone()
      const dateObj = typeof date === 'string' ? parseISO(date) : date
      
      if (!isValid(dateObj)) {
        throw new Error('Invalid date')
      }

      return formatTz(dateObj, formatString, { timeZone: tz })
    } catch (e) {
      console.error('Error formatting date in timezone:', e)
      throw e
    }
  }

  /**
   * Get the current date in user's timezone as YYYY-MM-DD string
   * 
   * @param timezone - Timezone to use (defaults to user's timezone)
   * @returns Date string in YYYY-MM-DD format
   */
  const getCurrentDateInTimezone = (timezone?: string): string => {
    const tz = timezone || userTimezone.value || getBrowserTimezone()
    const now = new Date()
    return formatTz(now, 'yyyy-MM-dd', { timeZone: tz })
  }

  /**
   * Convert a date string from one timezone to another
   * 
   * @param dateString - ISO date string
   * @param fromTimezone - Source timezone
   * @param toTimezone - Target timezone
   * @returns Date string in target timezone (YYYY-MM-DD format)
   */
  const convertBetweenTimezones = (
    dateString: string,
    fromTimezone: string,
    toTimezone: string
  ): string => {
    try {
      const date = parseISO(dateString)
      if (!isValid(date)) {
        throw new Error('Invalid date')
      }

      // First convert from source timezone to UTC
      const utcDate = fromZonedTime(date, fromTimezone)
      
      // Then convert from UTC to target timezone
      const targetDate = toZonedTime(utcDate, toTimezone)
      
      return formatTz(targetDate, 'yyyy-MM-dd', { timeZone: toTimezone })
    } catch (e) {
      console.error('Error converting between timezones:', e)
      throw e
    }
  }

  // Computed property for easy access to timezone or fallback
  const currentTimezone = computed(() => {
    return userTimezone.value || getBrowserTimezone()
  })

  return {
    // State
    userTimezone,
    currentTimezone,
    loading,
    error,

    // Methods
    getUserTimezone,
    saveUserTimezone,
    getBrowserTimezone,
    convertToUtc,
    convertFromUtc,
    formatInTimezone,
    getCurrentDateInTimezone,
    convertBetweenTimezones,
  }
}
