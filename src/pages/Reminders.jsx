import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate, today } from '../utils/dateUtils'
import { playClockAlarmSequence } from '../utils/alarmSound'
import { generateGoogleCalendarUrl, downloadIcsFile } from '../utils/calendarExport'
import { fireMilestoneConfetti } from '../utils/confetti'
import {
  BellRing,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  Zap,
  CreditCard,
  Building,
  Tv,
  Wifi,
  Shield,
  TrendingUp,
  Receipt,
  ArrowUpRight,
  Sparkles,
  Search,
  Check,
  RotateCcw,
  Volume2,
  Smartphone,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  HeartPulse,
  UserCheck,
  Tag,
} from 'lucide-react'

const REMINDER_CATEGORIES = [
  { id: 'bills', label: 'Bills & Utilities', icon: Zap, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200' },
  { id: 'rent', label: 'House Rent / Maintenance', icon: Building, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200' },
  { id: 'sip', label: 'SIP & Investments', icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200' },
  { id: 'emi', label: 'Loan EMI & Debts', icon: CreditCard, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200' },
  { id: 'internet', label: 'Broadband & Mobile Recharge', icon: Wifi, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200' },
  { id: 'subscription', label: 'OTT & Cloud Subscriptions', icon: Tv, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200' },
  { id: 'health', label: 'Health & Medical', icon: HeartPulse, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40 border-teal-200' },
  { id: 'personal', label: 'Personal & Tasks', icon: UserCheck, color: 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200' },
  { id: 'custom', label: 'Custom Reminder', icon: Tag, color: 'text-gray-500 bg-gray-50 dark:bg-slate-800 border-gray-200' },
]

const QUICK_TEMPLATES = [
  { title: '⚡ Bescom Electricity Bill', category: 'bills', amount: '2450', time: '10:00', recurrence: 'monthly' },
  { title: '🏠 Apartment Monthly Rent', category: 'rent', amount: '18500', time: '09:00', recurrence: 'monthly' },
  { title: '💳 Credit Card Bill Autopay', category: 'bills', amount: '12500', time: '18:00', recurrence: 'monthly' },
  { title: '📈 Monthly Mutual Fund SIP', category: 'sip', amount: '5000', time: '09:30', recurrence: 'monthly' },
  { title: '🌐 Airtel Fiber Broadband Bill', category: 'internet', amount: '1179', time: '11:00', recurrence: 'monthly' },
  { title: '🚗 Car Loan EMI Deduction', category: 'emi', amount: '8450', time: '09:00', recurrence: 'monthly' },
  { title: '🌙 Daily 8:00 PM Expense Logging', category: 'personal', amount: '', time: '20:00', recurrence: 'daily' },
]

const DEFAULT_REMINDERS = [
  {
    id: 'rem-seed-1',
    title: 'Apartment Monthly Rent',
    category: 'rent',
    amount: 18500,
    date: today(),
    time: '09:00',
    recurrence: 'monthly',
    priority: 'high',
    sound: true,
    completed: false,
    notes: 'Transfer to landlord account via UPI / NEFT',
  },
  {
    id: 'rem-seed-2',
    title: 'Airtel Fiber Broadband Bill',
    category: 'internet',
    amount: 1179,
    date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    time: '10:30',
    recurrence: 'monthly',
    priority: 'normal',
    sound: true,
    completed: false,
    notes: 'Autopay check',
  },
  {
    id: 'rem-seed-3',
    title: 'Bescom Electricity Bill Payment',
    category: 'bills',
    amount: 2450,
    date: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
    time: '14:00',
    recurrence: 'monthly',
    priority: 'high',
    sound: true,
    completed: false,
    notes: 'Consumer ID: 88472910',
  },
  {
    id: 'rem-seed-4',
    title: 'Monthly Mutual Fund SIP Deduction',
    category: 'sip',
    amount: 10000,
    date: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
    time: '09:30',
    recurrence: 'monthly',
    priority: 'high',
    sound: true,
    completed: false,
    notes: 'HDFC & Motilal Oswal Direct SIPs',
  },
]

export default function Reminders() {
  const { user } = useAuth()
  const storageKey = `ft_reminders_${user?.id || 'guest'}`
  const todayStr = today()

  const [reminders, setReminders] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : DEFAULT_REMINDERS
    } catch {
      return DEFAULT_REMINDERS
    }
  })

  const [viewMode, setViewMode] = useState('calendar') // 'calendar' | 'agenda'
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [currentCalMonth, setCurrentCalMonth] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'pending' | 'completed' | 'today'

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [testingAlarm, setTestingAlarm] = useState(false)
  const [notifPermission, setNotifPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  )

  const [form, setForm] = useState({
    title: '',
    category: 'bills',
    amount: '',
    date: todayStr,
    time: '09:00',
    recurrence: 'monthly',
    priority: 'normal',
    sound: true,
    syncGoogleCal: true,
    syncIcs: false,
    notes: '',
  })

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(reminders))
    } catch {}
  }, [reminders, storageKey])

  // Listen for global snooze & completed events from AlarmRingingModal
  useEffect(() => {
    const handleSnooze = (e) => {
      const snoozed = e.detail
      setReminders((prev) => [snoozed, ...prev])
    }

    const handleCompleted = (e) => {
      const done = e.detail
      setReminders((prev) =>
        prev.map((r) => (r.id === done.id ? { ...r, completed: true, completedAt: new Date().toISOString() } : r))
      )
      fireMilestoneConfetti()
    }

    window.addEventListener('reminder-snoozed', handleSnooze)
    window.addEventListener('reminder-completed', handleCompleted)
    return () => {
      window.removeEventListener('reminder-snoozed', handleSnooze)
      window.removeEventListener('reminder-completed', handleCompleted)
    }
  }, [])

  // ── Exact Time Alarm Scanner (Checks every 10 seconds) ───────────────────
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const curDateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      const curTimeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`

      reminders.forEach((r) => {
        if (r.completed) return

        let matchesDate = false
        if (r.recurrence === 'daily') {
          matchesDate = true
        } else if (r.recurrence === 'monthly') {
          const rDay = parseInt((r.date || '').split('-')[2] || '1')
          matchesDate = now.getDate() === rDay
        } else if (r.recurrence === 'weekly') {
          const rDayOfWeek = new Date(r.date).getDay()
          matchesDate = now.getDay() === rDayOfWeek
        } else {
          matchesDate = r.date === curDateStr
        }

        if (matchesDate && r.time === curTimeStr) {
          const sessionKey = `alarm_fired_${r.id}_${curDateStr}_${curTimeStr}`
          if (!sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, 'true')

            // Dispatch global alarm popup and sound
            window.dispatchEvent(new CustomEvent('trigger-clock-alarm', { detail: r }))

            // Native Browser Push notification
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`⏰ Reminder: ${r.title}`, {
                  body: `${r.amount ? `Amount: ₹${r.amount} • ` : ''}${r.notes || 'Time to complete your scheduled task!'}`,
                  icon: '/favicon.svg',
                  tag: r.id,
                })
              } catch {}
            }
          }
        }
      })
    }

    const interval = setInterval(checkAlarms, 10000)
    checkAlarms()
    return () => clearInterval(interval)
  }, [reminders])

  const requestNotificationAccess = async () => {
    if (!('Notification' in window)) {
      alert('Your browser does not support web notifications.')
      return
    }
    try {
      const res = await Notification.requestPermission()
      setNotifPermission(res)
      if (res === 'granted') {
        new Notification('✅ Reminders & Alarms Enabled!', {
          body: 'You will receive exact-time clock alarms and calendar notifications.',
          icon: '/favicon.svg',
        })
      }
    } catch {}
  }

  const handleTestAlarm = () => {
    setTestingAlarm(true)
    playClockAlarmSequence()
    setTimeout(() => setTestingAlarm(false), 2000)
  }

  const handleOpenAddModal = (prefillDate = null) => {
    setEditTarget(null)
    setForm({
      title: '',
      category: 'bills',
      amount: '',
      date: prefillDate || selectedDate || todayStr,
      time: '09:00',
      recurrence: 'monthly',
      priority: 'normal',
      sound: true,
      syncGoogleCal: false,
      syncIcs: false,
      notes: '',
    })
    setShowAddModal(true)
  }

  const handleOpenEditModal = (r) => {
    setEditTarget(r)
    setForm({
      title: r.title || '',
      category: r.category || 'bills',
      amount: r.amount || '',
      date: r.date || todayStr,
      time: r.time || '09:00',
      recurrence: r.recurrence || 'none',
      priority: r.priority || 'normal',
      sound: r.sound !== false,
      syncGoogleCal: false,
      syncIcs: false,
      notes: r.notes || '',
    })
    setShowAddModal(true)
  }

  const handleSaveReminder = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return

    const payload = {
      id: editTarget?.id || `rem_${Date.now()}`,
      title: form.title.trim(),
      category: form.category,
      amount: form.amount ? parseFloat(form.amount) : null,
      date: form.date,
      time: form.time || '09:00',
      recurrence: form.recurrence,
      priority: form.priority,
      sound: form.sound,
      notes: form.notes.trim(),
      completed: editTarget ? editTarget.completed : false,
      updatedAt: new Date().toISOString(),
    }

    if (editTarget) {
      setReminders((prev) => prev.map((r) => (r.id === editTarget.id ? payload : r)))
    } else {
      setReminders((prev) => [payload, ...prev])
    }

    // Auto-trigger Phone Calendar / Alarm Sync if user checked it
    if (form.syncGoogleCal) {
      const gUrl = generateGoogleCalendarUrl({
        title: payload.title,
        description: payload.notes || (payload.amount ? `Amount: ₹${payload.amount}` : ''),
        date: payload.date,
        time: payload.time,
        recurrence: payload.recurrence,
      })
      window.open(gUrl, '_blank')
    }

    if (form.syncIcs) {
      downloadIcsFile(payload)
    }

    setShowAddModal(false)
    setEditTarget(null)
  }

  const handleToggleCompleted = (id) => {
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextState = !r.completed
          if (nextState) fireMilestoneConfetti()
          return { ...r, completed: nextState, completedAt: nextState ? new Date().toISOString() : null }
        }
        return r
      })
    )
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    setReminders((prev) => prev.filter((r) => r.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const handleApplyTemplate = (tmpl) => {
    setForm((prev) => ({
      ...prev,
      title: tmpl.title,
      category: tmpl.category,
      amount: tmpl.amount,
      time: tmpl.time,
      recurrence: tmpl.recurrence,
    }))
  }

  // Filtered Reminders List
  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      // Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = (r.title || '').toLowerCase().includes(q)
        const matchNotes = (r.notes || '').toLowerCase().includes(q)
        if (!matchTitle && !matchNotes) return false
      }

      // Category filter
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false

      // Status filter
      if (statusFilter === 'pending' && r.completed) return false
      if (statusFilter === 'completed' && !r.completed) return false
      if (statusFilter === 'today' && r.date !== todayStr) return false

      return true
    })
  }, [reminders, searchQuery, categoryFilter, statusFilter, todayStr])

  // Calendar calculations
  const calYear = currentCalMonth.getFullYear()
  const calMonth = currentCalMonth.getMonth()
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  // Map reminders to calendar days
  const reminderDayMap = useMemo(() => {
    const map = {}
    reminders.forEach((r) => {
      if (!r.date) return
      const [y, m, d] = r.date.split('-').map(Number)
      if (y === calYear && m - 1 === calMonth) {
        if (!map[d]) map[d] = []
        map[d].push(r)
      }
    })
    return map
  }, [reminders, calYear, calMonth])

  // Aggregate stats
  const pendingCount = reminders.filter((r) => !r.completed).length
  const todayCount = reminders.filter((r) => r.date === todayStr && !r.completed).length
  const completedCount = reminders.filter((r) => r.completed).length

  return (
    <Layout title="Reminders & Clock Alarms">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <BellRing className="h-6 w-6 text-amber-500 animate-pulse" />
            Reminders & Calendar Hub
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Exact-time Clock Alarms, Google Calendar integration & Recurring Bill reminders
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Notification Permission Prompt Button */}
          {notifPermission !== 'granted' && (
            <button
              onClick={requestNotificationAccess}
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-1.5 px-3 rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Enable Mobile Alarms
            </button>
          )}

          {/* Test Alarm Audio Button */}
          <button
            onClick={handleTestAlarm}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs"
            title="Test the clock alarm sound chime"
          >
            <Volume2 className={`h-3.5 w-3.5 text-blue-600 ${testingAlarm ? 'animate-spin' : ''}`} />
            <span>{testingAlarm ? 'Playing Chime...' : 'Test Sound'}</span>
          </button>

          {/* View Switcher: Calendar vs Agenda List */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'agenda'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Agenda List</span>
            </button>
          </div>

          {/* + Create Reminder Main Button */}
          <button
            onClick={() => handleOpenAddModal()}
            className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 shadow-md shadow-blue-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>New Reminder</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Due Today</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{todayCount}</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Exact time alerts armed</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Active Reminders</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{pendingCount}</p>
            <p className="text-[11px] text-blue-600 font-semibold mt-0.5">Bills, SIPs, EMIs & Tasks</p>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
            <CalendarIcon className="h-6 w-6" />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Completed</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{completedCount}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Paid & settled on time</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* ── VIEW 1: Interactive Monthly Calendar View ──────────────────────── */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          <div className="card p-4 sm:p-5">
            {/* Calendar Header Navigation */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {monthNames[calMonth]} {calYear}
                </h3>
                <button
                  onClick={() => {
                    setCurrentCalMonth(new Date())
                    setSelectedDate(todayStr)
                  }}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentCalMonth(new Date(calYear, calMonth - 1, 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400"
                  title="Previous Month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentCalMonth(new Date(calYear, calMonth + 1, 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400"
                  title="Next Month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-gray-400 mb-2">
              <span>SUN</span>
              <span>MON</span>
              <span>TUE</span>
              <span>WED</span>
              <span>THU</span>
              <span>FRI</span>
              <span>SAT</span>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Empty leading offset cells */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 sm:h-20 bg-gray-50/50 dark:bg-slate-900/30 rounded-xl" />
              ))}

              {/* Day Cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1
                const pad = (n) => String(n).padStart(2, '0')
                const cellDateStr = `${calYear}-${pad(calMonth + 1)}-${pad(dayNum)}`
                const isTodayCell = cellDateStr === todayStr
                const isSelectedCell = cellDateStr === selectedDate
                const dayReminders = reminderDayMap[dayNum] || []

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => setSelectedDate(cellDateStr)}
                    className={`h-16 sm:h-20 p-1.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative group ${
                      isSelectedCell
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-xs ring-2 ring-blue-500/20'
                        : isTodayCell
                        ? 'border-amber-400 bg-amber-50/30 dark:bg-amber-950/20 font-bold'
                        : 'border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold inline-flex items-center justify-center w-5 h-5 rounded-full ${
                          isTodayCell
                            ? 'bg-amber-500 text-white'
                            : isSelectedCell
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 dark:text-slate-300'
                        }`}
                      >
                        {dayNum}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenAddModal(cellDateStr)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-blue-600 transition-opacity"
                        title={`Add reminder on ${cellDateStr}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Reminders preview chips on this day */}
                    <div className="space-y-0.5 overflow-hidden">
                      {dayReminders.slice(0, 2).map((r) => (
                        <div
                          key={r.id}
                          className={`text-[9px] px-1 py-0.2 rounded truncate font-medium flex items-center gap-0.5 ${
                            r.completed
                              ? 'line-through text-gray-400 bg-gray-100 dark:bg-slate-800'
                              : r.priority === 'high'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          <span className="w-1 h-1 rounded-full bg-current"></span>
                          <span className="truncate">{r.time || ''} {r.title}</span>
                        </div>
                      ))}
                      {dayReminders.length > 2 && (
                        <p className="text-[8px] font-bold text-gray-400">+{dayReminders.length - 2} more</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected Date Reminders Schedule Bar */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                Schedule for {formatDate(selectedDate)} {selectedDate === todayStr && '(Today)'}
              </h4>
              <button
                onClick={() => handleOpenAddModal(selectedDate)}
                className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add on this Day
              </button>
            </div>

            {reminders.filter((r) => r.date === selectedDate).length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">
                No reminders scheduled for this date. Click "+ Add on this Day" to create one!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reminders
                  .filter((r) => r.date === selectedDate)
                  .map((r) => (
                    <ReminderCard
                      key={r.id}
                      reminder={r}
                      onToggle={handleToggleCompleted}
                      onEdit={handleOpenEditModal}
                      onDelete={(item) => setDeleteTarget(item)}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VIEW 2: Agenda & Timeline List View ────────────────────────────── */}
      {viewMode === 'agenda' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="card p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reminders by title or notes..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs text-gray-700 dark:text-slate-300"
              >
                <option value="all">All Categories</option>
                {REMINDER_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs text-gray-700 dark:text-slate-300"
              >
                <option value="all">All Status</option>
                <option value="today">Due Today</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Reminders Cards Grid */}
          {filteredReminders.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">
              <BellRing className="h-10 w-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-semibold">No reminders matching your filter.</p>
              <button
                onClick={() => handleOpenAddModal()}
                className="btn-primary text-xs py-1.5 px-3 mt-3 inline-flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Create New Reminder
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReminders.map((r) => (
                <ReminderCard
                  key={r.id}
                  reminder={r}
                  onToggle={handleToggleCompleted}
                  onEdit={handleOpenEditModal}
                  onDelete={(item) => setDeleteTarget(item)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit Reminder Modal ────────────────────────────────────── */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editTarget ? '✏️ Edit Reminder' : '➕ Create New Reminder & Clock Alarm'}
        size="lg"
      >
        <form onSubmit={handleSaveReminder} className="space-y-4">
          {/* Quick Presets Templates (only in Create mode) */}
          {!editTarget && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                ⚡ Quick Presets:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-700"
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Reminder Title *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Electricity Bill, Mutual Fund SIP, Doctor Appointment"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
              >
                {REMINDER_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Amount (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="₹ Amount to pay"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Date & Exact Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Scheduled Date *
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Exact Clock Time (Alarm) *
              </label>
              <input
                type="time"
                required
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Recurrence & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Repeat Schedule
              </label>
              <select
                value={form.recurrence}
                onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">One-Time (No Repeat)</option>
                <option value="daily">Every Day</option>
                <option value="weekly">Every Week</option>
                <option value="monthly">Every Month</option>
                <option value="yearly">Every Year</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="normal">Normal</option>
                <option value="high">🚨 High Priority Alert</option>
              </select>
            </div>
          </div>

          {/* Sound Alarm & Phone Clock Sync Controls */}
          <div className="space-y-2 p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="soundAlarm"
                checked={form.sound}
                onChange={(e) => setForm({ ...form, sound: e.target.checked })}
                className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="soundAlarm" className="text-xs font-semibold text-amber-900 dark:text-amber-200 cursor-pointer">
                🔔 Enable Audio Chime Alarm & Phone Vibration in-app
              </label>
            </div>

            <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                📱 Alarms when Phone is Locked / App is Off:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="syncGoogleCal"
                  checked={form.syncGoogleCal}
                  onChange={(e) => setForm({ ...form, syncGoogleCal: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="syncGoogleCal" className="text-[11px] font-medium text-gray-800 dark:text-slate-200 cursor-pointer">
                  Sync with Google Calendar Alarm (Rings Android / iOS phone hardware clock)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="syncIcs"
                  checked={form.syncIcs}
                  onChange={(e) => setForm({ ...form, syncIcs: e.target.checked })}
                  className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="syncIcs" className="text-[11px] font-medium text-gray-800 dark:text-slate-200 cursor-pointer">
                  Download Apple Calendar / Clock file (.ics alarm trigger)
                </label>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Notes / Account Details
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Consumer number, payment links, doctor notes..."
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="btn-secondary text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs py-2 px-5 font-bold shadow-md shadow-blue-500/20"
            >
              {editTarget ? 'Update Reminder' : 'Save & Set Alarm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Reminder"
        message={`Are you sure you want to delete the reminder "${deleteTarget?.title}"?`}
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  )
}

/**
 * Individual Reminder Card Component with Calendar Sync Buttons
 */
function ReminderCard({ reminder, onToggle, onEdit, onDelete }) {
  const r = reminder
  const cat = REMINDER_CATEGORIES.find((c) => c.id === r.category) || REMINDER_CATEGORIES[0]
  const Icon = cat.icon

  const googleCalUrl = generateGoogleCalendarUrl({
    title: r.title,
    description: r.notes || '',
    date: r.date,
    time: r.time,
    recurrence: r.recurrence || 'none',
  })

  return (
    <div
      className={`card p-4 flex flex-col justify-between border-l-4 transition-all duration-200 ${
        r.completed
          ? 'border-l-gray-300 dark:border-l-slate-700 opacity-70 bg-gray-50/50 dark:bg-slate-900/40'
          : r.priority === 'high'
          ? 'border-l-rose-500 shadow-xs'
          : 'border-l-blue-500 shadow-xs'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-2 rounded-xl flex-shrink-0 ${cat.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h4 className={`text-sm font-bold truncate ${r.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                {r.title}
              </h4>
              <p className="text-[10px] text-gray-400 capitalize">
                {cat.label} • Repeat: {r.recurrence}
              </p>
            </div>
          </div>

          <button
            onClick={() => onToggle(r.id)}
            className={`p-1.5 rounded-xl border transition-all ${
              r.completed
                ? 'bg-emerald-500 text-white border-emerald-600'
                : 'bg-gray-50 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 border-gray-200 dark:bg-slate-800'
            }`}
            title={r.completed ? 'Mark as Pending' : 'Mark as Completed'}
          >
            <Check className="h-4 w-4" />
          </button>
        </div>

        {/* Date, Time & Amount Pill */}
        <div className="grid grid-cols-2 gap-2 my-2.5 p-2 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-gray-700 dark:text-slate-300 font-semibold">
            <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            <span className="truncate">{r.time || '09:00'} ({formatDate(r.date)})</span>
          </div>
          <div className="text-right font-extrabold text-blue-600 dark:text-blue-400 truncate">
            {r.amount > 0 ? formatCurrency(r.amount) : 'Task / Reminder'}
          </div>
        </div>

        {r.notes && (
          <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2 mb-2">
            📝 {r.notes}
          </p>
        )}
      </div>

      {/* Card Actions & Calendar Export Links */}
      <div className="pt-2.5 mt-1 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1">
          {/* 1-Click Google Calendar */}
          <a
            href={googleCalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 flex items-center gap-1 transition-colors"
            title="Add event to Google Calendar with exact phone alarm"
          >
            <CalendarIcon className="h-3 w-3" />
            <span>Google Cal</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>

          {/* Download .ics for Phone Clock */}
          <button
            onClick={() => downloadIcsFile(r)}
            className="text-[10px] font-medium px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 flex items-center gap-1 transition-colors"
            title="Download .ics file to open directly in iOS / Android Clock Calendar"
          >
            <Smartphone className="h-3 w-3" />
            <span>.ics</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(r)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(r)}
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
