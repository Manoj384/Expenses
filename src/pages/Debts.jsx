import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Layout from '../components/Layout'
import DebtCard from '../components/DebtCard'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import { formatCurrency, formatCurrencyShort } from '../utils/formatCurrency'
import {
  Plus,
  CreditCard,
  Building,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  ListFilter,
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

export default function Debts() {
  const { user } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tabFilter, setTabFilter] = useState('active') // 'active', 'cleared', 'lent', 'all'

  const [showModal, setShowModal] = useState(false)
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
      const normalized = (data || []).map(d => {
        let type = d.debt_type || 'personal'
        let pName = d.person_name || ''
        const name = d.name || ''

        if (!d.debt_type) {
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
      outstanding: (name === 'principal' && !editTarget && prev.outstanding === '') ? value : (name === 'outstanding' ? value : prev.outstanding),
    }))
  }

  const validate = () => {
    if (!form.name.trim()) return 'Record name is required.'
    if (form.principal === '' || Number(form.principal) <= 0) return 'Principal amount must be > 0.'
    if (form.outstanding === '' || Number(form.outstanding) < 0) return 'Outstanding must be ≥ 0.'
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

      // If database doesn't have extended columns, gracefully fallback to basic schema
      if (res.error && (res.error.code === 'PGRST204' || res.error.message?.includes('column'))) {
        const typePrefix = form.debt_type === 'personal' ? '🤝 ' : form.debt_type === 'lent' ? '💸 ' : form.debt_type === 'card' ? '💳 ' : ''
        const personSuffix = form.person_name ? ` (${form.person_name.trim()})` : ''
        const cleanName = `${typePrefix}${form.name.trim()}${personSuffix}`

        const basicPayload = {
          user_id: user.id,
          name: cleanName,
          principal: Number(form.principal),
          outstanding: Number(form.outstanding),
          emi: Number(form.emi) || 0,
          due_day: form.due_day !== '' ? Number(form.due_day) : null,
        }

        res = editTarget?.id
          ? await supabase.from('debts').update(basicPayload).eq('id', editTarget.id)
          : await supabase.from('debts').insert(basicPayload)
      }

      if (res.error) throw res.error

      toastSuccess(editTarget ? 'Debt details updated!' : 'New borrowing / debt recorded!')
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
      name: debt.name.replace(/^[🤝💸💳🏦]\s*/, '').replace(/\s*\([^)]*\)$/, ''),
      debt_type: debt.debt_type || 'personal',
      person_name: debt.person_name || '',
      principal: String(debt.principal),
      outstanding: String(debt.outstanding),
      emi: String(debt.emi || 0),
      due_day: debt.due_day !== null ? String(debt.due_day) : '',
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

      toastSuccess(isNowCleared ? `🎉 "${debtName}" has been fully settled and cleared!` : `Recorded payment of ${formatCurrency(repayAmt)}!`)
      fetchDebts()
    } catch {
      toastError('Failed to record repayment.')
    }
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
  const activeBorrowings = debts.filter((d) => (d.status !== 'cleared' && Number(d.outstanding) > 0 && d.debt_type !== 'lent'))
  const totalOutstanding = activeBorrowings.reduce((s, d) => s + Number(d.outstanding), 0)
  const totalEmi = activeBorrowings.reduce((s, d) => s + Number(d.emi || 0), 0)

  const moneyLentList = debts.filter((d) => d.debt_type === 'lent' && d.status !== 'cleared' && Number(d.outstanding) > 0)
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
            <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider block">Total Outstanding Debt</span>
            <p className="text-2xl font-black text-rose-400 mt-1">{formatCurrency(totalOutstanding)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{activeBorrowings.length} Active Borrowings</p>
          </div>
        </div>

        {/* Monthly EMI Outflow */}
        <div className="card bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 text-white p-4 border-none shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">Monthly EMI Commitment</span>
            <p className="text-2xl font-black text-indigo-300 mt-1">{formatCurrency(totalEmi)}/mo</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Recurring loan payments</p>
          </div>
        </div>

        {/* Money Lent to Collect */}
        <div className="card bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-4 border-none shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block">Money Lent (To Collect)</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">{formatCurrency(totalToCollect)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{moneyLentList.length} Pending Collections</p>
          </div>
        </div>

        {/* Cleared / Settled Debts */}
        <div className="card bg-gradient-to-r from-teal-950 via-slate-900 to-slate-900 text-white p-4 border-none shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-teal-300 tracking-wider block">Settled & Cleared</span>
            <p className="text-2xl font-black text-teal-300 mt-1">{clearedCount} Paid Off</p>
            <p className="text-[11px] text-slate-400 mt-0.5">100% Repaid history</p>
          </div>
        </div>
      </div>

      {/* Action Bar & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setTabFilter('active')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              tabFilter === 'active' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Active Debts ({activeBorrowings.length})
          </button>
          <button
            onClick={() => setTabFilter('lent')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              tabFilter === 'lent' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            💸 Money Lent ({moneyLentList.length})
          </button>
          <button
            onClick={() => setTabFilter('cleared')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              tabFilter === 'cleared' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            ✓ Settled & Cleared ({clearedCount})
          </button>
          <button
            onClick={() => setTabFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              tabFilter === 'all' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            All Records ({debts.length})
          </button>
        </div>

        <button
          onClick={() => {
            setEditTarget(null)
            setForm(emptyForm)
            setFormErr('')
            setShowModal(true)
          }}
          className="btn btn-primary text-xs flex items-center gap-1.5 py-2"
        >
          <Plus className="h-4 w-4" /> Add Borrowing / Debt
        </button>
      </div>

      {/* Main Debts Grid */}
      {loading ? (
        <LoadingSpinner text="Loading debts..." />
      ) : filteredDebts.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={tabFilter === 'cleared' ? 'No Cleared Debts Yet' : tabFilter === 'lent' ? 'No Money Lent to Collect' : 'No Active Debts'}
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
              onEdit={openEdit}
              onDelete={handleDelete}
              onUpdateOutstanding={handleUpdateOutstanding}
              onSettleDebt={handleSettleDebt}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editTarget ? 'Edit Borrowing / Debt Record' : 'Record New Borrowing / Loan'}
        >
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            {formErr && (
              <div className="bg-red-50 text-red-700 p-2.5 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{formErr}</span>
              </div>
            )}

            <div>
              <label className="label">Type of Record</label>
              <select
                name="debt_type"
                value={form.debt_type}
                onChange={handleChange}
                className="input text-xs"
              >
                <option value="personal">🤝 Borrowed from Friend / Family</option>
                <option value="lent">💸 Money Lent to Friend / Family (To Collect)</option>
                <option value="bank">🏦 Bank Loan (Personal / Auto / Home)</option>
                <option value="card">💳 Credit Card EMI / Overdraft</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Title / Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Borrowed from Rahul, HDFC Car Loan"
                  value={form.name}
                  onChange={handleChange}
                  className="input text-xs"
                  required
                />
              </div>

              <div>
                <label className="label">Contact / Person Name (Optional)</label>
                <input
                  type="text"
                  name="person_name"
                  placeholder="e.g. Rahul Sharma, Dad, Brother"
                  value={form.person_name}
                  onChange={handleChange}
                  className="input text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Original Principal (₹)</label>
                <input
                  type="number"
                  name="principal"
                  step="any"
                  placeholder="e.g. 50000"
                  value={form.principal}
                  onChange={handleChange}
                  className="input text-xs"
                  required
                />
              </div>

              <div>
                <label className="label">Current Outstanding Balance (₹)</label>
                <input
                  type="number"
                  name="outstanding"
                  step="any"
                  placeholder="e.g. 50000"
                  value={form.outstanding}
                  onChange={handleChange}
                  className="input text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Monthly EMI (₹) (Optional)</label>
                <input
                  type="number"
                  name="emi"
                  step="any"
                  placeholder="0"
                  value={form.emi}
                  onChange={handleChange}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label">Target Return Date (Optional)</label>
                <input
                  type="date"
                  name="target_date"
                  value={form.target_date}
                  onChange={handleChange}
                  className="input text-xs"
                />
              </div>
            </div>

            <div>
              <label className="label">Notes / Purpose (Optional)</label>
              <input
                type="text"
                name="notes"
                placeholder="e.g. For laptop purchase, will return on next salary"
                value={form.notes}
                onChange={handleChange}
                className="input text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary text-xs"
              >
                {saving ? 'Saving...' : editTarget ? 'Update Record' : 'Save Record'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  )
}
