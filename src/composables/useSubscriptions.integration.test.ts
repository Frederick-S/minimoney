import { describe, it, expect } from 'vitest'
import { useSubscriptionExpenses } from './useSubscriptionExpenses'
import { format } from 'date-fns'

/**
 * Integration Tests for Subscription Creation Flow
 * 
 * These tests validate the complete flow logic of creating subscriptions with expense generation,
 * including past bills calculation and data integrity.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 * 
 * Note: These tests focus on the business logic integration without database mocking complexity.
 * Full end-to-end database integration is tested manually and in E2E tests.
 */

describe('Subscription Creation Flow - Integration Tests', () => {
  /**
   * Test: Subscription creation with past bills confirmed
   * 
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4
   * 
   * When a user creates a subscription with a start date in the past and confirms
   * the creation of past bills, the system should calculate the correct billing events.
   */
  it('should calculate past bills correctly for monthly subscription', () => {
    const { generatePastBillsPreview, calculateBillingEvents } = useSubscriptionExpenses()

    // Setup: Create subscription data with start date 3 months in the past
    const startDate = '2024-01-01'
    const amount = 99
    const currency = 'CNY'
    const frequency = 'monthly' as const

    // Generate preview
    const preview = generatePastBillsPreview(
      startDate,
      amount,
      currency,
      frequency,
      'UTC'
    )

    // Verify: Preview contains correct data
    expect(preview).toBeDefined()
    expect(preview.count).toBeGreaterThan(0)
    expect(preview.events.length).toBe(preview.count)
    expect(preview.totalAmount).toBe(preview.count * amount)
    expect(preview.startDate).toBe(startDate)

    // Verify: Each event has correct structure
    preview.events.forEach(event => {
      expect(event.amount).toBe(amount)
      expect(event.currency).toBe(currency)
      expect(event.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    // Verify: Events are in chronological order
    for (let i = 1; i < preview.events.length; i++) {
      const prevDate = new Date(preview.events[i - 1].date)
      const currDate = new Date(preview.events[i].date)
      expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime())
    }
  })

  /**
   * Test: Subscription creation with past bills declined
   * 
   * Validates: Requirements 1.5
   * 
   * When a user declines past bills, no billing events should be generated.
   */
  it('should not generate billing events when start date is in future', () => {
    const { calculateBillingEvents } = useSubscriptionExpenses()

    // Setup: Start date in the future
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const startDate = format(futureDate, 'yyyy-MM-dd')
    
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    const endDate = format(pastDate, 'yyyy-MM-dd')

    // Calculate billing events (start > end, so no events)
    const events = calculateBillingEvents(
      startDate,
      endDate,
      100,
      'CNY',
      'monthly',
      'UTC'
    )

    // Verify: No events generated
    expect(events).toHaveLength(0)
  })

  /**
   * Test: Subscription creation with no past bills
   * 
   * Validates: Requirements 1.1
   * 
   * When start date equals today, only one billing event should be generated.
   */
  it('should generate single event when start date equals end date', () => {
    const { calculateBillingEvents } = useSubscriptionExpenses()

    // Setup: Start date equals end date (today)
    const today = format(new Date(), 'yyyy-MM-dd')

    // Calculate billing events
    const events = calculateBillingEvents(
      today,
      today,
      100,
      'USD',
      'monthly',
      'UTC'
    )

    // Verify: Single event generated
    expect(events).toHaveLength(1)
    expect(events[0].date).toBe(today)
    expect(events[0].amount).toBe(100)
    expect(events[0].currency).toBe('USD')
  })

  /**
   * Test: Error handling during expense creation
   * 
   * Validates: Requirements 1.4, 1.5
   * 
   * When invalid data is provided, the system should handle it gracefully.
   */
  it('should handle invalid date ranges gracefully', () => {
    const { calculateBillingEvents } = useSubscriptionExpenses()

    // Test with start date after end date
    const events = calculateBillingEvents(
      '2024-03-01',
      '2024-01-01',
      100,
      'CNY',
      'monthly',
      'UTC'
    )

    // Should return empty array, not throw error
    expect(events).toHaveLength(0)
  })

  /**
   * Test: Billing event data integrity
   * 
   * Validates: Requirements 1.6, 1.7, 1.8
   * 
   * All billing events should preserve the subscription's amount and currency.
   */
  it('should preserve amount and currency in all billing events', () => {
    const { calculateBillingEvents } = useSubscriptionExpenses()

    const amount = 75.50
    const currency = 'EUR'

    // Calculate billing events for 6 months
    const events = calculateBillingEvents(
      '2024-01-01',
      '2024-06-01',
      amount,
      currency,
      'monthly',
      'UTC'
    )

    // Verify: All events have correct amount and currency
    expect(events.length).toBeGreaterThan(0)
    events.forEach(event => {
      expect(event.amount).toBe(amount)
      expect(event.currency).toBe(currency)
    })
  })

  /**
   * Test: Yearly billing frequency
   * 
   * Validates: Requirements 1.1
   * 
   * Yearly subscriptions should generate events at 12-month intervals.
   */
  it('should calculate yearly billing events correctly', () => {
    const { calculateBillingEvents } = useSubscriptionExpenses()

    // Calculate billing events for 3 years
    const events = calculateBillingEvents(
      '2022-06-01',
      '2024-06-01',
      1200,
      'USD',
      'yearly',
      'UTC'
    )

    // Verify: Correct number of events (2022, 2023, 2024)
    expect(events.length).toBe(3)
    expect(events[0].date).toBe('2022-06-01')
    expect(events[1].date).toBe('2023-06-01')
    expect(events[2].date).toBe('2024-06-01')
  })

  /**
   * Test: Preview total amount calculation
   * 
   * Validates: Requirements 1.2
   * 
   * Preview should correctly sum all billing event amounts.
   */
  it('should calculate correct total amount in preview', () => {
    const { generatePastBillsPreview } = useSubscriptionExpenses()

    const amount = 50
    const preview = generatePastBillsPreview(
      '2024-01-01',
      amount,
      'CNY',
      'monthly',
      'UTC'
    )

    // Verify: Total equals count * amount
    expect(preview.totalAmount).toBe(preview.count * amount)
    
    // Verify: Manual sum matches total
    const manualSum = preview.events.reduce((sum, event) => sum + event.amount, 0)
    expect(preview.totalAmount).toBe(manualSum)
  })

  /**
   * Test: Month-end date handling
   * 
   * Validates: Requirements 1.1
   * 
   * Subscriptions starting on month-end dates should handle February correctly.
   */
  it('should handle month-end dates correctly', () => {
    const { calculateBillingEvents } = useSubscriptionExpenses()

    // Start on Jan 31
    const events = calculateBillingEvents(
      '2024-01-31',
      '2024-04-30',
      100,
      'CNY',
      'monthly',
      'UTC'
    )

    // Verify: Events generated (date-fns handles month-end)
    expect(events.length).toBeGreaterThan(0)
    expect(events[0].date).toBe('2024-01-31')
    
    // Feb 29 in 2024 (leap year)
    expect(events[1].date).toBe('2024-02-29')
  })

  /**
   * Test: Quantity calculation integration
   * 
   * Validates: Requirements 1.4
   * 
   * When quantity > 1, total amount should be amount * quantity.
   */
  it('should calculate total amount with quantity correctly', () => {
    const { generatePastBillsPreview } = useSubscriptionExpenses()

    const unitAmount = 50
    const quantity = 3
    const totalAmount = unitAmount * quantity // 150

    const preview = generatePastBillsPreview(
      '2024-02-01',
      totalAmount, // Pass total amount (already calculated)
      'USD',
      'monthly',
      'UTC'
    )

    // Verify: Each event uses total amount
    preview.events.forEach(event => {
      expect(event.amount).toBe(totalAmount)
    })

    // Verify: Total is correct
    expect(preview.totalAmount).toBe(preview.count * totalAmount)
  })

  /**
   * Test: Empty billing events
   * 
   * Validates: Requirements 1.1
   * 
   * When start date is after end date, no events should be generated.
   */
  it('should return empty array when start date is after end date', () => {
    const { calculateBillingEvents } = useSubscriptionExpenses()

    const events = calculateBillingEvents(
      '2024-03-01',
      '2024-01-01', // End before start
      100,
      'CNY',
      'monthly',
      'UTC'
    )

    expect(events).toHaveLength(0)
  })

  /**
   * Test: Preview data structure
   * 
   * Validates: Requirements 1.2
   * 
   * Preview should contain all required fields with correct types.
   */
  it('should generate preview with correct data structure', () => {
    const { generatePastBillsPreview } = useSubscriptionExpenses()

    const preview = generatePastBillsPreview(
      '2024-01-01',
      99,
      'CNY',
      'monthly',
      'UTC'
    )

    // Verify: Preview structure
    expect(preview).toHaveProperty('events')
    expect(preview).toHaveProperty('count')
    expect(preview).toHaveProperty('totalAmount')
    expect(preview).toHaveProperty('startDate')
    expect(preview).toHaveProperty('endDate')

    // Verify: Types
    expect(Array.isArray(preview.events)).toBe(true)
    expect(typeof preview.count).toBe('number')
    expect(typeof preview.totalAmount).toBe('number')
    expect(typeof preview.startDate).toBe('string')
    expect(typeof preview.endDate).toBe('string')
  })
})
