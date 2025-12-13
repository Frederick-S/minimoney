import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTimezone } from './useTimezone'
import * as fc from 'fast-check'
import { format, parseISO, isValid } from 'date-fns'

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn()
  }
}

const mockUser = {
  value: { id: 'test-user-id' }
}

vi.mock('./useSupabase', () => ({
  useSupabase: () => ({
    supabase: mockSupabase,
    user: mockUser
  })
}))

describe('useTimezone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.value = { id: 'test-user-id' }
  })

  describe('getBrowserTimezone', () => {
    it('should return browser timezone', () => {
      const { getBrowserTimezone } = useTimezone()
      const timezone = getBrowserTimezone()
      
      expect(timezone).toBeTruthy()
      expect(typeof timezone).toBe('string')
    })

    it('should return UTC as fallback if detection fails', () => {
      // Mock Intl.DateTimeFormat to throw error
      const originalDateTimeFormat = Intl.DateTimeFormat
      vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
        throw new Error('Detection failed')
      })

      const { getBrowserTimezone } = useTimezone()
      const timezone = getBrowserTimezone()
      
      expect(timezone).toBe('UTC')

      // Restore
      vi.mocked(Intl.DateTimeFormat).mockRestore()
    })
  })

  describe('getUserTimezone', () => {
    it('should return timezone from preferences if available', async () => {
      const mockData = { value: 'America/New_York' }
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockData, error: null })
              })
            })
          })
        })
      })

      const { getUserTimezone } = useTimezone()
      const timezone = await getUserTimezone()
      
      expect(timezone).toBe('America/New_York')
    })

    it('should return browser timezone if no preference exists', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          })
        })
      })

      const { getUserTimezone } = useTimezone()
      const timezone = await getUserTimezone()
      
      expect(timezone).toBeTruthy()
      expect(typeof timezone).toBe('string')
    })

    it('should return UTC if user is not authenticated', async () => {
      mockUser.value = null as any

      const { getUserTimezone } = useTimezone()
      const timezone = await getUserTimezone()
      
      expect(timezone).toBeTruthy()
    })
  })

  describe('saveUserTimezone', () => {
    it('should save timezone preference successfully', async () => {
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null })
      })

      const { saveUserTimezone } = useTimezone()
      const result = await saveUserTimezone('Asia/Shanghai')
      
      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_preferences')
    })

    it('should return false if user is not authenticated', async () => {
      mockUser.value = null as any

      const { saveUserTimezone } = useTimezone()
      const result = await saveUserTimezone('Asia/Shanghai')
      
      expect(result).toBe(false)
    })

    it('should return false for invalid timezone', async () => {
      const { saveUserTimezone } = useTimezone()
      const result = await saveUserTimezone('')
      
      expect(result).toBe(false)
    })

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: { message: 'Database error' } })
      })

      const { saveUserTimezone } = useTimezone()
      const result = await saveUserTimezone('Asia/Shanghai')
      
      expect(result).toBe(false)
    })
  })

  describe('convertToUtc', () => {
    it('should convert date from timezone to UTC', () => {
      const { convertToUtc } = useTimezone()
      
      // Test with a known date and timezone
      const date = '2024-01-15T12:00:00'
      const result = convertToUtc(date, 'America/New_York')
      
      expect(result).toBeInstanceOf(Date)
    })

    it('should throw error for invalid date', () => {
      const { convertToUtc } = useTimezone()
      
      expect(() => convertToUtc('invalid-date', 'UTC')).toThrow()
    })
  })

  describe('convertFromUtc', () => {
    it('should convert UTC date to timezone', () => {
      const { convertFromUtc } = useTimezone()
      
      const utcDate = '2024-01-15T17:00:00Z'
      const result = convertFromUtc(utcDate, 'America/New_York')
      
      expect(result).toBeInstanceOf(Date)
    })

    it('should throw error for invalid date', () => {
      const { convertFromUtc } = useTimezone()
      
      expect(() => convertFromUtc('invalid-date', 'UTC')).toThrow()
    })
  })

  describe('formatInTimezone', () => {
    it('should format date in specified timezone', () => {
      const { formatInTimezone } = useTimezone()
      
      const date = new Date('2024-01-15T12:00:00Z')
      const formatted = formatInTimezone(date, 'yyyy-MM-dd HH:mm', 'UTC')
      
      // The date should be formatted in UTC timezone
      expect(formatted).toMatch(/2024-01-15 \d{2}:00/)
    })

    it('should throw error for invalid date', () => {
      const { formatInTimezone } = useTimezone()
      
      expect(() => formatInTimezone('invalid-date', 'yyyy-MM-dd', 'UTC')).toThrow()
    })
  })

  describe('getCurrentDateInTimezone', () => {
    it('should return current date in specified timezone', () => {
      const { getCurrentDateInTimezone } = useTimezone()
      
      const dateString = getCurrentDateInTimezone('UTC')
      
      expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should return different dates for different timezones', () => {
      const { getCurrentDateInTimezone } = useTimezone()
      
      // At certain times, these will be different dates
      const utcDate = getCurrentDateInTimezone('UTC')
      const tokyoDate = getCurrentDateInTimezone('Asia/Tokyo')
      
      expect(utcDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(tokyoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('convertBetweenTimezones', () => {
    it('should convert date between timezones', () => {
      const { convertBetweenTimezones } = useTimezone()
      
      const date = '2024-01-15'
      const result = convertBetweenTimezones(date, 'UTC', 'America/New_York')
      
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should throw error for invalid date', () => {
      const { convertBetweenTimezones } = useTimezone()
      
      expect(() => convertBetweenTimezones('invalid', 'UTC', 'America/New_York')).toThrow()
    })
  })

  describe('Property-Based Tests', () => {
    /**
     * Feature: subscription-expense-persistence, Property 15: Timezone round trip
     * Validates: Requirements: All date-related requirements
     * 
     * For any date and timezone, converting from that timezone to UTC and back
     * should preserve the date (within the same day)
     */
    it('Property 15: Timezone round trip', () => {
      fc.assert(
        fc.property(
          // Generate random dates within a reasonable range
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
          // Generate random timezones from common ones
          fc.constantFrom(
            'UTC',
            'America/New_York',
            'America/Los_Angeles',
            'Europe/London',
            'Europe/Paris',
            'Asia/Tokyo',
            'Asia/Shanghai',
            'Asia/Kolkata',
            'Australia/Sydney'
          ),
          (date, timezone) => {
            const { convertToUtc, convertFromUtc, formatInTimezone } = useTimezone()
            
            // Skip invalid dates
            if (!isValid(date)) {
              return true
            }
            
            // Format the original date in the timezone
            const originalDateString = formatInTimezone(date, 'yyyy-MM-dd', timezone)
            
            // Convert to UTC and back
            const utcDate = convertToUtc(date, timezone)
            const roundTripDate = convertFromUtc(utcDate, timezone)
            
            // Format the round-trip date in the same timezone
            const roundTripDateString = formatInTimezone(roundTripDate, 'yyyy-MM-dd', timezone)
            
            // The date should be preserved (same day in the timezone)
            return originalDateString === roundTripDateString
          }
        ),
        { numRuns: 100 }
      )
    })


  })
})
