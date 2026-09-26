import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { today } from '../utils/dateUtils'

const TRANSACTION_TYPES = [
  { value: 'expense', label: 'Expense' },
  { value: 'income',  label: 'Income'  },
  { value: 'debit',   label: 'Debit'   },
]

export default function TransactionForm({ onSuccess, onCancel, editData = null }) {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loadingCats, setLoadingCats] = useState(false)
  const [loadingMethods, setLoadingMethods] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    type:              editData?.type              ?? 'expense',
    amount:            editData?.amount            ?? '',
    category_id:       editData?.category_id       ?? '',
    payment_method_id: editData?.payment_method_id ?? '',
    note:              editData?.note              ?? '',
    date:              editData?.date              ?? today(),
  })

  // Load categories and payment methods
  useEffect(() => {
    if (!user) return
    const catType = form.type === 'debit' ? 'expense' : form.type
    setLoadingCats(true)
    supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('type', catType)
      .order('name')
      .then(({ data }) => {
        setCategories(data || [])
        setLoadingCats(false)
      })
  }, [user, form.type])

  useEffect(() => {
    if (!user) return
    setLoadingMethods(true)
    supabase
      .from('payment_methods')
      .select('id, name, type')
      .eq('user_id', user.id)
      .order('type')
      .order('name')
      .then(({ data }) => {
        setPaymentMethods(data || [])
        setLoadingMethods(false)
      })
  }, [user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'type' ? { category_id: '' } : {}),
    }))
  }

  const validate = () => {
    if (!form.type) return 'Type is required.'
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) return 'Amount must be greater than 0.'
    if (!form.date) return 'Date is required.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const err = validate()
    if (err) {
      setError(err)
      return
    }

    setSaving(true)
    try {
      const payload = {
        user_id:           user.id,
        type:              form.type,
        amount:            Number(form.amount),
        category_id:       form.category_id || null,
        payment_method_id: form.payment_method_id || null,
        note:              form.note.trim() || null,
        date:              form.date,
      }

      if (editData?.id) {
        const { error } = await supabase.from('transactions').update(payload).eq('id', editData.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('transactions').insert(payload)
        if (error) throw error
      }
      onSuccess()
    } catch (err) {
      setError(err?.message || 'Unable to save transaction. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg" role="alert">
          {error}
        </div>
      )}

      {/* Type */}
      <div>
        <label className="label" htmlFor="type">Type</label>
        <select id="type" name="type" className="input-field" value={form.type} onChange={handleChange}>
          {TRANSACTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Amount */}
      <div>
        <label className="label" htmlFor="amount">Amount (₹)</label>
        <input
          id="amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          className="input-field text-lg font-semibold"
          value={form.amount}
          onChange={handleChange}
          placeholder="0.00"
          required
        />
      </div>

      {/* Category */}
      <div>
        <label className="label" htmlFor="category_id">
          Category {loadingCats && <span className="text-gray-400 text-xs ml-1">Loading...</span>}
        </label>
        <select id="category_id" name="category_id" className="input-field" value={form.category_id} onChange={handleChange}>
          <option value="">— Select Category (Optional) —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {categories.length === 0 && !loadingCats && (
          <p className="text-xs text-gray-400 mt-1">No categories configured. Add them in Categories Manager.</p>
        )}
      </div>

      {/* Payment Method */}
      <div>
        <label className="label" htmlFor="payment_method_id">
          Payment Method {loadingMethods && <span className="text-gray-400 text-xs ml-1">Loading...</span>}
        </label>
        <select
          id="payment_method_id"
          name="payment_method_id"
          className="input-field"
          value={form.payment_method_id}
          onChange={handleChange}
        >
          <option value="">— Select Payment Method (e.g. GPay, OneCard, Cash) —</option>
          {paymentMethods.map((pm) => (
            <option key={pm.id} value={pm.id}>
              {pm.name} ({pm.type.toUpperCase()})
            </option>
          ))}
        </select>
        {paymentMethods.length === 0 && !loadingMethods && (
          <p className="text-xs text-gray-400 mt-1">No payment methods configured. Add them in Payment Methods.</p>
        )}
      </div>

      {/* Date */}
      <div>
        <label className="label" htmlFor="date">Date</label>
        <input id="date" name="date" type="date" className="input-field" value={form.date} onChange={handleChange} required />
      </div>

      {/* Note */}
      <div>
        <label className="label" htmlFor="note">Note (optional)</label>
        <input
          id="note"
          name="note"
          type="text"
          className="input-field"
          value={form.note}
          onChange={handleChange}
          placeholder="e.g. Swiggy order, Fuel at Shell, Amazon deal"
          maxLength={255}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Saving...' : editData ? 'Update Transaction' : 'Add Transaction'}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
