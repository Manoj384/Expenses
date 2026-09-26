// Auto-categorization merchant keyword mapping
const CATEGORY_MAP = [
  { match: ['swiggy', 'zomato', 'mcdonald', 'kfc', 'domino', 'starbucks', 'cafe', 'restaurant', 'food', 'hotel', 'eats', 'blinkit', 'zepto', 'instamart'], category: 'Food & Dining' },
  { match: ['amazon', 'flipkart', 'myntra', 'ajio', 'zara', 'h&m', 'nykaa', 'tata cliq', 'shopping', 'mall', 'retail'], category: 'Shopping' },
  { match: ['petrol', 'fuel', 'shell', 'hpcl', 'bpcl', 'ioc', 'indian oil', 'cng', 'diesel'], category: 'Fuel' },
  { match: ['uber', 'ola', 'rapido', 'metro', 'irctc', 'flight', 'indigo', 'makemytrip', 'redbus', 'travel'], category: 'Travel' },
  { match: ['netflix', 'spotify', 'prime', 'hotstar', 'youtube', 'bookmyshow', 'cinema', 'pvr', 'inox', 'entertainment'], category: 'Entertainment' },
  { match: ['bescom', 'electricity', 'water', 'broadband', 'wifi', 'airtel', 'jio', 'vi', 'bill', 'recharge', 'gas', 'cylinder'], category: 'Utilities' },
  { match: ['pharmacy', 'apollo', 'medplus', 'hospital', 'clinic', 'doctor', 'lab', 'cult', 'gym', 'fitness'], category: 'Health' },
  { match: ['salary', 'interest', 'dividend', 'refund', 'cashback', 'credit interest', 'bonus'], category: 'Salary / Income', type: 'income' },
]

export function guessCategory(description = '', amount = 0) {
  const desc = description.toLowerCase()
  for (const rule of CATEGORY_MAP) {
    if (rule.match.some(keyword => desc.includes(keyword))) {
      return { category: rule.category, type: rule.type || 'expense' }
    }
  }
  return { category: 'Other Expenses', type: 'expense' }
}

/**
 * Parse Bank/Card Excel or CSV Buffer
 */
export async function parseBankStatementFile(arrayBuffer) {
  if (!arrayBuffer) return []
  try {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    const transactions = []
    let headerIdx = -1
    let colDate = -1, colDesc = -1, colDebit = -1, colCredit = -1, colAmount = -1, colType = -1

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r || !r.length) continue

      // Look for table header
      const rowText = r.map(c => String(c || '').toLowerCase()).join(' ')
      if (
        (rowText.includes('date') || rowText.includes('txn')) &&
        (rowText.includes('description') || rowText.includes('narration') || rowText.includes('particular') || rowText.includes('details') || rowText.includes('remarks'))
      ) {
        headerIdx = i
        r.forEach((col, idx) => {
          const c = String(col || '').toLowerCase()
          if (c.includes('date') || c.includes('txn date')) colDate = idx
          if (c.includes('desc') || c.includes('narration') || c.includes('particular') || c.includes('remark') || c.includes('detail')) colDesc = idx
          if (c.includes('debit') || c.includes('withdrawal') || c.includes('dr')) colDebit = idx
          if (c.includes('credit') || c.includes('deposit') || c.includes('cr')) colCredit = idx
          if (c.includes('amount') || c.includes('txn amount')) colAmount = idx
          if (c.includes('type') || c.includes('dr/cr')) colType = idx
        })
        continue
      }

      if (headerIdx >= 0 && i > headerIdx) {
        const descRaw = colDesc >= 0 ? String(r[colDesc] || '').trim() : ''
        if (!descRaw || descRaw.toLowerCase().includes('opening balance') || descRaw.toLowerCase().includes('closing balance')) continue

        const cleanNum = (val) => {
          if (!val) return 0
          const s = String(val).replace(/[₹,\s]/g, '')
          const n = parseFloat(s)
          return isNaN(n) ? 0 : n
        }

        const debit = colDebit >= 0 ? cleanNum(r[colDebit]) : 0
        const credit = colCredit >= 0 ? cleanNum(r[colCredit]) : 0
        let amt = debit > 0 ? debit : credit
        let isIncome = credit > 0

        if (amt === 0 && colAmount >= 0) {
          amt = cleanNum(r[colAmount])
          if (colType >= 0) {
            const t = String(r[colType] || '').toLowerCase()
            isIncome = t.includes('cr') || t.includes('credit') || t.includes('income')
          }
        }

        if (amt > 0) {
          const dateVal = colDate >= 0 ? r[colDate] : null
          let parsedDate = new Date().toISOString().slice(0, 10)

          if (typeof dateVal === 'number') {
            // Excel serial date
            const jsDate = new Date((dateVal - (25567 + 2)) * 86400 * 1000)
            if (!isNaN(jsDate.getTime())) parsedDate = jsDate.toISOString().slice(0, 10)
          } else if (typeof dateVal === 'string') {
            const parts = dateVal.trim().split(/[-/.]/)
            if (parts.length === 3) {
              if (parts[0].length === 4) parsedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
              else parsedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
            }
          }

          const { category, type: guessedType } = guessCategory(descRaw, amt)

          transactions.push({
            date: parsedDate,
            description: descRaw,
            amount: amt,
            type: isIncome ? 'income' : guessedType || 'expense',
            suggested_category: category,
          })
        }
      }
    }

    return transactions
  } catch (err) {
    console.error('Failed to parse statement file:', err)
    return []
  }
}

/**
 * Parse Indian Bank / UPI SMS pastes (e.g. HDFC, ICICI, SBI, GPay, Paytm)
 */
export function parseBankSmsText(smsText) {
  if (!smsText || !smsText.trim()) return []

  const lines = smsText.trim().split(/\r?\n/)
  const transactions = []

  for (const line of lines) {
    if (!line.trim() || line.length < 10) continue

    // Match amount patterns like "Rs. 450.00", "INR 1,200", "debited by 500"
    const amtMatch = line.match(/(?:rs\.?|inr|by|for)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i)
    if (!amtMatch) continue

    const amt = parseFloat(amtMatch[1].replace(/,/g, ''))
    if (isNaN(amt) || amt <= 0) continue

    const isCredit = /credited|received|deposit|refund/i.test(line)
    const isDebit = /debited|spent|paid|transferred|sent/i.test(line)

    // Extract Merchant / Beneficiary
    let merchant = 'Bank Transaction'
    const toMatch = line.match(/(?:to|at|vpa|info|towards)\s+([A-Za-z0-9\s._&'-]{2,25})/i)
    if (toMatch) merchant = toMatch[1].trim()

    // Extract Date if present
    let dateStr = new Date().toISOString().slice(0, 10)
    const dateMatch = line.match(/(\d{1,2})[-/](\d{1,2}|[A-Za-z]{3})[-/](\d{2,4})/)
    if (dateMatch) {
      // rough date parse
      dateStr = new Date().toISOString().slice(0, 10)
    }

    const { category, type: guessedType } = guessCategory(`${merchant} ${line}`, amt)

    transactions.push({
      date: dateStr,
      description: merchant,
      raw_text: line,
      amount: amt,
      type: isCredit ? 'income' : 'expense',
      suggested_category: category,
    })
  }

  return transactions
}
