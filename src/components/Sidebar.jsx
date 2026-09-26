import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  CreditCard,
  BarChart2,
  LogOut,
  Wallet,
  ShieldCheck,
  Shield,
  Lock,
  Unlock,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAdmin } from '../context/AdminContext'
import AdminLockModal from './AdminLockModal'

const navItems = [
  { to: '/',             label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/sips',         label: 'SIPs',         icon: TrendingUp },
  { to: '/debts',        label: 'Debts',        icon: CreditCard },
  { to: '/reports',      label: 'Reports & Visuals', icon: BarChart2 },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { isAdmin, exitAdmin } = useAdmin()
  const [showAdminModal, setShowAdminModal] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
    } catch {}
  }

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 min-h-screen">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="bg-blue-600 rounded-xl p-2 shadow-sm shadow-blue-200">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-sm leading-tight">Finance Tracker</h1>
            <p className="text-xs text-gray-400">Personal Wealth</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-50'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-4.5 w-4.5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Admin Mode Quick Access Box */}
        <div className="px-3 py-3 border-t border-gray-100">
          <div className={`p-3 rounded-xl border ${isAdmin ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                {isAdmin ? (
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                ) : (
                  <Shield className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-xs font-semibold text-gray-800">
                  {isAdmin ? 'Admin Mode: ON' : 'Admin Mode: OFF'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mb-2 leading-tight">
              {isAdmin ? 'Category & Payment config unlocked' : 'Unlock to edit categories & payment methods'}
            </p>
            <button
              onClick={() => setShowAdminModal(true)}
              className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                isAdmin
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
              }`}
            >
              {isAdmin ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              {isAdmin ? 'Lock Admin' : 'Enter Admin PIN'}
            </button>
          </div>
        </div>

        {/* User + Logout */}
        <div className="px-3 py-3 border-t border-gray-100">
          <div className="px-3 py-1.5 mb-1">
            <p className="text-xs font-medium text-gray-700 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      <AdminLockModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />
    </>
  )
}
