import { useState, useMemo } from 'react'
import Modal from './Modal'
import { formatCurrency, formatCurrencyShort } from '../utils/formatCurrency'
import { projectSipStepUp } from '../utils/xirr'
import { Calculator, Sparkles, TrendingUp, ArrowUpRight, CheckCircle2 } from 'lucide-react'
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
  const [tenureYears, setTenureYears] = useState(10)

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

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="SIP Step-Up & Wealth Multiplier" maxWidth="max-w-3xl">
      <div className="space-y-6 text-xs text-gray-700 dark:text-slate-300">
        {/* Intro Highlight */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/20 text-white space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span className="font-bold text-sm text-blue-200">The Power of Annual Step-Up Compounding</span>
          </div>
          <p className="text-xs text-slate-300">
            Increasing your SIP by just <span className="text-amber-300 font-bold">{stepUpPct}% each year</span> creates an extra{' '}
            <span className="text-emerald-400 font-bold">{formatCurrency(extraWealthGained)}</span> compared to a constant flat SIP!
          </p>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
          <div>
            <label className="label text-[11px]">Initial Monthly SIP</label>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-gray-400 font-bold">₹</span>
              <input
                type="number"
                value={monthlySip}
                onChange={(e) => setMonthlySip(Math.max(500, Number(e.target.value)))}
                className="input-field pl-6 text-xs font-bold"
                step="1000"
              />
            </div>
          </div>

          <div>
            <label className="label text-[11px]">Annual Step-Up (%)</label>
            <div className="relative">
              <input
                type="number"
                value={stepUpPct}
                onChange={(e) => setStepUpPct(Math.max(0, Number(e.target.value)))}
                className="input-field text-xs font-bold"
                min="0"
                max="50"
              />
              <span className="absolute right-2.5 top-2 text-gray-400 font-bold">%</span>
            </div>
          </div>

          <div>
            <label className="label text-[11px]">Expected Return (XIRR)</label>
            <div className="relative">
              <input
                type="number"
                value={returnPct}
                onChange={(e) => setReturnPct(Math.max(1, Number(e.target.value)))}
                className="input-field text-xs font-bold"
                step="0.5"
              />
              <span className="absolute right-2.5 top-2 text-gray-400 font-bold">%</span>
            </div>
          </div>

          <div>
            <label className="label text-[11px]">Investment Horizon</label>
            <div className="relative">
              <input
                type="number"
                value={tenureYears}
                onChange={(e) => setTenureYears(Math.max(1, Math.min(40, Number(e.target.value))))}
                className="input-field text-xs font-bold"
                min="1"
                max="40"
              />
              <span className="absolute right-2.5 top-2 text-gray-400 font-bold">Yrs</span>
            </div>
          </div>
        </div>

        {/* Output KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-slate-400">Total Invested</span>
            <p className="text-xl font-black text-gray-900 dark:text-white">{formatCurrency(projection.totalInvested)}</p>
            <span className="text-[10px] text-gray-400">Over {tenureYears} years with {stepUpPct}% hike</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-sm space-y-1">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300">Estimated Wealth Gain</span>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(projection.wealthGain)}</p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-semibold">
              +{( (projection.wealthGain / (projection.totalInvested || 1)) * 100 ).toFixed(0)}% return on capital
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md space-y-1">
            <span className="text-[11px] text-blue-200">Total Corpus Value</span>
            <p className="text-2xl font-black">{formatCurrency(projection.projectedValue)}</p>
            <span className="text-[10px] text-blue-200">Future value at year {new Date().getFullYear() + Number(tenureYears)}</span>
          </div>
        </div>

        {/* Growth Curve Chart */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm space-y-3">
          <h4 className="font-bold text-xs text-gray-800 dark:text-slate-200">Year-by-Year Wealth Trajectory</h4>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projection.yearlyBreakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="year" tickFormatter={(y) => `Yr ${y}`} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(value),
                    name === 'projectedValue' ? 'Total Corpus' : 'Invested Capital',
                  ]}
                  labelFormatter={(y) => `Year ${y} (Monthly SIP: ${formatCurrency(projection.yearlyBreakdown[y - 1]?.monthlySip || 0)})`}
                />
                <Legend formatter={(val) => (val === 'projectedValue' ? 'Total Corpus Value' : 'Invested Capital')} />
                <Area type="monotone" dataKey="investedAmount" stroke="#3b82f6" fill="url(#invGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="projectedValue" stroke="#10b981" fill="url(#wealthGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn-primary text-xs px-5 py-2">
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
