import { useState } from 'react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import AdminLockModal from './AdminLockModal'
import NetworkStatusIndicator from './NetworkStatusIndicator'
import CommandPalette from './CommandPalette'
import DataBackupModal from './DataBackupModal'
import { useAdmin } from '../context/AdminContext'
import { ShieldCheck, Shield, Database, Search, Sparkles } from 'lucide-react'

export default function Layout({ children, title }) {
  const { isAdmin } = useAdmin()
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-4 md:px-6 py-3 sticky top-0 z-30 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <NetworkStatusIndicator />
          </div>

          {/* Header Action Badges */}
          <div className="flex items-center gap-2 sm:gap-3">
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 dark:bg-slate-800 dark:text-indigo-300 dark:border-slate-700 transition-all"
              title="1-Click JSON Backup & Disaster Recovery"
            >
              <Database className="h-3.5 w-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Backup</span>
            </button>

            {/* Admin status badge */}
            <button
              onClick={() => setShowAdminModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                isAdmin
                  ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
              title={isAdmin ? 'Admin Mode active - Click to lock' : 'Click to enter Admin PIN'}
            >
              {isAdmin ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                  <span>Admin Mode</span>
                </>
              ) : (
                <>
                  <Shield className="h-3.5 w-3.5 text-gray-400" />
                  <span className="hidden sm:inline">Admin (Off)</span>
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

      <BottomNav />

      {/* Global Modals & Command Palette */}
      <CommandPalette />

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
