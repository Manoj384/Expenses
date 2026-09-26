/**
 * Parse Groww Excel (.xlsx / .xls) file binary buffer or ArrayBuffer
 */
export async function parseGrowwExcel(arrayBuffer) {
  if (!arrayBuffer) return []
  try {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('holding')) || workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    const holdings = []
    let headerFound = false
    let idxScheme = 0, idxAmc = 1, idxCat = 2, idxSubCat = 3, idxFolio = 4
    let idxUnits = 6, idxInvested = 7, idxCurrent = 8, idxReturns = 9, idxXirr = 10

    for (const r of rows) {
      if (!r || !r.length) continue

      // Check for Header row
      const firstCell = String(r[0] || '').trim()
      if (firstCell.toLowerCase() === 'scheme name') {
        headerFound = true
        // Dynamically match column indices
        r.forEach((col, idx) => {
          const c = String(col || '').toLowerCase()
          if (c.includes('scheme')) idxScheme = idx
          if (c.includes('amc') || c.includes('fund house')) idxAmc = idx
          if (c === 'category') idxCat = idx
          if (c.includes('sub-category') || c.includes('sub category')) idxSubCat = idx
          if (c.includes('folio')) idxFolio = idx
          if (c.includes('unit') || c.includes('qty')) idxUnits = idx
          if (c.includes('invested')) idxInvested = idx
          if (c.includes('current')) idxCurrent = idx
          if (c.includes('return')) idxReturns = idx
          if (c.includes('xirr')) idxXirr = idx
        })
        continue
      }

      if (headerFound && r[idxScheme] && String(r[idxScheme]).trim()) {
        const name = String(r[idxScheme]).trim()
        if (name.toLowerCase().includes('total')) continue

        const amc = String(r[idxAmc] || '').trim()
        const cat = r[idxSubCat] ? `${r[idxCat]} - ${r[idxSubCat]}` : String(r[idxCat] || 'Equity')
        const folio = String(r[idxFolio] || '').trim()

        const cleanNum = (val) => {
          if (val === undefined || val === null) return 0
          const s = String(val).replace(/[₹,\s]/g, '')
          const n = parseFloat(s)
          return isNaN(n) ? 0 : n
        }

        const units = cleanNum(r[idxUnits])
        const invested = cleanNum(r[idxInvested])
        const current = cleanNum(r[idxCurrent])
        const returns = cleanNum(r[idxReturns]) || (current - invested)
        const xirr = String(r[idxXirr] || '').trim()

        const avgNav = units > 0 ? invested / units : 0
        const currentNav = units > 0 ? current / units : 0

        if (name && (units > 0 || invested > 0)) {
          holdings.push({
            scheme_name: name,
            fund_house: amc,
            category: cat,
            folio_number: folio || null,
            units: parseFloat(units.toFixed(4)),
            avg_nav: parseFloat(avgNav.toFixed(4)),
            invested_amount: parseFloat(invested.toFixed(2)),
            current_nav: parseFloat(currentNav.toFixed(4)),
            current_value: parseFloat(current.toFixed(2)),
            returns: parseFloat(returns.toFixed(2)),
            xirr: xirr,
          })
        }
      }
    }

    return holdings
  } catch (err) {
    console.error('Failed to parse Groww Excel:', err)
    return []
  }
}

/**
 * Parse Groww CSV / TSV text
 */
export function parseGrowwCsv(csvText) {
  if (!csvText || !csvText.trim()) return []

  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headerLine = lines[0]
  const headers = headerLine.split(/,|\t/).map(h => h.trim().toLowerCase().replace(/['"]/g, ''))

  const findCol = (candidates) => headers.findIndex(h => candidates.some(c => h.includes(c)))

  const idxScheme = findCol(['scheme', 'fund name', 'security', 'instrument', 'name'])
  const idxUnits = findCol(['unit', 'qty', 'quantity', 'balance'])
  const idxInvested = findCol(['invested', 'investment', 'cost', 'buy value', 'amount'])
  const idxAvgNav = findCol(['avg nav', 'average nav', 'buy nav', 'avg price'])
  const idxCurrentVal = findCol(['current val', 'market val', 'present val', 'current value'])
  const idxFolio = findCol(['folio', 'account'])
  const idxCategory = findCol(['category', 'asset', 'type'])

  const results = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const row = line.match(/(".*?"|[^",\t]+)(?=\s*[,|\t]|\s*$)/g)?.map(v => v.trim().replace(/^"|"$/g, '')) || line.split(/,|\t/)
    if (row.length < 2) continue

    const schemeName = idxScheme >= 0 ? row[idxScheme] : row[0]
    if (!schemeName || schemeName.toLowerCase().includes('total') || schemeName.length < 3) continue

    const cleanNum = (str) => {
      if (!str) return 0
      const s = String(str).replace(/[₹,\s]/g, '')
      const num = parseFloat(s)
      return isNaN(num) ? 0 : num
    }

    const units = cleanNum(idxUnits >= 0 ? row[idxUnits] : '0')
    let invested = cleanNum(idxInvested >= 0 ? row[idxInvested] : '0')
    let avgNav = cleanNum(idxAvgNav >= 0 ? row[idxAvgNav] : '0')
    const currentVal = cleanNum(idxCurrentVal >= 0 ? row[idxCurrentVal] : '0')
    const folio = idxFolio >= 0 ? row[idxFolio] : ''
    const category = idxCategory >= 0 ? row[idxCategory] : 'Equity'

    if (avgNav > 0 && units > 0 && invested === 0) invested = units * avgNav
    else if (invested > 0 && units > 0 && avgNav === 0) avgNav = invested / units

    if (schemeName && (units > 0 || invested > 0)) {
      results.push({
        scheme_name: schemeName.trim(),
        units: units,
        avg_nav: avgNav,
        invested_amount: invested,
        current_value: currentVal > 0 ? currentVal : invested,
        folio_number: folio.trim() || null,
        category: category.trim() || 'Equity',
      })
    }
  }

  return results
}

