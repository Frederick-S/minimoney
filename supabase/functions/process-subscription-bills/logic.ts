/**
 * Core business logic for process-subscription-bills Edge Function
 * Extracted for testing purposes
 * 
 * Exports:
 * - getUserTimezone() - Get user's timezone preference
 * - calculateNextBillingDate() - Calculate next billing date based on frequency
 * - shouldProcessSubscription() - Determine if a subscription should be processed
 * - shouldUpdateNextBillingDate() - Check if next billing date should be updated
 * - createExpenseData() - Create expense data from subscription
 * - createBillingLogEntry() - Create a billing log entry from processing result
 * - validateBillingLogEntry() - Validate that a billing log entry contains all required fields
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

/**
 * Processing result interface
 */
export interface ProcessingResult {
  processedCount: number
  successCount: number
  failedCount: number
  errors: Array<{ subscriptionId: string; userId: string; subscriptionName: string; error: string; timestamp: string }>
}

/**
 * Billing log entry interface
 */
export interface BillingLogEntry {
  execution_start: string
  execution_end: string | null
  status: 'running' | 'completed' | 'failed'
  processed_count: number
  success_count: number
  failed_count: number
  error_details: { errors: ProcessingResult['errors'] } | null
}

/**
 * Create a billing log entry from processing result
 * This function encapsulates the logic for creating log entries
 */
export function createBillingLogEntry(
  executionStart: string,
  executionEnd: string,
  status: 'completed' | 'failed',
  result: ProcessingResult
): BillingLogEntry {
  return {
    execution_start: executionStart,
    execution_end: executionEnd,
    status,
    processed_count: result.processedCount,
    success_count: result.successCount,
    failed_count: result.failedCount,
    error_details: result.errors.length > 0 ? { errors: result.errors } : null
  }
}

/**
 * Validate that a billing log entry contains all required fields
 */
export function validateBillingLogEntry(logEntry: BillingLogEntry): boolean {
  // Check that all required fields are present
  if (!logEntry.execution_start || !logEntry.execution_end) {
    return false
  }
  
  // Check that status is valid
  if (!['running', 'completed', 'failed'].includes(logEntry.status)) {
    return false
  }
  
  // Check that counts are non-negative
  if (logEntry.processed_count < 0 || logEntry.success_count < 0 || logEntry.failed_count < 0) {
    return false
  }
  
  // Check that counts are consistent
  // processed_count should equal success_count + failed_count
  if (logEntry.processed_count !== logEntry.success_count + logEntry.failed_count) {
    return false
  }
  
  // Check that error_details is present when there are failures
  if (logEntry.failed_count > 0 && (!logEntry.error_details || !logEntry.error_details.errors)) {
    return false
  }
  
  // Check that error_details array length matches failed_count
  if (logEntry.error_details && logEntry.error_details.errors.length !== logEntry.failed_count) {
    return false
  }
  
  return true
}
