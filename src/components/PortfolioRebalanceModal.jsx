import { useState, useMemo } from 'react'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import {
  Scale,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Info,
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'

const PRESET_STRATEGIES = [
  {
    name: 'Growth Focus (Equity 80% / Debt & Balanced 20%)',
    targets: { 'Equity - Mid Cap': 30, 'Equity - Small Cap': 25, 'Equity - Flexi Cap': 25, 'Debt / Hybrid / Other': 20 }
  },
  {
    name: 'Balanced Core (Flexi 40% / Mid 30% / Small 15% / Safe 15%)',
    targets: { 'Equity - Flexi Cap': 40, 'Equity - Mid Cap': 30, 'Equity - Small Cap': 15, 'Debt / Hybrid / Other': 15 }
  },
  {
    name: 'Aggressive Alpha (Mid 40% / Small 40% / Flexi 20%)',
    targets: { 'Equity - Mid Cap': 40, 'Equity - Small Cap': 40, 'Equity - Flexi Cap': 20, 'Debt / Hybrid / Other': 0 }
  }
]

export default function PortfolioRebalanceModal({ isOpen, onClose, funds = [] }) {
  const [tolerancePct, setTolerancePct] = useState(5)
  const [strategyIndex, setStrategyIndex] = useState(0)
  const [customTargets, setCustomTargets] = useState(PRESET_STRATEGIES[0].targets)

  // Classify funds into standard buckets
  const normalizedCategory = (cat) => {
    if (!cat) return 'Debt / Hybrid / Other'
    const lower = cat.toLowerCase()
    if (lower.includes('small')) return 'Equity - Small Cap'
    if (lower.includes('mid')) return 'Equity - Mid Cap'
    if (lower.includes('flexi') || lower.includes('large') || lower.includes('multi')) return 'Equity - Flexi Cap'
    return 'Debt / Hybrid / Other'
  }

  const { totalValue, categoryBreakdown } = useMemo(() => {
    const total = funds.reduce((sum, f) => sum + (parseFloat(f.current_value) || 0), 0)
    const map = {
      'Equity - Flexi Cap': 0,
      'Equity - Mid Cap': 0,
      'Equity - Small Cap': 0,
      'Debt / Hybrid / Other': 0
    }

    funds.forEach(f => {
      const bucket = normalizedCategory(f.category)
      map[bucket] = (map[bucket] || 0) + (parseFloat(f.current_value) || 0)
    })

    const breakdown = Object.entries(map).map(([cat, val]) => {
      const currentPct = total > 0 ? (val / total) * 100 : 0
      const targetPct = customTargets[cat] ?? 25
      const targetVal = total > 0 ? (total * targetPct) / 100 : 0
      const diffVal = val - targetVal
      const diffPct = currentPct - targetPct
      const isDrifted = Math.abs(diffPct) > tolerancePct

      return {
        category: cat,
        currentValue: val,
        currentPct,
        targetPct,
        targetVal,
        diffVal,
        diffPct,
        isDrifted,
        action: diffVal > 0 ? 'Trim / Overweight' : diffVal < 0 ? 'Add / Underweight' : 'Balanced'
      }
    })

    return { totalValue: total, categoryBreakdown: breakdown }
  }, [funds, customTargets, tolerancePct])

  const chartData = categoryBreakdown.map(item => ({
    name: item.category.replace('Equity - ', ''),
    'Current %': parseFloat(item.currentPct.toFixed(1)),
    'Target %': parseFloat(item.targetPct.toFixed(1)),
  }))

  const handleApplyPreset = (idx) => {
    setStrategyIndex(idx)
    setCustomTargets(PRESET_STRATEGIES[idx].targets)
  }

  const handleTargetChange = (cat, val) => {
    const num = parseFloat(val) || 0
    setCustomTargets(prev => ({ ...prev, [cat]: num }))
  }

  const totalTargetPct = Object.values(customTargets).reduce((a, b) => a + b, 0)
  const isBalancedPortfolio = categoryBreakdown.every(b => !b.isDrifted)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Portfolio Rebalancing Engine" maxWidth="max-w-4xl">
      <div className="space-y-6">
        {/* Header summary */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Scale className="h-5 w-5 text-blue-400" />
              <span className="text-xs font-semibold tracking-wide uppercase text-blue-300">Asset Drift & Rebalance</span>
            </div>
            <h3 className="text-2xl font-black">
              {formatCurrency(totalValue)} <span className="text-xs font-normal text-blue-200">Across {funds.length} Holdings</span>
            </h3>
            <p className="text-xs text-blue-200/80 mt-1">
              Rebalancing prevents single-sector over-concentration and locks in equity compounding gains.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {isBalancedPortfolio ? (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Portfolio Balanced (Within ±{tolerancePct}% drift)
              </span>
            ) : (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Rebalance Suggested (Exceeds ±{tolerancePct}% drift)
              </span>
            )}
            <span className="text-[11px] text-blue-300">Tolerance band: ±{tolerancePct}%</span>
          </div>
        </div>

        {/* Strategy Presets */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
            Select Allocation Strategy Preset
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {PRESET_STRATEGIES.map((strat, idx) => (
              <button
                key={strat.name}
                type="button"
                onClick={() => handleApplyPreset(idx)}
                className={`text-left p-3 rounded-xl border text-xs font-medium transition-all ${
                  strategyIndex === idx
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 font-bold shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {strat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Comparison Bar Chart */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-blue-500" />
            Current vs Target Allocation (%)
          </h4>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis unit="%" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => `${val}%`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Current %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Target %" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Table & Rebalancing Action items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Category Drift & Action Breakdown
            </h4>
            {totalTargetPct !== 100 && (
              <span className="text-xs text-rose-500 font-semibold">
                ⚠️ Target allocation sum is {totalTargetPct}% (Should be 100%)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {categoryBreakdown.map((item) => {
              const isOver = item.diffVal > 0
              return (
                <div
                  key={item.category}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.isDrifted
                      ? isOver
                        ? 'border-amber-300 bg-amber-50/20 dark:bg-amber-950/10'
                        : 'border-blue-300 bg-blue-50/20 dark:bg-blue-950/10'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{item.category}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.isDrifted
                            ? isOver
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}
                      >
                        {item.diffPct > 0 ? `+${item.diffPct.toFixed(1)}%` : `${item.diffPct.toFixed(1)}%`} drift
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <span>Current: <strong>{formatCurrency(item.currentValue)}</strong> ({item.currentPct.toFixed(1)}%)</span>
                      <span>•</span>
                      <span>Target: <strong>{formatCurrency(item.targetVal)}</strong> ({item.targetPct}%)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {isOver ? (
                          <span className="text-amber-600 dark:text-amber-400">Trim {formatCurrency(Math.abs(item.diffVal))}</span>
                        ) : item.diffVal < 0 ? (
                          <span className="text-blue-600 dark:text-blue-400">Add {formatCurrency(Math.abs(item.diffVal))}</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">On Target</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {isOver ? 'Over target allocation' : item.diffVal < 0 ? 'Under target allocation' : 'Optimal weighting'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={customTargets[item.category] ?? 0}
                        onChange={(e) => handleTargetChange(item.category, e.target.value)}
                        className="w-14 text-center text-xs font-bold bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-500 font-bold pr-1">%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Smart SIP Tax-Saving Rebalance Tip */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-4 rounded-xl flex items-start gap-3">
          <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
            <p className="font-bold">Smart Rebalancing Tip (Tax-Optimized)</p>
            <p className="text-emerald-800/90 dark:text-emerald-300/90">
              Instead of selling overweight funds and incurring capital gains tax (LTCG / STCG), redirect your future monthly SIP contributions towards the underweight categories until your target portfolio balance is achieved!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary text-xs px-4 py-2">
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
