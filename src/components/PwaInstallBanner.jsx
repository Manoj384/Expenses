import { useState, useEffect } from 'react'
import {
  Download,
  Bell,
  CheckCircle2,
  X,
  Smartphone,
  Sparkles,
} from 'lucide-react'
import {
  requestNotificationPermission,
  isNotificationGranted,
  sendSmartNotification,
} from '../utils/notificationService'

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showBanner, setShowBanner] = useState(true)
  const [notifGranted, setNotifGranted] = useState(() => isNotificationGranted())

  useEffect(() => {
    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true)
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('To install on iOS/Safari: Tap Share icon ⎋ -> Select "Add to Home Screen". On Chrome Desktop: Click the install icon in address bar.')
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setDeferredPrompt(null)
  }

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission()
    if (res.ok) {
      setNotifGranted(true)
      sendSmartNotification({
        title: '🔔 Smart Notifications Active!',
        body: "You'll now receive automated morning briefs, bill due reminders, and budget alerts.",
      })
    }
  }

  if (!showBanner || (isInstalled && notifGranted)) return null

  return (
    <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-slate-900 text-white border border-blue-500/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/30 border border-blue-400/40 text-blue-300 flex items-center justify-center flex-shrink-0">
          <Smartphone className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-extrabold text-white text-xs">
              Install Manoj's Finance Hub App
            </h4>
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/30 text-cyan-300 text-[9px] font-bold">
              PWA
            </span>
          </div>
          <p className="text-[11px] text-blue-200/90 mt-0.5">
            Install to home screen for 1-tap instant launch, offline mode & native bill due push alerts.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
        {!isInstalled && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs hover:scale-105 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Install App</span>
          </button>
        )}

        {!notifGranted && (
          <button
            type="button"
            onClick={handleEnableNotifications}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] flex items-center gap-1.5 transition-all"
          >
            <Bell className="h-3.5 w-3.5 text-amber-300" />
            <span>Enable Push Alerts</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowBanner(false)}
          className="p-1 rounded-lg text-slate-400 hover:text-white"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
