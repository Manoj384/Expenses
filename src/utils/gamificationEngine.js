/**
 * Financial Gamification, Streaks & Wealth Discipline Engine
 */

export const SAVINGS_MILESTONES = [
  { id: 'm1', name: 'First Milestone', threshold: 10000, icon: '🌱', description: 'Saved your first ₹10,000' },
  { id: 'm2', name: 'Emergency Cushion', threshold: 50000, icon: '🛡️', description: 'Built ₹50,000 safety net' },
  { id: 'm3', name: 'Centurion Saver', threshold: 100000, icon: '⭐', description: 'Hit the 6-figure ₹1,00,000 club' },
  { id: 'm4', name: 'Half Millionaire', threshold: 500000, icon: '💎', description: 'Crossed ₹5,00,000 liquid savings' },
  { id: 'm5', name: '10 Lakh Legend', threshold: 1000000, icon: '👑', description: 'Achieved ₹10 Lakhs invested corpus' },
  { id: 'm6', name: 'Quarter Crore Titan', threshold: 2500000, icon: '🚀', description: 'Crossed ₹25 Lakhs net worth' },
]

export const BADGES = [
  { id: 'streak-7', name: '7-Day Discipline', icon: '🔥', description: 'Stayed strictly under daily budget for 7 straight days' },
  { id: 'sip-master', name: 'SIP Compounding Pro', icon: '📈', description: 'Maintained 3+ active SIP investments' },
  { id: 'zero-debt', name: 'Debt Free Master', icon: '🏆', description: 'Zero high-interest loans or debts active' },
  { id: 'tax-optimizer', name: 'Tax Ninja', icon: '⚖️', description: 'Optimized Section 80C and New vs Old regime' },
  { id: 'anomaly-sentinel', name: 'Double-Charge Sentinel', icon: '🚨', description: 'Protected cashflow against duplicate charges' },
]

export function computeFinancialDisciplineScore({ monthlyIncome = 95000, monthlyExpense = 32500, investedAmount = 980000, upcomingBills = [] }) {
  let score = 50 // Base score

  // 1. Savings Rate (+/- 25 points)
  const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpense) / monthlyIncome : 0
  if (savingsRate >= 0.5) score += 25
  else if (savingsRate >= 0.3) score += 15
  else if (savingsRate >= 0.1) score += 5
  else score -= 15

  // 2. Investment Ratio (+/- 15 points)
  if (investedAmount >= monthlyIncome * 6) score += 15
  else if (investedAmount >= monthlyIncome * 3) score += 10
  else if (investedAmount > 0) score += 5

  // 3. Bill Payment Health (+/- 10 points)
  const unpaidUrgent = (upcomingBills || []).filter(b => !b.is_paid).length
  if (unpaidUrgent === 0) score += 10
  else if (unpaidUrgent <= 2) score += 5
  else score -= 5

  const clampedScore = Math.max(10, Math.min(100, Math.round(score)))

  let rank = 'Bronze Saver'
  let color = 'text-amber-500'
  if (clampedScore >= 85) { rank = 'Wealth Architect (Elite)'; color = 'text-emerald-500' }
  else if (clampedScore >= 70) { rank = 'Diamond Investor'; color = 'text-cyan-500' }
  else if (clampedScore >= 50) { rank = 'Gold Disciplinarian'; color = 'text-blue-500' }

  return {
    score: clampedScore,
    rank,
    color,
    savingsRatePct: Math.round(savingsRate * 100),
    achievedMilestones: SAVINGS_MILESTONES.filter(m => (investedAmount || 0) >= m.threshold),
    nextMilestone: SAVINGS_MILESTONES.find(m => (investedAmount || 0) < m.threshold) || SAVINGS_MILESTONES[SAVINGS_MILESTONES.length - 1],
  }
}
