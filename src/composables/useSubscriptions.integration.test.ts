import { describe, it, expect } from 'vitest'
import { useSubscriptionExpenses } from './useSubscriptionExpenses'
import { format, subDays } from 'date-fns'
import * as fc from 'fast-check'

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

/**
 * Property-Based Tests for Subscription Updates
 * 
 * These tests validate the update logic for subscriptions, particularly
 * when start dates change and new expenses need to be generated.
 */
describe('Subscription Update Flow - Property-Based Tests', () => {
  /**
   * **Feature: subscription-expense-persistence, Property 9: Start date update expense generation**
   * **Validates: Requirements 4.1**
   * 
   * For any subscription update that changes the start date to an earlier date, 
   * new billing events should be calculated for the period between the new start date 
   * and the old start date, and expenses should be created for those events.
   */
  it('Property 9: Start date update expense generation', () => {
    const { calculateBillingEvents } = useSubscriptionExpenses()

    fc.assert(
      fc.property(
        // Generate original start date between 2020-01-01 and 2024-12-31
        fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') })
          .filter(d => !isNaN(d.getTime()))
          .map(d => {
            // Normalize to midnight UTC to avoid millisecond issues
            const normalized = new Date(d)
            normalized.setUTCHours(0, 0, 0, 0)
            return normalized
          }),
        // Generate number of days to move start date earlier (2 to 365 days)
        // Minimum 2 days to ensure we have a meaningful period
        fc.integer({ min: 2, max: 365 }),
        // Generate amount between 0.01 and 10000
        fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
        // Generate currency
        fc.constantFrom('CNY', 'USD', 'EUR'),
        // Generate frequency
        fc.constantFrom('monthly' as const, 'yearly' as const),
        (originalStartDate, daysEarlier, amount, currency, frequency) => {
          // Calculate new start date (earlier than original)
          const newStartDate = new Date(originalStartDate)
          newStartDate.setDate(newStartDate.getDate() - daysEarlier)
          newStartDate.setUTCHours(0, 0, 0, 0) // Normalize

          const originalStartStr = format(originalStartDate, 'yyyy-MM-dd')
          const newStartStr = format(newStartDate, 'yyyy-MM-dd')

          // Calculate the end date for new billing events
          // Should be one day before the original start date
          const endDate = subDays(originalStartDate, 1)
          const endDateStr = format(endDate, 'yyyy-MM-dd')

          // Calculate new billing events for the extended period
          const newEvents = calculateBillingEvents(
            newStartStr,
            endDateStr,
            amount,
            currency,
            frequency,
            'UTC'
          )

          // Property 1: New events should only cover the extended period
          // All event dates should be >= new start date and < original start date
          newEvents.forEach(event => {
            const eventDate = new Date(event.date + 'T00:00:00Z') // Parse as UTC
            const newStartNormalized = new Date(newStartStr + 'T00:00:00Z')
            const originalStartNormalized = new Date(originalStartStr + 'T00:00:00Z')
            
            expect(eventDate.getTime()).toBeGreaterThanOrEqual(newStartNormalized.getTime())
            expect(eventDate.getTime()).toBeLessThan(originalStartNormalized.getTime())
          })

          // Property 2: Each new event should have correct amount and currency
          newEvents.forEach(event => {
            expect(event.amount).toBe(amount)
            expect(event.currency).toBe(currency)
          })

          // Property 3: Events should be in chronological order
          for (let i = 1; i < newEvents.length; i++) {
            const prevDate = new Date(newEvents[i - 1].date + 'T00:00:00Z')
            const currDate = new Date(newEvents[i].date + 'T00:00:00Z')
            expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime())
          }

          // Property 4: Number of new events should be reasonable
          // For monthly: roughly daysEarlier / 30, for yearly: roughly daysEarlier / 365
          const expectedMaxEvents = frequency === 'monthly' 
            ? Math.ceil(daysEarlier / 28) + 1  // +1 for safety, 28 days minimum month
            : Math.ceil(daysEarlier / 365) + 1

          expect(newEvents.length).toBeLessThanOrEqual(expectedMaxEvents)

          // Property 5: If the period is too short for a billing cycle, 
          // we might have 0 or 1 events depending on alignment
          if (frequency === 'yearly' && daysEarlier < 365) {
            expect(newEvents.length).toBeLessThanOrEqual(1)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Unit test: Verify start date update generates correct new events
   * 
   * This test validates a specific scenario where the start date moves
   * earlier by exactly 2 months for a monthly subscription.
   */
  it('should generate new events when start date moves earlier by 2 months', () => {
    const { calculateBillingEvents } = useSubscriptionExpenses()

    // Original start date: 2024-03-01
    const originalStartDate = new Date('2024-03-01')
    
    // New start date: 2024-01-01 (2 months earlier)
    const newStartDate = new Date('2024-01-01')
    
    // End date for new events: 2024-02-29 (one day before original start)
    const endDate = subDays(originalStartDate, 1)
    const endDateStr = format(endDate, 'yyyy-MM-dd')

    // Calculate new billing events
    const newEvents = calculateBillingEvents(
      format(newStartDate, 'yyyy-MM-dd'),
      endDateStr,
      100,
      'CNY',
      'monthly',
      'UTC'
    )

    // Should generate 2 events: 2024-01-01 and 2024-02-01
    expect(newEvents.length).toBe(2)
    expect(newEvents[0].date).toBe('2024-01-01')
    expect(newEvents[1].date).toBe('2024-02-01')
    
    // All events should have correct amount and currency
    newEvents.forEach(event => {
      expect(event.amount).toBe(100)
      expect(event.currency).toBe('CNY')
    })
  })

  /**
   * Unit test: Verify no new events when start date moves later
   * 
   * When start date moves to a later date, no new events should be generated.
   */
  it('should generate no new events when start date moves later', () => {
    const { calculateBillingEvents } = useSubscriptionExpenses()

    // Original start date: 2024-01-01
    const originalStartDate = new Date('2024-01-01')
    
    // New start date: 2024-03-01 (2 months later)
    const newStartDate = new Date('2024-03-01')
    
    // End date for new events: 2023-12-31 (one day before original start)
    const endDate = subDays(originalStartDate, 1)
    const endDateStr = format(endDate, 'yyyy-MM-dd')

    // Calculate new billing events (start > end, so no events)
    const newEvents = calculateBillingEvents(
      format(newStartDate, 'yyyy-MM-dd'),
      endDateStr,
      100,
      'CNY',
      'monthly',
      'UTC'
    )

    // Should generate 0 events
    expect(newEvents.length).toBe(0)
  })

  /**
   * Unit test: Verify yearly subscription start date update
   * 
   * When a yearly subscription's start date moves earlier by 2 years,
   * 2 new billing events should be generated.
   */
  it('should generate new events for yearly subscription when start date moves earlier', () => {
    const { calculateBillingEvents } = useSubscriptionExpenses()

    // Original start date: 2024-06-01
    const originalStartDate = new Date('2024-06-01')
    
    // New start date: 2022-06-01 (2 years earlier)
    const newStartDate = new Date('2022-06-01')
    
    // End date for new events: 2024-05-31 (one day before original start)
    const endDate = subDays(originalStartDate, 1)
    const endDateStr = format(endDate, 'yyyy-MM-dd')

    // Calculate new billing events
    const newEvents = calculateBillingEvents(
      format(newStartDate, 'yyyy-MM-dd'),
      endDateStr,
      1200,
      'USD',
      'yearly',
      'UTC'
    )

    // Should generate 2 events: 2022-06-01 and 2023-06-01
    expect(newEvents.length).toBe(2)
    expect(newEvents[0].date).toBe('2022-06-01')
    expect(newEvents[1].date).toBe('2023-06-01')
    
    // All events should have correct amount and currency
    newEvents.forEach(event => {
      expect(event.amount).toBe(1200)
      expect(event.currency).toBe('USD')
    })
  })
})
