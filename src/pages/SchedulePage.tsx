import { useMemo, useState } from 'react'
import type { Certification } from '../data/types'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { Segmented } from '../components/Segmented'
import { ScheduleCalendar } from '../components/ScheduleCalendar'
import {
  CalendarPinIcon,
  ArrowRightIcon,
  CheckIcon,
  ExternalIcon,
  ScheduleIcon,
} from '../lib/icons'
import {
  countdownMagnitude,
  formatFullDate,
  daysUntil,
} from '../lib/format'
import styles from './SchedulePage.module.css'

interface TimelineEvent {
  key: string
  date: string
  kind: 'practice' | 'passed'
  certName: string
  score: number
  passingScore: number
  provider: string
  url?: string
}

export function SchedulePage({
  certs,
  onOpen,
}: {
  certs: Certification[]
  onOpen: (id: string) => void
}) {
  const [view, setView] = useState<'calendar' | 'timeline'>('calendar')

  const upcoming = useMemo(
    () =>
      certs
        .filter(
          (c) =>
            c.status === 'scheduled' &&
            c.examDate &&
            daysUntil(c.examDate) >= 0,
        )
        .sort((a, b) => daysUntil(a.examDate!) - daysUntil(b.examDate!)),
    [certs],
  )

  const history = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = []
    for (const c of certs) {
      for (const a of c.attempts) {
        events.push({
          key: `${c.id}-${a.id}`,
          date: a.date,
          kind: 'practice',
          certName: c.shortName,
          score: a.score,
          passingScore: c.passingScore,
          provider: a.provider,
          url: a.url,
        })
      }
      if (c.status === 'passed' && c.examDate && c.achievedScore != null) {
        events.push({
          key: `${c.id}-exam`,
          date: c.examDate,
          kind: 'passed',
          certName: c.name,
          score: c.achievedScore,
          passingScore: c.passingScore,
          provider: c.provider,
        })
      }
    }
    return events.sort((a, b) => b.date.localeCompare(a.date))
  }, [certs])

  return (
    <div className={styles.page}>
      <PageHeader
        title="Schedule"
        subline="Your booked exams and the practice history behind them, in order."
      />

      <section aria-labelledby="upcoming-heading" className={styles.section}>
        <h2 id="upcoming-heading" className={styles.sectionHead}>
          Upcoming exams
        </h2>
        {upcoming.length > 0 ? (
          <ul className={styles.upcoming}>
            {upcoming.map((c) => {
              const { value, unit } = countdownMagnitude(c.examDate!)
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className={styles.examCard}
                    onClick={() => onOpen(c.id)}
                    aria-label={`Open ${c.provider} ${c.name} in the dashboard`}
                  >
                    <div className={styles.examCountdown}>
                      <span className={`${styles.examDays} tnum`}>{value}</span>
                      <span className={styles.examUnit}>{unit} away</span>
                    </div>
                    <div className={styles.examBody}>
                      <StatusPill status={c.status} size="sm" />
                      <p className={styles.examName}>{c.name}</p>
                      <p className={styles.examDate}>
                        <CalendarPinIcon size={14} />
                        {formatFullDate(c.examDate!)}
                      </p>
                    </div>
                    <ArrowRightIcon size={18} className={styles.examGo} />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className={styles.emptyRow}>
            <CalendarPinIcon size={18} className={styles.emptyIcon} />
            No exams booked yet — book one when you're ready, and it'll show up
            here.
          </div>
        )}
      </section>

      <section aria-labelledby="activity-heading" className={styles.section}>
        <div className={styles.sectionBar}>
          <h2 id="activity-heading" className={styles.sectionHead}>
            Activity
          </h2>
          <Segmented<'calendar' | 'timeline'>
            ariaLabel="Choose how to view your schedule"
            value={view}
            onChange={setView}
            options={[
              { value: 'calendar', label: 'Calendar' },
              { value: 'timeline', label: 'Timeline' },
            ]}
          />
        </div>

        {view === 'calendar' ? (
          <ScheduleCalendar certs={certs} onOpen={onOpen} />
        ) : history.length > 0 ? (
          <ol className={styles.timeline}>
            {history.map((e) => (
              <TimelineRow key={e.key} event={e} />
            ))}
          </ol>
        ) : (
          <div className={styles.emptyRow}>
            <ScheduleIcon size={18} className={styles.emptyIcon} />
            No practice tests logged yet. Take one and your progress will appear
            here.
          </div>
        )}
      </section>
    </div>
  )
}

function TimelineRow({ event }: { event: TimelineEvent }) {
  const passed = event.score >= event.passingScore
  const tone = event.kind === 'passed' ? 'passed' : passed ? 'pass' : 'below'

  const content = (
    <>
      <span className={styles.dot} data-tone={tone} aria-hidden="true">
        {event.kind === 'passed' && <CheckIcon size={12} />}
      </span>
      <div className={styles.eventBody}>
        <div className={styles.eventTop}>
          <span className={`${styles.score} tnum`} data-tone={tone}>
            {event.score}%
          </span>
          <span className={styles.eventLabel}>
            {event.kind === 'passed'
              ? `Passed ${event.certName}`
              : `Practice · ${event.certName}`}
          </span>
          {event.url && <ExternalIcon size={14} className={styles.eventExt} />}
        </div>
        <p className={styles.eventMeta}>
          <span className="tnum">{formatFullDate(event.date)}</span>
          <span aria-hidden="true">·</span>
          <span>{event.provider}</span>
          {event.kind === 'practice' && (
            <span className={styles.gap} data-tone={passed ? 'pass' : 'below'}>
              {passed ? '+' : ''}
              {event.score - event.passingScore} vs pass
            </span>
          )}
        </p>
      </div>
    </>
  )

  return (
    <li className={styles.event}>
      {event.url ? (
        <a
          className={styles.eventLink}
          href={event.url}
          target="_blank"
          rel="noreferrer"
        >
          {content}
        </a>
      ) : (
        <div className={styles.eventLink} data-static="true">
          {content}
        </div>
      )}
    </li>
  )
}
