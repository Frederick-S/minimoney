/**
 * Property-Based Tests for process-subscription-bills Edge Function
 * 
 * These tests validate the core business logic extracted from the Edge Function.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { format, parseISO, addMonths, addYears, isBefore, isAfter } from 'date-fns'
import {
  getUserTimezone,
  calculateNextBillingDate,
  shouldProcessSubscription,
  shouldUpdateNextBillingDate,
  createExpenseData,
  type UserPreference,
  type Subscription
} from './logic'

describe('process-subscription-bills Edge Function Logic', () => {
  describe('Property-Based Tests', () => {
    /**
     * **Feature: subscription-expense-persistence, Property 5: Due subscription identification**
     * **Validates: Requirements 2.1**
     * 
     * For any given date and set of subscriptions, the system should identify exactly 
     * those subscriptions whose next_billing_date equals that date and whose end_date 
     * (if present) is not before that date.
     */
    it('Property 5: Due subscription identification', () => {
      fc.assert(
        fc.property(
          // Generate current date
          fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
            .filter(d => !isNaN(d.getTime()))
            .map(d => format(d, 'yyyy-MM-dd')),
          // Generate next_billing_date (may or may not match current date)
          fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
            .filter(d => !isNaN(d.getTime()))
            .map(d => format(d, 'yyyy-MM-dd')),
          // Generate optional end_date
          fc.option(
            fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
              .filter(d => !isNaN(d.getTime()))
              .map(d => format(d, 'yyyy-MM-dd'))
          ),
          // Generate timezone
          fc.constantFrom('UTC', 'Asia/Shanghai', 'America/New_York', 'Europe/London'),
          (currentDate, nextBillingDate, endDate, timezone) => {
            const subscription = {
              next_billing_date: nextBillingDate,
              end_date: endDate
            }
            
            const result = shouldProcessSubscription(subscription, currentDate, timezone)
            
            // Property: Should process if and only if:
            // 1. next_billing_date equals currentDate
            // 2. AND (no end_date OR end_date >= currentDate)
            
            const dateMatches = nextBillingDate === currentDate
            const notExpired = !endDate || !isBefore(parseISO(endDate), parseISO(currentDate))
            const expectedResult = dateMatches && notExpired
            
            expect(result).toBe(expectedResult)
            
            // Additional property: If dates don't match, should never process
            if (nextBillingDate !== currentDate) {
              expect(result).toBe(false)
            }
            
            // Additional property: If expired, should never process
            if (endDate && isBefore(parseISO(endDate), parseISO(currentDate))) {
              expect(result).toBe(false)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: subscription-expense-persistence, Property 6: Billing expense creation**
     * **Validates: Requirements 2.2**
     * 
     * For any subscription whose next_billing_date matches the current date, after processing, 
     * an expense should exist with the subscription's amount, the billing date, and linked 
     * to the subscription.
     */
    it('Property 6: Billing expense creation', () => {
      fc.assert(
        fc.property(
          // Generate subscription data
          fc.record({
            id: fc.uuid(),
            user_id: fc.uuid(),
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
            quantity: fc.integer({ min: 1, max: 10 })
          }),
          // Generate category ID
          fc.uuid(),
          // Generate billing date
          fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
            .filter(d => !isNaN(d.getTime()))
            .map(d => format(d, 'yyyy-MM-dd')),
          (subscription, categoryId, billingDate) => {
            const expenseData = createExpenseData(subscription, categoryId, billingDate)
            
            // Property 1: Expense amount should equal subscription amount * quantity
            expect(expenseData.amount).toBe(subscription.amount * subscription.quantity)
            
            // Property 2: Expense date should match billing date
            expect(expenseData.date).toBe(billingDate)
            
            // Property 3: Expense should be linked to subscription
            expect(expenseData.subscription_id).toBe(subscription.id)
            
            // Property 4: Expense should be assigned to correct category
            expect(expenseData.category_id).toBe(categoryId)
            
            // Property 5: Expense should have correct user_id
            expect(expenseData.user_id).toBe(subscription.user_id)
            
            // Property 6: Expense should have timestamps
            expect(expenseData.created_at).toBeDefined()
            expect(expenseData.updated_at).toBeDefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: subscription-expense-persistence, Property 7: Next billing date update**
     * **Validates: Requirements 2.3, 2.4, 2.5**
     * 
     * For any subscription after processing a billing event, the next_billing_date should 
     * be incremented by one month for monthly subscriptions or one year for yearly 
     * subscriptions from the previous next_billing_date.
     */
    it('Property 7: Next billing date update', () => {
      fc.assert(
        fc.property(
          // Generate current billing date
          fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
            .filter(d => !isNaN(d.getTime()))
            .map(d => format(d, 'yyyy-MM-dd')),
          // Generate frequency
          fc.constantFrom('monthly' as const, 'yearly' as const),
          // Generate timezone
          fc.constantFrom('UTC', 'Asia/Shanghai', 'America/New_York'),
          (currentBillingDate, frequency, timezone) => {
            const nextBillingDate = calculateNextBillingDate(
              currentBillingDate,
              frequency,
              timezone
            )
            
            const currentDate = parseISO(currentBillingDate)
            const nextDate = parseISO(nextBillingDate)
            
            // Property 1: Next date should be after current date
            expect(isAfter(nextDate, currentDate)).toBe(true)
            
            // Property 2: For monthly, should be approximately 1 month later
            if (frequency === 'monthly') {
              const expectedNext = addMonths(currentDate, 1)
              expect(nextBillingDate).toBe(format(expectedNext, 'yyyy-MM-dd'))
            }
            
            // Property 3: For yearly, should be exactly 1 year later
            if (frequency === 'yearly') {
              const expectedNext = addYears(currentDate, 1)
              expect(nextBillingDate).toBe(format(expectedNext, 'yyyy-MM-dd'))
            }
            
            // Property 4: Result should be a valid date string
            expect(nextBillingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: subscription-expense-persistence, Property 12: Error isolation in batch processing**
     * **Validates: Requirements 5.1**
     * 
     * For any batch of subscriptions being processed, if one subscription fails to create 
     * an expense, the remaining subscriptions should still be processed and the error should 
     * be logged with subscription details.
     * 
     * Note: This property tests the isolation logic - that processing decisions for each
     * subscription are independent.
     */
    it('Property 12: Error isolation in batch processing', () => {
      fc.assert(
        fc.property(
          // Generate array of subscriptions
          fc.array(
            fc.record({
              id: fc.uuid(),
              next_billing_date: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
                .filter(d => !isNaN(d.getTime()))
                .map(d => format(d, 'yyyy-MM-dd')),
              end_date: fc.option(
                fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
                  .filter(d => !isNaN(d.getTime()))
                  .map(d => format(d, 'yyyy-MM-dd'))
              )
            }),
            { minLength: 2, maxLength: 10 }
          ),
          // Generate current date
          fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
            .filter(d => !isNaN(d.getTime()))
            .map(d => format(d, 'yyyy-MM-dd')),
          (subscriptions, currentDate) => {
            // Property: Each subscription's processing decision should be independent
            const results = subscriptions.map(sub => 
              shouldProcessSubscription(sub, currentDate, 'UTC')
            )
            
            // Verify that each result is based only on that subscription's data
            results.forEach((result, index) => {
              const sub = subscriptions[index]
              const dateMatches = sub.next_billing_date === currentDate
              const notExpired = !sub.end_date || !isBefore(parseISO(sub.end_date), parseISO(currentDate))
              const expectedResult = dateMatches && notExpired
              
              expect(result).toBe(expectedResult)
            })
            
            // Property: Results should be independent (changing one subscription doesn't affect others)
            // This is implicitly tested by the above - each result depends only on its own subscription
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Unit Tests', () => {
    describe('getUserTimezone', () => {
      it('should return timezone from preferences', () => {
        const preferences: UserPreference[] = [
          { user_id: 'user-1', value: 'Asia/Shanghai' }
        ]
        
        expect(getUserTimezone(preferences)).toBe('Asia/Shanghai')
      })

      it('should return UTC when no preferences', () => {
        expect(getUserTimezone([])).toBe('UTC')
      })

      it('should return UTC when preferences have no value', () => {
        const preferences: UserPreference[] = [
          { user_id: 'user-1', value: '' }
        ]
        
        expect(getUserTimezone(preferences)).toBe('UTC')
      })
    })

    describe('calculateNextBillingDate', () => {
      it('should add 1 month for monthly frequency', () => {
        const result = calculateNextBillingDate('2024-01-15', 'monthly', 'UTC')
        expect(result).toBe('2024-02-15')
      })

      it('should add 1 year for yearly frequency', () => {
        const result = calculateNextBillingDate('2024-01-15', 'yearly', 'UTC')
        expect(result).toBe('2025-01-15')
      })

      it('should handle month-end dates correctly', () => {
        // Jan 31 + 1 month = Feb 29 (2024 is leap year)
        const result = calculateNextBillingDate('2024-01-31', 'monthly', 'UTC')
        expect(result).toBe('2024-02-29')
      })

      it('should handle leap year correctly', () => {
        // Feb 29 + 1 month = Mar 29
        const result = calculateNextBillingDate('2024-02-29', 'monthly', 'UTC')
        expect(result).toBe('2024-03-29')
      })

      it('should throw error for invalid date', () => {
        expect(() => calculateNextBillingDate('invalid', 'monthly', 'UTC')).toThrow()
      })
    })

    describe('shouldProcessSubscription', () => {
      it('should return true when date matches and no end date', () => {
        const subscription = {
          next_billing_date: '2024-12-21',
          end_date: null
        }
        
        expect(shouldProcessSubscription(subscription, '2024-12-21', 'UTC')).toBe(true)
      })

      it('should return true when date matches and end date is in future', () => {
        const subscription = {
          next_billing_date: '2024-12-21',
          end_date: '2025-12-31'
        }
        
        expect(shouldProcessSubscription(subscription, '2024-12-21', 'UTC')).toBe(true)
      })

      it('should return true when date matches and end date is today (edge case from 2.6)', () => {
        const subscription = {
          next_billing_date: '2024-12-21',
          end_date: '2024-12-21'
        }
        
        expect(shouldProcessSubscription(subscription, '2024-12-21', 'UTC')).toBe(true)
      })

      it('should return false when date does not match', () => {
        const subscription = {
          next_billing_date: '2024-12-22',
          end_date: null
        }
        
        expect(shouldProcessSubscription(subscription, '2024-12-21', 'UTC')).toBe(false)
      })

      it('should return false when subscription is expired', () => {
        const subscription = {
          next_billing_date: '2024-12-21',
          end_date: '2024-12-20'
        }
        
        expect(shouldProcessSubscription(subscription, '2024-12-21', 'UTC')).toBe(false)
      })
    })

    describe('shouldUpdateNextBillingDate', () => {
      it('should return true when no end date', () => {
        expect(shouldUpdateNextBillingDate('2024-12-21', null)).toBe(true)
      })

      it('should return true when next date is before end date', () => {
        expect(shouldUpdateNextBillingDate('2024-12-21', '2025-12-31')).toBe(true)
      })

      it('should return true when next date equals end date', () => {
        expect(shouldUpdateNextBillingDate('2024-12-21', '2024-12-21')).toBe(true)
      })

      it('should return false when next date exceeds end date', () => {
        expect(shouldUpdateNextBillingDate('2025-01-21', '2024-12-31')).toBe(false)
      })
    })

    describe('createExpenseData', () => {
      it('should create expense with correct amount (amount * quantity)', () => {
        const subscription = {
          id: 'sub-1',
          user_id: 'user-1',
          amount: 10.99,
          quantity: 2
        }
        
        const expense = createExpenseData(subscription, 'cat-1', '2024-12-21')
        
        expect(expense.amount).toBe(21.98)
      })

      it('should create expense with correct fields', () => {
        const subscription = {
          id: 'sub-1',
          user_id: 'user-1',
          amount: 10.99,
          quantity: 1
        }
        
        const expense = createExpenseData(subscription, 'cat-1', '2024-12-21')
        
        expect(expense.user_id).toBe('user-1')
        expect(expense.category_id).toBe('cat-1')
        expect(expense.date).toBe('2024-12-21')
        expect(expense.subscription_id).toBe('sub-1')
        expect(expense.created_at).toBeDefined()
        expect(expense.updated_at).toBeDefined()
      })

      it('should handle quantity of 1', () => {
        const subscription = {
          id: 'sub-1',
          user_id: 'user-1',
          amount: 15.50,
          quantity: 1
        }
        
        const expense = createExpenseData(subscription, 'cat-1', '2024-12-21')
        
        expect(expense.amount).toBe(15.50)
      })

      it('should handle large quantities', () => {
        const subscription = {
          id: 'sub-1',
          user_id: 'user-1',
          amount: 5.00,
          quantity: 10
        }
        
        const expense = createExpenseData(subscription, 'cat-1', '2024-12-21')
        
        expect(expense.amount).toBe(50.00)
      })
    })

    describe('Timezone conversion logic', () => {
      it('should handle different timezones consistently', () => {
        // Test that the same date string is processed consistently
        // regardless of timezone (since we're comparing date strings, not times)
        const subscription = {
          next_billing_date: '2024-12-21',
          end_date: null
        }
        
        const timezones = ['UTC', 'Asia/Shanghai', 'America/New_York', 'Europe/London']
        
        timezones.forEach(tz => {
          const result = shouldProcessSubscription(subscription, '2024-12-21', tz)
          expect(result).toBe(true)
        })
      })
    })

    describe('End date handling (edge case from 2.6)', () => {
      it('should not process when end date is before current date', () => {
        const subscription = {
          next_billing_date: '2024-12-21',
          end_date: '2024-12-20'
        }
        
        expect(shouldProcessSubscription(subscription, '2024-12-21', 'UTC')).toBe(false)
      })

      it('should process when end date equals current date', () => {
        const subscription = {
          next_billing_date: '2024-12-21',
          end_date: '2024-12-21'
        }
        
        expect(shouldProcessSubscription(subscription, '2024-12-21', 'UTC')).toBe(true)
      })

      it('should not update next billing date when it would exceed end date', () => {
        expect(shouldUpdateNextBillingDate('2025-01-21', '2024-12-31')).toBe(false)
      })

      it('should update next billing date when it equals end date', () => {
        expect(shouldUpdateNextBillingDate('2024-12-31', '2024-12-31')).toBe(true)
      })
    })
  })
})
