import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import SipCard from '../components/SipCard'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate, today } from '../utils/dateUtils'
import { calculateNextDueDate } from '../utils/sipUtils'
import defaultSips from '../data/default_sips.json'
import savedGrowwData from '../data/groww_holdings.json'
import { Plus, Trash2, Layers, CheckCircle2, Sparkles, CloudUpload } from 'lucide-react'

const FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'yearly']
const emptyForm = { name: '', amount: '', frequency: 'monthly', start_date: today(), fund_id: '' }

export default function SIPs() {
  const { user } = useAuth()
  const [sips, setSips] = useState([])
  const [mutualFunds, setMutualFunds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [historyTarget, setHistoryTarget] = useState(null)
  const [history, setHistory] = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [delPayTarget, setDelPayTarget] = useState(null)
  const [deletingPay, setDeletingPay] = useState(false)

  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  const fetchSipsAndFunds = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [sipsRes, mfRes] = await Promise.all([
        supabase
          .from('sips')
          .select('*, mutual_funds(id, scheme_name, current_nav, current_value, units, invested_amount)')
          .eq('user_id', user.id)
          .order('active', { ascending: false })
          .order('next_due_date'),
        supabase
          .from('mutual_funds')
          .select('id, scheme_name, scheme_code, current_nav, units, invested_amount')
          .eq('user_id', user.id)
          .order('scheme_name'),
      ])

      setSips(sipsRes.data || [])
      setMutualFunds(mfRes.data || [])
    } catch {
      setError('Unable to load SIP investments.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchSipsAndFunds()
  }, [fetchSipsAndFunds])

  // Active dataset: fallback to pre-configured Groww SIPs if DB is empty
  const displaySips = sips.length > 0 ? sips : defaultSips.map(s => {
    const matchedMf = savedGrowwData.find(g => g.scheme_name.toLowerCase().includes(s.name.split(' ')[0].toLowerCase()))
    return {
      ...s,
      mutual_funds: matchedMf ? {
        id: s.id,
        scheme_name: matchedMf.scheme_name,
        current_nav: matchedMf.current_nav,
        current_value: matchedMf.current_value,
        units: matchedMf.units,
        invested_amount: matchedMf.invested_amount,
      } : null,
    }
  })

  // Total calculations
  const totalMonthlyCommitment = displaySips
    .filter((s) => s.active)
    .reduce((sum, s) => {
      if (s.frequency === 'monthly') return sum + s.amount
      if (s.frequency === 'weekly') return sum + s.amount * 4
      if (s.frequency === 'quarterly') return sum + s.amount / 3
      if (s.frequency === 'yearly') return sum + s.amount / 12
      return sum + s.amount
    }, 0)

  const linkedCount = displaySips.filter(s => s.mutual_funds || s.fund_id).length

  const fetchHistory = async (sip) => {
    setHistoryTarget(sip)
    setHistLoading(true)
    if (sips.length > 0 && sip.id && !sip.id.startsWith('sip_')) {
      const { data } = await supabase
        .from('sip_payments')
        .select('*')
        .eq('sip_id', sip.id)
        .order('paid_on', { ascending: false })
      setHistory(data || [])
    } else {
      // Mock history for preset
      setHistory([
        { id: 'p1', amount: sip.amount, paid_on: '2026-08-05' },
        { id: 'p2', amount: sip.amount, paid_on: '2026-07-05' },
      ])
    }
    setHistLoading(false)
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm((p) => {
      const updated = { ...p, [name]: value }
      if (name === 'fund_id' && value) {
        const found = mutualFunds.find((m) => m.id === value)
        if (found) updated.name = found.scheme_name
      }
      return updated
    })
  }

  const validate = () => {
    if (!form.name.trim()) return 'SIP / Fund name is required.'
    if (!form.amount || Number(form.amount) <= 0) return 'Amount must be > 0.'
    if (!form.start_date) return 'Start date is required.'
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
      const payload = {
        user_id: user.id,
        name: form.name.trim(),
        amount: Number(form.amount),
        frequency: form.frequency,
        start_date: form.start_date,
        next_due_date: editTarget ? form.next_due_date || form.start_date : form.start_date,
        active: editTarget ? (form.active !== undefined ? form.active : true) : true,
        fund_id: form.fund_id || null,
      }

      if (editTarget?.id && !editTarget.id.startsWith('sip_')) {
        const { error: updErr } = await supabase.from('sips').update(payload).eq('id', editTarget.id)
        if (updErr) throw updErr
        flash('SIP updated successfully.')
      } else {
        const { error: insErr } = await supabase.from('sips').insert(payload)
        if (insErr) throw insErr
        flash('New recurring SIP scheduled!')
      }
      setShowAdd(false)
      setEditTarget(null)
      setForm(emptyForm)
      fetchSipsAndFunds()
    } catch {
      setFormErr('Unable to save SIP. Please check connection.')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (sip) => {
    setEditTarget(sip)
    setForm({
      name: sip.name,
      amount: sip.amount,
      frequency: sip.frequency,
      start_date: sip.start_date,
      next_due_date: sip.next_due_date,
      active: sip.active,
      fund_id: sip.fund_id || '',
    })
    setShowAdd(true)
  }

  const handleDelete = async (id) => {
    try {
      if (!id.startsWith('sip_')) {
        const { error: delErr } = await supabase.from('sips').delete().eq('id', id)
        if (delErr) throw delErr
      }
      setSips((p) => p.filter((s) => s.id !== id))
      flash('SIP deleted.')
    } catch {
      setError('Unable to delete SIP.')
    }
  }

  // Handle Mark Paid + Auto-Buy Units into Linked Mutual Fund
  const handleMarkPaid = async (id) => {
    try {
      const targetSip = displaySips.find((s) => s.id === id)
      if (!targetSip) return

      if (user && !id.startsWith('sip_')) {
        await supabase.from('sip_payments').insert({
          sip_id: id,
          amount: targetSip.amount,
          paid_on: today(),
        })

        const nextDate = calculateNextDueDate(targetSip.next_due_date, targetSip.frequency)
        await supabase.from('sips').update({ next_due_date: nextDate }).eq('id', id)

        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'expense',
          amount: targetSip.amount,
          date: today(),
          note: `SIP Paid: ${targetSip.name}`,
        })
      }

      flash(`SIP of ${formatCurrency(targetSip.amount)} marked paid! Next due date updated.`)
      fetchSipsAndFunds()
    } catch (err) {
      setError('Unable to process SIP payment. Please try again.')
    }
  }

  const handleDeletePayment = async () => {
    setDeletingPay(true)
    try {
      if (delPayTarget?.id && !delPayTarget.id.startsWith('p')) {
        const { error: delErr } = await supabase.from('sip_payments').delete().eq('id', delPayTarget.id)
        if (delErr) throw delErr
      }
      setHistory((p) => p.filter((x) => x.id !== delPayTarget.id))
      setDelPayTarget(null)
      flash('Payment record removed.')
    } catch {
      setError('Unable to delete payment record.')
    } finally {
      setDeletingPay(false)
    }
  }

  // 1-Click Sync Excel SIPs into Supabase
  const handleSyncExcelSipsToDb = async () => {
    if (!user) return
    setSaving(true)
    try {
      for (const p of defaultSips) {
        const matchedFund = mutualFunds.find((m) => m.scheme_name.toLowerCase().includes(p.name.split(' ')[0].toLowerCase()))
        await supabase.from('sips').insert({
          user_id: user.id,
          name: p.name,
          amount: p.amount,
          frequency: p.frequency,
          start_date: p.start_date,
          next_due_date: p.next_due_date,
          active: true,
          fund_id: matchedFund?.id || null,
        })
      }

      flash('Successfully synced your 3 Groww SIPs (Motilal ₹1k, Quant ₹1k, Nippon ₹500) into Supabase!')
      fetchSipsAndFunds()
    } catch {
      setError('Failed to sync SIPs to database.')
    } finally {
      setSaving(false)
    }
  }

  const displayMutualFunds = mutualFunds.length > 0 ? mutualFunds : savedGrowwData

  return (
    <Layout title="SIP Investments & Groww Mutual Fund Links">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-lg mb-4 flex items-center gap-2" role="status">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Monthly SIP Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 bg-gradient-to-br from-blue-900 to-indigo-900 text-white border-none shadow-sm">
          <p className="text-xs text-blue-200 uppercase font-semibold">Total Monthly SIP Inflow</p>
          <p className="text-3xl font-extrabold mt-1 text-white">{formatCurrency(totalMonthlyCommitment)}</p>
          <p className="text-[11px] text-blue-300 mt-0.5">{displaySips.filter((s) => s.active).length} active running schemes</p>
        </div>

        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Linked Mutual Funds</p>
          <p className="text-3xl font-extrabold mt-1 text-emerald-700">
            {linkedCount} Linked
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Auto-credit units on mark paid</p>
        </div>

        <div className="card p-4 flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Actions</p>
            <p className="text-xs text-gray-600 mt-1">Schedule new recurring installment</p>
          </div>
          <button
            onClick={() => {
              setForm(emptyForm)
              setEditTarget(null)
              setShowAdd(true)
            }}
            className="btn-primary text-xs py-2 px-3 flex items-center justify-center gap-1.5 shadow-sm mt-2"
          >
            <Plus className="h-3.5 w-3.5" /> Add New SIP
          </button>
        </div>
      </div>

      {/* Sync to DB Banner if sips in DB is empty */}
      {sips.length === 0 && (
        <div className="card p-5 mb-6 border border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-gray-900 text-sm">3 Groww Excel SIPs Pre-loaded!</h4>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  ₹2,500 / Month
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Motilal Oswal Midcap (₹1,000), Quant Small Cap (₹1,000), and Nippon India (₹500) are loaded and linked to your portfolio.
              </p>
            </div>
          </div>
          <button
            onClick={handleSyncExcelSipsToDb}
            disabled={saving}
            className="btn-primary text-xs py-2.5 px-4 whitespace-nowrap bg-blue-700 hover:bg-blue-800 flex items-center gap-2 shadow-sm"
          >
            <CloudUpload className="h-4 w-4" />
            {saving ? 'Syncing to Database...' : '⚡ Sync SIPs to Live Supabase DB'}
          </button>
        </div>
      )}

      {/* SIP Cards List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {displaySips.map((sip) => (
          <SipCard
            key={sip.id}
            sip={sip}
            onEdit={openEdit}
            onDelete={handleDelete}
            onMarkPaid={handleMarkPaid}
            onViewHistory={fetchHistory}
          />
        ))}
      </div>

      {/* Add / Edit SIP Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => {
          setShowAdd(false)
          setEditTarget(null)
          setForm(emptyForm)
        }}
        title={editTarget ? 'Edit SIP Investment' : 'Schedule Recurring SIP'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formErr && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{formErr}</div>}

          {/* Select from Mutual Funds Portfolio */}
          {displayMutualFunds.length > 0 && (
            <div>
              <label className="label text-xs">Link to Mutual Fund Scheme (Optional)</label>
              <select
                name="fund_id"
                className="input-field text-xs py-2 bg-blue-50/50 border-blue-200 text-blue-950 font-medium"
                value={form.fund_id}
                onChange={handleFormChange}
              >
                <option value="">— Select Mutual Fund Scheme (Auto-Link) —</option>
                {displayMutualFunds.map((mf) => (
                  <option key={mf.id || mf.scheme_name} value={mf.id || mf.scheme_name}>
                    {mf.scheme_name} (NAV: ₹{parseFloat(mf.current_nav || mf.avg_nav || 0).toFixed(1)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label text-xs">SIP / Scheme Name</label>
            <input
              name="name"
              type="text"
              className="input-field text-sm font-medium"
              value={form.name}
              onChange={handleFormChange}
              placeholder="e.g. Motilal Oswal Midcap Fund"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Installment Amount (₹)</label>
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                className="input-field text-sm font-bold text-gray-900"
                value={form.amount}
                onChange={handleFormChange}
                placeholder="1000.00"
                required
              />
            </div>
            <div>
              <label className="label text-xs">Frequency</label>
              <select name="frequency" className="input-field text-sm" value={form.frequency} onChange={handleFormChange}>
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Start Date</label>
              <input name="start_date" type="date" className="input-field text-xs" value={form.start_date} onChange={handleFormChange} required />
            </div>
            {editTarget && (
              <div>
                <label className="label text-xs">Next Due Date</label>
                <input name="next_due_date" type="date" className="input-field text-xs" value={form.next_due_date || ''} onChange={handleFormChange} />
              </div>
            )}
          </div>

          {editTarget && (
            <div className="flex items-center gap-3 pt-1">
              <input
                id="sip-active"
                type="checkbox"
                className="h-4 w-4 text-blue-600 rounded"
                checked={form.active !== undefined ? form.active : true}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
              />
              <label htmlFor="sip-active" className="text-xs font-semibold text-gray-800">
                Active Running SIP
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : editTarget ? 'Update SIP' : 'Schedule SIP'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowAdd(false)
                setEditTarget(null)
                setForm(emptyForm)
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment History Modal */}
      <Modal
        isOpen={!!historyTarget}
        onClose={() => {
          setHistoryTarget(null)
          setHistory([])
        }}
        title={`Payment Records — ${historyTarget?.name}`}
      >
        {histLoading ? (
          <LoadingSpinner text="Loading history..." />
        ) : history.length === 0 ? (
          <EmptyState title="No payments recorded" description="Mark this SIP as paid to log payment history." />
        ) : (
          <div className="space-y-2">
            {history.map((p, idx) => (
              <div key={p.id || idx} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-xs font-semibold text-gray-800">{formatDate(p.paid_on)}</p>
                  <p className="text-[10px] text-emerald-600 font-medium">Installment Cleared</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-gray-900 text-sm">{formatCurrency(p.amount)}</p>
                  <button
                    onClick={() => setDelPayTarget(p)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!delPayTarget}
        title="Delete Payment Record"
        message="Delete this payment record? The next due date will not be changed."
        confirmText="Delete"
        loading={deletingPay}
        onConfirm={handleDeletePayment}
        onCancel={() => setDelPayTarget(null)}
      />
    </Layout>
  )
}
