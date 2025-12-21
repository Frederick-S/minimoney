import { ref } from 'vue'
import { useSupabase } from './useSupabase'
import { useExpenseManagement } from './useExpenseManagement'
import { useCategories } from './useCategories'
import { type Expense, type BillingEvent, type PastBillsPreview } from '../types'
import { addMonths, addYears, parseISO, isValid, isBefore, isAfter, format } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

/**
 * Options for creating subscription expenses
 */
export interface SubscriptionExpenseOptions {
  subscriptionId: string
  categoryId: string  // Subscription category ID
  userTimezone: string  // User's timezone for date calculations
}

/**
 * Composable for managing subscription expense generation
 * Handles calculating billing events and creating expense records
 */
export function useSubscriptionExpenses() {
  const { user, supabase } = useSupabase()
  const { batchSaveExpenses } = useExpenseManagement()
  const { categories, getCategoryById } = useCategories()
  
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Calculate all billing events between start date and end date
   * Handles month-end dates and leap years correctly using date-fns
   * 
   * @param startDate - Start date in YYYY-MM-DD format (in user's timezone)
   * @param endDate - End date in YYYY-MM-DD format (in user's timezone)
   * @param amount - Billing amount per event
   * @param currency - Currency code
   * @param frequency - Billing frequency ('monthly' or 'yearly')
   * @param userTimezone - User's timezone for date calculations
   * @returns Array of billing events
   */
  const calculateBillingEvents = (
    startDate: string,
    endDate: string,
    amount: number,
    currency: string,
    frequency: 'monthly' | 'yearly',
    userTimezone: string
  ): BillingEvent[] => {
    try {
      // Parse dates
      const start = parseISO(startDate)
      const end = parseISO(endDate)

      // Validate dates
      if (!isValid(start) || !isValid(end)) {
        throw new Error('Invalid date format')
      }

      if (isAfter(start, end)) {
        return []
      }

      const events: BillingEvent[] = []
      let currentDate = start

      // Generate billing events
      while (isBefore(currentDate, end) || currentDate.getTime() === end.getTime()) {
        // Add billing event for current date
        events.push({
          date: format(currentDate, 'yyyy-MM-dd'),
          amount,
          currency
        })

        // Calculate next billing date based on frequency
        if (frequency === 'monthly') {
          currentDate = addMonths(currentDate, 1)
        } else if (frequency === 'yearly') {
          currentDate = addYears(currentDate, 1)
        } else {
          throw new Error('Invalid billing frequency')
        }

        // Safety check to prevent infinite loops
        if (events.length > 10000) {
          throw new Error('Too many billing events calculated')
        }
      }

      return events
    } catch (e) {
      console.error('Error calculating billing events:', e)
      throw e
    }
  }

  /**
   * Generate preview of past bills for user confirmation
   * Calculates billing events from start date to today
   * 
   * @param startDate - Subscription start date in YYYY-MM-DD format (in user's timezone)
   * @param amount - Billing amount per event
   * @param currency - Currency code
   * @param frequency - Billing frequency ('monthly' or 'yearly')
   * @param userTimezone - User's timezone for date calculations
   * @returns Preview data with events, count, and total
   */
  const generatePastBillsPreview = (
    startDate: string,
    amount: number,
    currency: string,
    frequency: 'monthly' | 'yearly',
    userTimezone: string
  ): PastBillsPreview => {
    try {
      // Get current date in user's timezone
      const now = new Date()
      const zonedNow = toZonedTime(now, userTimezone)
      const today = format(zonedNow, 'yyyy-MM-dd')

      // Calculate billing events from start date to today
      const events = calculateBillingEvents(
        startDate,
        today,
        amount,
        currency,
        frequency,
        userTimezone
      )

      // Calculate total amount
      const totalAmount = events.reduce((sum, event) => sum + event.amount, 0)

      return {
        events,
        count: events.length,
        totalAmount,
        startDate,
        endDate: today
      }
    } catch (e) {
      console.error('Error generating past bills preview:', e)
      throw e
    }
  }

  /**
   * Create expense records for billing events
   * Uses batch insert for efficiency
   * Converts dates from user timezone to UTC for storage
   * 
   * @param events - Array of billing events to create expenses for
   * @param options - Options including subscription ID, category ID, and timezone
   * @returns Object with success and failed counts
   */
  const createExpensesForBillingEvents = async (
    events: BillingEvent[],
    options: SubscriptionExpenseOptions
  ): Promise<{ success: number; failed: number }> => {
    if (!user.value) {
      throw new Error('User not authenticated')
    }

    if (events.length === 0) {
      return { success: 0, failed: 0 }
    }

    loading.value = true
    error.value = null

    try {
      // Convert billing events to expense records
      const expenses: Array<Omit<Expense, 'id'>> = events.map(event => {
        // Parse the date in user's timezone
        const eventDate = parseISO(event.date)
        
        // Date is already in YYYY-MM-DD format which is what we store
        // The database will interpret this as a DATE type (no timezone)
        return {
          amount: event.amount,
          categoryId: options.categoryId,
          date: event.date,  // Store as YYYY-MM-DD
          note: undefined,
          subscriptionId: options.subscriptionId,
          userId: user.value!.id
        }
      })

      // Use batch save with skipRefresh=true to avoid triggering UI refresh
      // until all expenses are created
      const result = await batchSaveExpenses(expenses, true)

      return result
    } catch (e) {
      console.error('Error creating expenses for billing events:', e)
      error.value = e instanceof Error ? e.message : 'Failed to create expenses'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Get all expenses linked to a subscription
   * 
   * @param subscriptionId - The subscription ID to fetch expenses for
   * @returns Array of expenses linked to the subscription
   */
  const getSubscriptionExpenses = async (
    subscriptionId: string
  ): Promise<Expense[]> => {
    if (!user.value) {
      throw new Error('User not authenticated')
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.value.id)
        .eq('subscription_id', subscriptionId)
        .order('date', { ascending: false })

      if (fetchError) {
        console.error('Error fetching subscription expenses:', fetchError)
        throw new Error('Failed to fetch subscription expenses')
      }

      // Convert snake_case to camelCase
      const expenses = (data || []).map(expense => ({
        id: expense.id,
        amount: expense.amount,
        categoryId: expense.category_id,
        date: expense.date,
        note: expense.note,
        userId: expense.user_id,
        subscriptionId: expense.subscription_id,
        createdAt: expense.created_at,
        updatedAt: expense.updated_at
      }))

      return expenses
    } catch (e) {
      console.error('Error getting subscription expenses:', e)
      error.value = e instanceof Error ? e.message : 'Failed to get subscription expenses'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete all expenses linked to a subscription
   * Used when deleting a subscription with the option to remove expenses
   * 
   * @param subscriptionId - The subscription ID to delete expenses for
   */
  const deleteSubscriptionExpenses = async (
    subscriptionId: string
  ): Promise<void> => {
    if (!user.value) {
      throw new Error('User not authenticated')
    }

    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('user_id', user.value.id)
        .eq('subscription_id', subscriptionId)

      if (deleteError) {
        console.error('Error deleting subscription expenses:', deleteError)
        throw new Error('Failed to delete subscription expenses')
      }
    } catch (e) {
      console.error('Error deleting subscription expenses:', e)
      error.value = e instanceof Error ? e.message : 'Failed to delete subscription expenses'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Get the subscription category ID for the current user
   * Looks for a category with name 'subscription'
   * 
   * @returns The subscription category ID or null if not found
   */
  const getSubscriptionCategoryId = (): string | null => {
    // Look for category with name 'subscription'
    const subscriptionCategory = categories.value.find(
      cat => cat.name === 'subscription'
    )
    
    return subscriptionCategory?.id || null
  }

  return {
    // State
    loading,
    error,

    // Methods
    calculateBillingEvents,
    generatePastBillsPreview,
    createExpensesForBillingEvents,
    getSubscriptionExpenses,
    deleteSubscriptionExpenses,
    getSubscriptionCategoryId
  }
}
