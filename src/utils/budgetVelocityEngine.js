/**
 * Smart 50/30/20 Envelope Budgeting & Burn Velocity Engine
 * Calculates:
 *  1. 50/30/20 Rule compliance (Needs: 50%, Wants: 30%, Savings: 20%)
 *  2. Real-time daily burn rate velocity
 *  3. Month-end projected spend & overrun risks
 *  4. Safe-to-spend daily allowance for remaining days
 */

// Keyword heuristics to automatically map categories to 50/30/20 envelopes
export const ENVELOPE_TYPES = {
  NEEDS: 'needs',     // 50%
  WANTS: 'wants',     // 30%
  SAVINGS: 'savings', // 20%
}

const NEEDS_KEYWORDS = [
  'grocer', 'rent', 'utilit', 'bill', 'electric', 'water', 'gas',
  'fuel', 'petrol', 'diesel', 'medic', 'health', 'insur', 'doctor',
  'emi', 'loan', 'education', 'school', 'commute', 'maintenance'
]

const SAVINGS_KEYWORDS = [
  'sip', 'mutual fund', 'invest', 'stock', 'gold', 'emergency',
  'savings', 'deposit', 'ppf', 'epf', 'nps', 'rd', 'fd'
]

export function classifyCategoryEnvelope(categoryName = '') {
  const lower = String(categoryName || '').toLowerCase()

  for (const kw of SAVINGS_KEYWORDS) {
    if (lower.includes(kw)) return ENVELOPE_TYPES.SAVINGS
  }
  for (const kw of NEEDS_KEYWORDS) {
    if (lower.includes(kw)) return ENVELOPE_TYPES.NEEDS
  }
  return ENVELOPE_TYPES.WANTS // Default to Wants (dining, shopping, entertainment, travel)
}

/**
 * Calculates month-to-date velocity, projected end-of-month spend,
 * and safe daily spend limits.
 */
export function calculateBurnVelocity({
  totalSpent = 0,
  monthlyBudget = 0,
  referenceDate = new Date(),
}) {
  const now = new Date(referenceDate)
  const currentDay = Math.max(1, now.getDate())

  // Total days in current month
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysRemaining = Math.max(0, daysInMonth - currentDay)

  // Current pace per day
  const dailyVelocity = totalSpent / currentDay

  // Projected spend at end of month if current velocity continues
  const projectedSpend = Math.round(totalSpent + (dailyVelocity * daysRemaining))

  // Safe daily spend for remaining days to stay exactly within budget
  const remainingBudget = monthlyBudget - totalSpent
  const safeDailySpend = daysRemaining > 0
    ? Math.max(0, Math.round(remainingBudget / daysRemaining))
    : 0

  const isOverBudget = totalSpent > monthlyBudget
  const willOverrun = projectedSpend > monthlyBudget && monthlyBudget > 0
  const overrunAmount = willOverrun ? projectedSpend - monthlyBudget : 0
  const overrunPercent = monthlyBudget > 0 ? Math.round((overrunAmount / monthlyBudget) * 100) : 0

  // Estimated exhaustion date if on pace to overrun
  let exhaustionDay = null
  if (willOverrun && dailyVelocity > 0 && remainingBudget > 0) {
    exhaustionDay = Math.min(daysInMonth, Math.ceil(currentDay + (remainingBudget / dailyVelocity)))
  }

  return {
    currentDay,
    daysInMonth,
    daysRemaining,
    dailyVelocity: Math.round(dailyVelocity),
    projectedSpend,
    remainingBudget,
    safeDailySpend,
    isOverBudget,
    willOverrun,
    overrunAmount,
    overrunPercent,
    exhaustionDay,
    velocityStatus: isOverBudget ? 'EXCEEDED' : willOverrun ? 'WARNING' : 'HEALTHY',
  }
}

/**
 * Aggregates expenditures into 50/30/20 envelopes
 */
export function calculateEnvelopeSummary({
  monthlyIncome = 0,
  categories = [],
  spendingMap = {},
  totalSavings = 0,
}) {
  const envelopes = {
    needs: { spent: 0, target: Math.round(monthlyIncome * 0.50), percent: 50, categories: [] },
    wants: { spent: 0, target: Math.round(monthlyIncome * 0.30), percent: 30, categories: [] },
    savings: { spent: totalSavings, target: Math.round(monthlyIncome * 0.20), percent: 20, categories: [] },
  }

  categories.forEach((cat) => {
    const spent = parseFloat(spendingMap[cat.id] || 0)
    const envelope = classifyCategoryEnvelope(cat.name)

    envelopes[envelope].spent += spent
    envelopes[envelope].categories.push({
      ...cat,
      spent,
    })
  })

  const totalSpent = envelopes.needs.spent + envelopes.wants.spent + envelopes.savings.spent

  const actualPercentages = {
    needs: monthlyIncome > 0 ? Math.round((envelopes.needs.spent / monthlyIncome) * 100) : 0,
    wants: monthlyIncome > 0 ? Math.round((envelopes.wants.spent / monthlyIncome) * 100) : 0,
    savings: monthlyIncome > 0 ? Math.round((envelopes.savings.spent / monthlyIncome) * 100) : 0,
  }

  return {
    envelopes,
    totalSpent,
    actualPercentages,
  }
}
