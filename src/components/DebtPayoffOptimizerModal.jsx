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
  Zap,
  TrendingDown,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Flame,
  ArrowRight,
  Sliders,
  DollarSign,
  Clock,
  Layers,
  Award,
} from 'lucide-react'

// Default interest rates by debt category if not specified
function getDefaultApr(debt) {
  if (debt.interest_rate !== undefined && !isNaN(Number(debt.interest_rate))) {
    return Number(debt.interest_rate)
  }
  const t = debt.debt_type || ''
  const name = (debt.name || '').toLowerCase()
  if (t === 'card' || name.includes('card')) return 36 // Credit card APR
  if (t === 'bank' || name.includes('personal')) return 13.5 // Personal / Bank loan
  if (name.includes('car') || name.includes('auto')) return 9.0
  if (name.includes('home')) return 8.5
  return 0 // Friends & family default 0%
}

function simulatePayoff(initialDebts, extraMonthly, strategy) {
  if (!initialDebts.length) {
    return { months: 0, totalInterest: 0, trajectory: [], payoffSchedule: [] }
  }

  // Clone debts with interest rates
  let debtPool = initialDebts.map((d, i) => ({
    id: d.id || `debt-${i}`,
    name: d.name || 'Debt',
    balance: Number(d.outstanding || d.principal || 0),
    minEmi: Math.max(Number(d.emi || 0), 100), // Min payment floor
    apr: getDefaultApr(d),
  })).filter(d => d.balance > 0)

  if (!debtPool.length) {
    return { months: 0, totalInterest: 0, trajectory: [], payoffSchedule: [] }
  }

  // Strategy sorting
  if (strategy === 'snowball') {
    debtPool.sort((a, b) => a.balance - b.balance) // Smallest balance first
  } else if (strategy === 'avalanche') {
    debtPool.sort((a, b) => b.apr - a.apr) // Highest APR first
  }

  let totalInterest = 0
  let month = 0
  const maxMonths = 360 // 30-year safety cap
  const trajectory = []
  const payoffSchedule = []

  let freedEmis = 0

  while (debtPool.some(d => d.balance > 0) && month < maxMonths) {
    month++
    let extraCashForMonth = extraMonthly + freedEmis

    // 1. Accrue monthly interest on each active debt
    debtPool.forEach(d => {
      if (d.balance > 0) {
        const monthlyInterest = d.balance * (d.apr / 100 / 12)
        totalInterest += monthlyInterest
        d.balance += monthlyInterest
      }
    })

    // 2. Pay minimum EMIs
    debtPool.forEach(d => {
      if (d.balance > 0) {
        const payment = Math.min(d.balance, d.minEmi)
        d.balance -= payment
        if (d.balance <= 0) {
          d.balance = 0
          freedEmis += d.minEmi
          if (!payoffSchedule.find(p => p.id === d.id)) {
            payoffSchedule.push({ id: d.id, name: d.name, month, apr: d.apr })
          }
        }
      }
    })

    // 3. Apply extra rollover cash to the highest priority active debt
    const targetDebt = debtPool.find(d => d.balance > 0)
    if (targetDebt && extraCashForMonth > 0) {
      const extraPayment = Math.min(targetDebt.balance, extraCashForMonth)
      targetDebt.balance -= extraPayment
      if (targetDebt.balance <= 0) {
        targetDebt.balance = 0
        freedEmis += targetDebt.minEmi
        if (!payoffSchedule.find(p => p.id === targetDebt.id)) {
          payoffSchedule.push({ id: targetDebt.id, name: targetDebt.name, month, apr: targetDebt.apr })
        }
      }
    }

    // Record data point every 3 months or on completion
    const currentTotalBalance = debtPool.reduce((s, d) => s + d.balance, 0)
    if (month % 3 === 0 || currentTotalBalance === 0) {
      trajectory.push({
        month: `M${month}`,
        balance: Math.round(currentTotalBalance),
      })
    }
  }

  return {
    months: month,
    totalInterest: Math.round(totalInterest),
    trajectory,
    payoffSchedule,
  }
}


export default function DebtPayoffOptimizerModal({ isOpen, onClose, debts = [] }) {
  const [extraPayment, setExtraPayment] = useState(5000)
  const [selectedStrategy, setSelectedStrategy] = useState('avalanche') // 'avalanche' | 'snowball'

  const activeDebts = useMemo(() => {
    return (debts || []).filter(
      (d) => d.status !== 'cleared' && Number(d.outstanding || d.principal || 0) > 0 && d.debt_type !== 'lent'
    )
  }, [debts])

  const totalOutstanding = useMemo(() => {
    return activeDebts.reduce((s, d) => s + Number(d.outstanding || d.principal || 0), 0)
  }, [activeDebts])

  const totalMinEmi = useMemo(() => {
    return activeDebts.reduce((s, d) => s + Number(d.emi || 0), 0)
  }, [activeDebts])

  // Simulations
  const baseline = useMemo(() => simulatePayoff(activeDebts, 0, 'none'), [activeDebts])
  const snowball = useMemo(() => simulatePayoff(activeDebts, extraPayment, 'snowball'), [activeDebts, extraPayment])
  const avalanche = useMemo(() => simulatePayoff(activeDebts, extraPayment, 'avalanche'), [activeDebts, extraPayment])

  const currentResult = selectedStrategy === 'avalanche' ? avalanche : snowball
  const interestSaved = Math.max(0, baseline.totalInterest - currentResult.totalInterest)
  const monthsSaved = Math.max(0, baseline.months - currentResult.months)

  // Combined trajectory for Recharts
  const chartData = useMemo(() => {
    const maxLen = Math.max(avalanche.trajectory.length, snowball.trajectory.length)
    const data = []
    for (let i = 0; i < maxLen; i++) {
      const mLabel = avalanche.trajectory[i]?.month || snowball.trajectory[i]?.month || `M${i * 3}`
      data.push({
        month: mLabel,
        avalanche: avalanche.trajectory[i]?.balance ?? 0,
        snowball: snowball.trajectory[i]?.balance ?? 0,
      })
    }
    return data
  }, [avalanche, snowball])

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Debt Payoff Strategy Optimizer" maxWidth="max-w-4xl">
      <div className="space-y-4 text-xs text-gray-700 dark:text-slate-300">
        {/* Top Hero Banner */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 mb-1.5 border border-indigo-500/30">
              <Zap className="h-3.5 w-3.5 text-indigo-400" />
              Debt Payoff Acceleration Engine
            </span>
            <h3 className="text-2xl font-black text-white">
              {formatCurrency(totalOutstanding)}
            </h3>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Across {activeDebts.length} active borrowings (Total Min EMI: {formatCurrency(totalMinEmi)}/mo)
            </p>
          </div>

          <div className="bg-white/10 dark:bg-slate-800/80 border border-white/15 p-3 rounded-2xl text-right min-w-[170px]">
            <span className="text-[10px] text-emerald-300 uppercase tracking-wider block font-bold">
              Potential Interest Saved
            </span>
            <span className="text-xl font-black text-emerald-400">
              {formatCurrency(interestSaved)}
            </span>
            <span className="text-[11px] text-gray-300 block">
              + {monthsSaved} months faster!
            </span>
          </div>
        </div>

        {/* Extra Payment Slider */}
        <div className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-indigo-600" /> Extra Monthly Payment Towards Principal:
            </span>
            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
              +{formatCurrency(extraPayment)}/mo
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="50000"
            step="1000"
            value={extraPayment}
            onChange={(e) => setExtraPayment(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer h-2 bg-gray-200 dark:bg-slate-700 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-mono">
            <span>₹0 (Min Only)</span>
            <span>₹10,000</span>
            <span>₹25,000</span>
            <span>₹50,000/mo</span>
          </div>
        </div>
        {/* Strategy Comparison Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Debt Avalanche */}
          <div
            onClick={() => setSelectedStrategy('avalanche')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              selectedStrategy === 'avalanche'
                ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm ring-1 ring-indigo-500'
                : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-75 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                🏔️ Debt Avalanche (Highest Interest First)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Mathematically Optimal
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-2">
              Attacks high-interest debt first to minimize total interest paid.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-indigo-100 dark:border-slate-800">
              <div>
                <span className="text-gray-400 text-[10px] block">Debt-Free In</span>
                <strong className="text-gray-900 dark:text-white font-black">{avalanche.months} Months</strong>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block">Total Interest</span>
                <strong className="text-rose-600 dark:text-rose-400 font-black">{formatCurrency(avalanche.totalInterest)}</strong>
              </div>
            </div>
          </div>

          {/* Debt Snowball */}
          <div
            onClick={() => setSelectedStrategy('snowball')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              selectedStrategy === 'snowball'
                ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm ring-1 ring-indigo-500'
                : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-75 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                ⛄ Debt Snowball (Lowest Balance First)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                Psychological Momentum
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-2">
              Wipes out small debts first for fast psychological wins.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-indigo-100 dark:border-slate-800">
              <div>
                <span className="text-gray-400 text-[10px] block">Debt-Free In</span>
                <strong className="text-gray-900 dark:text-white font-black">{snowball.months} Months</strong>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block">Total Interest</span>
                <strong className="text-rose-600 dark:text-rose-400 font-black">{formatCurrency(snowball.totalInterest)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Trajectory Area Chart */}
        <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-2">
          <span className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
            <TrendingDown className="h-4 w-4 text-emerald-600" /> Outstanding Debt Balance Reduction Trajectory
          </span>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [formatCurrency(v)]} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="avalanche" name="Avalanche Path" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                <Area type="monotone" dataKey="snowball" name="Snowball Path" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payoff Schedule Order */}
        {currentResult.payoffSchedule.length > 0 && (
          <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-2">
            <span className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-600" /> Priority Payoff Sequence ({selectedStrategy === 'avalanche' ? 'Avalanche' : 'Snowball'}):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentResult.payoffSchedule.map((item, idx) => (
                <div key={item.id} className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <strong className="text-gray-900 dark:text-white block truncate max-w-[150px]">{item.name}</strong>
                      <span className="text-[10px] text-gray-400">{item.apr}% APR</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    Paid in Month {item.month}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex justify-end pt-1">
          <button onClick={onClose} className="btn-primary text-xs px-5 py-2">
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
