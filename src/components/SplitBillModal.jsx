import { useState } from 'react'
import Modal from './Modal'
import { Plus, Trash2, Send } from 'lucide-react'

export default function SplitBillModal({ isOpen, onClose, onSaveSplits }) {
  const [desc, setDesc] = useState('')
  const [total, setTotal] = useState('')
  const [friends, setFriends] = useState([
    { name: '', phone: '', amount: '' },
    { name: '', phone: '', amount: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSplitEqually = () => {
    const tot = parseFloat(total)
    if (isNaN(tot) || tot <= 0) return setError('Enter a valid total amount.')
    const share = (tot / (friends.length + 1)).toFixed(2)
    setFriends(friends.map(f => ({ ...f, amount: share })))
    setError('')
  }

  const getWaLink = (f) => {
    const p = (f.phone || '').replace(/\D/g, '')
    const msg = encodeURIComponent(`Hi ${f.name || ''}! Your share for "${desc || 'our expense'}" is ₹${f.amount || '0'}. Please pay when convenient.`)
    return p ? `https://wa.me/${p}?text=${msg}` : `https://wa.me/?text=${msg}`
  }

  const handleSave = async () => {
    const valid = friends.filter(f => f.name.trim() && parseFloat(f.amount) > 0)
    if (valid.length === 0) return setError('Enter at least 1 friend name and amount.')
    setSaving(true)
    try {
      if (onSaveSplits) await onSaveSplits(valid, desc)
      onClose()
    } catch (err) {
      setError(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Split Expense with Friends">
      <div className="space-y-4 text-xs">
        {error && <div className="p-2 bg-rose-50 text-rose-700 rounded-lg">{error}</div>}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Title</label>
            <input type="text" placeholder="e.g. Dinner, Trip" value={desc} onChange={(e) => setDesc(e.target.value)} className="input-field text-xs" />
          </div>
          <div>
            <label className="label">Total Paid (₹)</label>
            <div className="flex gap-1">
              <input type="number" placeholder="3000" value={total} onChange={(e) => setTotal(e.target.value)} className="input-field text-xs" />
              <button type="button" onClick={handleSplitEqually} className="btn-secondary text-[11px] px-2 whitespace-nowrap">Split</button>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-800 dark:text-gray-200">Friends:</span>
            <button type="button" onClick={() => setFriends([...friends, { name: '', phone: '', amount: '' }])} className="text-blue-600 font-semibold flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {friends.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800 p-1.5 rounded-lg">
                <input type="text" placeholder="Name" value={f.name} onChange={(e) => { const u = [...friends]; u[i].name = e.target.value; setFriends(u) }} className="input-field text-xs flex-1 py-1" />
                <input type="tel" placeholder="Phone" value={f.phone} onChange={(e) => { const u = [...friends]; u[i].phone = e.target.value; setFriends(u) }} className="input-field text-xs w-24 py-1" />
                <input type="number" placeholder="₹" value={f.amount} onChange={(e) => { const u = [...friends]; u[i].amount = e.target.value; setFriends(u) }} className="input-field text-xs w-16 py-1 font-bold" />
                <a href={getWaLink(f)} target="_blank" rel="noreferrer" className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200" title="WhatsApp Reminder"><Send className="h-3 w-3" /></a>
                {friends.length > 1 && <button type="button" onClick={() => setFriends(friends.filter((_, idx) => idx !== i))} className="p-1 text-gray-400 hover:text-rose-600"><Trash2 className="h-3 w-3" /></button>}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
          <button type="button" onClick={onClose} className="btn-secondary text-xs">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary text-xs">{saving ? 'Saving...' : 'Save as Lent Records'}</button>
        </div>
      </div>
    </Modal>
  )
}
