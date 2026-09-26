/**
 * Format a date string (YYYY-MM-DD) to a readable format
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Format date as YYYY-MM-DD for input[type=date]
 */
export function toInputDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

/**
 * Get the first day of the current month as YYYY-MM-DD
 */
export function startOfMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Get the last day of the current month as YYYY-MM-DD
 */
export function endOfMonth(date = new Date()) {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return toInputDate(lastDay)
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function today() {
  return toInputDate(new Date())
}

/**
 * Get month label e.g. "Sep 2026"
 */
export function monthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Get an array of the last N months in {year, month} format
 */
export function lastNMonths(n = 6) {
  const result = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  return result
}

/**
 * Check if a date string is overdue (past today)
 */
export function isOverdue(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date(today())
}

/**
 * Days until a date
 */
export function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date(today())
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
