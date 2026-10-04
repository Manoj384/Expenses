import { suggestCategory } from './smsParser.js'

/**
 * Natural Language Voice & Chatbot Expense Parser
 * Converts plain English voice dictations into structured transactions.
 */
export function parseVoiceExpense(rawText) {
  if (!rawText || typeof rawText !== 'string') return null

  const text = rawText.trim()
  if (text.length < 3) return null
  const lower = text.toLowerCase()

  // 1. Guard against non-expense queries (questions, sports, news, weather, general queries)
  const isExplicitLoggingCommand = /^(add expense|log expense|record expense|add income|log income)\b/i.test(lower)

  if (!isExplicitLoggingCommand) {
    // If it's a question or contains query indicators
    const isQuestionOrGeneralQuery =
      /^(who|what|when|where|why|how|which|whose|whom|is|are|was|were|will|can|could|would|should|tell me|explain|calculate|what's|who's|how's)\b/i.test(lower) ||
      /\?$/.test(lower) ||
      /\b(won|winner|who won|cricket|match|vs|versus|score|wicket|goal|football|ipl|odi|t20|election|weather|whether|climate|temperature|forecast|news|minister|president|capital of|joke|meaning of|define)\b/i.test(lower)

    if (isQuestionOrGeneralQuery) {
      return null
    }
  }

  // 2. Transaction Verb or Currency Requirement Check
  const hasTxnVerb = /\b(paid|spent|spend|bought|buy|purchased|got|received|credited|earned|salary|cashback|refund|bonus|dividend|recharged|transferred|send|sent|gave|bill of|cost|ordered|split|add expense|log expense|record expense)\b/i.test(lower)
  const hasCurrencyMarker = /(?:rs\.?|inr|₹|rupees?|bucks)/i.test(lower)

  if (!hasTxnVerb && !hasCurrencyMarker) {
    return null
  }

  // 3. Amount Extraction
  // Strip date references like "oct 3", "october 3rd", "3rd oct", "in 2026" so they don't get captured as amounts
  const textWithoutDates = text
    .replace(/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\b/gi, '')
    .replace(/\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/gi, '')
    .replace(/\b(?:in|year)\s+20\d{2}\b/gi, '')

  let amount = 0
  // Match currency + amount or amount + currency first
  const explicitCurrencyMatch =
    textWithoutDates.match(/(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
    textWithoutDates.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rupees?|rs|bucks|inr)/i)

  if (explicitCurrencyMatch && explicitCurrencyMatch[1]) {
    amount = parseFloat(explicitCurrencyMatch[1].replace(/,/g, ''))
  } else if (hasTxnVerb) {
    // Fallback: match first standalone number
    const genericNumberMatch = textWithoutDates.match(/\b([0-9,]+(?:\.[0-9]{1,2})?)\b/)
    if (genericNumberMatch && genericNumberMatch[1]) {
      amount = parseFloat(genericNumberMatch[1].replace(/,/g, ''))
    }
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return null
  }

  // 4. Transaction Type Extraction
  const isIncome = /got|received|credited|earned|salary|cashback|refund|bonus|dividend/i.test(text)
  const type = isIncome ? 'income' : 'expense'

  // 5. Payment Method Extraction
  let paymentMethod = 'UPI'
  if (/gpay|google pay/i.test(text)) paymentMethod = 'Google Pay (UPI)'
  else if (/phonepe/i.test(text)) paymentMethod = 'PhonePe (UPI)'
  else if (/paytm/i.test(text)) paymentMethod = 'Paytm'
  else if (/credit card|card/i.test(text)) paymentMethod = 'Credit Card'
  else if (/debit card/i.test(text)) paymentMethod = 'Debit Card'
  else if (/cash/i.test(text)) paymentMethod = 'Cash'
  else if (/net banking|bank transfer/i.test(text)) paymentMethod = 'Net Banking'
  else if (/cred/i.test(text)) paymentMethod = 'CRED'

  // 6. Date Extraction (today vs yesterday)
  const dateObj = new Date()
  if (/yesterday/i.test(text)) {
    dateObj.setDate(dateObj.getDate() - 1)
  }
  const date = dateObj.toISOString().split('T')[0]

  // 7. Merchant & Purpose Cleaning
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

  // 8. Category Auto-suggestion
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
