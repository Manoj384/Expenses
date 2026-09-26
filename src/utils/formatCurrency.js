/**
 * Format a number as Indian Rupees (₹)
 * Uses Indian number system: 1,23,456
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format a number as a short Indian currency (e.g. ₹1.2L, ₹5K)
 */
export function formatCurrencyShort(amount) {
  if (!amount) return '₹0'
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`
  }
  return formatCurrency(amount)
}
