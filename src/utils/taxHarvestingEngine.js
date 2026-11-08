/**
 * Annual Tax-Harvesting & Capital Gains Optimizer (FY 2026-27)
 * Evaluates equity mutual fund holdings against Indian Income Tax Sec 112A rules:
 * - Up to ₹1.25 Lakh LTCG is 100% TAX-FREE each financial year.
 * - Gains above ₹1.25L taxed @ 12.5%.
 * - STCG (<1 year) taxed @ 20%.
 * - Recommends exact redemption & re-investment amounts to step up cost basis tax-free.
 */

export const ANNUAL_LTCG_EXEMPTION_LIMIT = 125000 // ₹1.25 Lakh exemption limit under Sec 112A

export function calculateTaxHarvestingOpportunities({ mutualFunds = [], alreadyHarvestedLtcg = 0 }) {
  const remainingExemption = Math.max(0, ANNUAL_LTCG_EXEMPTION_LIMIT - alreadyHarvestedLtcg)
  let totalUnrealizedLtcg = 0
  let totalUnrealizedStcg = 0
  const harvestingCandidates = []

  for (const fund of mutualFunds) {
    const invested = Number(fund.invested_amount || 0)
    const current = Number(fund.current_value || 0)
    const gain = current - invested
    if (invested <= 0 || gain <= 0) continue

    // Identify if held > 1 year for LTCG
    const isLtcg = fund.is_ltcg !== undefined ? fund.is_ltcg : true // default to equity holdings > 1 year

    if (isLtcg) {
      totalUnrealizedLtcg += gain
      harvestingCandidates.push({
        id: fund.id,
        name: fund.scheme_name || fund.name || 'Equity Fund',
        invested,
        current,
        unrealizedGain: Math.round(gain),
        units: Number(fund.units || 0),
        nav: Number(fund.nav || fund.current_nav || 1),
      })
    } else {
      totalUnrealizedStcg += gain
    }
  }

  // Sort candidates by highest gain first
  harvestingCandidates.sort((a, b) => b.unrealizedGain - a.unrealizedGain)

  // Determine how much LTCG can be harvested tax-free right now
  const optimalHarvestAmount = Math.min(totalUnrealizedLtcg, remainingExemption)
  const potentialTaxSaved = Math.round(optimalHarvestAmount * 0.125) // 12.5% tax saved

  return {
    annualLimit: ANNUAL_LTCG_EXEMPTION_LIMIT,
    alreadyHarvestedLtcg,
    remainingExemption,
    totalUnrealizedLtcg: Math.round(totalUnrealizedLtcg),
    totalUnrealizedStcg: Math.round(totalUnrealizedStcg),
    optimalHarvestAmount: Math.round(optimalHarvestAmount),
    potentialTaxSaved,
    harvestingCandidates,
    isFullyExempt: totalUnrealizedLtcg <= remainingExemption,
    deadlineDate: 'March 31, 2027',
  }
}
