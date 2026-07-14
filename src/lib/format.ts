/* Date + number formatting helpers. "Today" is captured once at app load so
   every countdown and relative date reads consistently within a session. */

export const TODAY = new Date()

const MS_PER_DAY = 1000 * 60 * 60 * 24

export function daysUntil(iso: string): number {
  const target = new Date(iso + 'T00:00:00')
  const start = new Date(TODAY)
  start.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - start.getTime()) / MS_PER_DAY)
}

export function daysAgo(iso: string): number {
  return -daysUntil(iso)
}

const monthDay = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

const monthDayYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function formatDate(iso: string): string {
  return monthDay.format(new Date(iso + 'T00:00:00'))
}

export function formatFullDate(iso: string): string {
  return monthDayYear.format(new Date(iso + 'T00:00:00'))
}

/** Human countdown: "in 18 days", "tomorrow", "today", "3 days ago". */
export function countdownLabel(iso: string): string {
  const d = daysUntil(iso)
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  if (d === -1) return 'yesterday'
  if (d > 1) return `in ${d} days`
  return `${Math.abs(d)} days ago`
}

/** "18 days" / "3 weeks" — compact magnitude for the countdown chip. */
export function countdownMagnitude(iso: string): { value: string; unit: string } {
  const d = Math.abs(daysUntil(iso))
  if (d <= 21) return { value: String(d), unit: d === 1 ? 'day' : 'days' }
  if (d < 60) {
    const w = Math.round(d / 7)
    return { value: String(w), unit: w === 1 ? 'week' : 'weeks' }
  }
  const m = Math.round(d / 30)
  return { value: String(m), unit: m === 1 ? 'month' : 'months' }
}

export function formatRelativeAgo(iso: string): string {
  const d = daysAgo(iso)
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d} days ago`
  if (d < 14) return 'last week'
  if (d < 30) return `${Math.round(d / 7)} weeks ago`
  const m = Math.round(d / 30)
  return m === 1 ? 'a month ago' : `${m} months ago`
}

export function greeting(): string {
  const h = TODAY.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
