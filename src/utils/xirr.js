/**
 * Calculates the Internal Rate of Return for a non-periodic schedule of cash flows (XIRR).
 * Uses Newton-Raphson method with fallback to bisection for numerical stability.
 *
 * @param {Array<{ amount: number, date: Date | string }>} cashFlows
 *   Amounts: negative for investments / outflows, positive for current valuation / inflows.
 * @param {number} [guess=0.1] Initial guess for rate (e.g. 0.1 for 10%)
 * @returns {number|null} Annualized rate as a percentage (e.g., 14.5 for 14.5%) or null if cannot converge.
 */
export function calculateXIRR(cashFlows, guess = 0.1) {
  if (!cashFlows || cashFlows.length < 2) return null

  // Normalize dates and amounts
  const flows = cashFlows
    .map(cf => ({
      amount: Number(cf.amount),
      date: typeof cf.date === 'string' ? new Date(cf.date) : cf.date,
    }))
    .filter(cf => !isNaN(cf.amount) && cf.date instanceof Date && !isNaN(cf.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  if (flows.length < 2) return null

  const hasPositive = flows.some(f => f.amount > 0)
  const hasNegative = flows.some(f => f.amount < 0)
  if (!hasPositive || !hasNegative) return null

  const startDate = flows[0].date

  // Net Present Value function: f(r) = sum( amount_i / (1 + r)^( (d_i - d_0) / 365 ) )
  function xnpv(rate) {
    let sum = 0
    for (let i = 0; i < flows.length; i++) {
      const days = (flows[i].date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      const fractionYears = days / 365
      // Prevent division by zero or negative base with non-integer exponent
      if (1 + rate <= 0) return NaN
      sum += flows[i].amount / Math.pow(1 + rate, fractionYears)
    }
    return sum
  }

  // Derivative of XNPV: f'(r) = sum( -fractionYears * amount_i / (1 + r)^( fractionYears + 1 ) )
  function xnpvPrime(rate) {
    let sum = 0
    for (let i = 0; i < flows.length; i++) {
      const days = (flows[i].date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      const fractionYears = days / 365
      if (1 + rate <= 0) return NaN
      sum += (-fractionYears * flows[i].amount) / Math.pow(1 + rate, fractionYears + 1)
    }
    return sum
  }

  let rate = guess
  const maxIterations = 100
  const tolerance = 1e-6

  // 1. Try Newton-Raphson method
  for (let i = 0; i < maxIterations; i++) {
    const fValue = xnpv(rate)
    const fPrimeValue = xnpvPrime(rate)

    if (isNaN(fValue) || isNaN(fPrimeValue) || Math.abs(fPrimeValue) < 1e-12) {
      break
    }

    const nextRate = rate - fValue / fPrimeValue

    if (Math.abs(nextRate - rate) < tolerance) {
      return Number((nextRate * 100).toFixed(2))
    }

    rate = nextRate
  }

  // 2. Fallback: Bisection search between -0.99 and 5.0 (up to 500% return)
  let low = -0.99
  let high = 5.0
  let fLow = xnpv(low)
  let fHigh = xnpv(high)

  if (isNaN(fLow) || isNaN(fHigh) || fLow * fHigh > 0) {
    // Simple CAGR approximation as last resort fallback
    const totalInvested = Math.abs(flows.filter(f => f.amount < 0).reduce((s, f) => s + f.amount, 0))
    const totalCurrent = flows.filter(f => f.amount > 0).reduce((s, f) => s + f.amount, 0)
    const lastDate = flows[flows.length - 1].date
    const years = Math.max((lastDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365), 0.1)

    if (totalInvested > 0 && totalCurrent > 0) {
      const cagr = (Math.pow(totalCurrent / totalInvested, 1 / years) - 1) * 100
      return Number(cagr.toFixed(2))
    }
    return null
  }

  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2
    const fMid = xnpv(mid)

    if (Math.abs(fMid) < tolerance || (high - low) / 2 < tolerance) {
      return Number((mid * 100).toFixed(2))
    }

    if (fLow * fMid < 0) {
      high = mid
      fHigh = fMid
    } else {
      low = mid
      fLow = fMid
    }
  }

  return Number(((low + high) / 2 * 100).toFixed(2))
}

/**
 * Calculates SIP Step-Up wealth projection.
 *
 * @param {number} monthlySip Initial monthly SIP in INR
 * @param {number} annualStepUpPct Percentage to increase SIP every year (e.g. 10%)
 * @param {number} expectedReturnPct Expected annual return rate (e.g. 12%)
 * @param {number} years Number of years to project
 */
export function projectSipStepUp(monthlySip, annualStepUpPct, expectedReturnPct, years) {
  let totalInvested = 0
  let portfolioValue = 0
  let currentSip = monthlySip
  const monthlyRate = expectedReturnPct / 100 / 12
  const yearlyBreakdown = []

  for (let year = 1; year <= years; year++) {
    for (let m = 1; m <= 12; m++) {
      totalInvested += currentSip
      portfolioValue = (portfolioValue + currentSip) * (1 + monthlyRate)
    }

    yearlyBreakdown.push({
      year,
      monthlySip: Math.round(currentSip),
      investedAmount: Math.round(totalInvested),
      projectedValue: Math.round(portfolioValue),
      wealthGain: Math.round(portfolioValue - totalInvested),
    })

    currentSip *= 1 + annualStepUpPct / 100
  }

  return {
    totalInvested: Math.round(totalInvested),
    projectedValue: Math.round(portfolioValue),
    wealthGain: Math.round(portfolioValue - totalInvested),
    yearlyBreakdown,
  }
}
