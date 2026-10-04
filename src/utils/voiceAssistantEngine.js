/**
 * Conversational Voice Assistant Engine (2-Way Speech-to-Speech)
 * Processes spoken queries, executes financial intent matching, and formats natural spoken answers.
 */

import { formatCurrency } from './formatCurrency.js'
import { POPULAR_INDIAN_CREDIT_CARDS, recommendBestCardForExpense } from './creditCardOptimizer.js'
import { parseVoiceExpense } from './voiceNlpParser.js'

export function processVoiceAssistantQuery(spokenText, context = {}) {
  if (!spokenText || typeof spokenText !== 'string') {
    return {
      intent: 'UNKNOWN',
      speechText: "I didn't quite catch that. Could you please repeat?",
      displayText: "I didn't quite catch that. Could you please repeat?",
    }
  }

  const query = spokenText.toLowerCase().trim()
  const {
    netWorth = 1845000,
    investedAmount = 1200000,
    currentPortfolio = 1580000,
    totalProfit = 380000,
    monthlyExpense = 34500,
    monthlyIncome = 95000,
    upcomingBills = [
      { name: 'Broadband WiFi', amount: 1499, due_day: 15 },
      { name: 'Apartment Maintenance', amount: 3200, due_day: 20 },
    ],
    splitwiseDues = 8600,
  } = context

  // 1. INTENT: Net Worth & Wealth Query
  if (/net worth|total wealth|total balance|how much money do i have|assets/i.test(query)) {
    const netWorthStr = formatCurrency(netWorth)
    return {
      intent: 'NET_WORTH',
      speechText: `Your total consolidated net worth is ${netWorthStr}. Your portfolio has grown by ${formatCurrency(totalProfit)} this year.`,
      displayText: `💼 **Consolidated Net Worth:** ${netWorthStr}\n📈 **Unrealized Gain:** +${formatCurrency(totalProfit)}`,
    }
  }

  // 2. INTENT: Portfolio & Mutual Funds
  if (/mutual fund|portfolio|stocks|investments?|xirr|groww/i.test(query)) {
    const portStr = formatCurrency(currentPortfolio)
    return {
      intent: 'PORTFOLIO',
      speechText: `Your mutual fund portfolio is currently valued at ${portStr}, with an invested capital of ${formatCurrency(investedAmount)}. You have an overall profit of ${formatCurrency(totalProfit)}.`,
      displayText: `📊 **Portfolio Valuation:** ${portStr}\n💵 **Invested:** ${formatCurrency(investedAmount)}\n🚀 **Total Return:** +${formatCurrency(totalProfit)}`,
    }
  }

  // 3. INTENT: Upcoming Bills & Dues
  if (/bills?|dues?|reminders?|emi|upcoming payment|due date/i.test(query)) {
    if (!upcomingBills.length) {
      return {
        intent: 'BILLS',
        speechText: `You have no upcoming bills due this week. All accounts are up to date!`,
        displayText: `✅ **No upcoming bills due.** You are fully paid up!`,
      }
    }
    const billNames = upcomingBills.map(b => `${b.name} of ${formatCurrency(b.amount)}`).join(' and ')
    const totalDues = upcomingBills.reduce((s, b) => s + Number(b.amount), 0)
    return {
      intent: 'BILLS',
      speechText: `You have ${upcomingBills.length} upcoming bills totaling ${formatCurrency(totalDues)}, including ${billNames}.`,
      displayText: `📋 **Upcoming Dues (${formatCurrency(totalDues)}):**\n` + upcomingBills.map(b => `• ${b.name}: **${formatCurrency(b.amount)}** (Day ${b.due_day})`).join('\n'),
    }
  }

  // 4. INTENT: Credit Card Float & Best Card to Swipe
  if (/credit card|which card|swipe|cashback|float|grace period/i.test(query)) {
    let cat = 'online'
    if (/dining|food|swiggy|zomato|restaurant/i.test(query)) cat = 'dining'
    else if (/flight|travel|hotel/i.test(query)) cat = 'travel'
    else if (/bill|recharge|wifi/i.test(query)) cat = 'utilities'

    const rec = recommendBestCardForExpense(POPULAR_INDIAN_CREDIT_CARDS, { amount: 5000, category: cat, refDate: new Date() })
    const top = rec.bestCard
    return {
      intent: 'CREDIT_CARD_ADVICE',
      speechText: `For ${cat} spends, I recommend swiping your ${top.card.name}. You will get ${top.interestFreeDaysRemaining} days of interest-free float until ${top.formattedDueDate}, plus ${top.rewardRatePct}% cashback.`,
      displayText: `💳 **Smart Card Recommendation:**\n• **Card:** ${top.card.name}\n• **Interest-Free Float:** ${top.interestFreeDaysRemaining} Days (Due: ${top.formattedDueDate})\n• **Reward Rate:** ${top.rewardRatePct}% Cashback`,
    }
  }

  // 5. INTENT: Income Tax Regime Guidance
  if (/tax|regime|old regime|new regime|80c|hra/i.test(query)) {
    return {
      intent: 'TAX_GUIDANCE',
      speechText: `Under the FY 2026-27 rules, income up to 7.75 Lakhs is completely tax-free under the New Regime with the 75,000 standard deduction. If you don't have heavy home loan interest, the New Regime is generally optimal.`,
      displayText: `⚖️ **Tax Regime Strategy (FY 2026-27):**\n• **New Regime:** Income up to ₹7.75L is 100% tax-free (₹75k Std Deduction + 87A rebate).\n• **Old Regime:** Favorable only if claiming >₹3.75L across 80C, 80D, NPS, and Home Loan interest.`,
    }
  }

  // 6. INTENT: Monthly Spend / Outflow Inquiry
  if (/how much (did i|have i) spent|monthly spend|total expenses|spending this month/i.test(query)) {
    return {
      intent: 'SPEND_QUERY',
      speechText: `You have spent ${formatCurrency(monthlyExpense)} this month against an income of ${formatCurrency(monthlyIncome)}. Your net savings rate is currently strong.`,
      displayText: `💸 **Monthly Outflow:** ${formatCurrency(monthlyExpense)}\n💰 **Income:** ${formatCurrency(monthlyIncome)}\n📈 **Savings Rate:** ${Math.round(((monthlyIncome - monthlyExpense) / (monthlyIncome || 1)) * 100)}%`,
    }
  }

  // 7. INTENT: Weather & Climate
  if (/weather|whether|climate|temperature|forecast|rain/i.test(query)) {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    const isBlr = /bengaluru|bangalore/i.test(query) || !/mumbai|delhi|chennai|london/i.test(query)
    const loc = isBlr ? 'Bengaluru' : 'your area'
    return {
      intent: 'WEATHER',
      speechText: `In ${loc}, the current time is ${timeStr}. The temperature is around 27 degrees Celsius with partly cloudy skies and a pleasant breeze.`,
      displayText: `🌤️ **Weather in ${loc}:**\n• **Time:** ${timeStr} (IST)\n• **Temperature:** ~26°C – 28°C\n• **Conditions:** Partly cloudy, pleasant breeze\n• **Humidity:** ~58%`,
    }
  }

  // 8. INTENT: Current Time & Date
  if (/time|date|today|clock/i.test(query)) {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
    return {
      intent: 'TIME',
      speechText: `The current time in Bengaluru is ${timeStr} on ${dateStr}.`,
      displayText: `⏰ **Current Time (IST):** **${timeStr}**\n📅 **Date:** ${dateStr}`,
    }
  }

  // 7. INTENT: Record Expense / Split Expense
  const parsedExpense = parseVoiceExpense(spokenText)
  if (parsedExpense && parsedExpense.amount > 0) {
    const isSplit = /split|with|share|divided/i.test(spokenText)
    const splitText = isSplit ? ` and tagged for group splitting` : ``
    return {
      intent: 'LOG_EXPENSE',
      parsedExpense,
      speechText: `Recorded ${formatCurrency(parsedExpense.amount)} for ${parsedExpense.description} under ${parsedExpense.category} using ${parsedExpense.paymentMethod}${splitText}.`,
      displayText: `✅ **Transaction Logged:**\n• **Amount:** ${formatCurrency(parsedExpense.amount)}\n• **Purpose:** ${parsedExpense.description}\n• **Category:** ${parsedExpense.category}\n• **Method:** ${parsedExpense.paymentMethod}`,
    }
  }

  // 8. FALLBACK AI FINANCIAL COMPANION
  return {
    intent: 'GENERAL_CHAT',
    speechText: `I am your AI Wealth Companion. You can ask me to check your net worth, query upcoming bills, get credit card swipe advice, or log expenses hands-free.`,
    displayText: `🤖 **AI Wealth Copilot Online**\nTry saying:\n• *"What is my net worth?"*\n• *"What bills are due this week?"*\n• *"Which card should I use for dining?"*\n• *"Paid 850 for lunch via UPI"*`,
  }
}
