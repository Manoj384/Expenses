import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import { formatCurrency } from '../utils/formatCurrency'
import { today, isOverdue, daysUntil } from '../utils/dateUtils'
import defaultSips from '../data/default_sips.json'

const NotificationContext = createContext(null)

const DISMISSED_STORAGE_KEY = 'ft_dismissed_notifications'
const PREFS_STORAGE_KEY = 'ft_notification_preferences'

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [permission, setPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission
    }
    return 'default'
  })

  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY)
      return saved ? JSON.parse(saved) : {
        sipAlerts: true,
        debtAlerts: true,
        budgetAlerts: true,
        dailyReminders: true, // 8:00 PM & 9:00 PM
        monthEndAlerts: true,  // Month-end EMI & bill reminder
        daysBefore: 3,         // Alert 3 days in advance
        browserPush: false,
      }
    } catch {
      return {
        sipAlerts: true,
        debtAlerts: true,
        budgetAlerts: true,
        dailyReminders: true,
        monthEndAlerts: true,
        daysBefore: 3,
        browserPush: false,
      }
    }
  })

  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(DISMISSED_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Save dismissed alerts
  useEffect(() => {
    try {
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(dismissedIds))
    } catch {}
  }, [dismissedIds])

  // Save preferences
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(preferences))
    } catch {}
  }, [preferences])

  // Request native browser push permissions
  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      return false
    }
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm === 'granted') {
        setPreferences((p) => ({ ...p, browserPush: true }))
        new Notification('Finance Tracker Alerts Enabled', {
          body: 'You will now receive 8:00 PM & 9:00 PM expense reminders and EMI/SIP due alerts!',
          icon: '/favicon.svg',
        })
        return true
      }
    } catch {
      return false
    }
    return false
  }

  // Trigger local browser push notification
  const sendBrowserNotification = (title, body, tag) => {
    if (
      preferences.browserPush &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      const sessionKey = `ft_notif_sent_${tag}`
      if (!sessionStorage.getItem(sessionKey)) {
        try {
          new Notification(title, {
            body,
            icon: '/favicon.svg',
            tag,
          })
          sessionStorage.setItem(sessionKey, 'true')
        } catch {}
      }
    }
  }

  // Scan and generate dynamic real-time notifications
  const scanAlerts = useCallback(async () => {
    const todayStr = today()
    const now = new Date()
    const currentHour = now.getHours()
    const currentDayOfMonth = now.getDate()
    const generated = []

    // ── 1. Daily 8:00 PM & 9:00 PM Expense Logging Reminders ───────────────
    if (preferences.dailyReminders) {
      // 8:00 PM reminder (active starting from 20:00)
      if (currentHour >= 20) {
        const id8pm = `daily_expense_reminder_8pm_${todayStr}`
        generated.push({
          id: id8pm,
          type: 'daily',
          severity: 'info',
          title: '🌙 8:00 PM Daily Expense Check-In',
          message: 'Have you recorded all your spending today? (Swiggy, fuel, shopping, cash)',
          date: todayStr,
          actionPath: '/transactions',
          actionText: '+ Add Expense',
        })
        if (currentHour === 20) {
          sendBrowserNotification(
            '🌙 8:00 PM Daily Expense Check-In',
            'Take 30 seconds to record your day’s transactions before the day ends!',
            id8pm
          )
        }
      }

      // 9:00 PM final reminder (active starting from 21:00)
      if (currentHour >= 21) {
        const id9pm = `daily_expense_reminder_9pm_${todayStr}`
        generated.push({
          id: id9pm,
          type: 'daily',
          severity: 'warning',
          title: '⏰ 9:00 PM Final Day Closing Reminder',
          message: 'Final reminder: Log today’s expenses to keep your monthly budget & reports 100% accurate.',
          date: todayStr,
          actionPath: '/transactions',
          actionText: '+ Log Expense',
        })
        if (currentHour === 21) {
          sendBrowserNotification(
            '⏰ 9:00 PM Daily Closing Reminder',
            'Did you spend anything else today? Tap to log it quickly.',
            id9pm
          )
        }
      }
    }

    // ── 2. Live SIPs Scanning ──────────────────────────────────────────────
    let activeSips = []
    if (user) {
      try {
        const { data } = await supabase
          .from('sips')
          .select('*')
          .eq('user_id', user.id)
          .eq('active', true)
        activeSips = data || []
      } catch {}
    }
    if (activeSips.length === 0) {
      activeSips = defaultSips
    }

    if (preferences.sipAlerts) {
      activeSips.forEach((s) => {
        if (!s.next_due_date) return
        const days = daysUntil(s.next_due_date)
        const isPast = isOverdue(s.next_due_date)
        const amt = formatCurrency(s.amount)

        if (isPast) {
          const id = `sip_overdue_${s.id || s.name}_${s.next_due_date}`
          generated.push({
            id,
            type: 'sip',
            severity: 'danger',
            title: `🚨 Overdue SIP: ${s.name}`,
            message: `SIP of ${amt} was due on ${s.next_due_date}. Tap to mark as paid.`,
            date: s.next_due_date,
            actionPath: '/sips',
            actionText: 'Go to SIPs',
            sipData: s,
          })
          sendBrowserNotification('Overdue SIP Alert', `Your SIP for ${s.name} (${amt}) is overdue!`, id)
        } else if (days === 0) {
          const id = `sip_today_${s.id || s.name}_${s.next_due_date}`
          generated.push({
            id,
            type: 'sip',
            severity: 'warning',
            title: `⏳ SIP Due Today: ${s.name}`,
            message: `SIP of ${amt} is due today! Ensure your bank balance is maintained.`,
            date: s.next_due_date,
            actionPath: '/sips',
            actionText: 'Review SIP',
            sipData: s,
          })
          sendBrowserNotification('SIP Due Today', `SIP for ${s.name} (${amt}) is scheduled for today.`, id)
        } else if (days > 0 && days <= (preferences.daysBefore || 3)) {
          const id = `sip_soon_${s.id || s.name}_${s.next_due_date}`
          generated.push({
            id,
            type: 'sip',
            severity: 'info',
            title: `📅 Upcoming SIP in ${days}d: ${s.name}`,
            message: `SIP payment of ${amt} will be deducted on ${s.next_due_date}.`,
            date: s.next_due_date,
            actionPath: '/sips',
            actionText: 'View SIP',
            sipData: s,
          })
        }
      })
    }

    // ── 3. Debts & EMI Scanning ────────────────────────────────────────────
    if (user && preferences.debtAlerts) {
      try {
        const { data: debts } = await supabase
          .from('debts')
          .select('*')
          .eq('user_id', user.id)

        if (debts && debts.length > 0) {
          let totalUpcomingEmis = 0

          debts.forEach((d) => {
            if (d.status === 'cleared' || Number(d.outstanding) <= 0) return

            const emiAmt = formatCurrency(d.emi || 0)
            const outAmt = formatCurrency(d.outstanding || 0)
            if (d.emi > 0) totalUpcomingEmis += parseFloat(d.emi)

            // Monthly EMI Due Day calculation
            if (d.due_day && d.emi > 0) {
              const dueDay = parseInt(d.due_day)
              let diff = dueDay - currentDayOfMonth
              if (diff === 0) {
                const id = `emi_today_${d.id}_${now.getMonth()}`
                generated.push({
                  id,
                  type: 'debt',
                  severity: 'warning',
                  title: `💳 EMI Due Today: ${d.name}`,
                  message: `Monthly EMI of ${emiAmt} is due today. Total outstanding: ${outAmt}.`,
                  date: todayStr,
                  actionPath: '/debts',
                  actionText: 'Manage Debt',
                })
                sendBrowserNotification('EMI Due Today', `EMI of ${emiAmt} for ${d.name} is due today!`, id)
              } else if (diff > 0 && diff <= (preferences.daysBefore || 3)) {
                const id = `emi_soon_${d.id}_${now.getMonth()}`
                generated.push({
                  id,
                  type: 'debt',
                  severity: 'info',
                  title: `🗓️ EMI Due in ${diff} days: ${d.name}`,
                  message: `Monthly EMI of ${emiAmt} is due on the ${dueDay}th.`,
                  date: todayStr,
                  actionPath: '/debts',
                  actionText: 'View Debts',
                })
              }
            }

            // Target repayment date for friends/family borrowing
            if (d.target_date) {
              const days = daysUntil(d.target_date)
              const isPast = isOverdue(d.target_date)
              if (isPast) {
                const id = `debt_target_overdue_${d.id}`
                generated.push({
                  id,
                  type: 'debt',
                  severity: 'danger',
                  title: `⚠️ Overdue Repayment: ${d.name}`,
                  message: `Target return date of ${d.target_date} has passed. Outstanding: ${outAmt}.`,
                  date: d.target_date,
                  actionPath: '/debts',
                  actionText: 'Settle Debt',
                })
              } else if (days >= 0 && days <= (preferences.daysBefore || 3)) {
                const id = `debt_target_soon_${d.id}`
                generated.push({
                  id,
                  type: 'debt',
                  severity: 'warning',
                  title: `🤝 Return Target in ${days}d: ${d.name}`,
                  message: `Planned repayment date is ${d.target_date}. Amount: ${outAmt}.`,
                  date: d.target_date,
                  actionPath: '/debts',
                  actionText: 'View Details',
                })
              }
            }
          })

          // ── 4. Month-End EMI & Bill Advance Alert (25th to month end) ─────
          if (preferences.monthEndAlerts && currentDayOfMonth >= 25 && totalUpcomingEmis > 0) {
            const idMonthEnd = `month_end_emi_${now.getFullYear()}_${now.getMonth()}`
            generated.push({
              id: idMonthEnd,
              type: 'debt',
              severity: 'warning',
              title: '📅 Month-End EMI Preparation Alert',
              message: `You have ${formatCurrency(totalUpcomingEmis)} in total monthly EMIs due next week. Ensure sufficient bank balance is maintained.`,
              date: todayStr,
              actionPath: '/debts',
              actionText: 'Review EMIs',
            })
          }
        }
      } catch {}
    }

    // Filter out dismissed alerts
    const activeNotifications = generated.filter((n) => !dismissedIds.includes(n.id))

    // Sort by severity (danger first, then warning, then info)
    const severityRank = { danger: 0, warning: 1, info: 2 }
    activeNotifications.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])

    setNotifications(activeNotifications)
    setUnreadCount(activeNotifications.length)
  }, [user, preferences, dismissedIds])

  // Run alert scanner on mount and periodic refresh
  useEffect(() => {
    scanAlerts()
    // Periodic refresh every 1 minute to catch 8:00 PM and 9:00 PM triggers
    const interval = setInterval(scanAlerts, 60 * 1000)
    return () => clearInterval(interval)
  }, [scanAlerts])

  const dismissNotification = (id) => {
    setDismissedIds((prev) => [...prev, id])
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const dismissAll = () => {
    const allIds = notifications.map((n) => n.id)
    setDismissedIds((prev) => [...new Set([...prev, ...allIds])])
    setNotifications([])
    setUnreadCount(0)
  }

  const resetDismissed = () => {
    setDismissedIds([])
    localStorage.removeItem(DISMISSED_STORAGE_KEY)
    scanAlerts()
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        dismissNotification,
        dismissAll,
        resetDismissed,
        refreshAlerts: scanAlerts,
        preferences,
        setPreferences,
        permission,
        requestPushPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return ctx
}
