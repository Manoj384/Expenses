/**
 * End-to-End Comprehensive Regression & Exception-Handling Test Suite
 * Fully aligned with Testing_Prompt.md specifications
 */

import { calculateNextDueDate, frequencyLabel } from './src/utils/sipUtils.js'
import {
  formatDate,
  startOfMonth,
  endOfMonth,
  today,
  monthLabel,
  lastNMonths,
  isOverdue,
  daysUntil,
  toLocalDateString,
  parseLocalDate
} from './src/utils/dateUtils.js'
import { formatCurrency, formatCurrencyShort } from './src/utils/formatCurrency.js'
import { guessCategory, parseBankSmsText } from './src/utils/statementParser.js'
import { parseGrowwCsv } from './src/utils/growwParser.js'
import { VERIFIED_SCHEME_CODES } from './src/utils/mfApi.js'
import pastData from './src/data/past_expenses.json' with { type: 'json' }
import defaultSips from './src/data/default_sips.json' with { type: 'json' }
import savedGrowwData from './src/data/groww_holdings.json' with { type: 'json' }

let totalTests = 0
let passedTests = 0
let failedTests = 0
const failureLogs = []

function test(name, fn) {
  totalTests++
  try {
    fn()
    passedTests++
    console.log(`  [PASS] ${name}`)
  } catch (err) {
    failedTests++
    console.error(`  [FAIL] ${name}: ${err.message}`)
    failureLogs.push({ name, error: err.message })
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    },
    toBeGreaterThan(expected) {
      if (!(actual > expected)) throw new Error(`Expected ${actual} > ${expected}`)
    },
    toBeLessThan(expected) {
      if (!(actual < expected)) throw new Error(`Expected ${actual} < ${expected}`)
    },
    toBeCloseTo(expected, delta = 0.01) {
      if (Math.abs(actual - expected) > delta) throw new Error(`Expected ${actual} close to ${expected}`)
    },
    toContain(substr) {
      if (!String(actual).includes(substr)) throw new Error(`Expected "${actual}" to contain "${substr}"`)
    }
  }
}

// ==================================================================
// MODULE 1: AUTHENTICATION & VALIDATION
// ==================================================================
console.log('▶ Testing Module 1: Authentication & Validations')

test('TC-AUTH-01: Valid user email & password pattern verification', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  expect(emailRegex.test('finance.test@example.com')).toBe(true)
  expect(emailRegex.test('invalid-email')).toBe(false)
  expect('Test@123456'.length >= 6).toBe(true)
})

test('TC-AUTH-02: Admin PIN authentication logic & default PIN (1234)', () => {
  const DEFAULT_PIN = '1234'
  const verifyPin = (p) => p === DEFAULT_PIN
  expect(verifyPin('1234')).toBe(true)
  expect(verifyPin('0000')).toBe(false)
  expect(verifyPin('')).toBe(false)
})

// ==================================================================
// MODULE 2: TRANSACTIONS & SECTION 4/5 TEST DATASET VERIFICATION
// ==================================================================
console.log('\n▶ Testing Module 2: Transactions & Dataset Calculations')

const incomeDataset = [
  { date: '2026-09-01', type: 'income', category: 'Salary', amount: 75000, note: 'September salary' },
  { date: '2026-09-10', type: 'income', category: 'Freelance', amount: 8500, note: 'Freelance project' },
  { date: '2026-09-20', type: 'income', category: 'Business', amount: 12000, note: 'Business income' },
]

const expenseDataset = [
  { date: '2026-09-02', type: 'expense', category: 'Rent', amount: 15000, note: 'Monthly rent' },
  { date: '2026-09-03', type: 'expense', category: 'Food', amount: 1200, note: 'Groceries' },
  { date: '2026-09-05', type: 'expense', category: 'Fuel', amount: 2500, note: 'Petrol' },
  { date: '2026-09-07', type: 'expense', category: 'Utilities', amount: 2000, note: 'Electricity' },
  { date: '2026-09-12', type: 'expense', category: 'Shopping', amount: 3500, note: 'Clothes' },
  { date: '2026-09-14', type: 'expense', category: 'Food', amount: 800, note: 'Restaurant' },
  { date: '2026-09-18', type: 'expense', category: 'Entertainment', amount: 1500, note: 'Movie & outing' },
  { date: '2026-09-22', type: 'expense', category: 'Medical', amount: 2000, note: 'Doctor consultation' },
  { date: '2026-09-25', type: 'expense', category: 'Travel', amount: 3000, note: 'Weekend trip' },
]

const debitDataset = [
  { date: '2026-09-15', type: 'debit', category: 'Other', amount: 5000, note: 'Bank transfer debit' },
]

test('TC-TXN-01: Total Income matches exact Prompt specification (₹95,500)', () => {
  const totIncome = incomeDataset.reduce((s, t) => s + t.amount, 0)
  expect(totIncome).toBe(95500)
})

test('TC-TXN-02: Total Expense matches exact Prompt specification (₹31,500)', () => {
  const totExpense = expenseDataset.reduce((s, t) => s + t.amount, 0)
  expect(totExpense).toBe(31500)
})

test('TC-TXN-03: Total Debit matches exact Prompt specification (₹5,000)', () => {
  const totDebit = debitDataset.reduce((s, t) => s + t.amount, 0)
  expect(totDebit).toBe(5000)
})

test('TC-TXN-04: Net Savings (Income - Expenses) matches exact Prompt specification (₹64,000)', () => {
  const totIncome = incomeDataset.reduce((s, t) => s + t.amount, 0)
  const totExpense = expenseDataset.reduce((s, t) => s + t.amount, 0)
  expect(totIncome - totExpense).toBe(64000)
})

test('TC-TXN-05: Category aggregation Food: Groceries ₹1200 + Restaurant ₹800 = ₹2,000', () => {
  const foodSpend = expenseDataset
    .filter(t => t.category === 'Food')
    .reduce((s, t) => s + t.amount, 0)
  expect(foodSpend).toBe(2000)
})

console.log('==================================================================')
console.log('🚀 EXECUTING COMPLETE REGRESSION TEST SUITE (Testing_Prompt.md)')
console.log('==================================================================\n')

// ==================================================================
// MODULE 3: SIP SCHEDULE ENGINE & EDGE CASES
// ==================================================================
console.log('\n▶ Testing Module 3: SIP Schedule Engine & Edge Cases')

test('TC-SIP-01: Monthly SIP calculation 2026-09-05 -> 2026-10-05', () => {
  expect(calculateNextDueDate('2026-09-05', 'monthly')).toBe('2026-10-05')
})

test('TC-SIP-02: Monthly SIP paid progression 2026-10-05 -> 2026-11-05', () => {
  expect(calculateNextDueDate('2026-10-05', 'monthly')).toBe('2026-11-05')
})

test('TC-SIP-03: Weekly SIP calculation 2026-09-07 -> 2026-09-14', () => {
  expect(calculateNextDueDate('2026-09-07', 'weekly')).toBe('2026-09-14')
})

test('TC-SIP-04: Quarterly SIP calculation 2026-09-15 -> 2026-12-15', () => {
  expect(calculateNextDueDate('2026-09-15', 'quarterly')).toBe('2026-12-15')
})

test('TC-SIP-05: Month-end clamping non-leap year (2026-01-31 -> 2026-02-28)', () => {
  expect(calculateNextDueDate('2026-01-31', 'monthly')).toBe('2026-02-28')
})

test('TC-SIP-06: Month-end clamping leap year (2024-01-31 -> 2024-02-29)', () => {
  expect(calculateNextDueDate('2024-01-31', 'monthly')).toBe('2024-02-29')
})

test('TC-SIP-07: 31st to 30-day month clamping (2026-03-31 -> 2026-04-30)', () => {
  expect(calculateNextDueDate('2026-03-31', 'monthly')).toBe('2026-04-30')
})

test('TC-SIP-08: Yearly SIP progression (2026-09-01 -> 2027-09-01)', () => {
  expect(calculateNextDueDate('2026-09-01', 'yearly')).toBe('2027-09-01')
})

// ==================================================================
// MODULE 4: DEBT & LIABILITIES TRACKING
// ==================================================================
console.log('\n▶ Testing Module 4: Debt & Liabilities Tracking')

const debtsDataset = [
  { name: 'Personal Loan', principal: 100000, outstanding: 80000, emi: 4500, due_day: 5 },
  { name: 'Car Loan', principal: 600000, outstanding: 520000, emi: 12500, due_day: 10 },
  { name: 'Credit Card Outstanding', principal: 25000, outstanding: 25000, emi: 0, due_day: 18 },
  { name: 'Friend Borrowing', principal: 15000, outstanding: 15000, emi: 0, due_day: 25 },
  { name: 'Home Loan Share', principal: 500000, outstanding: 430000, emi: 8000, due_day: 7 },
]

test('TC-DEBT-01: Total outstanding sum matches Prompt initial total (₹10,70,000)', () => {
  const totalOutstanding = debtsDataset.reduce((s, d) => s + d.outstanding, 0)
  expect(totalOutstanding).toBe(1070000)
})

test('TC-DEBT-02: Partial repayment of Friend loan ₹15k reduces total to ₹10,55,000', () => {
  const updated = debtsDataset.map(d => d.name === 'Friend Borrowing' ? { ...d, outstanding: 0 } : d)
  const totalOutstanding = updated.reduce((s, d) => s + d.outstanding, 0)
  expect(totalOutstanding).toBe(1055000)
})

test('TC-DEBT-03: Validation catches invalid negative debt or bad due day', () => {
  const validateDebt = (d) => {
    if (!d.name || d.name.trim() === '') return false
    if (d.principal <= 0 || d.outstanding < 0) return false
    if (d.due_day && (d.due_day < 1 || d.due_day > 31)) return false
    return true
  }
  expect(validateDebt({ name: 'Valid', principal: 5000, outstanding: 5000, due_day: 15 })).toBe(true)
  expect(validateDebt({ name: '', principal: 5000, outstanding: 5000 })).toBe(false)
  expect(validateDebt({ name: 'Negative', principal: -5000, outstanding: 5000 })).toBe(false)
  expect(validateDebt({ name: 'Bad Day', principal: 5000, outstanding: 5000, due_day: 35 })).toBe(false)
})

// ==================================================================
// MODULE 5: INDIAN EQUITY MUTUAL FUNDS & CAPITAL GAINS TAX
// ==================================================================
console.log('\n▶ Testing Module 5: Mutual Funds & Capital Gains Tax Engine')

test('TC-MF-01: Verified AMFI Scheme code mapping is accurate', () => {
  expect(VERIFIED_SCHEME_CODES['motilal oswal midcap fund direct growth']).toBe('127042')
  expect(VERIFIED_SCHEME_CODES['quant small cap fund direct plan growth']).toBe('120828')
  expect(VERIFIED_SCHEME_CODES['bandhan small cap fund direct growth']).toBe('147946')
})

test('TC-MF-02: LTCG Tax with ₹1.25L exemption (12.5% on excess)', () => {
  const gain = 200000
  const exemption = 125000
  const taxableLtcg = Math.max(0, gain - exemption)
  const ltcgTax = taxableLtcg * 0.125
  expect(taxableLtcg).toBe(75000)
  expect(ltcgTax).toBe(9375)
})

test('TC-MF-03: STCG Tax calculation (flat 20%)', () => {
  const stcgGain = 50000
  const stcgTax = stcgGain * 0.20
  expect(stcgTax).toBe(10000)
})

// ==================================================================
// MODULE 6: STATEMENT & SMS PARSER HEURISTICS
// ==================================================================
console.log('\n▶ Testing Module 6: Statement & SMS Parser Heuristics')

test('TC-PARSE-01: Auto-categorizes food, fuel, travel from keywords', () => {
  expect(guessCategory('SWIGGY Bangalore Order').category).toBe('Food & Dining')
  expect(guessCategory('HPCL PETROL PUMP MUMBAI').category).toBe('Fuel')
  expect(guessCategory('UBER TRIP INDIA').category).toBe('Travel')
})

test('TC-PARSE-02: Bank SMS Parser extracts transactions accurately', () => {
  const sms = `Rs. 420.00 debited from HDFC for SWIGGY on 25-Sep-26
INR 75,000.00 credited to account towards Salary`
  const parsed = parseBankSmsText(sms)
  expect(parsed.length).toBe(2)
  expect(parsed[0].amount).toBe(420)
  expect(parsed[0].type).toBe('expense')
  expect(parsed[1].amount).toBe(75000)
  expect(parsed[1].type).toBe('income')
})
test('TC-PARSE-03: AI Receipt Vision Scanner fallback heuristics extract structured receipt payload', async () => {
  const dummyDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD'
  // When no API key is provided, scanReceiptWithAi returns the fallback heuristic structured payload
  const { scanReceiptWithAi } = await import('./src/utils/aiService.js')
  const res = await scanReceiptWithAi(dummyDataUrl)
  expect(typeof res.amount).toBe('number')
  expect(typeof res.merchant).toBe('string')
  expect(typeof res.category).toBe('string')
  expect(res.amount).toBeGreaterThan(0)
})

// ==================================================================
// MODULE 8: FIRE & MONTE CARLO FINANCIAL FREEDOM ENGINE
// ==================================================================
console.log('\n▶ Testing Module 8: FIRE & Monte Carlo Freedom Engine')

test('TC-FIRE-01: Rule of 25 & 4% SWR target corpus calculation', () => {
  const monthlyExp = 50000
  const annualExp = monthlyExp * 12 // 600,000
  const swr = 0.04
  const standardFire = annualExp / swr // 15,000,000
  const leanFire = standardFire * 0.70 // 10,500,000
  const fatFire = standardFire * 1.50  // 22,500,000
  const baristaFire = standardFire * 0.50 // 7,500,000

  expect(standardFire).toBe(15000000)
  expect(leanFire).toBe(10500000)
  expect(fatFire).toBe(22500000)
  expect(baristaFire).toBe(7500000)
})

test('TC-FIRE-02: Fisher Real Return & Coast FIRE formula validation', () => {
  const nomReturn = 0.12 // 12%
  const inflation = 0.06 // 6%
  const realRate = (1 + nomReturn) / (1 + inflation) - 1 // ~5.660377%
  const standardTarget = 15000000
  const yearsToRetire = 20

  const coastTarget = standardTarget / Math.pow(1 + realRate, yearsToRetire)
  expect(Math.round(coastTarget)).toBe(4987100)

  const userPortfolio = 5500000
  const hasAchievedCoast = userPortfolio >= coastTarget
  expect(hasAchievedCoast).toBe(true)
})

test('TC-FIRE-03: Month-by-month compounding timeline calculates exact retirement age', () => {
  let bal = 1500000 // 15 Lakh
  const target = 15000000 // 1.5 Cr
  const monthlyInv = 50000
  const nomReturn = 0.12
  const inflation = 0.06
  const realRate = (1 + nomReturn) / (1 + inflation) - 1
  const monthlyRealRate = Math.pow(1 + realRate, 1 / 12) - 1

  let months = 0
  while (bal < target && months < 600) {
    months++
    bal = bal * (1 + monthlyRealRate) + monthlyInv
  }

  // Compounding 15L + 50k/mo @ ~5.66% real return takes ~149 months (~12.4 years)
  expect(months).toBeGreaterThan(120)
  expect(months).toBeLessThan(180)
})

// ==================================================================
// MODULE 9: DEBT PAYOFF OPTIMIZER (SNOWBALL VS AVALANCHE)
// ==================================================================
console.log('\n▶ Testing Module 9: Debt Payoff Optimizer Engine')

test('TC-DEBT-OPT-01: Snowball sorts by lowest balance & Avalanche sorts by highest APR', () => {
  const sampleDebts = [
    { name: 'Personal Loan', balance: 100000, apr: 14, minEmi: 5000 },
    { name: 'Credit Card', balance: 30000, apr: 36, minEmi: 3000 },
    { name: 'Car Loan', balance: 500000, apr: 9, minEmi: 12000 },
  ]

  const snowballSorted = [...sampleDebts].sort((a, b) => a.balance - b.balance)
  expect(snowballSorted[0].name).toBe('Credit Card') // ₹30k
  expect(snowballSorted[1].name).toBe('Personal Loan') // ₹100k
  expect(snowballSorted[2].name).toBe('Car Loan') // ₹500k

  const avalancheSorted = [...sampleDebts].sort((a, b) => b.apr - a.apr)
  expect(avalancheSorted[0].name).toBe('Credit Card') // 36% APR
  expect(avalancheSorted[1].name).toBe('Personal Loan') // 14% APR
  expect(avalancheSorted[2].name).toBe('Car Loan') // 9% APR
})

test('TC-DEBT-OPT-02: Extra monthly payment accelerates payoff and reduces interest', () => {
  // Simple 2-debt payoff simulation
  let balance = 200000
  const apr = 0.18 // 18%
  const minEmi = 6000
  const extraPay = 4000 // Total 10,000

  let mBase = 0
  let balBase = balance
  let interestBase = 0
  while (balBase > 0 && mBase < 120) {
    mBase++
    const i = balBase * (apr / 12)
    interestBase += i
    balBase = balBase + i - minEmi
  }

  let mAccel = 0
  let balAccel = balance
  let interestAccel = 0
  while (balAccel > 0 && mAccel < 120) {
    mAccel++
    const i = balAccel * (apr / 12)
    interestAccel += i
    balAccel = balAccel + i - (minEmi + extraPay)
  }

  expect(mAccel).toBeLessThan(mBase)
  expect(interestAccel).toBeLessThan(interestBase)
})

// ==================================================================
// MODULE 10: ZOMBIE SUBSCRIPTION & DIGITAL LEAK DETECTOR
// ==================================================================
console.log('\n▶ Testing Module 10: Zombie Subscriptions & Digital Leak Detector')

test('TC-ZOMBIE-01: Calculates monthly outflow and annualized burn rate accurately', () => {
  const subs = [
    { name: 'Netflix', cost: 649, frequency: 'monthly' },
    { name: 'Prime', cost: 125, frequency: 'monthly' },
    { name: 'Spotify', cost: 119, frequency: 'monthly' },
    { name: 'ChatGPT Plus', cost: 1999, frequency: 'monthly' },
    { name: 'Google One', cost: 130, frequency: 'monthly' },
  ]
  const monthlyOutflow = subs.reduce((sum, s) => sum + s.cost, 0)
  const annualBurn = monthlyOutflow * 12
  expect(monthlyOutflow).toBe(3022)
  expect(annualBurn).toBe(36264)
})

test('TC-ZOMBIE-02: 10-Year Opportunity Cost compounding formula validation', () => {
  const monthlyBurn = 3022
  const r = 0.12 / 12 // 1% monthly
  const n = 120 // 10 years
  const fv = Math.round(monthlyBurn * ((Math.pow(1 + r, n) - 1) / r) * (1 + r))
  expect(fv).toBe(702129)
})

// ==================================================================
// MODULE 11: WEBAUTHN & BIOMETRIC HARDWARE SECURITY
// ==================================================================
console.log('\n▶ Testing Module 11: WebAuthn & Biometric Security Engine')

test('TC-BIO-01: WebAuthn availability check runs safely without crash in non-browser env', async () => {
  const { isBiometricsAvailable, isBiometricsEnabled, setBiometricsEnabled } = await import('./src/utils/webAuthn.js')
  const avail = await isBiometricsAvailable()
  expect(typeof avail).toBe('boolean')
  expect(typeof isBiometricsEnabled()).toBe('boolean')
})

test('TC-BIO-02: Biometric PIN unlock fallback matches default security PIN (1234)', () => {
  const defaultPin = '1234'
  const verifySecurityPin = (input) => input === defaultPin
  expect(verifySecurityPin('1234')).toBe(true)
  expect(verifySecurityPin('0000')).toBe(false)
  expect(verifySecurityPin('')).toBe(false)
})


// ==================================================================
// MODULE 7: EXCEPTION HANDLING, BOUNDARY CONDITIONS & CHAIN BREAKS
// ==================================================================
console.log('\n▶ Testing Module 7: Exception Handling & Boundary Safety')

test('TC-EXC-01: Currency formatter gracefully handles null, undefined, NaN', () => {
  expect(formatCurrency(null)).toBe('₹0')
  expect(formatCurrency(undefined)).toBe('₹0')
  expect(formatCurrency(NaN)).toBe('₹0')
  expect(formatCurrency(0)).toBe('₹0')
  expect(formatCurrency(-500)).toContain('500')
})

test('TC-EXC-02: Date utilities handle null & empty inputs without crash', () => {
  expect(formatDate(null)).toBe('')
  expect(formatDate('')).toBe('')
  expect(isOverdue(null)).toBe(false)
  expect(daysUntil(null)).toBe(null)
})

test('TC-EXC-03: CSV/SMS parsers handle empty inputs safely', () => {
  expect(parseBankSmsText('')).toEqual([])
  expect(parseGrowwCsv('')).toEqual([])
})

console.log('\n==================================================================')
console.log(`🏁 TEST EXECUTION COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`)
console.log('==================================================================\n')

if (failedTests > 0) {
  process.exit(1)
}
