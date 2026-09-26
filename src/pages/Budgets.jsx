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

      // Calculate category spend map for current month
      const spentByCat = {}
      for (const tx of txRes.data || []) {
        if (tx.type === 'expense' && tx.category_id) {
          spentByCat[tx.category_id] = (spentByCat[tx.category_id] || 0) + parseFloat(tx.amount || 0)
        }
      }
      setSpendingMap(spentByCat)
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

  // Merge categories with budgets
  const budgetList = categories.map(cat => {
    const b = budgets.find(x => x.category_id === cat.id)
    const spent = spendingMap[cat.id] || 0
    const limit = b ? parseFloat(b.monthly_limit) : (DEFAULT_BUDGETS.find(d => d.category.toLowerCase() === cat.name.toLowerCase())?.limit || 10000)
    const threshold = b ? b.alert_threshold_pct : 80
    const pct = limit > 0 ? (spent / limit) * 100 : 0
    const isOver = spent > limit
    const isWarning = !isOver && pct >= threshold

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
    }
  })

  // Aggregate totals
  const totalBudget = budgetList.reduce((s, b) => s + b.limit, 0)
  const totalSpent = budgetList.reduce((s, b) => s + b.spent, 0)
  const totalPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
  const overspentCount = budgetList.filter(b => b.isOver).length
  const warningCount = budgetList.filter(b => b.isWarning).length

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
          <div>
            <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1.5 mb-2">
              <Zap className="h-3 w-3 text-amber-400" />
              Monthly Budget Guardrails
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {formatCurrency(totalSpent)} <span className="text-sm font-normal text-amber-200">spent of {formatCurrency(totalBudget)}</span>
            </h2>
            <div className="w-full max-w-md bg-white/10 rounded-full h-2.5 mt-3 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  totalPct >= 100 ? 'bg-rose-500' : totalPct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(totalPct, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-amber-200 mt-1.5 font-medium">
              {totalPct.toFixed(1)}% Total Budget Consumed This Month
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {overspentCount > 0 ? (
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <span>{overspentCount} Category Exceeded Limit!</span>
              </div>
            ) : warningCount > 0 ? (
              <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span>{warningCount} Categories Near 80% Cap</span>
              </div>
            ) : (
              <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>All Categories Within Safe Limits</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {budgetList.map((item) => (
          <div
            key={item.catId}
            className={`card flex flex-col justify-between border transition-all ${
              item.isOver
                ? 'border-rose-300 bg-rose-50/20 dark:bg-rose-950/10'
                : item.isWarning
                ? 'border-amber-300 bg-amber-50/20 dark:bg-amber-950/10'
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
                    ? 'bg-rose-100 text-rose-800'
                    : item.isWarning
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {item.isOver ? '⚠️ Over Budget' : item.isWarning ? '⚡ Near Cap' : '✓ Safe'}
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
                      item.isOver ? 'bg-rose-500' : item.isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(item.pct, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 pt-0.5">
                  <span>{item.pct.toFixed(0)}% consumed</span>
                  <span>{item.isOver ? `Exceeded by ${formatCurrency(item.spent - item.limit)}` : `${formatCurrency(item.limit - item.spent)} remaining`}</span>
                </div>
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
