/**
 * AI Spending Anomaly & Duplicate Charge Sentinel Engine
 * Detects duplicate charges, stealth subscription hikes, and category spend velocity spikes.
 */

export function detectDuplicateCharges(transactions = []) {
  const duplicates = []
  const sorted = [...transactions]
    .filter(t => t.type === 'expense' || t.type === 'debit')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const t1 = sorted[i]
      const t2 = sorted[j]

      const amt1 = Number(t1.amount)
      const amt2 = Number(t2.amount)
      const date1 = new Date(t1.date).getTime()
      const date2 = new Date(t2.date).getTime()
      const diffDays = Math.abs((date1 - date2) / (1000 * 60 * 60 * 24))

      // Same amount and within 2 days or same note/category
      if (amt1 === amt2 && amt1 > 0 && diffDays <= 1) {
        const cat1 = t1.categories?.name || t1.category || 'General'
        const cat2 = t2.categories?.name || t2.category || 'General'
        const note1 = (t1.note || '').toLowerCase().trim()
        const note2 = (t2.note || '').toLowerCase().trim()

        if (cat1 === cat2 || (note1 && note1 === note2) || diffDays === 0) {
          // Check if already grouped
          const alreadyAdded = duplicates.some(d => d.tx1.id === t1.id && d.tx2.id === t2.id)
          if (!alreadyAdded) {
            duplicates.push({
              id: `dup-${t1.id || i}-${t2.id || j}`,
              type: 'DUPLICATE_CHARGE',
              severity: 'HIGH',
              title: `Potential Duplicate Charge of ₹${amt1}`,
              description: `Two identical debits of ₹${amt1} were recorded on ${t1.date} and ${t2.date} under "${cat1}".`,
              amount: amt1,
              tx1: t1,
              tx2: t2,
              recommendation: 'Check your bank statement / SMS to verify if the merchant double-swiped your card or if one failed and was refunded.',
            })
          }
        }
      }
    }
  }

  return duplicates
}

export function detectCategorySpendingSpikes(transactions = [], currentMonthKey = null) {
  const spikes = []
  if (!transactions.length) return spikes

  const now = new Date()
  const activeMonthKey = currentMonthKey || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Group by category and month
  const categoryMonthly = {}
  transactions.forEach(t => {
    if (t.type !== 'expense' && t.type !== 'debit') return
    const catName = t.categories?.name || t.category || 'Uncategorized'
    const mKey = (t.date || '').slice(0, 7)
    if (!mKey) return

    if (!categoryMonthly[catName]) categoryMonthly[catName] = {}
    if (!categoryMonthly[catName][mKey]) categoryMonthly[catName][mKey] = 0
    categoryMonthly[catName][mKey] += Number(t.amount) || 0
  })

  // Compare active month against trailing 3-month average
  Object.entries(categoryMonthly).forEach(([catName, months]) => {
    const currentSpend = months[activeMonthKey] || 0
    if (currentSpend <= 1000) return // Ignore trivial amounts

    const pastMonths = Object.keys(months).filter(k => k < activeMonthKey).sort().slice(-3)
    if (pastMonths.length === 0) return

    const pastTotal = pastMonths.reduce((sum, k) => sum + months[k], 0)
    const trailingAvg = pastTotal / pastMonths.length

    if (trailingAvg > 0) {
      const spikeRatio = (currentSpend / trailingAvg) * 100
      if (spikeRatio >= 180 && (currentSpend - trailingAvg) >= 1500) {
        const severity = spikeRatio >= 250 ? 'CRITICAL' : 'HIGH'
        spikes.push({
          id: `spike-${catName}-${activeMonthKey}`,
          type: 'SPENDING_SPIKE',
          severity,
          category: catName,
          title: `Spending Velocity Surge in "${catName}" (+${Math.round(spikeRatio - 100)}%)`,
          description: `You have spent ₹${Math.round(currentSpend).toLocaleString('en-IN')} on ${catName} this month, compared to your 3-month average of ₹${Math.round(trailingAvg).toLocaleString('en-IN')}.`,
          currentSpend,
          trailingAvg,
          excessAmount: Math.round(currentSpend - trailingAvg),
          recommendation: `Pause discretionary outflow on ${catName} for the next 10 days to protect your monthly savings rate target.`,
        })
      }
    }
  })

  return spikes
}

export function detectSubscriptionPriceHikes(transactions = []) {
  const hikes = []
  const KNOWN_SUBSCRIPTION_KEYWORDS = [
    'netflix', 'spotify', 'prime', 'amazon prime', 'hotstar', 'disney', 'gym', 'cult.fit', 'cult fit',
    'apple', 'icloud', 'google one', 'youtube', 'chatgpt', 'openai', 'notion', 'github', 'wifi', 'broadband',
    'airtel', 'jio', 'tata sky', 'act fibernet', 'midjourney', 'cursor', 'claude', 'adobe'
  ]

  const subMap = {}
  transactions.forEach(t => {
    if (t.type !== 'expense' && t.type !== 'debit') return
    const text = `${t.note || ''} ${t.categories?.name || t.category || ''}`.toLowerCase()
    const matched = KNOWN_SUBSCRIPTION_KEYWORDS.find(k => text.includes(k))
    if (!matched) return

    if (!subMap[matched]) subMap[matched] = []
    subMap[matched].push({ ...t, amount: Number(t.amount) || 0 })
  })

  Object.entries(subMap).forEach(([service, txList]) => {
    if (txList.length < 2) return
    txList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    for (let i = 1; i < txList.length; i++) {
      const prev = txList[i - 1]
      const curr = txList[i]
      if (curr.amount > prev.amount && prev.amount > 0) {
        const hikeAmount = curr.amount - prev.amount
        const hikePercent = Math.round((hikeAmount / prev.amount) * 100)
        hikes.push({
          id: `hike-${service}-${curr.id || i}`,
          type: 'SUBSCRIPTION_HIKE',
          severity: hikePercent > 20 ? 'HIGH' : 'MEDIUM',
          service: service.toUpperCase(),
          title: `Stealth Price Hike Detected: ${service.toUpperCase()} (+${hikePercent}%)`,
          description: `${service.toUpperCase()} debited ₹${curr.amount} on ${curr.date}, up from ₹${prev.amount} on ${prev.date} (+₹${hikeAmount}/month).`,
          oldAmount: prev.amount,
          newAmount: curr.amount,
          hikePercent,
          annualizedLeak: hikeAmount * 12,
          recommendation: 'Review your subscription plan tier or switch to an annual billing discount to save 20-30%.',
        })
      }
    }
  })

  return hikes
}

export function detectRecurringSpendPatterns(transactions = []) {
  const recurring = []
  const merchantMap = {}

  transactions.forEach(t => {
    if (t.type !== 'expense' && t.type !== 'debit') return
    const note = (t.note || '').toLowerCase().trim()
    if (!note || note.length < 3) return

    // Group by first 2 words of merchant note
    const key = note.split(' ').slice(0, 2).join(' ')
    if (!merchantMap[key]) merchantMap[key] = []
    merchantMap[key].push(t)
  })

  Object.entries(merchantMap).forEach(([merchantKey, txList]) => {
    if (txList.length >= 3) {
      const avgAmt = Math.round(txList.reduce((s, t) => s + Number(t.amount || 0), 0) / txList.length)
      const totalSpend = txList.reduce((s, t) => s + Number(t.amount || 0), 0)
      recurring.push({
        id: `rec-${merchantKey}`,
        type: 'RECURRING_SPEND_PATTERN',
        severity: 'INFO',
        title: `Recurring Spend Pattern: "${merchantKey.toUpperCase()}"`,
        description: `You have transacted ${txList.length} times with "${merchantKey}" totaling ₹${totalSpend.toLocaleString('en-IN')} (Avg: ₹${avgAmt}/txn).`,
        count: txList.length,
        avgAmount: avgAmt,
        totalSpend,
        recommendation: 'Consider adding a monthly category budget or tracking this as a regular recurring subscription.',
      })
    }
  })

  return recurring
}

export function runFullAiAnomalyAudit(transactions = []) {
  const duplicates = detectDuplicateCharges(transactions)
  const spikes = detectCategorySpendingSpikes(transactions)
  const hikes = detectSubscriptionPriceHikes(transactions)
  const recurring = detectRecurringSpendPatterns(transactions)

  const allAnomalies = [...duplicates, ...spikes, ...hikes, ...recurring]
  const totalFinancialExposure = allAnomalies.reduce((sum, a) => {
    if (a.type === 'DUPLICATE_CHARGE') return sum + (a.amount || 0)
    if (a.type === 'SPENDING_SPIKE') return sum + (a.excessAmount || 0)
    if (a.type === 'SUBSCRIPTION_HIKE') return sum + (a.annualizedLeak || 0)
    return sum
  }, 0)

  return {
    anomalies: allAnomalies,
    duplicates,
    spikes,
    hikes,
    recurring,
    totalCount: allAnomalies.length,
    totalFinancialExposure,
    healthScore: Math.max(20, 100 - (duplicates.length + spikes.length + hikes.length) * 15),
    status: (duplicates.length + spikes.length + hikes.length) === 0 ? 'CLEAN' : 'ATTENTION_REQUIRED',
  }
}
