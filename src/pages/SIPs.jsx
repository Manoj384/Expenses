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
import { formatDate } from '../utils/dateUtils'
import { today } from '../utils/dateUtils'
import { Plus, Trash2 } from 'lucide-react'

const FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'yearly']
const emptyForm = { name: '', amount: '', frequency: 'monthly', start_date: today() }

export default function SIPs() {
  const { user } = useAuth()
  const [sips,          setSips]          = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [showAdd,       setShowAdd]       = useState(false)
  const [editTarget,    setEditTarget]    = useState(null)
  const [historyTarget, setHistoryTarget] = useState(null)
  const [history,       setHistory]       = useState([])
  const [histLoading,   setHistLoading]   = useState(false)
  const [form,          setForm]          = useState(emptyForm)
  const [saving,        setSaving]        = useState(false)
  const [formErr,       setFormErr]       = useState('')
  const [delPayTarget,  setDelPayTarget]  = useState(null)
  const [deletingPay,   setDeletingPay]   = useState(false)

  const fetchSips = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('sips').select('*').eq('user_id', user.id)
      .order('active', { ascending: false }).order('next_due_date')
    if (!error) setSips(data || [])
    else setError('Unable to load SIPs.')
    setLoading(false)
  }, [user])

  useEffect(() => { fetchSips() }, [fetchSips])

  const fetchHistory = async (sip) => {
    setHistoryTarget(sip)
    setHistLoading(true)
    const { data } = await supabase
      .from('sip_payments').select('*').eq('sip_id', sip.id)
      .order('paid_on', { ascending: false })
    setHistory(data || [])
    setHistLoading(false)
  }

  const handleFormChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const validate = () => {
    if (!form.name.trim()) return 'SIP name is required.'
    if (!form.amount || Number(form.amount) <= 0) return 'Amount must be > 0.'
    if (!form.start_date) return 'Start date is required.'
    return null
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormErr('')
    const err = validate()
    if (err) { setFormErr(err); return }
    setSaving(true)
    try {
      const payload = {
        user_id:       user.id,
        name:          form.name.trim(),
        amount:        Number(form.amount),
        frequency:     form.frequency,
        start_date:    form.start_date,
        next_due_date: editTarget ? (form.next_due_date || form.start_date) : form.start_date,
        active:        editTarget ? (form.active !== undefined ? form.active : true) : true,
      }
      if (editTarget?.id) {
        const { error } = await supabase.from('sips').update(payload).eq('id', editTarget.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('sips').insert(payload)
        if (error) throw error
      }
      setShowAdd(false); setEditTarget(null); setForm(emptyForm)
      fetchSips()
    } catch { setFormErr('Unable to save SIP.') }
    finally { setSaving(false) }
  }

  const openEdit = (sip) => {
    setEditTarget(sip)
    setForm({ name: sip.name, amount: sip.amount, frequency: sip.frequency, start_date: sip.start_date, next_due_date: sip.next_due_date, active: sip.active })
  }

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('sips').delete().eq('id', id)
      if (error) throw error
      setSips(p => p.filter(s => s.id !== id))
    } catch { setError('Unable to delete SIP.') }
  }

  const handleMarkPaid = async (id) => {
    try {
      const { error } = await supabase.rpc('mark_sip_paid', { p_sip_id: id })
      if (error) throw error
      fetchSips()
    } catch { setError('Unable to mark SIP as paid.') }
  }

  const handleDeletePayment = async () => {
    setDeletingPay(true)
    try {
      const { error } = await supabase.from('sip_payments').delete().eq('id', delPayTarget.id)
      if (error) throw error
      setHistory(p => p.filter(x => x.id !== delPayTarget.id))
      setDelPayTarget(null)
    } catch { setError('Unable to delete payment record.') }
    finally { setDeletingPay(false) }
  }

  const SipForm = () => (
    <form onSubmit={handleSave} className="space-y-4">
      {formErr && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{formErr}</div>}
      <div>
        <label className="label">SIP Name</label>
        <input name="name" type="text" className="input-field" value={form.name} onChange={handleFormChange} placeholder="e.g. HDFC Mutual Fund" required />
      </div>
      <div>
        <label className="label">Amount (₹)</label>
        <input name="amount" type="number" min="0.01" step="0.01" className="input-field" value={form.amount} onChange={handleFormChange} placeholder="0.00" required />
      </div>
      <div>
        <label className="label">Frequency</label>
        <select name="frequency" className="input-field" value={form.frequency} onChange={handleFormChange}>
          {FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Start Date</label>
        <input name="start_date" type="date" className="input-field" value={form.start_date} onChange={handleFormChange} required />
      </div>
      {editTarget && (
        <>
          <div>
            <label className="label">Next Due Date</label>
            <input name="next_due_date" type="date" className="input-field" value={form.next_due_date || ''} onChange={handleFormChange} />
          </div>
          <div className="flex items-center gap-3">
            <input id="active" type="checkbox" className="h-4 w-4 rounded" checked={form.active !== undefined ? form.active : true}
              onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">Active SIP</label>
          </div>
        </>
      )}
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Saving...' : editTarget ? 'Update SIP' : 'Add SIP'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => { setShowAdd(false); setEditTarget(null); setForm(emptyForm) }}>
          Cancel
        </button>
      </div>
    </form>
  )

  return (
    <Layout title="SIP Investments">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
          {error} <button onClick={() => setError('')} className="ml-2 underline text-xs">Dismiss</button>
        </div>
      )}

      <div className="mb-4">
        <button onClick={() => { setForm(emptyForm); setEditTarget(null); setShowAdd(true) }} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add SIP
        </button>
      </div>

      {loading ? <LoadingSpinner text="Loading SIPs..." /> : sips.length === 0 ? (
        <EmptyState title="No SIPs added yet" description="Add a SIP investment to track your recurring investments." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sips.map(sip => (
            <SipCard key={sip.id} sip={sip} onEdit={openEdit} onDelete={handleDelete} onMarkPaid={handleMarkPaid} onViewHistory={fetchHistory} />
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setForm(emptyForm) }} title="Add SIP"><SipForm /></Modal>
      <Modal isOpen={!!editTarget} onClose={() => { setEditTarget(null); setForm(emptyForm) }} title="Edit SIP"><SipForm /></Modal>

      <Modal isOpen={!!historyTarget} onClose={() => { setHistoryTarget(null); setHistory([]) }} title={`History — ${historyTarget?.name}`}>
        {histLoading ? <LoadingSpinner text="Loading..." /> : history.length === 0 ? (
          <EmptyState title="No payments recorded" description="Mark this SIP as paid to record payment history." />
        ) : (
          <div className="space-y-2">
            {history.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <p className="text-sm font-medium text-gray-700">{formatDate(p.paid_on)}</p>
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-gray-800">{formatCurrency(p.amount)}</p>
                  <button onClick={() => setDelPayTarget(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!delPayTarget} title="Delete Payment Record"
        message="Delete this payment? The SIP's next due date will not be recalculated."
        confirmText="Delete" loading={deletingPay}
        onConfirm={handleDeletePayment} onCancel={() => setDelPayTarget(null)}
      />
    </Layout>
  )
}
