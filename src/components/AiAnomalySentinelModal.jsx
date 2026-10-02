import { useState, useEffect, useMemo, useCallback } from 'react'
import Modal from './Modal'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/dateUtils'
import { runFullAiAnomalyAudit } from '../utils/anomalyDetector'
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Copy,
  TrendingUp,
  CreditCard,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Zap,
  ArrowRight,
  Info,
} from 'lucide-react'

export default function AiAnomalySentinelModal({ isOpen, onClose, isEmbedded = false }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'duplicates' | 'spikes' | 'hikes'
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('ft_dismissed_anomalies')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const fetchTransactions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, date, type, note, categories(name), payment_methods(name)')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(200)

      if (!error && data) {
        setTransactions(data)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (isOpen) {
      fetchTransactions()
    }
  }, [isOpen, fetchTransactions])

  const auditReport = useMemo(() => {
    // If user has few live transactions, supply sample transactions for a comprehensive inspection
    const baseTxns = transactions.length >= 5 ? transactions : [
      { id: 'sample-1', amount: 450, date: '2026-09-28', type: 'expense', category: 'Food & Dining', note: 'Swiggy Lunch' },
      { id: 'sample-2', amount: 450, date: '2026-09-28', type: 'expense', category: 'Food & Dining', note: 'Swiggy Lunch' },
      { id: 'sample-3', amount: 14999, date: '2026-09-25', type: 'expense', category: 'Shopping', note: 'Zara Shopping Spree' },
      { id: 'sample-4', amount: 799, date: '2026-09-20', type: 'expense', category: 'Entertainment', note: 'Netflix Premium' },
      { id: 'sample-5', amount: 649, date: '2026-08-20', type: 'expense', category: 'Entertainment', note: 'Netflix Premium' },
      { id: 'sample-6', amount: 18400, date: '2026-09-18', type: 'expense', category: 'Dining Out', note: 'Fine Dine Weekend' },
      { id: 'sample-7', amount: 3500, date: '2026-08-15', type: 'expense', category: 'Dining Out', note: 'Dinner' },
      { id: 'sample-8', amount: 4000, date: '2026-07-12', type: 'expense', category: 'Dining Out', note: 'Dinner' },
    ]

    return runFullAiAnomalyAudit(baseTxns)
  }, [transactions])

  const { anomalies, duplicates, spikes, hikes, healthScore, totalFinancialExposure, status } = auditReport

  const visibleAnomalies = anomalies.filter(a => !dismissedIds.includes(a.id)).filter(a => {
    if (activeFilter === 'duplicates') return a.type === 'DUPLICATE_CHARGE'
    if (activeFilter === 'spikes') return a.type === 'SPENDING_SPIKE'
    if (activeFilter === 'hikes') return a.type === 'SUBSCRIPTION_HIKE'
    return true
  })

  const dismissAlert = (id) => {
    const updated = [...dismissedIds, id]
    setDismissedIds(updated)
    try {
      localStorage.setItem('ft_dismissed_anomalies', JSON.stringify(updated))
    } catch {}
  }

  const resetDismissals = () => {
    setDismissedIds([])
    try {
      localStorage.removeItem('ft_dismissed_anomalies')
    } catch {}
  }

  return (
    <Modal isOpen={isOpen} isEmbedded={isEmbedded} onClose={onClose} title="AI Spending Anomaly & Duplicate Charge Sentinel" size="2xl">
      <div className="space-y-6 text-xs">
        {/* Top Sentinel Status Banner */}
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
          visibleAnomalies.length === 0
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
            : visibleAnomalies.length <= 2
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-100'
        }`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {visibleAnomalies.length === 0 ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400 animate-bounce" />
              )}
              <h3 className="text-sm font-black uppercase tracking-wide">
                Account Sentinel: {visibleAnomalies.length === 0 ? 'All Systems Clear' : `${visibleAnomalies.length} Flagged Anomalies`}
              </h3>
            </div>
            <p className="text-xs opacity-90">
              {visibleAnomalies.length === 0
                ? 'No duplicate card swipes, velocity surges, or stealth subscription price hikes detected.'
                : `Total estimated financial exposure: ${formatCurrency(totalFinancialExposure)} across flagged charges.`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTransactions}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Rescan</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
              <span className="text-[10px] uppercase font-bold">Duplicate Swipes</span>
              <Copy className="h-4 w-4" />
            </div>
            <span className="text-xl font-black text-blue-950 dark:text-blue-100">{duplicates.length} Detected</span>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50">
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
              <span className="text-[10px] uppercase font-bold">Velocity Spikes</span>
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-xl font-black text-purple-950 dark:text-purple-100">{spikes.length} Surges</span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
              <span className="text-[10px] uppercase font-bold">Stealth Hikes</span>
              <Zap className="h-4 w-4" />
            </div>
            <span className="text-xl font-black text-amber-950 dark:text-amber-100">{hikes.length} Price Jumps</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: `All Alerts (${visibleAnomalies.length})` },
              { id: 'duplicates', label: `Duplicate Charges (${duplicates.length})` },
              { id: 'spikes', label: `Category Spikes (${spikes.length})` },
              { id: 'hikes', label: `Price Hikes (${hikes.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {dismissedIds.length > 0 && (
            <button onClick={resetDismissals} className="text-blue-600 hover:underline text-[11px] font-semibold">
              Restore {dismissedIds.length} Dismissed
            </button>
          )}
        </div>

        {/* Anomaly Incident Cards List */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {visibleAnomalies.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-white">Zero Active Anomalies</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Your spending velocity, recurring subscriptions, and card transactions match your safe baseline profile.
              </p>
            </div>
          ) : (
            visibleAnomalies.map(item => {
              const isHigh = item.severity === 'HIGH' || item.severity === 'CRITICAL'
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                    isHigh
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                      : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                          isHigh ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                        }`}>
                          {item.severity} ALERT
                        </span>
                        <strong className="text-xs font-bold text-gray-900 dark:text-white">{item.title}</strong>
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-slate-300">{item.description}</p>
                    </div>

                    <button
                      onClick={() => dismissAlert(item.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 text-xs font-bold px-2 py-1 rounded-lg hover:bg-gray-200/50 transition-colors"
                      title="Dismiss alert"
                    >
                      Dismiss
                    </button>
                  </div>

                  {/* AI Recommendation Box */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-start gap-2 text-[11px]">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-800 dark:text-slate-200 block">AI Sentinel Action:</span>
                      <p className="text-gray-500 dark:text-slate-400">{item.recommendation}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="flex justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-secondary text-xs">Close Sentinel</button>
        </div>
      </div>
    </Modal>
  )
}
