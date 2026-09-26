/**
 * AMFI Live Mutual Fund API Client (mfapi.in)
 * Official open data feed for Indian Mutual Funds.
 */

const BASE_URL = 'https://api.mfapi.in/mf'

// Verified AMFI Scheme Code Dictionary for accurate price feeds
const VERIFIED_SCHEME_CODES = {
  'motilal oswal midcap fund direct growth': '127042',
  'motilal oswal midcap fund - direct plan - growth option': '127042',
  'quant small cap fund direct plan growth': '120828',
  'quant small cap fund - direct plan - growth option': '120828',
  'bandhan small cap fund direct growth': '147944',
  'bandhan small cap fund - direct plan - growth': '147944',
  'hdfc flexi cap direct plan growth': '118989',
  'hdfc flexi cap fund - direct plan - growth option': '118989',
  'nippon india growth mid cap fund direct growth': '118668',
  'nippon india growth mid cap fund - direct plan - growth option': '118668',
  'nippon india growth fund direct growth': '118668',
}

/**
 * Search all active Indian Mutual Fund schemes by keyword
 */
export async function searchMutualFunds(query) {
  if (!query || query.trim().length < 2) return []
  try {
    const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query.trim())}`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.warn('Mutual fund search failed:', err)
    return []
  }
}

/**
 * Fetch latest live NAV and 1-day previous NAV for an AMFI scheme code
 */
export async function getLatestNav(schemeCode) {
  if (!schemeCode) return null
  try {
    const res = await fetch(`${BASE_URL}/${schemeCode}`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.status === 'SUCCESS' && data.data && data.data.length > 0) {
      const latestEntry = data.data[0]
      const prevEntry = data.data.length > 1 ? data.data[1] : null
      const nav = parseFloat(latestEntry.nav)
      const prevNav = prevEntry ? parseFloat(prevEntry.nav) : nav
      const oneDayDiff = nav - prevNav
      const oneDayDiffPct = prevNav > 0 ? (oneDayDiff / prevNav) * 100 : 0

      return {
        schemeCode: data.meta?.scheme_code || schemeCode,
        schemeName: data.meta?.scheme_name || '',
        fundHouse: data.meta?.fund_house || '',
        category: data.meta?.scheme_category || data.meta?.scheme_type || 'Equity',
        nav: nav,
        date: latestEntry.date,
        prevNav: prevNav,
        prevDate: prevEntry?.date || null,
        oneDayDiff: oneDayDiff,
        oneDayDiffPct: oneDayDiffPct,
      }
    }
    return null
  } catch (err) {
    console.warn(`Failed to fetch NAV for ${schemeCode}:`, err)
    return null
  }
}

/**
 * Batch refresh NAVs for an array of mutual funds safely
 */
export async function refreshFundNavs(funds = []) {
  const updatedFunds = []

  for (const fund of funds) {
    let liveData = null
    const normName = (fund.scheme_name || '').toLowerCase().trim()
    const targetCode = fund.scheme_code || VERIFIED_SCHEME_CODES[normName]

    if (targetCode) {
      liveData = await getLatestNav(targetCode)
    }

    const units = parseFloat(fund.units || 0)
    const invested = parseFloat(fund.invested_amount || 0)

    if (liveData && liveData.nav > 0) {
      const avgNav = parseFloat(fund.avg_nav || fund.current_nav || 0)
      const ratio = avgNav > 0 ? liveData.nav / avgNav : 1
      const isReasonableNav = ratio >= 0.5 && ratio <= 2.0

      const effectiveNav = isReasonableNav ? liveData.nav : (parseFloat(fund.current_nav) || avgNav)
      const currentVal = units * effectiveNav
      const profitLoss = currentVal - invested
      const profitLossPct = invested > 0 ? ((profitLoss / invested) * 100) : 0
      const oneDayGain = units > 0 && liveData.oneDayDiff ? units * liveData.oneDayDiff : 0

      updatedFunds.push({
        ...fund,
        scheme_code: targetCode || fund.scheme_code,
        fund_house: liveData.fundHouse || fund.fund_house,
        category: liveData.category || fund.category,
        current_nav: effectiveNav,
        current_value: currentVal,
        profit_loss: profitLoss,
        profit_loss_pct: profitLossPct,
        one_day_gain: oneDayGain,
        one_day_gain_pct: liveData.oneDayDiffPct || 0,
        last_nav_date: liveData.date,
        last_updated: new Date().toISOString(),
      })
    } else {
      const currentNav = parseFloat(fund.current_nav || fund.avg_nav || 0)
      const currentVal = parseFloat(fund.current_value) || (units * currentNav) || invested

      updatedFunds.push({
        ...fund,
        current_value: currentVal,
        profit_loss: currentVal - invested,
        profit_loss_pct: invested > 0 ? ((currentVal - invested) / invested) * 100 : 0,
        one_day_gain: 0,
        one_day_gain_pct: 0,
      })
    }
  }

  return updatedFunds
}

// In-memory cache for historical NAV series
const HISTORICAL_CACHE = {}

/**
 * Fetch full historical NAV data series for a scheme from AMFI
 */
export async function getHistoricalNavSeries(schemeCode) {
  if (!schemeCode) return []
  if (HISTORICAL_CACHE[schemeCode]) return HISTORICAL_CACHE[schemeCode]

  try {
    const res = await fetch(`${BASE_URL}/${schemeCode}`)
    if (!res.ok) return []
    const data = await res.json()
    if (data.status === 'SUCCESS' && Array.isArray(data.data)) {
      HISTORICAL_CACHE[schemeCode] = data.data
      return data.data
    }
    return []
  } catch (err) {
    console.warn(`Failed to fetch historical NAV for ${schemeCode}:`, err)
    return []
  }
}

/**
 * Build historical portfolio timeline chart data like Groww (Invested vs Current Value)
 * @param {Array} funds
 * @param {String} timeframe - '1M' | '3M' | '6M' | '1Y' | 'ALL'
 * @param {String} filterSchemeCode - optional scheme code filter
 */
export async function buildPortfolioTimeline(funds = [], timeframe = '1Y', filterSchemeCode = null) {
  if (!funds || funds.length === 0) return []

  const activeFunds = funds.map(f => {
    const normName = (f.scheme_name || '').toLowerCase().trim()
    const code = f.scheme_code || VERIFIED_SCHEME_CODES[normName] || '127042'
    return { ...f, resolvedCode: String(code) }
  }).filter(f => !filterSchemeCode || String(f.resolvedCode) === String(filterSchemeCode))

  if (activeFunds.length === 0) return []

  const daysLimitMap = {
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
    'ALL': 1095,
  }
  const maxDays = daysLimitMap[timeframe] || 365

  const uniqueCodes = [...new Set(activeFunds.map(f => f.resolvedCode))]
  const histories = {}
  await Promise.all(uniqueCodes.map(async (code) => {
    histories[code] = await getHistoricalNavSeries(code)
  }))

  const dateNavMap = {}
  for (const code of uniqueCodes) {
    const series = (histories[code] || []).slice(0, maxDays + 30)
    for (const entry of series) {
      if (!dateNavMap[entry.date]) dateNavMap[entry.date] = {}
      dateNavMap[entry.date][code] = parseFloat(entry.nav)
    }
  }

  const parseDate = (dStr) => {
    if (!dStr) return 0
    const [d, m, y] = dStr.split('-').map(Number)
    return new Date(y, m - 1, d).getTime()
  }

  const allDates = Object.keys(dateNavMap).sort((a, b) => parseDate(a) - parseDate(b))
  if (allDates.length === 0) return []

  const nowTs = Date.now()
  const cutoffTs = nowTs - (maxDays * 24 * 60 * 60 * 1000)
  const windowDates = allDates.filter(d => parseDate(d) >= cutoffTs)
  const finalDates = windowDates.length > 5 ? windowDates : allDates.slice(-30)

  let step = 1
  if (timeframe === '3M') step = 2
  if (timeframe === '6M') step = 4
  if (timeframe === '1Y') step = 7
  if (timeframe === 'ALL') step = 15

  const totalInvested = activeFunds.reduce((s, f) => s + parseFloat(f.invested_amount || 0), 0)
  const latestTotalVal = activeFunds.reduce((s, f) => s + parseFloat(f.current_value || (f.units * f.current_nav) || 0), 0)

  const points = []
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  for (let i = 0; i < finalDates.length; i += step) {
    const dateStr = finalDates[i]
    let totalVal = 0

    for (const f of activeFunds) {
      const nav = dateNavMap[dateStr]?.[f.resolvedCode]
      if (nav && nav > 0) {
        totalVal += parseFloat(f.units || 0) * nav
      } else {
        totalVal += parseFloat(f.invested_amount || 0)
      }
    }

    const [dd, mm, yyyy] = dateStr.split('-')
    const label = `${parseInt(dd)} ${monthNames[parseInt(mm) - 1]}`
    const fullLabel = `${dd}/${mm}/${yyyy}`

    points.push({
      date: label,
      fullDate: fullLabel,
      timestamp: parseDate(dateStr),
      invested: Math.round(totalInvested),
      currentValue: Math.round(totalVal),
      profit: Math.round(totalVal - totalInvested),
      profitPct: totalInvested > 0 ? (((totalVal - totalInvested) / totalInvested) * 100).toFixed(2) : '0.00',
    })
  }

  const latestDateStr = finalDates[finalDates.length - 1]
  const [ld, lm, ly] = latestDateStr.split('-')
  points.push({
    date: `${parseInt(ld)} ${monthNames[parseInt(lm) - 1]}`,
    fullDate: `${ld}/${lm}/${ly}`,
    timestamp: parseDate(latestDateStr),
    invested: Math.round(totalInvested),
    currentValue: Math.round(latestTotalVal),
    profit: Math.round(latestTotalVal - totalInvested),
    profitPct: totalInvested > 0 ? (((latestTotalVal - totalInvested) / totalInvested) * 100).toFixed(2) : '0.00',
  })

  return points
}
export { VERIFIED_SCHEME_CODES }
