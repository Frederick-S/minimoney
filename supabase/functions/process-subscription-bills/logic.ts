/**
 * Core business logic for process-subscription-bills Edge Function
 * Extracted for testing purposes
 */

import { parseISO, format, isValid, isBefore, addMonths, addYears } from 'date-fns'

export interface Subscription {
  id: string
  user_id: string
  name: string
  amount: number
  quantity: number
  currency: string
  billing_frequency: 'monthly' | 'yearly'
  is_auto_renew: boolean
  start_date: string
  end_date: string | null
  next_billing_date: string
  created_at: string
  updated_at: string
}

export interface UserPreference {
  user_id: string
  value: string  // timezone string
}

/**
 * Get user's timezone preference or default to UTC
 */
export function getUserTimezone(preferences: UserPreference[]): string {
  const pref = preferences.find(p => p.value)
  return pref?.value || 'UTC'
}

/**
 * Calculate next billing date based on frequency
 */
export function calculateNextBillingDate(
  currentDate: string,
  frequency: 'monthly' | 'yearly',
  _userTimezone: string
): string {
  const date = parseISO(currentDate)
  
  if (!isValid(date)) {
    throw new Error(`Invalid date: ${currentDate}`)
  }
  
  const nextDate = frequency === 'monthly' 
    ? addMonths(date, 1)
    : addYears(date, 1)
  
  return format(nextDate, 'yyyy-MM-dd')
}

/**
 * Check if subscription should be processed
 * Compares dates in user's timezone
 */
export function shouldProcessSubscription(
  subscription: Pick<Subscription, 'next_billing_date' | 'end_date'>,
  currentDateInUserTz: string,
  _userTimezone: string
): boolean {
  // Check if next_billing_date matches current date in user's timezone
  if (subscription.next_billing_date !== currentDateInUserTz) {
    return false
  }
  
  // Check if subscription has expired (end_date < current_date)
  if (subscription.end_date) {
    const endDate = parseISO(subscription.end_date)
    const currentDate = parseISO(currentDateInUserTz)
    
    if (isValid(endDate) && isValid(currentDate) && isBefore(endDate, currentDate)) {
      return false
    }
  }
  
  return true
}

/**
 * Check if next billing date would exceed end date
 */
export function shouldUpdateNextBillingDate(
  nextBillingDate: string,
  endDate: string | null
): boolean {
  if (!endDate) {
    return true
  }
  
  const endDateParsed = parseISO(endDate)
  const nextDateParsed = parseISO(nextBillingDate)
  
  if (isValid(endDateParsed) && isValid(nextDateParsed) && (nextDateParsed > endDateParsed)) {
    return false
  }
  
  return true
}

/**
 * Create expense data from subscription
 */
export function createExpenseData(
  subscription: Pick<Subscription, 'id' | 'user_id' | 'amount' | 'quantity'>,
  subscriptionCategoryId: string,
  currentDateInUserTz: string
) {
  const totalAmount = subscription.amount * subscription.quantity
  
  return {
    user_id: subscription.user_id,
    amount: totalAmount,
    category_id: subscriptionCategoryId,
    date: currentDateInUserTz,
    subscription_id: subscription.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}
