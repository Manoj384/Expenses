import { useMemo } from 'react'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import {
  Flame,
  Award,
  ShieldCheck,
  TrendingUp,
  Target,
  Sparkles,
  Zap,
  CheckCircle2,
  Lock,
  Share2,
} from 'lucide-react'

export function calculateGamificationBadges({
  budgetStreak = 5,
  emergencyMonths = 4.2,
  hasActiveSip = true,
  goalsAchieved = 1,
  totalDebt = 0,
  netWorth = 250000,
}) {
  const badges = [
    {
      id: 'streak_7',
      name: '🔥 Budget Master',
      desc: 'Maintained 5+ consecutive days under daily budget limit',
      unlocked: budgetStreak >= 5,
      level: 'Silver',
      icon: Flame,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800',
    },
    {
      id: 'emergency_cushion',
      name: '🛡️ Emergency Fortress',
      desc: 'Maintained 3+ months of living expenses in liquid reserves',
      unlocked: emergencyMonths >= 3,
      level: 'Gold',
      icon: ShieldCheck,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800',
    },
    {
      id: 'sip_disciplined',
      name: '📈 SIP Wealth Veteran',
      desc: 'Consistent monthly automated mutual fund investment habit',
      unlocked: hasActiveSip,
      level: 'Diamond',
      icon: TrendingUp,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800',
    },
    {
      id: 'debt_free',
      name: '💳 Debt Slayer',
      desc: 'Zero outstanding loan liabilities and total credit freedom',
      unlocked: totalDebt === 0,
      level: 'Platinum',
      icon: Award,
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-800',
    },
    {
      id: 'goal_achiever',
      name: '🎯 Goal Milestone Crusher',
      desc: 'Successfully funded financial milestone goals',
      unlocked: goalsAchieved >= 1,
      level: 'Gold',
      icon: Target,
      color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800',
    },
    {
      id: 'networth_positive',
      name: '🚀 Net Worth Sovereign',
      desc: 'Reached positive asset valuation exceeding ₹1,00,000',
      unlocked: netWorth >= 100000,
      level: 'Legendary',
      icon: Sparkles,
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800',
    },
  ]

  const unlockedCount = badges.filter(b => b.unlocked).length
  const userLevel = unlockedCount >= 5 ? 'Level 5 • Financial Sovereign' : unlockedCount >= 3 ? 'Level 3 • Wealth Builder' : 'Level 2 • Budget Disciplinarian'

  return { badges, unlockedCount, userLevel, budgetStreak }
}

export default function SpendingStreakModal({ isOpen, onClose, data }) {
  const stats = useMemo(() => {
    return calculateGamificationBadges(data || {})
  }, [data])

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Habit Streaks & Financial Achievements" maxWidth="max-w-2xl">
      <div className="space-y-6 text-xs text-gray-700 dark:text-slate-300">
        {/* Streak Hero Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <span className="bg-white/20 text-white text-[11px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-200" />
              Daily Budget Habit
            </span>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Flame className="h-8 w-8 text-amber-200 animate-bounce" />
              <h3 className="text-3xl font-black">{stats.budgetStreak}-Day Streak!</h3>
            </div>
            <p className="text-xs text-orange-100">
              You've stayed under your daily budget limit for {stats.budgetStreak} consecutive days. Keep the momentum going!
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20 text-center min-w-[140px]">
            <span className="text-[10px] text-orange-200 uppercase font-bold block">Current Rank</span>
            <strong className="text-sm font-black block text-white mt-0.5">{stats.userLevel}</strong>
            <span className="text-[10px] text-amber-200">{stats.unlockedCount} of {stats.badges.length} Badges</span>
          </div>
        </div>

        {/* Milestone Badges Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Milestone Achievement Badges</h4>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.unlockedCount} Unlocked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.badges.map(b => {
              const Icon = b.icon
              return (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                    b.unlocked
                      ? `${b.color} shadow-xs`
                      : 'bg-gray-50/70 dark:bg-slate-850 border-gray-200 dark:border-slate-800 opacity-50'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 shadow-xs flex-shrink-0">
                    {b.unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-5 w-5 text-gray-400" />}
                  </div>

                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-bold truncate">{b.name}</strong>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-white dark:bg-slate-900">
                        {b.level}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-80 leading-tight">{b.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn-primary text-xs px-5 py-2">
            Awesome!
          </button>
        </div>
      </div>
    </Modal>
  )
}
