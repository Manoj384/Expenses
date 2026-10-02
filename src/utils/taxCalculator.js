/**
 * Indian Income Tax Calculator Engine (FY 2026-27 / AY 2027-28)
 * Compares Old Tax Regime vs New Tax Regime (Section 115BAC)
 */

export function calculateHraExemption({ basicSalary = 0, da = 0, hraReceived = 0, rentPaid = 0, isMetro = false }) {
  const salary = Number(basicSalary || 0) + Number(da || 0)
  if (salary <= 0 || rentPaid <= 0 || hraReceived <= 0) return 0

  const actualHra = Number(hraReceived)
  const excessRent = Math.max(0, Number(rentPaid) - 0.10 * salary)
  const salaryPercent = isMetro ? 0.50 * salary : 0.40 * salary

  const exemption = Math.min(actualHra, excessRent, salaryPercent)
  return Math.max(0, Math.round(exemption))
}

export function calculateOldRegimeTax(grossIncome, deductions = {}) {
  const gross = Math.max(0, Number(grossIncome || 0))
  const stdDeduction = deductions.isSalaried !== false ? 50000 : 0

  const sec80C = Math.min(150000, Math.max(0, Number(deductions.sec80C || 0)))
  const sec80D = Math.min(100000, Math.max(0, Number(deductions.sec80D || 0))) // self + parents
  const sec80CCD1B = Math.min(50000, Math.max(0, Number(deductions.sec80CCD1B || 0))) // NPS additional
  const sec24HomeLoan = Math.min(200000, Math.max(0, Number(deductions.sec24HomeLoan || 0)))
  const hraExemption = Math.max(0, Number(deductions.hraExemption || 0))
  const otherDeductions = Math.max(0, Number(deductions.otherDeductions || 0)) // 80E, 80TTA, etc.

  const totalDeductions = stdDeduction + sec80C + sec80D + sec80CCD1B + sec24HomeLoan + hraExemption + otherDeductions
  const taxableIncome = Math.max(0, gross - totalDeductions)

  let baseTax = 0
  if (taxableIncome <= 250000) {
    baseTax = 0
  } else if (taxableIncome <= 500000) {
    baseTax = (taxableIncome - 250000) * 0.05
  } else if (taxableIncome <= 1000000) {
    baseTax = 12500 + (taxableIncome - 500000) * 0.20
  } else {
    baseTax = 12500 + 100000 + (taxableIncome - 1000000) * 0.30
  }

  // Section 87A Rebate: full rebate if taxable income <= 5,00,000
  let rebate87A = 0
  if (taxableIncome <= 500000) {
    rebate87A = baseTax
    baseTax = 0
  }

  const taxAfterRebate = Math.max(0, baseTax)
  const cess = Math.round(taxAfterRebate * 0.04)
  const totalTax = taxAfterRebate + cess

  return {
    regime: 'Old Regime',
    grossIncome: gross,
    standardDeduction: stdDeduction,
    totalDeductions,
    taxableIncome,
    baseTax,
    rebate87A,
    cess,
    totalTax,
    effectiveRate: gross > 0 ? ((totalTax / gross) * 100).toFixed(2) : 0,
    monthlyTakeHome: Math.max(0, Math.round((gross - totalTax) / 12)),
    breakdown: {
      stdDeduction,
      sec80C,
      sec80D,
      sec80CCD1B,
      sec24HomeLoan,
      hraExemption,
      otherDeductions,
    },
  }
}

export function calculateNewRegimeTax(grossIncome, deductions = {}) {
  const gross = Math.max(0, Number(grossIncome || 0))
  const stdDeduction = deductions.isSalaried !== false ? 75000 : 0
  const employerNps80CCD2 = Math.max(0, Number(deductions.employerNps80CCD2 || 0)) // allowed in new regime

  const totalDeductions = stdDeduction + employerNps80CCD2
  const taxableIncome = Math.max(0, gross - totalDeductions)

  // Slabs FY 2026-27 (Sec 115BAC):
  // 0 - 3,00,000: 0%
  // 3,00,001 - 7,00,000: 5%
  // 7,00,001 - 10,00,000: 10%
  // 10,00,001 - 12,00,000: 15%
  // 12,00,001 - 15,00,000: 20%
  // Above 15,00,000: 30%

  let baseTax = 0
  if (taxableIncome <= 300000) {
    baseTax = 0
  } else if (taxableIncome <= 700000) {
    baseTax = (taxableIncome - 300000) * 0.05
  } else if (taxableIncome <= 1000000) {
    baseTax = 20000 + (taxableIncome - 700000) * 0.10
  } else if (taxableIncome <= 1200000) {
    baseTax = 20000 + 30000 + (taxableIncome - 1000000) * 0.15
  } else if (taxableIncome <= 1500000) {
    baseTax = 20000 + 30000 + 30000 + (taxableIncome - 1200000) * 0.20
  } else {
    baseTax = 20000 + 30000 + 30000 + 60000 + (taxableIncome - 1500000) * 0.30
  }

  // Section 87A Rebate in New Regime: NIL tax up to ₹7,00,000 taxable income (₹7.75L gross for salaried)
  let rebate87A = 0
  if (taxableIncome <= 700000) {
    rebate87A = baseTax
    baseTax = 0
  } else if (taxableIncome > 700000 && taxableIncome <= 727777) {
    // Marginal Relief under section 87A for New Regime
    const excessIncome = taxableIncome - 700000
    if (baseTax > excessIncome) {
      rebate87A = baseTax - excessIncome
      baseTax = excessIncome
    }
  }

  const taxAfterRebate = Math.max(0, baseTax)
  const cess = Math.round(taxAfterRebate * 0.04)
  const totalTax = taxAfterRebate + cess

  return {
    regime: 'New Regime (FY 2026-27)',
    grossIncome: gross,
    standardDeduction: stdDeduction,
    totalDeductions,
    taxableIncome,
    baseTax,
    rebate87A,
    cess,
    totalTax,
    effectiveRate: gross > 0 ? ((totalTax / gross) * 100).toFixed(2) : 0,
    monthlyTakeHome: Math.max(0, Math.round((gross - totalTax) / 12)),
    breakdown: {
      stdDeduction,
      employerNps80CCD2,
    },
  }
}

export function compareTaxRegimes(grossIncome, deductions = {}) {
  const oldRegime = calculateOldRegimeTax(grossIncome, deductions)
  const newRegime = calculateNewRegimeTax(grossIncome, deductions)

  const diff = oldRegime.totalTax - newRegime.totalTax
  const recommended = diff > 0 ? 'New Regime' : diff < 0 ? 'Old Regime' : 'Either (Same Tax)'
  const savings = Math.abs(diff)

  return {
    oldRegime,
    newRegime,
    recommended,
    savings,
    monthlySavings: Math.round(savings / 12),
  }
}
