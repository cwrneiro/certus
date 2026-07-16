import { useMemo } from 'react'
import type { Certification, CertPatch } from '../data/types'
import { FocusCert } from '../components/FocusCert'
import { TopicsToStudy } from '../components/TopicsToStudy'
import { PracticeTests } from '../components/PracticeTests'
import { StudyMaterials } from '../components/StudyMaterials'
import { OtherCertifications } from '../components/OtherCertifications'
import { greeting } from '../lib/format'
import { CheckCircleIcon } from '../lib/icons'
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
  onUpdate,
  onReplace,
}: {
  certs: Certification[]
  focusId: string
  onFocus: (id: string) => void
  onUpdate: (id: string, patch: CertPatch) => Promise<Certification>
  onReplace: (cert: Certification) => void
}) {
  // The dashboard is the study workspace — it only ever shows certs you're
  // still working toward. Earned ones live on the Certifications page.
  const studying = useMemo(
    () => certs.filter((c) => c.status !== 'passed'),
    [certs],
  )

  const focusCert = useMemo(
    () =>
      studying.find((c) => c.id === focusId) ??
      [...studying].sort((a, b) => ORDER[a.status] - ORDER[b.status])[0],
    [studying, focusId],
  )

  const others = useMemo(
    () =>
      studying
        .filter((c) => c.id !== focusCert?.id)
        .sort((a, b) => ORDER[a.status] - ORDER[b.status]),
    [studying, focusCert],
  )

  const activeCount = studying.filter(
    (c) => c.status === 'in-progress' || c.status === 'scheduled',
  ).length

  const focusMinutes = studying.reduce(
    (sum, c) => sum + (c.focusMinutesThisWeek ?? 0),
    0,
  )

  const earnedCount = certs.length - studying.length

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <p className={styles.greeting}>{greeting()}</p>
          <p className={styles.subline}>Here's where your study stands today.</p>
        </div>
        {focusCert && (
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
        )}
      </header>

      {focusCert ? (
        <>
          <FocusCert cert={focusCert} all={studying} onSelect={onFocus} />

          <div className={styles.columns}>
            <TopicsToStudy cert={focusCert} onUpdate={onUpdate} />
            <aside className={styles.rail}>
              <PracticeTests
                cert={focusCert}
                onUpdate={onUpdate}
                onReplace={onReplace}
              />
              <StudyMaterials cert={focusCert} onUpdate={onUpdate} />
            </aside>
          </div>

          <OtherCertifications certs={others} onSelect={onFocus} />
        </>
      ) : (
        <section className={styles.caughtUp}>
          <div className={styles.caughtUpMark} aria-hidden="true">
            <CheckCircleIcon size={30} />
          </div>
          <h1 className={styles.caughtUpTitle}>You're all caught up</h1>
          <p className={styles.caughtUpBody}>
            {earnedCount > 0 ? (
              <>
                Every certification you're tracking is earned
                {earnedCount === 1 ? '' : ` — all ${earnedCount} of them`}.
                See them on the Certifications page, or add a new one to start
                studying again.
              </>
            ) : (
              <>Add a certification to make this its study home.</>
            )}
          </p>
        </section>
      )}
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
