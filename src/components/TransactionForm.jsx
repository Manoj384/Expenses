import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { today } from '../utils/dateUtils'
import { Paperclip, FileText, Image as ImageIcon, X, UploadCloud, Camera, Sparkles } from 'lucide-react'
import AiReceiptScannerModal from './AiReceiptScannerModal'

const TRANSACTION_TYPES = [
  { value: 'expense', label: 'Expense' },
  { value: 'income',  label: 'Income'  },
  { value: 'debit',   label: 'Debit'   },
]

export default function TransactionForm({ onSuccess, onCancel, editData = null }) {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const [categories, setCategories] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loadingCats, setLoadingCats] = useState(false)
  const [loadingMethods, setLoadingMethods] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showAiScanner, setShowAiScanner] = useState(false)

  const [form, setForm] = useState({
    type:              editData?.type              ?? 'expense',
    amount:            editData?.amount            ?? '',
    category_id:       editData?.category_id       ?? '',
    payment_method_id: editData?.payment_method_id ?? '',
    note:              editData?.note              ?? '',
    date:              editData?.date              ?? today(),
  })

  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState(editData?.receipt_url ? 'Attached Document' : '')
  const [previewUrl, setPreviewUrl] = useState(editData?.receipt_url ?? '')

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

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    // 5MB limit
    if (selected.size > 5 * 1024 * 1024) {
      setError('Receipt file size must be less than 5MB.')
      return
    }

    setError('')
    setFile(selected)
    setFileName(selected.name)

    const reader = new FileReader()
    reader.onload = () => {
      setPreviewUrl(reader.result)
    }
    reader.readAsDataURL(selected)
  }

  const handleApplyExtracted = ({ amount, date, note, category, payment_method, previewUrl: scannedUrl, file: scannedFile }) => {
    // Attempt auto category matching
    let matchedCatId = form.category_id
    if (category && categories.length > 0) {
      const match = categories.find((c) => c.name.toLowerCase().includes(category.toLowerCase()) || category.toLowerCase().includes(c.name.toLowerCase()))
      if (match) matchedCatId = match.id
    }

    // Attempt auto payment method matching
    let matchedPmId = form.payment_method_id
    if (payment_method && paymentMethods.length > 0) {
      const match = paymentMethods.find((pm) => pm.name.toLowerCase().includes(payment_method.toLowerCase()) || pm.type.toLowerCase().includes(payment_method.toLowerCase()))
      if (match) matchedPmId = match.id
    }

    setForm((prev) => ({
      ...prev,
      amount: amount ? String(amount) : prev.amount,
      date: date || prev.date,
      note: note || prev.note,
      category_id: matchedCatId,
      payment_method_id: matchedPmId,
    }))

    if (scannedUrl) setPreviewUrl(scannedUrl)
    if (scannedFile) {
      setFile(scannedFile)
      setFileName(scannedFile.name)
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setFileName('')
    setPreviewUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
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
      let finalReceiptUrl = previewUrl

      // Upload to Supabase Storage if file is attached
      if (file && user) {
        try {
          const ext = file.name.split('.').pop()
          const filePath = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('receipts')
            .upload(filePath, file)

          if (!uploadErr && uploadData) {
            const { data: pubData } = supabase.storage.from('receipts').getPublicUrl(filePath)
            if (pubData?.publicUrl) finalReceiptUrl = pubData.publicUrl
          }
        } catch {
          // Fallback to data URL
        }
      }

      const fullPayload = {
        user_id:           user.id,
        type:              form.type,
        amount:            Number(form.amount),
        category_id:       form.category_id || null,
        payment_method_id: form.payment_method_id || null,
        note:              form.note.trim() || null,
        receipt_url:       finalReceiptUrl || null,
        date:              form.date,
      }

      let res = editData?.id
        ? await supabase.from('transactions').update(fullPayload).eq('id', editData.id)
        : await supabase.from('transactions').insert(fullPayload).select()

      // Fallback if receipt_url column is not in remote schema yet
      if (res.error && (res.error.code === 'PGRST204' || res.error.message?.includes('column') || res.error.message?.includes('schema cache'))) {
        const basicPayload = {
          user_id:           user.id,
          type:              form.type,
          amount:            Number(form.amount),
          category_id:       form.category_id || null,
          payment_method_id: form.payment_method_id || null,
          note:              form.note.trim() || null,
          date:              form.date,
        }

        res = editData?.id
          ? await supabase.from('transactions').update(basicPayload).eq('id', editData.id)
          : await supabase.from('transactions').insert(basicPayload).select()
      }

      if (res.error) throw res.error

      // Cache receipt URL in local storage shadow cache
      const savedId = editData?.id || res.data?.[0]?.id
      if (savedId && finalReceiptUrl) {
        try {
          localStorage.setItem(`ft_receipt_${savedId}`, finalReceiptUrl)
        } catch {}
      }

      onSuccess()
    } catch (err) {
      setError(err?.message || 'Unable to save transaction. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isPdf =
    fileName.toLowerCase().endsWith('.pdf') ||
    previewUrl.startsWith('data:application/pdf') ||
    previewUrl.includes('.pdf')

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div className="bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800 text-red-700 dark:text-rose-300 text-xs px-4 py-3 rounded-xl font-medium" role="alert">
          {error}
        </div>
      )}

      {/* Type */}
      <div>
        <label className="label" htmlFor="type">Transaction Type</label>
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
          className="input-field text-lg font-bold"
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
      </div>

      {/* Date */}
      <div>
        <label className="label" htmlFor="date">Date</label>
        <input id="date" name="date" type="date" className="input-field" value={form.date} onChange={handleChange} required />
      </div>

      {/* Note */}
      <div>
        <label className="label" htmlFor="note">Note / Description (optional)</label>
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

      {/* Bill Image / PDF Attachment Upload */}
      <div>
        <label className="label flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-bold">
            <Paperclip className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Attach Bill / Invoice (Image or PDF)</span>
          </span>
          <span className="text-[10px] text-gray-400 font-normal">Max 5MB (PNG, JPG, PDF)</span>
        </label>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="billFileInput"
        />

        {previewUrl ? (
          <div className="p-3 bg-blue-50/60 dark:bg-slate-800/60 border border-blue-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {isPdf ? (
                <div className="p-2 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-lg flex-shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
              ) : (
                <img
                  src={previewUrl}
                  alt="Bill Preview"
                  className="h-10 w-10 object-cover rounded-lg border border-gray-200 dark:border-slate-700 flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-800 dark:text-slate-100 truncate">
                  {fileName || 'Attached Receipt'}
                </p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Ready to attach
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemoveFile}
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowAiScanner(true)}
              className="border border-blue-300 dark:border-blue-700/60 bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-100/70 rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300 transition-colors shadow-xs"
            >
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>AI Auto-Scan Bill</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border border-gray-200 dark:border-slate-700 hover:border-gray-300 rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <UploadCloud className="h-4 w-4 text-gray-500" />
              <span>Attach File Manually</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
        <button type="submit" className="btn-primary flex-1 py-2.5 font-bold" disabled={saving}>
          {saving ? 'Saving...' : editData ? 'Update Transaction' : 'Add Transaction'}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary py-2.5" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
      </div>

      <AiReceiptScannerModal
        isOpen={showAiScanner}
        onClose={() => setShowAiScanner(false)}
        onApplyExtracted={handleApplyExtracted}
      />
    </form>
  )
}
