/**
 * Date utility functions for formatting, calculations, and comparisons
 */

export const dateUtils = {
  /**
   * Format a date string to a readable format
   */
  formatDate: (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
    const date = new Date(dateString)
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }
    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options })
  },

  /**
   * Format a date string to include time
   */
  formatDateTime: (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
    const date = new Date(dateString)
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options })
  },

  /**
   * Format a date string to relative time (e.g., "2 hours ago")
   */
  formatRelativeTime: (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return 'Just now'
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`
    }

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`
    }

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`
    }

    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) {
      return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`
    }

    return dateUtils.formatDate(dateString)
  },

  /**
   * Calculate the difference between two dates in minutes
   */
  getDifferenceInMinutes: (date1: string, date2: string): number => {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60))
  },

  /**
   * Calculate the difference between two dates in hours
   */
  getDifferenceInHours: (date1: string, date2: string): number => {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60))
  },

  /**
   * Calculate the difference between two dates in days
   */
  getDifferenceInDays: (date1: string, date2: string): number => {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
  },

  /**
   * Check if a date is overdue (past the current date)
   */
  isOverdue: (dueDate: string, currentDate?: string): boolean => {
    const due = new Date(dueDate)
    const current = currentDate ? new Date(currentDate) : new Date()
    return due < current
  },

  /**
   * Check if a date is due soon (within specified hours)
   */
  isDueSoon: (dueDate: string, hoursThreshold: number = 24): boolean => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffInHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
    return diffInHours <= hoursThreshold && diffInHours > 0
  },

  /**
   * Get the number of days until a due date
   */
  getDaysUntilDue: (dueDate: string): number => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffInDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffInDays
  },

  /**
   * Get the number of hours until a due date
   */
  getHoursUntilDue: (dueDate: string): number => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffInHours = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60))
    return diffInHours
  },

  /**
   * Format duration in minutes to human readable format
   */
  formatDuration: (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (hours < 24) {
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
    }
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  },

  /**
   * Add days to a date
   */
  addDays: (dateString: string, days: number): string => {
    const date = new Date(dateString)
    date.setDate(date.getDate() + days)
    return date.toISOString()
  },

  /**
   * Add hours to a date
   */
  addHours: (dateString: string, hours: number): string => {
    const date = new Date(dateString)
    date.setHours(date.getHours() + hours)
    return date.toISOString()
  },

  /**
   * Get the start of the day for a date
   */
  getStartOfDay: (dateString: string): string => {
    const date = new Date(dateString)
    date.setHours(0, 0, 0, 0)
    return date.toISOString()
  },

  /**
   * Get the end of the day for a date
   */
  getEndOfDay: (dateString: string): string => {
    const date = new Date(dateString)
    date.setHours(23, 59, 59, 999)
    return date.toISOString()
  },

  /**
   * Check if two dates are on the same day
   */
  isSameDay: (date1: string, date2: string): boolean => {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate()
  },

  /**
   * Get the current date in ISO format
   */
  getCurrentDate: (): string => {
    return new Date().toISOString()
  },

  /**
   * Get the current date in a readable format
   */
  getCurrentDateFormatted: (): string => {
    return dateUtils.formatDateTime(new Date().toISOString())
  },

  /**
   * Parse a date string and return a Date object
   */
  parseDate: (dateString: string): Date => {
    return new Date(dateString)
  },

  /**
   * Validate if a date string is valid
   */
  isValidDate: (dateString: string): boolean => {
    const date = new Date(dateString)
    return !isNaN(date.getTime())
  }
}
