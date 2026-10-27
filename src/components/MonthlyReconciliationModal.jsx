import { useState, useEffect } from 'react'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import {
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Lock,
  Unlock,
  Building,
  Scale,
  Sparkles,
  Printer,
} from 'lucide-react'

export default function MonthlyReconciliationModal({
  isOpen,
  onClose,
  months = [],
  monthlyData = {},
}) {
  const [selectedMonth, setSelectedMonth] = useState('')
  const [startingBalance, setStartingBalance] = useState('')
  const [endingBalance, setEndingBalance] = useState('')
  const [auditNotes, setAuditNotes] = useState('')
  const [isReconciled, setIsReconciled] = useState(false)
  const [reconciledDate, setReconciledDate] = useState(null)

  useEffect(() => {
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[months.length - 1]?.key || '')
    }
  }, [months, selectedMonth])

  // Load existing reconciliation state for selected month
  useEffect(() => {
    if (!selectedMonth) return
    try {
      const stored = localStorage.getItem(`ft_reconciliation_${selectedMonth}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        setStartingBalance(parsed.startingBalance || '')
        setEndingBalance(parsed.endingBalance || '')
        setAuditNotes(parsed.auditNotes || '')
        setIsReconciled(Boolean(parsed.isReconciled))
        setReconciledDate(parsed.reconciledAt || null)
      } else {
        setStartingBalance('')
        setEndingBalance('')
        setAuditNotes('')
        setIsReconciled(false)
        setReconciledDate(null)
      }
    } catch {
      setIsReconciled(false)
    }
  }, [selectedMonth])

  if (!isOpen) return null

  const curData = monthlyData[selectedMonth] || { income: 0, expense: 0, savings: 0 }
  const recordedNet = (curData.income || 0) - (curData.expense || 0)

  const startNum = parseFloat(startingBalance) || 0
  const endNum = parseFloat(endingBalance) || 0
  const physicalChange = endNum - startNum
  const variance = (startingBalance !== '' && endingBalance !== '')
    ? Math.round((physicalChange - recordedNet) * 100) / 100
    : 0

  const isBalanced = Math.abs(variance) < 1.0

  const handleToggleReconcile = () => {
    const nextState = !isReconciled
    const record = {
      monthKey: selectedMonth,
      startingBalance,
      endingBalance,
      auditNotes,
      recordedNet,
      variance,
      isReconciled: nextState,
      reconciledAt: nextState ? new Date().toISOString() : null,
    }
    try {
      localStorage.setItem(`ft_reconciliation_${selectedMonth}`, JSON.stringify(record))
    } catch {}
    setIsReconciled(nextState)
    setReconciledDate(record.reconciledAt)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Monthly Book Closing & Bank Reconciliation">
      <div className="space-y-4 text-xs">
        {/* Banner */}
        <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-indigo-950/40 rounded-2xl border border-blue-100 dark:border-slate-700 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white">
              Financial Month-End Reconciliation & Book Closing
            </h4>
            <p className="text-gray-500 dark:text-slate-400 text-[11px] mt-0.5">
              Verify recorded ledger cashflow against actual bank and credit card statement balances.
            </p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
          <span className="font-bold text-gray-700 dark:text-slate-300">Target Month:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input-field text-xs py-1.5 max-w-xs font-semibold bg-white dark:bg-slate-900"
          >
            {months.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Ledger Telemetry Cards */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <span className="text-[10px] text-gray-500 dark:text-slate-400 block font-medium">Recorded Income</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
              +{formatCurrency(curData.income || 0)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
            <span className="text-[10px] text-gray-500 dark:text-slate-400 block font-medium">Recorded Expenses</span>
            <span className="font-extrabold text-rose-600 dark:text-rose-400 text-xs">
              -{formatCurrency(curData.expense || 0)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <span className="text-[10px] text-gray-500 dark:text-slate-400 block font-medium">Expected Net Flow</span>
            <span className={`font-extrabold text-xs ${recordedNet >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600'}`}>
              {recordedNet >= 0 ? '+' : ''}{formatCurrency(recordedNet)}
            </span>
          </div>
        </div>

        {/* Physical Balances Form */}
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 space-y-3">
          <h5 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-blue-500" />
            Physical Bank / Card Balances
          </h5>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-[11px]" htmlFor="startBal">Month Opening Balance (₹)</label>
              <input
                id="startBal"
                type="number"
                disabled={isReconciled}
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                placeholder="e.g. 50000"
                className="input-field text-xs py-1.5"
              />
            </div>
            <div>
              <label className="label text-[11px]" htmlFor="endBal">Month Closing Balance (₹)</label>
              <input
                id="endBal"
                type="number"
                disabled={isReconciled}
                value={endingBalance}
                onChange={(e) => setEndingBalance(e.target.value)}
                placeholder="e.g. 82500"
                className="input-field text-xs py-1.5"
              />
            </div>
          </div>

          {/* Variance Analysis */}
          {startingBalance !== '' && endingBalance !== '' && (
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              isBalanced
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}>
              <div className="flex items-center gap-2">
                {isBalanced ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
                <div>
                  <span className="font-bold block">
                    {isBalanced ? 'Books 100% Reconciled!' : 'Variance Detected'}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-slate-400">
                    Expected: {formatCurrency(recordedNet)} • Physical Net: {formatCurrency(physicalChange)}
                  </span>
                </div>
              </div>
              <div className="text-right font-extrabold text-sm">
                {variance === 0 ? '₹0.00' : (variance > 0 ? `+${formatCurrency(variance)}` : `-${formatCurrency(Math.abs(variance))}`)}
              </div>
            </div>
          )}

          <div>
            <label className="label text-[11px]" htmlFor="notes">Reconciliation / Audit Memo</label>
            <input
              id="notes"
              type="text"
              disabled={isReconciled}
              value={auditNotes}
              onChange={(e) => setAuditNotes(e.target.value)}
              placeholder="e.g. SBI statement matches, ₹450 pending bank interest"
              className="input-field text-xs py-1.5"
            />
          </div>
        </div>

        {/* Reconciled Status Seal */}
        {isReconciled && (
          <div className="p-3 bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-emerald-600" />
              <div>
                <span className="font-bold text-xs block">Month Closed & Certified</span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300">
                  {reconciledDate ? `Reconciled on ${new Date(reconciledDate).toLocaleDateString()}` : 'Reconciled'}
                </span>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="btn btn-xs bg-white dark:bg-slate-800 border border-emerald-300 text-emerald-700 font-bold px-2 py-1 flex items-center gap-1"
            >
              <Printer className="h-3 w-3" /> Print
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary text-xs"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleToggleReconcile}
            className={`btn text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 text-white ${
              isReconciled
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isReconciled ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {isReconciled ? 'Reopen Month Books' : 'Reconcile & Seal Month'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
