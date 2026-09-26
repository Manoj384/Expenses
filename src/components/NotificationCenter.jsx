import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Settings,
  ExternalLink,
  Volume2,
  Calendar,
  CreditCard,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react'

export default function NotificationCenter() {
  const navigate = useNavigate()
  const {
    notifications,
    unreadCount,
    dismissNotification,
    dismissAll,
    preferences,
    setPreferences,
    permission,
    requestPushPermission,
  } = useNotifications()

  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all') // 'all', 'daily', 'sip', 'debt'
  const [showSettings, setShowSettings] = useState(false)
  const menuRef = useRef(null)

  // Close dropdown when clicking outside on desktop
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
        setShowSettings(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'daily') return n.type === 'daily'
    if (activeTab === 'sip') return n.type === 'sip'
    if (activeTab === 'debt') return n.type === 'debt'
    return true
  })

  const hasHighPriority = notifications.some((n) => n.severity === 'danger')

  const handleAction = (n) => {
    setIsOpen(false)
    if (n.actionPath) {
      navigate(n.actionPath)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Bell Trigger Button (Touch-Friendly) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 sm:p-1.5 rounded-xl text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 transition-colors"
        title="Due Dates & Daily Reminders"
        aria-label="Notifications"
      >
        <Bell className={`h-4 w-4 ${hasHighPriority ? 'text-rose-500 animate-wiggle' : ''}`} />
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-xs ${
            hasHighPriority ? 'bg-rose-600 animate-pulse' : 'bg-blue-600'
          }`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Flyout Notification Panel (Responsive Drawer on Mobile, Popover on Desktop) */}
      {isOpen && (
        <div className="fixed inset-x-3 bottom-20 top-auto sm:top-12 sm:bottom-auto sm:right-0 sm:left-auto sm:absolute w-auto sm:w-96 bg-white dark:bg-slate-900 rounded-3xl sm:rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-top-2 duration-150 max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="p-3.5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/40 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-none">
                  Alerts & Daily Reminders
                </h3>
                <span className="text-[10px] text-gray-400 font-medium">
                  {unreadCount} active due {unreadCount === 1 ? 'alert' : 'alerts'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  showSettings
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
                title="Notification Settings"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={dismissAll}
                  className="text-[10px] font-bold text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="sm:hidden p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Settings Drawer */}
          {showSettings && (
            <div className="p-3 bg-blue-50/50 dark:bg-slate-800/80 border-b border-blue-100 dark:border-slate-700 text-xs space-y-2.5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800 dark:text-slate-200 text-[11px]">
                  Daily Expense Check-in:
                </span>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded">
                  8:00 PM & 9:00 PM
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800 dark:text-slate-200 text-[11px]">
                  EMI & SIP Advance Alert:
                </span>
                <select
                  value={preferences.daysBefore}
                  onChange={(e) =>
                    setPreferences({ ...preferences, daysBefore: parseInt(e.target.value) })
                  }
                  className="text-xs py-0.5 px-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-800 dark:text-slate-200"
                >
                  <option value={1}>1 Day Before</option>
                  <option value={3}>3 Days Before</option>
                  <option value={5}>5 Days Before</option>
                  <option value={7}>7 Days Before</option>
                </select>
              </div>

              {/* Browser Push Permission Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-blue-100/60 dark:border-slate-700">
                <div className="flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-[11px] font-medium text-gray-700 dark:text-slate-300">
                    Browser Push Alerts
                  </span>
                </div>
                {permission === 'granted' ? (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                    Enabled
                  </span>
                ) : (
                  <button
                    onClick={requestPushPermission}
                    className="btn-primary text-[10px] py-1 px-2 font-semibold"
                  >
                    Enable Push
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex border-b border-gray-100 dark:border-slate-800 text-[11px] font-semibold bg-gray-50/30 dark:bg-slate-800/20 px-2 pt-1 gap-1 overflow-x-auto flex-shrink-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1.5 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'all'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-2.5 py-1.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1 ${
                activeTab === 'daily'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400'
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>Daily ({notifications.filter((n) => n.type === 'daily').length})</span>
            </button>
            <button
              onClick={() => setActiveTab('sip')}
              className={`px-2.5 py-1.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1 ${
                activeTab === 'sip'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400'
              }`}
            >
              <TrendingUp className="h-3 w-3" />
              <span>SIPs ({notifications.filter((n) => n.type === 'sip').length})</span>
            </button>
            <button
              onClick={() => setActiveTab('debt')}
              className={`px-2.5 py-1.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1 ${
                activeTab === 'debt'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400'
              }`}
            >
              <CreditCard className="h-3 w-3" />
              <span>EMIs ({notifications.filter((n) => n.type === 'debt').length})</span>
            </button>
          </div>

          {/* Alerts List */}
          <div className="overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/60 p-1 flex-1">
            {filteredNotifications.length === 0 ? (
              <div className="py-8 text-center px-4">
                <div className="inline-flex p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200">
                  All Caught Up!
                </h4>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                  No overdue or upcoming EMI / SIP dues pending.
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 transition-colors rounded-xl flex items-start gap-2.5 ${
                    n.severity === 'danger'
                      ? 'bg-rose-50/60 dark:bg-rose-950/30'
                      : n.severity === 'warning'
                      ? 'bg-amber-50/50 dark:bg-amber-950/20'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {/* Icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    {n.type === 'daily' ? (
                      <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                    ) : n.severity === 'danger' ? (
                      <div className="p-1.5 bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg">
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </div>
                    ) : n.severity === 'warning' ? (
                      <div className="p-1.5 bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 rounded-lg">
                        <Calendar className="h-3.5 w-3.5" />
                      </div>
                    ) : (
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-lg">
                        <Info className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {n.title}
                      </h4>
                      <button
                        onClick={() => dismissNotification(n.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-0.5 ml-1"
                        title="Dismiss alert"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-slate-300 mt-0.5 leading-snug">
                      {n.message}
                    </p>

                    {/* Action CTA */}
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-200/40 dark:border-slate-800">
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">
                        {n.date}
                      </span>
                      <button
                        onClick={() => handleAction(n)}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 transition-colors"
                      >
                        <span>{n.actionText || 'Take Action'}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
