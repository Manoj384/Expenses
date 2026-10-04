/**
 * Multi-Currency & Live Exchange Rate Converter
 * Converts international currencies (USD, EUR, GBP, AED, SGD, JPY) to Indian Rupee (INR ₹)
 */

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateToInr: 1.0 },
  { code: 'USD', symbol: '$', name: 'US Dollar', rateToInr: 86.85 },
  { code: 'EUR', symbol: '€', name: 'Euro', rateToInr: 91.40 },
  { code: 'GBP', symbol: '£', name: 'British Pound', rateToInr: 109.20 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rateToInr: 23.65 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', rateToInr: 64.50 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateToInr: 0.58 },
]

export function getExchangeRate(code) {
  const found = SUPPORTED_CURRENCIES.find(c => c.code === code)
  return found ? found.rateToInr : 1.0
}

export function convertToInr(amount, fromCurrency = 'INR') {
  const rate = getExchangeRate(fromCurrency)
  return Number(amount || 0) * rate
}

export function convertFromInr(inrAmount, toCurrency = 'USD') {
  const rate = getExchangeRate(toCurrency)
  if (rate === 0) return 0
  return Number(inrAmount || 0) / rate
}

export function formatInCurrency(amount, currencyCode = 'INR') {
  const curr = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || SUPPORTED_CURRENCIES[0]
  return `${curr.symbol}${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}
