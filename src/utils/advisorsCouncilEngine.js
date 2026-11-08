/**
 * Multi-Agent Financial Board of Advisors Engine
 * Simulates a council of 3 autonomous AI financial personas debating dilemmas:
 * 1. Marcus: The Conservative Risk & Debt Auditor
 * 2. Aria: The Aggressive Wealth Compounding Architect
 * 3. Leo: The Realistic Lifestyle & Happiness Coach
 */

export const ADVISOR_PERSONAS = [
  {
    id: 'marcus',
    name: 'Marcus Vance',
    role: 'Chief Risk Officer & Debt Auditor',
    avatarBg: 'bg-slate-800 text-amber-400',
    philosophy: 'Capital preservation first. High-interest debt is a financial fire. Always protect the baseline.',
  },
  {
    id: 'aria',
    name: 'Aria Chen',
    role: 'Wealth Compounding Architect',
    avatarBg: 'bg-emerald-950 text-emerald-400',
    philosophy: 'Time in the market beats timing. Harness 12-15% equity compounding and eliminate idle cash drag.',
  },
  {
    id: 'leo',
    name: 'Leo Morales',
    role: 'Sustainable Lifestyle Coach',
    avatarBg: 'bg-blue-950 text-cyan-400',
    philosophy: 'Austerity leads to budget bingeing. Plan for joy and guilt-free spending without derailing the future.',
  },
]

export const PRESET_DILEMMAS = [
  {
    id: 'phone_emi',
    question: 'Should I buy a ₹1,20,000 phone on 12-month No-Cost EMI or invest that money?',
  },
  {
    id: 'home_loan_vs_sip',
    question: 'Should I aggressively prepay my 8.6% home loan or increase my Equity Mutual Fund SIPs?',
  },
  {
    id: 'vacation_splurge',
    question: 'Can I afford a ₹1,50,000 international trip this year without hurting my retirement goals?',
  },
  {
    id: 'emergency_size',
    question: 'Is a 3-month emergency fund enough, or should I hold 6 months in liquid fixed deposits?',
  },
]

/**
 * Evaluates a dilemma through the 3 distinct advisor lenses
 */
export function debateFinancialDilemma({ dilemma, context = {} }) {
  const q = dilemma.toLowerCase()
  const monthlyIncome = context.monthlyIncome || 85000
  const netSavings = context.netSavings || 64000
  const totalDebt = context.totalDebt || 0

  let marcusArgument = ''
  let ariaArgument = ''
  let leoArgument = ''
  let consensus = ''
  let verdictScore = 'PROCEED_WITH_GUARDRAILS' // 'APPROVED' | 'PROCEED_WITH_GUARDRAILS' | 'REJECTED'

  if (q.includes('phone') || q.includes('iphone') || q.includes('gadget') || q.includes('emi')) {
    marcusArgument = `No-cost EMIs carry hidden processing fees and 18% GST on interest components. If your outstanding liabilities exceed 30% of income, adding a ₹10,000/month recurring commitment narrows your safety buffer. I vote REJECT unless paid in full without financing.`
    ariaArgument = `A ₹1.2L phone depreciates 40% in year one. If you invest that ₹10,000/month into a Nifty 50 Index Fund at 12% CAGR, it compounds to ₹1.82 Lakhs in 12 months with step-up. The opportunity cost over 5 years is ₹8.2 Lakhs! Consider a certified refurbished model.`
    leoArgument = `Phones are daily productivity tools used 6+ hours a day. Rather than taking a 12-month debt liability, create a dedicated 'Gadget Upgrade' envelope of ₹15,000/month for 8 months. Pay upfront in cash and earn 5% credit card cashback cleanly.`
    consensus = `Consensus: Avoid the 12-month EMI. Wait 4 to 6 months using a dedicated savings envelope, then purchase with a high-reward credit card paid in full on statement generation.`
    verdictScore = 'PROCEED_WITH_GUARDRAILS'
  } else if (q.includes('home loan') || q.includes('prepay') || q.includes('prepayment')) {
    marcusArgument = `An 8.6% home loan interest rate is a guaranteed, risk-free post-tax return when prepaid. Eliminating home debt provides immense psychological security and reduces monthly fixed obligations.`
    ariaArgument = `Equity mutual funds historically generate 12-14% over 7+ year horizons. With Sec 24(b) ₹2 Lakh tax deduction on home loan interest, your effective loan cost is ~6.5%. Diverting prepayment into Small/Mid-Cap SIPs will yield ₹15-25 Lakhs more wealth over 15 years.`
    leoArgument = `Why choose strictly one extreme? Split the surplus: allocate 50% toward 1 extra principal repayment per year, and 50% into a compounding Equity SIP. You get both freedom and compounding.`
    consensus = `Consensus: Implement the 50/50 Dual Strategy. Pay 1 extra EMI per year towards principal (cutting tenure by ~5 years) while maintaining full active equity mutual fund SIPs.`
    verdictScore = 'APPROVED'
  } else if (q.includes('trip') || q.includes('vacation') || q.includes('holiday')) {
    marcusArgument = `Before booking international travel, verify you have at least 6 months of living expenses in emergency liquid funds. If this trip requires dipping into reserves, wait.`
    ariaArgument = `If the ₹1.5L is already saved in a dedicated travel bucket, go! Do not liquidate long-term compounding investments or pause active SIPs to fund leisure.`
    leoArgument = `Travel builds memories and recharges productivity. Set up an automated 'Sinking Vacation Envelope' of ₹12,500/month so you travel completely guilt-free with zero credit card rollover.`
    consensus = `Consensus: Travel is approved provided zero long-term investments are broken. Fund it via an automated 12-month travel sinking fund and utilize zero-forex credit cards.`
    verdictScore = 'APPROVED'
  } else {
    marcusArgument = `Ensure all actions preserve a 6-month liquid runway and prioritize clearing any liabilities with APR > 10% before taking new financial steps.`
    ariaArgument = `Evaluate the annualized opportunity cost. Every rupee committed to non-compounding assets must be justified against a 12% hurdle rate.`
    leoArgument = `Ensure the plan is sustainable. Financial plans that restrict everyday joy inevitably fail. Maintain a dedicated 30% 'Wants' allowance.`
    consensus = `Consensus: Proceed with balanced guardrails. Keep emergency reserves liquid, automate 20% to equity compounding, and spend the remaining balance without guilt.`
    verdictScore = 'PROCEED_WITH_GUARDRAILS'
  }

  return {
    dilemma,
    advisors: [
      { ...ADVISOR_PERSONAS[0], argument: marcusArgument },
      { ...ADVISOR_PERSONAS[1], argument: ariaArgument },
      { ...ADVISOR_PERSONAS[2], argument: leoArgument },
    ],
    consensus,
    verdictScore,
  }
}
