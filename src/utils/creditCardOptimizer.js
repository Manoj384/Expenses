/**
 * Credit Card Grace Period & Smart Payer Engine
 * Maximizes interest-free credit float (up to 50 days) and reward points / cashback per category
 */

export const POPULAR_INDIAN_CREDIT_CARDS = [
  {
    id: 'sbi-cashback',
    name: 'SBI Cashback Credit Card',
    bank: 'SBI Card',
    network: 'Visa',
    statementDay: 15,
    graceDaysAfterStatement: 20,
    annualFee: 999,
    rewardRates: {
      online: 5.0, // 5% cashback on all online spends
      dining: 5.0,
      groceries: 5.0,
      travel: 5.0,
      shopping: 5.0,
      fuel: 1.0,
      utilities: 1.0,
      general: 1.0,
    },
    specialPerks: 'Flat 5% instant cashback auto-credited to statement on online shopping',
  },
  {
    id: 'hdfc-swiggy',
    name: 'HDFC Bank Swiggy Card',
    bank: 'HDFC Bank',
    network: 'Mastercard',
    statementDay: 20,
    graceDaysAfterStatement: 20,
    annualFee: 500,
    rewardRates: {
      dining: 10.0, // 10% on Swiggy, Instamart, Dineout
      groceries: 10.0,
      online: 5.0,
      shopping: 5.0,
      travel: 1.0,
      fuel: 0.0,
      utilities: 1.0,
      general: 1.0,
    },
    specialPerks: '10% cashback on Swiggy Food, Instamart groceries & Dineout',
  },
  {
    id: 'icici-amazon-pay',
    name: 'Amazon Pay ICICI Card',
    bank: 'ICICI Bank',
    network: 'Visa',
    statementDay: 5,
    graceDaysAfterStatement: 20,
    annualFee: 0,
    rewardRates: {
      shopping: 5.0, // 5% for Prime on Amazon
      utilities: 2.0, // 2% on Amazon Pay bill payments
      dining: 1.0,
      groceries: 2.0,
      travel: 2.0,
      fuel: 1.0,
      general: 1.0,
    },
    specialPerks: 'Lifetime Free card. 5% unlimited cashback for Amazon Prime members',
  },
  {
    id: 'axis-airtel',
    name: 'Airtel Axis Bank Credit Card',
    bank: 'Axis Bank',
    network: 'Mastercard',
    statementDay: 10,
    graceDaysAfterStatement: 20,
    annualFee: 500,
    rewardRates: {
      utilities: 25.0, // 25% on Airtel recharges & WiFi, 10% on BigBasket, Swiggy, Zomato
      dining: 10.0,
      groceries: 10.0,
      online: 1.0,
      shopping: 1.0,
      travel: 1.0,
      fuel: 1.0,
      general: 1.0,
    },
    specialPerks: '25% cashback on Airtel mobile/DTH/broadband bills & 10% on Swiggy/Zomato/BigBasket',
  },
  {
    id: 'axis-atlas',
    name: 'Axis Bank Atlas / Vistara Travel Card',
    bank: 'Axis Bank',
    network: 'Visa Infinite',
    statementDay: 25,
    graceDaysAfterStatement: 20,
    annualFee: 5000,
    rewardRates: {
      travel: 10.0, // 5 EDGE Miles = 10% value on airline & hotel bookings
      dining: 4.0,
      shopping: 2.0,
      groceries: 2.0,
      online: 2.0,
      fuel: 1.0,
      utilities: 1.0,
      general: 2.0,
    },
    specialPerks: '10% effective value via 5 EDGE Miles on direct flight and hotel bookings',
  },
]

/**
 * Calculates remaining interest-free grace days from reference date
 */
export function calculateCardGracePeriod(card, refDate = new Date()) {
  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const currentDay = refDate.getDate()

  const statementDay = card.statementDay || 15
  const graceDays = card.graceDaysAfterStatement || 20

  let nextStatementDate
  if (currentDay <= statementDay) {
    // Statement has not generated this month yet
    nextStatementDate = new Date(year, month, statementDay)
  } else {
    // Statement will generate next month
    nextStatementDate = new Date(year, month + 1, statementDay)
  }

  // Payment due date is statement date + graceDays
  const dueDate = new Date(nextStatementDate)
  dueDate.setDate(dueDate.getDate() + graceDays)

  // Difference in days between refDate and dueDate
  const diffTime = dueDate.getTime() - refDate.getTime()
  const interestFreeDaysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

  return {
    nextStatementDate,
    dueDate,
    interestFreeDaysRemaining,
    formattedDueDate: dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    formattedStatementDate: nextStatementDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }
}

/**
 * Evaluates best card recommendation for an upcoming expense
 */
export function recommendBestCardForExpense(cards = POPULAR_INDIAN_CREDIT_CARDS, { amount = 0, category = 'general', refDate = new Date() }) {
  const amt = Number(amount) || 0
  const normalizedCat = category.toLowerCase().replace(/[^a-z]/g, '')

  let catKey = 'general'
  if (normalizedCat.includes('food') || normalizedCat.includes('dining') || normalizedCat.includes('swiggy') || normalizedCat.includes('zomato') || normalizedCat.includes('restaurant')) {
    catKey = 'dining'
  } else if (normalizedCat.includes('groc') || normalizedCat.includes('supermarket') || normalizedCat.includes('instamart') || normalizedCat.includes('zepto') || normalizedCat.includes('blinkit')) {
    catKey = 'groceries'
  } else if (normalizedCat.includes('travel') || normalizedCat.includes('flight') || normalizedCat.includes('hotel') || normalizedCat.includes('airbnb') || normalizedCat.includes('vacation')) {
    catKey = 'travel'
  } else if (normalizedCat.includes('util') || normalizedCat.includes('bill') || normalizedCat.includes('wifi') || normalizedCat.includes('recharge') || normalizedCat.includes('electricity')) {
    catKey = 'utilities'
  } else if (normalizedCat.includes('shop') || normalizedCat.includes('amazon') || normalizedCat.includes('flipkart') || normalizedCat.includes('electronic') || normalizedCat.includes('cloth')) {
    catKey = 'shopping'
  } else if (normalizedCat.includes('fuel') || normalizedCat.includes('petrol') || normalizedCat.includes('diesel')) {
    catKey = 'fuel'
  } else if (normalizedCat.includes('online')) {
    catKey = 'online'
  }

  const evaluatedCards = cards.map(card => {
    const grace = calculateCardGracePeriod(card, refDate)
    const ratePct = card.rewardRates?.[catKey] || card.rewardRates?.general || 1.0
    const estimatedCashback = Math.round(((ratePct / 100) * amt) * 100) / 100

    // Score based on reward % (60% weight) + interest-free days remaining (40% weight)
    const normalizedDaysScore = (grace.interestFreeDaysRemaining / 50) * 100
    const normalizedRewardScore = (ratePct / 25) * 100
    const totalScore = (normalizedRewardScore * 0.60) + (normalizedDaysScore * 0.40)

    return {
      card,
      categoryKey: catKey,
      rewardRatePct: ratePct,
      estimatedCashback,
      ...grace,
      totalScore,
    }
  })

  evaluatedCards.sort((a, b) => b.totalScore - a.totalScore)

  const bestCard = evaluatedCards[0]
  const longestFloatCard = [...evaluatedCards].sort((a, b) => b.interestFreeDaysRemaining - a.interestFreeDaysRemaining)[0]
  const highestCashbackCard = [...evaluatedCards].sort((a, b) => b.estimatedCashback - a.estimatedCashback)[0]

  return {
    evaluatedCards,
    bestCard,
    longestFloatCard,
    highestCashbackCard,
    categoryKey: catKey,
  }
}
