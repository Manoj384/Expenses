/**
 * AI Habit Extractor & Behavioral Pattern Memory Engine
 * 
 * Analyzes historical transactions, debt clearances, and SIP behaviors
 * to build an evolving "Manoj Financial Persona".
 * 
 * Injected dynamically into Gemini LLM System Instructions so AI
 * acts as a truly personalized wealth copilot that understands your exact habits.
 */

const STORAGE_KEY = 'ft_ai_user_habit_profile'

/**
 * Clean and normalize a merchant/narration string
 */
function normalizeMerchant(note = '') {
  if (!note) return ''
  const clean = note
    .toLowerCase()
    .replace(/^paid\s+(to\s+)?/i, '')
    .replace(/^spent\s+(on\s+)?/i, '')
    .replace(/^money\s+(sent\s+to\s+)?/i, '')
    .replace(/\b(pvt\s+ltd|limited|ltd|india|store|pos|upi|in)\b/gi, '')
    .trim()

  // Match common Indian merchants
  if (/swiggy/i.test(clean)) return 'Swiggy'
  if (/zomato/i.test(clean)) return 'Zomato'
  if (/blinkit/i.test(clean)) return 'Blinkit'
  if (/zepto/i.test(clean)) return 'Zepto'
  if (/instamart/i.test(clean)) return 'Instamart'
  if (/amazon/i.test(clean)) return 'Amazon'
  if (/flipkart/i.test(clean)) return 'Flipkart'
  if (/myntra/i.test(clean)) return 'Myntra'
  if (/uber/i.test(clean)) return 'Uber'
  if (/ola/i.test(clean)) return 'Ola'
  if (/rapido/i.test(clean)) return 'Rapido'
  if (/petrol|hpcl|bpcl|ioc|shell/i.test(clean)) return 'Fuel Station'
  if (/netflix/i.test(clean)) return 'Netflix'
  if (/spotify/i.test(clean)) return 'Spotify'
  if (/sip|mutual\s*fund|groww/i.test(clean)) return 'Mutual Fund Investment'
  if (/rent/i.test(clean)) return 'House Rent'
  if (/electricity|bescom/i.test(clean)) return 'Electricity Bill'
  if (/wifi|broadband|airtel|jio/i.test(clean)) return 'Telecom / Broadband'

  // Capitalize first letter of short phrase
  const words = clean.split(/\s+/).slice(0, 3).join(' ')
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : ''
}

/**
 * Extracts behavioral patterns and dynamic rules from user transactions
 */
export function extractUserHabitProfile(transactions = [], debts = [], sips = []) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return getStoredHabitProfile() || getDefaultHabitProfile()
  }

  const merchantStats = {}
  const paymentStats = {}
  const categoryStats = {}
  const typeStats = { expense: 0, income: 0, savings: 0, debit: 0 }
  const timeBuckets = { morning: 0, afternoon: 0, evening: 0, night: 0 }

  let totalSpent = 0

  transactions.forEach((tx) => {
    const amt = Number(tx.amount) || 0
    const txType = tx.type || 'expense'
    typeStats[txType] = (typeStats[txType] || 0) + 1

    if (txType === 'expense' || txType === 'debit') {
      totalSpent += amt
    }

    // Payment methods
    const pmName = tx.payment_methods?.name || tx.payment_method || 'Unknown'
    if (pmName && pmName !== 'Unknown') {
      paymentStats[pmName] = (paymentStats[pmName] || 0) + 1
    }

    // Categories
    const catName = tx.categories?.name || tx.category || 'General'
    if (catName && catName !== 'General') {
      categoryStats[catName] = (categoryStats[catName] || 0) + amt
    }

    // Merchants
    const merchant = normalizeMerchant(tx.note)
    if (merchant && merchant.length >= 3) {
      if (!merchantStats[merchant]) {
        merchantStats[merchant] = {
          count: 0,
          totalAmount: 0,
          categories: {},
          paymentMethods: {},
          preferredType: txType,
        }
      }
      merchantStats[merchant].count += 1
      merchantStats[merchant].totalAmount += amt
      if (catName) {
        merchantStats[merchant].categories[catName] = (merchantStats[merchant].categories[catName] || 0) + 1
      }
      if (pmName && pmName !== 'Unknown') {
        merchantStats[merchant].paymentMethods[pmName] = (merchantStats[merchant].paymentMethods[pmName] || 0) + 1
      }
    }

    // Time of day pattern
    const timeStr = tx.time || (tx.created_at ? new Date(tx.created_at).toTimeString() : '')
    if (timeStr) {
      const hour = parseInt(timeStr.slice(0, 2), 10)
      if (!isNaN(hour)) {
        if (hour >= 6 && hour < 12) timeBuckets.morning += 1
        else if (hour >= 12 && hour < 17) timeBuckets.afternoon += 1
        else if (hour >= 17 && hour < 22) timeBuckets.evening += 1
        else timeBuckets.night += 1
      }
    }
  })

  // Top Merchants with preferred category & payment method
  const topMerchants = Object.entries(merchantStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([name, data]) => {
      const topCat = Object.entries(data.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Expense'
      const topPm = Object.entries(data.paymentMethods).sort((a, b) => b[1] - a[1])[0]?.[0] || 'UPI'
      return {
        merchant: name,
        frequency: data.count,
        avgAmount: Math.round(data.totalAmount / data.count),
        preferredCategory: topCat,
        preferredPaymentMethod: topPm,
      }
    })

  // Preferred Payment Channels (sorted by popularity)
  const topPaymentChannels = Object.entries(paymentStats)
    .sort((a, b) => b[1] - a[1])
    .map(([method, count]) => ({
      method,
      usagePercent: Math.round((count / transactions.length) * 100),
    }))

  // Preferred Top Spend Categories
  const topCategories = Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, total]) => ({
      category: cat,
      share: totalSpent > 0 ? Math.round((total / totalSpent) * 100) : 0,
    }))

  // Peak spending time period
  const peakTimePeriod = Object.entries(timeBuckets).sort((a, b) => b[1] - a[1])[0]?.[0] || 'evening'

  // Debts and repayment notes analysis
  const debtClearancePatterns = []
  try {
    debts.forEach((d) => {
      const key = `ft_debt_repayments_${d.id}`
      const history = JSON.parse(localStorage.getItem(key) || '[]')
      history.forEach((rep) => {
        if (rep.notes) {
          debtClearancePatterns.push(rep.notes)
        }
      })
    })
  } catch {}

  const profile = {
    updatedAt: new Date().toISOString(),
    transactionCount: transactions.length,
    topMerchants,
    topPaymentChannels,
    topCategories,
    typeStats,
    peakTimePeriod,
    debtClearanceSample: debtClearancePatterns.slice(0, 3),
    savingsStrategy: {
      classifyInvestmentsAsSavings: true,
      activeSipsCount: sips.length,
      averageMonthlySavingsTxs: typeStats.savings || 0,
    },
  }

  saveHabitProfile(profile)
  return profile
}

/**
 * Get profile from localStorage
 */
export function getStoredHabitProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

/**
 * Save profile to localStorage
 */
export function saveHabitProfile(profile) {
  try {
    if (profile) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    }
  } catch {}
}

/**
 * Default fallback profile
 */
function getDefaultHabitProfile() {
  return {
    updatedAt: new Date().toISOString(),
    transactionCount: 0,
    topMerchants: [
      { merchant: 'Swiggy / Zomato', preferredCategory: 'Food & Dining', preferredPaymentMethod: 'Google Pay (GPay)', avgAmount: 400 },
      { merchant: 'Amazon India', preferredCategory: 'Shopping', preferredPaymentMethod: 'OneCard', avgAmount: 1500 },
      { merchant: 'Fuel (HPCL / Shell)', preferredCategory: 'Fuel', preferredPaymentMethod: 'OneCard', avgAmount: 1800 },
    ],
    topPaymentChannels: [
      { method: 'Google Pay (GPay)', usagePercent: 55 },
      { method: 'OneCard Credit Card', usagePercent: 30 },
      { method: 'Cash', usagePercent: 15 },
    ],
    peakTimePeriod: 'evening',
    savingsStrategy: {
      classifyInvestmentsAsSavings: true,
      activeSipsCount: 4,
    },
  }
}

/**
 * Formats user habit profile into concise, rich text for Gemini LLM system instructions
 */
export function buildHabitContextPrompt() {
  const profile = getStoredHabitProfile() || getDefaultHabitProfile()
  if (!profile) return ''

  const merchantLines = (profile.topMerchants || [])
    .slice(0, 6)
    .map((m) => `• ${m.merchant}: Categorize under "${m.preferredCategory}", typically paid via "${m.preferredPaymentMethod}" (Typical amount: ₹${m.avgAmount || 350})`)
    .join('\n')

  const channelLines = (profile.topPaymentChannels || [])
    .slice(0, 3)
    .map((p) => `${p.method} (${p.usagePercent}%)`)
    .join(', ')

  return `
🧠 MANOJ'S LEARNED HABITS & OPERATIONAL RULES (Auto-learned from daily usage):
1. Preferred Payment Channels: ${channelLines || 'Google Pay (GPay), OneCard'}
2. Peak Activity Rhythm: Most transactions logged during ${profile.peakTimePeriod || 'evening'} hours.
3. Investment & Wealth Rule: Mutual Fund SIPs, Groww investments, and Top-Ups are strictly classified as "savings" (NOT regular expenses) to preserve pure budget accuracy.
4. Debt & Clearance Habit: Friend loans and borrowings are typically settled via UPI with reference notes (e.g. GPay ref / UPI ref).
5. Known Merchant & Category Memory:
${merchantLines}
`
}

/**
 * Suggest smart defaults for a merchant name
 */
export function predictTransactionDefaults(note = '') {
  const profile = getStoredHabitProfile() || getDefaultHabitProfile()
  if (!note || !profile || !profile.topMerchants) return null

  const normalized = normalizeMerchant(note).toLowerCase()
  const match = profile.topMerchants.find((m) =>
    m.merchant.toLowerCase().includes(normalized) || normalized.includes(m.merchant.toLowerCase())
  )

  if (match) {
    return {
      category: match.preferredCategory,
      paymentMethod: match.preferredPaymentMethod,
      suggestedType: /sip|mutual|invest/i.test(match.merchant) ? 'savings' : 'expense',
    }
  }

  return null
}
