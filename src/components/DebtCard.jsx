import { useState } from 'react'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/dateUtils'
import {
  Pencil,
  Trash2,
  CheckCircle2,
  DollarSign,
  User,
  Building,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Sparkles,
  RefreshCw,
  Plus,
  MinusCircle,
} from 'lucide-react'
import ConfirmDialog from './ConfirmDialog'
import Modal from './Modal'

const TYPE_CONFIG = {
  personal: { label: 'Friends & Family', icon: User, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200' },
  bank: { label: 'Bank / Personal Loan', icon: Building, color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200' },
  card: { label: 'Credit Card EMI', icon: CreditCard, color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200' },
  lent: { label: 'Money Lent (To Collect)', icon: ArrowUpRight, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200' },
}

export default function DebtCard({ debt, onEdit, onDelete, onUpdateOutstanding, onSettleDebt, onViewDetails }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [repayModalOpen, setRepayModalOpen] = useState(false)
  const [repayAmount, setRepayAmount] = useState('')
  const [logTxn, setLogTxn] = useState(true)
  const [submittingRepay, setSubmittingRepay] = useState(false)

  const isCleared = debt.status === 'cleared' || Number(debt.outstanding) <= 0
  const isLent = debt.debt_type === 'lent'
  const typeCfg = TYPE_CONFIG[debt.debt_type] || TYPE_CONFIG.personal
  const TypeIcon = typeCfg.icon

  const progressPct = debt.principal > 0
    ? Math.max(0, Math.min(100, ((debt.principal - debt.outstanding) / debt.principal) * 100))
    : (isCleared ? 100 : 0)

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(debt.id)
    setDeleting(false)
    setDeleteOpen(false)
  }

  const handleSettleFull = async () => {
    await onSettleDebt(debt.id, Number(debt.outstanding), logTxn)
    setRepayModalOpen(false)
    setRepayAmount('')
  }

  const handlePartialRepay = async (e) => {
    e.preventDefault()
    const amt = parseFloat(repayAmount)
    if (!amt || amt <= 0) return

    setSubmittingRepay(true)
    const newOutstanding = Math.max(0, Number(debt.outstanding) - amt)
    await onUpdateOutstanding(debt.id, newOutstanding, amt, logTxn, debt.name)
    setSubmittingRepay(false)
    setRepayModalOpen(false)
    setRepayAmount('')
  }

  return (
    <div
      className={`card flex flex-col justify-between transition-all border ${
        isCleared
          ? 'border-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/10'
          : isLent
          ? 'border-emerald-200 bg-white dark:bg-slate-900'
          : 'border-gray-200 bg-white dark:bg-slate-900'
      }`}
    >
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${typeCfg.color}`}>
            <TypeIcon className="h-3 w-3" />
            {typeCfg.label}
          </span>

          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
            isCleared
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
          }`}>
            {isCleared ? '✓ Cleared / Settled' : 'Active'}
          </span>
        </div>

        {/* Title & Person (Clickable for Details) */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div
            onClick={() => onViewDetails && onViewDetails(debt)}
            className="cursor-pointer group flex-1"
            title="Click to view full details"
          >
            <h3 className={`font-bold text-base transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400 ${isCleared ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
              {debt.name}
            </h3>
            {debt.person_name && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 mt-0.5">
                <User className="h-3 w-3" /> With: {debt.person_name}
              </p>
            )}
            {debt.notes && (
              <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">"{debt.notes}"</p>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">
              {isLent ? 'To Receive' : 'Outstanding'}
            </span>
            <p className={`text-xl font-extrabold ${isCleared ? 'text-emerald-600' : isLent ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>
              {isCleared ? '₹0' : formatCurrency(debt.outstanding)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="my-3">
          <div className="flex justify-between text-xs text-gray-500 font-medium mb-1">
            <span>{isLent ? 'Collected' : 'Repaid'}</span>
            <span className="font-bold">{isCleared ? '100%' : `${progressPct.toFixed(0)}%`}</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isCleared ? 'bg-emerald-500' : 'bg-indigo-600'}`}
              style={{ width: `${isCleared ? 100 : progressPct}%` }}
            />
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t border-gray-100 dark:border-slate-800 text-gray-600 dark:text-gray-300">
          <div>
            <span className="text-gray-400 block text-[11px]">Original Principal:</span>
            <strong className="text-gray-800 dark:text-gray-200">{formatCurrency(debt.principal)}</strong>
          </div>
          {Number(debt.emi) > 0 ? (
            <div>
              <span className="text-gray-400 block text-[11px]">Monthly EMI:</span>
              <strong className="text-gray-800 dark:text-gray-200">{formatCurrency(debt.emi)}</strong>
            </div>
          ) : debt.target_date ? (
            <div>
              <span className="text-gray-400 block text-[11px]">Target Return Date:</span>
              <strong className="text-gray-800 dark:text-gray-200">{formatDate(debt.target_date)}</strong>
            </div>
          ) : null}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 mt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
        {!isCleared ? (
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={() => {
                setRepayAmount(String(debt.outstanding))
                setRepayModalOpen(true)
              }}
              className="btn btn-primary text-xs py-1.5 px-3 flex-1 flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isLent ? 'Record Received' : 'Repay / Settle'}
            </button>
          </div>
        ) : (
          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Settled & Cleared
          </span>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(debt)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors"
            title="Edit Details"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
            title="Delete Record"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Repay / Settle Modal */}
      {repayModalOpen && (
        <Modal
          isOpen={repayModalOpen}
          onClose={() => setRepayModalOpen(false)}
          title={isLent ? `Record Money Received: ${debt.name}` : `Repay Borrowing: ${debt.name}`}
        >
          <form onSubmit={handlePartialRepay} className="space-y-4 text-xs">
            <div className="p-3 bg-indigo-50 dark:bg-slate-800 rounded-xl text-indigo-900 dark:text-indigo-200">
              <p className="font-semibold mb-1">
                Current Outstanding: <strong className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(debt.outstanding)}</strong>
              </p>
              {debt.person_name && <p className="text-[11px] text-gray-500">Person: {debt.person_name}</p>}
            </div>

            <div>
              <label className="label">Amount to Return / Settle (₹)</label>
              <input
                type="number"
                step="any"
                max={debt.outstanding}
                placeholder="e.g. 5000"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                className="input text-sm"
                autoFocus
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="logTxnCheck"
                checked={logTxn}
                onChange={(e) => setLogTxn(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="logTxnCheck" className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                {isLent ? 'Also log this as Income in Transactions' : 'Also log this repayment as Expense in Transactions'}
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSettleFull}
                className="btn btn-secondary text-xs flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
              >
                ✓ Settle Full {formatCurrency(debt.outstanding)} (Mark Cleared)
              </button>
              <button
                type="submit"
                disabled={submittingRepay}
                className="btn btn-primary text-xs flex-1"
              >
                {submittingRepay ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteOpen}
        title="Delete Record?"
        message={`Are you sure you want to remove "${debt.name}"?`}
        confirmText="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
