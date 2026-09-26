import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import DebtCard from '../components/DebtCard'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import { formatCurrency } from '../utils/formatCurrency'
import { Plus } from 'lucide-react'

const emptyForm = { name: '', principal: '', outstanding: '', emi: '', due_day: '' }

export default function Debts() {
  const { user } = useAuth()
  const [debts,      setDebts]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [showModal,  setShowModal]  = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form,       setForm]       = useState(emptyForm)
  const [saving,     setSaving]     = useState(false)
  const [formErr,    setFormErr]    = useState('')

  const fetchDebts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase.from('debts').select('*').eq('user_id', user.id).order('created_at')
    if (!error) setDebts(data || [])
    else setError('Unable to load debts.')
    setLoading(false)
  }, [user])

  useEffect(() => { fetchDebts() }, [fetchDebts])

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const validate = () => {
    if (!form.name.trim()) return 'Name is required.'
    if (form.principal === '' || Number(form.principal) < 0) return 'Principal must be ≥ 0.'
    if (form.outstanding === '' || Number(form.outstanding) < 0) return 'Outstanding must be ≥ 0.'
    if (form.emi === '' || Number(form.emi) < 0) return 'EMI must be ≥ 0.'
    if (form.due_day !== '' && (Number(form.due_day) < 1 || Number(form.due_day) > 31)) return 'Due day must be 1–31.'
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
        user_id:     user.id,
        name:        form.name.trim(),
        principal:   Number(form.principal),
        outstanding: Number(form.outstanding),
        emi:         Number(form.emi),
        due_day:     form.due_day !== '' ? Number(form.due_day) : null,
      }
      if (editTarget?.id) {
        const { error } = await supabase.from('debts').update(payload).eq('id', editTarget.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('debts').insert(payload)
        if (error) throw error
      }
      setShowModal(false); setEditTarget(null); setForm(emptyForm)
      fetchDebts()
    } catch { setFormErr('Unable to save debt.') }
    finally { setSaving(false) }
  }

  const openEdit = (debt) => {
    setEditTarget(debt)
    setForm({ name: debt.name, principal: debt.principal, outstanding: debt.outstanding, emi: debt.emi, due_day: debt.due_day ?? '' })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('debts').delete().eq('id', id)
      if (error) throw error
      setDebts(p => p.filter(d => d.id !== id))
    } catch { setError('Unable to delete debt.') }
  }

  const handleUpdateOutstanding = async (id, val) => {
    try {
      const { error } = await supabase.from('debts').update({ outstanding: val }).eq('id', id)
      if (error) throw error
      setDebts(p => p.map(d => d.id === id ? { ...d, outstanding: val } : d))
    } catch { setError('Unable to update outstanding balance.') }
  }

  const totalOutstanding = debts.reduce((s, d) => s + Number(d.outstanding), 0)
  const totalEmi         = debts.reduce((s, d) => s + Number(d.emi), 0)

  const DebtForm = () => (
    <form onSubmit={handleSave} className="space-y-4">
      {formErr && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{formErr}</div>}
      <div>
        <label className="label">Loan / Debt Name</label>
        <input name="name" type="text" className="input-field" value={form.name} onChange={handleChange} placeholder="e.g. Home Loan" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Principal (₹)</label>
          <input name="principal" type="number" min="0" step="0.01" className="input-field" value={form.principal} onChange={handleChange} placeholder="0.00" required />
        </div>
        <div>
          <label className="label">Outstanding (₹)</label>
          <input name="outstanding" type="number" min="0" step="0.01" className="input-field" value={form.outstanding} onChange={handleChange} placeholder="0.00" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">EMI (₹)</label>
          <input name="emi" type="number" min="0" step="0.01" className="input-field" value={form.emi} onChange={handleChange} placeholder="0.00" required />
        </div>
        <div>
          <label className="label">Due Day (1–31)</label>
          <input name="due_day" type="number" min="1" max="31" className="input-field" value={form.due_day} onChange={handleChange} placeholder="Optional" />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Saving...' : editTarget ? 'Update Debt' : 'Add Debt'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); setEditTarget(null); setForm(emptyForm) }}>
          Cancel
        </button>
      </div>
    </form>
  )

  return (
    <Layout title="Debts & Loans">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
          {error} <button onClick={() => setError('')} className="ml-2 underline text-xs">Dismiss</button>
        </div>
      )}

      {debts.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Total Outstanding</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Total Monthly EMI</p>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalEmi)}</p>
          </div>
        </div>
      )}

      <div className="mb-4">
        <button onClick={() => { setForm(emptyForm); setEditTarget(null); setShowModal(true) }} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Debt
        </button>
      </div>

      {loading ? <LoadingSpinner text="Loading debts..." /> : debts.length === 0 ? (
        <EmptyState title="No debts or loans added" description="Add your loans here to track outstanding balances and EMIs." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {debts.map(debt => (
            <DebtCard key={debt.id} debt={debt} onEdit={openEdit} onDelete={handleDelete} onUpdateOutstanding={handleUpdateOutstanding} />
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditTarget(null); setForm(emptyForm) }} title={editTarget ? 'Edit Debt' : 'Add Debt'}>
        <DebtForm />
      </Modal>
    </Layout>
  )
}
