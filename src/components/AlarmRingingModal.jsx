import { useState, useEffect } from 'react'
import Modal from './Modal'
import { startClockAlarm, stopClockAlarm } from '../utils/alarmSound'
import { generateGoogleCalendarUrl, downloadIcsFile } from '../utils/calendarExport'
import { formatCurrency } from '../utils/formatCurrency'
import {
  BellRing,
  Clock,
  CheckCircle2,
  Calendar,
  Volume2,
  VolumeX,
  Smartphone,
  ExternalLink,
  RotateCcw,
} from 'lucide-react'

export default function AlarmRingingModal() {
  const [activeAlarm, setActiveAlarm] = useState(null)
  const [isMuted, setIsMuted] = useState(false)

  // Listen for global alarm trigger event
  useEffect(() => {
    const handleAlarmEvent = (e) => {
      const reminder = e.detail
      if (reminder) {
        setActiveAlarm(reminder)
        setIsMuted(false)
        if (reminder.sound !== false) {
          startClockAlarm(10) // 10 cycles of chime
        }
      }
    }

    window.addEventListener('trigger-clock-alarm', handleAlarmEvent)
    return () => {
      window.removeEventListener('trigger-clock-alarm', handleAlarmEvent)
    }
  }, [])

  const handleDismiss = () => {
    stopClockAlarm()
    setActiveAlarm(null)
  }

  const handleMute = () => {
    stopClockAlarm()
    setIsMuted(true)
  }

  const handleSnooze = (minutes = 5) => {
    stopClockAlarm()
    if (activeAlarm) {
      // Schedule next alarm in N minutes
      const snoozeTime = new Date(Date.now() + minutes * 60 * 1000)
      const pad = (n) => String(n).padStart(2, '0')
      const timeStr = `${pad(snoozeTime.getHours())}:${pad(snoozeTime.getMinutes())}`
      const dateStr = snoozeTime.toISOString().slice(0, 10)

      const snoozedItem = {
        ...activeAlarm,
        id: `snoozed_${Date.now()}`,
        time: timeStr,
        date: dateStr,
        isSnoozed: true,
      }

      // Dispatch event to save snoozed item
      window.dispatchEvent(new CustomEvent('reminder-snoozed', { detail: snoozedItem }))
    }
    setActiveAlarm(null)
  }

  const handleMarkDone = () => {
    stopClockAlarm()
    if (activeAlarm) {
      window.dispatchEvent(new CustomEvent('reminder-completed', { detail: activeAlarm }))
    }
    setActiveAlarm(null)
  }

  if (!activeAlarm) return null

  const googleCalUrl = generateGoogleCalendarUrl({
    title: activeAlarm.title,
    description: activeAlarm.notes || '',
    date: activeAlarm.date,
    time: activeAlarm.time,
    recurrence: activeAlarm.recurrence || 'none',
  })

  return (
    <Modal
      isOpen={Boolean(activeAlarm)}
      onClose={handleDismiss}
      title="⏰ Reminder Alarm Triggered!"
      size="sm"
    >
      <div className="space-y-4 text-center py-2">
        {/* Pulsing Alarm Animation */}
        <div className="relative inline-flex items-center justify-center p-4 rounded-full bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-400 text-amber-600 dark:text-amber-300">
          <BellRing className="h-10 w-10 animate-bounce" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
          </span>
        </div>

        <div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
            {activeAlarm.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 flex items-center justify-center gap-1.5 font-medium">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span>Scheduled for {activeAlarm.time || 'now'} ({activeAlarm.date})</span>
          </p>
          {activeAlarm.amount > 0 && (
            <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400 mt-2">
              {formatCurrency(activeAlarm.amount)}
            </p>
          )}
          {activeAlarm.notes && (
            <p className="text-xs bg-gray-50 dark:bg-slate-800 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-300 mt-2 text-left">
              📝 {activeAlarm.notes}
            </p>
          )}
        </div>

        {/* Alarm Controls */}
        <div className="flex items-center justify-center gap-2 pt-1">
          {!isMuted ? (
            <button
              onClick={handleMute}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <VolumeX className="h-3.5 w-3.5 text-gray-500" />
              Mute Chime
            </button>
          ) : (
            <span className="text-[11px] text-gray-400">Chime Muted</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={() => handleSnooze(5)}
            className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
            title="Remind again in 5 minutes"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
            Snooze (5 min)
          </button>
          <button
            onClick={handleMarkDone}
            className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark Done
          </button>
        </div>

        {/* Sync to Native Phone Clock / Calendar */}
        <div className="pt-2 flex flex-col gap-1.5">
          <a
            href={googleCalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleDismiss}
            className="w-full text-xs font-semibold py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Open in Google Calendar (with Phone Alarm)</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <button
            onClick={() => {
              downloadIcsFile(activeAlarm)
              handleDismiss()
            }}
            className="w-full text-[11px] text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center gap-1 py-1"
          >
            <Smartphone className="h-3 w-3" />
            <span>Download .ics to Apple / Android Clock</span>
          </button>
        </div>
      </div>
    </Modal>
  )
}
