import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate, isOverdue, daysUntil } from '../utils/dateUtils'
import { frequencyLabel } from '../utils/sipUtils'
import { Pencil, Trash2, CheckCircle, History, Clock, AlertCircle } from 'lucide-react'
import ConfirmDialog from './ConfirmDialog'

export default function SipCard({ sip, onEdit, onDelete, onMarkPaid, onViewHistory }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [paying, setPaying]         = useState(false)

  const overdue    = isOverdue(sip.next_due_date)
  const days       = daysUntil(sip.next_due_date)
  const dueSoon    = !overdue && days !== null && days <= 5

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

  return (
    <div className={`card border-l-4 ${overdue ? 'border-l-red-500' : dueSoon ? 'border-l-yellow-400' : 'border-l-blue-500'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{sip.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sip.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {sip.active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm">
            <div>
              <span className="text-gray-400">Amount</span>
              <p className="font-semibold text-gray-800">{formatCurrency(sip.amount)}</p>
            </div>
            <div>
              <span className="text-gray-400">Frequency</span>
              <p className="font-medium text-gray-700">{frequencyLabel(sip.frequency)}</p>
            </div>
            <div>
              <span className="text-gray-400">Start Date</span>
              <p className="text-gray-600">{formatDate(sip.start_date)}</p>
            </div>
            <div>
              <span className="text-gray-400">Next Due</span>
              <div className="flex items-center gap-1">
                {overdue
                  ? <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  : dueSoon
                    ? <Clock className="h-3.5 w-3.5 text-yellow-500" />
                    : null
                }
                <p className={`font-medium ${overdue ? 'text-red-600' : dueSoon ? 'text-yellow-600' : 'text-gray-700'}`}>
                  {formatDate(sip.next_due_date)}
                  {days !== null && ` (${overdue ? Math.abs(days) + ' days overdue' : days === 0 ? 'Today' : `in ${days}d`})`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={handleMarkPaid}
          disabled={paying || !sip.active}
          className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1.5"
        >
          <CheckCircle className="h-4 w-4" />
          {paying ? 'Processing...' : 'Mark as Paid'}
        </button>
        <button
          onClick={() => onViewHistory(sip)}
          className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
        >
          <History className="h-4 w-4" />
          History
        </button>
        <button
          onClick={() => onEdit(sip)}
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
        title="Delete SIP"
        message={`Delete "${sip.name}"? All payment history will be lost.`}
        confirmText="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
