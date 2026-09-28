import { useState } from 'react'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import {
  Share2,
  Printer,
  CheckCircle2,
  Wallet,
  TrendingUp,
  Award,
  Sparkles,
  PieChart as PieIcon,
  Copy,
  Check,
} from 'lucide-react'

export default function ShareableMonthlyReportModal({
  isOpen,
  onClose,
  month = 'September 2026',
  income = 85000,
  expense = 38000,
  mfValue = 112341,
  mfGain = 16341,
  debtsTotal = 0,
  healthScore = 88,
  topCategories = [
    { name: 'Food & Dining', amount: 12400 },
    { name: 'Shopping & Groceries', amount: 9500 },
    { name: 'Utilities & Bills', amount: 4800 },
  ],
}) {
  const [copied, setCopied] = useState(false)
  const savings = income - expense
  const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(0) : 0

  if (!isOpen) return null

  const handleCopySummary = () => {
    const summaryText = `📊 *My Financial Summary — ${month}*
💰 Total Income: ${formatCurrency(income)}
📉 Total Expenses: ${formatCurrency(expense)}
🌱 Net Savings: ${formatCurrency(savings)} (${savingsRate}% Savings Rate)
📈 Mutual Funds: ${formatCurrency(mfValue)} (+${formatCurrency(mfGain)} Profit)
💳 Debt Burden: ${debtsTotal === 0 ? 'Zero Debt (100% Free!)' : formatCurrency(debtsTotal)}
🏆 Financial Fitness Score: ${healthScore}/100

Generated via Finance Tracker (Personal Wealth Cockpit)`

    navigator.clipboard.writeText(summaryText)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Executive Monthly Wealth Report" maxWidth="max-w-2xl">
      <div className="space-y-5 text-xs text-gray-700 dark:text-slate-300">
        {/* Printable Branded Card Container */}
        <div id="printable-monthly-report" className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl space-y-5 border border-indigo-500/20">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 rounded-xl p-2 shadow-sm">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-base tracking-tight text-white">Finance Tracker</h3>
                <p className="text-[11px] text-blue-200">Monthly Wealth & Performance Executive Report</p>
              </div>
            </div>
            <span className="bg-blue-500/20 text-blue-300 text-xs px-3 py-1 rounded-full font-bold">
              {month}
            </span>
          </div>

          {/* Core KPI Matrix */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 space-y-1">
              <span className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold block">Monthly Inflow</span>
              <h4 className="text-base sm:text-lg font-black text-emerald-400">+{formatCurrency(income)}</h4>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 space-y-1">
              <span className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold block">Monthly Outflow</span>
              <h4 className="text-base sm:text-lg font-black text-rose-400">-{formatCurrency(expense)}</h4>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 space-y-1">
              <span className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold block">Savings Rate</span>
              <h4 className="text-base sm:text-lg font-black text-amber-300">{savingsRate}%</h4>
            </div>
          </div>

          {/* Net Wealth & Compounding */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                <TrendingUp className="h-4 w-4" />
                <span>Mutual Funds Portfolio</span>
              </div>
              <p className="text-xl font-black text-white">{formatCurrency(mfValue)}</p>
              <span className="text-[10px] text-emerald-300">+{formatCurrency(mfGain)} Total Cumulative Gain</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-blue-300 font-bold">
                <Award className="h-4 w-4 text-amber-300" />
                <span>Financial Health Score</span>
              </div>
              <p className="text-xl font-black text-white">{healthScore}/100</p>
              <span className="text-[10px] text-amber-300">Status: Excellent (Pillar 4 Certified)</span>
            </div>
          </div>

          {/* Top Spending Categories */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Top Expenditure Drivers
            </span>
            <div className="grid grid-cols-3 gap-2">
              {topCategories.slice(0, 3).map((cat, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                  <span className="text-[10px] text-slate-300 block truncate">{cat.name}</span>
                  <strong className="text-xs font-bold text-white block mt-0.5">{formatCurrency(cat.amount)}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Footer stamp */}
          <div className="pt-2 border-t border-white/10 flex justify-between text-[10px] text-slate-400">
            <span>Verified Private Financial Report</span>
            <span>Generated: {new Date().toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex gap-2">
            <button
              onClick={handleCopySummary}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-blue-600" />}
              <span>{copied ? 'Copied Summary!' : 'Copy Text for WhatsApp'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4 text-indigo-600" />
              <span>Print / Save PDF</span>
            </button>
          </div>

          <button onClick={onClose} className="btn-primary text-xs py-2 px-5">
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
