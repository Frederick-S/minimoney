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
  })
})
