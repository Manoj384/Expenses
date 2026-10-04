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

import QuickAddFAB from './QuickAddFAB'
import { useAdmin } from '../context/AdminContext'
import { useAuth } from '../context/AuthContext'
import AiFinancialCopilotModal from './AiFinancialCopilotModal'
import FinancialToolkitModal from './FinancialToolkitModal'
import BiometricAppLockOverlay from './BiometricAppLockOverlay'
import { wakeWordService } from '../utils/wakeWordDetector'
import { backgroundAiWorker } from '../utils/backgroundAiWorker'
import { Link } from 'react-router-dom'
import { Menu, Sparkles, Bot } from 'lucide-react'

export default function Layout({ children, title }) {
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const { logout } = useAuth()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)

  // Unified Super Hub Modals
  const [showCopilotModal, setShowCopilotModal] = useState(false)
  const [copilotTab, setCopilotTab] = useState('digest')
  const [showToolkitModal, setShowToolkitModal] = useState(false)
  const [toolkitTab, setToolkitTab] = useState('forecast')
  const [voiceAutoStart, setVoiceAutoStart] = useState(false)
  const [isAppLocked, setIsAppLocked] = useState(false)

  // Start Autonomous Background AI Supervisor & Hands-free Wake Word Listener ("Hey Manoj")
  useEffect(() => {
    // 1. Start background AI maintenance supervisor
    backgroundAiWorker.start()

    const onWake = (command) => {
      setCopilotTab('voice')
      setVoiceAutoStart(true)
      setShowCopilotModal(true)
    }

    // 2. Start hands-free wake word listener ONLY if explicitly enabled by the user
    wakeWordService.start(onWake)

    const handleSettingChange = (e) => {
      if (e?.detail?.enabled) {
        wakeWordService.start(onWake)
      } else {
        wakeWordService.stop()
      }
    }

    window.addEventListener('wake-word-setting-changed', handleSettingChange)

    return () => {
      backgroundAiWorker.stop()
      wakeWordService.stop()
      window.removeEventListener('wake-word-setting-changed', handleSettingChange)
    }
  }, [])

  // Listen for global custom events and route into the 2 Super Hubs
  useEffect(() => {
    // AI Financial Copilot Hub events
    const handleOpenCopilot = (e) => {
      setCopilotTab(e?.detail?.tab || 'digest')
      setShowCopilotModal(true)
    }
    const handleOpenBot = () => {
      setCopilotTab('bot')
      setShowCopilotModal(true)
    }
    const handleOpenCard = () => {
      setCopilotTab('cards')
      setShowCopilotModal(true)
    }
    const handleOpenSentinel = () => {
      setCopilotTab('sentinel')
      setShowCopilotModal(true)
    }
    const handleOpenAutoPilot = () => {
      setCopilotTab('digest')
      setShowCopilotModal(true)
    }
    const handleOpenVoice = () => {
      setCopilotTab('voice')
      setVoiceAutoStart(true)
      setShowCopilotModal(true)
    }

    // Financial Planning Toolkit Hub events
    const handleOpenToolkit = (e) => {
      setToolkitTab(e?.detail?.tab || 'forecast')
      setShowToolkitModal(true)
    }
    const handleOpenForecast = () => {
      setToolkitTab('forecast')
      setShowToolkitModal(true)
    }
    const handleOpenTax = () => {
      setToolkitTab('tax')
      setShowToolkitModal(true)
    }
    const handleOpenFire = () => {
      setToolkitTab('fire')
      setShowToolkitModal(true)
    }
    const handleOpenHealth = () => {
      setToolkitTab('health')
      setShowToolkitModal(true)
    }
    const handleOpenLeak = () => {
      setToolkitTab('zombie')
      setShowToolkitModal(true)
    }
    const handleOpenCal = () => {
      setToolkitTab('calendar')
      setShowToolkitModal(true)
    }
    const handleOpenStreak = () => {
      setToolkitTab('streaks')
      setShowToolkitModal(true)
    }
    const handleLock = () => setIsAppLocked(true)

    // Register listeners
    window.addEventListener('open-ai-copilot', handleOpenCopilot)
    window.addEventListener('open-bot-modal', handleOpenBot)
    window.addEventListener('open-card-optimizer', handleOpenCard)
    window.addEventListener('open-anomaly-sentinel', handleOpenSentinel)
    window.addEventListener('open-autopilot-digest', handleOpenAutoPilot)
    window.addEventListener('open-voice-companion', handleOpenVoice)

    window.addEventListener('open-financial-toolkit', handleOpenToolkit)
    window.addEventListener('open-forecast-modal', handleOpenForecast)
    window.addEventListener('open-cashflow-forecast', handleOpenForecast)
    window.addEventListener('open-tax-planner', handleOpenTax)
    window.addEventListener('open-fire-simulator', handleOpenFire)
    window.addEventListener('open-health-modal', handleOpenHealth)
    window.addEventListener('open-health-score', handleOpenHealth)
    window.addEventListener('open-subscription-leak', handleOpenLeak)
    window.addEventListener('open-calendar-modal', handleOpenCal)
    window.addEventListener('open-streak-modal', handleOpenStreak)
    window.addEventListener('open-app-lock', handleLock)

    return () => {
      window.removeEventListener('open-ai-copilot', handleOpenCopilot)
      window.removeEventListener('open-bot-modal', handleOpenBot)
      window.removeEventListener('open-card-optimizer', handleOpenCard)
      window.removeEventListener('open-anomaly-sentinel', handleOpenSentinel)
      window.removeEventListener('open-autopilot-digest', handleOpenAutoPilot)
      window.removeEventListener('open-voice-companion', handleOpenVoice)

      window.removeEventListener('open-financial-toolkit', handleOpenToolkit)
      window.removeEventListener('open-forecast-modal', handleOpenForecast)
      window.removeEventListener('open-cashflow-forecast', handleOpenForecast)
      window.removeEventListener('open-tax-planner', handleOpenTax)
      window.removeEventListener('open-fire-simulator', handleOpenFire)
      window.removeEventListener('open-health-modal', handleOpenHealth)
      window.removeEventListener('open-health-score', handleOpenHealth)
      window.removeEventListener('open-subscription-leak', handleOpenLeak)
      window.removeEventListener('open-calendar-modal', handleOpenCal)
      window.removeEventListener('open-streak-modal', handleOpenStreak)
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

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-200">
      {/* Left Sidebar (Desktop Fixed Sidebar & Mobile Slide-Over Drawer with all tools) */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onOpenAdmin={() => setShowAdminModal(true)}
        onOpenBackup={() => setShowBackupModal(true)}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onOpenOnboarding={() => setShowOnboardingModal(true)}
        onLockApp={() => setIsAppLocked(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Clean Top Header Bar — No Duplicate Buttons */}
        <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-4 md:px-6 py-3 sticky top-0 z-30 flex items-center justify-between shadow-2xs">
          {/* Left: 3-line hamburger button on mobile + Title & Network Status */}
          <div className="flex items-center gap-3 min-w-0">
            {/* 3-Line Hamburger Menu Button for Mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 -ml-1.5 rounded-xl text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
              title="Open Navigation Menu"
              aria-label="Open Sidebar Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
              {title}
            </h1>
            <NetworkStatusIndicator />
          </div>

          {/* Right: AI Copilot Quick Button & Notification Center */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              to="/ai-copilot"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold hover:scale-105 transition-all shadow-sm shadow-blue-500/20"
              title="Open AI Financial Copilot"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
              <span className="hidden sm:inline">AI Copilot</span>
            </Link>
            <NotificationCenter />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 px-4 md:px-6 py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      <QuickAddFAB />
      <AiChatbotWidget />

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

      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      <OnboardingWizardModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
      />

      {/* 1. Unified AI Financial Copilot Hub */}
      <AiFinancialCopilotModal
        isOpen={showCopilotModal}
        initialTab={copilotTab}
        voiceAutoStart={voiceAutoStart}
        onClose={() => {
          setShowCopilotModal(false)
          setVoiceAutoStart(false)
        }}
      />

      {/* 2. Unified Financial Planning & Toolkit Suite */}
      <FinancialToolkitModal
        isOpen={showToolkitModal}
        initialTab={toolkitTab}
        onClose={() => setShowToolkitModal(false)}
      />

      <BiometricAppLockOverlay
        isLocked={isAppLocked}
        onUnlock={() => setIsAppLocked(false)}
      />

      <AlarmRingingModal />
    </div>
  )
}
