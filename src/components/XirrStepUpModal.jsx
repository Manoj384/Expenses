import { useState, useMemo } from 'react'
import Modal from './Modal'
import { formatCurrency, formatCurrencyShort } from '../utils/formatCurrency'
import { projectSipStepUp } from '../utils/xirr'
import {
  Calculator,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2,
  Target,
  ShieldCheck,
  Flame,
  Zap,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'

export default function XirrStepUpModal({ isOpen, onClose, currentMonthlySip = 25000 }) {
  const [monthlySip, setMonthlySip] = useState(currentMonthlySip || 25000)
  const [stepUpPct, setStepUpPct] = useState(10)
  const [returnPct, setReturnPct] = useState(13.5)
  const [tenureYears, setTenureYears] = useState(12)
  const [adjustInflation, setAdjustInflation] = useState(false)

  // Step-Up Projection
  const projection = useMemo(() => {
    return projectSipStepUp(
      Number(monthlySip) || 1000,
      Number(stepUpPct) || 0,
      Number(returnPct) || 12,
      Number(tenureYears) || 5
    )
  }, [monthlySip, stepUpPct, returnPct, tenureYears])

  // Flat SIP comparison without step-up
  const flatProjection = useMemo(() => {
    return projectSipStepUp(
      Number(monthlySip) || 1000,
      0,
      Number(returnPct) || 12,
      Number(tenureYears) || 5
    )
  }, [monthlySip, returnPct, tenureYears])

  const extraWealthGained = projection.projectedValue - flatProjection.projectedValue

  // Milestone Calculations: Year/Month when reaching ₹25L, ₹50L, ₹1Cr, ₹2Cr, ₹5Cr
  const milestones = useMemo(() => {
    const targets = [
      { id: '25L', label: '₹25 Lakhs', target: 2500000, icon: '🌱' },
      { id: '50L', label: '₹50 Lakhs', target: 5000000, icon: '🚀' },
      { id: '1Cr', label: '₹1 Crore Club', target: 10000000, icon: '👑' },
      { id: '2Cr', label: '₹2 Crores (Coast FIRE)', target: 20000000, icon: '🏆' },
      { id: '5Cr', label: '₹5 Crores (Financial Freedom)', target: 50000000, icon: '🌟' },
    ]

    const monthlyRate = (Number(returnPct) || 12) / 100 / 12
    const currentYear = new Date().getFullYear()

    return targets.map(m => {
      let corpus = 0
      let currentSip = Number(monthlySip) || 1000
      let month = 0
      let reached = false
      const maxMonths = 40 * 12

      while (month < maxMonths) {
        month++
        corpus = (corpus + currentSip) * (1 + monthlyRate)
        if (corpus >= m.target) {
          reached = true
          break
        }
        if (month % 12 === 0) {
          currentSip *= (1 + (Number(stepUpPct) || 0) / 100)
        }
      }

      const yearsNeeded = (month / 12).toFixed(1)
      const targetYear = currentYear + Math.ceil(month / 12)

      return {
        ...m,
        reached,
        monthsNeeded: month,
        yearsNeeded,
        targetYear,
      }
    })
  }, [monthlySip, stepUpPct, returnPct])

  // Chart data with optional inflation adjustment (6% p.a.)
  const chartData = useMemo(() => {
    return (projection.yearlyBreakdown || []).map(b => {
      const inflationDiscount = adjustInflation ? Math.pow(1.06, b.year) : 1
      return {
        ...b,
        adjustedValue: Math.round(b.projectedValue / inflationDiscount),
        adjustedInvested: Math.round(b.investedAmount / inflationDiscount),
      }
    })
  }, [projection.yearlyBreakdown, adjustInflation])

  // Preset Strategy Switcher
  const applyPreset = (sip, step, ret, yrs) => {
    setMonthlySip(sip)
    setStepUpPct(step)
    setReturnPct(ret)
    setTenureYears(yrs)
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Interactive SIP Step-Up Freedom Simulator" size="xl">
      <div className="space-y-6 text-xs text-gray-700 dark:text-slate-300">
        {/* Strategy Preset Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Presets:</span>
          <button
            onClick={() => applyPreset(25000, 15, 14, 10)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 transition-all"
          >
            🔥 ₹1 Cr Speedrun (₹25k, 15% step-up)
          </button>
          <button
            onClick={() => applyPreset(15000, 10, 13.5, 12)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 transition-all"
          >
            ⚖️ Steady Compounder (₹15k, 10% step-up)
          </button>
          <button
            onClick={() => applyPreset(5000, 10, 12.5, 15)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-100 hover:bg-blue-200 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 transition-all"
          >
            🌱 Starter SIP (₹5k, 10% step-up)
          </button>
        </div>

        {/* Highlight Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="font-bold text-sm text-emerald-200">The Power of Step-Up Compounding</span>
            </div>
            <button
              onClick={() => setAdjustInflation(!adjustInflation)}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                adjustInflation
                  ? 'bg-amber-400 text-slate-900'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              {adjustInflation ? '✓ Real Purchasing Power (6% Inflation)' : 'Nominal ₹ Value'}
            </button>
          </div>
          <p className="text-xs text-teal-100">
            Hiking your SIP by <strong className="text-amber-300">{stepUpPct}% annually</strong> adds an extra{' '}
            <strong className="text-emerald-300 font-extrabold">{formatCurrency(extraWealthGained)}</strong> in pure compounding gains over a flat SIP!
          </p>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Monthly SIP (₹)
            </label>
            <input
              type="number"
              value={monthlySip}
              onChange={(e) => setMonthlySip(Math.max(500, Number(e.target.value)))}
              className="w-full input-field text-xs font-bold"
              step="1000"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Annual Step-Up (%)
            </label>
            <input
              type="number"
              value={stepUpPct}
              onChange={(e) => setStepUpPct(Math.max(0, Number(e.target.value)))}
              className="w-full input-field text-xs font-bold"
              min="0"
              max="50"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Expected Return (% p.a.)
            </label>
            <input
              type="number"
              value={returnPct}
              onChange={(e) => setReturnPct(Math.max(1, Number(e.target.value)))}
              className="w-full input-field text-xs font-bold"
              step="0.5"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Horizon (Years)
            </label>
            <input
              type="number"
              value={tenureYears}
              onChange={(e) => setTenureYears(Math.max(1, Math.min(40, Number(e.target.value))))}
              className="w-full input-field text-xs font-bold"
              min="1"
              max="40"
            />
          </div>
        </div>

        {/* Output KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-slate-400">Total Invested</span>
            <p className="text-xl font-black text-gray-900 dark:text-white">
              {formatCurrency(adjustInflation ? Math.round(projection.totalInvested / Math.pow(1.06, tenureYears)) : projection.totalInvested)}
            </p>
            <span className="text-[10px] text-gray-400">Principal contributed over {tenureYears} yrs</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-sm space-y-1">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300">Estimated Wealth Gain</span>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(adjustInflation ? Math.round(projection.wealthGain / Math.pow(1.06, tenureYears)) : projection.wealthGain)}
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-semibold">
              +{((projection.wealthGain / (projection.totalInvested || 1)) * 100).toFixed(0)}% return on capital
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md space-y-1">
            <span className="text-[11px] text-emerald-200">
              {adjustInflation ? 'Real Purchasing Power' : 'Total Future Corpus'}
            </span>
            <p className="text-2xl font-black">
              {formatCurrency(adjustInflation ? Math.round(projection.projectedValue / Math.pow(1.06, tenureYears)) : projection.projectedValue)}
            </p>
            <span className="text-[10px] text-emerald-200">Target Year: {new Date().getFullYear() + Number(tenureYears)}</span>
          </div>
        </div>

        {/* Milestone Freedom Roadmap */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-emerald-600" />
            Financial Freedom Milestones Roadmap
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {milestones.map(m => (
              <div
                key={m.id}
                className={`p-3 rounded-xl border text-center transition-all ${
                  m.reached
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                    : 'bg-gray-50 dark:bg-slate-800/40 border-gray-100 dark:border-slate-800 opacity-60'
                }`}
              >
                <span className="text-base block mb-0.5">{m.icon}</span>
                <span className="text-[11px] font-extrabold text-gray-900 dark:text-white block">{m.label}</span>
                {m.reached ? (
                  <>
                    <strong className="text-xs text-emerald-700 dark:text-emerald-400 font-black block mt-0.5">
                      {m.yearsNeeded} Years
                    </strong>
                    <span className="text-[10px] text-gray-400 block">Year {m.targetYear}</span>
                  </>
                ) : (
                  <span className="text-[10px] text-gray-400 block mt-1">&gt; 40 Yrs</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Year-by-Year Growth Chart */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm space-y-3">
          <h4 className="font-bold text-xs text-gray-800 dark:text-slate-200 flex items-center justify-between">
            <span>Year-by-Year Wealth Trajectory</span>
            <span className="text-[10px] text-gray-400 font-normal">
              {adjustInflation ? 'Discounted for 6% Annual Inflation' : 'Nominal Rupees'}
            </span>
          </h4>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="year" tickFormatter={(y) => `Yr ${y}`} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(value),
                    name === 'adjustedValue' ? 'Total Corpus' : 'Invested Principal',
                  ]}
                  labelFormatter={(y) => `Year ${y} (Monthly SIP: ${formatCurrency(chartData[y - 1]?.monthlySip || 0)})`}
                />
                <Legend formatter={(val) => (val === 'adjustedValue' ? 'Total Corpus Value' : 'Invested Capital')} />
                <Area type="monotone" dataKey="adjustedInvested" stroke="#3b82f6" fill="url(#invGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="adjustedValue" stroke="#10b981" fill="url(#wealthGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Done Button */}
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn-primary text-xs px-6 py-2">
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
