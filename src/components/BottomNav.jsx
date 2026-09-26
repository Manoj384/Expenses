import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
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
  X,
} from 'lucide-react'

const primaryNavItems = [
  { to: '/',             label: 'Home',  icon: LayoutDashboard },
  { to: '/transactions', label: 'Txns',  icon: ArrowLeftRight },
  { to: '/mutual-funds', label: 'MFs',   icon: LineChart },
  { to: '/sips',         label: 'SIPs',  icon: TrendingUp },
  { to: '/debts',        label: 'Debts', icon: CreditCard },
]

const moreMenuItems = [
  { to: '/net-worth',     label: 'Net Worth',     desc: 'Total assets & liabilities', icon: Landmark, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50' },
  { to: '/goals',         label: 'Wealth Goals',  desc: 'Target milestone tracking',  icon: Target, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50' },
  { to: '/budgets',       label: 'Budget Caps',   desc: 'Category spend limits',      icon: Zap, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50' },
  { to: '/past-expenses', label: 'Past Expenses', desc: '385+ historical records',    icon: History, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50' },
  { to: '/reports',       label: 'Reports',       desc: 'Visual analytics & charts',  icon: BarChart2, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50' },
]

export default function BottomNav() {
  const [showMoreSheet, setShowMoreSheet] = useState(false)
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()

  return (
    <>
      {/* Mobile More Actions Bottom Sheet */}
      {showMoreSheet && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setShowMoreSheet(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-gray-100 dark:border-slate-800 p-5 pb-8 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                More Features & Tools
              </span>
              <button
                onClick={() => setShowMoreSheet(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
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
                    <div className={`p-2.5 rounded-xl ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                        {item.label}
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
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
          {primaryNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition-all ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 mb-0.5" />
              <span>{label}</span>
            </NavLink>
          ))}

          {/* More trigger */}
          <button
            onClick={() => setShowMoreSheet(true)}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
          >
            <MoreHorizontal className="h-5 w-5 mb-0.5" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
