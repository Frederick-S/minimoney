import { ref } from 'vue'
import { useSupabase } from './useSupabase'
import { useSubscriptionExpenses } from './useSubscriptionExpenses'
import { useTimezone } from './useTimezone'
import { type Subscription, type PastBillsPreview } from '../types'

// Helper functions to convert between snake_case (database) and camelCase (TypeScript)
const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

const convertKeysToCamelCase = <T extends Record<string, any>>(obj: any): T => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamelCase(item)) as unknown as T
  }

  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key)
    // Convert null to undefined for optional fields (endDate)
    if (value === null && camelKey === 'endDate') {
      result[camelKey] = undefined
    } else {
      result[camelKey] = convertKeysToCamelCase(value)
    }
  }
  return result
}

const convertKeysToSnakeCase = (obj: Record<string, any>): Record<string, any> => {
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    result[snakeKey] = value
  }
  return result
}

// Module-level refs for state persistence across navigation
const subscriptions = ref<Subscription[]>([])
const loading = ref(false)

export function useSubscriptions() {
  const { user, supabase } = useSupabase()

  /**
   * Log subscription audit entry
   * @param subscriptionId - The subscription ID
   * @param userId - The user ID
   * @param action - The action performed ('created', 'updated', 'deleted')
   * @param oldValues - The old values (for update/delete)
   * @param newValues - The new values (for create/update)
   * @param changedBy - Who made the change ('user' or 'system')
   */
  const logAudit = async (
    subscriptionId: string,
    userId: string,
    action: 'created' | 'updated' | 'deleted',
    oldValues: Record<string, any> | null,
    newValues: Record<string, any> | null,
    changedBy: 'user' | 'system'
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('subscription_audit_log')
        .insert([{
          subscription_id: subscriptionId,
          user_id: userId,
          action,
          old_values: oldValues,
          new_values: newValues,
          changed_by: changedBy
        }])

      if (error) {
        console.error('Error logging audit entry:', error)
        // Don't throw - audit logging failure shouldn't block the operation
      }
    } catch (error) {
      console.error('Unexpected error logging audit entry:', error)
      // Don't throw - audit logging failure shouldn't block the operation
    }
  }

  /**
   * Calculate next billing date based on start date and billing frequency
   * @param startDate - The starting date for billing calculation
   * @param frequency - The billing frequency ('monthly' or 'yearly')
   * @returns The next billing date
   */
  const calculateNextBillingDate = (startDate: Date, frequency: 'monthly' | 'yearly'): Date => {
    const nextDate = new Date(startDate)
    
    if (frequency === 'monthly') {
      // Add 1 month
      nextDate.setMonth(nextDate.getMonth() + 1)
    } else if (frequency === 'yearly') {
      // Add 1 year
      nextDate.setFullYear(nextDate.getFullYear() + 1)
    }
    
    return nextDate
  }

  /**
   * Validate subscription data
   * @param subscription - The subscription data to validate
   * @throws Error if validation fails
   */
  const validateSubscription = (subscription: Partial<Subscription>): void => {
    // Check required fields
    if (!subscription.name || subscription.name.trim() === '') {
      throw new Error('订阅名称不能为空')
    }
    
    // Validate name length
    if (subscription.name.trim().length > 100) {
      throw new Error('订阅名称不能超过100个字符')
    }
    
    if (subscription.amount === undefined || subscription.amount === null) {
      throw new Error('金额不能为空')
    }
    
    // Validate amount is a valid number
    if (isNaN(subscription.amount) || !isFinite(subscription.amount)) {
      throw new Error('金额必须是有效的数字')
    }
    
    if (subscription.amount <= 0) {
      throw new Error('金额必须大于0')
    }
    
    // Validate amount is reasonable (not too large)
    if (subscription.amount > 999999999.99) {
      throw new Error('金额过大，请输入合理的金额')
    }
    
    // Validate quantity
    if (subscription.quantity !== undefined && subscription.quantity !== null) {
      if (isNaN(subscription.quantity) || !isFinite(subscription.quantity)) {
        throw new Error('数量必须是有效的数字')
      }
      
      if (!Number.isInteger(subscription.quantity)) {
        throw new Error('数量必须是整数')
      }
      
      if (subscription.quantity <= 0) {
        throw new Error('数量必须大于0')
      }
      
      if (subscription.quantity > 999999) {
        throw new Error('数量过大，请输入合理的数量')
      }
    }
    
    if (!subscription.currency || subscription.currency.trim() === '') {
      throw new Error('货币不能为空')
    }
    
    // Validate currency format (should be 3 uppercase letters)
    if (!/^[A-Z]{3}$/.test(subscription.currency)) {
      throw new Error('货币代码格式无效')
    }
    
    if (!subscription.billingFrequency) {
      throw new Error('账单频率不能为空')
    }
    
    // Validate billing frequency
    if (subscription.billingFrequency !== 'monthly' && subscription.billingFrequency !== 'yearly') {
      throw new Error('账单频率必须是 monthly 或 yearly')
    }
    
    // Validate auto-renew and end date relationship
    if (subscription.isAutoRenew !== undefined) {
      if (subscription.isAutoRenew && subscription.endDate) {
        throw new Error('自动续订的订阅不能有结束日期')
      }
      
      if (!subscription.isAutoRenew && !subscription.endDate) {
        throw new Error('非自动续订的订阅必须指定结束日期')
      }
    }
    
    // Validate end date is in the future (if provided)
    if (subscription.endDate) {
      const endDate = new Date(subscription.endDate)
      
      // Check if date is valid
      if (isNaN(endDate.getTime())) {
        throw new Error('结束日期格式无效')
      }
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (endDate < today) {
        throw new Error('结束日期必须是未来的日期')
      }
      
      // Validate end date is not too far in the future (e.g., within 100 years)
      const maxDate = new Date()
      maxDate.setFullYear(maxDate.getFullYear() + 100)
      
      if (endDate > maxDate) {
        throw new Error('结束日期过远，请输入合理的日期')
      }
    }
  }

  /**
   * Load all subscriptions for the current user
   * @returns Array of subscriptions
   */
  const loadSubscriptions = async (): Promise<Subscription[]> => {
    if (!user.value) {
      subscriptions.value = []
      return []
    }

    loading.value = true

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.value.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading subscriptions:', error)
        
        // Provide more specific error messages based on error type
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
          throw new Error('网络连接失败，请检查网络后重试')
        } else if (error.message?.includes('JWT') || error.message?.includes('auth')) {
          throw new Error('登录已过期，请重新登录')
        } else {
          throw new Error('加载订阅失败，请重试')
        }
      }

      const convertedData = convertKeysToCamelCase<Subscription[]>(data || [])
      subscriptions.value = convertedData
      return convertedData
    } catch (error) {
      // Re-throw if it's already our custom error
      if (error instanceof Error && error.message.includes('网络连接失败')) {
        throw error
      }
      if (error instanceof Error && error.message.includes('登录已过期')) {
        throw error
      }
      if (error instanceof Error && error.message.includes('加载订阅失败')) {
        throw error
      }
      
      // Handle unexpected errors
      console.error('Unexpected error loading subscriptions:', error)
      throw new Error('加载订阅时发生未知错误，请重试')
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new subscription
   * @param subscription - The subscription data (without id, userId, createdAt, updatedAt)
   * @returns The created subscription
   */
  const createSubscription = async (
    subscription: Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Subscription> => {
    if (!user.value) {
      throw new Error('用户未登录')
    }

    // Validate subscription data
    validateSubscription(subscription)

    loading.value = true

    try {
      const now = new Date().toISOString()

      // Convert camelCase to snake_case for database
      const dbSubscription = convertKeysToSnakeCase({
        ...subscription,
        userId: user.value.id,
        createdAt: now,
        updatedAt: now
      })

      const { data, error } = await supabase
        .from('subscriptions')
        .insert([dbSubscription])
        .select()
        .single()

      if (error) {
        console.error('Error creating subscription:', error)
        
        // Provide specific error messages
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
          throw new Error('网络连接失败，无法创建订阅')
        } else if (error.message?.includes('JWT') || error.message?.includes('auth')) {
          throw new Error('登录已过期，请重新登录')
        } else if (error.message?.includes('duplicate') || error.code === '23505') {
          throw new Error('订阅已存在')
        } else {
          throw new Error('创建订阅失败，请重试')
        }
      }

      const createdSubscription = convertKeysToCamelCase<Subscription>(data)
      
      // Log audit entry for subscription creation
      await logAudit(
        createdSubscription.id,
        user.value.id,
        'created',
        null,
        {
          name: createdSubscription.name,
          amount: createdSubscription.amount,
          quantity: createdSubscription.quantity,
          currency: createdSubscription.currency,
          billingFrequency: createdSubscription.billingFrequency,
          isAutoRenew: createdSubscription.isAutoRenew,
          startDate: createdSubscription.startDate,
          endDate: createdSubscription.endDate,
          nextBillingDate: createdSubscription.nextBillingDate
        },
        'user'
      )
      
      // Add to local state
      subscriptions.value.unshift(createdSubscription)
      
      return createdSubscription
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing subscription
   * @param subscription - The subscription data with id
   * @returns The updated subscription
   */
  const updateSubscription = async (subscription: Subscription): Promise<Subscription> => {
    if (!user.value) {
      throw new Error('用户未登录')
    }

    // Validate subscription data
    validateSubscription(subscription)

    loading.value = true

    try {
      // Get the old subscription values for audit logging
      const { data: oldData, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscription.id)
        .eq('user_id', user.value.id)
        .single()

      if (fetchError) {
        console.error('Error fetching old subscription data:', fetchError)
        // Continue with update even if we can't fetch old data
      }

      const oldSubscription = oldData ? convertKeysToCamelCase<Subscription>(oldData) : null

      const now = new Date().toISOString()

      // Convert camelCase to snake_case for database
      const dbSubscription = convertKeysToSnakeCase({
        name: subscription.name,
        amount: subscription.amount,
        quantity: subscription.quantity,
        currency: subscription.currency,
        billingFrequency: subscription.billingFrequency,
        isAutoRenew: subscription.isAutoRenew,
        endDate: subscription.endDate || null,
        nextBillingDate: subscription.nextBillingDate,
        updatedAt: now
      })

      const { data, error } = await supabase
        .from('subscriptions')
        .update(dbSubscription)
        .eq('id', subscription.id)
        .eq('user_id', user.value.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating subscription:', error)
        
        // Provide specific error messages
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
          throw new Error('网络连接失败，无法更新订阅')
        } else if (error.message?.includes('JWT') || error.message?.includes('auth')) {
          throw new Error('登录已过期，请重新登录')
        } else if (error.code === 'PGRST116') {
          throw new Error('订阅不存在或无权限修改')
        } else {
          throw new Error('更新订阅失败，请重试')
        }
      }

      const updatedSubscription = convertKeysToCamelCase<Subscription>(data)
      
      // Log audit entry for subscription update
      if (oldSubscription) {
        await logAudit(
          updatedSubscription.id,
          user.value.id,
          'updated',
          {
            name: oldSubscription.name,
            amount: oldSubscription.amount,
            quantity: oldSubscription.quantity,
            currency: oldSubscription.currency,
            billingFrequency: oldSubscription.billingFrequency,
            isAutoRenew: oldSubscription.isAutoRenew,
            startDate: oldSubscription.startDate,
            endDate: oldSubscription.endDate,
            nextBillingDate: oldSubscription.nextBillingDate
          },
          {
            name: updatedSubscription.name,
            amount: updatedSubscription.amount,
            quantity: updatedSubscription.quantity,
            currency: updatedSubscription.currency,
            billingFrequency: updatedSubscription.billingFrequency,
            isAutoRenew: updatedSubscription.isAutoRenew,
            startDate: updatedSubscription.startDate,
            endDate: updatedSubscription.endDate,
            nextBillingDate: updatedSubscription.nextBillingDate
          },
          'user'
        )
      }
      
      // Update local state
      const index = subscriptions.value.findIndex(s => s.id === subscription.id)
      if (index !== -1) {
        subscriptions.value[index] = updatedSubscription
      }
      
      return updatedSubscription
    } finally {
      loading.value = false
    }
  }

  /**
   * Update subscription with automatic expense generation for start date changes
   * Detects when start date moves earlier and generates expenses for new billing events
   * 
   * @param subscription - The updated subscription data with id
   * @param originalStartDate - The original start date before update
   * @param subscriptionCategoryId - The category ID for subscription expenses
   * @param userTimezone - User's timezone for date calculations
   * @returns The updated subscription
   */
  const updateSubscriptionWithExpenses = async (
    subscription: Subscription,
    originalStartDate: string,
    subscriptionCategoryId: string,
    userTimezone: string
  ): Promise<Subscription> => {
    if (!user.value) {
      throw new Error('用户未登录')
    }

    // Validate subscription data
    validateSubscription(subscription)

    // Validate category ID
    if (!subscriptionCategoryId) {
      throw new Error('订阅分类不存在，无法生成支出记录')
    }

    loading.value = true

    try {
      // Step 1: Check if start date moved earlier
      const originalStart = new Date(originalStartDate)
      const newStart = new Date(subscription.startDate)

      let expensesGenerated = false

      if (newStart < originalStart) {
        // Start date moved earlier - need to generate expenses for the extended period
        const { 
          calculateBillingEvents, 
          createExpensesForBillingEvents 
        } = useSubscriptionExpenses()

        // Calculate billing events for the period between new start date and original start date
        // We need to calculate up to (but not including) the original start date
        // because expenses from original start date onwards should already exist
        const { format, subDays } = await import('date-fns')
        const endDate = format(subDays(originalStart, 1), 'yyyy-MM-dd')
        const startDate = subscription.startDate

        const newEvents = calculateBillingEvents(
          startDate,
          endDate,
          subscription.amount,
          subscription.currency,
          subscription.billingFrequency,
          userTimezone
        )

        // Step 2: Create expenses for new billing events if any exist
        if (newEvents.length > 0) {
          try {
            const result = await createExpensesForBillingEvents(
              newEvents,
              {
                subscriptionId: subscription.id,
                categoryId: subscriptionCategoryId,
                userTimezone
              }
            )

            if (result.failed > 0) {
              console.warn(
                `Generated ${result.success} expenses but ${result.failed} failed for start date update`
              )
            }

            expensesGenerated = true
          } catch (expenseError) {
            console.error('Error generating expenses for start date update:', expenseError)
            // Don't fail the update if expense generation fails
            // The subscription update should still proceed
            console.warn('Subscription will be updated but expense generation failed')
          }
        }
      }

      // Step 3: Update the subscription
      const updatedSubscription = await updateSubscription(subscription)

      return updatedSubscription
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a subscription
   * @param id - The subscription id to delete
   */
  const deleteSubscription = async (id: string): Promise<void> => {
    if (!user.value) {
      throw new Error('用户未登录')
    }

    loading.value = true

    try {
      // Get the subscription data before deletion for audit logging
      const { data: oldData, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.value.id)
        .single()

      if (fetchError) {
        console.error('Error fetching subscription for deletion:', fetchError)
        // Continue with deletion even if we can't fetch old data
      }

      const oldSubscription = oldData ? convertKeysToCamelCase<Subscription>(oldData) : null

      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.value.id)

      if (error) {
        console.error('Error deleting subscription:', error)
        
        // Provide specific error messages
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
          throw new Error('网络连接失败，无法删除订阅')
        } else if (error.message?.includes('JWT') || error.message?.includes('auth')) {
          throw new Error('登录已过期，请重新登录')
        } else {
          throw new Error('删除订阅失败，请重试')
        }
      }

      // Log audit entry for subscription deletion
      if (oldSubscription) {
        await logAudit(
          id,
          user.value.id,
          'deleted',
          {
            name: oldSubscription.name,
            amount: oldSubscription.amount,
            quantity: oldSubscription.quantity,
            currency: oldSubscription.currency,
            billingFrequency: oldSubscription.billingFrequency,
            isAutoRenew: oldSubscription.isAutoRenew,
            startDate: oldSubscription.startDate,
            endDate: oldSubscription.endDate,
            nextBillingDate: oldSubscription.nextBillingDate
          },
          null,
          'user'
        )
      }

      // Remove from local state
      subscriptions.value = subscriptions.value.filter(s => s.id !== id)
    } finally {
      loading.value = false
    }
  }

  /**
   * Create subscription with optional expense generation for past bills
   * Integrates with useSubscriptionExpenses to generate expense records
   * Handles transaction-like behavior (rollback on failure)
   * 
   * @param subscription - The subscription data (without id, userId, createdAt, updatedAt)
   * @param generatePastExpenses - Whether to generate expenses for past bills
   * @param subscriptionCategoryId - The category ID for subscription expenses
   * @param userTimezone - User's timezone for date calculations
   * @returns The created subscription
   */
  const createSubscriptionWithExpenses = async (
    subscription: Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    generatePastExpenses: boolean,
    subscriptionCategoryId: string,
    userTimezone: string
  ): Promise<Subscription> => {
    if (!user.value) {
      throw new Error('用户未登录')
    }

    // Validate subscription data
    validateSubscription(subscription)

    // Validate category ID if generating expenses
    if (generatePastExpenses && !subscriptionCategoryId) {
      throw new Error('订阅分类不存在，无法生成支出记录')
    }

    loading.value = true

    try {
      // Step 1: Create the subscription first
      const createdSubscription = await createSubscription(subscription)

      // Step 2: Generate expenses if requested
      if (generatePastExpenses) {
        try {
          const { 
            generatePastBillsPreview, 
            createExpensesForBillingEvents 
          } = useSubscriptionExpenses()

          // Generate preview to get billing events
          const preview = generatePastBillsPreview(
            subscription.startDate,
            subscription.amount,
            subscription.currency,
            subscription.billingFrequency,
            userTimezone
          )

          // Create expenses for all billing events
          if (preview.events.length > 0) {
            const result = await createExpensesForBillingEvents(
              preview.events,
              {
                subscriptionId: createdSubscription.id,
                categoryId: subscriptionCategoryId,
                userTimezone
              }
            )

            // Check if all expenses were created successfully
            if (result.failed > 0) {
              console.warn(
                `Created subscription but ${result.failed} of ${preview.events.length} expenses failed to create`
              )
              // Don't throw error - subscription is created, partial expense creation is acceptable
              // User can retry expense generation later if needed
            }
          }
        } catch (expenseError) {
          // Expense generation failed, but subscription was created
          // Attempt to rollback by deleting the subscription
          console.error('Error generating expenses, attempting rollback:', expenseError)
          
          try {
            await deleteSubscription(createdSubscription.id)
            throw new Error('创建支出记录失败，订阅创建已回滚')
          } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError)
            throw new Error('创建支出记录失败，订阅已创建但可能需要手动删除')
          }
        }
      }

      return createdSubscription
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete subscription with option to delete linked expenses
   * Provides transaction-like behavior for cleanup
   * Handles partial deletion failures gracefully
   * 
   * @param id - The subscription id to delete
   * @param deleteExpenses - Whether to delete linked expenses
   * @throws Error if deletion fails with details about what succeeded/failed
   */
  const deleteSubscriptionWithExpenses = async (
    id: string,
    deleteExpenses: boolean
  ): Promise<void> => {
    if (!user.value) {
      throw new Error('用户未登录')
    }

    loading.value = true

    let expensesDeleted = false
    let subscriptionDeleted = false

    try {
      // Step 1: Delete linked expenses if requested
      if (deleteExpenses) {
        try {
          const { deleteSubscriptionExpenses } = useSubscriptionExpenses()
          await deleteSubscriptionExpenses(id)
          expensesDeleted = true
          console.log(`Successfully deleted expenses for subscription ${id}`)
        } catch (expenseError) {
          console.error('Error deleting subscription expenses:', expenseError)
          
          // Provide detailed error message
          const errorMsg = expenseError instanceof Error 
            ? expenseError.message 
            : '删除关联支出记录失败'
          
          throw new Error(`删除关联支出记录失败: ${errorMsg}`)
        }
      }

      // Step 2: Delete the subscription
      // Note: If deleteExpenses is false, the expenses will remain with subscription_id
      // The database schema has ON DELETE SET NULL, so expenses won't be orphaned
      try {
        await deleteSubscription(id)
        subscriptionDeleted = true
        console.log(`Successfully deleted subscription ${id}`)
      } catch (subscriptionError) {
        console.error('Error deleting subscription:', subscriptionError)
        
        // If we already deleted expenses, we have a partial failure
        if (expensesDeleted) {
          const errorMsg = subscriptionError instanceof Error
            ? subscriptionError.message
            : '删除订阅失败'
          
          throw new Error(
            `部分删除失败: 支出记录已删除，但订阅删除失败 (${errorMsg})。` +
            `请重试删除订阅。`
          )
        } else {
          // No expenses were deleted, so just throw the subscription error
          const errorMsg = subscriptionError instanceof Error
            ? subscriptionError.message
            : '删除订阅失败'
          
          throw new Error(`删除订阅失败: ${errorMsg}`)
        }
      }
    } catch (error) {
      // Re-throw the error with context about what succeeded/failed
      // This allows the UI to show appropriate error messages
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Update subscription with automatic next billing date recalculation for frequency changes
   * Detects when billing frequency changes and recalculates next_billing_date accordingly
   * 
   * @param subscription - The updated subscription data with id
   * @param originalFrequency - The original billing frequency before update
   * @param userTimezone - User's timezone for date calculations
   * @returns The updated subscription
   */
  const updateSubscriptionWithFrequencyChange = async (
    subscription: Subscription,
    originalFrequency: 'monthly' | 'yearly',
    userTimezone: string
  ): Promise<Subscription> => {
    if (!user.value) {
      throw new Error('用户未登录')
    }

    // Validate subscription data
    validateSubscription(subscription)

    loading.value = true

    try {
      // Check if frequency changed
      if (subscription.billingFrequency !== originalFrequency) {
        // Frequency changed - need to recalculate next billing date
        // The next billing date should be calculated from the last billing date
        // We use the current nextBillingDate as the base, but need to recalculate
        // based on the new frequency
        
        // Import date-fns functions for date manipulation
        const { addMonths, addYears, subMonths, subYears, parseISO, format } = await import('date-fns')
        const { toZonedTime, fromZonedTime } = await import('date-fns-tz')
        
        // Get the current next billing date in user's timezone
        const currentNextBillingDate = parseISO(subscription.nextBillingDate)
        const currentNextBillingInUserTz = toZonedTime(currentNextBillingDate, userTimezone)
        
        // Calculate the last billing date by subtracting one period of the OLD frequency
        let lastBillingDate: Date
        if (originalFrequency === 'monthly') {
          lastBillingDate = subMonths(currentNextBillingInUserTz, 1)
        } else {
          lastBillingDate = subYears(currentNextBillingInUserTz, 1)
        }
        
        // Calculate the new next billing date by adding one period of the NEW frequency
        let newNextBillingDate: Date
        if (subscription.billingFrequency === 'monthly') {
          newNextBillingDate = addMonths(lastBillingDate, 1)
        } else {
          newNextBillingDate = addYears(lastBillingDate, 1)
        }
        
        // Convert back to UTC for storage
        const newNextBillingDateUTC = fromZonedTime(newNextBillingDate, userTimezone)
        const newNextBillingDateString = format(newNextBillingDateUTC, 'yyyy-MM-dd')
        
        // Update the subscription object with the new next billing date
        subscription.nextBillingDate = newNextBillingDateString
      }

      // Update the subscription with the recalculated next billing date
      const updatedSubscription = await updateSubscription(subscription)

      return updatedSubscription
    } finally {
      loading.value = false
    }
  }

  /**
   * Update subscription amount without modifying existing expenses
   * Ensures that past expense records retain their original amounts
   * Only future billing events will use the new amount
   * 
   * @param subscription - The updated subscription data with id
   * @param originalAmount - The original amount before update (for verification)
   * @returns The updated subscription
   */
  const updateSubscriptionAmount = async (
    subscription: Subscription,
    originalAmount: number
  ): Promise<Subscription> => {
    if (!user.value) {
      throw new Error('用户未登录')
    }

    // Validate subscription data
    validateSubscription(subscription)

    loading.value = true

    try {
      // Check if amount changed
      if (subscription.amount !== originalAmount) {
        // Amount changed - verify that existing expenses remain unchanged
        // This is enforced by the database schema and our update logic
        // We only update the subscription record, not the linked expenses
        
        // The existing expenses linked to this subscription will retain their original amounts
        // because we're only updating the subscription table, not the expenses table
        // Future billing events (created by the cron job) will use the new amount
        
        console.log(
          `Updating subscription amount from ${originalAmount} to ${subscription.amount}. ` +
          `Existing expenses will retain their original amounts.`
        )
      }

      // Update the subscription with the new amount
      // Existing expenses are not modified - they keep their original amounts
      const updatedSubscription = await updateSubscription(subscription)

      return updatedSubscription
    } finally {
      loading.value = false
    }
  }

  return {
    subscriptions,
    loading,
    loadSubscriptions,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    calculateNextBillingDate,
    createSubscriptionWithExpenses,
    deleteSubscriptionWithExpenses,
    updateSubscriptionWithExpenses,
    updateSubscriptionWithFrequencyChange,
    updateSubscriptionAmount
  }
}
