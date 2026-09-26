import { useState } from 'react'
import { Pencil, Trash2, CreditCard, Banknote, Smartphone, Building2 } from 'lucide-react'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/dateUtils'
import ConfirmDialog from './ConfirmDialog'
import EmptyState from './EmptyState'

const TYPE_STYLES = {
  income:  'bg-emerald-100 text-emerald-800 border-emerald-200',
  expense: 'bg-rose-100 text-rose-800 border-rose-200',
  debit:   'bg-amber-100 text-amber-800 border-amber-200',
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

export default function TransactionList({ transactions, onEdit, onDelete }) {
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    await onDelete(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
  }

  if (!transactions || transactions.length === 0) {
    return (
      <EmptyState
        title="No transactions found"
        description="Add your first transaction to start tracking your finances."
      />
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="text-left py-3 px-4">Date</th>
              <th className="text-left py-3 px-4">Type</th>
              <th className="text-left py-3 px-4">Category</th>
              <th className="text-left py-3 px-4">Payment Method</th>
              <th className="text-left py-3 px-4">Note</th>
              <th className="text-right py-3 px-4">Amount</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {transactions.map((tx) => {
              const MethodIcon = tx.payment_methods?.type ? getMethodIcon(tx.payment_methods.type) : null
              return (
                <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3 px-4 text-gray-700 whitespace-nowrap">{formatDate(tx.date)}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${TYPE_STYLES[tx.type] || 'bg-gray-100 text-gray-700'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-800 font-medium">{tx.categories?.name ?? '—'}</td>
                  <td className="py-3 px-4 text-gray-600">
                    {tx.payment_methods ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                        {MethodIcon && <MethodIcon className="h-3 w-3 text-gray-500" />}
                        {tx.payment_methods.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-500 max-w-[180px] truncate">{tx.note || '—'}</td>
                  <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(tx)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        aria-label="Edit transaction"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(tx)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
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

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {transactions.map((tx) => {
          const MethodIcon = tx.payment_methods?.type ? getMethodIcon(tx.payment_methods.type) : null
          return (
            <div key={tx.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${TYPE_STYLES[tx.type] || 'bg-gray-100 text-gray-700'}`}>
                    {tx.type}
                  </span>
                  {tx.payment_methods && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                      {MethodIcon && <MethodIcon className="h-3 w-3 text-gray-500" />}
                      {tx.payment_methods.name}
                    </span>
                  )}
                </div>
                <p className={`text-lg font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span className="font-semibold text-gray-800 text-sm">{tx.categories?.name || 'Uncategorized'}</span>
                <span>{formatDate(tx.date)}</span>
              </div>

              {tx.note && <p className="text-xs text-gray-500 mt-1 italic">{tx.note}</p>}

              <div className="flex gap-2 mt-3 pt-2 border-t border-gray-50 justify-end">
                <button onClick={() => onEdit(tx)} className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1">
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button onClick={() => setDeleteTarget(tx)} className="btn-danger text-xs py-1 px-2.5 flex items-center gap-1">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

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
