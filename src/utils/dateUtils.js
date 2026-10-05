/**
 * Format a Date object to YYYY-MM-DD using local calendar date (time-zone safe)
 */
export function toLocalDateString(d) {
  if (!d) return ''
  const date = typeof d === 'string' ? parseLocalDate(d) : new Date(d)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse a YYYY-MM-DD string into a local Date object safely
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return new Date()
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Format a date string (YYYY-MM-DD) to a readable format
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = parseLocalDate(dateStr)
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
  return toLocalDateString(date)
}

/**
 * Get the first day of the given month as YYYY-MM-DD
 */
export function startOfMonth(date = new Date()) {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Get the last day of the given month as YYYY-MM-DD
 */
export function endOfMonth(date = new Date()) {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return toLocalDateString(lastDay)
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function today() {
  return toLocalDateString(new Date())
}

/**
 * Get month label e.g. "Sep 2026"
 */
export function monthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
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
  return parseLocalDate(dateStr) < parseLocalDate(today())
}

/**
 * Days until a date
 */
export function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = parseLocalDate(dateStr) - parseLocalDate(today())
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Get current time in HH:mm format (24-hour)
 */
export function currentTime() {
  const d = new Date()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Format a time string (HH:mm, HH:mm:ss, or ISO timestamp) to readable 12-hour format (e.g. 02:30 PM)
 */
export function formatTime(timeOrIso) {
  if (!timeOrIso) return ''
  try {
    if (typeof timeOrIso === 'string') {
      const match = timeOrIso.match(/^(\d{1,2}):(\d{2})/)
      if (match) {
        let h = parseInt(match[1], 10)
        const m = match[2]
        const period = h >= 12 ? 'PM' : 'AM'
        h = h % 12 || 12
        return `${String(h).padStart(2, '0')}:${m} ${period}`
      }
    }
    const d = new Date(timeOrIso)
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    }
  } catch {}
  return String(timeOrIso)
}

/**
 * Format a date and time combination
 */
export function formatDateTime(dateStr, timeStr) {
  const dFormatted = formatDate(dateStr)
  const tFormatted = formatTime(timeStr)
  if (dFormatted && tFormatted) return `${dFormatted}, ${tFormatted}`
  return dFormatted || tFormatted || ''
}
