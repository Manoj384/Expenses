import { useState, useMemo } from 'react'
import Modal from './Modal'
import { formatCurrency, formatCurrencyShort } from '../utils/formatCurrency'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  Flame,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Zap,
  Coffee,
  Crown,
  Clock,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

// Box-Muller transform for normal distribution
function randomGaussian(mean, stdev) {
  let u = 1 - Math.random()
  let v = Math.random()
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  return mean + z * stdev
}

export default function FireSimulatorModal({
  isOpen,
  onClose,
  initialPortfolio = 1500000,
  initialMonthlySavings = 40000,
  initialMonthlyExpense = 45000,
  isEmbedded = false,
}) {
  const [currentAge, setCurrentAge] = useState(28)
  const [retirementAge, setRetirementAge] = useState(50)
  const [currentPortfolio, setCurrentPortfolio] = useState(String(initialPortfolio || 1500000))
  const [monthlyExpense, setMonthlyExpense] = useState(String(initialMonthlyExpense || 45000))
  const [monthlyInvestment, setMonthlyInvestment] = useState(String(initialMonthlySavings || 40000))
  const [expectedReturn, setExpectedReturn] = useState(12) // 12% for Indian Equities
  const [inflationRate, setInflationRate] = useState(6) // 6% Indian CPI
  const [swr, setSwr] = useState(4.0) // 4% Safe Withdrawal Rate
  const [activeTab, setActiveTab] = useState('milestones') // 'milestones' | 'montecarlo'
  const [simSeed, setSimSeed] = useState(1)

  const pCurrent = parseFloat(currentPortfolio) || 0
  const expMonthly = parseFloat(monthlyExpense) || 0
  const invMonthly = parseFloat(monthlyInvestment) || 0
  const expAnnual = expMonthly * 12

  // 1. FIRE Targets
  const safeWithdrawal = (swr || 4) / 100
  const standardFireTarget = safeWithdrawal > 0 ? expAnnual / safeWithdrawal : expAnnual * 25
  const leanFireTarget = standardFireTarget * 0.70
  const fatFireTarget = standardFireTarget * 1.50
  const baristaFireTarget = standardFireTarget * 0.50

  // Real annual rate of return (Fisher equation)
  const nominalRate = (expectedReturn || 12) / 100
  const infRate = (inflationRate || 6) / 100
  const realRate = (1 + nominalRate) / (1 + infRate) - 1
  const monthlyRealRate = Math.pow(1 + realRate, 1 / 12) - 1

  // Coast FIRE calculation
  const yearsToRetire = Math.max(1, retirementAge - currentAge)
  const coastFireTarget = standardFireTarget / Math.pow(1 + realRate, yearsToRetire)
  const hasAchievedCoast = pCurrent >= coastFireTarget

  // 2. Timeline to Standard FIRE
  const { yearsToFire, monthsToFire, fireAge, trajectoryData } = useMemo(() => {
    let bal = pCurrent
    let months = 0
    const trajectory = []
    const maxMonths = 600 // 50 years cap

    trajectory.push({
      year: currentAge,
      portfolio: Math.round(bal),
      target: Math.round(standardFireTarget),
    })

    while (bal < standardFireTarget && months < maxMonths) {
      months++
      bal = bal * (1 + monthlyRealRate) + invMonthly

      if (months % 12 === 0) {
        trajectory.push({
          year: currentAge + Math.floor(months / 12),
          portfolio: Math.round(bal),
          target: Math.round(standardFireTarget),
        })
      }
    }

    const yrs = (months / 12).toFixed(1)
    return {
      yearsToFire: parseFloat(yrs),
      monthsToFire: months,
      fireAge: currentAge + Math.floor(months / 12),
      trajectoryData: trajectory,
    }
  }, [pCurrent, standardFireTarget, monthlyRealRate, invMonthly, currentAge])

  // 3. Monte Carlo Longevity Simulation (500 iterations over 35 years)
  const monteCarlo = useMemo(() => {
    const trials = 400
    const yearsOfRetirement = 35
    const annualWithdrawal = standardFireTarget * safeWithdrawal
    let successes = 0

    // Matrix [year][trial]
    const yearValues = Array.from({ length: yearsOfRetirement + 1 }, () => [])

    for (let t = 0; t < trials; t++) {
      let balance = standardFireTarget
      yearValues[0].push(balance)
      let survived = true

      for (let y = 1; y <= yearsOfRetirement; y++) {
        if (!survived) {
          yearValues[y].push(0)
          continue
        }

        // Random market return around 11% mean with 14% volatility
        const marketReturn = randomGaussian(0.11, 0.14)
        const withdrawal = annualWithdrawal * Math.pow(1 + infRate, y - 1)

        balance = (balance - withdrawal) * (1 + marketReturn)

        if (balance <= 0) {
          balance = 0
          survived = false
        }
        yearValues[y].push(balance)
      }

      if (survived && balance > 0) successes++
    }

    const survivalRate = ((successes / trials) * 100).toFixed(1)

    // Compute 10th, 50th (median), and 90th percentiles for each year
    const percentileChart = yearValues.map((arr, yr) => {
      const sorted = [...arr].sort((a, b) => a - b)
      const p10 = sorted[Math.floor(sorted.length * 0.10)] || 0
      const p50 = sorted[Math.floor(sorted.length * 0.50)] || 0
      const p90 = sorted[Math.floor(sorted.length * 0.90)] || 0

      return {
        year: `Yr ${yr}`,
        worst10: Math.round(p10),
        median50: Math.round(p50),
        best90: Math.round(p90),
      }
    })

    return { survivalRate, percentileChart }
  }, [standardFireTarget, safeWithdrawal, infRate, simSeed])

  return (
    <Modal isOpen={isOpen} isEmbedded={isEmbedded} onClose={onClose} title="FIRE & Financial Freedom Simulator" maxWidth="max-w-4xl">
      <div className="space-y-4 text-xs text-gray-700 dark:text-slate-300">
        {/* Top Hero Banner */}
        <div className="p-4 bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 text-white rounded-2xl border border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 mb-1.5 border border-amber-500/30">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              Financial Independence, Retire Early (FIRE)
            </span>
            <h3 className="text-2xl font-black text-white">
              Target Corpus: {formatCurrency(standardFireTarget)}
            </h3>
            <p className="text-xs text-amber-200/80 mt-0.5">
              Based on {swr}% Safe Withdrawal Rule (₹{(expAnnual).toLocaleString('en-IN')}/year expense run-rate)
            </p>
          </div>

          <div className="bg-white/10 dark:bg-slate-800/80 border border-white/15 p-3 rounded-2xl text-right min-w-[170px]">
            <span className="text-[10px] text-amber-200 uppercase tracking-wider block font-bold">
              Projected FIRE Age
            </span>
            <span className="text-xl font-black text-emerald-400">
              {yearsToFire >= 50 ? '50+ Yrs' : `Age ${fireAge}`}
            </span>
            <span className="text-[11px] text-gray-300 block">
              in {yearsToFire} years ({monthsToFire} mos)
            </span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('milestones')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'milestones'
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            🏆 FIRE Milestones & Trajectory
          </button>
          <button
            onClick={() => setActiveTab('montecarlo')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'montecarlo'
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            🎲 Monte Carlo Longevity (35 Yrs)
          </button>
        </div>

        {/* Interactive Parameter Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-200 dark:border-slate-700">
          <div>
            <label className="label text-[11px]">Current Age / Ret. Age</label>
            <div className="flex gap-1.5">
              <input
                type="number"
                value={currentAge}
                onChange={(e) => setCurrentAge(parseInt(e.target.value) || 25)}
                className="input-field text-xs py-1"
                placeholder="28"
              />
              <input
                type="number"
                value={retirementAge}
                onChange={(e) => setRetirementAge(parseInt(e.target.value) || 50)}
                className="input-field text-xs py-1"
                placeholder="50"
              />
            </div>
          </div>

          <div>
            <label className="label text-[11px]">Current Portfolio (₹)</label>
            <input
              type="number"
              value={currentPortfolio}
              onChange={(e) => setCurrentPortfolio(e.target.value)}
              className="input-field text-xs py-1 font-bold text-blue-600"
            />
          </div>

          <div>
            <label className="label text-[11px]">Monthly Spend (₹)</label>
            <input
              type="number"
              value={monthlyExpense}
              onChange={(e) => setMonthlyExpense(e.target.value)}
              className="input-field text-xs py-1 font-bold text-rose-600"
            />
          </div>

          <div>
            <label className="label text-[11px]">Monthly Investment (₹)</label>
            <input
              type="number"
              value={monthlyInvestment}
              onChange={(e) => setMonthlyInvestment(e.target.value)}
              className="input-field text-xs py-1 font-bold text-emerald-600"
            />
          </div>
        </div>
        {activeTab === 'milestones' && (
          <div className="space-y-4">
            {/* 4 Tier Milestone Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 dark:bg-slate-800/60 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Lean FIRE (70%)
                </span>
                <p className="text-base font-black text-gray-900 dark:text-white">
                  {formatCurrency(leanFireTarget)}
                </p>
                <p className="text-[10px] text-gray-500">Covers rent & bare survival essentials</p>
              </div>

              <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/40 dark:bg-slate-800/60 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                  <Flame className="h-3 w-3" /> Standard FIRE (100%)
                </span>
                <p className="text-base font-black text-gray-900 dark:text-white">
                  {formatCurrency(standardFireTarget)}
                </p>
                <p className="text-[10px] text-gray-500">Maintains 100% current lifestyle</p>
              </div>

              <div className="p-3 rounded-xl border border-purple-100 bg-purple-50/40 dark:bg-slate-800/60 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1">
                  <Crown className="h-3 w-3" /> Fat FIRE (150%)
                </span>
                <p className="text-base font-black text-gray-900 dark:text-white">
                  {formatCurrency(fatFireTarget)}
                </p>
                <p className="text-[10px] text-gray-500">Luxury, travel & family gifting</p>
              </div>

              <div className={`p-3 rounded-xl border space-y-1 ${
                hasAchievedCoast
                  ? 'border-amber-300 bg-amber-50/70 dark:bg-amber-950/40 dark:border-amber-800'
                  : 'border-gray-200 bg-gray-50/60 dark:bg-slate-800/60 dark:border-slate-700'
              }`}>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Coffee className="h-3 w-3" /> Coast FIRE (at Age {retirementAge})
                </span>
                <p className="text-base font-black text-gray-900 dark:text-white">
                  {formatCurrency(coastFireTarget)}
                </p>
                <span className={`text-[10px] font-bold block ${hasAchievedCoast ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>
                  {hasAchievedCoast ? '🎉 Coast FIRE Achieved!' : `Need ${formatCurrency(Math.max(0, coastFireTarget - pCurrent))} more`}
                </span>
              </div>
            </div>

            {/* Trajectory Growth Chart */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-blue-600" /> Wealth Compounding Path to Target Corpus
              </span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trajectoryData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="year" tickFormatter={(y) => `Age ${y}`} tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [formatCurrency(v)]} />
                    <Area type="monotone" dataKey="portfolio" name="Projected Wealth" stroke="#f59e0b" strokeWidth={2} fill="url(#fireGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'montecarlo' && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-teal-300 font-bold block uppercase tracking-wider">
                  35-Year Portfolio Longevity Survival Probability
                </span>
                <h4 className="text-2xl font-black text-emerald-400">
                  {monteCarlo.survivalRate}% Success Rate
                </h4>
                <p className="text-[11px] text-gray-300 mt-0.5">
                  Across 400 randomized market volatility & drawdown scenarios
                </p>
              </div>
              <button
                onClick={() => setSimSeed((s) => s + 1)}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Re-run Sim
              </button>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-xs font-bold text-gray-800 dark:text-slate-200">
                Monte Carlo Percentiles Over 35 Years of Retirement
              </span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monteCarlo.percentileChart} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [formatCurrency(v)]} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" dataKey="best90" name="90th Pct (Bull)" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                    <Area type="monotone" dataKey="median50" name="50th Pct (Median)" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="worst10" name="10th Pct (Worst-Case)" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button onClick={onClose} className="btn-primary text-xs px-5 py-2">
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
