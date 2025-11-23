import { describe, it, expect } from 'vitest'
import { useSubscriptionCalculations } from './useSubscriptionCalculations'
import * as fc from 'fast-check'
import type { Subscription, SubscriptionDisplay } from '../types'

describe('useSubscriptionCalculations', () => {
  describe('Property-Based Tests', () => {
    /**
     * Feature: subscription-management, Property 19: Expiration detection
     * Validates: Requirements 6.4
     * 
     * For any subscription with an end date in the past, the subscription should be marked as expired
     */
    it('Property 19: Expiration detection', () => {
      fc.assert(
        fc.property(
          // Generate a subscription with an end date in the past
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            amount: fc.double({ min: 0.01, max: 100000, noNaN: true }),
            currency: fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
            billingFrequency: fc.constantFrom('monthly' as const, 'yearly' as const),
            isAutoRenew: fc.constant(false), // Must be false to have an end date
            // Generate end date in the past (1 to 365 days ago)
            endDate: fc.integer({ min: 1, max: 365 })
              .map(daysAgo => {
                const date = new Date()
                date.setDate(date.getDate() - daysAgo)
                return date.toISOString().split('T')[0]
              }),
            nextBillingDate: fc.integer({ min: 1, max: 365 })
              .map(days => {
                const date = new Date()
                date.setDate(date.getDate() + days)
                return date.toISOString().split('T')[0]
              }),
            createdAt: fc.constant(new Date().toISOString()),
            updatedAt: fc.constant(new Date().toISOString())
          }),
          (subscription) => {
            const { isExpired } = useSubscriptionCalculations()
            
            // For any subscription with an end date in the past, isExpired should return true
            const result = isExpired(subscription)
            expect(result).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Feature: subscription-management, Property 19: Expiration detection (auto-renew case)
     * Validates: Requirements 6.4
     * 
     * For any subscription with auto-renew enabled (no end date), the subscription should never be expired
     */
    it('Property 19: Expiration detection - auto-renew subscriptions never expire', () => {
      fc.assert(
        fc.property(
          // Generate a subscription with auto-renew enabled
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            amount: fc.double({ min: 0.01, max: 100000, noNaN: true }),
            currency: fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
            billingFrequency: fc.constantFrom('monthly' as const, 'yearly' as const),
            isAutoRenew: fc.constant(true), // Auto-renew enabled
            endDate: fc.constant(undefined), // No end date
            nextBillingDate: fc.integer({ min: 1, max: 365 })
              .map(days => {
                const date = new Date()
                date.setDate(date.getDate() + days)
                return date.toISOString().split('T')[0]
              }),
            createdAt: fc.constant(new Date().toISOString()),
            updatedAt: fc.constant(new Date().toISOString())
          }),
          (subscription) => {
            const { isExpired } = useSubscriptionCalculations()
            
            // For any auto-renewing subscription, isExpired should return false
            const result = isExpired(subscription)
            expect(result).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Feature: subscription-management, Property 19: Expiration detection (future end date case)
     * Validates: Requirements 6.4
     * 
     * For any subscription with an end date in the future, the subscription should not be expired
     */
    it('Property 19: Expiration detection - future end dates are not expired', () => {
      fc.assert(
        fc.property(
          // Generate a subscription with an end date in the future
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            amount: fc.double({ min: 0.01, max: 100000, noNaN: true }),
            currency: fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
            billingFrequency: fc.constantFrom('monthly' as const, 'yearly' as const),
            isAutoRenew: fc.constant(false), // Must be false to have an end date
            // Generate end date in the future (1 to 365 days from now)
            endDate: fc.integer({ min: 1, max: 365 })
              .map(daysFromNow => {
                const date = new Date()
                date.setDate(date.getDate() + daysFromNow)
                return date.toISOString().split('T')[0]
              }),
            nextBillingDate: fc.integer({ min: 1, max: 365 })
              .map(days => {
                const date = new Date()
                date.setDate(date.getDate() + days)
                return date.toISOString().split('T')[0]
              }),
            createdAt: fc.constant(new Date().toISOString()),
            updatedAt: fc.constant(new Date().toISOString())
          }),
          (subscription) => {
            const { isExpired } = useSubscriptionCalculations()
            
            // For any subscription with an end date in the future, isExpired should return false
            const result = isExpired(subscription)
            expect(result).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Feature: subscription-management, Property 18: Ending soon detection
     * Validates: Requirements 6.3
     * 
     * For any subscription with an end date within 30 days of the current date,
     * the subscription should be marked as ending soon
     */
    it('Property 18: Ending soon detection', () => {
      fc.assert(
        fc.property(
          // Generate a subscription with an end date within 30 days (but not exactly 30)
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            amount: fc.double({ min: 0.01, max: 100000, noNaN: true }),
            currency: fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
            billingFrequency: fc.constantFrom('monthly' as const, 'yearly' as const),
            isAutoRenew: fc.constant(false), // Must be false to have an end date
            // Generate end date within 1 to 29 days from now (avoiding boundary at exactly 30)
            endDate: fc.integer({ min: 1, max: 29 })
              .map(daysFromNow => {
                const date = new Date()
                date.setDate(date.getDate() + daysFromNow)
                return date.toISOString().split('T')[0]
              }),
            nextBillingDate: fc.integer({ min: 1, max: 365 })
              .map(days => {
                const date = new Date()
                date.setDate(date.getDate() + days)
                return date.toISOString().split('T')[0]
              }),
            createdAt: fc.constant(new Date().toISOString()),
            updatedAt: fc.constant(new Date().toISOString())
          }),
          (subscription) => {
            const { isEndingSoon } = useSubscriptionCalculations()
            
            // For any subscription with an end date within 30 days, isEndingSoon should return true
            const result = isEndingSoon(subscription)
            expect(result).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Feature: subscription-management, Property 18: Ending soon detection (auto-renew case)
     * Validates: Requirements 6.3
     * 
     * For any subscription with auto-renew enabled, the subscription should never be ending soon
     */
    it('Property 18: Ending soon detection - auto-renew subscriptions never ending soon', () => {
      fc.assert(
        fc.property(
          // Generate a subscription with auto-renew enabled
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            amount: fc.double({ min: 0.01, max: 100000, noNaN: true }),
            currency: fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
            billingFrequency: fc.constantFrom('monthly' as const, 'yearly' as const),
            isAutoRenew: fc.constant(true), // Auto-renew enabled
            endDate: fc.constant(undefined), // No end date
            nextBillingDate: fc.integer({ min: 1, max: 365 })
              .map(days => {
                const date = new Date()
                date.setDate(date.getDate() + days)
                return date.toISOString().split('T')[0]
              }),
            createdAt: fc.constant(new Date().toISOString()),
            updatedAt: fc.constant(new Date().toISOString())
          }),
          (subscription) => {
            const { isEndingSoon } = useSubscriptionCalculations()
            
            // For any auto-renewing subscription, isEndingSoon should return false
            const result = isEndingSoon(subscription)
            expect(result).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Feature: subscription-management, Property 18: Ending soon detection (far future case)
     * Validates: Requirements 6.3
     * 
     * For any subscription with an end date more than 30 days away, the subscription should not be ending soon
     */
    it('Property 18: Ending soon detection - far future end dates are not ending soon', () => {
      fc.assert(
        fc.property(
          // Generate a subscription with an end date more than 30 days away
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            amount: fc.double({ min: 0.01, max: 100000, noNaN: true }),
            currency: fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
            billingFrequency: fc.constantFrom('monthly' as const, 'yearly' as const),
            isAutoRenew: fc.constant(false), // Must be false to have an end date
            // Generate end date more than 30 days from now (31 to 365 days)
            endDate: fc.integer({ min: 31, max: 365 })
              .map(daysFromNow => {
                const date = new Date()
                date.setDate(date.getDate() + daysFromNow)
                return date.toISOString().split('T')[0]
              }),
            nextBillingDate: fc.integer({ min: 1, max: 365 })
              .map(days => {
                const date = new Date()
                date.setDate(date.getDate() + days)
                return date.toISOString().split('T')[0]
              }),
            createdAt: fc.constant(new Date().toISOString()),
            updatedAt: fc.constant(new Date().toISOString())
          }),
          (subscription) => {
            const { isEndingSoon } = useSubscriptionCalculations()
            
            // For any subscription with an end date more than 30 days away, isEndingSoon should return false
            const result = isEndingSoon(subscription)
            expect(result).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Feature: subscription-management, Property 18: Ending soon detection (expired case)
     * Validates: Requirements 6.3
     * 
     * For any subscription that has already expired, the subscription should not be marked as ending soon
     */
    it('Property 18: Ending soon detection - expired subscriptions are not ending soon', () => {
      fc.assert(
        fc.property(
          // Generate a subscription with an end date in the past
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            amount: fc.double({ min: 0.01, max: 100000, noNaN: true }),
            currency: fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
            billingFrequency: fc.constantFrom('monthly' as const, 'yearly' as const),
            isAutoRenew: fc.constant(false), // Must be false to have an end date
            // Generate end date in the past (1 to 365 days ago)
            endDate: fc.integer({ min: 1, max: 365 })
              .map(daysAgo => {
                const date = new Date()
                date.setDate(date.getDate() - daysAgo)
                return date.toISOString().split('T')[0]
              }),
            nextBillingDate: fc.integer({ min: 1, max: 365 })
              .map(days => {
                const date = new Date()
                date.setDate(date.getDate() + days)
                return date.toISOString().split('T')[0]
              }),
            createdAt: fc.constant(new Date().toISOString()),
            updatedAt: fc.constant(new Date().toISOString())
          }),
          (subscription) => {
            const { isEndingSoon } = useSubscriptionCalculations()
            
            // For any expired subscription, isEndingSoon should return false
            const result = isEndingSoon(subscription)
            expect(result).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Feature: subscription-management, Property 21: Monthly total calculation
     * Validates: Requirements 7.1, 7.3
     * 
     * For any set of active subscriptions, the total monthly cost should equal the sum of
     * all monthly subscriptions plus yearly subscriptions divided by 12, all converted to main currency
     */
    it('Property 21: Monthly total calculation', () => {
      fc.assert(
        fc.property(
          // Generate an array of subscription display objects
          fc.array(
            fc.record({
              id: fc.uuid(),
              userId: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              amount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
              currency: fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
              billingFrequency: fc.constantFrom('monthly' as const, 'yearly' as const),
              isAutoRenew: fc.boolean(),
              // Generate end date that could be past, present, or future
              endDate: fc.option(
                fc.integer({ min: -365, max: 365 })
                  .map(daysOffset => {
                    const date = new Date()
                    date.setDate(date.getDate() + daysOffset)
                    return date.toISOString().split('T')[0]
                  })
              ),
              nextBillingDate: fc.integer({ min: 1, max: 365 })
                .map(days => {
                  const date = new Date()
                  date.setDate(date.getDate() + days)
                  return date.toISOString().split('T')[0]
                }),
              createdAt: fc.constant(new Date().toISOString()),
              updatedAt: fc.constant(new Date().toISOString()),
              // Display fields (already converted to main currency)
              displayAmount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
              displayCurrency: fc.constant('CNY'),
              originalAmount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
              originalCurrency: fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
              isExpired: fc.boolean(),
              isEndingSoon: fc.boolean(),
              daysUntilEnd: fc.option(fc.integer({ min: 1, max: 365 }))
            }).chain(sub => {
              // Ensure valid auto-renew/end date relationship
              if (sub.isAutoRenew) {
                return fc.constant({ ...sub, endDate: undefined })
              } else if (!sub.endDate) {
                return fc.constant({
                  ...sub,
                  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                })
              }
              return fc.constant(sub)
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (subscriptions: SubscriptionDisplay[]) => {
            const { calculateTotalCosts, isExpired, calculateMonthlyEquivalent } = useSubscriptionCalculations()
            
            // Calculate the expected monthly total manually
            let expectedMonthlyTotal = 0
            for (const sub of subscriptions) {
              // Skip expired subscriptions
              if (isExpired(sub)) {
                continue
              }
              
              // Add monthly equivalent of each subscription
              expectedMonthlyTotal += calculateMonthlyEquivalent(sub.displayAmount, sub.billingFrequency)
            }
            
            // Calculate using the composable
            const result = calculateTotalCosts(subscriptions)
            
            // Verify the monthly total matches our expected calculation
            // Use a small epsilon for floating point comparison
            const epsilon = 0.01
            expect(Math.abs(result.totalMonthly - expectedMonthlyTotal)).toBeLessThan(epsilon)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Feature: subscription-management, Property 22: Yearly total calculation
     * Validates: Requirements 7.2, 7.4
     * 
     * For any set of active subscriptions, the total yearly cost should equal the sum of
     * all yearly subscriptions plus monthly subscriptions multiplied by 12, all converted to main currency
     */
    it('Property 22: Yearly total calculation', () => {
      fc.assert(
        fc.property(
          // Generate an array of subscription display objects
          fc.array(
            fc.record({
              id: fc.uuid(),
              userId: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              amount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
              currency: fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
              billingFrequency: fc.constantFrom('monthly' as const, 'yearly' as const),
              isAutoRenew: fc.boolean(),
              // Generate end date that could be past, present, or future
              endDate: fc.option(
                fc.integer({ min: -365, max: 365 })
                  .map(daysOffset => {
                    const date = new Date()
                    date.setDate(date.getDate() + daysOffset)
                    return date.toISOString().split('T')[0]
                  })
              ),
              nextBillingDate: fc.integer({ min: 1, max: 365 })
                .map(days => {
                  const date = new Date()
                  date.setDate(date.getDate() + days)
                  return date.toISOString().split('T')[0]
                }),
              createdAt: fc.constant(new Date().toISOString()),
              updatedAt: fc.constant(new Date().toISOString()),
              // Display fields (already converted to main currency)
              displayAmount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
              displayCurrency: fc.constant('CNY'),
              originalAmount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
              originalCurrency: fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
              isExpired: fc.boolean(),
              isEndingSoon: fc.boolean(),
              daysUntilEnd: fc.option(fc.integer({ min: 1, max: 365 }))
            }).chain(sub => {
              // Ensure valid auto-renew/end date relationship
              if (sub.isAutoRenew) {
                return fc.constant({ ...sub, endDate: undefined })
              } else if (!sub.endDate) {
                return fc.constant({
                  ...sub,
                  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                })
              }
              return fc.constant(sub)
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (subscriptions: SubscriptionDisplay[]) => {
            const { calculateTotalCosts, isExpired, calculateYearlyEquivalent } = useSubscriptionCalculations()
            
            // Calculate the expected yearly total manually
            let expectedYearlyTotal = 0
            for (const sub of subscriptions) {
              // Skip expired subscriptions
              if (isExpired(sub)) {
                continue
              }
              
              // Add yearly equivalent of each subscription
              expectedYearlyTotal += calculateYearlyEquivalent(sub.displayAmount, sub.billingFrequency)
            }
            
            // Calculate using the composable
            const result = calculateTotalCosts(subscriptions)
            
            // Verify the yearly total matches our expected calculation
            // Use a small epsilon for floating point comparison
            const epsilon = 0.01
            expect(Math.abs(result.totalYearly - expectedYearlyTotal)).toBeLessThan(epsilon)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Feature: subscription-management, Property 23: Expired subscription exclusion from totals
     * Validates: Requirements 7.5, 7.6
     * 
     * For any subscription with an end date in the past, it should be excluded from total cost calculations,
     * while subscriptions with future end dates or auto-renew should be included
     */
    it('Property 23: Expired subscription exclusion from totals', () => {
      fc.assert(
        fc.property(
          // Generate a mix of expired and active subscriptions
          fc.tuple(
            // Generate expired subscriptions (end date in the past)
            fc.array(
              fc.record({
                id: fc.uuid(),
                userId: fc.uuid(),
                name: fc.string({ minLength: 1, maxLength: 100 }),
                amount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
                currency: fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
                billingFrequency: fc.constantFrom('monthly' as const, 'yearly' as const),
                isAutoRenew: fc.constant(false),
                // End date in the past
                endDate: fc.integer({ min: 1, max: 365 })
                  .map(daysAgo => {
                    const date = new Date()
                    date.setDate(date.getDate() - daysAgo)
                    return date.toISOString().split('T')[0]
                  }),
                nextBillingDate: fc.integer({ min: 1, max: 365 })
                  .map(days => {
                    const date = new Date()
                    date.setDate(date.getDate() + days)
                    return date.toISOString().split('T')[0]
                  }),
                createdAt: fc.constant(new Date().toISOString()),
                updatedAt: fc.constant(new Date().toISOString()),
                displayAmount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
                displayCurrency: fc.constant('CNY'),
                originalAmount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
                originalCurrency: fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
                isExpired: fc.constant(true),
                isEndingSoon: fc.constant(false),
                daysUntilEnd: fc.constant(undefined)
              }),
              { minLength: 0, maxLength: 10 }
            ),
            // Generate active subscriptions (auto-renew or future end date)
            fc.array(
              fc.record({
                id: fc.uuid(),
                userId: fc.uuid(),
                name: fc.string({ minLength: 1, maxLength: 100 }),
                amount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
                currency: fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
                billingFrequency: fc.constantFrom('monthly' as const, 'yearly' as const),
                isAutoRenew: fc.boolean(),
                // End date in the future or undefined (for auto-renew)
                endDate: fc.option(
                  fc.integer({ min: 1, max: 365 })
                    .map(daysFromNow => {
                      const date = new Date()
                      date.setDate(date.getDate() + daysFromNow)
                      return date.toISOString().split('T')[0]
                    })
                ),
                nextBillingDate: fc.integer({ min: 1, max: 365 })
                  .map(days => {
                    const date = new Date()
                    date.setDate(date.getDate() + days)
                    return date.toISOString().split('T')[0]
                  }),
                createdAt: fc.constant(new Date().toISOString()),
                updatedAt: fc.constant(new Date().toISOString()),
                displayAmount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
                displayCurrency: fc.constant('CNY'),
                originalAmount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
                originalCurrency: fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
                isExpired: fc.constant(false),
                isEndingSoon: fc.boolean(),
                daysUntilEnd: fc.option(fc.integer({ min: 1, max: 365 }))
              }).chain(sub => {
                // Ensure valid auto-renew/end date relationship
                if (sub.isAutoRenew) {
                  return fc.constant({ ...sub, endDate: undefined })
                } else if (!sub.endDate) {
                  return fc.constant({
                    ...sub,
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  })
                }
                return fc.constant(sub)
              }),
              { minLength: 0, maxLength: 10 }
            )
          ),
          ([expiredSubscriptions, activeSubscriptions]) => {
            const { calculateTotalCosts, calculateMonthlyEquivalent, calculateYearlyEquivalent } = useSubscriptionCalculations()
            
            // Combine all subscriptions
            const allSubscriptions = [...expiredSubscriptions, ...activeSubscriptions]
            
            // Calculate expected totals (only from active subscriptions)
            let expectedMonthlyTotal = 0
            let expectedYearlyTotal = 0
            for (const sub of activeSubscriptions) {
              expectedMonthlyTotal += calculateMonthlyEquivalent(sub.displayAmount, sub.billingFrequency)
              expectedYearlyTotal += calculateYearlyEquivalent(sub.displayAmount, sub.billingFrequency)
            }
            
            // Calculate using the composable
            const result = calculateTotalCosts(allSubscriptions)
            
            // Verify expired subscriptions are excluded from totals
            const epsilon = 0.01
            expect(Math.abs(result.totalMonthly - expectedMonthlyTotal)).toBeLessThan(epsilon)
            expect(Math.abs(result.totalYearly - expectedYearlyTotal)).toBeLessThan(epsilon)
            
            // Verify counts are correct
            expect(result.activeCount).toBe(activeSubscriptions.length)
            expect(result.expiredCount).toBe(expiredSubscriptions.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
