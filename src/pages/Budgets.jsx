import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatCurrency, formatCurrencyShort } from '../utils/formatCurrency'
import { startOfMonth, endOfMonth } from '../utils/dateUtils'
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  PieChart as PieIcon,
  Plus,
  Pencil,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Layers,
  Wallet,
  Coins,
  Settings2,
  Info,
} from 'lucide-react'

const DEFAULT_BUDGETS = [
  { category: 'Food & Dining', limit: 15000, threshold: 80 },
  { category: 'Shopping', limit: 10000, threshold: 80 },
  { category: 'Fuel', limit: 5000, threshold: 80 },
  { category: 'Groceries', limit: 8000, threshold: 80 },
  { category: 'Entertainment', limit: 4000, threshold: 80 },
  { category: 'Utilities', limit: 6000, threshold: 80 },
]

export default function Budgets() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState([])
  const [spendingMap, setSpendingMap] = useState({})
  const [monthlyIncome, setMonthlyIncome] = useState(() => {
    return parseFloat(localStorage.getItem('ft_custom_monthly_income')) || 85000
  })
  const [editingIncome, setEditingIncome] = useState(false)
  const [incomeInput, setIncomeInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editCategory, setEditCategory] = useState(null)
  const [limitInput, setLimitInput] = useState('')
  const [thresholdInput, setThresholdInput] = useState('80')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const monthStart = startOfMonth()
      const monthEnd = endOfMonth()

      const [catRes, budRes, txRes] = await Promise.all([
        supabase.from('categories').select('*').eq('user_id', user.id).eq('type', 'expense'),
        supabase.from('budgets').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('amount, category_id, type').eq('user_id', user.id).gte('date', monthStart).lte('date', monthEnd),
      ])

      const cats = catRes.data || []
      setCategories(cats)
      setBudgets(budRes.data || [])

      // Calculate category spend map and income for current month
      const spentByCat = {}
      let detectedIncome = 0
      for (const tx of txRes.data || []) {
        if (tx.type === 'expense' && tx.category_id) {
          spentByCat[tx.category_id] = (spentByCat[tx.category_id] || 0) + parseFloat(tx.amount || 0)
        } else if (tx.type === 'income') {
          detectedIncome += parseFloat(tx.amount || 0)
        }
      }
      setSpendingMap(spentByCat)

      // If user has actual logged income this month, use it unless custom overridden
      if (detectedIncome > 0 && !localStorage.getItem('ft_custom_monthly_income')) {
        setMonthlyIncome(detectedIncome)
      }
    } catch {
      setError('Unable to load budget settings.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  // Days in month calculation for spending velocity
  const now = new Date()
  const currentDay = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysRemaining = Math.max(daysInMonth - currentDay, 1)

  // Merge categories with budgets & compute spending velocity
  const budgetList = categories.map(cat => {
    const b = budgets.find(x => x.category_id === cat.id)
    const spent = spendingMap[cat.id] || 0
    const limit = b ? parseFloat(b.monthly_limit) : (DEFAULT_BUDGETS.find(d => d.category.toLowerCase() === cat.name.toLowerCase())?.limit || 10000)
    const threshold = b ? b.alert_threshold_pct : 80
    const pct = limit > 0 ? (spent / limit) * 100 : 0
    const isOver = spent > limit
    const isWarning = !isOver && pct >= threshold

    // Spending velocity metrics
    const dailyBurnRate = spent / Math.max(currentDay, 1)
    const projectedSpend = dailyBurnRate * daysInMonth
    const projectedDiff = limit - projectedSpend
    const willOvershoot = !isOver && projectedSpend > limit

    return {
      catId: cat.id,
      catName: cat.name,
      budgetId: b?.id,
      spent,
      limit,
      threshold,
      pct,
      isOver,
      isWarning,
      dailyBurnRate,
      projectedSpend,
      projectedDiff,
      willOvershoot,
    }
  })

  // Aggregate totals
  const totalBudget = budgetList.reduce((s, b) => s + b.limit, 0)
  const totalSpent = budgetList.reduce((s, b) => s + b.spent, 0)
  const totalPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
  const overspentCount = budgetList.filter(b => b.isOver).length
  const atRiskCount = budgetList.filter(b => b.willOvershoot).length
  const warningCount = budgetList.filter(b => b.isWarning).length
  const overallDailyBurn = totalSpent / Math.max(currentDay, 1)
  const overallProjectedSpend = overallDailyBurn * daysInMonth


  const handleSaveBudget = async (e) => {
    e.preventDefault()
    const limit = parseFloat(limitInput)
    if (!limit || limit <= 0 || !editCategory) return

    setSaving(true)
    try {
      const payload = {
        user_id: user.id,
        category_id: editCategory.catId,
        monthly_limit: limit,
        alert_threshold_pct: parseInt(thresholdInput) || 80,
      }

      if (editCategory.budgetId) {
        await supabase.from('budgets').update(payload).eq('id', editCategory.budgetId)
      } else {
        await supabase.from('budgets').insert(payload)
      }

      flash(`Budget limit updated for ${editCategory.catName}!`)
      setShowModal(false)
      setEditCategory(null)
      fetchData()
    } catch {
      setError('Failed to update budget limit.')
    } finally {
      setSaving(false)
    }
  }

  // Zero-Based Budgeting (YNAB style) computations
  const unassignedAmount = monthlyIncome - totalBudget
  const isZeroBalanced = unassignedAmount === 0
  const isOverAssigned = unassignedAmount < 0
  const assignedPct = monthlyIncome > 0 ? (totalBudget / monthlyIncome) * 100 : 0

  const handleSaveIncome = (e) => {
    e.preventDefault()
    const val = parseFloat(incomeInput)
    if (!isNaN(val) && val >= 0) {
      setMonthlyIncome(val)
      localStorage.setItem('ft_custom_monthly_income', val.toString())
      flash('Monthly baseline income updated!')
    }
    setEditingIncome(false)
  }

  const handleResetIncome = () => {
    localStorage.removeItem('ft_custom_monthly_income')
    fetchData()
    flash('Reset to automatically detected monthly income.')
    setEditingIncome(false)
  }

  return (
    <Layout title="Smart Budget Caps & Spending Alerts">
      {error && <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg mb-4">{error}</div>}
      {success && (
        <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="card mb-6 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-6 border-none shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-amber-400" />
                Monthly Budget & Spending Velocity
              </span>
              <span className="text-[11px] text-amber-300/80 font-medium">
                Day {currentDay} of {daysInMonth} ({daysRemaining} days left)
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {formatCurrency(totalSpent)} <span className="text-sm font-normal text-amber-200">spent of {formatCurrency(totalBudget)}</span>
            </h2>
            <div className="w-full max-w-md bg-white/10 rounded-full h-2.5 mt-2 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  totalPct >= 100 ? 'bg-rose-500' : totalPct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(totalPct, 100)}%` }}
              ></div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-amber-200 pt-1">
              <span>{totalPct.toFixed(1)}% consumed</span>
              <span>•</span>
              <span>Daily Burn: <strong className="text-white font-bold">{formatCurrency(overallDailyBurn)}/day</strong></span>
              <span>•</span>
              <span>
                Projected Total:{' '}
                <strong className={overallProjectedSpend > totalBudget ? 'text-rose-300 font-bold' : 'text-emerald-300 font-bold'}>
                  {formatCurrency(overallProjectedSpend)}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {overspentCount > 0 ? (
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <span>{overspentCount} Category Exceeded Limit!</span>
              </div>
            ) : atRiskCount > 0 ? (
              <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span>{atRiskCount} Categories at High Burn Velocity</span>
              </div>
            ) : (
              <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Pacing Well • All Limits Safe</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zero-Based Budgeting (YNAB Envelope Assistant) */}
      <div className="card mb-6 border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-600 text-white text-[11px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1.5 shadow-xs">
                <Layers className="h-3 w-3" />
                Zero-Based Budgeting (YNAB Method)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Give Every Rupee a Job
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-2 pt-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly Inflow:</span>
              <span className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(monthlyIncome)}</span>
              <span className="text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Assigned:</span>
              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(totalBudget)}</span>
              <span className="text-slate-400">({assignedPct.toFixed(0)}%)</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {isZeroBalanced ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Every single rupee is accounted for! 100% Zero-based budget efficiency.
                </span>
              ) : isOverAssigned ? (
                <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Over-assigned by {formatCurrency(Math.abs(unassignedAmount))}! Lower category limits to match incoming cash.
                </span>
              ) : (
                <span className="text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <strong>{formatCurrency(unassignedAmount)} left to assign:</strong> Allocate to Emergency Fund, Mutual Fund SIPs, or Savings Goals.
                </span>
              )}
            </p>
          </div>

          {/* Left to assign badge & income config */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div
              className={`px-4 py-3 rounded-2xl border text-center min-w-[170px] ${
                isZeroBalanced
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : isOverAssigned
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider">
                {isOverAssigned ? 'Over Budget' : 'Left to Assign'}
              </div>
              <div className="text-xl font-black">
                {formatCurrency(Math.abs(unassignedAmount))}
              </div>
            </div>

            <button
              onClick={() => {
                setIncomeInput(monthlyIncome.toString())
                setEditingIncome(!editingIncome)
              }}
              className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 h-10 self-center"
              title="Change expected monthly income baseline"
            >
              <Settings2 className="h-3.5 w-3.5 text-slate-500" />
              <span>Set Inflow</span>
            </button>
          </div>
        </div>

        {/* Edit Income inline form */}
        {editingIncome && (
          <form onSubmit={handleSaveIncome} className="mt-4 pt-4 border-t border-indigo-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Expected Monthly Inflow (₹):
            </div>
            <input
              type="number"
              min="0"
              value={incomeInput}
              onChange={(e) => setIncomeInput(e.target.value)}
              placeholder="e.g. 85000"
              className="input text-xs w-36 py-1.5 px-2"
              autoFocus
            />
            <button type="submit" className="btn-primary text-xs py-1.5 px-3">
              Save Inflow
            </button>
            <button type="button" onClick={handleResetIncome} className="btn-secondary text-xs py-1.5 px-3">
              Auto-Detect
            </button>
            <button type="button" onClick={() => setEditingIncome(false)} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* Category Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {budgetList.map((item) => (
          <div
            key={item.catId}
            className={`card flex flex-col justify-between border transition-all ${
              item.isOver
                ? 'border-rose-300 bg-rose-50/20 dark:bg-rose-950/10 shadow-sm'
                : item.willOvershoot
                ? 'border-amber-300 bg-amber-50/20 dark:bg-amber-950/10 shadow-sm'
                : 'border-gray-100 dark:border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                  {item.catName}
                </h3>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  item.isOver
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : item.willOvershoot
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                  {item.isOver ? '⚠️ Exceeded' : item.willOvershoot ? '🔥 High Burn Rate' : '✓ Safe Pace'}
                </span>
              </div>

              {/* Progress */}
              <div className="space-y-1 my-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span className={item.isOver ? 'text-rose-600' : 'text-gray-900 dark:text-white'}>
                    {formatCurrency(item.spent)}
                  </span>
                  <span className="text-gray-400">Limit: {formatCurrency(item.limit)}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      item.isOver ? 'bg-rose-500' : item.willOvershoot ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(item.pct, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 dark:text-slate-400 pt-0.5">
                  <span>{item.pct.toFixed(0)}% consumed</span>
                  <span>{item.isOver ? `Exceeded by ${formatCurrency(item.spent - item.limit)}` : `${formatCurrency(item.limit - item.spent)} left`}</span>
                </div>
              </div>

              {/* Spending Velocity Pill */}
              <div className={`p-2 rounded-xl text-[11px] mb-3 flex items-center justify-between ${
                item.isOver
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
                  : item.willOvershoot
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50'
                  : 'bg-gray-50 dark:bg-slate-800/60 text-gray-600 dark:text-slate-400'
              }`}>
                <span>Burn: <strong>{formatCurrency(item.dailyBurnRate)}/day</strong></span>
                <span>
                  {item.isOver
                    ? 'Cap breached'
                    : item.willOvershoot
                    ? `Projected: ${formatCurrency(item.projectedSpend)}`
                    : `On track (+${formatCurrency(item.projectedDiff)})`}
                </span>
              </div>
            </div>


            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  setEditCategory(item)
                  setLimitInput(String(item.limit))
                  setThresholdInput(String(item.threshold))
                  setShowModal(true)
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Pencil className="h-3.5 w-3.5" /> Adjust Budget
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Budget Modal */}
      {showModal && editCategory && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={`Set Budget Limit: ${editCategory.catName}`}
        >
          <form onSubmit={handleSaveBudget} className="space-y-4">
            <div>
              <label className="label">Monthly Spending Cap (₹)</label>
              <input
                type="number"
                placeholder="e.g. 15000"
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                className="input"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="label">Alert Warning Threshold (%)</label>
              <input
                type="number"
                min="10"
                max="100"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="input"
                required
              />
              <p className="text-[11px] text-gray-500 mt-1">Show amber warning when spending reaches this percentage of budget</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary text-xs">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary text-xs">
                {saving ? 'Saving...' : 'Save Limit'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  )
}
