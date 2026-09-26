/**
 * Calculate the next due date based on frequency
 * Handles month-end edge cases using native JS Date arithmetic
 */
export function calculateNextDueDate(currentDueDate, frequency) {
  const date = new Date(currentDueDate + 'T00:00:00')

  switch (frequency) {
    case 'weekly': {
      date.setDate(date.getDate() + 7)
      break
    }
    case 'monthly': {
      const originalDay = date.getDate()
      date.setMonth(date.getMonth() + 1)
      // Handle month-end: if month overflowed, clamp to last day
      if (date.getDate() !== originalDay) {
        date.setDate(0) // last day of previous month
      }
      break
    }
    case 'quarterly': {
      const originalDay = date.getDate()
      date.setMonth(date.getMonth() + 3)
      if (date.getDate() !== originalDay) {
        date.setDate(0)
      }
      break
    }
    case 'yearly': {
      const originalDay = date.getDate()
      date.setFullYear(date.getFullYear() + 1)
      if (date.getDate() !== originalDay) {
        date.setDate(0)
      }
      break
    }
    default: {
      date.setMonth(date.getMonth() + 1)
    }
  }

  return date.toISOString().split('T')[0]
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
