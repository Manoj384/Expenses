import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Layout from '../components/Layout'
import DebtCard from '../components/DebtCard'
import DebtDetailsModal from '../components/DebtDetailsModal'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import SplitBillModal from '../components/SplitBillModal'
import { formatCurrency, formatCurrencyShort } from '../utils/formatCurrency'
import { fireMilestoneConfetti } from '../utils/confetti'
import {
  Plus,
  Users,
  AlertCircle,
  CreditCard,
  Building,
  User,
  ArrowUpRight,
  Calendar,
  FileText,
  DollarSign,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react'

const emptyForm = {
  name: '',
  debt_type: 'personal',
  person_name: '',
  principal: '',
  outstanding: '',
  emi: '0',
  due_day: '',
  target_date: '',
  notes: '',
}

const DEBT_TYPES = [
  {
    id: 'personal',
    label: 'Friends & Family Borrowing',
    desc: 'Money borrowed from relatives or friends',
    icon: User,
    color: 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300',
  },
  {
    id: 'lent',
    label: 'Money Lent (To Collect)',
    desc: 'Money given to friends to collect back',
    icon: ArrowUpRight,
    color: 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
  },
  {
    id: 'card',
    label: 'Credit Card EMI',
    desc: 'Credit card installments or balance',
    icon: CreditCard,
    color: 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300',
  },
  {
    id: 'bank',
    label: 'Bank / Personal Loan',
    desc: 'Personal, auto, education, or home loan',
    icon: Building,
    color: 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
  },
]

export default function Debts() {
  const { user } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tabFilter, setTabFilter] = useState('active') // 'active', 'cleared', 'lent', 'all'

  const [showModal, setShowModal] = useState(false)
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [detailsTarget, setDetailsTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')

  const fetchDebts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error: fetchErr } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr

      // Normalize records if database has basic schema
      const normalized = (data || []).map((d) => {
        let extra = {}
        try {
          const raw = localStorage.getItem(`ft_debt_extra_${d.id}`) || localStorage.getItem(`ft_debt_extra_${d.name}`)
          if (raw) extra = JSON.parse(raw)
        } catch {}

        let type = d.debt_type || extra.debt_type || 'personal'
        let pName = d.person_name || extra.person_name || ''
        let notes = d.notes || extra.notes || ''
        let target_date = d.target_date || extra.target_date || null
        const name = d.name || ''

        if (!d.debt_type && !extra.debt_type) {
          if (name.includes('💸') || name.toLowerCase().includes('lent') || name.toLowerCase().includes('lend')) type = 'lent'
          else if (name.includes('💳') || name.toLowerCase().includes('card') || name.toLowerCase().includes('emi')) type = 'card'
          else if (name.includes('🏦') || name.toLowerCase().includes('bank') || name.toLowerCase().includes('loan')) type = 'bank'
          else type = 'personal'
        }

        const status = d.status || (Number(d.outstanding) <= 0 ? 'cleared' : 'active')

        return {
          ...d,
          debt_type: type,
          person_name: pName,
          notes,
          target_date,
          status,
        }
      })

      setDebts(normalized)
    } catch {
      setError('Unable to load debts and borrowings.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchDebts()
  }, [fetchDebts])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
      outstanding:
        name === 'principal' && !editTarget && prev.outstanding === ''
          ? value
          : name === 'outstanding'
          ? value
          : prev.outstanding,
    }))
  }

  const validate = () => {
    if (!form.name.trim()) return 'Please enter a title / name for this record.'
    if (form.principal === '' || Number(form.principal) <= 0) return 'Principal amount must be greater than 0.'
    if (form.outstanding === '' || Number(form.outstanding) < 0) return 'Outstanding balance must be 0 or more.'
    return null
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormErr('')
    const err = validate()
    if (err) {
      setFormErr(err)
      return
    }

    setSaving(true)
    try {
      const fullPayload = {
        user_id: user.id,
        name: form.name.trim(),
        debt_type: form.debt_type || 'personal',
        person_name: form.person_name.trim() || null,
        principal: Number(form.principal),
        outstanding: Number(form.outstanding),
        emi: Number(form.emi) || 0,
        due_day: form.due_day !== '' ? Number(form.due_day) : null,
        target_date: form.target_date || null,
        notes: form.notes.trim() || null,
        status: Number(form.outstanding) <= 0 ? 'cleared' : 'active',
      }

      let res = editTarget?.id
        ? await supabase.from('debts').update(fullPayload).eq('id', editTarget.id)
        : await supabase.from('debts').insert(fullPayload)

      // Fallback for basic schema (if remote DB doesn't have extended columns like notes/person_name)
      if (res.error && (res.error.code === 'PGRST204' || res.error.message?.includes('column') || res.error.message?.includes('schema cache'))) {
        const basicPayload = {
          user_id: user.id,
          name: form.name.trim(),
          principal: Number(form.principal),
          outstanding: Number(form.outstanding),
          emi: Number(form.emi) || 0,
          due_day: form.due_day !== '' ? Number(form.due_day) : null,
        }

        res = editTarget?.id
          ? await supabase.from('debts').update(basicPayload).eq('id', editTarget.id)
          : await supabase.from('debts').insert(basicPayload).select()
      }

      if (res.error) throw res.error

      // Save rich metadata to local storage cache so notes/person are always visible
      const savedId = editTarget?.id || res.data?.[0]?.id || form.name.trim()
      try {
        localStorage.setItem(`ft_debt_extra_${savedId}`, JSON.stringify({
          notes: form.notes.trim(),
          person_name: form.person_name.trim(),
          debt_type: form.debt_type,
          target_date: form.target_date,
        }))
      } catch {}

      toastSuccess(editTarget ? 'Borrowing / debt record updated!' : 'New borrowing / loan recorded!')
      setShowModal(false)
      setEditTarget(null)
      setForm(emptyForm)
      fetchDebts()
    } catch (err) {
      setFormErr(err?.message || 'Unable to save debt record.')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (debt) => {
    setEditTarget(debt)
    setForm({
      name: debt.name || '',
      debt_type: debt.debt_type || 'personal',
      person_name: debt.person_name || '',
      principal: String(debt.principal || ''),
      outstanding: String(debt.outstanding || ''),
      emi: String(debt.emi || 0),
      due_day: debt.due_day !== null && debt.due_day !== undefined ? String(debt.due_day) : '',
      target_date: debt.target_date || '',
      notes: debt.notes || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    try {
      const { error: delErr } = await supabase.from('debts').delete().eq('id', id)
      if (delErr) throw delErr
      setDebts((prev) => prev.filter((d) => d.id !== id))
      toastSuccess('Record removed.')
    } catch {
      toastError('Unable to delete debt record.')
    }
  }

  const handleUpdateOutstanding = async (id, newOutstanding, repayAmt, logTxn, debtName) => {
    try {
      const isNowCleared = newOutstanding <= 0
      let res = await supabase
        .from('debts')
        .update({
          outstanding: newOutstanding,
          status: isNowCleared ? 'cleared' : 'active',
          cleared_at: isNowCleared ? new Date().toISOString() : null,
        })
        .eq('id', id)

      // Fallback if status/cleared_at columns don't exist yet
      if (res.error && (res.error.code === 'PGRST204' || res.error.message?.includes('column'))) {
        res = await supabase
          .from('debts')
          .update({ outstanding: newOutstanding })
          .eq('id', id)
      }

      if (res.error) throw res.error

      // Log transaction if checked
      if (logTxn && repayAmt > 0 && user) {
        const targetDebt = debts.find((d) => d.id === id)
        const isLent = targetDebt?.debt_type === 'lent'
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: isLent ? 'income' : 'expense',
          amount: repayAmt,
          note: isLent ? `Money collected from ${debtName}` : `Debt repayment for ${debtName}`,
          date: new Date().toISOString().slice(0, 10),
        })
      }

      if (isNowCleared) {
        fireMilestoneConfetti()
      }

      toastSuccess(
        isNowCleared
          ? `🎉 "${debtName}" has been fully settled and cleared!`
          : `Recorded payment of ${formatCurrency(repayAmt)}!`
      )
      fetchDebts()
    } catch {
      toastError('Failed to record repayment.')
    }
  }

  const handleSaveSplits = async (validFriends, desc) => {
    if (!user) return
    for (const f of validFriends) {
      const amt = parseFloat(f.amount)
      const payload = {
        user_id: user.id,
        name: `💸 Split: ${desc || 'Shared Bill'} (${f.name})`,
        debt_type: 'lent',
        person_name: f.name,
        principal: amt,
        outstanding: amt,
        emi: 0,
        notes: `Split bill with ${f.name} (Phone: ${f.phone || 'N/A'})`,
        status: 'active',
      }
      let res = await supabase.from('debts').insert(payload)
      if (res?.error && (res.error.code === 'PGRST204' || res.error.message?.includes('column') || res.error.message?.includes('schema cache'))) {
        await supabase.from('debts').insert({
          user_id: user.id,
          name: `💸 Split: ${desc || 'Shared Bill'} (${f.name})`,
          principal: amt,
          outstanding: amt,
          emi: 0,
        })
      }
    }
    toastSuccess(`Saved ${validFriends.length} split shares as lent debts!`)
    fetchDebts()
  }

  const handleSettleDebt = async (id, fullAmt, logTxn) => {
    const targetDebt = debts.find((d) => d.id === id)
    await handleUpdateOutstanding(id, 0, fullAmt, logTxn, targetDebt?.name || 'Debt')
  }

  // Filter list by selected tab
  const filteredDebts = debts.filter((d) => {
    const isCleared = d.status === 'cleared' || Number(d.outstanding) <= 0
    if (tabFilter === 'active') return !isCleared && d.debt_type !== 'lent'
    if (tabFilter === 'cleared') return isCleared
    if (tabFilter === 'lent') return d.debt_type === 'lent'
    return true
  })

  // Totals
  const activeBorrowings = debts.filter(
    (d) => d.status !== 'cleared' && Number(d.outstanding) > 0 && d.debt_type !== 'lent'
  )
  const totalOutstanding = activeBorrowings.reduce((s, d) => s + Number(d.outstanding), 0)
  const totalEmi = activeBorrowings.reduce((s, d) => s + Number(d.emi || 0), 0)

  const moneyLentList = debts.filter(
    (d) => d.debt_type === 'lent' && d.status !== 'cleared' && Number(d.outstanding) > 0
  )
  const totalToCollect = moneyLentList.reduce((s, d) => s + Number(d.outstanding), 0)

  const clearedCount = debts.filter((d) => d.status === 'cleared' || Number(d.outstanding) <= 0).length

  return (
    <Layout title="Debts, Borrowings & Loans Tracker">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Outstanding Liabilities */}
        <div className="card bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 text-white p-4 border-none shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider block">
              Total Outstanding Debt
            </span>
            <p className="text-2xl font-black text-rose-400 mt-1">{formatCurrency(totalOutstanding)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{activeBorrowings.length} Active Borrowings</p>
          </div>
        </div>

        {/* Monthly EMI Outflow */}
        <div className="card bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 text-white p-4 border-none shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">
              Monthly EMI Commitment
            </span>
            <p className="text-2xl font-black text-indigo-300 mt-1">{formatCurrency(totalEmi)}/mo</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Recurring loan payments</p>
          </div>
        </div>

        {/* Money Lent to Collect */}
        <div className="card bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-4 border-none shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block">
              Money Lent (To Collect)
            </span>
            <p className="text-2xl font-black text-emerald-400 mt-1">{formatCurrency(totalToCollect)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{moneyLentList.length} Pending Collections</p>
          </div>
        </div>

        {/* Cleared / Settled Debts */}
        <div className="card bg-gradient-to-r from-teal-950 via-slate-900 to-slate-900 text-white p-4 border-none shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-teal-300 tracking-wider block">
              Settled & Cleared
            </span>
            <p className="text-2xl font-black text-teal-300 mt-1">{clearedCount} Paid Off</p>
            <p className="text-[11px] text-slate-400 mt-0.5">100% Repaid history</p>
          </div>
        </div>
      </div>

      {/* Action Bar & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setTabFilter('active')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              tabFilter === 'active'
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Active Debts ({activeBorrowings.length})
          </button>
          <button
            onClick={() => setTabFilter('lent')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              tabFilter === 'lent'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            💸 Money Lent ({moneyLentList.length})
          </button>
          <button
            onClick={() => setTabFilter('cleared')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              tabFilter === 'cleared'
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            ✓ Settled & Cleared ({clearedCount})
          </button>
          <button
            onClick={() => setTabFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              tabFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            All ({debts.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSplitModal(true)}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2"
            title="Split an expense among friends & send WhatsApp payment links"
          >
            <Users className="h-4 w-4 text-emerald-600" /> Split Bill
          </button>
          <button
            onClick={() => {
              setEditTarget(null)
              setForm(emptyForm)
              setFormErr('')
              setShowModal(true)
            }}
            className="btn-primary text-xs flex items-center gap-1.5 py-2"
          >
            <Plus className="h-4 w-4" /> Add Borrowing / Debt
          </button>
        </div>
      </div>

      {/* Main Debts Grid */}
      {loading ? (
        <LoadingSpinner text="Loading debts..." />
      ) : filteredDebts.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={
            tabFilter === 'cleared'
              ? 'No Cleared Debts Yet'
              : tabFilter === 'lent'
              ? 'No Money Lent to Collect'
              : 'No Active Debts'
          }
          message={
            tabFilter === 'cleared'
              ? 'When you repay your debts or borrowings from friends, click "Settle" to move them here!'
              : 'Add loans or money borrowed from friends & family to track repayments.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredDebts.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onViewDetails={(d) => setDetailsTarget(d)}
              onEdit={openEdit}
              onDelete={handleDelete}
              onUpdateOutstanding={handleUpdateOutstanding}
              onSettleDebt={handleSettleDebt}
            />
          ))}
        </div>
      )}

      {/* Redesigned Spacious Create / Edit Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editTarget ? 'Edit Borrowing / Debt Record' : 'Record New Borrowing / Loan'}
        >
          <form onSubmit={handleSave} className="space-y-5 text-gray-800 dark:text-slate-100">
            {formErr && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3 rounded-xl flex items-center gap-2 text-xs font-medium">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{formErr}</span>
              </div>
            )}

            {/* Step 1: Debt Type Selector Cards */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 block mb-2">
                Select Record Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DEBT_TYPES.map((t) => {
                  const Icon = t.icon
                  const isSelected = form.debt_type === t.id
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setForm({ ...form, debt_type: t.id })}
                      className={`p-3 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${
                        isSelected
                          ? `${t.color} ring-2 ring-blue-500/20 shadow-xs font-semibold`
                          : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 shadow-xs mt-0.5">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold">{t.label}</h4>
                        <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-tight mt-0.5">
                          {t.desc}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 2: Title & Person Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-200 block mb-1">
                  Title / Record Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder={
                    form.debt_type === 'personal'
                      ? 'e.g. Borrowed for Emergency'
                      : form.debt_type === 'lent'
                      ? 'e.g. Road Trip Advance'
                      : form.debt_type === 'card'
                      ? 'e.g. iPhone 16 Credit Card EMI'
                      : 'e.g. HDFC Home Loan'
                  }
                  value={form.name}
                  onChange={handleChange}
                  className="input-field text-sm font-medium py-2.5"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-200 block mb-1">
                  Person / Counterparty (Optional)
                </label>
                <input
                  type="text"
                  name="person_name"
                  placeholder="e.g. Rahul Sharma, Dad, Landlord"
                  value={form.person_name}
                  onChange={handleChange}
                  className="input-field text-sm font-medium py-2.5"
                />
              </div>
            </div>

            {/* Step 3: Principal & Outstanding Balance with Live Short INR Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-200">
                    Original Principal (₹) <span className="text-rose-500">*</span>
                  </label>
                  {form.principal && !isNaN(form.principal) && Number(form.principal) > 0 && (
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                      {formatCurrencyShort(form.principal)}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  name="principal"
                  step="any"
                  placeholder="e.g. 50000"
                  value={form.principal}
                  onChange={handleChange}
                  className="input-field text-base font-bold py-2"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-200">
                    Current Outstanding (₹) <span className="text-rose-500">*</span>
                  </label>
                  {form.outstanding && !isNaN(form.outstanding) && Number(form.outstanding) >= 0 && (
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded">
                      {formatCurrencyShort(form.outstanding)}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  name="outstanding"
                  step="any"
                  placeholder="e.g. 50000"
                  value={form.outstanding}
                  onChange={handleChange}
                  className="input-field text-base font-bold py-2"
                  required
                />
              </div>
            </div>

            {/* Step 4: Schedule / EMI or Target Return Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-200 block mb-1">
                  Monthly EMI (₹) <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="number"
                  name="emi"
                  step="any"
                  placeholder="0"
                  value={form.emi}
                  onChange={handleChange}
                  className="input-field text-sm py-2"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-200 block mb-1">
                  {form.debt_type === 'card' || form.debt_type === 'bank'
                    ? 'Due Day of Month (1-31)'
                    : 'Target Return Date (Optional)'}
                </label>
                {form.debt_type === 'card' || form.debt_type === 'bank' ? (
                  <select
                    name="due_day"
                    value={form.due_day}
                    onChange={handleChange}
                    className="input-field text-sm py-2"
                  >
                    <option value="">— Select Due Day —</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}th of every month
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="date"
                    name="target_date"
                    value={form.target_date}
                    onChange={handleChange}
                    className="input-field text-sm py-2"
                  />
                )}
              </div>
            </div>

            {/* Step 5: Spacious Notes Textarea */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-slate-200 block mb-1">
                Notes, Agreement Remarks & Terms
              </label>
              <textarea
                name="notes"
                rows={3}
                placeholder="e.g. 0% interest, promised to repay by next bonus, or reference invoice ID..."
                value={form.notes}
                onChange={handleChange}
                className="input-field text-sm py-2.5 resize-none leading-relaxed"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary text-sm py-2.5 px-5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary text-sm py-2.5 px-6 font-bold shadow-md shadow-blue-600/20"
              >
                {saving ? 'Saving...' : editTarget ? 'Update Record' : 'Save Borrowing / Debt'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Debt Details Modal */}
      {detailsTarget && (
        <DebtDetailsModal
          isOpen={!!detailsTarget}
          onClose={() => setDetailsTarget(null)}
          debt={detailsTarget}
          onEdit={(d) => {
            setDetailsTarget(null)
            openEdit(d)
          }}
          onOpenSettle={(d) => {
            setDetailsTarget(null)
            handleSettleDebt(d.id, Number(d.outstanding), true)
          }}
        />
      )}

      {/* Split Bill Modal */}
      <SplitBillModal
        isOpen={showSplitModal}
        onClose={() => setShowSplitModal(false)}
        onSaveSplits={handleSaveSplits}
      />
    </Layout>
  )
}
