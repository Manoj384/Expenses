import { useState, useRef } from 'react'
import {
  Pencil,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Paperclip,
  FileText,
  Rows3,
  StretchHorizontal,
  Table,
  LayoutGrid,
} from 'lucide-react'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/dateUtils'
import ConfirmDialog from './ConfirmDialog'
import EmptyState from './EmptyState'
import ReceiptPreviewModal from './ReceiptPreviewModal'

const SWIPE_THRESHOLD = 80 // px needed to trigger delete reveal

const TYPE_STYLES = {
  income:  'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  expense: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
  debit:   'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
}

function getMethodIcon(type) {
  switch (type) {
    case 'cash':   return Banknote
    case 'online': return Smartphone
    case 'card':   return CreditCard
    case 'bank':   return Building2
    default:       return CreditCard
  }
}

// Swipeable mobile card — swipe left to reveal delete, swipe right to cancel
function SwipeableCard({ tx, MethodIcon, receipt, isPdf, onEdit, onDelete, onPreview, isCompact }) {
  const startX = useRef(null)
  const [offset, setOffset] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const handleTouchStart = (e) => { startX.current = e.touches[0].clientX }

  const handleTouchMove = (e) => {
    if (startX.current === null) return
    const dx = e.touches[0].clientX - startX.current
    if (dx < 0) setOffset(Math.max(dx, -110)) // only slide left, max 110px
    else if (revealed) setOffset(Math.min(dx - 110, 0))
  }

  const handleTouchEnd = () => {
    if (offset < -SWIPE_THRESHOLD) {
      setOffset(-110)
      setRevealed(true)
    } else {
      setOffset(0)
      setRevealed(false)
    }
    startX.current = null
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Red delete zone behind */}
      <div className="absolute inset-y-0 right-0 w-28 bg-red-500 flex items-center justify-center rounded-2xl">
        <button
          onClick={() => { setOffset(0); setRevealed(false); onDelete(tx) }}
          className="flex flex-col items-center gap-1 text-white"
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-[10px] font-bold">Delete</span>
        </button>
      </div>

      {/* Card — slides left on swipe */}
      <div
        style={{ transform: `translateX(${offset}px)`, transition: startX.current ? 'none' : 'transform 0.25s ease' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 shadow-sm z-10"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${TYPE_STYLES[tx.type] || 'bg-gray-100 text-gray-700'}`}>
              {tx.type}
            </span>
            {tx.payment_methods && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-md text-xs font-medium">
                {MethodIcon && <MethodIcon className="h-3 w-3 text-gray-500" />}
                {tx.payment_methods.name}
              </span>
            )}
          </div>
          <p className={`text-lg font-bold flex-shrink-0 ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
          <span className="font-semibold text-gray-800 dark:text-slate-200 text-sm">{tx.categories?.name || 'Uncategorized'}</span>
          <span>{formatDate(tx.date)}</span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-1">
          {tx.note
            ? <p className="text-xs text-gray-500 dark:text-slate-400 italic truncate flex-1">"{tx.note}"</p>
            : <span />
          }
          {receipt && (
            <button
              onClick={() => onPreview(receipt)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold"
            >
              {isPdf ? <FileText className="h-3.5 w-3.5 text-rose-500" /> : <Paperclip className="h-3.5 w-3.5" />}
              <span>Bill</span>
            </button>
          )}
        </div>

        <div className="flex gap-2 mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800 justify-between items-center">
          <p className="text-[10px] text-gray-400 dark:text-slate-600">← Swipe left to delete</p>
          <button onClick={() => onEdit(tx)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
            <Pencil className="h-3 w-3" /> Edit
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TransactionList({ transactions, onEdit, onDelete }) {
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [previewReceipt, setPreviewReceipt] = useState(null)
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('ft_tx_view_mode') || 'table'
    } catch {
      return 'table'
    }
  })
  const [density, setDensity] = useState(() => {
    try {
      return localStorage.getItem('ft_tx_density') || 'comfortable'
    } catch {
      return 'comfortable'
    }
  })

  const handleSetViewMode = (mode) => {
    setViewMode(mode)
    try {
      localStorage.setItem('ft_tx_view_mode', mode)
    } catch {}
  }

  const toggleDensity = () => {
    const next = density === 'comfortable' ? 'compact' : 'comfortable'
    setDensity(next)
    try {
      localStorage.setItem('ft_tx_density', next)
    } catch {}
  }

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    await onDelete(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
  }

  const getReceiptUrl = (tx) => {
    if (tx.receipt_url) return tx.receipt_url
    try {
      return localStorage.getItem(`ft_receipt_${tx.id}`)
    } catch {
      return null
    }
  }

  if (!transactions || transactions.length === 0) {
    return (
      <EmptyState
        title="No transactions found"
        description="Add your first transaction to start tracking your finances."
      />
    )
  }

  const isCompact = density === 'compact'
  const showTable = viewMode === 'table'

  return (
    <>
      {/* View Mode & Density Switch Toolbar */}
      <div className="flex flex-wrap items-center justify-between pb-2 mb-3 border-b border-gray-100 dark:border-slate-800 gap-2 text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          Showing {transactions.length} transactions
        </span>

        <div className="flex items-center gap-2">
          {/* Desktop Table vs Cards Selector */}
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-slate-700 p-0.5 bg-gray-50 dark:bg-slate-800">
            <button
              onClick={() => handleSetViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                showTable
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Desktop Table Mode — view all transactions in compact single rows"
            >
              <Table className="h-3.5 w-3.5" />
              <span>Desktop Table</span>
            </button>

            <button
              onClick={() => handleSetViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                !showTable
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Mobile Card Mode"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
          </div>

          {/* Density Switcher */}
          {showTable && (
            <button
              onClick={toggleDensity}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              title={`Switch to ${isCompact ? 'Comfortable' : 'Compact'} Row Spacing`}
            >
              {isCompact ? (
                <>
                  <StretchHorizontal className="h-3.5 w-3.5 text-blue-500" />
                  <span>Compact</span>
                </>
              ) : (
                <>
                  <Rows3 className="h-3.5 w-3.5 text-slate-500" />
                  <span>Comfortable</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Full Desktop Table View (Single row layout for high density) */}
      {showTable ? (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className={`min-w-[640px] w-full ${isCompact ? 'text-xs' : 'text-sm'}`}>
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 bg-gray-50/50 dark:bg-slate-800/50">
                  <th className={`text-left ${isCompact ? 'py-2 px-3' : 'py-3 px-4'}`}>Date</th>
                  <th className={`text-left ${isCompact ? 'py-2 px-3' : 'py-3 px-4'}`}>Type</th>
                  <th className={`text-left ${isCompact ? 'py-2 px-3' : 'py-3 px-4'}`}>Category</th>
                  <th className={`text-left ${isCompact ? 'py-2 px-3' : 'py-3 px-4'}`}>Payment Method</th>
                  <th className={`text-left ${isCompact ? 'py-2 px-3' : 'py-3 px-4'}`}>Note / Bill</th>
                  <th className={`text-right ${isCompact ? 'py-2 px-3' : 'py-3 px-4'}`}>Amount</th>
                  <th className={`text-right ${isCompact ? 'py-2 px-3' : 'py-3 px-4'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {transactions.map((tx) => {
                  const MethodIcon = tx.payment_methods?.type ? getMethodIcon(tx.payment_methods.type) : null
                  const receipt = getReceiptUrl(tx)
                  const isPdf = receipt && (receipt.toLowerCase().includes('.pdf') || receipt.includes('application/pdf'))

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className={`${isCompact ? 'py-2 px-3' : 'py-3 px-4'} text-gray-700 dark:text-slate-300 whitespace-nowrap font-medium`}>{formatDate(tx.date)}</td>
                      <td className={`${isCompact ? 'py-2 px-3' : 'py-3 px-4'}`}>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${TYPE_STYLES[tx.type] || 'bg-gray-100 text-gray-700'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className={`${isCompact ? 'py-2 px-3' : 'py-3 px-4'} text-gray-800 dark:text-slate-200 font-semibold whitespace-nowrap`}>{tx.categories?.name ?? '—'}</td>
                      <td className={`${isCompact ? 'py-2 px-3' : 'py-3 px-4'} text-gray-600 dark:text-slate-400 whitespace-nowrap`}>
                        {tx.payment_methods ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-md text-xs font-medium">
                            {MethodIcon && <MethodIcon className="h-3 w-3 text-gray-500 dark:text-slate-400" />}
                            {tx.payment_methods.name}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className={`${isCompact ? 'py-2 px-3' : 'py-3 px-4'} text-gray-500 dark:text-slate-400 max-w-[200px]`}>
                        <div className="flex items-center gap-2">
                          <span className="truncate">{tx.note || '—'}</span>
                          {receipt && (
                            <button
                              onClick={() => setPreviewReceipt(receipt)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-md text-[11px] font-bold flex-shrink-0 transition-colors"
                              title="View attached bill / invoice"
                            >
                              {isPdf ? <FileText className="h-3 w-3 text-rose-500" /> : <Paperclip className="h-3 w-3" />}
                              <span>Bill</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className={`${isCompact ? 'py-2 px-3 font-semibold' : 'py-3 px-4 font-bold'} text-right whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td className={`${isCompact ? 'py-2 px-3' : 'py-3 px-4'} text-right whitespace-nowrap`}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEdit(tx)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 text-gray-400 hover:text-blue-600 transition-colors"
                            aria-label="Edit transaction"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(tx)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-slate-800 text-gray-400 hover:text-red-600 transition-colors"
                            aria-label="Delete transaction"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Mobile Cards Mode with swipe-to-delete */
        <div className="space-y-2">
          {transactions.map((tx) => {
            const MethodIcon = tx.payment_methods?.type ? getMethodIcon(tx.payment_methods.type) : null
            const receipt = getReceiptUrl(tx)
            const isPdf = receipt && (receipt.toLowerCase().includes('.pdf') || receipt.includes('application/pdf'))

            return (
              <SwipeableCard
                key={tx.id}
                tx={tx}
                MethodIcon={MethodIcon}
                receipt={receipt}
                isPdf={isPdf}
                onEdit={onEdit}
                onDelete={setDeleteTarget}
                onPreview={setPreviewReceipt}
                isCompact={isCompact}
              />
            )
          })}
        </div>
      )}

      {/* Bill / Invoice Receipt Viewer Modal */}
      {previewReceipt && (
        <ReceiptPreviewModal
          isOpen={!!previewReceipt}
          onClose={() => setPreviewReceipt(null)}
          receiptUrl={previewReceipt}
        />
      )}

      {/* Delete Confirm Modal */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
