/**
 * Smart Browser & Web Push Notification Service
 * Dispatches scheduled or instant notifications for bill dues,
 * budget threshold warnings, and anomaly alerts.
 */

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return { ok: false, error: 'Notifications not supported in this browser' }
  }

  try {
    const permission = await Notification.requestPermission()
    return { ok: permission === 'granted', permission }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

export function isNotificationGranted() {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
}

export async function sendSmartNotification({ title, body, icon = '/favicon.svg', url = '/' }) {
  if (!isNotificationGranted()) return false

  try {
    // If service worker registration is active, use showNotification for rich background notifications
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null)
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon,
          badge: icon,
          vibrate: [150, 50, 150],
          data: { url },
        })
        return true
      }
    }

    // Fallback to native window Notification
    new Notification(title, {
      body,
      icon,
      data: { url }
    })
    return true
  } catch {
    return false
  }
}

/**
 * Evaluates contextual bills & budgets to auto-dispatch notifications
 */
export function checkAndDispatchSmartAlerts({ upcomingBills = [], budgets = [], transactions = [] }) {
  if (!isNotificationGranted()) return

  const now = new Date()
  const todayDate = now.getDate()
  const lastAlertKey = 'manoj_last_notification_date'
  const todayStr = now.toISOString().slice(0, 10)

  // Avoid spamming multiple times on the same day
  if (localStorage.getItem(lastAlertKey) === todayStr) return

  // 1. Check for bills due within 3 days
  const urgentBills = (upcomingBills || []).filter(b => {
    if (b.is_paid) return false
    const diff = Number(b.due_day) - todayDate
    return diff >= 0 && diff <= 3
  })

  if (urgentBills.length > 0) {
    const bill = urgentBills[0]
    sendSmartNotification({
      title: `⚡ Bill Due in ${Number(bill.due_day) - todayDate} Days!`,
      body: `${bill.name || 'Upcoming Bill'}: ₹${Number(bill.amount || 0).toLocaleString('en-IN')} is due on the ${bill.due_day}th.`,
      url: '/reminders'
    })
    localStorage.setItem(lastAlertKey, todayStr)
    return
  }

  // 2. Check for budget thresholds >= 85%
  for (const b of (budgets || [])) {
    const spent = (transactions || [])
      .filter(t => t.type === 'expense' && t.category_id === b.category_id)
      .reduce((s, t) => s + Number(t.amount || 0), 0)
    const limit = Number(b.amount || 0)
    if (limit > 0 && spent >= limit * 0.85) {
      sendSmartNotification({
        title: `⚠️ Budget Alert: ${b.category?.name || 'Category'} at ${Math.round((spent/limit)*100)}%`,
        body: `You've spent ₹${spent.toLocaleString('en-IN')} of your ₹${limit.toLocaleString('en-IN')} budget limit.`,
        url: '/budgets'
      })
      localStorage.setItem(lastAlertKey, todayStr)
      return
    }
  }
}
