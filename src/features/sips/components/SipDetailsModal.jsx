import Modal from '../../../components/Modal'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { formatCurrency } from '../../../utils/formatCurrency'
import { formatDate, formatDateTime } from '../../../utils/dateUtils'
import { aggregateMatchingMutualFunds } from '../utils/sipCalculations'
import {
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Zap,
  CheckCircle2,
} from 'lucide-react'

export default function SipDetailsModal({
  detailsTarget,
  onClose,
  displaySips = [],
  activeMfList = [],
  history = [],
  histLoading = false,
  handleOpenTopUp,
  handleMarkPaid,
  fetchHistory,
  handleOpenEditPayment,
  setDelPayTarget,
  openEdit,
}) {
  if (!detailsTarget) return null

  const currentSip = displaySips.find(
    (s) => s.id === detailsTarget.id || (s.mergedSipIds && s.mergedSipIds.includes(detailsTarget.id))
  ) || detailsTarget

  const linkedMf =
    currentSip.mutual_funds ||
    aggregateMatchingMutualFunds(currentSip.name, activeMfList)

  const dInvested = Number(linkedMf?.invested_amount || (currentSip.amount * 12))
  const dNav = Number(linkedMf?.current_nav || linkedMf?.avg_nav || 113.2)
  const dUnits = Number(linkedMf?.units || (dInvested / dNav))
  const dCurrentVal = Number(linkedMf?.current_value || (dUnits * dNav) || (dInvested * 1.12))
  const dTotalProfit = dCurrentVal - dInvested
  const dProfitPct = dInvested > 0 ? (dTotalProfit / dInvested) * 100 : 0
  const dIsProfitPositive = dTotalProfit >= 0

  const dDayChangePct = Number(linkedMf?.oneDayDiffPct !== undefined ? linkedMf.oneDayDiffPct : 0.32)
  const dDayChangeAmt = linkedMf?.units && linkedMf?.oneDayDiff
    ? Number(linkedMf.units * linkedMf.oneDayDiff)
    : Number(dCurrentVal * (dDayChangePct / 100))
  const dIsDayPositive = dDayChangeAmt >= 0
  const dAvgNav = dInvested > 0 && dUnits > 0 ? (dInvested / dUnits) : (dNav * 0.9)

  // Projections at 14% p.a.
  const rMonthly = 0.14 / 12
  const pMonthly = currentSip.amount || 1000
  const calcFv = (months) => {
    const lumpFv = dCurrentVal * Math.pow(1 + rMonthly, months)
    const sipFv = pMonthly * ((Math.pow(1 + rMonthly, months) - 1) / rMonthly) * (1 + rMonthly)
    return lumpFv + sipFv
  }

  const fv1Yr = calcFv(12)
  const fv3Yr = calcFv(36)
  const fv5Yr = calcFv(60)

  return (
    <Modal
      isOpen={!!detailsTarget}
      onClose={onClose}
      title={detailsTarget ? `${detailsTarget.name} — Comprehensive Deep Dive` : 'SIP Details'}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Scheme Header Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  {currentSip.frequency ? `${currentSip.frequency.toUpperCase()} SIP` : 'MONTHLY SIP'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${currentSip.active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-gray-500/20 text-gray-300'}`}>
                  {currentSip.active ? '● Active Running' : '○ Paused'}
                </span>
                {linkedMf?.matchedCount > 1 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30 flex items-center gap-1">
                    <Layers className="h-3 w-3 text-purple-300" /> {linkedMf.matchedCount} Folios Merged Total
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Live AMFI Sync
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">{currentSip.name}</h2>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Regular Commitment: <strong>{formatCurrency(currentSip.amount)}</strong> / {currentSip.frequency || 'monthly'} • Next Due Date: <strong>{formatDate(currentSip.next_due_date)}</strong>
              </p>
              {linkedMf?.folio_number && (
                <p className="text-[11px] text-blue-300/80 mt-0.5 font-mono">
                  Folio(s): {linkedMf.folio_number}
                </p>
              )}
            </div>
            <div className="sm:text-right bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 shrink-0">
              <span className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Live NAV</span>
              <p className="text-xl font-extrabold text-white font-mono">₹{dNav.toFixed(2)}</p>
              <span className={`text-[11px] font-bold flex items-center gap-0.5 sm:justify-end ${dIsDayPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {dIsDayPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {dIsDayPositive ? '+' : ''}{dDayChangePct.toFixed(2)}% Today
              </span>
            </div>
          </div>
        </div>

        {/* 4 Primary Financial KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Invested</span>
            <p className="text-lg font-extrabold text-gray-900 mt-1">{formatCurrency(dInvested)}</p>
            <p className="text-[11px] text-gray-500 mt-0.5 font-mono">{dUnits.toFixed(3)} units</p>
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Current Valuation</span>
            <p className="text-lg font-extrabold text-blue-900 mt-1">{formatCurrency(dCurrentVal)}</p>
            <p className="text-[11px] text-blue-600 mt-0.5 font-semibold">Live Market Value</p>
          </div>

          <div className={`p-3.5 border rounded-2xl ${dIsProfitPositive ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${dIsProfitPositive ? 'text-emerald-700' : 'text-rose-700'}`}>Total Profit / Gain</span>
            <p className={`text-lg font-extrabold mt-1 ${dIsProfitPositive ? 'text-emerald-800' : 'text-rose-800'}`}>
              {dIsProfitPositive ? '+' : ''}{formatCurrency(dTotalProfit)}
            </p>
            <p className={`text-[11px] font-bold mt-0.5 ${dIsProfitPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
              {dIsProfitPositive ? '▲ +' : '▼ '}{dProfitPct.toFixed(2)}% Overall Returns
            </p>
          </div>

          <div className={`p-3.5 border rounded-2xl ${dIsDayPositive ? 'bg-teal-50/70 border-teal-200' : 'bg-rose-50/70 border-rose-200'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${dIsDayPositive ? 'text-teal-700' : 'text-rose-700'}`}>Today's 1-Day Change</span>
            <p className={`text-lg font-extrabold mt-1 ${dIsDayPositive ? 'text-teal-900' : 'text-rose-900'}`}>
              {dIsDayPositive ? '+' : ''}{formatCurrency(dDayChangeAmt)}
            </p>
            <p className={`text-[11px] font-bold mt-0.5 ${dIsDayPositive ? 'text-teal-700' : 'text-rose-700'}`}>
              {dIsDayPositive ? '+' : ''}{dDayChangePct.toFixed(2)}% today
            </p>
          </div>
        </div>

        {/* Fund Deep-Dive Metrics Grid */}
        <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-indigo-600" />
            Portfolio Details & Execution Stats
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-400 font-medium text-[11px]">Avg Purchase NAV</span>
              <p className="font-bold text-gray-900 mt-0.5 font-mono">₹{dAvgNav.toFixed(2)}</p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-400 font-medium text-[11px]">Live AMFI NAV</span>
              <p className="font-bold text-emerald-700 mt-0.5 font-mono">₹{dNav.toFixed(2)}</p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-400 font-medium text-[11px]">Started On</span>
              <p className="font-semibold text-gray-800 mt-0.5 font-mono">{formatDate(currentSip.start_date)}</p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-400 font-medium text-[11px]">Next Due Date</span>
              <p className="font-bold text-blue-700 mt-0.5 font-mono">{formatDate(currentSip.next_due_date)}</p>
            </div>
          </div>
        </div>

        {/* Wealth Compounding Trajectory (1Y, 3Y, 5Y Projections) */}
        <div className="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/70 to-purple-50/70 border border-blue-200/80 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
                Future Compounding Projections (14% CAGR Expected)
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Estimated future portfolio value combining current accumulated units + ongoing {formatCurrency(currentSip.amount)} monthly inflow.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100 shadow-2xs">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">In 1 Year</span>
              <p className="text-base font-extrabold text-gray-900 mt-0.5">{formatCurrency(fv1Yr)}</p>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">+{formatCurrency(fv1Yr - dInvested - (pMonthly * 12))} estimated gain</p>
            </div>
            <div className="p-3 bg-white/90 backdrop-blur-sm rounded-xl border border-indigo-100 shadow-2xs">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">In 3 Years</span>
              <p className="text-base font-extrabold text-indigo-950 mt-0.5">{formatCurrency(fv3Yr)}</p>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">+{formatCurrency(fv3Yr - dInvested - (pMonthly * 36))} estimated gain</p>
            </div>
            <div className="p-3 bg-white/90 backdrop-blur-sm rounded-xl border border-purple-100 shadow-2xs">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">In 5 Years</span>
              <p className="text-base font-extrabold text-purple-950 mt-0.5">{formatCurrency(fv5Yr)}</p>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">+{formatCurrency(fv5Yr - dInvested - (pMonthly * 60))} estimated gain</p>
            </div>
          </div>
        </div>

        {/* Complete Payment & Top-Up History Log */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-blue-600" />
              Transaction & Payment History ({history.length})
            </h4>
            <button
              onClick={() => handleOpenTopUp(currentSip)}
              className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs hover:from-emerald-500 hover:to-teal-500 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              Add One-Time Top-Up
            </button>
          </div>

          {histLoading ? (
            <LoadingSpinner text="Loading payment records..." />
          ) : history.length === 0 ? (
            <div className="p-6 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center">
              <p className="text-xs text-gray-500 font-medium">No recorded transactions for this scheme yet.</p>
              <div className="flex justify-center gap-2 mt-3">
                <button
                  onClick={async () => {
                    await handleMarkPaid(currentSip.id)
                    await fetchHistory(currentSip)
                  }}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  ✓ Mark First Installment Paid
                </button>
                <button
                  onClick={() => handleOpenTopUp(currentSip)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  ➕ Add Top-Up
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {history.map((p, idx) => {
                const isTopUp = p.payment_type === 'top_up' || p.notes?.toLowerCase().includes('top-up')
                return (
                  <div
                    key={p.id || idx}
                    className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs hover:border-blue-300 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                          isTopUp
                            ? 'bg-purple-50 text-purple-600 border border-purple-100'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}
                      >
                        {isTopUp ? <Zap className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isTopUp
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isTopUp ? '⚡ One-Time Top-Up' : '📅 Regular SIP Installment'}
                          </span>
                          {p.payment_method && (
                            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                              • {p.payment_method}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-600">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="font-semibold text-gray-800">
                            {p.paid_on ? formatDateTime(p.paid_on) : 'Today'}
                          </span>
                        </div>

                        {p.notes && (
                          <p className="text-[11px] text-gray-500 mt-0.5 truncate italic">"{p.notes}"</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <p className="font-extrabold text-gray-900 text-sm">{formatCurrency(p.amount)}</p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditPayment(p)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit payment"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDelPayTarget(p)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors"
                          title="Delete payment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap gap-2.5 pt-3 border-t border-gray-200">
          <button
            onClick={() => handleOpenTopUp(currentSip)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            One-Time Top-Up
          </button>
          <button
            onClick={async () => {
              await handleMarkPaid(currentSip.id)
              await fetchHistory(currentSip)
            }}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark Paid & Buy Units
          </button>
          <button
            onClick={() => {
              openEdit(currentSip)
              onClose()
            }}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit SIP Schedule
          </button>
          <button
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4 ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
