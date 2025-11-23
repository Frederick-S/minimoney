import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSubscriptions } from './useSubscriptions'
import * as fc from 'fast-check'
import type { Subscription } from '../types'

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  delete: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  single: vi.fn()
}

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com'
}

// Mock useSupabase
vi.mock('./useSupabase', () => ({
  useSupabase: () => ({
    user: { value: mockUser },
    supabase: mockSupabase
  })
}))

describe('useSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the mock chain
    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.select.mockReturnValue(mockSupabase)
    mockSupabase.insert.mockReturnValue(mockSupabase)
    mockSupabase.update.mockReturnValue(mockSupabase)
    mockSupabase.delete.mockReturnValue(mockSupabase)
    mockSupabase.eq.mockReturnValue(mockSupabase)
    mockSupabase.order.mockReturnValue(mockSupabase)
  })

  describe('Property-Based Tests', () => {
    /**
     * Feature: subscription-management, Property 1: Subscription creation with valid data
     * Validates: Requirements 1.1, 1.4
     * 
     * For any valid subscription data (with name, amount, currency, and billing frequency),
     * creating the subscription should result in the subscription appearing in both the
     * database and the user's subscription list
     */
    it('Property 1: Subscription creation with valid data', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid subscription name (non-empty string)
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          // Generate valid amount (positive number)
          fc.double({ min: 0.01, max: 100000, noNaN: true }),
          // Generate valid currency from supported currencies
          fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
          // Generate valid billing frequency
          fc.constantFrom('monthly' as const, 'yearly' as const),
          // Generate auto-renew flag
          fc.boolean(),
          // Generate optional end date (ISO string or undefined)
          fc.option(
            fc.integer({ min: 1, max: 365 })
              .map(days => {
                const date = new Date()
                date.setDate(date.getDate() + days)
                return date.toISOString().split('T')[0]
              })
          ),
          // Generate next billing date (ISO string)
          fc.integer({ min: 1, max: 365 })
            .map(days => {
              const date = new Date()
              date.setDate(date.getDate() + days)
              return date.toISOString().split('T')[0]
            }),
          async (name, amount, currency, billingFrequency, isAutoRenew, endDate, nextBillingDate) => {
            // Ensure auto-renew and end date relationship is valid
            // Property 4: For any subscription with an end date specified, the auto-renew flag should be false,
            // and for any subscription with auto-renew true, the end date should be null
            let validIsAutoRenew: boolean
            let validEndDate: string | undefined
            
            if (endDate) {
              // If endDate is provided, isAutoRenew must be false
              validIsAutoRenew = false
              validEndDate = endDate
            } else if (isAutoRenew) {
              // If isAutoRenew is true, endDate must be undefined
              validIsAutoRenew = true
              validEndDate = undefined
            } else {
              // If isAutoRenew is false and no endDate, generate one
              validIsAutoRenew = false
              validEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }

            const subscriptionData = {
              name: name.trim(),
              amount,
              currency,
              billingFrequency,
              isAutoRenew: validIsAutoRenew,
              endDate: validEndDate,
              nextBillingDate
            }

            // Create a mock subscription that would be returned from the database
            const mockId = `sub-${Math.random().toString(36).substr(2, 9)}`
            const mockCreatedAt = new Date().toISOString()
            const mockUpdatedAt = new Date().toISOString()

            // Reset and mock the database response with snake_case keys (as Supabase returns)
            mockSupabase.single.mockReset()
            mockSupabase.single.mockResolvedValue({
              data: {
                id: mockId,
                user_id: mockUser.id,
                name: subscriptionData.name,
                amount: subscriptionData.amount,
                currency: subscriptionData.currency,
                billing_frequency: subscriptionData.billingFrequency,
                is_auto_renew: subscriptionData.isAutoRenew,
                end_date: subscriptionData.endDate || null,
                next_billing_date: subscriptionData.nextBillingDate,
                created_at: mockCreatedAt,
                updated_at: mockUpdatedAt
              },
              error: null
            })

            const { createSubscription, subscriptions } = useSubscriptions()

            // Clear subscriptions array before test to avoid state pollution
            subscriptions.value = []

            // Create the subscription
            const result = await createSubscription(subscriptionData)

            // Verify the subscription was created with correct data
            expect(result).toBeDefined()
            expect(result.id).toBeDefined()
            expect(result.userId).toBe(mockUser.id)
            expect(result.name).toBe(subscriptionData.name)
            expect(result.amount).toBe(subscriptionData.amount)
            expect(result.currency).toBe(subscriptionData.currency)
            expect(result.billingFrequency).toBe(subscriptionData.billingFrequency)
            expect(result.isAutoRenew).toBe(subscriptionData.isAutoRenew)
            expect(result.endDate).toBe(subscriptionData.endDate)
            expect(result.nextBillingDate).toBe(subscriptionData.nextBillingDate)
            expect(result.createdAt).toBeDefined()
            expect(result.updatedAt).toBeDefined()

            // Verify the subscription appears in the subscription list
            expect(subscriptions.value).toContainEqual(result)

            // Verify the database insert was called
            expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions')
            expect(mockSupabase.insert).toHaveBeenCalled()
            expect(mockSupabase.select).toHaveBeenCalled()

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Feature: subscription-management, Property 2: Required field validation
     * Validates: Requirements 1.2
     * 
     * For any subscription data missing one or more required fields (name, amount, currency, billing frequency),
     * attempting to create the subscription should be rejected with validation errors
     */
    it('Property 2: Required field validation', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate subscription data with at least one missing required field
          fc.record({
            name: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            amount: fc.option(fc.double({ min: 0.01, max: 100000, noNaN: true })),
            currency: fc.option(fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD')),
            billingFrequency: fc.option(fc.constantFrom('monthly' as const, 'yearly' as const)),
            isAutoRenew: fc.boolean(),
            endDate: fc.option(
              fc.integer({ min: 1, max: 365 })
                .map(days => {
                  const date = new Date()
                  date.setDate(date.getDate() + days)
                  return date.toISOString().split('T')[0]
                })
            ),
            nextBillingDate: fc.integer({ min: 1, max: 365 })
              .map(days => {
                const date = new Date()
                date.setDate(date.getDate() + days)
                return date.toISOString().split('T')[0]
              })
          }).filter(data => {
            // Ensure at least one required field is missing or invalid
            const hasEmptyName = !data.name || data.name.trim() === ''
            const hasMissingAmount = data.amount === null || data.amount === undefined
            const hasMissingCurrency = !data.currency || data.currency.trim() === ''
            const hasMissingBillingFrequency = !data.billingFrequency
            
            return hasEmptyName || hasMissingAmount || hasMissingCurrency || hasMissingBillingFrequency
          }),
          async (subscriptionData) => {
            const { createSubscription } = useSubscriptions()

            // Attempt to create the subscription with missing required fields
            try {
              await createSubscription(subscriptionData as any)
              
              // If we reach here, the validation failed to catch the missing field
              return false
            } catch (error) {
              // Verify that an error was thrown (validation worked)
              expect(error).toBeDefined()
              expect(error).toBeInstanceOf(Error)
              
              // Verify the error message is meaningful (in Chinese as per the implementation)
              const errorMessage = (error as Error).message
              expect(errorMessage).toBeTruthy()
              expect(errorMessage.length).toBeGreaterThan(0)
              
              // Verify the error message relates to validation
              const validationMessages = [
                '订阅名称不能为空',
                '金额不能为空',
                '货币不能为空',
                '账单频率不能为空'
              ]
              
              const hasValidationMessage = validationMessages.some(msg => 
                errorMessage.includes(msg)
              )
              
              expect(hasValidationMessage).toBe(true)
              
              return true
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Feature: subscription-management, Property 3: Billing frequency validation
     * Validates: Requirements 1.3
     * 
     * For any subscription, the billing frequency should only accept 'monthly' or 'yearly' as valid values
     */
    it('Property 3: Billing frequency validation', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid subscription name
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          // Generate valid amount
          fc.double({ min: 0.01, max: 100000, noNaN: true }),
          // Generate valid currency
          fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
          // Generate INVALID billing frequency (anything other than 'monthly' or 'yearly')
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== 'monthly' && s !== 'yearly'),
          // Generate next billing date
          fc.integer({ min: 1, max: 365 })
            .map(days => {
              const date = new Date()
              date.setDate(date.getDate() + days)
              return date.toISOString().split('T')[0]
            }),
          async (name, amount, currency, invalidBillingFrequency, nextBillingDate) => {
            const subscriptionData = {
              name: name.trim(),
              amount,
              currency,
              billingFrequency: invalidBillingFrequency as any, // Force invalid value
              isAutoRenew: true,
              endDate: undefined,
              nextBillingDate
            }

            const { createSubscription } = useSubscriptions()

            // Attempt to create the subscription with invalid billing frequency
            try {
              await createSubscription(subscriptionData)
              
              // If we reach here, the validation failed to catch the invalid billing frequency
              return false
            } catch (error) {
              // Verify that an error was thrown (validation worked)
              expect(error).toBeDefined()
              expect(error).toBeInstanceOf(Error)
              
              // Verify the error message is about billing frequency
              const errorMessage = (error as Error).message
              expect(errorMessage).toBeTruthy()
              expect(errorMessage).toContain('账单频率')
              
              return true
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Feature: subscription-management, Property 4: End date and auto-renew relationship
     * Validates: Requirements 1.5
     * 
     * For any subscription with an end date specified, the auto-renew flag should be false,
     * and for any subscription with auto-renew true, the end date should be null
     */
    it('Property 4: End date and auto-renew relationship', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid subscription name
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          // Generate valid amount
          fc.double({ min: 0.01, max: 100000, noNaN: true }),
          // Generate valid currency
          fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
          // Generate valid billing frequency
          fc.constantFrom('monthly' as const, 'yearly' as const),
          // Generate auto-renew flag
          fc.boolean(),
          // Generate optional end date (ISO string or undefined)
          fc.option(
            fc.integer({ min: 1, max: 365 })
              .map(days => {
                const date = new Date()
                date.setDate(date.getDate() + days)
                return date.toISOString().split('T')[0]
              })
          ),
          // Generate next billing date
          fc.integer({ min: 1, max: 365 })
            .map(days => {
              const date = new Date()
              date.setDate(date.getDate() + days)
              return date.toISOString().split('T')[0]
            }),
          async (name, amount, currency, billingFrequency, isAutoRenew, endDate, nextBillingDate) => {
            const subscriptionData = {
              name: name.trim(),
              amount,
              currency,
              billingFrequency,
              isAutoRenew,
              endDate,
              nextBillingDate
            }

            const { createSubscription } = useSubscriptions()

            // Test the relationship between isAutoRenew and endDate
            const hasEndDate = endDate !== null && endDate !== undefined
            const isInvalidCombination = 
              (isAutoRenew && hasEndDate) ||  // Auto-renew with end date is invalid
              (!isAutoRenew && !hasEndDate)   // Non-auto-renew without end date is invalid

            if (isInvalidCombination) {
              // This combination should be rejected
              try {
                await createSubscription(subscriptionData)
                
                // If we reach here, validation failed to catch the invalid combination
                return false
              } catch (error) {
                // Verify that an error was thrown (validation worked)
                expect(error).toBeDefined()
                expect(error).toBeInstanceOf(Error)
                
                const errorMessage = (error as Error).message
                expect(errorMessage).toBeTruthy()
                
                // Verify the error message is about the auto-renew/end date relationship
                const hasRelevantMessage = 
                  errorMessage.includes('自动续订') || 
                  errorMessage.includes('结束日期')
                
                expect(hasRelevantMessage).toBe(true)
                
                return true
              }
            } else {
              // This combination should be accepted
              // Create a mock subscription that would be returned from the database
              const mockId = `sub-${Math.random().toString(36).substring(2, 9)}`
              const mockCreatedAt = new Date().toISOString()
              const mockUpdatedAt = new Date().toISOString()

              // Reset and mock the database response with snake_case keys
              mockSupabase.single.mockReset()
              mockSupabase.single.mockResolvedValue({
                data: {
                  id: mockId,
                  user_id: mockUser.id,
                  name: subscriptionData.name,
                  amount: subscriptionData.amount,
                  currency: subscriptionData.currency,
                  billing_frequency: subscriptionData.billingFrequency,
                  is_auto_renew: subscriptionData.isAutoRenew,
                  end_date: subscriptionData.endDate || null,
                  next_billing_date: subscriptionData.nextBillingDate,
                  created_at: mockCreatedAt,
                  updated_at: mockUpdatedAt
                },
                error: null
              })

              const result = await createSubscription(subscriptionData)

              // Verify the relationship is maintained in the result
              if (result.isAutoRenew) {
                expect(result.endDate).toBeUndefined()
              } else {
                expect(result.endDate).toBeDefined()
                expect(result.endDate).toBeTruthy()
              }

              return true
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
