import { useMemo } from 'react'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import {
  ShieldCheck,
  Award,
  TrendingUp,
  Target,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

export function calculateFinancialHealthScore({
  monthlyIncome = 85000,
  monthlyExpenses = 38000,
  liquidAssets = 112000,
  totalDebts = 0,
  monthlyInvestments = 25000,
  goalsCount = 3,
}) {
  // 1. Savings & Investment Rate (Max 25 pts)
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0
  let savingsScore = 0
  let savingsFeedback = ''
  if (savingsRate >= 40) {
    savingsScore = 25
    savingsFeedback = `Outstanding savings rate of ${savingsRate.toFixed(0)}%! (Benchmark: >30%)`
  } else if (savingsRate >= 25) {
    savingsScore = 20
    savingsFeedback = `Good savings rate of ${savingsRate.toFixed(0)}%. Try stepping it up to 35%.`
  } else if (savingsRate >= 10) {
    savingsScore = 12
    savingsFeedback = `Moderate savings rate of ${savingsRate.toFixed(0)}%. Reduce discretionary spending.`
  } else {
    savingsScore = 5
    savingsFeedback = `Low savings rate (${savingsRate.toFixed(0)}%). Prioritize cutting non-essential expenses.`
  }

  // 2. Emergency Fund Coverage (Max 25 pts)
  const emergencyMonths = monthlyExpenses > 0 ? liquidAssets / monthlyExpenses : 0
  let emergencyScore = 0
  let emergencyFeedback = ''
  if (emergencyMonths >= 6) {
    emergencyScore = 25
    emergencyFeedback = `Excellent emergency cushion: ${emergencyMonths.toFixed(1)} months of living expenses liquid.`
  } else if (emergencyMonths >= 3) {
    emergencyScore = 20
    emergencyFeedback = `Healthy cushion: ${emergencyMonths.toFixed(1)} months covered. Target is 6 months.`
  } else if (emergencyMonths >= 1) {
    emergencyScore = 10
    emergencyFeedback = `Partial buffer: ${emergencyMonths.toFixed(1)} months. Build emergency fund to at least 3 months.`
  } else {
    emergencyScore = 4
    emergencyFeedback = `Vulnerable emergency reserve (< 1 month). Prioritize liquid savings.`
  }

  // 3. Debt Burden Ratio (Max 25 pts)
  const debtRatio = monthlyIncome > 0 ? (totalDebts / (monthlyIncome * 12)) * 100 : 0
  let debtScore = 0
  let debtFeedback = ''
  if (totalDebts === 0) {
    debtScore = 25
    debtFeedback = '100% Debt-Free! Zero liability burden.'
  } else if (debtRatio <= 20) {
    debtScore = 22
    debtFeedback = `Manageable debt load (${debtRatio.toFixed(0)}% of annual income).`
  } else if (debtRatio <= 40) {
    debtScore = 14
    debtFeedback = `Moderate debt burden (${debtRatio.toFixed(0)}%). Consider prepayment strategies.`
  } else {
    debtScore = 6
    debtFeedback = `High debt load (${debtRatio.toFixed(0)}%). Focus on paying off high-interest loans.`
  }

  // 4. Goal & Wealth Compounding Discipline (Max 25 pts)
  let goalScore = 0
  let goalFeedback = ''
  if (monthlyInvestments >= 20000 && goalsCount >= 2) {
    goalScore = 25
    goalFeedback = `Active SIP discipline (${formatCurrency(monthlyInvestments)}/mo) across ${goalsCount} financial goals.`
  } else if (monthlyInvestments > 5000) {
    goalScore = 18
    goalFeedback = `Regular investment habit (${formatCurrency(monthlyInvestments)}/mo). Add dedicated milestone goals.`
  } else {
    goalScore = 8
    goalFeedback = 'Low investment compounding. Setup an automated monthly SIP.'
  }

  const totalScore = Math.min(Math.max(savingsScore + emergencyScore + debtScore + goalScore, 0), 100)

  let grade = 'Excellent'
  let gradeColor = 'text-emerald-500'
  let gradeBg = 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
  if (totalScore < 50) {
    grade = 'Needs Attention'
    gradeColor = 'text-rose-500'
    gradeBg = 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800'
  } else if (totalScore < 75) {
    grade = 'Good'
    gradeColor = 'text-amber-500'
    gradeBg = 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800'
  }

  return {
    totalScore,
    grade,
    gradeColor,
    gradeBg,
    pillars: [
      { name: 'Savings Rate', score: savingsScore, max: 25, feedback: savingsFeedback, icon: TrendingUp },
      { name: 'Emergency Reserve', score: emergencyScore, max: 25, feedback: emergencyFeedback, icon: ShieldCheck },
      { name: 'Debt Freedom', score: debtScore, max: 25, feedback: debtFeedback, icon: CreditCard },
      { name: 'Goal Compounding', score: goalScore, max: 25, feedback: goalFeedback, icon: Target },
    ],
  }
}

export default function FinancialHealthScoreModal({ isOpen, onClose, metrics, isEmbedded = false }) {
  const result = useMemo(() => {
    return calculateFinancialHealthScore(metrics || {})
  }, [metrics])

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} isEmbedded={isEmbedded} onClose={onClose} title="Financial Health & Wealth Score" maxWidth="max-w-2xl">
      <div className="space-y-6 text-xs text-gray-700 dark:text-slate-300">
        {/* Score Header Banner */}
        <div className={`p-6 rounded-2xl border ${result.gradeBg} flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs`}>
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall Financial Fitness</span>
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <h3 className={`text-4xl font-black ${result.gradeColor}`}>{result.totalScore}/100</h3>
              <span className={`text-xs font-bold px-3 py-1 rounded-full bg-white dark:bg-slate-900 border ${result.gradeColor}`}>
                {result.grade}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-400">
              Evaluated across 4 key pillars: Savings, Emergency Buffer, Debt Load & SIP Habits.
            </p>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-gray-200 dark:border-slate-700 flex items-center justify-center">
              <Award className={`h-10 w-10 ${result.gradeColor}`} />
            </div>
          </div>
        </div>

        {/* 4 Pillars Breakdown */}
        <div className="space-y-3">
          <h4 className="font-bold text-sm text-gray-900 dark:text-white">Pillar-by-Pillar Breakdown</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.pillars.map((p, idx) => {
              const Icon = p.icon
              const pct = (p.score / p.max) * 100
              return (
                <div key={idx} className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <strong className="text-xs font-bold text-gray-900 dark:text-white">{p.name}</strong>
                    </div>
                    <span className="text-xs font-black text-gray-900 dark:text-white">
                      {p.score}/{p.max}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${
                        pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-tight">
                    {p.feedback}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actionable Tips */}
        <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 space-y-2">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Top Recommendation to Reach 95+</span>
          </div>
          <p className="text-xs text-blue-900/80 dark:text-blue-200">
            Increase your monthly SIP investments by 10% annually and maintain a dedicated 6-month liquid emergency fund in a high-yield liquid mutual fund or sweep-in FD.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn-primary text-xs px-5 py-2">
            Got It
          </button>
        </div>
      </div>
    </Modal>
  )
}
