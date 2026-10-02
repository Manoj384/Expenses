/**
 * Bot Natural Language Parser for Telegram & WhatsApp
 * Parses financial messages into structured transactions or query actions.
 */

const CATEGORY_KEYWORDS = {
  'Food & Dining': ['food', 'lunch', 'dinner', 'breakfast', 'snacks', 'tea', 'coffee', 'cafe', 'swiggy', 'zomato', 'restaurant', 'burger', 'pizza', 'biryani', 'groceries', 'supermarket', 'vegetables', 'fruits', 'milk', 'bread'],
  'Shopping': ['shopping', 'amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'electronics', 'purchase', 'bought', 'mall'],
  'Transportation': ['fuel', 'petrol', 'diesel', 'cab', 'uber', 'ola', 'auto', 'metro', 'bus', 'train', 'flight', 'parking', 'toll'],
  'Bills & Utilities': ['bill', 'electricity', 'water', 'gas', 'recharge', 'wifi', 'internet', 'mobile', 'broadband', 'dth', 'rent', 'maintenance'],
  'Entertainment': ['movie', 'netflix', 'spotify', 'prime', 'game', 'cinema', 'concert', 'outing', 'party', 'hotstar'],
  'Healthcare': ['doctor', 'medicine', 'hospital', 'pharmacy', 'medical', 'clinic', 'dentist', 'health', 'tablets'],
  'Investments': ['sip', 'mutual fund', 'stocks', 'shares', 'gold', 'crypto', 'fd', 'rd', 'ppf', 'nps', 'invested'],
  'Salary / Income': ['salary', 'bonus', 'freelance', 'dividend', 'cashback', 'interest', 'received', 'credited', 'refund'],
}

const PAYMENT_KEYWORDS = {
  'UPI / GPay / PhonePe': ['upi', 'gpay', 'google pay', 'phonepe', 'paytm', 'bhim', 'cred', 'scan', 'qr'],
  'Credit Card': ['credit card', 'cc', 'hdfc card', 'icici card', 'sbi card', 'amex'],
  'Debit Card': ['debit card', 'dc', 'atm card'],
  'Net Banking': ['net banking', 'netbanking', 'imps', 'neft', 'rtgs', 'transfer'],
  'Cash': ['cash', 'notes', 'hand cash'],
}

/**
 * Parse arbitrary text into transaction payload or query intent
 */
export function parseBotMessage(text = '') {
  const trimmed = text.trim()
  if (!trimmed) return null

  const lower = trimmed.toLowerCase()

  // 1. Check for command intents
  if (lower.startsWith('/portfolio') || lower === 'portfolio' || lower === '/nav' || lower === 'nav' || lower.includes('portfolio summary') || lower.includes('my investments')) {
    return {
      intent: 'QUERY_PORTFOLIO',
      originalText: trimmed,
    }
  }

  if (lower.startsWith('/summary') || lower === 'summary' || lower === '/today' || lower === 'today' || lower.includes('today expense') || lower.includes('monthly summary')) {
    return {
      intent: 'QUERY_SUMMARY',
      originalText: trimmed,
    }
  }

  if (lower.startsWith('/balance') || lower === 'balance' || lower === '/networth' || lower === 'networth' || lower.includes('net worth')) {
    return {
      intent: 'QUERY_NETWORTH',
      originalText: trimmed,
    }
  }

  if (lower.startsWith('/help') || lower === 'help') {
    return {
      intent: 'HELP',
      originalText: trimmed,
    }
  }

  // 2. Parse Expense / Income / Transaction Intent
  // Regex to extract amount (₹, Rs, INR or standalone numbers)
  const amountMatch = trimmed.match(/(?:(?:rs\.?|inr|₹)\s*(\d+(?:,\d+)*(?:\.\d+)?))|(?:\b(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rs\.?|inr|₹|\/-)?\b)/i)
  let rawAmountStr = null

  if (amountMatch) {
    rawAmountStr = amountMatch[1] || amountMatch[2]
  }

  // Fallback: search for first isolated positive number > 0
  if (!rawAmountStr) {
    const numMatches = trimmed.match(/\b\d+(\.\d+)?\b/g)
    if (numMatches && numMatches.length > 0) {
      rawAmountStr = numMatches[0]
    }
  }

  const amount = rawAmountStr ? parseFloat(rawAmountStr.replace(/,/g, '')) : 0
  if (!amount || isNaN(amount) || amount <= 0) {
    return {
      intent: 'UNKNOWN',
      originalText: trimmed,
      message: 'Could not detect a valid amount. Please specify an amount, e.g. "Paid 250 for lunch via UPI".',
    }
  }

  // Detect Transaction Type (income vs expense)
  const isIncome = /\b(received|got|credited|salary|bonus|refund|freelance|dividend|cashback|earned)\b/i.test(trimmed)
  const type = isIncome ? 'income' : 'expense'

  // Detect Category
  let category = isIncome ? 'Salary / Income' : 'Other Expenses'
  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      category = catName
      break
    }
  }

  // Detect Payment Method
  let paymentMethod = 'UPI / GPay / PhonePe'
  for (const [pmName, keywords] of Object.entries(PAYMENT_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      paymentMethod = pmName
      break
    }
  }

  // Clean description / note
  let note = trimmed
    .replace(/(?:rs\.?|inr|₹)\s*\d+(\.\d+)?/gi, '')
    .replace(/\b\d+(\.\d+)?\s*(?:rs\.?|inr|₹|\/-)?\b/gi, '')
    .replace(/\b(paid|spent|bought|received|got|via|for|on|using|through)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!note || note.length < 2) {
    note = category
  }

  return {
    intent: 'LOG_TRANSACTION',
    originalText: trimmed,
    type,
    amount,
    category,
    paymentMethod,
    note: note.charAt(0).toUpperCase() + note.slice(1),
    date: new Date().toISOString().split('T')[0],
  }
}

/**
 * Generate formatted response based on intent and optional financial context
 */
export function generateBotResponse(text = '', context = {}) {
  const parsed = parseBotMessage(text)
  if (!parsed) return 'Please type a valid message or command.'

  if (parsed.intent === 'HELP') {
    return '👋 Available commands:\n• /portfolio - Live mutual fund portfolio\n• /summary - Monthly spending summary\n• /networth - Complete net worth breakdown\n• Or log an expense: "Paid 250 for lunch via UPI"'
  }

  if (parsed.intent === 'QUERY_PORTFOLIO') {
    const invested = context.totalInvested ? `₹${Number(context.totalInvested).toLocaleString('en-IN')}` : '₹0'
    const curr = context.currentPortfolio ? `₹${Number(context.currentPortfolio).toLocaleString('en-IN')}` : '₹0'
    const profit = context.totalProfit ? `₹${Number(context.totalProfit).toLocaleString('en-IN')}` : '₹0'
    return `📈 Portfolio Snapshot:\nInvested: ${invested}\nCurrent: ${curr}\nGain: ${profit}`
  }

  if (parsed.intent === 'QUERY_NETWORTH') {
    const nw = context.netWorth ? `₹${Number(context.netWorth).toLocaleString('en-IN')}` : '₹0'
    return `💰 Total Net Worth: ${nw}`
  }

  if (parsed.intent === 'QUERY_SUMMARY') {
    return `📊 Monthly Spending Summary:\nTotal Spent: ₹0\nTop Category: Food & Dining`
  }

  if (parsed.intent === 'LOG_TRANSACTION') {
    return `✅ Logged ${parsed.type.toUpperCase()}: ₹${parsed.amount} for ${parsed.category} via ${parsed.paymentMethod}`
  }

  return parsed.message || 'Unknown request. Type /help for assistance.'
}

