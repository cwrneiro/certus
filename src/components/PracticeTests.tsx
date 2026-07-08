import type { Certification } from '../data/types'
import { Sparkline } from './Sparkline'
import { sortedAttempts } from '../lib/metrics'
import { formatDate, formatRelativeAgo } from '../lib/format'
import { ExternalIcon, TargetIcon } from '../lib/icons'
import styles from './PracticeTests.module.css'

export function PracticeTests({ cert }: { cert: Certification }) {
  const attempts = sortedAttempts(cert)
  const best = attempts.reduce((m, a) => Math.max(m, a.score), 0)
  const points = attempts.map((a) => ({ score: a.score, label: a.date }))

  return (
    <section className={styles.card} aria-labelledby="practice-heading">
      <header className={styles.head}>
        <h2 id="practice-heading" className={styles.title}>
          Practice tests
        </h2>
        {attempts.length > 0 && (
          <span className={styles.summary}>
            <span className="tnum">
              Best {best}% · {attempts.length}{' '}
              {attempts.length === 1 ? 'attempt' : 'attempts'}
            </span>
          </span>
        )}
      </header>

      {attempts.length > 0 ? (
        <>
          <div className={styles.trendRow}>
            <Sparkline points={points} passing={cert.passingScore} />
            <p className={styles.trendNote}>
              <span className="tnum">Passing line {cert.passingScore}%</span>
            </p>
          </div>

          <ol className={styles.attempts}>
            {[...attempts].reverse().map((a, i) => {
              const passed = a.score >= cert.passingScore
              return (
                <li key={a.id} className={styles.attempt}>
                  <span
                    className={`${styles.attemptScore} tnum`}
                    data-passed={passed}
                    data-latest={i === 0}
                  >
                    {a.score}
                    <span className={styles.attemptPct}>%</span>
                  </span>
                  <span className={styles.attemptMeta}>
                    <span className={styles.attemptProvider}>{a.provider}</span>
                    <span className={styles.attemptDate}>
                      {formatDate(a.date)} · {formatRelativeAgo(a.date)}
                    </span>
                  </span>
                  <a
                    className={styles.retake}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${a.provider} practice test`}
                  >
                    <ExternalIcon size={16} />
                  </a>
                </li>
              )
            })}
          </ol>
        </>
      ) : (
        <div className={styles.empty}>
          <TargetIcon size={22} />
          <p>No attempts logged yet. Your first score sets the baseline.</p>
        </div>
      )}
    </section>
  )
}
