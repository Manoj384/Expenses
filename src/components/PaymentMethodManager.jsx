import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useAdmin } from '../context/AdminContext'
import { DEFAULT_PAYMENT_METHODS } from '../utils/defaultData'
import {
  Plus, Pencil, Trash2, Smartphone, CreditCard, Banknote, Building2,
  Lock, Unlock, Sparkles, Check, ChevronDown, ChevronRight
} from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'
import ConfirmDialog from './ConfirmDialog'

const METHOD_TYPES = [
  { value: 'online', label: 'Online / UPI', icon: Smartphone, color: 'text-purple-600 bg-purple-50' },
  { value: 'card',   label: 'Card',         icon: CreditCard, color: 'text-blue-600 bg-blue-50' },
  { value: 'cash',   label: 'Cash',         icon: Banknote,   color: 'text-green-600 bg-green-50' },
  { value: 'bank',   label: 'Bank Account', icon: Building2,  color: 'text-amber-600 bg-amber-50' },
  { value: 'other',  label: 'Other',        icon: CreditCard, color: 'text-gray-600 bg-gray-50' },
]

export default function PaymentMethodManager({ onAdminRequest }) {
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [newMethod, setNewMethod] = useState({ name: '', type: 'online' })
  const [editMethod, setEditMethod] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchMethods = async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('type')
      .order('name')
    if (!error) setMethods(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchMethods()
  }, [user])

  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!isAdmin) {
      setError('Admin Mode required to add payment methods.')
      return
    }
    setError('')
    if (!newMethod.name.trim()) {
      setError('Payment method name is required.')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('payment_methods').insert({
        user_id: user.id,
        name: newMethod.name.trim(),
        type: newMethod.type,
      })
      if (error) {
        if (error.code === '23505') setError('This payment method already exists.')
        else throw error
      } else {
        setNewMethod({ name: '', type: 'online' })
        flash('Payment method added successfully.')
        await fetchMethods()
      }
    } catch {
      setError('Unable to add payment method.')
    } finally {
      setSaving(false)
    }
  }

  const handleRename = async (e) => {
    e.preventDefault()
    if (!isAdmin) return
    if (!editMethod?.name.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ name: editMethod.name.trim(), type: editMethod.type })
        .eq('id', editMethod.id)
      if (error) throw error
      setEditMethod(null)
      flash('Payment method updated.')
      await fetchMethods()
    } catch {
      setError('Unable to update payment method.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!isAdmin) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('payment_methods').delete().eq('id', deleteTarget.id)
      if (error) throw error
      setDeleteTarget(null)
      flash('Payment method removed. Existing transactions retain records.')
      await fetchMethods()
    } catch {
      setError('Unable to delete payment method.')
    } finally {
      setDeleting(false)
    }
  }

  const handleSeedDefaults = async () => {
    if (!isAdmin) {
      setError('Admin Mode required.')
      return
    }
    setSaving(true)
    try {
      const rows = DEFAULT_PAYMENT_METHODS.map((pm) => ({
        user_id: user.id,
        name: pm.name,
        type: pm.type,
      }))
      await supabase.from('payment_methods').upsert(rows, {
        onConflict: 'user_id,name',
        ignoreDuplicates: true,
      })
      flash('Popular payment methods added (GPay, PhonePe, OneCard, HDFC, Cash, etc.)!')
      await fetchMethods()
    } catch {
      setError('Unable to add default payment methods.')
    } finally {
      setSaving(false)
    }
  }

  const grouped = METHOD_TYPES.reduce((acc, t) => {
    acc[t.value] = methods.filter((m) => m.type === t.value)
    return acc
  }, {})

  if (loading) return <LoadingSpinner text="Loading payment methods..." />

  return (
    <div className="space-y-6">
      {/* Admin Status Banner */}
      {!isAdmin ? (
        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Lock className="h-4.5 w-4.5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>Admin Mode Required:</strong> Only Admin can create, edit, or delete payment methods.
            </p>
          </div>
          <button
            type="button"
            onClick={onAdminRequest}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Unlock className="h-3.5 w-3.5" /> Unlock Admin
          </button>
        </div>
      ) : (
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
          <span className="flex items-center gap-1.5 font-medium">
            <Check className="h-4 w-4 text-emerald-600" /> Admin Mode Active — Editing Enabled
          </span>
          <button
            type="button"
            onClick={handleSeedDefaults}
            disabled={saving}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline flex items-center gap-1"
          >
            <Sparkles className="h-3.5 w-3.5" /> Add Default Methods (GPay, OneCard, HDFC, etc.)
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-lg">{success}</div>
      )}

      {/* Add New Method Form (Enabled only in Admin Mode) */}
      {isAdmin && (
        <form onSubmit={handleAdd} className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h4 className="font-semibold text-xs text-gray-700 uppercase tracking-wide">Add New Payment Method</h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={newMethod.type}
              onChange={(e) => setNewMethod((p) => ({ ...p, type: e.target.value }))}
              className="input-field sm:w-44 text-sm"
            >
              {METHOD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <input
              type="text"
              className="input-field flex-1 text-sm"
              placeholder="e.g. PhonePe, OneCard, HDFC Credit Card, GPay"
              value={newMethod.name}
              onChange={(e) => setNewMethod((p) => ({ ...p, name: e.target.value }))}
              maxLength={60}
            />
            <button type="submit" className="btn-primary flex items-center gap-2 whitespace-nowrap text-sm" disabled={saving}>
              <Plus className="h-4 w-4" /> Add Method
            </button>
          </div>
        </form>
      )}

      {/* Payment methods list grouped by type */}
      <div className="space-y-4">
        {METHOD_TYPES.map((t) => {
          const items = grouped[t.value] || []
          const Icon = t.icon
          return (
            <div key={t.value} className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-lg ${t.color}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-semibold text-sm text-gray-800">{t.label}</span>
                  <span className="text-xs text-gray-400">({items.length})</span>
                </div>
              </div>

              <div className="p-3 divide-y divide-gray-50">
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400 py-1.5 px-2">No payment methods configured.</p>
                ) : (
                  items.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50/60 rounded-lg transition-colors">
                      {editMethod?.id === m.id && isAdmin ? (
                        <form onSubmit={handleRename} className="flex gap-2 flex-1 items-center">
                          <input
                            autoFocus
                            className="input-field flex-1 py-1 text-sm"
                            value={editMethod.name}
                            onChange={(e) => setEditMethod((p) => ({ ...p, name: e.target.value }))}
                            maxLength={60}
                          />
                          <select
                            value={editMethod.type}
                            onChange={(e) => setEditMethod((p) => ({ ...p, type: e.target.value }))}
                            className="input-field py-1 text-xs w-32"
                          >
                            {METHOD_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                          <button type="submit" className="btn-primary text-xs py-1 px-3" disabled={saving}>Save</button>
                          <button type="button" className="btn-secondary text-xs py-1 px-3" onClick={() => setEditMethod(null)}>Cancel</button>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium text-gray-800 truncate">{m.name}</span>
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditMethod(m)}
                                className="p-1 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                                aria-label={`Edit ${m.name}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(m)}
                                className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                                aria-label={`Delete ${m.name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Payment Method"
        message={`Delete "${deleteTarget?.name}"? Existing transactions referencing this will remain intact.`}
        confirmText="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
