const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const APP_TIMEZONE = 'America/Los_Angeles'

// The API encodes wall-clock time in the app's own timezone (e.g.
// "2026-09-06T07:05:00-07:00"). Reading the digits straight out of the
// string keeps rendering identical no matter what timezone the viewer's
// machine is set to; going through Date getters would convert to the host
// timezone first and silently shift the displayed time.
const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/

function parseIsoParts(iso: string) {
  const match = ISO_PATTERN.exec(iso)
  if (!match) throw new Error(`Invalid ISO string: ${iso}`)
  const [, year, month, day, hours, minutes] = match
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hours: Number(hours ?? 0),
    minutes: Number(minutes ?? 0),
  }
}

function todayInAppTimezone(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(new Date())
}

function addDays(isoDate: string, delta: number): string {
  const { year, month, day } = parseIsoParts(isoDate)
  const shifted = new Date(year, month - 1, day + delta)
  const mm = String(shifted.getMonth() + 1).padStart(2, '0')
  const dd = String(shifted.getDate()).padStart(2, '0')
  return `${shifted.getFullYear()}-${mm}-${dd}`
}

/** '7:15 AM' from a datetime string. */
export function formatTime(iso: string): string {
  const { hours, minutes } = parseIsoParts(iso)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

/** 'Sep 14, 2025', used for vaccine dates and note stamps. */
export function formatDate(iso: string): string {
  const { year, month, day } = parseIsoParts(iso)
  return `${MONTHS[month - 1]} ${day}, ${year}`
}

/** 'Today', 'Yesterday', or 'Thursday, Sep 4'. */
export function formatDayHeading(iso: string): string {
  const datePart = iso.slice(0, 10)
  const today = todayInAppTimezone()

  if (datePart === today) return 'Today'
  if (datePart === addDays(today, -1)) return 'Yesterday'

  const { year, month, day } = parseIsoParts(datePart)
  const weekday = new Date(year, month - 1, day).getDay()
  return `${DAYS[weekday]}, ${MONTHS[month - 1]} ${day}`
}

export function formatStamp(iso: string): string {
  return `${formatDayHeading(iso)} at ${formatTime(iso)}`
}
