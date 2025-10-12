/**
 * Date utility functions for handling timezone-aware date operations
 */

/**
 * Get today's date in YYYY-MM-DD format using the user's local timezone
 * This ensures that "today" matches what the user sees on their calendar
 * 
 * @returns Date string in YYYY-MM-DD format (e.g., "2025-10-12")
 */
export function getTodayDate(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format a date string or Date object to YYYY-MM-DD format in local timezone
 * 
 * @param date - Date string or Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateToLocal(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get the last day of a specific month
 * 
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 * @returns Date string in YYYY-MM-DD format
 */
export function getLastDayOfMonth(year: number, month: number): string {
  // Day 0 of next month = last day of current month
  const lastDay = new Date(year, month, 0)
  const monthStr = String(month).padStart(2, '0')
  const dayStr = String(lastDay.getDate()).padStart(2, '0')
  return `${year}-${monthStr}-${dayStr}`
}

/**
 * Get the current month in YYYY-MM format
 * 
 * @returns Month string in YYYY-MM format (e.g., "2025-10")
 */
export function getCurrentMonth(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Get the current year
 * 
 * @returns Year as string (e.g., "2025")
 */
export function getCurrentYear(): string {
  return new Date().getFullYear().toString()
}
