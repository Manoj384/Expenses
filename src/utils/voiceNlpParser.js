import { suggestCategory } from './smsParser'

/**
 * Natural Language Voice & Chatbot Expense Parser
 * Converts plain English voice dictations into structured transactions.
 */
export function parseVoiceExpense(rawText) {
  if (!rawText || typeof rawText !== 'string') return null

  const text = rawText.trim()
  if (text.length < 3) return null

  // 1. Amount Extraction (Matches: "800", "Rs 800", "₹800", "800 rupees", "800 bucks", "800.50")
  let amount = 0
  const amountMatch = text.match(/(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rupees?|rs|bucks|inr)?/i)
  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ''))
  }

  // 2. Transaction Type Extraction
  const isIncome = /got|received|credited|earned|salary|cashback|refund|bonus|dividend/i.test(text)
  const type = isIncome ? 'income' : 'expense'

  // 3. Payment Method Extraction
  let paymentMethod = 'UPI'
  if (/gpay|google pay/i.test(text)) paymentMethod = 'Google Pay (UPI)'
  else if (/phonepe/i.test(text)) paymentMethod = 'PhonePe (UPI)'
  else if (/paytm/i.test(text)) paymentMethod = 'Paytm'
  else if (/credit card|card/i.test(text)) paymentMethod = 'Credit Card'
  else if (/debit card/i.test(text)) paymentMethod = 'Debit Card'
  else if (/cash/i.test(text)) paymentMethod = 'Cash'
  else if (/net banking|bank transfer/i.test(text)) paymentMethod = 'Net Banking'
  else if (/cred/i.test(text)) paymentMethod = 'CRED'

  // 4. Date Extraction (today vs yesterday)
  const dateObj = new Date()
  if (/yesterday/i.test(text)) {
    dateObj.setDate(dateObj.getDate() - 1)
  }
  const date = dateObj.toISOString().split('T')[0]

  // 5. Merchant & Purpose Cleaning
  // Remove amount, filler words to extract clean description
  let desc = text
    .replace(/(?:rs\.?|inr|₹)?\s*[0-9,]+(?:\.[0-9]{1,2})?\s*(?:rupees?|rs|bucks|inr)?/gi, '')
    .replace(/\b(paid|spent|bought|got|received|for|on|via|using|at|from|with|today|yesterday|rupees?|bucks)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!desc || desc.length < 2) {
    desc = isIncome ? 'Salary / Income' : 'Direct Expense'
  } else {
    // Capitalize first letter
    desc = desc.charAt(0).toUpperCase() + desc.slice(1)
  }

  // 6. Category Auto-suggestion
  const { category } = suggestCategory(text + ' ' + desc)

  return {
    amount: amount || 0,
    type,
    description: desc,
    category,
    paymentMethod,
    date,
    rawText: text,
  }
}
