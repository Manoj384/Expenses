import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency } from '../utils/formatCurrency'
import { Pencil, Trash2, RefreshCw } from 'lucide-react'
import ConfirmDialog from './ConfirmDialog'

export default function DebtCard({ debt, onEdit, onDelete, onUpdateOutstanding }) {
  const [deleteOpen, setDeleteOpen]   = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [updateOpen, setUpdateOpen]   = useState(false)
  const [newOutstanding, setNew]      = useState('')
  const [updating, setUpdating]       = useState(false)
  const [updateError, setUpdateError] = useState('')

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(debt.id)
    setDeleting(false)
    setDeleteOpen(false)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setUpdateError('')
    const val = parseFloat(newOutstanding)
    if (isNaN(val) || val < 0) { setUpdateError('Enter a valid amount ≥ 0.'); return }
    setUpdating(true)
    await onUpdateOutstanding(debt.id, val)
    setUpdating(false)
    setUpdateOpen(false)
    setNew('')
  }

  const progressPct = debt.principal > 0
    ? Math.max(0, Math.min(100, ((debt.principal - debt.outstanding) / debt.principal) * 100))
    : 0

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{debt.name}</h3>
          {debt.due_day && (
            <p className="text-xs text-gray-400 mt-0.5">Due on {debt.due_day}th of each month</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Outstanding</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(debt.outstanding)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Repaid</span>
          <span>{progressPct.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-4">
        <div>
          <span className="text-gray-400">Principal</span>
          <p className="font-medium text-gray-700">{formatCurrency(debt.principal)}</p>
        </div>
        <div>
          <span className="text-gray-400">EMI</span>
          <p className="font-medium text-gray-700">{formatCurrency(debt.emi)}</p>
        </div>
      </div>

      {/* Update Outstanding inline form */}
      {updateOpen && (
        <form onSubmit={handleUpdate} className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Current Outstanding: {formatCurrency(debt.outstanding)}
          </p>
          {updateError && <p className="text-xs text-red-600 mb-2">{updateError}</p>}
          <div className="flex gap-2">
            <input
              autoFocus
              type="number"
              min="0"
              step="0.01"
              className="input-field flex-1 text-sm"
              placeholder="New outstanding amount"
              value={newOutstanding}
              onChange={e => setNew(e.target.value)}
            />
            <button type="submit" className="btn-primary text-sm py-1.5 px-3" disabled={updating}>
              {updating ? '...' : 'Update'}
            </button>
            <button type="button" className="btn-secondary text-sm py-1.5 px-3" onClick={() => { setUpdateOpen(false); setNew(''); setUpdateError('') }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
        <button
          onClick={() => setUpdateOpen(o => !o)}
          className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
        >
          <RefreshCw className="h-4 w-4" />
          Update Outstanding
        </button>
        <button
          onClick={() => onEdit(debt)}
          className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
        <button
          onClick={() => setDeleteOpen(true)}
          className="btn-danger text-sm py-1.5 px-3 flex items-center gap-1.5"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>

      <ConfirmDialog
        isOpen={deleteOpen}
        title="Delete Debt"
        message={`Delete "${debt.name}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
