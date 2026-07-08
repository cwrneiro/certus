import { useMemo } from 'react'
import type { Certification } from '../data/types'
import { FocusCert } from '../components/FocusCert'
import { TopicsToStudy } from '../components/TopicsToStudy'
import { PracticeTests } from '../components/PracticeTests'
import { StudyMaterials } from '../components/StudyMaterials'
import { OtherCertifications } from '../components/OtherCertifications'
import { greeting } from '../lib/format'
import styles from './DashboardPage.module.css'

const ORDER: Record<string, number> = {
  'in-progress': 0,
  scheduled: 1,
  queued: 2,
  passed: 3,
}

export function DashboardPage({
  certs,
  focusId,
  onFocus,
}: {
  certs: Certification[]
  focusId: string
  onFocus: (id: string) => void
}) {
  const focusCert = useMemo(
    () =>
      certs.find((c) => c.id === focusId) ??
      [...certs].sort((a, b) => ORDER[a.status] - ORDER[b.status])[0],
    [certs, focusId],
  )

  const others = useMemo(
    () =>
      certs
        .filter((c) => c.id !== focusCert?.id)
        .sort((a, b) => ORDER[a.status] - ORDER[b.status]),
    [certs, focusCert],
  )

  const activeCount = certs.filter(
    (c) => c.status === 'in-progress' || c.status === 'scheduled',
  ).length

  const focusMinutes = certs.reduce(
    (sum, c) => sum + (c.focusMinutesThisWeek ?? 0),
    0,
  )

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <p className={styles.greeting}>{greeting()}</p>
          <p className={styles.subline}>Here's where your study stands today.</p>
        </div>
        <dl className={styles.activity}>
          <div className={styles.stat}>
            <dt>In focus</dt>
            <dd className="tnum">
              {activeCount} active {activeCount === 1 ? 'cert' : 'certs'}
            </dd>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.stat}>
            <dt>This week</dt>
            <dd className="tnum">{formatMinutes(focusMinutes)} focused</dd>
          </div>
        </dl>
      </header>

      <FocusCert cert={focusCert} all={certs} onSelect={onFocus} />

      <div className={styles.columns}>
        <TopicsToStudy cert={focusCert} />
        <aside className={styles.rail}>
          <PracticeTests cert={focusCert} />
          <StudyMaterials cert={focusCert} />
        </aside>
      </div>

      <OtherCertifications certs={others} onSelect={onFocus} />
    </div>
  )
}

function formatMinutes(min: number): string {
  if (min <= 0) return '0m'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
