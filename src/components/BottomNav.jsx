import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  LineChart,
  History,
  TrendingUp,
  CreditCard,
  BarChart2,
} from 'lucide-react'

const navItems = [
  { to: '/',              label: 'Home',         icon: LayoutDashboard },
  { to: '/transactions',  label: 'Txns',         icon: ArrowLeftRight },
  { to: '/mutual-funds',  label: 'MFs',          icon: LineChart },
  { to: '/past-expenses', label: 'Past',         icon: History },
  { to: '/reports',       label: 'Reports',      icon: BarChart2 },
]

export default function BottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom shadow-lg"
      aria-label="Bottom navigation"
    >
      <div className="flex">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-2 gap-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <Icon className="h-4.5 w-4.5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
