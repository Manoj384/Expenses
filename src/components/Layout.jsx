import { useState } from 'react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import AdminLockModal from './AdminLockModal'
import NetworkStatusIndicator from './NetworkStatusIndicator'
import CommandPalette from './CommandPalette'
import DataBackupModal from './DataBackupModal'
import NotificationCenter from './NotificationCenter'
import AiFinancialAdvisorModal from './AiFinancialAdvisorModal'
import { useAdmin } from '../context/AdminContext'
import { useTheme } from '../context/ThemeContext'
import { ShieldCheck, Shield, Database, Search, Moon, Sun, Sparkles } from 'lucide-react'

export default function Layout({ children, title }) {
  const { isAdmin } = useAdmin()
  const { isDark, toggleTheme } = useTheme()
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-3 md:px-6 py-2.5 md:py-3 sticky top-0 z-30 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">{title}</h1>
            <NetworkStatusIndicator />
          </div>

          {/* Header Action Badges */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            {/* Ask AI Copilot Header Trigger */}
            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xs shadow-indigo-500/20 transition-all scale-100 hover:scale-[1.02] active:scale-95 flex-shrink-0"
              title="Ask AI Financial Advisor & Wealth Copilot"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
              <span>Ask AI</span>
            </button>

            {/* Notification Center Bell & Due Date Alerts */}
            <NotificationCenter />

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-xl text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 border border-gray-200 dark:border-slate-700 transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>

            {/* Quick Command Palette Launcher */}
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
                window.dispatchEvent(event)
              }}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-500 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 border border-gray-200 dark:border-slate-700 transition-colors"
              title="Search and Run commands (Ctrl + K)"
            >
              <Search className="h-3.5 w-3.5 text-gray-400" />
              <span>Quick Search</span>
              <kbd className="text-[10px] font-mono bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600 text-gray-500">
                Ctrl+K
              </kbd>
            </button>

            {/* Data Backup & Export Button */}
            <button
              onClick={() => setShowBackupModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 dark:bg-slate-800 dark:text-indigo-300 dark:border-slate-700 transition-all"
              title="1-Click JSON Backup & Disaster Recovery"
            >
              <Database className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Backup</span>
            </button>

            {/* Admin status badge */}
            <button
              onClick={() => setShowAdminModal(true)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                isAdmin
                  ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700 shadow-xs'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
              }`}
              title={isAdmin ? 'Admin Mode active - Click to lock' : 'Click to enter Admin PIN'}
            >
              {isAdmin ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Admin Mode</span>
                </>
              ) : (
                <>
                  <Shield className="h-3.5 w-3.5 text-gray-400" />
                  <span>Admin (Off)</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 px-4 md:px-6 py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      <BottomNav onOpenAi={() => setShowAiModal(true)} />

      {/* Global Modals & Command Palette */}
      <CommandPalette />

      <AiFinancialAdvisorModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
      />

      <AdminLockModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />

      <DataBackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
      />
    </div>
  )
}

