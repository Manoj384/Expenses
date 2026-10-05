import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  LineChart,
  History,
  TrendingUp,
  CreditCard,
  BarChart2,
  LogOut,
  Wallet,
  ShieldCheck,
  Shield,
  Lock,
  Unlock,
  Landmark,
  Target,
  Zap,
  FileSpreadsheet,
  Users,
  Calendar,
  BellRing,
  Sun,
  Moon,
  Monitor,
  Smartphone,
  Bot,
  Database,
  Search,
  HelpCircle,
  Compass,
  X,
  Fingerprint,
  Calculator,
  ShieldAlert,
  Mic,
  SunMedium,
  CalendarDays,
  Award,
  Flame,
  Skull,
  Radio,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAdmin } from '../context/AdminContext'
import { useTheme } from '../context/ThemeContext'
import { useDesktopMode } from '../context/DesktopModeContext'
import { useToast } from '../context/ToastContext'
import AdminLockModal from './AdminLockModal'

const navItems = [
  { to: '/',              label: 'Dashboard',             icon: LayoutDashboard },
  { to: '/transactions',  label: 'Transactions',          icon: ArrowLeftRight },
  { to: '/reminders',     label: 'Reminders & Calendar',  icon: BellRing },
  { to: '/splitwise',     label: 'Splitwise & Groups',    icon: Users },
  { to: '/mutual-funds',  label: 'Mutual Funds',          icon: LineChart },
  { to: '/net-worth',     label: 'Net Worth',             icon: Landmark },
  { to: '/goals',         label: 'Goals',                 icon: Target },
  { to: '/budgets',       label: 'Budgets & Alerts',      icon: Zap },
  { to: '/sips',          label: 'SIPs',                  icon: TrendingUp },
  { to: '/debts',         label: 'Debts',                 icon: CreditCard },
  { to: '/bills',         label: 'Bill Reminders',        icon: Calendar },
  { to: '/statements',    label: 'Statements (OCR)',      icon: FileSpreadsheet },
  { to: '/reports',       label: 'Reports & Visuals',     icon: BarChart2 },
  { to: '/past-expenses', label: 'Past Expenses',         icon: History },
  { to: '/emc',           label: 'EMC Standards (ISO/CISPR)', icon: Radio },
]

export default function Sidebar({
  isOpen = false,
  onClose = () => {},
  onOpenAdmin,
  onOpenBackup,
  onOpenShortcuts,
  onOpenOnboarding,
  onOpenBot,
  onOpenCalendar,
  onOpenTaxPlanner,
  onOpenCardOptimizer,
  onOpenSentinel,
  onOpenAutoPilot,
  onOpenVoice,
  onLockApp,
}) {
  const { user, logout } = useAuth()
  const { isAdmin } = useAdmin()
  const { isDark, toggleTheme } = useTheme()
  const { isDesktopSite, toggleDesktopSite } = useDesktopMode()
  const toast = useToast()
  const [showAdminModal, setShowAdminModal] = useState(false)

  const handleLogout = async () => {
    try {
      if (onClose) onClose()
      await logout()
    } catch {}
  }

  const handleLinkClick = () => {
    if (onClose) onClose()
  }

  const handleToggleDesktop = () => {
    toggleDesktopSite()
    if (!isDesktopSite) {
      toast.info('Desktop Site View enabled (1280px layout)')
    } else {
      toast.info('Mobile Responsive View restored')
    }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-y-auto">
      {/* Header / Logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 rounded-xl p-2 shadow-sm shadow-blue-200 dark:shadow-none">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">Finance Tracker</h1>
            <p className="text-[11px] text-gray-400">Personal Wealth & AI</p>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="md:hidden p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close Sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1">
        <div className="px-3 pb-1 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">Navigation</span>
        </div>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 shadow-2xs font-semibold'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}

        {/* Quick Tools & Utilities Hub - Consolidated into 2 Master Hubs */}
        <div className="pt-3 pb-1 px-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">Super Hubs & Tools</span>
        </div>

        <div className="space-y-1.5">
          {/* 1. Unified AI Financial Copilot (Renders in Right Main Window) */}
          <NavLink
            to="/ai-copilot"
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left shadow-2xs group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 font-bold'
                  : 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800'
              }`
            }
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold truncate">AI Financial Copilot</p>
                <p className="text-[10px] font-normal opacity-85 truncate">Voice • Digest • Float • Sentinel</p>
              </div>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 font-bold flex-shrink-0">
              AI Hub
            </span>
          </NavLink>

          {/* 2. Unified Financial Planning & Toolkit Suite (Renders in Right Main Window) */}
          <NavLink
            to="/financial-planning"
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left shadow-2xs group ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 font-bold'
                  : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800'
              }`
            }
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                <Calculator className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold truncate">Financial Planning Suite</p>
                <p className="text-[10px] font-normal opacity-85 truncate">Forecast • Tax • FIRE • Health</p>
              </div>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold flex-shrink-0">
              Toolkit
            </span>
          </NavLink>

          {/* System & Preferences */}
          <div className="pt-2 pb-0.5 px-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">System & Controls</span>
          </div>

          {/* JSON Data Backup */}
          <button
            onClick={() => {
              if (onClose) onClose()
              if (onOpenBackup) onOpenBackup()
            }}
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Database className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>1-Click Backup</span>
            </div>
          </button>

          {/* Biometric / Screen Lock */}
          <button
            onClick={() => {
              if (onClose) onClose()
              if (onLockApp) onLockApp()
              else window.dispatchEvent(new CustomEvent('open-app-lock'))
            }}
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Fingerprint className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Lock App Screen</span>
            </div>
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
              <span>{isDark ? 'Light Theme' : 'Dark Theme'}</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">{isDark ? 'Dark' : 'Light'}</span>
          </button>

          {/* Desktop Site Mode Toggle */}
          <button
            onClick={handleToggleDesktop}
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              {isDesktopSite ? <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" /> : <Monitor className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
              <span>{isDesktopSite ? 'Switch to Mobile View' : 'Switch to Desktop Site'}</span>
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isDesktopSite ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}>
              {isDesktopSite ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Guided Setup Tour */}
          <button
            onClick={() => {
              if (onClose) onClose()
              if (onOpenOnboarding) onOpenOnboarding()
            }}
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Compass className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Guided Setup Tour</span>
            </div>
          </button>

          {/* Keyboard Shortcuts */}
          <button
            onClick={() => {
              if (onClose) onClose()
              if (onOpenShortcuts) onOpenShortcuts()
            }}
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="h-4 w-4 text-gray-500 dark:text-slate-400" />
              <span>Keyboard Shortcuts</span>
            </div>
            <kbd className="text-[9px] font-mono bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-700 text-gray-500">
              Shift+?
            </kbd>
          </button>

          {/* Quick Search Ctrl+K */}
          <button
            onClick={() => {
              if (onClose) onClose()
              window.dispatchEvent(new CustomEvent('open-command-palette'))
            }}
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Search className="h-4 w-4 text-gray-400" />
              <span>Search & Commands</span>
            </div>
            <kbd className="text-[9px] font-mono bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-700 text-gray-500">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </nav>

      {/* Admin Mode Box */}
      <div className="px-3 py-2.5 border-t border-gray-100 dark:border-slate-800">
        <div className={`p-2.5 rounded-xl border ${isAdmin ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-700' : 'bg-gray-50 border-gray-200 dark:bg-slate-800 dark:border-slate-700'}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              {isAdmin ? (
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              ) : (
                <Shield className="h-3.5 w-3.5 text-gray-400" />
              )}
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                {isAdmin ? 'Admin Mode: ON' : 'Admin Mode: OFF'}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 mb-2 leading-tight">
            {isAdmin ? 'Category & Payment config unlocked' : 'Unlock to edit categories & payment methods'}
          </p>
          <button
            onClick={() => {
              if (onOpenAdmin) onOpenAdmin()
              else setShowAdminModal(true)
            }}
            className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              isAdmin
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600'
            }`}
          >
            {isAdmin ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            {isAdmin ? 'Lock Admin' : 'Enter Admin PIN'}
          </button>
        </div>
      </div>

      {/* User + Logout */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-slate-800">
        <div className="px-2 py-1 mb-1">
          <p className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-100 dark:border-slate-800 min-h-screen transition-colors duration-200 flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer with Backdrop Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={onClose}
          />
          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs h-full z-10 shadow-2xl border-r border-gray-200 dark:border-slate-800 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      <AdminLockModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />
    </>
  )
}
