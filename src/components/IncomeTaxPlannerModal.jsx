import { useState, useMemo } from 'react'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import { compareTaxRegimes, calculateHraExemption } from '../utils/taxCalculator'
import {
  Calculator,
  Sparkles,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  HelpCircle,
  Download,
  Printer,
  ShieldCheck,
  Building2,
  Wallet,
  ArrowRight,
  Info,
} from 'lucide-react'

const SALARY_PRESETS = [
  { label: '₹6 LPA', gross: 600000, basic: 300000, hra: 120000, rent: 10000, sec80C: 50000, sec80D: 15000 },
  { label: '₹12 LPA', gross: 1200000, basic: 600000, hra: 240000, rent: 20000, sec80C: 150000, sec80D: 25000, sec80CCD1B: 50000 },
  { label: '₹20 LPA', gross: 2000000, basic: 1000000, hra: 400000, rent: 35000, sec80C: 150000, sec80D: 50000, sec80CCD1B: 50000, sec24: 200000 },
  { label: '₹35 LPA', gross: 3500000, basic: 1750000, hra: 700000, rent: 50000, sec80C: 150000, sec80D: 75000, sec80CCD1B: 50000, sec24: 200000 },
]

export default function IncomeTaxPlannerModal({ isOpen, onClose, isEmbedded = false }) {
  const [isSalaried, setIsSalaried] = useState(true)
  const [grossSalary, setGrossSalary] = useState(1500000)
  const [basicSalary, setBasicSalary] = useState(750000)
  const [hraReceived, setHraReceived] = useState(300000)
  const [monthlyRent, setMonthlyRent] = useState(25000)
  const [isMetro, setIsMetro] = useState(true)

  // Old Regime Deductions
  const [sec80C, setSec80C] = useState(150000)
  const [sec80D, setSec80D] = useState(25000)
  const [sec80CCD1B, setSec80CCD1B] = useState(50000)
  const [sec24HomeLoan, setSec24HomeLoan] = useState(0)
  const [employerNps, setEmployerNps] = useState(0)
  const [otherDeductions, setOtherDeductions] = useState(0)

  // Auto HRA Exemption
  const annualRentPaid = Number(monthlyRent || 0) * 12
  const hraExemption = useMemo(() => {
    return calculateHraExemption({
      basicSalary,
      hraReceived,
      rentPaid: annualRentPaid,
      isMetro,
    })
  }, [basicSalary, hraReceived, annualRentPaid, isMetro])

  // Tax computation
  const comparison = useMemo(() => {
    return compareTaxRegimes(grossSalary, {
      isSalaried,
      sec80C,
      sec80D,
      sec80CCD1B,
      sec24HomeLoan,
      hraExemption,
      employerNps80CCD2: employerNps,
      otherDeductions,
    })
  }, [grossSalary, isSalaried, sec80C, sec80D, sec80CCD1B, sec24HomeLoan, hraExemption, employerNps, otherDeductions])

  const { oldRegime, newRegime, recommended, savings, monthlySavings } = comparison

  const applyPreset = (p) => {
    setGrossSalary(p.gross)
    setBasicSalary(p.basic)
    setHraReceived(p.hra)
    setMonthlyRent(p.rent)
    setSec80C(p.sec80C || 0)
    setSec80D(p.sec80D || 0)
    setSec80CCD1B(p.sec80CCD1B || 0)
    setSec24HomeLoan(p.sec24 || 0)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Modal isOpen={isOpen} isEmbedded={isEmbedded} onClose={onClose} title="FY 2026-27 Income Tax Regime Planner (Old vs New)" size="2xl">
      <div className="space-y-6 text-xs print:p-0">
        {/* Preset Selector */}
        <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">Quick Salary Presets:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {SALARY_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                  grossSalary === p.gross
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600 hover:bg-gray-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Highlight Winner Recommendation Banner */}
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
          recommended.includes('New')
            ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100'
            : recommended.includes('Old')
            ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-950 dark:text-blue-100'
            : 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 text-purple-900 dark:text-purple-100'
        }`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
              <span className="font-extrabold text-sm uppercase tracking-wide">
                Optimal Choice: {recommended}
              </span>
            </div>
            <p className="text-xs opacity-90">
              {savings > 0 ? (
                <>
                  Switching to <strong>{recommended}</strong> saves you <strong className="text-emerald-700 dark:text-emerald-300 font-extrabold">{formatCurrency(savings)}</strong> annually (~<strong className="text-emerald-700 dark:text-emerald-300 font-extrabold">{formatCurrency(monthlySavings)}/mo</strong> extra in take-home pay).
                </>
              ) : (
                'Both regimes yield the exact same tax liability for your current income profile.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5" /> Print Plan
            </button>
          </div>
        </div>

        {/* 2-Column Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* New Regime Card */}
          <div className={`card p-4 relative overflow-hidden transition-all ${
            recommended.includes('New')
              ? 'ring-2 ring-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10'
              : 'opacity-90'
          }`}>
            {recommended.includes('New') && (
              <span className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Recommended
              </span>
            )}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-black text-gray-900 dark:text-white">New Tax Regime (u/s 115BAC)</h4>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">Default Regime (FY 2026-27 Slabs + ₹75k Std Deduction)</p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-slate-800">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Gross Income:</span>
                  <strong className="text-gray-800 dark:text-slate-200">{formatCurrency(newRegime.grossIncome)}</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Standard Deduction:</span>
                  <span className="text-emerald-600 font-semibold">-{formatCurrency(newRegime.standardDeduction)}</span>
                </div>
                {newRegime.breakdown.employerNps80CCD2 > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Employer NPS (80CCD 2):</span>
                    <span className="text-emerald-600 font-semibold">-{formatCurrency(newRegime.breakdown.employerNps80CCD2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-semibold pt-1 border-t border-dashed border-gray-200 dark:border-slate-700">
                  <span className="text-gray-700 dark:text-slate-300">Taxable Net Income:</span>
                  <strong className="text-gray-900 dark:text-white">{formatCurrency(newRegime.taxableIncome)}</strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/70 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Base Tax:</span>
                  <span>{formatCurrency(newRegime.baseTax)}</span>
                </div>
                {newRegime.rebate87A > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Rebate u/s 87A:</span>
                    <span>-{formatCurrency(newRegime.rebate87A)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Health & Edu Cess (4%):</span>
                  <span>{formatCurrency(newRegime.cess)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-gray-200 dark:border-slate-700 text-sm font-extrabold text-gray-900 dark:text-white">
                  <span>Total Tax Payable:</span>
                  <span className="text-rose-600 dark:text-rose-400">{formatCurrency(newRegime.totalTax)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 font-bold">
                <span>Net In-Hand / Month:</span>
                <span className="text-sm text-blue-700 dark:text-blue-300 font-black">{formatCurrency(newRegime.monthlyTakeHome)}</span>
              </div>
            </div>
          </div>

          {/* Old Regime Card */}
          <div className={`card p-4 relative overflow-hidden transition-all ${
            recommended.includes('Old')
              ? 'ring-2 ring-blue-500 bg-blue-50/20 dark:bg-blue-950/10'
              : 'opacity-90'
          }`}>
            {recommended.includes('Old') && (
              <span className="absolute top-3 right-3 bg-blue-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Recommended
              </span>
            )}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-black text-gray-900 dark:text-white">Old Tax Regime</h4>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">With 80C, 80D, HRA, NPS, Home Loan deductions</p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-slate-800">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Gross Income:</span>
                  <strong className="text-gray-800 dark:text-slate-200">{formatCurrency(oldRegime.grossIncome)}</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Total Deductions Claimed:</span>
                  <span className="text-emerald-600 font-semibold">-{formatCurrency(oldRegime.totalDeductions)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold pt-1 border-t border-dashed border-gray-200 dark:border-slate-700">
                  <span className="text-gray-700 dark:text-slate-300">Taxable Net Income:</span>
                  <strong className="text-gray-900 dark:text-white">{formatCurrency(oldRegime.taxableIncome)}</strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/70 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Base Tax:</span>
                  <span>{formatCurrency(oldRegime.baseTax)}</span>
                </div>
                {oldRegime.rebate87A > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Rebate u/s 87A:</span>
                    <span>-{formatCurrency(oldRegime.rebate87A)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Health & Edu Cess (4%):</span>
                  <span>{formatCurrency(oldRegime.cess)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-gray-200 dark:border-slate-700 text-sm font-extrabold text-gray-900 dark:text-white">
                  <span>Total Tax Payable:</span>
                  <span className="text-rose-600 dark:text-rose-400">{formatCurrency(oldRegime.totalTax)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 font-bold">
                <span>Net In-Hand / Month:</span>
                <span className="text-sm text-blue-700 dark:text-blue-300 font-black">{formatCurrency(oldRegime.monthlyTakeHome)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Input Parameters Form */}
        <div className="space-y-4 pt-2">
          <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Calculator className="h-3.5 w-3.5 text-blue-600" />
            Income & Deduction Parameters
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Gross Salary */}
            <div>
              <label className="label">Annual Gross Salary / CTC (₹)</label>
              <input
                type="number"
                value={grossSalary}
                onChange={(e) => setGrossSalary(Number(e.target.value))}
                className="input-field text-xs font-bold text-blue-600"
                step="10000"
              />
            </div>

            {/* Basic Salary */}
            <div>
              <label className="label">Annual Basic Salary + DA (₹)</label>
              <input
                type="number"
                value={basicSalary}
                onChange={(e) => setBasicSalary(Number(e.target.value))}
                className="input-field text-xs"
                step="10000"
              />
            </div>

            {/* HRA Received */}
            <div>
              <label className="label">Annual HRA Received (₹)</label>
              <input
                type="number"
                value={hraReceived}
                onChange={(e) => setHraReceived(Number(e.target.value))}
                className="input-field text-xs"
                step="5000"
              />
            </div>

            {/* Monthly Rent Paid */}
            <div>
              <label className="label">Monthly Rent Paid (₹)</label>
              <input
                type="number"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(Number(e.target.value))}
                className="input-field text-xs"
                step="1000"
              />
            </div>

            {/* Metro City Toggle */}
            <div>
              <label className="label">Rental City Type</label>
              <select
                value={isMetro ? 'metro' : 'non-metro'}
                onChange={(e) => setIsMetro(e.target.value === 'metro')}
                className="input-field text-xs font-semibold"
              >
                <option value="metro">Metro (Delhi, Mumbai, Kolkata, Chennai - 50%)</option>
                <option value="non-metro">Non-Metro (Bangalore, Pune, Hyd, etc - 40%)</option>
              </select>
            </div>

            {/* Calculated HRA Exemption Display */}
            <div>
              <label className="label">Calculated HRA Exemption (Old Regime)</label>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                {formatCurrency(hraExemption)} / year
              </div>
            </div>

            {/* Section 80C */}
            <div>
              <label className="label">Section 80C (PPF/EPF/ELSS/LIC) (Max ₹1.5L)</label>
              <input
                type="number"
                value={sec80C}
                onChange={(e) => setSec80C(Number(e.target.value))}
                className="input-field text-xs font-semibold"
                max={150000}
                step="5000"
              />
            </div>

            {/* Section 80D */}
            <div>
              <label className="label">Section 80D (Health Insurance) (Max ₹1L)</label>
              <input
                type="number"
                value={sec80D}
                onChange={(e) => setSec80D(Number(e.target.value))}
                className="input-field text-xs font-semibold"
                max={100000}
                step="2500"
              />
            </div>

            {/* Section 80CCD(1B) NPS */}
            <div>
              <label className="label">Section 80CCD(1B) (NPS Self) (Max ₹50k)</label>
              <input
                type="number"
                value={sec80CCD1B}
                onChange={(e) => setSec80CCD1B(Number(e.target.value))}
                className="input-field text-xs font-semibold"
                max={50000}
                step="5000"
              />
            </div>

            {/* Section 24 Home Loan Interest */}
            <div>
              <label className="label">Sec 24 Home Loan Interest (Max ₹2L)</label>
              <input
                type="number"
                value={sec24HomeLoan}
                onChange={(e) => setSec24HomeLoan(Number(e.target.value))}
                className="input-field text-xs font-semibold"
                max={200000}
                step="10000"
              />
            </div>

            {/* Employer NPS 80CCD(2) */}
            <div>
              <label className="label">Employer NPS 80CCD(2) (Both Regimes)</label>
              <input
                type="number"
                value={employerNps}
                onChange={(e) => setEmployerNps(Number(e.target.value))}
                className="input-field text-xs font-semibold"
                step="10000"
              />
            </div>

            {/* Other Deductions */}
            <div>
              <label className="label">Other Deductions (80E, 80TTA, etc.)</label>
              <input
                type="number"
                value={otherDeductions}
                onChange={(e) => setOtherDeductions(Number(e.target.value))}
                className="input-field text-xs"
                step="5000"
              />
            </div>
          </div>
        </div>

        {/* Footer info note */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-[11px]">
          <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>
            <strong>FY 2026-27 Rule Note:</strong> Under the New Regime, income up to ₹7,75,000 for salaried employees is 100% tax-free thanks to the ₹75,000 Standard Deduction + Section 87A rebate. For taxpayers claiming heavy home loan interest (₹2L) and large HRA exemptions, the Old Regime may still yield greater tax savings.
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary text-xs">Close</button>
        </div>
      </div>
    </Modal>
  )
}
