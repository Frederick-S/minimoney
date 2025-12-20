import type { Subscription, SubscriptionDisplay, SubscriptionSummary } from '../types'

/**
 * Composable for subscription cost calculations and lifecycle checks
 * 
 * Provides utilities for:
 * - Converting between monthly and yearly subscription costs
 * - Checking subscription expiration status
 * - Calculating aggregate costs across all subscriptions
 */
export function useSubscriptionCalculations() {
  /**
   * Calculate monthly equivalent cost for a subscription
   * @param amount - The subscription amount
   * @param frequency - The billing frequency
   * @returns Monthly equivalent amount
   */
  const calculateMonthlyEquivalent = (
    amount: number,
    frequency: 'monthly' | 'yearly'
  ): number => {
    if (frequency === 'monthly') {
      return amount
    }
    // Yearly subscription: divide by 12 for monthly equivalent
    return amount / 12
  }

  /**
   * Calculate yearly equivalent cost for a subscription
   * @param amount - The subscription amount
   * @param frequency - The billing frequency
   * @returns Yearly equivalent amount
   */
  const calculateYearlyEquivalent = (
    amount: number,
    frequency: 'monthly' | 'yearly'
  ): number => {
    if (frequency === 'yearly') {
      return amount
    }
    // Monthly subscription: multiply by 12 for yearly equivalent
    return amount * 12
  }

  /**
   * Check if a subscription has expired
   * @param subscription - The subscription to check
   * @returns True if the subscription has an end date in the past
   */
  const isExpired = (subscription: Subscription): boolean => {
    if (!subscription.endDate) {
      // Auto-renewing subscriptions never expire
      return false
    }
    
    const endDate = new Date(subscription.endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to start of day for fair comparison
    
    return endDate < today
  }

  /**
   * Check if a subscription is ending soon
   * @param subscription - The subscription to check
   * @param daysThreshold - Number of days to consider as "ending soon" (default: 30)
   * @returns True if the subscription has an end date within the threshold
   */
  const isEndingSoon = (
    subscription: Subscription,
    daysThreshold: number = 30
  ): boolean => {
    if (!subscription.endDate) {
      // Auto-renewing subscriptions are never ending soon
      return false
    }
    
    const endDate = new Date(subscription.endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Already expired subscriptions are not "ending soon"
    if (endDate < today) {
      return false
    }
    
    const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilEnd <= daysThreshold
  }

  /**
   * Get the number of days until a subscription ends
   * @param subscription - The subscription to check
   * @returns Number of days until end date, or null if no end date or already expired
   */
  const getDaysUntilEnd = (subscription: Subscription): number | null => {
    if (!subscription.endDate) {
      return null
    }
    
    const endDate = new Date(subscription.endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // If already expired, return null
    if (endDate < today) {
      return null
    }
    
    return Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  /**
   * Calculate total costs across all subscriptions
   * @param subscriptions - Array of subscription display objects
   * @returns Summary object with monthly and yearly totals
   */
  const calculateTotalCosts = (
    subscriptions: SubscriptionDisplay[]
  ): SubscriptionSummary => {
    let totalMonthly = 0
    let totalYearly = 0
    let activeCount = 0
    let expiredCount = 0
    
    // Assume all subscriptions use the same display currency
    const currency = subscriptions.length > 0 ? subscriptions[0].displayCurrency : 'CNY'
    
    for (const subscription of subscriptions) {
      const expired = isExpired(subscription)
      
      if (expired) {
        expiredCount++
        // Expired subscriptions are excluded from totals
        continue
      }
      
      activeCount++
      
      // Use displayAmount which is already converted to display currency
      // displayAmount already includes quantity (amount * quantity converted)
      const amount = subscription.displayAmount
      
      // Add to monthly total
      totalMonthly += calculateMonthlyEquivalent(amount, subscription.billingFrequency)
      
      // Add to yearly total
      totalYearly += calculateYearlyEquivalent(amount, subscription.billingFrequency)
    }
    
    return {
      totalMonthly,
      totalYearly,
      activeCount,
      expiredCount,
      currency
    }
  }

  return {
    calculateMonthlyEquivalent,
    calculateYearlyEquivalent,
    isExpired,
    isEndingSoon,
    getDaysUntilEnd,
    calculateTotalCosts
  }
}
