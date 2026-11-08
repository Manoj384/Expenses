/**
 * 30-Day Predictive Cashflow & Bank Balance Forecaster Engine
 * Projects day-by-day bank balance over 30 to 90 days combining:
 * - Expected salary credit & date
 * - Scheduled SIP debits
 * - Recurring bills & debts
 * - Daily burn rate velocity
 * - Proactively flags cash-crunch / balance dips below safety threshold
 */

import { daysUntil } from './dateUtils.js'

export const DEFAULT_SAFE_BUFFER = 5000 // Minimum desired bank balance

/**
 * Projects daily cashflow for the next N days
 */
export function project30DayCashflow({
  currentBalance = 45000,
  monthlyIncome = 85000,
  salaryDay = 1, // day of month salary is credited
  dailyBurnRate = 1000,
  sips = [],
  bills = [],
  debts = [],
  projectionDays = 30,
  safeBuffer = DEFAULT_SAFE_BUFFER,
}) {
  const today = new Date()
  const timeline = []
  let runningBalance = currentBalance
  let minBalance = currentBalance
  let minBalanceDate = today.toISOString().slice(0, 10)
  const dipAlerts = []

  for (let i = 0; i < projectionDays; i++) {
    const targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
    const dateStr = targetDate.toISOString().slice(0, 10)
    const dayOfMonth = targetDate.getDate()
    const dayOfWeek = targetDate.getDay() // 0 = Sun, 6 = Sat

    let dayInflow = 0
    let dayOutflow = dailyBurnRate // baseline living expense burn
    const dayEvents = []

    // 1. Salary Credit
    if (dayOfMonth === salaryDay) {
      dayInflow += monthlyIncome
      dayEvents.push({
        type: 'income',
        name: 'Salary Credit',
        amount: monthlyIncome,
      })
    }

    // 2. Scheduled SIPs
    for (const sip of sips) {
      if (!sip.active) continue
      const dueDay = sip.next_due_date ? new Date(sip.next_due_date).getDate() : 5
      if (dayOfMonth === dueDay || (sip.frequency === 'weekly' && dayOfWeek === 1 && i % 7 === 0)) {
        dayOutflow += Number(sip.amount || 0)
        dayEvents.push({
          type: 'sip',
          name: `SIP: ${sip.fund_name || 'Mutual Fund'}`,
          amount: Number(sip.amount || 0),
        })
      }
    }

    // 3. Recurring Bills
    for (const bill of bills) {
      const bDay = Number(bill.due_day) || (bill.due_date ? new Date(bill.due_date).getDate() : 15)
      if (dayOfMonth === bDay) {
        dayOutflow += Number(bill.amount || 0)
        dayEvents.push({
          type: 'bill',
          name: `Bill: ${bill.name || 'Utility'}`,
          amount: Number(bill.amount || 0),
        })
      }
    }

    // 4. Debts / EMIs / Credit Cards
    for (const debt of debts) {
      if (debt.status === 'closed') continue
      const dDay = Number(debt.due_day) || 10
      if (dayOfMonth === dDay) {
        const emi = Number(debt.emi || debt.monthly_payment || 0)
        if (emi > 0) {
          dayOutflow += emi
          dayEvents.push({
            type: 'debt',
            name: `EMI: ${debt.name || debt.lender || 'Loan'}`,
            amount: emi,
          })
        }
      }
    }

    // Calculate end of day balance
    runningBalance = runningBalance + dayInflow - dayOutflow

    if (runningBalance < minBalance) {
      minBalance = runningBalance
      minBalanceDate = dateStr
    }

    // Check for cash crunch / buffer dip
    const isDip = runningBalance < safeBuffer
    if (isDip) {
      dipAlerts.push({
        date: dateStr,
        dayIndex: i,
        projectedBalance: Math.round(runningBalance),
        deficit: Math.round(safeBuffer - runningBalance),
        events: dayEvents,
      })
    }

    timeline.push({
      date: dateStr,
      dayNumber: i + 1,
      dayOfMonth,
      inflow: Math.round(dayInflow),
      outflow: Math.round(dayOutflow),
      balance: Math.round(runningBalance),
      events: dayEvents,
      isDip,
    })
  }

  // Generate Proactive AI Strategy Recommendation
  let riskLevel = 'LOW'
  let recommendation = 'Your projected cashflow is healthy. Balance stays above your safety buffer throughout the next 30 days.'

  if (dipAlerts.length > 0) {
    const firstDip = dipAlerts[0]
    const maxDeficit = Math.max(...dipAlerts.map(d => d.deficit))
    if (firstDip.projectedBalance < 0) {
      riskLevel = 'CRITICAL'
      recommendation = `Cash crunch alert: Your balance is projected to overdraft by ₹${Math.abs(firstDip.projectedBalance).toLocaleString('en-IN')} on ${firstDip.date}. Recommend temporarily shifting ₹${(maxDeficit + 5000).toLocaleString('en-IN')} from emergency fund or postponing non-essential shopping.`
    } else {
      riskLevel = 'MODERATE'
      recommendation = `Buffer dip warning: Balance drops to ₹${minBalance.toLocaleString('en-IN')} on ${minBalanceDate} (below your ₹${safeBuffer.toLocaleString('en-IN')} safety buffer). Consider adjusting upcoming discretionary expenses.`
    }
  }

  return {
    timeline,
    minBalance: Math.round(minBalance),
    minBalanceDate,
    hasDipRisk: dipAlerts.length > 0,
    riskLevel,
    dipAlerts,
    recommendation,
  }
}
