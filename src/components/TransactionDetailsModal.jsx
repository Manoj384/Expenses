import { useState } from 'react'
import Modal from './Modal'
import {
  Calendar,
  Clock,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Tag,
  FileText,
  Paperclip,
  Pencil,
  Trash2,
  Copy,
  Check,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  PiggyBank,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate, formatTime } from '../utils/dateUtils'
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/haptics'
import { getTransactionAuditResult } from '../utils/backgroundAiReviewer'
import { supabase } from '../lib/supabaseClient'

const TYPE_CONFIG = {
  income: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    icon: ArrowDownLeft,
    prefix: '+',
  },
  expense: {
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    icon: ArrowUpRight,
    prefix: '-',
  },
  savings: {
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    icon: PiggyBank,
    prefix: '',
  },
  debit: {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    icon: ArrowUpRight,
    prefix: '-',
  },
}

function renderMethodIcon(type, className = 'h-4 w-4') {
  switch (type) {
    case 'cash':   return <Banknote className={className} />
    case 'online': return <Smartphone className={className} />
    case 'card':   return <CreditCard className={className} />
    case 'bank':   return <Building2 className={className} />
    default:       return <CreditCard className={className} />
  }
}

export default function TransactionDetailsModal({
  isOpen,
  onClose,
  transaction,
  onEdit,
  onDelete,
  onPreviewReceipt,
}) {
  const [copiedId, setCopiedId] = useState(false)
  const [fixedCategory, setFixedCategory] = useState(null)
  const [isFixing, setIsFixing] = useState(false)

  if (!isOpen || !transaction) return null

  const audit = getTransactionAuditResult(transaction)

  const handleApplyAiFix = async (suggestedName) => {
    if (!transaction.id || isFixing) return
    setIsFixing(true)
    try {
      // Find category
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name')
        .ilike('name', `%${suggestedName}%`)
        .limit(1)

      if (cats && cats.length > 0) {
        await supabase
          .from('transactions')
          .update({ category_id: cats[0].id })
          .eq('id', transaction.id)
      }

      setFixedCategory(suggestedName)
      hapticSuccess()
      window.dispatchEvent(new CustomEvent('transaction-updated'))
    } catch {
      // fallback
    } finally {
      setIsFixing(false)
    }
  }

  const typeMeta = TYPE_CONFIG[transaction.type] || TYPE_CONFIG.expense
  const TypeIcon = typeMeta.icon

  const receipt = transaction.receipt_url || transaction.receipt || localStorage.getItem(`ft_receipt_${transaction.id}`)
  const isPdf = receipt && (receipt.toLowerCase().includes('.pdf') || receipt.includes('application/pdf'))
  const rawTime = transaction.time || transaction.created_at || localStorage.getItem(`ft_tx_time_${transaction.id}`)

  const handleCopyId = () => {
    if (transaction.id) {
      hapticLight()
      navigator.clipboard?.writeText(transaction.id)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  const cleanNote = transaction.note?.startsWith('[Savings] ')
    ? transaction.note.slice(10)
    : transaction.note === '[Savings]'
    ? 'Savings Allocation'
    : (transaction.note || '')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transaction Details">
      <div className="space-y-5">
        {/* Top Header Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-slate-100 dark:from-slate-800/60 dark:to-slate-900 border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${typeMeta.bg}`}>
                <TypeIcon className="h-3 w-3" />
                {transaction.type}
              </span>
              {transaction.categories?.name && (
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  in {transaction.categories.name}
                </span>
              )}
            </div>
            <div className={`text-3xl font-extrabold tracking-tight ${typeMeta.color}`}>
              {typeMeta.prefix}{formatCurrency(transaction.amount)}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xs border border-gray-200/60 dark:border-slate-700 text-gray-700 dark:text-slate-200">
            <Receipt className="h-7 w-7 text-blue-500" />
          </div>
        </div>

        {/* Detailed Attributes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {/* Date */}
          <div className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-400 dark:text-slate-500 uppercase">Transaction Date</p>
              <p className="font-semibold text-gray-800 dark:text-slate-200 truncate">{formatDate(transaction.date)}</p>
            </div>
          </div>

          {/* Time */}
          <div className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-400 dark:text-slate-500 uppercase">Time Recorded</p>
              <p className="font-semibold text-gray-800 dark:text-slate-200 truncate">
                {rawTime ? formatTime(rawTime) : 'Not specified'}
              </p>
            </div>
          </div>

          {/* Category */}
          <div className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Tag className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-400 dark:text-slate-500 uppercase">Category</p>
              <p className="font-semibold text-gray-800 dark:text-slate-200 truncate">
                {transaction.categories?.name || 'Uncategorized'}
              </p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              {renderMethodIcon(transaction.payment_methods?.type)}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-400 dark:text-slate-500 uppercase">Payment Method</p>
              <p className="font-semibold text-gray-800 dark:text-slate-200 truncate">
                {transaction.payment_methods?.name || 'Not selected'}
              </p>
            </div>
          </div>
        </div>

        {/* Note / Description */}
        <div className="p-3.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-medium text-gray-400 dark:text-slate-500 uppercase mb-1 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Note / Description
          </p>
          <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed break-words whitespace-pre-wrap">
            {cleanNote || <span className="text-gray-400 dark:text-slate-500 italic">No note added for this transaction.</span>}
          </p>
        </div>

        {/* Bill Attachment Preview */}
        {receipt && (
          <div className="p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Paperclip className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate">Attached Bill / Receipt</p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">{isPdf ? 'PDF Document' : 'Image Receipt'}</p>
              </div>
            </div>
            <button
              onClick={() => onPreviewReceipt && onPreviewReceipt(receipt)}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            >
              <FileText className="h-3.5 w-3.5" />
              View Attachment
            </button>
          </div>
        )}

        {/* AI Sentinel Background Review & Status Card */}
        {audit && (
          <div
            className={`p-3.5 rounded-2xl border text-xs transition-all ${
              fixedCategory
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : audit.status === 'suggest_fix'
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : audit.status === 'warning'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                {fixedCategory ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>AI Status: Category Updated to "{fixedCategory}"</span>
                  </>
                ) : audit.status === 'suggest_fix' ? (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>{audit.badge}</span>
                  </>
                ) : audit.status === 'warning' ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <span>{audit.badge}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{audit.badge}</span>
                  </>
                )}
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10">
                Continuous AI Sentinel
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-gray-600 dark:text-slate-300">
              {fixedCategory
                ? `Category successfully synced to ${fixedCategory}. Future transactions with this vendor pattern will inherit this classification.`
                : audit.reason}
            </p>

            {audit.suggestedCategory && !fixedCategory && (
              <div className="mt-2.5 pt-2 border-t border-amber-200/60 dark:border-amber-800/60 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                  Recommended: <strong className="font-bold">{audit.suggestedCategory}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyAiFix(audit.suggestedCategory)}
                  disabled={isFixing}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition-colors flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>{isFixing ? 'Updating...' : `Auto-Fix to ${audit.suggestedCategory}`}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Transaction ID & Metadata */}
        <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>ID:</span>
            <code className="font-mono text-[11px] bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-slate-400">
              {transaction.id ? `${String(transaction.id).slice(0, 8)}...` : 'local'}
            </code>
            {transaction.id && (
              <button
                onClick={handleCopyId}
                className="hover:text-gray-700 dark:hover:text-slate-300 p-1"
                title="Copy Full Transaction ID"
              >
                {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </button>
            )}
          </div>
          {transaction.created_at && (
            <span>Logged: {formatDate(transaction.created_at)}</span>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onClose()
              if (onDelete) onDelete(transaction)
            }}
            className="btn-secondary text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900 flex items-center gap-1.5 py-2 px-3"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2 px-3.5"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose()
                if (onEdit) onEdit(transaction)
              }}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Transaction
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
