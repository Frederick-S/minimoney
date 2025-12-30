import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'
import { addMonths, addYears, parseISO, format, isValid, isBefore } from 'https://esm.sh/date-fns@4.1.0'
import { toZonedTime, fromZonedTime } from 'https://esm.sh/date-fns-tz@3.2.0'

/**
 * Supabase Edge Function: process-subscription-bills
 * 
 * Automatically processes subscription billing events by:
 * 1. Identifying subscriptions due for billing (in user's timezone)
 * 2. Creating expense records for due subscriptions
 * 3. Updating next_billing_date for processed subscriptions
 * 4. Handling end dates and auto-renew logic
 * 5. Implementing error handling with retry logic
 * 
 * Scheduled to run hourly via pg_cron
 */

interface Subscription {
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

interface UserPreference {
  user_id: string
  value: string  // timezone string
}

interface ProcessingResult {
  processedCount: number
  successCount: number
  failedCount: number
  errors: Array<{ subscriptionId: string; userId: string; subscriptionName: string; error: string; timestamp: string }>
}

interface BillingLogEntry {
  execution_start: string
  execution_end: string | null
  status: 'running' | 'completed' | 'failed'
  processed_count: number
  success_count: number
  failed_count: number
  error_details: { errors: ProcessingResult['errors'] } | null
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt < maxAttempts) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}

/**
 * Get user's timezone preference or default to UTC
 */
function getUserTimezone(preferences: UserPreference[]): string {
  const pref = preferences.find(p => p.value)
  return pref?.value || 'UTC'
}

/**
 * Calculate next billing date based on frequency
 */
function calculateNextBillingDate(
  currentDate: string,
  frequency: 'monthly' | 'yearly',
  userTimezone: string
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
function shouldProcessSubscription(
  subscription: Subscription,
  currentDateInUserTz: string,
  userTimezone: string
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
 * Process a single subscription billing event
 */
async function processSubscription(
  supabase: any,
  subscription: Subscription,
  subscriptionCategoryId: string,
  currentDateInUserTz: string,
  userTimezone: string
): Promise<void> {
  const { id, user_id, amount, quantity, currency, billing_frequency } = subscription
  
  // Calculate total amount (amount * quantity)
  const totalAmount = amount * quantity
  
  // Create expense record
  const expense = {
    user_id,
    amount: totalAmount,
    category_id: subscriptionCategoryId,
    date: currentDateInUserTz,  // Store as YYYY-MM-DD
    subscription_id: id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  // Insert expense with retry logic
  await retryWithBackoff(async () => {
    const { error: expenseError } = await supabase
      .from('expenses')
      .insert(expense)
    
    if (expenseError) {
      throw new Error(`Failed to create expense: ${expenseError.message}`)
    }
  })
  
  // Calculate next billing date
  const nextBillingDate = calculateNextBillingDate(
    subscription.next_billing_date,
    billing_frequency,
    userTimezone
  )
  
  // Check if next billing date exceeds end date
  let shouldUpdate = true
  if (subscription.end_date) {
    const endDate = parseISO(subscription.end_date)
    const nextDate = parseISO(nextBillingDate)
    
    if (isValid(endDate) && isValid(nextDate) && (nextDate > endDate)) {
      shouldUpdate = false
    }
  }
  
  // Update subscription's next_billing_date with retry logic
  if (shouldUpdate) {
    await retryWithBackoff(async () => {
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          next_billing_date: nextBillingDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user_id)
      
      if (updateError) {
        throw new Error(`Failed to update subscription: ${updateError.message}`)
      }
    })
  }
}

/**
 * Main processing function
 */
async function processSubscriptionBills(supabase: any): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    processedCount: 0,
    successCount: 0,
    failedCount: 0,
    errors: []
  }
  
  try {
    // Get current UTC time
    const now = new Date()
    
    // Fetch all active subscriptions with user timezone preferences
    const { data: subscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        user_preferences!inner(user_id, value)
      `)
      .eq('user_preferences.category', 'general')
      .eq('user_preferences.key', 'timezone')
    
    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError)
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`)
    }
    
    // Also fetch subscriptions without timezone preference (will use UTC)
    const { data: subscriptionsWithoutTz, error: fetchError2 } = await supabase
      .from('subscriptions')
      .select('*')
      .not('user_id', 'in', 
        supabase
          .from('user_preferences')
          .select('user_id')
          .eq('category', 'general')
          .eq('key', 'timezone')
      )
    
    // Combine both sets
    const allSubscriptions = [
      ...(subscriptions || []),
      ...(subscriptionsWithoutTz || []).map((s: Subscription) => ({
        ...s,
        user_preferences: []
      }))
    ]
    
    // Get subscription category ID (assuming it exists for all users)
    // We'll fetch it once and reuse
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('name', 'subscription')
      .limit(1)
      .single()
    
    if (categoryError || !categoryData) {
      console.error('Subscription category not found:', categoryError)
      throw new Error('Subscription category not found')
    }
    
    const subscriptionCategoryId = categoryData.id
    
    // Process each subscription
    for (const sub of allSubscriptions) {
      result.processedCount++
      
      try {
        // Get user's timezone
        const userTimezone = getUserTimezone(sub.user_preferences || [])
        
        // Convert current UTC time to user's local date
        const zonedNow = toZonedTime(now, userTimezone)
        const currentDateInUserTz = format(zonedNow, 'yyyy-MM-dd')
        
        // Check if subscription should be processed
        if (!shouldProcessSubscription(sub, currentDateInUserTz, userTimezone)) {
          continue
        }
        
        // Process the subscription
        await processSubscription(
          supabase,
          sub,
          subscriptionCategoryId,
          currentDateInUserTz,
          userTimezone
        )
        
        result.successCount++
        
        console.log(JSON.stringify({
          level: 'INFO',
          timestamp: new Date().toISOString(),
          message: 'Successfully processed subscription',
          data: {
            subscriptionId: sub.id,
            userId: sub.user_id,
            subscriptionName: sub.name,
            userTimezone,
            currentDate: currentDateInUserTz
          }
        }))
      } catch (error) {
        result.failedCount++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        result.errors.push({
          subscriptionId: sub.id,
          userId: sub.user_id,
          subscriptionName: sub.name,
          error: errorMessage,
          timestamp: new Date().toISOString()
        })
        
        console.error(JSON.stringify({
          level: 'ERROR',
          timestamp: new Date().toISOString(),
          message: 'Failed to process subscription',
          data: {
            subscriptionId: sub.id,
            userId: sub.user_id,
            subscriptionName: sub.name,
            error: errorMessage
          }
        }))
      }
    }
  } catch (error) {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message: 'Critical error in processSubscriptionBills',
      error: error instanceof Error ? error.message : 'Unknown error'
    }))
    throw error
  }
  
  return result
}

/**
 * Log execution to database
 * Returns the log ID for updating later
 */
async function logExecutionStart(
  supabase: any,
  executionStart: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('subscription_billing_logs')
      .insert({
        execution_start: executionStart,
        status: 'running',
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        error_details: null
      })
      .select('id')
      .single()
    
    if (error) {
      console.error('Failed to log execution start:', error)
      return null
    }
    
    return data?.id || null
  } catch (error) {
    console.error('Failed to log execution start:', error)
    return null
  }
}

/**
 * Update execution log with completion details
 */
async function logExecutionEnd(
  supabase: any,
  logId: string | null,
  executionEnd: string,
  status: 'completed' | 'failed',
  result: ProcessingResult
): Promise<void> {
  if (!logId) {
    // If we don't have a log ID, insert a new record
    try {
      await supabase
        .from('subscription_billing_logs')
        .insert({
          execution_start: executionEnd,
          execution_end: executionEnd,
          status,
          processed_count: result.processedCount,
          success_count: result.successCount,
          failed_count: result.failedCount,
          error_details: result.errors.length > 0 ? { errors: result.errors } : null
        })
    } catch (error) {
      console.error('Failed to insert execution log:', error)
    }
    return
  }
  
  try {
    const { error } = await supabase
      .from('subscription_billing_logs')
      .update({
        execution_end: executionEnd,
        status,
        processed_count: result.processedCount,
        success_count: result.successCount,
        failed_count: result.failedCount,
        error_details: result.errors.length > 0 ? { errors: result.errors } : null
      })
      .eq('id', logId)
    
    if (error) {
      console.error('Failed to update execution log:', error)
    }
  } catch (error) {
    console.error('Failed to update execution log:', error)
  }
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  // Health check endpoint
  if (req.method === 'GET') {
    const url = new URL(req.url)
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }
  }
  
  // Only allow POST requests for processing
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 405
    })
  }
  
  const executionStart = new Date().toISOString()
  
  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Check for dry-run mode
    const body = await req.json().catch(() => ({}))
    const { dryRun } = body
    
    if (dryRun) {
      // Dry run mode: calculate what would be processed without creating expenses
      const now = new Date()
      
      const { data: subscriptions, error: fetchError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          name,
          next_billing_date,
          user_preferences!inner(value)
        `)
        .eq('user_preferences.category', 'general')
        .eq('user_preferences.key', 'timezone')
      
      if (fetchError) {
        throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`)
      }
      
      const wouldProcess = (subscriptions || []).filter((sub: any) => {
        const userTimezone = getUserTimezone(sub.user_preferences || [])
        const zonedNow = toZonedTime(now, userTimezone)
        const currentDateInUserTz = format(zonedNow, 'yyyy-MM-dd')
        return shouldProcessSubscription(sub, currentDateInUserTz, userTimezone)
      })
      
      return new Response(JSON.stringify({
        dryRun: true,
        wouldProcess: wouldProcess.length,
        subscriptions: wouldProcess.map((s: any) => ({
          id: s.id,
          name: s.name,
          nextBillingDate: s.next_billing_date
        }))
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }
    
    // Log execution start
    const logId = await logExecutionStart(supabase, executionStart)
    
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: executionStart,
      message: 'Starting subscription billing processing',
      data: { logId }
    }))
    
    // Process subscriptions
    const result = await processSubscriptionBills(supabase)
    
    const executionEnd = new Date().toISOString()
    
    // Log execution completion
    await logExecutionEnd(supabase, logId, executionEnd, 'completed', result)
    
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: executionEnd,
      message: 'Completed subscription billing processing',
      data: {
        processedCount: result.processedCount,
        successCount: result.successCount,
        failedCount: result.failedCount,
        duration: new Date(executionEnd).getTime() - new Date(executionStart).getTime()
      }
    }))
    
    return new Response(JSON.stringify({
      success: true,
      ...result,
      executionStart,
      executionEnd
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    const executionEnd = new Date().toISOString()
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: executionEnd,
      message: 'Failed to process subscription billing',
      error: errorMessage
    }))
    
    // Try to log the failure
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        // Create a result object for the error
        const errorResult: ProcessingResult = {
          processedCount: 0,
          successCount: 0,
          failedCount: 1,
          errors: [{ 
            subscriptionId: 'N/A',
            userId: 'N/A',
            subscriptionName: 'N/A',
            error: errorMessage,
            timestamp: executionEnd
          }]
        }
        
        // Try to update existing log or insert new one
        await logExecutionEnd(supabase, null, executionEnd, 'failed', errorResult)
      }
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
