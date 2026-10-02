/**
 * Autonomous Auto-Pilot Financial Digest Engine
 * Generates automated daily morning briefings with dues, card recommendations, budget velocity & Splitwise dues.
 */

import { formatCurrency } from './formatCurrency.js'
import { POPULAR_INDIAN_CREDIT_CARDS, recommendBestCardForExpense } from './creditCardOptimizer.js'
import { runFullAiAnomalyAudit } from './anomalyDetector.js'

export function generateAutoPilotDigest({
  transactions = [],
  bills = [],
  splitwiseGroups = [],
  monthlyBudget = 50000,
  userName = 'Adventurer',
  refDate = new Date(),
}) {
  const dateStr = refDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  // 1. Calculate Today's & Upcoming Dues (Bills & Reminders)
  const todayDay = refDate.getDate()
  const currentMonthKey = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}`

  const dueSoonBills = (bills || []).filter(b => {
    const dueDay = Number(b.due_day) || Number((b.due_date || '').split('-')[2]) || 1
    const diff = dueDay - todayDay
    return diff >= 0 && diff <= 5
  })

  const totalDuesAmount = dueSoonBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0)

  // 2. Compute Weekly Spending Velocity & Budget Remaining
  const monthTxns = (transactions || []).filter(t => (t.date || '').startsWith(currentMonthKey) && (t.type === 'expense' || t.type === 'debit'))
  const monthSpent = monthTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  const budgetRemaining = Math.max(0, monthlyBudget - monthSpent)
  const daysInMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0).getDate()
  const daysRemaining = Math.max(1, daysInMonth - todayDay)
  const safeDailyBudget = Math.round(budgetRemaining / daysRemaining)

  // 3. Best Credit Card Float for Today
  const cardEval = recommendBestCardForExpense(POPULAR_INDIAN_CREDIT_CARDS, {
    amount: 5000,
    category: 'online',
    refDate,
  })
  const topCard = cardEval.bestCard

  // 4. Splitwise Pending Dues to Collect
  let totalReceivable = 0
  const debtors = []
  ;(splitwiseGroups || []).forEach(g => {
    const members = g.members || []
    const expenses = g.expenses || []
    const settlements = g.settlements || []

    const netBalances = {}
    members.forEach(m => { netBalances[m.id] = 0 })

    expenses.forEach(exp => {
      const amt = Number(exp.amount) || 0
      if (exp.payer_mode === 'multiple' && exp.paid_by) {
        Object.entries(exp.paid_by).forEach(([pId, pAmt]) => {
          if (netBalances[pId] !== undefined) netBalances[pId] += Number(pAmt) || 0
        })
      } else if (exp.paid_by_id && netBalances[exp.paid_by_id] !== undefined) {
        netBalances[exp.paid_by_id] += amt
      }

      Object.entries(exp.shares || {}).forEach(([mId, s]) => {
        if (netBalances[mId] !== undefined) netBalances[mId] -= Number(s) || 0
      })
    })

    settlements.forEach(s => {
      if (netBalances[s.from_id] !== undefined) netBalances[s.from_id] += Number(s.amount) || 0
      if (netBalances[s.to_id] !== undefined) netBalances[s.to_id] -= Number(s.amount) || 0
    })

    const ownerId = members.find(m => m.isOwner)?.id || members[0]?.id
    const ownerNet = netBalances[ownerId] || 0
    if (ownerNet > 0.5) {
      totalReceivable += ownerNet
      members.filter(m => m.id !== ownerId).forEach(m => {
        const bal = netBalances[m.id] || 0
        if (bal < -0.5) {
          debtors.push({ name: m.name, groupName: g.name, amount: Math.abs(bal) })
        }
      })
    }
  })

  // 5. Run Security Anomaly Check
  const audit = runFullAiAnomalyAudit(transactions)

  // 6. Generate Clean Message Text for WhatsApp / Telegram / Audio
  const greeting = refDate.getHours() < 12 ? 'Good morning' : refDate.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  let textDigest = `☀️ *FINANCIAL AUTO-PILOT BRIEFING* — ${dateStr}\n`
  textDigest += `${greeting} ${userName}! Here is your automated wealth & cash flow status:\n\n`

  // Section: Bills
  textDigest += `📋 *1. Bills & Dues This Week:*\n`
  if (dueSoonBills.length === 0) {
    textDigest += `• All clear! No bills due in the next 5 days.\n`
  } else {
    dueSoonBills.forEach(b => {
      textDigest += `• ${b.title || b.name}: ${formatCurrency(b.amount)} (Due day ${b.due_day || 'soon'})\n`
    })
    textDigest += `• Total Upcoming: *${formatCurrency(totalDuesAmount)}*\n`
  }
  textDigest += `\n`

  // Section: Card Recommendation
  textDigest += `💳 *2. Smart Card of the Day:*\n`
  if (topCard) {
    textDigest += `• Use *${topCard.card.name}* today.\n`
    textDigest += `• Enjoy *${topCard.interestFreeDaysRemaining} Days* of interest-free float (Due: ${topCard.formattedDueDate}) + up to ${topCard.rewardRatePct}% cashback!\n`
  }
  textDigest += `\n`

  // Section: Budget Pace
  textDigest += `📊 *3. Spending Run-Rate:*\n`
  textDigest += `• Monthly Budget Remaining: *${formatCurrency(budgetRemaining)}*\n`
  textDigest += `• Safe Daily Limit: *${formatCurrency(safeDailyBudget)}/day* for next ${daysRemaining} days.\n\n`

  // Section: Splitwise
  textDigest += `👥 *4. Friends Owing You Money:*\n`
  if (totalReceivable > 0) {
    textDigest += `• Total to collect: *${formatCurrency(totalReceivable)}*\n`
    debtors.slice(0, 3).forEach(d => {
      textDigest += `  - ${d.name}: ${formatCurrency(d.amount)} (${d.groupName})\n`
    })
  } else {
    textDigest += `• All group balances settled! No pending dues.\n`
  }
  textDigest += `\n`

  // Section: AI Sentinel
  textDigest += `🛡️ *5. Security Sentinel:*\n`
  if (audit.anomalies.length === 0) {
    textDigest += `• 100% Clean! 0 duplicate charges or subscription hikes detected.\n`
  } else {
    textDigest += `• ⚠️ ${audit.anomalies.length} anomaly alerts flagged for review (${formatCurrency(audit.totalFinancialExposure)} exposure).\n`
  }

  return {
    dateStr,
    greeting,
    dueSoonBills,
    totalDuesAmount,
    monthSpent,
    budgetRemaining,
    safeDailyBudget,
    daysRemaining,
    topCard,
    totalReceivable,
    debtors,
    anomalyCount: audit.anomalies.length,
    textDigest,
  }
}
