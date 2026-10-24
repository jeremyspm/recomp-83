// Dates are local calendar days stored as 'YYYY-MM-DD'. Arithmetic runs in UTC
// on those strings so daylight-saving shifts can never add or drop a day.

export const DAY_MS = 86_400_000
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (n: number) => String(n).padStart(2, '0')

export function localISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(s: string): number {
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function isISODate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseISO(s))
}

export function addDays(s: string, n: number): string {
  const d = new Date(parseISO(s) + n * DAY_MS)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseISO(to) - parseISO(from)) / DAY_MS)
}

export function weekdayOf(s: string): number {
  return new Date(parseISO(s)).getUTCDay()
}

/** 1-based protocol week containing `date` (Day 1 is the first day of week 1). */
export function weekOf(start: string, date: string): number {
  return Math.floor(daysBetween(start, date) / 7) + 1
}

export function fmtDay(s: string): string {
  const d = new Date(parseISO(s))
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function fmtClock(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  const h24 = Math.floor(m / 60)
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${pad(m % 60)} ${h24 < 12 ? 'AM' : 'PM'}`
}

export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(total / 60)}:${pad(total % 60)}`
}
