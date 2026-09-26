import { parseLocalDate, toLocalDateString } from './dateUtils.js'

/**
 * Calculate the next due date based on frequency
 * Handles month-end edge cases using timezone-safe local date arithmetic
 */
export function calculateNextDueDate(currentDueDate, frequency) {
  const [y, m, d] = currentDueDate.split('-').map(Number)
  const originalDay = d

  let nextYear = y
  let nextMonth = m // 1-indexed
  let nextDay = d

  switch (frequency) {
    case 'weekly': {
      const date = new Date(y, m - 1, d + 7)
      return toLocalDateString(date)
    }
    case 'monthly': {
      nextMonth = m + 1
      if (nextMonth > 12) {
        nextMonth = 1
        nextYear = y + 1
      }
      break
    }
    case 'quarterly': {
      nextMonth = m + 3
      if (nextMonth > 12) {
        nextMonth = nextMonth - 12
        nextYear = y + 1
      }
      break
    }
    case 'yearly': {
      nextYear = y + 1
      break
    }
    default: {
      nextMonth = m + 1
      if (nextMonth > 12) {
        nextMonth = 1
        nextYear = y + 1
      }
    }
  }

  // Month-end clamping (e.g. Jan 31 -> Feb 28 in non-leap year)
  const daysInNextMonth = new Date(nextYear, nextMonth, 0).getDate()
  nextDay = Math.min(originalDay, daysInNextMonth)

  const monthStr = String(nextMonth).padStart(2, '0')
  const dayStr = String(nextDay).padStart(2, '0')
  return `${nextYear}-${monthStr}-${dayStr}`
}

/**
 * Get human-readable frequency label
 */
export function frequencyLabel(frequency) {
  const labels = {
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  }
  return labels[frequency] || frequency
}
