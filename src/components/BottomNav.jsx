import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  LineChart,
  CreditCard,
  BellRing,
} from 'lucide-react'

export default function BottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 z-40 safe-area-bottom shadow-lg transition-colors duration-200"
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around px-2 py-1.5">
        {/* 1. Home */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition-all ${
              isActive
                ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`
          }
        >
          <LayoutDashboard className="h-5 w-5 mb-0.5" />
          <span>Home</span>
        </NavLink>

        {/* 2. Transactions */}
        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition-all ${
              isActive
                ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`
          }
        >
          <ArrowLeftRight className="h-5 w-5 mb-0.5" />
          <span>Txns</span>
        </NavLink>

        {/* 3. Mutual Funds */}
        <NavLink
          to="/mutual-funds"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition-all ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`
          }
        >
          <LineChart className="h-5 w-5 mb-0.5" />
          <span className="truncate max-w-[65px]">Mutual Funds</span>
        </NavLink>

        {/* 4. Debts & EMI */}
        <NavLink
          to="/debts"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition-all ${
              isActive
                ? 'text-rose-600 dark:text-rose-400 font-bold scale-105'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`
          }
        >
          <CreditCard className="h-5 w-5 mb-0.5" />
          <span className="truncate max-w-[65px]">Debts & EMI</span>
        </NavLink>

        {/* 5. Reminders & Calendar */}
        <NavLink
          to="/reminders"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition-all ${
              isActive
                ? 'text-amber-600 dark:text-amber-400 font-bold scale-105'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`
          }
        >
          <BellRing className="h-5 w-5 mb-0.5" />
          <span className="truncate max-w-[65px]">Reminders</span>
        </NavLink>
      </div>
    </nav>
  )
}
