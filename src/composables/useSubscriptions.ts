import { ref } from 'vue'
import { useSupabase } from './useSupabase'
import { type Subscription } from '../types'

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

export function useSubscriptions() {
  const { user, supabase } = useSupabase()
  const subscriptions = ref<Subscription[]>([])
  const loading = ref(false)

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
    
    if (subscription.amount === undefined || subscription.amount === null) {
      throw new Error('金额不能为空')
    }
    
    if (subscription.amount <= 0) {
      throw new Error('金额必须大于0')
    }
    
    if (!subscription.currency || subscription.currency.trim() === '') {
      throw new Error('货币不能为空')
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
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (endDate < today) {
        throw new Error('结束日期必须是未来的日期')
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
        throw new Error('加载订阅失败，请重试')
      }

      const convertedData = convertKeysToCamelCase<Subscription[]>(data || [])
      subscriptions.value = convertedData
      return convertedData
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
        throw new Error('创建订阅失败，请重试')
      }

      const createdSubscription = convertKeysToCamelCase<Subscription>(data)
      
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
      const now = new Date().toISOString()

      // Convert camelCase to snake_case for database
      const dbSubscription = convertKeysToSnakeCase({
        name: subscription.name,
        amount: subscription.amount,
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
        throw new Error('更新订阅失败，请重试')
      }

      const updatedSubscription = convertKeysToCamelCase<Subscription>(data)
      
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
   * Delete a subscription
   * @param id - The subscription id to delete
   */
  const deleteSubscription = async (id: string): Promise<void> => {
    if (!user.value) {
      throw new Error('用户未登录')
    }

    loading.value = true

    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.value.id)

      if (error) {
        console.error('Error deleting subscription:', error)
        throw new Error('删除订阅失败，请重试')
      }

      // Remove from local state
      subscriptions.value = subscriptions.value.filter(s => s.id !== id)
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
    calculateNextBillingDate
  }
}
