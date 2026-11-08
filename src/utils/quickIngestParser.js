/**
 * Quick Ingest NLP Parser for Bank SMS, WhatsApp messages, and Webhooks
 * Transforms raw incoming text into structured financial transactions.
 */

const CATEGORY_KEYWORDS = {
  'Food & Dining': ['swiggy', 'zomato', 'restaurant', 'cafe', 'starbucks', 'biryani', 'pizza', 'mcdonald', 'kfc', 'lunch', 'dinner', 'breakfast', 'tea', 'coffee', 'food', 'blinkit', 'zepto', 'instamart'],
  'Fuel & Commute': ['uber', 'ola', 'rapido', 'fuel', 'petrol', 'diesel', 'shell', 'hpcl', 'iocl', 'bpcl', 'metro', 'fastag', 'parking'],
  'Shopping': ['amazon', 'flipkart', 'myntra', 'ajio', 'zara', 'h&m', 'meesho', 'croma', 'reliance', 'mall', 'mart'],
  'Entertainment': ['netflix', 'spotify', 'hotstar', 'prime', 'youtube', 'pvr', 'inox', 'movie', 'concert'],
  'Utilities': ['airtel', 'jio', 'broadband', 'wifi', 'electricity', 'bescom', 'water', 'gas', 'recharge', 'bill'],
  'Investment': ['groww', 'zerodha', 'kuvera', 'sip', 'mutual fund', 'stocks', 'coin'],
}

/**
 * Parses conversational text or forwarded SMS into structured transaction data
 */
export function parseIncomingTransactionMessage(rawText) {
  if (!rawText || typeof rawText !== 'string') return null
  const text = rawText.trim()
  const lower = text.toLowerCase()

  // 1. Detect Amount
  let amount = null
  const amtMatch = text.match(/(?:(?:rs\.?|inr|₹|paid|spent|debited|received)\s*[:=]?\s*([0-9,]+(?:\.[0-9]{1,2})?))|([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rs|inr|₹)/i)
  if (amtMatch) {
    const rawVal = amtMatch[1] || amtMatch[2]
    amount = parseFloat(rawVal.replace(/,/g, ''))
  } else {
    // Check standalone numbers
    const numMatch = text.match(/\b([0-9]+(?:\.[0-9]{1,2})?)\b/)
    if (numMatch) {
      amount = parseFloat(numMatch[1])
    }
  }

  if (!amount || isNaN(amount) || amount <= 0) return null

  // 2. Detect Transaction Type
  let type = 'expense'
  if (lower.includes('credit') || lower.includes('received') || lower.includes('salary') || lower.includes('refund') || lower.includes('inward')) {
    type = 'income'
  } else if (lower.includes('invest') || lower.includes('sip') || lower.includes('saved')) {
    type = 'savings'
  }

  // 3. Detect Category & Merchant
  let matchedCategory = 'General Expense'
  let detectedMerchant = ''

  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const found = keywords.find(k => lower.includes(k))
    if (found) {
      matchedCategory = catName
      detectedMerchant = found.charAt(0).toUpperCase() + found.slice(1)
      break
    }
  }

  // 4. Detect Payment Method
  let paymentMethod = 'UPI'
  if (lower.includes('cash')) paymentMethod = 'Cash'
  else if (lower.includes('card') || lower.includes('credit card') || lower.includes('debit card')) paymentMethod = 'Credit Card'
  else if (lower.includes('netbanking') || lower.includes('neft') || lower.includes('rtgs') || lower.includes('imps') || lower.includes('bank transfer')) paymentMethod = 'Bank Account'

  // 5. Clean Note
  let cleanNote = detectedMerchant || text
  if (detectedMerchant) {
    cleanNote = `${detectedMerchant} (${paymentMethod})`
  }

  return {
    raw: text,
    amount,
    type,
    categoryName: matchedCategory,
    paymentMethodName: paymentMethod,
    note: cleanNote,
    date: new Date().toISOString().slice(0, 10),
    confidence: detectedMerchant ? 'HIGH' : 'MEDIUM',
  }
}
