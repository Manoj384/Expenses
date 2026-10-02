import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import AdminLockModal from './AdminLockModal'
import NetworkStatusIndicator from './NetworkStatusIndicator'
import CommandPalette from './CommandPalette'
import DataBackupModal from './DataBackupModal'
import NotificationCenter from './NotificationCenter'
import AiChatbotWidget from './AiChatbotWidget'
import KeyboardShortcutsModal from './KeyboardShortcutsModal'
import OnboardingWizardModal from './OnboardingWizardModal'
import AlarmRingingModal from './AlarmRingingModal'
import TelegramWhatsAppBotModal from './TelegramWhatsAppBotModal'
import QuickAddFAB from './QuickAddFAB'
import { useAdmin } from '../context/AdminContext'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useDesktopMode } from '../context/DesktopModeContext'
import { useToast } from '../context/ToastContext'
import CashFlowCalendarModal from './CashFlowCalendarModal'
import FireSimulatorModal from './FireSimulatorModal'
import SubscriptionLeakModal from './SubscriptionLeakModal'
import BiometricAppLockOverlay from './BiometricAppLockOverlay'
import { ShieldCheck, Shield, Database, Search, Moon, Sun, Sparkles, LogOut, HelpCircle, Compass, Monitor, Smartphone, Bot, MessageSquare, Calendar, Flame, Skull, Fingerprint, Lock } from 'lucide-react'

export default function Layout({ children, title }) {
  const { isAdmin } = useAdmin()
  const { isDark, toggleTheme } = useTheme()
  const { isDesktopSite, toggleDesktopSite } = useDesktopMode()
  const toast = useToast()
  const { logout } = useAuth()
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [showBotModal, setShowBotModal] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [showFireModal, setShowFireModal] = useState(false)
  const [showLeakModal, setShowLeakModal] = useState(false)
  const [isAppLocked, setIsAppLocked] = useState(false)

  // Listen for global custom events
  useEffect(() => {
    const handleOpenBot = () => setShowBotModal(true)
    const handleOpenCal = () => setShowCalendarModal(true)
    const handleOpenFire = () => setShowFireModal(true)
    const handleOpenLeak = () => setShowLeakModal(true)
    const handleLock = () => setIsAppLocked(true)
    window.addEventListener('open-bot-modal', handleOpenBot)
    window.addEventListener('open-calendar-modal', handleOpenCal)
    window.addEventListener('open-fire-simulator', handleOpenFire)
    window.addEventListener('open-subscription-leak', handleOpenLeak)
    window.addEventListener('open-app-lock', handleLock)
    return () => {
      window.removeEventListener('open-bot-modal', handleOpenBot)
      window.removeEventListener('open-calendar-modal', handleOpenCal)
      window.removeEventListener('open-fire-simulator', handleOpenFire)
      window.removeEventListener('open-subscription-leak', handleOpenLeak)
      window.removeEventListener('open-app-lock', handleLock)
    }
  }, [])


  // Global keyboard listener for Shift + ?
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === '?' || (e.shiftKey && e.key === '/')) && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault()
        setShowShortcutsModal(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])


  const handleLogout = () => {
    logout()
  }

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
            {/* Notification Center Bell & Due Date Alerts */}
            <NotificationCenter />

            {/* Financial Dues & Cash Flow Calendar Quick Launcher */}
            <button
              onClick={() => setShowCalendarModal(true)}
              className="p-2 sm:p-1.5 rounded-xl text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 transition-colors"
              title="Financial Dues & Cash Flow Calendar"
              aria-label="Cash Flow Calendar"
            >
              <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </button>

            {/* Desktop Site Mode Toggle Button */}
            <button
              onClick={() => {
                toggleDesktopSite()
                if (!isDesktopSite) {
                  toast.info('Desktop Site View enabled (1280px layout)')
                } else {
                  toast.info('Mobile Responsive View restored')
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isDesktopSite
                  ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700 shadow-xs'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
              }`}
              title={isDesktopSite ? 'Switch back to Mobile Responsive View' : 'Switch to Desktop Site View (Full 1280px layout)'}
              aria-label="Toggle Desktop Site Mode"
            >
              {isDesktopSite ? (
                <>
                  <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="hidden sm:inline">Mobile View</span>
                </>
              ) : (
                <>
                  <Monitor className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="hidden sm:inline">Desktop Site</span>
                </>
              )}
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-xl text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 border border-gray-200 dark:border-slate-700 transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>

            {/* Logout Button — always visible */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 border border-red-100 dark:border-red-900/40 transition-colors"
              title="Log Out"
              aria-label="Log Out"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Log Out</span>
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

            {/* Telegram & WhatsApp Bot Launcher */}
            <button
              onClick={() => setShowBotModal(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 transition-all shadow-xs"
              title="Open Telegram & WhatsApp Instant Financial Bot"
            >
              <Bot className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span className="hidden sm:inline">Bot Assistant</span>
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
            {/* Biometric Quick Lock Button */}
            <button
              onClick={() => setIsAppLocked(true)}
              className="p-1.5 rounded-xl text-gray-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 bg-gray-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-gray-200 dark:border-slate-700 transition-colors"
              title="Lock Application Screen"
              aria-label="Lock App"
            >
              <Lock className="h-4 w-4" />
            </button>

            {/* Guided Setup Tour Trigger Button */}
            <button
              onClick={() => setShowOnboardingModal(true)}
              className="p-1.5 rounded-xl text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 border border-gray-200 dark:border-slate-700 transition-colors hidden sm:flex"
              title="Guided Onboarding & Setup Tour"
              aria-label="Setup Tour"
            >
              <Compass className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </button>

            {/* Keyboard Shortcuts Trigger Button */}
            <button
              onClick={() => setShowShortcutsModal(true)}
              className="p-1.5 rounded-xl text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 border border-gray-200 dark:border-slate-700 transition-colors hidden sm:flex"
              title="Keyboard Shortcuts Cheatsheet (Shift + ?)"
              aria-label="Keyboard Shortcuts"
            >
              <HelpCircle className="h-4 w-4 text-gray-500 dark:text-slate-400" />
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 px-4 md:px-6 py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      <QuickAddFAB />
      <AiChatbotWidget />

      <BottomNav
        onOpenAi={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}
        onOpenAdmin={() => setShowAdminModal(true)}
        onOpenBackup={() => setShowBackupModal(true)}
      />

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

      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      <OnboardingWizardModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
      />

      <TelegramWhatsAppBotModal
        isOpen={showBotModal}
        onClose={() => setShowBotModal(false)}
      />

      <CashFlowCalendarModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
      />

      <FireSimulatorModal
        isOpen={showFireModal}
        onClose={() => setShowFireModal(false)}
      />

      <SubscriptionLeakModal
        isOpen={showLeakModal}
        onClose={() => setShowLeakModal(false)}
      />

      <BiometricAppLockOverlay
        isLocked={isAppLocked}
        onUnlock={() => setIsAppLocked(false)}
      />

      <AlarmRingingModal />
    </div>
  )
}



