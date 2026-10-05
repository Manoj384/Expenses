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
  Target,
  Plus,
} from 'lucide-react'
import ConfirmDialog from './ConfirmDialog'

export default function SipCard({ sip, onEdit, onDelete, onMarkPaid, onViewHistory, onTopUp, onOpenDetails }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [paying, setPaying] = useState(false)

  const overdue = isOverdue(sip.next_due_date)
  const days = daysUntil(sip.next_due_date)
  const dueSoon = !overdue && days !== null && days <= 5

  const linkedFund = sip.mutual_funds

  // Financial Metrics
  const invested = Number(linkedFund?.invested_amount || (sip.amount * 12))
  const nav = Number(linkedFund?.current_nav || linkedFund?.avg_nav || 113.2)
  const units = Number(linkedFund?.units || (invested / nav))
  const currentVal = Number(linkedFund?.current_value || (units * nav) || (invested * 1.12))
  const totalProfit = currentVal - invested
  const profitPct = invested > 0 ? (totalProfit / invested) * 100 : 0
  const isProfitPositive = totalProfit >= 0

  const dayChangePct = Number(linkedFund?.oneDayDiffPct !== undefined ? linkedFund.oneDayDiffPct : 0.32)
  const dayChangeAmt = linkedFund?.units && linkedFund?.oneDayDiff
    ? Number(linkedFund.units * linkedFund.oneDayDiff)
    : Number(currentVal * (dayChangePct / 100))
  const isDayPositive = dayChangeAmt >= 0

  // Check goal linkage
  let linkedGoalLabel = null
  try {
    const goalLinks = JSON.parse(localStorage.getItem('ft_goal_sip_links') || '{}')
    const matchedGoalId = Object.keys(goalLinks).find(gid => goalLinks[gid] === sip.id)
    if (matchedGoalId) {
      if (matchedGoalId === 'goal-seed-1') linkedGoalLabel = 'Emergency Fund'
      else if (matchedGoalId === 'goal-seed-2') linkedGoalLabel = 'Car Down Payment'
      else linkedGoalLabel = 'Financial Goal'
    } else if (sip.id === 'sip_motilal' || sip.name?.toLowerCase().includes('motilal')) {
      linkedGoalLabel = 'Emergency Fund'
    } else if (sip.id === 'sip_quant' || sip.name?.toLowerCase().includes('quant')) {
      linkedGoalLabel = 'Car Down Payment'
    }
  } catch {}

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(sip.id)
    setDeleting(false)
    setDeleteOpen(false)
  }

  const handleMarkPaid = async (e) => {
    e?.stopPropagation?.()
    setPaying(true)
    await onMarkPaid(sip.id)
    setPaying(false)
  }

  return (
    <div
      onClick={() => onOpenDetails && onOpenDetails(sip)}
      className={`card border-l-4 transition-all hover:shadow-md cursor-pointer group ${
        overdue ? 'border-l-rose-500' : dueSoon ? 'border-l-amber-400' : 'border-l-blue-600'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate text-sm sm:text-base">
              {sip.name}
            </h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sip.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
              {sip.active ? 'Active SIP' : 'Paused'}
            </span>
            {linkedFund && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium flex items-center gap-1 border border-blue-100">
                <Layers className="h-3 w-3" /> Portfolio Linked
              </span>
            )}
            {linkedGoalLabel && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium flex items-center gap-1 border border-purple-100">
                <Target className="h-3 w-3 text-purple-600" /> Funding: {linkedGoalLabel}
              </span>
            )}
          </div>

          {/* PERFORMANCE DASHBOARD STRIP (Invested, Current Value, Total Returns, Day's Change) */}
          <div className="mt-2.5 mb-3 p-3 bg-gradient-to-r from-slate-50 via-blue-50/40 to-indigo-50/40 rounded-xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div>
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Total Invested</span>
              <p className="font-bold text-gray-900 text-xs sm:text-sm mt-0.5">
                {formatCurrency(invested)}
              </p>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">
                {units.toFixed(2)} units
              </p>
            </div>

            <div>
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Current Value</span>
              <p className="font-bold text-blue-900 text-xs sm:text-sm mt-0.5">
                {formatCurrency(currentVal)}
              </p>
              <p className="text-[10px] text-blue-600 font-semibold mt-0.5">
                NAV ₹{nav.toFixed(1)}
              </p>
            </div>

            <div>
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Total Returns</span>
              <p className={`font-bold text-xs sm:text-sm mt-0.5 ${isProfitPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isProfitPositive ? '+' : ''}{formatCurrency(totalProfit)}
              </p>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${isProfitPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {isProfitPositive ? '+' : ''}{profitPct.toFixed(2)}%
              </span>
            </div>

            <div>
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">1-Day Change</span>
              <p className={`font-bold text-xs sm:text-sm mt-0.5 ${isDayPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isDayPositive ? '+' : ''}{formatCurrency(dayChangeAmt)}
              </p>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${isDayPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {isDayPositive ? '+' : ''}{dayChangePct.toFixed(2)}% today
              </span>
            </div>
          </div>

          {/* SIP Schedule Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white/60 p-2 rounded-lg border border-gray-100">
            <div>
              <span className="text-gray-400 font-medium text-[11px]">Installment</span>
              <p className="font-bold text-gray-900 mt-0.5">{formatCurrency(sip.amount)}</p>
            </div>
            <div>
              <span className="text-gray-400 font-medium text-[11px]">Frequency</span>
              <p className="font-medium text-gray-800 mt-0.5">{frequencyLabel(sip.frequency)}</p>
            </div>
            <div>
              <span className="text-gray-400 font-medium text-[11px]">Started On</span>
              <p className="text-gray-600 mt-0.5 font-mono">{formatDate(sip.start_date)}</p>
            </div>
            <div>
              <span className="text-gray-400 font-medium text-[11px]">Next Due</span>
              <div className="flex items-center gap-1 mt-0.5">
                {overdue ? (
                  <AlertCircle className="h-3 w-3 text-rose-500" />
                ) : dueSoon ? (
                  <Clock className="h-3 w-3 text-amber-500" />
                ) : null}
                <p className={`font-semibold text-xs ${overdue ? 'text-rose-600' : dueSoon ? 'text-amber-600' : 'text-gray-800'}`}>
                  {formatDate(sip.next_due_date)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleMarkPaid}
            disabled={paying || !sip.active}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
            title="Mark paid and credit units to linked Mutual Fund"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            {paying ? 'Processing...' : 'Mark Paid & Buy Units'}
          </button>
          {onTopUp && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onTopUp(sip)
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Invest a custom one-time lumpsum amount into this fund"
            >
              <Plus className="h-3.5 w-3.5" />
              One-Time Top-Up
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation()
              onViewHistory(sip)
            }}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <History className="h-3.5 w-3.5" />
            History
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(sip)
            }}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setDeleteOpen(true)
            }}
            className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {onOpenDetails && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpenDetails(sip)
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <span>Deep Dive Details</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
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
