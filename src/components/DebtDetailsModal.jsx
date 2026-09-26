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
}) {
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

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onClose()
              if (onEdit) onEdit(debt)
            }}
            className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit Details</span>
          </button>

          {!isCleared ? (
            <button
              type="button"
              onClick={() => {
                onClose()
                if (onOpenSettle) onOpenSettle(debt)
              }}
              className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isLent ? 'Record Money Received' : 'Repay / Settle Debt'}</span>
            </button>
          ) : (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Fully Cleared
            </span>
          )}
        </div>
      </div>
    </Modal>
  )
}
