import { useState, useMemo } from 'react'
import {
  project30DayCashflow,
  DEFAULT_SAFE_BUFFER,
} from '../utils/predictiveCashflowEngine'
import { formatCurrency } from '../utils/formatCurrency'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowRight,
  Info,
  Sliders,
  DollarSign,
} from 'lucide-react'

export default function PredictiveCashflowCard({
  currentBalance = 45000,
  monthlyIncome = 85000,
  dailyBurnRate = 1200,
  sips = [],
  bills = [],
  debts = [],
}) {
  const [safeBuffer, setSafeBuffer] = useState(DEFAULT_SAFE_BUFFER)
  const [salaryDay, setSalaryDay] = useState(1)
  const [showConfig, setShowConfig] = useState(false)

  const projection = useMemo(() => {
    return project30DayCashflow({
      currentBalance,
      monthlyIncome,
      salaryDay,
      dailyBurnRate,
      sips,
      bills,
      debts,
      projectionDays: 30,
      safeBuffer,
    })
  }, [currentBalance, monthlyIncome, salaryDay, dailyBurnRate, sips, bills, debts, safeBuffer])

  const { timeline, minBalance, minBalanceDate, hasDipRisk, riskLevel, recommendation } = projection

  return (
    <div className="card p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              AI 30-Day Cashflow Forecaster
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              riskLevel === 'CRITICAL'
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300'
                : riskLevel === 'MODERATE'
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
            }`}>
              {riskLevel === 'CRITICAL' ? '⚠️ High Cash Crunch Risk' : riskLevel === 'MODERATE' ? '⚡ Buffer Dip Alert' : '✓ Cashflow Stable'}
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Forward-Looking Bank Balance Timeline
          </h3>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>{showConfig ? 'Hide Config' : 'Adjust Model'}</span>
        </button>
      </div>

      {/* Inline Config */}
      {showConfig && (
        <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="label text-[11px]" htmlFor="safe-buffer-input">Minimum Safety Buffer (₹)</label>
            <input
              id="safe-buffer-input"
              type="number"
              min="0"
              step="1000"
              className="input py-1 px-2 text-xs"
              value={safeBuffer}
              onChange={(e) => setSafeBuffer(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="label text-[11px]" htmlFor="salary-day-select">Monthly Salary Credit Date</label>
            <select
              id="salary-day-select"
              className="input py-1 px-2 text-xs"
              value={salaryDay}
              onChange={(e) => setSalaryDay(Number(e.target.value))}
            >
              {[1, 5, 10, 25, 28, 30, 31].map(d => (
                <option key={d} value={d}>{d}th of the month</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* AI Recommendation Alert */}
      <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
        hasDipRisk
          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
          : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
      }`}>
        {hasDipRisk ? (
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        ) : (
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
        )}
        <div className="space-y-0.5">
          <p className="font-bold">
            {hasDipRisk ? 'AI Predictive Warning' : 'Healthy Runway'}
          </p>
          <p className="leading-relaxed opacity-90">{recommendation}</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800">
          <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Estimated Lowest Dip</p>
          <p className={`text-lg font-black mt-0.5 ${minBalance < safeBuffer ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>
            {formatCurrency(minBalance)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">on {minBalanceDate}</p>
        </div>

        <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800">
          <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Daily Outflow Velocity</p>
          <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
            {formatCurrency(dailyBurnRate)}/day
          </p>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">baseline living pace</p>
        </div>

        <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 col-span-2 sm:col-span-1">
          <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Safety Buffer Ceiling</p>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatCurrency(safeBuffer)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">minimum reserve</p>
        </div>
      </div>

      {/* Interactive 30-Day Mini Timeline Bar */}
      <div>
        <p className="text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-2">
          30-Day Projected Trajectory (Hover for breakdown)
        </p>
        <div className="grid grid-cols-15 sm:grid-cols-30 gap-1 h-12 items-end bg-gray-100 dark:bg-slate-800 p-2 rounded-xl">
          {timeline.map((t) => {
            const heightPct = Math.min(Math.max((t.balance / (monthlyIncome * 1.5)) * 100, 15), 100)
            return (
              <div
                key={t.date}
                title={`${t.date}: ${formatCurrency(t.balance)} (Inflow: ${formatCurrency(t.inflow)}, Outflow: ${formatCurrency(t.outflow)})${t.events.length > 0 ? ` [${t.events.map(e => e.name).join(', ')}]` : ''}`}
                className={`w-full rounded-xs transition-all cursor-pointer ${
                  t.isDip
                    ? 'bg-rose-500 hover:bg-rose-600 animate-pulse'
                    : t.inflow > 0
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
                style={{ height: `${heightPct}%` }}
              />
            )
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-slate-500 mt-1 px-1">
          <span>Today</span>
          <span>Day 15</span>
          <span>Day 30</span>
        </div>
      </div>
    </div>
  )
}
