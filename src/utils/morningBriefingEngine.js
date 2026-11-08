/**
 * Morning Financial Briefing & Safe-to-Spend Push Engine
 * Computes the daily financial briefing and triggers browser push notifications.
 */

export function generateDailyMorningBriefing({
  monthlyIncome = 85000,
  monthlyBudget = 50000,
  totalSpent = 22000,
  bills = [],
  sips = [],
}) {
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const currentDay = now.getDate()
  const daysRemaining = Math.max(1, daysInMonth - currentDay)

  const budgetRemaining = Math.max(0, monthlyBudget - totalSpent)
  const safeSpendToday = Math.round(budgetRemaining / daysRemaining)

  // Find dues in next 48 hours
  const urgentBills = []
  for (const b of bills) {
    const dueDay = Number(b.due_day) || (b.due_date ? new Date(b.due_date).getDate() : 15)
    const diff = dueDay - currentDay
    if (diff === 0 || diff === 1) {
      urgentBills.push({
        name: b.name || 'Bill',
        amount: Number(b.amount || 0),
        dueWhen: diff === 0 ? 'Today' : 'Tomorrow',
      })
    }
  }

  for (const s of sips) {
    if (!s.active) continue
    const dueDay = s.next_due_date ? new Date(s.next_due_date).getDate() : 5
    const diff = dueDay - currentDay
    if (diff === 0 || diff === 1) {
      urgentBills.push({
        name: `SIP: ${s.fund_name || 'Mutual Fund'}`,
        amount: Number(s.amount || 0),
        dueWhen: diff === 0 ? 'Today' : 'Tomorrow',
      })
    }
  }

  return {
    dateStr: now.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' }),
    currentDay,
    daysRemaining,
    safeSpendToday,
    budgetRemaining,
    urgentBills,
    summaryText: `Your Safe-to-Spend today is ₹${safeSpendToday.toLocaleString('en-IN')}.${urgentBills.length > 0 ? ` ${urgentBills[0].name} (₹${urgentBills[0].amount.toLocaleString('en-IN')}) is due ${urgentBills[0].dueWhen.toLowerCase()}!` : ' All upcoming bills are clear.'}`,
  }
}

/**
 * Triggers a browser desktop / mobile push notification with today's briefing
 */
export async function triggerMorningPushAlert(briefing) {
  if (typeof window === 'undefined' || !('Notification' in window)) return false

  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }

  if (permission === 'granted') {
    new Notification('☀️ Morning Wealth Briefing', {
      body: briefing.summaryText,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    })
    return true
  }
  return false
}
