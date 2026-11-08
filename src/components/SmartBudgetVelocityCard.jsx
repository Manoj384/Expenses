import { useMemo } from 'react'
import {
  calculateBurnVelocity,
  calculateEnvelopeSummary,
} from '../utils/budgetVelocityEngine'
import { formatCurrency } from '../utils/formatCurrency'
import {
  Flame,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  PieChart,
  Calendar,
  Wallet,
  Compass,
  ArrowRight,
} from 'lucide-react'

export default function SmartBudgetVelocityCard({
  monthlyIncome = 85000,
  categories = [],
  spendingMap = {},
  totalBudget = 0,
  totalSpent = 0,
}) {
  const velocity = useMemo(() => {
    return calculateBurnVelocity({
      totalSpent,
      monthlyBudget: totalBudget,
    })
  }, [totalSpent, totalBudget])

  const envelopes = useMemo(() => {
    return calculateEnvelopeSummary({
      monthlyIncome,
      categories,
      spendingMap,
    })
  }, [monthlyIncome, categories, spendingMap])

  return (
    <div className="space-y-4 mb-6">
      {/* 1. Daily Burn Velocity & Safe-to-Spend Allowance Gauge */}
      <div className="card p-5 border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Flame className="h-3 w-3 text-amber-400" />
                Live Burn-Rate Velocity
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Day {velocity.currentDay} of {velocity.daysInMonth} ({velocity.daysRemaining} days left)
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{formatCurrency(velocity.dailyVelocity)}</span>
              <span className="text-xs font-normal text-slate-400">avg spent / day</span>
            </h3>
            <p className="text-xs text-slate-300">
              {velocity.isOverBudget ? (
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Budget exhausted! Every further expense directly depletes your monthly net savings.
                </span>
              ) : velocity.willOverrun ? (
                <span className="text-amber-300 font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  At your current pace of {formatCurrency(velocity.dailyVelocity)}/day, you will exceed your budget on the {velocity.exhaustionDay}th by {formatCurrency(velocity.overrunAmount)}.
                </span>
              ) : (
                <span className="text-emerald-300 font-semibold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Pacing safely! Current velocity keeps you within your {formatCurrency(totalBudget)} ceiling.
                </span>
              )}
            </p>
          </div>

          {/* Safe-to-Spend Gauge Box */}
          <div className="bg-white/10 dark:bg-slate-800/80 backdrop-blur-xs p-4 rounded-xl border border-white/10 min-w-[200px] text-center">
            <p className="text-[10px] font-bold tracking-wider uppercase text-indigo-200">
              Safe-to-Spend Allowance
            </p>
            <p className="text-2xl font-black text-emerald-400">
              {formatCurrency(velocity.safeDailySpend)}
              <span className="text-xs font-normal text-slate-300"> / day</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              for remaining {velocity.daysRemaining} days
            </p>
          </div>
        </div>
      </div>

      {/* 2. 50/30/20 Envelope Rule Allocation Breakdown */}
      <div className="card p-5 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                50 / 30 / 20 Rule Allocation Framework
              </h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Balanced wealth allocation based on monthly inflow of {formatCurrency(monthlyIncome)}
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
            Total Spent: {formatCurrency(envelopes.totalSpent)}
          </span>
        </div>

        {/* 3 Envelopes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Needs: 50% */}
          <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 dark:text-blue-300">
                Needs (50% Target)
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                {envelopes.actualPercentages.needs}% / 50%
              </span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-gray-500 dark:text-slate-400">Spent:</span>
              <span className="font-extrabold text-gray-900 dark:text-white">
                {formatCurrency(envelopes.envelopes.needs.spent)}
              </span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-900/50 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  envelopes.actualPercentages.needs > 50 ? 'bg-rose-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(envelopes.actualPercentages.needs * 2, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
              Rent, Groceries, Utilities, Bills, Fuel
            </p>
          </div>

          {/* Wants: 30% */}
          <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                Wants (30% Target)
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                {envelopes.actualPercentages.wants}% / 30%
              </span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-gray-500 dark:text-slate-400">Spent:</span>
              <span className="font-extrabold text-gray-900 dark:text-white">
                {formatCurrency(envelopes.envelopes.wants.spent)}
              </span>
            </div>
            <div className="w-full bg-amber-200 dark:bg-amber-900/50 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  envelopes.actualPercentages.wants > 30 ? 'bg-rose-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min((envelopes.actualPercentages.wants / 30) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
              Dining, Shopping, Movies, Travel, Subscriptions
            </p>
          </div>

          {/* Savings: 20% */}
          <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Savings / SIPs (20% Target)
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                {envelopes.actualPercentages.savings}% / 20%
              </span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-gray-500 dark:text-slate-400">Target:</span>
              <span className="font-extrabold text-gray-900 dark:text-white">
                {formatCurrency(envelopes.envelopes.savings.target)}
              </span>
            </div>
            <div className="w-full bg-emerald-200 dark:bg-emerald-900/50 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((envelopes.actualPercentages.savings / 20) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
              SIPs, Mutual Funds, Emergency Fund, PPF
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
