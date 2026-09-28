/**
 * Indian Bank SMS & UPI Transaction Parser
 * Supports HDFC, ICICI, SBI, Axis, Kotak, Google Pay, PhonePe, Paytm, CRED SMS alerts.
 */

// Category Auto-suggestion dictionary based on merchant keyword matching
export const MERCHANT_CATEGORY_RULES = [
  { keywords: ['swiggy', 'zomato', 'mcdonald', 'kfc', 'starbucks', 'dominos', 'burger king', 'dine', 'restaurant', 'cafe', 'eats'], category: 'Food & Dining' },
  { keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'zara', 'h&m', 'lifestyle', 'shopping'], category: 'Shopping' },
  { keywords: ['blinkit', 'zepto', 'instamart', 'bigbasket', 'dmart', 'nature basket', 'supermarket', 'grocery', 'spencer'], category: 'Groceries' },
  { keywords: ['uber', 'ola', 'rapido', 'petrol', 'fuel', 'hpcl', 'iocl', 'bpcl', 'shell', 'metro', 'irctc', 'makemytrip', 'indigo', 'flight'], category: 'Fuel / Travel' },
  { keywords: ['netflix', 'spotify', 'hotstar', 'prime video', 'youtube', 'bookmyshow', 'pvr', 'inox', 'entertainment', 'cinema'], category: 'Entertainment' },
  { keywords: ['bescom', 'cesc', 'electricity', 'water', 'airtel', 'jio', 'vi', 'broadband', 'act fibernet', 'gas', 'piped gas', 'bill'], category: 'Utilities' },
  { keywords: ['apollo', 'pharmeasy', '1mg', 'hospital', 'clinic', 'medical', 'pharmacy', 'doctor', 'netmeds'], category: 'Health & Medical' },
  { keywords: ['salary', 'payroll', 'wages', 'credited by employer', 'stipend', 'bonus', 'dividend', 'interest credited'], category: 'Income / Salary', type: 'income' },
]

export function suggestCategory(merchantOrDesc = '') {
  const lower = merchantOrDesc.toLowerCase()
  for (const rule of MERCHANT_CATEGORY_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return { category: rule.category, type: rule.type || 'expense' }
    }
  }
  return { category: 'Other Expense', type: 'expense' }
}

export function parseBankSms(smsText) {
  if (!smsText || typeof smsText !== 'string') return []

  const lines = smsText.split(/\n\n+|\r\n\r\n+|(?<=\.)\s+(?=[A-Z0-9])/).map(l => l.trim()).filter(Boolean)
  const parsedRecords = []

  for (const rawLine of lines) {
    const text = rawLine.replace(/[\n\r]+/g, ' ').trim()
    if (text.length < 15) continue

    // 1. Amount Extraction (Matches: Rs. 450, INR 1,299.50, Rs 500, Rs.450.00)
    const amountMatch = text.match(/(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i)
    if (!amountMatch) continue

    const amountStr = amountMatch[1].replace(/,/g, '')
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) continue

    // 2. Transaction Type Extraction (debited/sent/spent vs credited/received/deposited)
    const isCredit = /credited|received|refunded|deposited|cashback/i.test(text)
    const isDebit = /debited|sent|spent|paid|transferred|withdrawn/i.test(text)
    const type = isCredit ? 'income' : 'expense'

    // 3. Bank / Payment Source Extraction
    let source = 'Bank / UPI'
    if (/hdfc/i.test(text)) source = 'HDFC Bank'
    else if (/icici/i.test(text)) source = 'ICICI Bank'
    else if (/sbi/i.test(text)) source = 'State Bank of India'
    else if (/axis/i.test(text)) source = 'Axis Bank'
    else if (/kotak/i.test(text)) source = 'Kotak Bank'
    else if (/paytm/i.test(text)) source = 'Paytm UPI'
    else if (/gpay|google pay/i.test(text)) source = 'Google Pay'
    else if (/phonepe/i.test(text)) source = 'PhonePe'
    else if (/cred/i.test(text)) source = 'CRED'

    // 4. Merchant / Beneficiary Extraction
    let merchant = ''
    const toMatch = text.match(/(?:to|at|vpa|info:?|trf to)\s+([A-Za-z0-9\s._&-]{2,30}?)(?:\s+(?:on|ref|via|upi|avl|bal|using|date)|$|\.)/i)
    if (toMatch && toMatch[1]) {
      merchant = toMatch[1].trim().replace(/^VPA\s+/i, '')
    } else {
      merchant = isCredit ? 'Bank Deposit / Salary' : 'Merchant / UPI Transfer'
    }

    // 5. Date Extraction
    let date = new Date().toISOString().split('T')[0]
    const dateMatch = text.match(/([0-9]{1,2})[-/]([A-Za-z]{3}|[0-9]{1,2})[-/]([0-9]{2,4})/i)
    if (dateMatch) {
      try {
        const day = dateMatch[1].padStart(2, '0')
        const monthPart = dateMatch[2]
        let month = '01'
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        const monthIdx = months.indexOf(monthPart.toLowerCase().slice(0, 3))
        if (monthIdx !== -1) {
          month = String(monthIdx + 1).padStart(2, '0')
        } else if (!isNaN(parseInt(monthPart))) {
          month = monthPart.padStart(2, '0')
        }
        let year = dateMatch[3]
        if (year.length === 2) year = '20' + year
        date = `${year}-${month}-${day}`
      } catch {}
    }

    const { category, type: suggestedType } = suggestCategory(merchant + ' ' + text)

    parsedRecords.push({
      id: 'sms_' + Math.random().toString(36).substring(2, 9),
      amount,
      type: isCredit ? 'income' : (suggestedType || type),
      merchant,
      category,
      source,
      date,
      originalSms: text,
      selected: true,
    })
  }

  return parsedRecords
}
