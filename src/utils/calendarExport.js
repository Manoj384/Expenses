/**
 * Calendar & Phone Clock Alarm Integrations
 * 1. Generates 1-Click Google Calendar event with alarm notifications
 * 2. Generates standard iCalendar (.ics) files for Apple Calendar, Outlook, and Android Clock apps
 */

function formatIsoForCalendar(dateStr, timeStr) {
  // dateStr: YYYY-MM-DD, timeStr: HH:mm
  const [year, month, day] = (dateStr || '').split('-').map(Number)
  const [hour = 9, minute = 0] = (timeStr || '09:00').split(':').map(Number)

  const d = new Date(year, month - 1, day, hour, minute)
  const pad = (n) => String(n).padStart(2, '0')

  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

/**
 * 1. Generate direct Google Calendar Event URL
 */
export function generateGoogleCalendarUrl({
  title = 'Reminder',
  description = '',
  date,
  time = '09:00',
  durationMinutes = 30,
  recurrence = 'none', // 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
}) {
  const startIso = formatIsoForCalendar(date, time)

  // End time is start + duration
  const [year, month, day] = (date || '').split('-').map(Number)
  const [hour = 9, minute = 0] = (time || '09:00').split(':').map(Number)
  const endDate = new Date(year, month - 1, day, hour, minute + durationMinutes)
  const pad = (n) => String(n).padStart(2, '0')
  const endIso = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`

  let recurRule = ''
  if (recurrence === 'daily') recurRule = '&recur=RRULE:FREQ=DAILY'
  else if (recurrence === 'weekly') recurRule = '&recur=RRULE:FREQ=WEEKLY'
  else if (recurrence === 'monthly') recurRule = '&recur=RRULE:FREQ=MONTHLY'
  else if (recurrence === 'yearly') recurRule = '&recur=RRULE:FREQ=YEARLY'

  const fullDesc = `${description}\n\n🔔 Created via Personal Wealth & Expense Tracker`.trim()

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `🔔 ${title}`,
    details: fullDesc,
    dates: `${startIso}/${endIso}`,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}${recurRule}`
}

/**
 * 2. Generate standard iCalendar (.ics) content for Apple Calendar, Android Clock, and Outlook
 */
export function generateIcsContent({
  title = 'Reminder',
  description = '',
  date,
  time = '09:00',
  durationMinutes = 30,
  recurrence = 'none',
  alarmMinutesBefore = 10,
}) {
  const startIso = formatIsoForCalendar(date, time)
  const [year, month, day] = (date || '').split('-').map(Number)
  const [hour = 9, minute = 0] = (time || '09:00').split(':').map(Number)
  const endDate = new Date(year, month - 1, day, hour, minute + durationMinutes)
  const pad = (n) => String(n).padStart(2, '0')
  const endIso = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`

  const uid = `reminder-${Date.now()}@financetracker.app`

  let rruleLine = ''
  if (recurrence === 'daily') rruleLine = 'RRULE:FREQ=DAILY\r\n'
  else if (recurrence === 'weekly') rruleLine = 'RRULE:FREQ=WEEKLY\r\n'
  else if (recurrence === 'monthly') rruleLine = 'RRULE:FREQ=MONTHLY\r\n'
  else if (recurrence === 'yearly') rruleLine = 'RRULE:FREQ=YEARLY\r\n'

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Personal Wealth Tracker//Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${startIso}Z`,
    `DTSTART:${startIso}`,
    `DTEND:${endIso}`,
    `SUMMARY:🔔 ${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    rruleLine.trim(),
    'STATUS:CONFIRMED',
    // Embedded VALARM for hardware clock/phone ringing
    'BEGIN:VALARM',
    `TRIGGER:-PT${alarmMinutesBefore}M`,
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${title}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT0M',
    'ACTION:AUDIO',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
}

/**
 * 3. Trigger direct download / open of .ics file for Phone Calendar & Clock
 */
export function downloadIcsFile(reminder) {
  const icsText = generateIcsContent(reminder)
  const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `${(reminder.title || 'reminder').toLowerCase().replace(/\s+/g, '_')}.ics`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
