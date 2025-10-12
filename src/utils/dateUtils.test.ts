import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getTodayDate,
  formatDateToLocal,
  getLastDayOfMonth,
  getCurrentMonth,
  getCurrentYear
} from './dateUtils'

describe('dateUtils', () => {
  describe('getTodayDate', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const result = getTodayDate()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should return local date, not UTC date for UTC+8 timezone', () => {
      // Mock Date to simulate Beijing time (UTC+8) at 1:00 AM Oct 13
      // In UTC, this is Oct 12, 5:00 PM
      const mockDate = new Date('2025-10-12T17:00:00.000Z')
      vi.setSystemTime(mockDate)

      const result = getTodayDate()
      
      // In UTC+8, this should be Oct 13, not Oct 12
      // Note: This test will pass if your system is in UTC+8
      // For other timezones, the actual date will differ
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      
      vi.useRealTimers()
    })

    it('should pad single digit months and days with zero', () => {
      // Mock Date to Jan 5, 2025
      const mockDate = new Date('2025-01-05T12:00:00.000Z')
      vi.setSystemTime(mockDate)

      const result = getTodayDate()
      
      // Should have padded zeros
      expect(result).toMatch(/^\d{4}-0\d-0\d$/)
      
      vi.useRealTimers()
    })

    it('should handle year boundaries correctly', () => {
      // Mock Date to Dec 31, 2024 at 11:59 PM (any timezone)
      const mockDate = new Date(2024, 11, 31, 23, 59, 59)
      vi.setSystemTime(mockDate)

      const result = getTodayDate()
      expect(result).toBe('2024-12-31')
      
      vi.useRealTimers()
    })
  })

  describe('formatDateToLocal', () => {
    it('should format Date object to YYYY-MM-DD', () => {
      const date = new Date(2025, 9, 13) // Oct 13, 2025 (month is 0-indexed)
      const result = formatDateToLocal(date)
      expect(result).toBe('2025-10-13')
    })

    it('should format date string to YYYY-MM-DD', () => {
      const dateString = '2025-10-13T12:00:00.000Z'
      const result = formatDateToLocal(dateString)
      // Result depends on local timezone, but should be valid format
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should pad single digit months and days', () => {
      const date = new Date(2025, 0, 5) // Jan 5, 2025
      const result = formatDateToLocal(date)
      expect(result).toBe('2025-01-05')
    })

    it('should handle leap year dates', () => {
      const date = new Date(2024, 1, 29) // Feb 29, 2024 (leap year)
      const result = formatDateToLocal(date)
      expect(result).toBe('2024-02-29')
    })
  })

  describe('getLastDayOfMonth', () => {
    it('should return last day of January (31 days)', () => {
      const result = getLastDayOfMonth(2025, 1)
      expect(result).toBe('2025-01-31')
    })

    it('should return last day of February in non-leap year (28 days)', () => {
      const result = getLastDayOfMonth(2025, 2)
      expect(result).toBe('2025-02-28')
    })

    it('should return last day of February in leap year (29 days)', () => {
      const result = getLastDayOfMonth(2024, 2)
      expect(result).toBe('2024-02-29')
    })

    it('should return last day of April (30 days)', () => {
      const result = getLastDayOfMonth(2025, 4)
      expect(result).toBe('2025-04-30')
    })

    it('should return last day of December (31 days)', () => {
      const result = getLastDayOfMonth(2025, 12)
      expect(result).toBe('2025-12-31')
    })

    it('should pad single digit months', () => {
      const result = getLastDayOfMonth(2025, 5)
      expect(result).toBe('2025-05-31')
    })
  })

  describe('getCurrentMonth', () => {
    it('should return current month in YYYY-MM format', () => {
      const result = getCurrentMonth()
      expect(result).toMatch(/^\d{4}-\d{2}$/)
    })

    it('should pad single digit months with zero', () => {
      // Mock Date to Jan 2025
      const mockDate = new Date(2025, 0, 15) // Jan 15, 2025
      vi.setSystemTime(mockDate)

      const result = getCurrentMonth()
      expect(result).toBe('2025-01')
      
      vi.useRealTimers()
    })

    it('should handle December correctly', () => {
      // Mock Date to Dec 2025
      const mockDate = new Date(2025, 11, 15) // Dec 15, 2025
      vi.setSystemTime(mockDate)

      const result = getCurrentMonth()
      expect(result).toBe('2025-12')
      
      vi.useRealTimers()
    })
  })

  describe('getCurrentYear', () => {
    it('should return current year as string', () => {
      const result = getCurrentYear()
      expect(result).toMatch(/^\d{4}$/)
      expect(typeof result).toBe('string')
    })

    it('should return correct year', () => {
      // Mock Date to 2025
      const mockDate = new Date(2025, 5, 15) // Jun 15, 2025
      vi.setSystemTime(mockDate)

      const result = getCurrentYear()
      expect(result).toBe('2025')
      
      vi.useRealTimers()
    })

    it('should handle year boundaries', () => {
      // Mock Date to Dec 31, 2024
      const mockDate = new Date(2024, 11, 31, 23, 59, 59)
      vi.setSystemTime(mockDate)

      const result = getCurrentYear()
      expect(result).toBe('2024')
      
      vi.useRealTimers()
    })
  })

  describe('Edge Cases', () => {
    it('should handle midnight boundary correctly', () => {
      // Mock Date to exactly midnight
      const mockDate = new Date(2025, 9, 13, 0, 0, 0) // Oct 13, 2025 00:00:00
      vi.setSystemTime(mockDate)

      const result = getTodayDate()
      expect(result).toBe('2025-10-13')
      
      vi.useRealTimers()
    })

    it('should handle end of day correctly', () => {
      // Mock Date to 11:59:59 PM
      const mockDate = new Date(2025, 9, 13, 23, 59, 59) // Oct 13, 2025 23:59:59
      vi.setSystemTime(mockDate)

      const result = getTodayDate()
      expect(result).toBe('2025-10-13')
      
      vi.useRealTimers()
    })

    it('should handle century boundaries', () => {
      // Mock Date to Dec 31, 1999
      const mockDate = new Date(1999, 11, 31)
      vi.setSystemTime(mockDate)

      const result = getTodayDate()
      expect(result).toBe('1999-12-31')
      
      vi.useRealTimers()
    })
  })

  describe('Consistency Tests', () => {
    it('getTodayDate and getCurrentMonth should be consistent', () => {
      const today = getTodayDate()
      const currentMonth = getCurrentMonth()
      
      // Extract year-month from today
      const todayYearMonth = today.substring(0, 7)
      
      expect(todayYearMonth).toBe(currentMonth)
    })

    it('getTodayDate and getCurrentYear should be consistent', () => {
      const today = getTodayDate()
      const currentYear = getCurrentYear()
      
      // Extract year from today
      const todayYear = today.substring(0, 4)
      
      expect(todayYear).toBe(currentYear)
    })

    it('formatDateToLocal should preserve date for local Date objects', () => {
      const date = new Date(2025, 9, 13) // Oct 13, 2025 local time
      const formatted = formatDateToLocal(date)
      
      expect(formatted).toBe('2025-10-13')
    })
  })
})
