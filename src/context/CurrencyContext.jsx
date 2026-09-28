import { createContext, useContext, useState, useEffect } from 'react'

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', locale: 'en-IN' },
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', locale: 'en-GB' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham (AED)', locale: 'ar-AE' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (SGD)', locale: 'en-SG' },
]

const CurrencyContext = createContext({
  currency: CURRENCIES[0],
  setCurrencyCode: () => {},
})

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => {
    try {
      const saved = localStorage.getItem('ft_selected_currency')
      if (saved) {
        const found = CURRENCIES.find(c => c.code === saved)
        if (found) return found
      }
    } catch {}
    return CURRENCIES[0]
  })

  const setCurrencyCode = (code) => {
    const found = CURRENCIES.find(c => c.code === code) || CURRENCIES[0]
    setCurrency(found)
    try {
      localStorage.setItem('ft_selected_currency', found.code)
    } catch {}
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrencyCode, CURRENCIES }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
