import type { Certification } from '../data/types'
import { StatusPill } from './StatusPill'
import { lastAttempt } from '../lib/metrics'
import { countdownMagnitude } from '../lib/format'
import { CheckIcon, ArrowRightIcon } from '../lib/icons'
import styles from './OtherCertifications.module.css'

export function OtherCertifications({
  certs,
  onSelect,
}: {
  certs: Certification[]
  onSelect: (id: string) => void
}) {
  if (certs.length === 0) return null

  return (
    <section className={styles.wrap} aria-labelledby="others-heading">
      <h2 id="others-heading" className={styles.heading}>
        Also tracking
      </h2>
      <ul className={styles.grid}>
        {certs.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={styles.tile}
              onClick={() => onSelect(c.id)}
              aria-label={`Focus on ${c.provider} ${c.name}`}
            >
              <div className={styles.tileHead}>
                <StatusPill status={c.status} size="sm" />
                <ArrowRightIcon size={16} className={styles.go} />
              </div>
              <p className={styles.provider}>{c.provider}</p>
              <p className={styles.name}>{c.name}</p>
              <p className={styles.stat}>{statLine(c)}</p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function statLine(c: Certification) {
  if (c.status === 'passed' && c.achievedScore != null) {
    return (
      <span className={styles.passed}>
        <CheckIcon size={14} />
        <span className="tnum">Passed at {c.achievedScore}%</span>
      </span>
    )
  }
  if (c.status === 'queued') {
    return <span className={styles.muted}>Not started yet</span>
  }
  const last = lastAttempt(c)
  if (c.examDate) {
    const { value, unit } = countdownMagnitude(c.examDate)
    return (
      <span className="tnum">
        {last ? `Last ${last.score}% · ` : ''}exam in {value} {unit}
      </span>
    )
  }
  return (
    <span className="tnum">
      {last ? `Last practice ${last.score}%` : 'No practice yet'}
    </span>
  )
}
