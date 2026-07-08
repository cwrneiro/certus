import { useMemo, useState } from 'react'
import type { Certification } from '../data/types'
import {
  CalendarPinIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalIcon,
} from '../lib/icons'
import { TODAY } from '../lib/format'
import styles from './ScheduleCalendar.module.css'

type Kind = 'booked' | 'passed' | 'practice'

interface CalEvent {
  id: string
  kind: Kind
  certId: string
  certName: string
  score?: number
  passingScore?: number
  url?: string
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]
const SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const monthFmt = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
})

function isoKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildWeeks(year: number, month: number): Date[][] {
  const startOffset = new Date(year, month, 1).getDay() // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const rows = Math.ceil((startOffset + daysInMonth) / 7)
  const gridStart = new Date(year, month, 1 - startOffset)
  const weeks: Date[][] = []
  for (let w = 0; w < rows; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(gridStart)
      day.setDate(gridStart.getDate() + w * 7 + d)
      week.push(day)
    }
    weeks.push(week)
  }
  return weeks
}

export function ScheduleCalendar({
  certs,
  onOpen,
}: {
  certs: Certification[]
  onOpen: (id: string) => void
}) {
  const today = TODAY
  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }))

  const events = useMemo(() => {
    const map: Record<string, CalEvent[]> = {}
    const push = (date: string, e: CalEvent) => {
      ;(map[date] ??= []).push(e)
    }
    for (const c of certs) {
      if (c.status === 'scheduled' && c.examDate) {
        push(c.examDate, {
          id: `${c.id}-booked`,
          kind: 'booked',
          certId: c.id,
          certName: c.name,
        })
      }
      if (c.status === 'passed' && c.examDate) {
        push(c.examDate, {
          id: `${c.id}-passed`,
          kind: 'passed',
          certId: c.id,
          certName: c.name,
          score: c.achievedScore,
        })
      }
      for (const a of c.attempts) {
        push(a.date, {
          id: `${c.id}-${a.id}`,
          kind: 'practice',
          certId: c.id,
          certName: c.shortName,
          score: a.score,
          passingScore: c.passingScore,
          url: a.url,
        })
      }
    }
    return map
  }, [certs])

  const weeks = useMemo(
    () => buildWeeks(cursor.year, cursor.month),
    [cursor],
  )
  const todayKey = isoKey(today)
  const isCurrentMonth =
    cursor.year === today.getFullYear() && cursor.month === today.getMonth()
  const monthLabel = monthFmt.format(new Date(cursor.year, cursor.month, 1))

  function shift(delta: number) {
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.bar}>
        <h3 className={styles.month} aria-live="polite">
          {monthLabel}
        </h3>
        <div className={styles.nav}>
          {!isCurrentMonth && (
            <button
              type="button"
              className={styles.todayBtn}
              onClick={() =>
                setCursor({
                  year: today.getFullYear(),
                  month: today.getMonth(),
                })
              }
            >
              Today
            </button>
          )}
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => shift(-1)}
            aria-label="Previous month"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => shift(1)}
            aria-label="Next month"
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>
      </div>

      <table className={styles.grid} key={`${cursor.year}-${cursor.month}`}>
        <caption className="visually-hidden">
          {monthLabel} — booked exams and practice tests
        </caption>
        <thead>
          <tr>
            {SHORT.map((s, i) => (
              <th key={s} scope="col">
                <span aria-hidden="true">{s}</span>
                <span className="visually-hidden">{WEEKDAYS[i]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={isoKey(week[0])}>
              {week.map((d) => {
                const key = isoKey(d)
                const inMonth = d.getMonth() === cursor.month
                const dayEvents = inMonth ? events[key] ?? [] : []
                const isToday = key === todayKey
                return (
                  <td
                    key={key}
                    data-outside={!inMonth || undefined}
                    aria-current={isToday ? 'date' : undefined}
                  >
                    <div className={styles.cell}>
                      <span className={styles.dayNum} data-today={isToday}>
                        {d.getDate()}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className={styles.events}>
                          {dayEvents.slice(0, 3).map((e) => (
                            <CalChip key={e.id} event={e} onOpen={onOpen} />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className={styles.more}>
                              +{dayEvents.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className={styles.legend}>
        <li className={styles.legendItem}>
          <span className={styles.swatch} data-kind="booked" aria-hidden="true">
            <CalendarPinIcon size={11} />
          </span>
          Booked exam
        </li>
        <li className={styles.legendItem}>
          <span className={styles.swatch} data-kind="passed" aria-hidden="true">
            <CheckIcon size={11} />
          </span>
          Passed
        </li>
        <li className={styles.legendItem}>
          <span className={styles.dotSwatch} data-tone="pass" aria-hidden="true" />
          Practice at/above line
        </li>
        <li className={styles.legendItem}>
          <span className={styles.dotSwatch} data-tone="below" aria-hidden="true" />
          Practice below line
        </li>
      </ul>
    </div>
  )
}

function CalChip({
  event,
  onOpen,
}: {
  event: CalEvent
  onOpen: (id: string) => void
}) {
  if (event.kind === 'booked') {
    return (
      <button
        type="button"
        className={styles.chip}
        data-kind="booked"
        onClick={() => onOpen(event.certId)}
        title={`Exam booked · ${event.certName}`}
      >
        <CalendarPinIcon size={12} className={styles.chipIcon} />
        <span className={styles.chipLabel}>Exam · {event.certName}</span>
      </button>
    )
  }
  if (event.kind === 'passed') {
    return (
      <button
        type="button"
        className={styles.chip}
        data-kind="passed"
        onClick={() => onOpen(event.certId)}
        title={
          event.score != null
            ? `Passed ${event.certName} · ${event.score}%`
            : `Passed ${event.certName}`
        }
      >
        <CheckIcon size={12} className={styles.chipIcon} />
        <span className={styles.chipLabel}>
          {event.score != null ? `Passed · ${event.score}%` : 'Passed'}
        </span>
      </button>
    )
  }

  const passed = (event.score ?? 0) >= (event.passingScore ?? 0)
  const tone = passed ? 'pass' : 'below'
  const label = `${event.score}% · ${event.certName}`
  const title = `Practice ${event.score}% · ${event.certName}`

  if (event.url && event.url !== '#') {
    return (
      <a
        className={styles.chip}
        data-tone={tone}
        href={event.url}
        target="_blank"
        rel="noreferrer"
        title={title}
      >
        <span className={styles.chipDot} data-tone={tone} aria-hidden="true" />
        <span className={styles.chipLabel}>{label}</span>
        <ExternalIcon size={11} className={styles.chipExt} />
      </a>
    )
  }
  return (
    <span className={styles.chip} data-tone={tone} data-static="true" title={title}>
      <span className={styles.chipDot} data-tone={tone} aria-hidden="true" />
      <span className={styles.chipLabel}>{label}</span>
    </span>
  )
}
