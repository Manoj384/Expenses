/**
 * splitwiseCalculations.js
 * Modular financial balances and settlement simplification engine.
 */

/**
 * Compute net balances for all members from a list of expenses.
 */
export function computeNetBalances(members = [], expenses = []) {
  const netBalances = {}
  members.forEach(m => { netBalances[m.id] = 0 })

  let totalSpend = 0

  expenses.forEach(exp => {
    const amt = Number(exp.amount) || 0
    totalSpend += amt

    // Credit payer(s)
    if (exp.payer_mode === 'multiple' && exp.paid_by) {
      Object.entries(exp.paid_by).forEach(([pId, pAmt]) => {
        netBalances[pId] = (netBalances[pId] || 0) + Number(pAmt || 0)
      })
    } else if (exp.paid_by_id) {
      netBalances[exp.paid_by_id] = (netBalances[exp.paid_by_id] || 0) + amt
    }

    // Debit participants
    if (exp.shares) {
      Object.entries(exp.shares).forEach(([mId, share]) => {
        netBalances[mId] = (netBalances[mId] || 0) - Number(share || 0)
      })
    }
  })

  return { netBalances, totalSpend }
}

/**
 * Greedily simplify debts to minimize the total number of cross-member settlement transfers.
 */
export function simplifyDebts(netBalances = {}, members = []) {
  const creditors = []
  const debtors = []

  Object.entries(netBalances).forEach(([mId, bal]) => {
    const rounded = Math.round(bal * 100) / 100
    const member = members.find(m => m.id === mId) || { id: mId, name: 'Unknown' }
    if (rounded > 0.05) creditors.push({ member, amount: rounded })
    else if (rounded < -0.05) debtors.push({ member, amount: -rounded })
  })

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const simplifiedDebts = []
  let cIdx = 0
  let dIdx = 0

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const cred = creditors[cIdx]
    const deb = debtors[dIdx]
    const settleAmt = Math.min(cred.amount, deb.amount)

    if (settleAmt > 0.05) {
      simplifiedDebts.push({
        from: deb.member,
        to: cred.member,
        amount: Math.round(settleAmt * 100) / 100,
      })
    }

    cred.amount -= settleAmt
    deb.amount -= settleAmt

    if (cred.amount <= 0.05) cIdx++
    if (deb.amount <= 0.05) dIdx++
  }

  return simplifiedDebts
}

/**
 * Complete balance calculations with active viewer perspective.
 */
export function calculateTripBalances(members = [], expenses = [], activeMemberId = 'all') {
  const { netBalances, totalSpend } = computeNetBalances(members, expenses)
  const simplifiedDebts = simplifyDebts(netBalances, members)

  let youNet = 0
  let youOwe = 0
  let youAreOwed = 0

  if (activeMemberId !== 'all') {
    youNet = netBalances[activeMemberId] || 0
    simplifiedDebts.forEach(d => {
      if (d.from.id === activeMemberId) youOwe += d.amount
      if (d.to.id === activeMemberId) youAreOwed += d.amount
    })
  }

  return {
    netBalances,
    simplifiedDebts,
    totalSpend,
    youNet,
    youOwe,
    youAreOwed,
  }
}
