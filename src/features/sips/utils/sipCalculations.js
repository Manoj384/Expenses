/**
 * sipCalculations.js
 * Calculation helpers and scheme normalization for SIPs & Mutual Funds
 */

export function getSchemeGroupKey(name) {
  if (!name) return ''
  const clean = String(name).toLowerCase().replace(/[^a-z0-9]/g, ' ')
  const words = clean.split(/\s+/).filter(Boolean)
  const house = words[0] || 'fund'

  let cap = 'general'
  if (clean.includes('small')) cap = 'small_cap'
  else if (clean.includes('mid')) cap = 'mid_cap'
  else if (clean.includes('flexi')) cap = 'flexi_cap'
  else if (clean.includes('large')) cap = 'large_cap'
  else if (clean.includes('elss') || clean.includes('tax')) cap = 'elss'
  else if (words[1]) cap = words[1]

  return `${house}_${cap}`
}

export function aggregateMatchingMutualFunds(sipName, mfList) {
  if (!sipName || !Array.isArray(mfList) || mfList.length === 0) return null

  const targetKey = getSchemeGroupKey(sipName)
  const normSip = sipName.toLowerCase().trim()
  const firstWord = normSip.split(/\s+/)[0]

  const matched = mfList.filter((m) => {
    const mfKey = getSchemeGroupKey(m.scheme_name)
    if (mfKey && targetKey && mfKey === targetKey) return true

    const normMf = (m.scheme_name || '').toLowerCase().trim()
    if (normMf.includes(normSip) || normSip.includes(normMf)) return true
    if (firstWord && normMf.startsWith(firstWord)) {
      if (normSip.includes('small') && normMf.includes('small')) return true
      if (normSip.includes('mid') && normMf.includes('mid')) return true
      if (normSip.includes('flexi') && normMf.includes('flexi')) return true
    }
    return false
  })

  if (matched.length === 0) return null

  const totalInvested = matched.reduce((sum, m) => sum + Number(m.invested_amount || 0), 0)
  const totalUnits = matched.reduce((sum, m) => sum + Number(m.units || 0), 0)
  const primary = matched[0]
  const liveNav = Number(primary.current_nav || primary.avg_nav || 100)
  const totalVal = matched.reduce((sum, m) => {
    const u = Number(m.units || 0)
    const n = Number(m.current_nav || liveNav)
    return sum + (Number(m.current_value) || (u * n) || 0)
  }, 0)

  const avgNav = totalUnits > 0 ? totalInvested / totalUnits : Number(primary.avg_nav || liveNav)
  const returns = totalVal - totalInvested

  return {
    id: primary.id || `merged_${targetKey}`,
    scheme_name: primary.scheme_name,
    category: primary.category || 'Equity',
    fund_house: primary.fund_house,
    current_nav: liveNav,
    avg_nav: avgNav,
    units: parseFloat(totalUnits.toFixed(3)),
    invested_amount: parseFloat(totalInvested.toFixed(2)),
    current_value: parseFloat(totalVal.toFixed(2)),
    returns: parseFloat(returns.toFixed(2)),
    oneDayDiff: primary.oneDayDiff || 0,
    oneDayDiffPct: primary.oneDayDiffPct !== undefined ? primary.oneDayDiffPct : 0.32,
    folio_number: matched.map((m) => m.folio_number).filter(Boolean).join(', '),
    matchedCount: matched.length,
  }
}
