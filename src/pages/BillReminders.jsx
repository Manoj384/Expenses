import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate, today } from '../utils/dateUtils'
import {
  Calendar,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  CreditCard,
  Building,
  Tv,
  Wifi,
  Shield,
  Dumbbell,
  Receipt,
  ArrowUpRight,
  Bell,
  Check,
  RotateCcw,
  Skull,
} from 'lucide-react'

const BILL_CATEGORIES = [
  { id: 'utilities', label: 'Electricity & Utilities', icon: Zap },
  { id: 'rent', label: 'House Rent / Maintenance', icon: Building },
  { id: 'internet', label: 'Broadband WiFi & Mobile', icon: Wifi },
  { id: 'subscription', label: 'OTT & Media Subscriptions', icon: Tv },
  { id: 'insurance', label: 'Health & Term Insurance', icon: Shield },
  { id: 'loan_emi', label: 'Loan / Card EMI', icon: CreditCard },
  { id: 'fitness', label: 'Gym & Fitness', icon: Dumbbell },
  { id: 'other', label: 'Other Recurring Bill', icon: Receipt },
]

const DEFAULT_BILLS = [
  {
    id: 'bill-seed-1',
    name: 'Apartment Monthly Rent',
    amount: 18500,
    due_day: 5,
    category: 'rent',
    frequency: 'monthly',
    auto_log_transaction: true,
    paid_months: ['2026-09'],
    notes: 'Direct transfer to landlord account',
  },
  {
    id: 'bill-seed-2',
    name: 'Airtel Fiber Gigabit Broadband',
    amount: 1179,
    due_day: 15,
    category: 'internet',
    frequency: 'monthly',
    auto_log_transaction: true,
    paid_months: ['2026-09'],
    notes: 'Autopay via Credit Card',
  },
  {
    id: 'bill-seed-3',
    name: 'Bescom Electricity Bill',
    amount: 2450,
    due_day: 22,
    category: 'utilities',
    frequency: 'monthly',
    auto_log_transaction: true,
    paid_months: [],
    notes: 'Consumer ID: 88472910',
  },
  {
    id: 'bill-seed-4',
    name: 'Netflix & Spotify Family Pack',
    amount: 848,
    due_day: 28,
    category: 'subscription',
    frequency: 'monthly',
    auto_log_transaction: true,
    paid_months: [],
    notes: 'Shared family subscription',
  },
]

export default function BillReminders() {
  const { user } = useAuth()
  const storageKey = `ft_bill_reminders_${user?.id || 'guest'}`
  const currentMonthKey = new Date().toISOString().slice(0, 7) // '2026-09'
  const currentDay = new Date().getDate()

  const [bills, setBills] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : DEFAULT_BILLS
    } catch {
      return DEFAULT_BILLS
    }
  })

  const [categories, setCategories] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Form
  const [form, setForm] = useState({
    name: '',
    amount: '',
    due_day: '5',
    category: 'utilities',
    frequency: 'monthly',
    auto_log_transaction: true,
    notes: '',
  })

  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  // Sync to cloud / storage
  const saveBills = useCallback((newBills) => {
    setBills(newBills)
    try {
      localStorage.setItem(`ft_bill_reminders_${user?.id || 'guest'}`, JSON.stringify(newBills))
    } catch {}
  }, [user])

  // Load user categories & payment methods to optionally link transactions
  useEffect(() => {
    if (!user) return
    supabase.from('categories').select('id, name, type').eq('user_id', user.id).then(({ data }) => setCategories(data || []))
    supabase.from('payment_methods').select('id, name').eq('user_id', user.id).then(({ data }) => setPaymentMethods(data || []))
  }, [user])

  // Status calculation for each bill
  const billsWithStatus = useMemo(() => {
    return bills.map(b => {
      const isPaid = (b.paid_months || []).includes(currentMonthKey)
      const dueDay = parseInt(b.due_day) || 1
      const daysDiff = dueDay - currentDay

      let status = 'upcoming'
      let statusLabel = `Due on ${dueDay}th`
      let badgeStyle = 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'

      if (isPaid) {
        status = 'paid'
        statusLabel = '✓ Paid for This Month'
        badgeStyle = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
      } else if (daysDiff < 0) {
        status = 'overdue'
        statusLabel = `⚠️ Overdue by ${Math.abs(daysDiff)} days`
        badgeStyle = 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
      } else if (daysDiff === 0) {
        status = 'due_today'
        statusLabel = '🚨 Due Today!'
        badgeStyle = 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 animate-pulse'
      } else if (daysDiff <= 3) {
        status = 'due_soon'
        statusLabel = `⚡ Due in ${daysDiff} days`
        badgeStyle = 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
      }

      return {
        ...b,
        isPaid,
        status,
        statusLabel,
        badgeStyle,
        daysDiff,
      }
    })
  }, [bills, currentMonthKey, currentDay])

  // Aggregate Metrics
  const totalMonthlyCommitment = billsWithStatus.reduce((s, b) => s + parseFloat(b.amount || 0), 0)
  const totalPaidSoFar = billsWithStatus.filter(b => b.isPaid).reduce((s, b) => s + parseFloat(b.amount || 0), 0)
  const totalPendingDue = totalMonthlyCommitment - totalPaidSoFar
  const overdueCount = billsWithStatus.filter(b => b.status === 'overdue').length
  const pendingCount = billsWithStatus.filter(b => !b.isPaid).length

  // --- Toggle Paid / Unpaid ---
  const handleTogglePaid = async (bill) => {
    const isCurrentlyPaid = (bill.paid_months || []).includes(currentMonthKey)
    let newPaidMonths

    if (isCurrentlyPaid) {
      newPaidMonths = (bill.paid_months || []).filter(m => m !== currentMonthKey)
      flash(`Marked "${bill.name}" as pending.`)
    } else {
      newPaidMonths = [...(bill.paid_months || []), currentMonthKey]
      flash(`Marked "${bill.name}" (${formatCurrency(bill.amount)}) as paid!`)

      // Auto-create transaction in transactions table if user enabled it
      if (user && bill.auto_log_transaction) {
        try {
          const matchedCat = categories.find(c => c.name.toLowerCase().includes(bill.category.toLowerCase()) || c.name.toLowerCase().includes('bills'))
          await supabase.from('transactions').insert({
            user_id: user.id,
            type: 'expense',
            amount: parseFloat(bill.amount),
            category_id: matchedCat?.id || categories[0]?.id || null,
            payment_method_id: paymentMethods[0]?.id || null,
            note: `Recurring Bill: ${bill.name}`,
            date: today(),
          })
        } catch {}
      }
    }

    const updated = bills.map(b => b.id === bill.id ? { ...b, paid_months: newPaidMonths } : b)
    saveBills(updated)
  }

  // --- Save / Edit Bill ---
  const handleSaveBill = (e) => {
    e.preventDefault()
    const amt = parseFloat(form.amount)
    if (!form.name.trim() || !amt || amt <= 0) {
      setError('Please provide bill name and valid amount.')
      return
    }

    if (editTarget) {
      const updated = bills.map(b =>
        b.id === editTarget.id
          ? {
              ...b,
              name: form.name.trim(),
              amount: amt,
              due_day: parseInt(form.due_day) || 1,
              category: form.category,
              notes: form.notes.trim() || '',
              auto_log_transaction: form.auto_log_transaction,
            }
          : b
      )
      saveBills(updated)
      flash('Bill updated!')
    } else {
      const newBill = {
        id: `bill_${Date.now()}`,
        name: form.name.trim(),
        amount: amt,
        due_day: parseInt(form.due_day) || 1,
        category: form.category,
        frequency: form.frequency || 'monthly',
        auto_log_transaction: form.auto_log_transaction,
        paid_months: [],
        notes: form.notes.trim() || '',
      }
      const updated = [newBill, ...bills]
      saveBills(updated)
      flash(`Added "${newBill.name}" to recurring bills!`)
    }

    setShowAddModal(false)
    setEditTarget(null)
    setForm({ name: '', amount: '', due_day: '5', category: 'utilities', frequency: 'monthly', auto_log_transaction: true, notes: '' })
  }

  const handleDeleteBill = () => {
    if (!deleteTarget) return
    const updated = bills.filter(b => b.id !== deleteTarget.id)
    saveBills(updated)
    setDeleteTarget(null)
    flash('Bill deleted.')
  }

  return (
    <Layout title="Bill Reminders & Recurring Subscriptions">
      {error && <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg mb-4">{error}</div>}
      {success && (
        <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Hero Summary Card */}
      <div className="card mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 border-none shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-indigo-400" />
              Monthly Fixed Commitments • {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {formatCurrency(totalMonthlyCommitment)} <span className="text-sm font-normal text-indigo-200">total monthly bills</span>
            </h2>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-indigo-200">
              <span className="font-semibold text-emerald-300">Paid: {formatCurrency(totalPaidSoFar)}</span>
              <span>•</span>
              <span className={totalPendingDue > 0 ? 'font-semibold text-amber-300' : 'text-indigo-200'}>
                Pending: {formatCurrency(totalPendingDue)} ({pendingCount} bills)
              </span>
              {overdueCount > 0 && (
                <>
                  <span>•</span>
                  <span className="bg-rose-500/30 text-rose-200 font-bold px-2 py-0.5 rounded-md border border-rose-400/40">
                    🚨 {overdueCount} Overdue!
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-subscription-leak'))}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all border border-purple-400/30"
              title="Audit digital streaming, SaaS, and gym subscriptions"
            >
              <Skull className="h-4 w-4 text-purple-200" />
              <span>Zombie Leaks</span>
            </button>
            <button
              onClick={() => {
                setEditTarget(null)
                setForm({ name: '', amount: '', due_day: '5', category: 'utilities', frequency: 'monthly', auto_log_transaction: true, notes: '' })
                setShowAddModal(true)
              }}
              className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" /> Add Recurring Bill
            </button>
          </div>
        </div>
      </div>

      {/* Bill List */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Active Recurring Bills ({bills.length})</h3>
          <span className="text-[11px] text-gray-500 dark:text-slate-400">Click checkmark to toggle monthly payment</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {billsWithStatus.map(bill => {
            const CatIcon = BILL_CATEGORIES.find(c => c.id === bill.category)?.icon || Receipt
            return (
              <div
                key={bill.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  bill.isPaid
                    ? 'bg-gray-50/70 dark:bg-slate-800/30 border-gray-200 dark:border-slate-800 opacity-80'
                    : bill.status === 'overdue'
                    ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 shadow-xs'
                    : bill.status === 'due_today' || bill.status === 'due_soon'
                    ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        bill.isPaid ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      }`}>
                        <CatIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{bill.name}</h4>
                        <span className="text-[10px] text-gray-400 capitalize">{bill.category.replace('_', ' ')} • Due on {bill.due_day}th</span>
                      </div>
                    </div>

                    <p className="text-base font-extrabold text-gray-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(bill.amount)}
                    </p>
                  </div>

                  {bill.notes && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 italic mb-2">"{bill.notes}"</p>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-2">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${bill.badgeStyle}`}>
                    {bill.statusLabel}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePaid(bill)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                        bill.isPaid
                          ? 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-300'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                      }`}
                      title={bill.isPaid ? 'Mark as Unpaid' : 'Mark as Paid for this month'}
                    >
                      {bill.isPaid ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      {bill.isPaid ? 'Undo' : 'Mark Paid'}
                    </button>

                    <button
                      onClick={() => {
                        setEditTarget(bill)
                        setForm({
                          name: bill.name,
                          amount: String(bill.amount),
                          due_day: String(bill.due_day || 5),
                          category: bill.category || 'utilities',
                          frequency: bill.frequency || 'monthly',
                          auto_log_transaction: bill.auto_log_transaction ?? true,
                          notes: bill.notes || '',
                        })
                        setShowAddModal(true)
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => setDeleteTarget(bill)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add / Edit Bill Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editTarget ? 'Edit Recurring Bill' : 'Add Recurring Bill'}
      >
        <form onSubmit={handleSaveBill} className="space-y-4 text-xs">
          <div>
            <label className="label">Bill / Subscription Name *</label>
            <input
              type="text"
              placeholder="e.g. Electricity, House Rent, Netflix"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="input-field text-xs font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monthly Amount (₹) *</label>
              <input
                type="number"
                placeholder="2500"
                value={form.amount}
                onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                className="input-field text-xs font-bold text-emerald-600"
                required
                step="any"
              />
            </div>

            <div>
              <label className="label">Monthly Due Date (Day of Month) *</label>
              <select
                value={form.due_day}
                onChange={(e) => setForm(prev => ({ ...prev, due_day: e.target.value }))}
                className="input-field text-xs font-semibold"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}th of every month</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
              className="input-field text-xs font-semibold"
            >
              {BILL_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Notes / Account / Consumer ID (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Consumer ID, Autopay card, landlord details"
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="input-field text-xs"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="autoLogTx"
              checked={form.auto_log_transaction}
              onChange={(e) => setForm(prev => ({ ...prev, auto_log_transaction: e.target.checked }))}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="autoLogTx" className="text-xs text-gray-700 dark:text-slate-300 font-medium">
              Auto-create transaction record when marked as paid
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary text-xs">Cancel</button>
            <button type="submit" className="btn-primary text-xs">{editTarget ? 'Save Changes' : 'Add Bill'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Bill Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Recurring Bill?"
        message={`Are you sure you want to remove "${deleteTarget?.name}" from your recurring bills?`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteBill}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  )
}
