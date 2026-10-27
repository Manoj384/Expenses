import { useState, useEffect } from 'react'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/dateUtils'
import {
  User,
  Building,
  CreditCard,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  DollarSign,
  Pencil,
  Trash2,
  X,
  Share2,
  RotateCcw,
  AlertCircle,
  Check,
} from 'lucide-react'

const TYPE_CONFIG = {
  personal: { label: 'Friends & Family Borrowing', icon: User, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200' },
  bank: { label: 'Bank / Personal Loan', icon: Building, color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200' },
  card: { label: 'Credit Card EMI', icon: CreditCard, color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200' },
  lent: { label: 'Money Lent (To Collect)', icon: ArrowUpRight, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200' },
}

export default function DebtDetailsModal({
  isOpen,
  onClose,
  debt,
  onEdit,
  onOpenSettle,
  onDeleteRepayment,
  onEditRepayment,
  onDeleteDebt,
  onReopenDebt,
}) {
  const [editingRepId, setEditingRepId] = useState(null)
  const [editForm, setEditForm] = useState({ amount: '', notes: '', date: '' })
  const [deleteConfirmRepId, setDeleteConfirmRepId] = useState(null)
  const [confirmDeleteDebt, setConfirmDeleteDebt] = useState(false)
  const [reopenPromptOpen, setReopenPromptOpen] = useState(false)
  const [reopenAmount, setReopenAmount] = useState('')

  useEffect(() => {
    if (debt?.principal) {
      setReopenAmount(String(debt.principal))
    }
  }, [debt?.principal])

  if (!isOpen || !debt) return null

  const isCleared = debt.status === 'cleared' || Number(debt.outstanding) <= 0
  const isLent = debt.debt_type === 'lent'
  const typeCfg = TYPE_CONFIG[debt.debt_type] || TYPE_CONFIG.personal
  const TypeIcon = typeCfg.icon

  const principal = Number(debt.principal || 0)
  const outstanding = Number(debt.outstanding || 0)
  const repaid = Math.max(0, principal - outstanding)
  const progressPct = principal > 0
    ? Math.max(0, Math.min(100, (repaid / principal) * 100))
    : (isCleared ? 100 : 0)

  const repayments = (() => {
    try {
      return JSON.parse(localStorage.getItem(`ft_debt_repayments_${debt.id}`) || '[]')
    } catch {
      return []
    }
  })()

  const startEditRep = (rep) => {
    setEditingRepId(rep.id)
    setEditForm({
      amount: String(rep.amount),
      notes: rep.notes || '',
      date: rep.date ? new Date(rep.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    })
  }

  const handleSaveEditRep = async (repId) => {
    if (!editForm.amount || Number(editForm.amount) <= 0) return
    if (onEditRepayment) {
      await onEditRepayment(debt.id, repId, {
        amount: Number(editForm.amount),
        notes: editForm.notes,
        date: editForm.date,
      })
    }
    setEditingRepId(null)
  }

  const handleRevertRep = async (repId) => {
    if (onDeleteRepayment) {
      await onDeleteRepayment(debt.id, repId)
    }
    setDeleteConfirmRepId(null)
  }

  const handleReopen = async () => {
    const amt = parseFloat(reopenAmount)
    if (isNaN(amt) || amt <= 0) return
    if (onReopenDebt) {
      await onReopenDebt(debt.id, amt)
    }
    setReopenPromptOpen(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Borrowing & Debt Overview">
      <div className="space-y-5 text-gray-800 dark:text-slate-100">
        {/* Header Hero */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border inline-flex items-center gap-1.5 ${typeCfg.color}`}>
              <TypeIcon className="h-3.5 w-3.5" />
              {typeCfg.label}
            </span>

            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              isCleared
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {isCleared ? '✓ Cleared & Settled' : '● Active Liability'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1">
            {debt.name}
          </h2>

          {debt.person_name && (
            <p className="text-xs text-indigo-300 font-medium flex items-center gap-1.5 mb-3">
              <User className="h-3.5 w-3.5" />
              <span>Counterparty: <strong>{debt.person_name}</strong></span>
            </p>
          )}

          {/* Amount Summary Cards */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                Original Principal
              </span>
              <p className="text-lg sm:text-xl font-extrabold text-white">
                {formatCurrency(principal)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                {isLent ? 'Remaining to Receive' : 'Remaining Balance'}
              </span>
              <p className={`text-lg sm:text-xl font-extrabold ${isCleared ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isCleared ? '₹0 (Settled)' : formatCurrency(outstanding)}
              </p>
            </div>
          </div>
        </div>

        {/* Repayment Progress Bar */}
        <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
          <div className="flex justify-between items-center text-xs font-semibold mb-2">
            <span className="text-gray-600 dark:text-slate-300">
              {isLent ? 'Collection Progress' : 'Repayment Progress'}
            </span>
            <span className="text-blue-600 dark:text-blue-400">
              {progressPct.toFixed(1)}% Completed
            </span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isCleared ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${isCleared ? 100 : progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 dark:text-slate-400 mt-2">
            <span>Repaid: <strong className="text-gray-700 dark:text-slate-200">{formatCurrency(repaid)}</strong></span>
            <span>Outstanding: <strong className="text-gray-700 dark:text-slate-200">{formatCurrency(outstanding)}</strong></span>
          </div>
        </div>

        {/* Schedule & Due Date Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Number(debt.emi) > 0 && (
            <div className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800 flex items-start gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-lg">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[11px] text-gray-400 block font-medium">Monthly Installment (EMI)</span>
                <strong className="text-sm text-gray-900 dark:text-white font-bold">
                  {formatCurrency(debt.emi)} / month
                </strong>
                {debt.due_day && (
                  <p className="text-[10px] text-gray-500 mt-0.5">Due on {debt.due_day}th of every month</p>
                )}
              </div>
            </div>
          )}

          {debt.target_date && (
            <div className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800 flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-lg">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[11px] text-gray-400 block font-medium">Target Return Date</span>
                <strong className="text-sm text-gray-900 dark:text-white font-bold">
                  {formatDate(debt.target_date)}
                </strong>
                <p className="text-[10px] text-gray-500 mt-0.5">Agreed repayment milestone</p>
              </div>
            </div>
          )}
        </div>

        {/* Notes & Terms Section */}
        <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-gray-500 dark:text-slate-400" />
            <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
              Notes & Agreement Remarks
            </h4>
          </div>
          {debt.notes ? (
            <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-800 font-medium">
              {debt.notes}
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic">No notes recorded for this debt record.</p>
          )}
        </div>

        {/* Repayment & Settlement History Section */}
        {repayments.length > 0 && (
          <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                  Repayment & Clearance History ({repayments.length})
                </h4>
              </div>
              <span className="text-[10px] text-gray-400">Click edit/delete to modify or revert</span>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {repayments.map((rep) => {
                const isEditingThis = editingRepId === rep.id
                const isDeletingThis = deleteConfirmRepId === rep.id

                if (isEditingThis) {
                  return (
                    <div
                      key={rep.id}
                      className="p-3 bg-indigo-50/80 dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-900 dark:text-indigo-200 text-xs">
                          Edit Payment Record
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingRepId(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-600 dark:text-slate-300 block mb-0.5">
                            Amount (₹)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={editForm.amount}
                            onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                            className="input text-xs py-1"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-600 dark:text-slate-300 block mb-0.5">
                            Date
                          </label>
                          <input
                            type="date"
                            value={editForm.date}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            className="input text-xs py-1"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-600 dark:text-slate-300 block mb-0.5">
                          Payment & Clearance Notes
                        </label>
                        <textarea
                          rows={2}
                          value={editForm.notes}
                          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          className="input text-xs min-h-[55px] py-1.5 resize-y w-full leading-relaxed"
                          placeholder="e.g. Paid via UPI, Cash, bank details..."
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingRepId(null)}
                          className="btn-secondary text-[11px] py-1 px-3"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditRep(rep.id)}
                          className="btn-primary text-[11px] py-1 px-3.5 font-bold"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )
                }

                if (isDeletingThis) {
                  return (
                    <div
                      key={rep.id}
                      className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-rose-800 dark:text-rose-200">
                          Revert payment of {formatCurrency(rep.amount)}?
                        </span>
                        <p className="text-[11px] text-rose-600 dark:text-rose-300">
                          This will restore {formatCurrency(rep.amount)} back to your outstanding debt balance.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmRepId(null)}
                          className="btn-secondary text-[11px] py-1 px-2.5"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevertRep(rep.id)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] py-1 px-3 rounded-lg shadow-xs"
                        >
                          Yes, Revert
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={rep.id}
                    className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 flex items-start justify-between gap-2 text-xs hover:border-gray-300 dark:hover:border-slate-700 transition-colors group"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="font-bold text-gray-900 dark:text-white">
                          {formatCurrency(rep.amount)}
                        </strong>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                          rep.isSettlement
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {rep.isSettlement ? 'Full Settlement' : 'Repayment'}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {formatDate(rep.date)}
                        </span>
                      </div>
                      {rep.notes && (
                        <p className="text-gray-600 dark:text-slate-300 text-[11px] font-medium whitespace-pre-wrap leading-relaxed">
                          "{rep.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => startEditRep(rep)}
                        className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md transition-colors"
                        title="Edit repayment amount or notes"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmRepId(rep.id)}
                        className="p-1 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors"
                        title="Delete / revert this repayment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Reopen Debt Prompt */}
        {reopenPromptOpen && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 space-y-2 text-xs">
            <h5 className="font-bold text-amber-900 dark:text-amber-200">
              Reopen Cleared Debt
            </h5>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Set the new outstanding balance to reactivate this debt record:
            </p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                step="any"
                value={reopenAmount}
                onChange={(e) => setReopenAmount(e.target.value)}
                placeholder="Enter balance"
                className="input text-xs py-1.5 max-w-[150px]"
              />
              <button
                type="button"
                onClick={handleReopen}
                className="btn-primary text-xs py-1.5 px-3"
              >
                Reactivate Debt
              </button>
              <button
                type="button"
                onClick={() => setReopenPromptOpen(false)}
                className="btn-secondary text-xs py-1.5 px-2.5"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Confirm Delete Whole Debt Prompt */}
        {confirmDeleteDebt && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 space-y-2 text-xs">
            <h5 className="font-bold text-rose-900 dark:text-rose-200">
              Permanently Delete This Debt Record?
            </h5>
            <p className="text-[11px] text-rose-700 dark:text-rose-300">
              Are you sure you want to delete "{debt.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteDebt(false)}
                className="btn-secondary text-xs py-1 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteDebt(false)
                  onClose()
                  if (onDeleteDebt) onDeleteDebt(debt.id)
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-1 px-3.5 rounded-lg shadow-xs"
              >
                Yes, Delete Record
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose()
                if (onEdit) onEdit(debt)
              }}
              className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Details</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteDebt(true)}
              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
              title="Delete this entire debt record"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isCleared ? (
              <>
                <button
                  type="button"
                  onClick={() => setReopenPromptOpen(true)}
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-1 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-50"
                  title="Reopen or adjust balance"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reopen / Adjust</span>
                </button>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Fully Cleared
                </span>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  if (onOpenSettle) onOpenSettle(debt)
                }}
                className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isLent ? 'Record Money Received' : 'Repay / Settle Debt'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
