import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate, isOverdue, daysUntil } from '../utils/dateUtils'
import { frequencyLabel } from '../utils/sipUtils'
import {
  Pencil,
  Trash2,
  CheckCircle,
  History,
  Clock,
  AlertCircle,
  TrendingUp,
  ExternalLink,
  Layers,
} from 'lucide-react'
import ConfirmDialog from './ConfirmDialog'

export default function SipCard({ sip, onEdit, onDelete, onMarkPaid, onViewHistory }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [paying, setPaying] = useState(false)

  const overdue = isOverdue(sip.next_due_date)
  const days = daysUntil(sip.next_due_date)
  const dueSoon = !overdue && days !== null && days <= 5

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(sip.id)
    setDeleting(false)
    setDeleteOpen(false)
  }

  const handleMarkPaid = async () => {
    setPaying(true)
    await onMarkPaid(sip.id)
    setPaying(false)
  }

  const linkedFund = sip.mutual_funds

  return (
    <div className={`card border-l-4 transition-all ${overdue ? 'border-l-rose-500' : dueSoon ? 'border-l-amber-400' : 'border-l-blue-500'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold text-gray-900 truncate text-sm">{sip.name}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sip.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
              {sip.active ? 'Active SIP' : 'Paused'}
            </span>
            {linkedFund && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium flex items-center gap-1 border border-blue-100">
                <Layers className="h-3 w-3" /> Linked to Groww Portfolio
              </span>
            )}
          </div>

          {/* Linked Mutual Fund Live Stats Pill */}
          {linkedFund && (
            <div className="mt-2 mb-3 p-2.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
              <div>
                <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">Live Scheme Value</p>
                <p className="font-bold text-gray-900 mt-0.5">
                  {formatCurrency(linkedFund.current_value || (linkedFund.units * linkedFund.current_nav) || linkedFund.invested_amount || 0)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">Live NAV</p>
                <p className="font-mono font-bold text-emerald-700 mt-0.5">
                  ₹{parseFloat(linkedFund.current_nav || linkedFund.avg_nav || 0).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2 text-xs">
            <div>
              <span className="text-gray-400 font-medium">SIP Installment</span>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{formatCurrency(sip.amount)}</p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Frequency</span>
              <p className="font-medium text-gray-800 mt-0.5">{frequencyLabel(sip.frequency)}</p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Started On</span>
              <p className="text-gray-600 mt-0.5 font-mono">{formatDate(sip.start_date)}</p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Next Scheduled Due</span>
              <div className="flex items-center gap-1 mt-0.5">
                {overdue ? (
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                ) : dueSoon ? (
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                ) : null}
                <p className={`font-semibold ${overdue ? 'text-rose-600' : dueSoon ? 'text-amber-600' : 'text-gray-800'}`}>
                  {formatDate(sip.next_due_date)}
                  {days !== null && ` (${overdue ? Math.abs(days) + 'd overdue' : days === 0 ? 'Today' : `in ${days}d`})`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={handleMarkPaid}
          disabled={paying || !sip.active}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
          title="Mark paid and credit units to linked Mutual Fund"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          {paying ? 'Processing...' : 'Mark Paid & Buy Units'}
        </button>
        <button
          onClick={() => onViewHistory(sip)}
          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
        >
          <History className="h-3.5 w-3.5" />
          History
        </button>
        <button
          onClick={() => onEdit(sip)}
          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          onClick={() => setDeleteOpen(true)}
          className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      <ConfirmDialog
        isOpen={deleteOpen}
        title="Delete SIP"
        message={`Delete "${sip.name}"? Payment history will be preserved in records.`}
        confirmText="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
