import { useState, useMemo } from 'react'
import Modal from './Modal'
import {
  auditSubscriptions,
  CANCELLATION_DIRECTORY,
} from '../utils/subscriptionGhostHunter'
import { formatCurrency } from '../utils/formatCurrency'
import {
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  TrendingUp,
  CreditCard,
} from 'lucide-react'

export default function SubscriptionGhostHunterModal({ isOpen = true, onClose = () => {}, transactions = [], isEmbedded = false }) {
  const [expandedId, setExpandedId] = useState(null)

  const audit = useMemo(() => {
    return auditSubscriptions(transactions)
  }, [transactions])

  const { subscriptions, totalMonthlyBurn, annualBurn, hikeCount } = audit

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} isEmbedded={isEmbedded} title="Subscription Sentinel & Ghost Leak Hunter" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* KPI Burn Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Annual Subscription Drain
              </span>
              {hikeCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {hikeCount} Stealth Hike{hikeCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-black">
              {formatCurrency(annualBurn)} <span className="text-xs font-normal text-slate-300">/ year</span>
            </div>
          </div>

          <div className="text-right sm:text-right">
            <span className="text-[11px] text-slate-400">Monthly Run-rate:</span>
            <p className="text-lg font-bold text-rose-300">{formatCurrency(totalMonthlyBurn)}/mo</p>
          </div>
        </div>

        {/* Subscription List */}
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {subscriptions.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-500 dark:text-slate-400 border border-dashed rounded-xl">
              No active subscription leaks detected in recent transactions.
            </div>
          ) : (
            subscriptions.map(sub => {
              const isExpanded = expandedId === sub.id
              return (
                <div
                  key={sub.id}
                  className="p-3.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                          {sub.name}
                        </span>
                        {sub.hasHike && (
                          <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <TrendingUp className="h-2.5 w-2.5 text-amber-600" />
                            +{sub.hikePercentage}% Hike
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400">
                        {sub.charges.length} billing cycle{sub.charges.length > 1 ? 's' : ''} recorded • Total spent: {formatCurrency(sub.totalPaid)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-black text-sm text-gray-900 dark:text-white">
                          {formatCurrency(sub.latestAmount)}
                          <span className="text-[10px] text-gray-400 font-normal"> /mo</span>
                        </p>
                        {sub.previousAmount > 0 && sub.hasHike && (
                          <p className="text-[10px] text-gray-400 line-through">
                            was {formatCurrency(sub.previousAmount)}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                        className="p-1 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                        title="View direct cancel instructions"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Cancellation Guide Expandable Drawer */}
                  {isExpanded && (
                    <div className="pt-2.5 border-t border-gray-100 dark:border-slate-800 space-y-2 text-xs">
                      <div className="p-2.5 bg-gray-50 dark:bg-slate-850 rounded-lg text-[11px] text-gray-700 dark:text-slate-300 space-y-1">
                        <span className="font-bold block text-gray-900 dark:text-white">How to cancel:</span>
                        <p>{sub.steps}</p>
                      </div>

                      <div className="flex justify-end">
                        <a
                          href={sub.cancelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 hover:bg-rose-50"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Direct Cancel Link</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="btn-secondary text-xs py-2 px-4">
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
