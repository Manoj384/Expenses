import { useState, useMemo } from 'react'
import {
  generateDailyMorningBriefing,
  triggerMorningPushAlert,
} from '../utils/morningBriefingEngine'
import { formatCurrency } from '../utils/formatCurrency'
import {
  Sun,
  Bell,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
} from 'lucide-react'

export default function SafeToSpendWidget({
  monthlyIncome = 85000,
  monthlyBudget = 50000,
  totalSpent = 22000,
  bills = [],
  sips = [],
}) {
  const [notified, setNotified] = useState(false)

  const briefing = useMemo(() => {
    return generateDailyMorningBriefing({
      monthlyIncome,
      monthlyBudget,
      totalSpent,
      bills,
      sips,
    })
  }, [monthlyIncome, monthlyBudget, totalSpent, bills, sips])

  const handleNotifyMe = async () => {
    const success = await triggerMorningPushAlert(briefing)
    if (success) {
      setNotified(true)
      setTimeout(() => setNotified(false), 3000)
    }
  }

  return (
    <div className="card p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
          <Sun className="h-5 w-5 animate-spin-slow" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              Today's Safe-to-Spend
            </span>
            <span className="text-[10px] text-gray-500 dark:text-slate-400">
              {briefing.dateStr} • {briefing.daysRemaining} days left
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
            {formatCurrency(briefing.safeSpendToday)}
            <span className="text-xs font-normal text-gray-500 dark:text-slate-400"> / day to stay on track</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        {briefing.urgentBills.length > 0 ? (
          <div className="text-[11px] font-semibold px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            <span>{briefing.urgentBills[0].name} ({formatCurrency(briefing.urgentBills[0].amount)}) {briefing.urgentBills[0].dueWhen}!</span>
          </div>
        ) : (
          <div className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>All Dues Clear</span>
          </div>
        )}

        <button
          onClick={handleNotifyMe}
          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-gray-700 dark:text-slate-200"
          title="Send daily morning alert to phone/browser"
        >
          <Bell className="h-3.5 w-3.5 text-emerald-600" />
          <span>{notified ? 'Alert Sent!' : 'Push Digest'}</span>
        </button>
      </div>
    </div>
  )
}
