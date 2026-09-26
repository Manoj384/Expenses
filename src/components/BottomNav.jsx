import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  LineChart,
  History,
  TrendingUp,
  CreditCard,
  BarChart2,
  MoreHorizontal,
  Landmark,
  Target,
  Zap,
  FileSpreadsheet,
  Sparkles,
  X,
} from 'lucide-react'

const primaryNavItems = [
  { to: '/',             label: 'Home',        icon: LayoutDashboard },
  { to: '/transactions', label: 'Txns',        icon: ArrowLeftRight },
  { to: '/statements',   label: 'Statements',  icon: FileSpreadsheet, isAi: true },
]

const moreMenuItems = [
  { to: '/statements',    label: 'Statements & Bill OCR', desc: 'AI multi-transaction extractor', icon: FileSpreadsheet, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50' },
  { to: '/mutual-funds',  label: 'Mutual Funds',          desc: 'Portfolio & returns tracking',   icon: LineChart, color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50' },
  { to: '/sips',          label: 'SIPs Tracker',          desc: 'Monthly schedules & due dates',  icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50' },
  { to: '/debts',         label: 'Debts & EMIs',          desc: 'Payoff tracker & liabilities',   icon: CreditCard, color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50' },
  { to: '/net-worth',     label: 'Net Worth',             desc: 'Total assets & liabilities',     icon: Landmark, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50' },
  { to: '/goals',         label: 'Wealth Goals',          desc: 'Target milestone tracking',      icon: Target, color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50' },
  { to: '/budgets',       label: 'Budget Caps',           desc: 'Category spend limits',          icon: Zap, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50' },
  { to: '/past-expenses', label: 'Past Expenses',         desc: '385+ historical records',        icon: History, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50' },
  { to: '/reports',       label: 'Reports & Visuals',     desc: 'Charts & spending analytics',    icon: BarChart2, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50' },
]

export default function BottomNav({ onOpenAi }) {
  const [showMoreSheet, setShowMoreSheet] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      {/* Mobile More Actions Bottom Sheet */}
      {showMoreSheet && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setShowMoreSheet(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-gray-100 dark:border-slate-800 p-5 pb-8 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                All Navigation & Tools
              </span>
              <button
                onClick={() => setShowMoreSheet(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Ask AI Highlight Banner inside Sheet */}
            <button
              onClick={() => {
                setShowMoreSheet(false)
                if (onOpenAi) onOpenAi()
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 text-left transition-transform active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md">
                  <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Ask AI Financial Advisor
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 font-semibold">Gemini</span>
                  </h4>
                  <p className="text-[11px] text-white/80">
                    Live wealth recommendations & portfolio insights
                  </p>
                </div>
              </div>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {moreMenuItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.to}
                    onClick={() => {
                      setShowMoreSheet(false)
                      navigate(item.to)
                    }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {item.label}
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Nav Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 z-40 safe-area-bottom shadow-lg transition-colors duration-200"
        aria-label="Bottom navigation"
      >
        <div className="flex items-center justify-around px-1 py-1.5">
          {/* Home */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[10px] font-semibold transition-all ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            <LayoutDashboard className="h-5 w-5 mb-0.5" />
            <span>Home</span>
          </NavLink>

          {/* Transactions */}
          <NavLink
            to="/transactions"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[10px] font-semibold transition-all ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            <ArrowLeftRight className="h-5 w-5 mb-0.5" />
            <span>Txns</span>
          </NavLink>

          {/* Statements (AI) */}
          <NavLink
            to="/statements"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[10px] font-semibold transition-all relative ${
                isActive
                  ? 'text-rose-600 dark:text-rose-400 font-bold scale-105'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            <div className="relative">
              <FileSpreadsheet className="h-5 w-5 mb-0.5" />
              <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[8px] font-extrabold rounded-full scale-90">
                AI
              </span>
            </div>
            <span>Statements</span>
          </NavLink>

          {/* Ask AI Copilot Button (Direct trigger) */}
          <button
            onClick={() => onOpenAi && onOpenAi()}
            className="flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 active:scale-95 transition-transform"
          >
            <div className="p-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs">
              <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
            </div>
            <span className="font-bold text-[9px] mt-0.5 text-indigo-600 dark:text-indigo-300">Ask AI</span>
          </button>

          {/* More trigger */}
          <button
            onClick={() => setShowMoreSheet(true)}
            className="flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[10px] font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
          >
            <MoreHorizontal className="h-5 w-5 mb-0.5" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
