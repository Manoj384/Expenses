/**
 * Format a number as currency based on active user currency setting
 */
export function formatCurrency(amount, currencyCode = 'INR') {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0'

  let activeCode = currencyCode
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ft_selected_currency')
      if (saved) activeCode = saved
    }
  } catch {}

  const localeMap = {
    INR: 'en-IN',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    AED: 'en-AE',
    SGD: 'en-SG',
  }

  return new Intl.NumberFormat(localeMap[activeCode] || 'en-IN', {
    style: 'currency',
    currency: activeCode,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format a number as a short currency string (e.g. ₹1.2L, ₹5K or $1.2M, $5K)
 */
export function formatCurrencyShort(amount, currencyCode = 'INR') {
  if (!amount) return '₹0'

  let activeCode = currencyCode
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ft_selected_currency')
      if (saved) activeCode = saved
    }
  } catch {}

  const symbolMap = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'د.إ',
    SGD: 'S$',
  }

  const sym = symbolMap[activeCode] || '₹'

  if (activeCode === 'INR') {
    if (amount >= 10000000) return `${sym}${(amount / 10000000).toFixed(1)}Cr`
    if (amount >= 100000) return `${sym}${(amount / 100000).toFixed(1)}L`
    if (amount >= 1000) return `${sym}${(amount / 1000).toFixed(1)}K`
  } else {
    if (amount >= 1000000) return `${sym}${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `${sym}${(amount / 1000).toFixed(1)}K`
  }

  return formatCurrency(amount, activeCode)
}
