import type { Certification } from '../data/types'
import { StatusPill } from './StatusPill'
import { MasteryBar } from './MasteryBar'
import {
  CalendarPinIcon,
  PlayIcon,
  BookIcon,
  TrendUpIcon,
  ChevronRightIcon,
  ExternalIcon,
  TargetIcon,
  CheckCircleIcon,
} from '../lib/icons'
import { lastAttempt, scoreTrend, readiness } from '../lib/metrics'
import { countdownMagnitude, formatDate, formatFullDate } from '../lib/format'
import styles from './FocusCert.module.css'

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

export function FocusCert({
  cert,
  all,
  onSelect,
}: {
  cert: Certification
  all: Certification[]
  onSelect: (id: string) => void
}) {
  const last = lastAttempt(cert)
  const trend = scoreTrend(cert)
  const ready = readiness(cert)
  const course = cert.materials.find((m) => m.type === 'course')
  const isPassed = cert.status === 'passed'

  const byMastery = [...cert.domains].sort((a, b) => a.mastery - b.mastery)
  const weak = byMastery.filter((d) => d.mastery < cert.passingScore)
  const thinnest = byMastery[0]

  return (
    <section className={styles.hero} aria-labelledby="focus-title">
      <div className={styles.top}>
        <label className={styles.switcher}>
          <span className={styles.switcherLabel}>Currently studying</span>
          <span className={styles.selectWrap}>
            <select
              value={cert.id}
              onChange={(e) => onSelect(e.target.value)}
              aria-label="Switch the certification in focus"
            >
              {all.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.provider} · {c.name}
                </option>
              ))}
            </select>
            <ChevronRightIcon size={16} className={styles.selectChevron} />
          </span>
        </label>
      </div>

      <div className={styles.body}>
        <div className={styles.titleBlock}>
          <p className={styles.provider}>{cert.provider}</p>
          <h1 id="focus-title" className={styles.name}>
            {cert.name}
          </h1>
          <div className={styles.meta}>
            <StatusPill status={cert.status} />
            {isPassed ? (
              <span className={styles.countdown}>
                <CheckCircleIcon size={15} />
                {cert.examDate
                  ? `Earned ${formatFullDate(cert.examDate)}`
                  : 'Certified'}
              </span>
            ) : cert.examDate ? (
              <span className={styles.countdown}>
                <CalendarPinIcon size={15} />
                Exam {countdownChip(cert.examDate)} · {formatDate(cert.examDate)}
              </span>
            ) : (
              <span className={styles.countdown} data-muted="true">
                <CalendarPinIcon size={15} />
                No exam date set
              </span>
            )}
          </div>

          <p className={styles.hint}>
            <TargetIcon size={16} className={styles.hintIcon} />
            <span>
              {isPassed ? (
                <>
                  This certification is complete
                  {cert.achievedScore != null ? (
                    <>
                      {' '}
                      — passed at{' '}
                      <strong>{cert.achievedScore}%</strong>.
                    </>
                  ) : (
                    <>. Your materials stay here for reference.</>
                  )}
                </>
              ) : !last ? (
                <>Take a practice test to see which topics need the most work.</>
              ) : weak.length === 0 ? (
                <>
                  Every topic is above the passing line — you're ready. A last
                  review of{' '}
                  <strong>{thinnest.name}</strong> ({thinnest.mastery}%) locks it
                  in.
                </>
              ) : (
                <>
                  <strong className={styles.hintCount}>
                    {weak.length} {weak.length === 1 ? 'topic' : 'topics'}
                  </strong>{' '}
                  still under the line —{' '}
                  <strong>{joinNames(weak.slice(0, 2).map((d) => d.name))}</strong>
                  {weak.length > 2 ? ' need the most work.' : ' to tighten up.'}
                </>
              )}
            </span>
          </p>
        </div>

        <div className={styles.readiness}>
          {isPassed ? (
            <>
              <div className={styles.readinessHead}>
                <span className={styles.readyBadge} data-band="ready">
                  Certified
                </span>
              </div>
              {cert.achievedScore != null ? (
                <div className={styles.scoreLine}>
                  <span className={`${styles.score} tnum`}>
                    {cert.achievedScore}
                    <span className={styles.pct}>%</span>
                  </span>
                  <span className={styles.scoreMeta}>
                    <span>exam score</span>
                  </span>
                </div>
              ) : (
                <p className={styles.passNote}>
                  {cert.examDate
                    ? `Earned ${formatFullDate(cert.examDate)}`
                    : 'Complete'}
                </p>
              )}
              {course && (
                <div className={styles.actions}>
                  <a
                    className={styles.secondary}
                    href={course.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <BookIcon size={17} />
                    Open course
                  </a>
                </div>
              )}
            </>
          ) : (
            <>
              <div className={styles.readinessHead}>
                <span className={styles.readyBadge} data-band={ready.band}>
                  {ready.label}
                </span>
              </div>

              {last ? (
                <>
                  <div className={styles.scoreLine}>
                    <span className={`${styles.score} tnum`}>
                      {last.score}
                      <span className={styles.pct}>%</span>
                    </span>
                    <span className={styles.scoreMeta}>
                      <span>last practice</span>
                      {trend !== undefined && trend !== 0 && (
                        <span
                          className={styles.trend}
                          data-dir={trend > 0 ? 'up' : 'down'}
                        >
                          <TrendUpIcon size={14} />
                          {trend > 0 ? '+' : ''}
                          {trend} pts
                        </span>
                      )}
                    </span>
                  </div>
                  <MasteryBar
                    value={last.score}
                    marker={cert.passingScore}
                    tone={last.score >= cert.passingScore ? 'strong' : 'weak'}
                    height={10}
                  />
                  <p className={styles.passNote}>
                    <span className="tnum">pass ≥ {cert.passingScore}%</span>
                  </p>
                </>
              ) : (
                <p className={styles.noScore}>
                  No practice scores yet — take your first to see where you stand.
                </p>
              )}

              <div className={styles.actions}>
                <a
                  className={styles.primary}
                  href={last?.url ?? course?.url ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                >
                  <PlayIcon size={18} />
                  {last ? 'Start practice test' : 'Take first practice test'}
                  <ExternalIcon size={15} className={styles.extIcon} />
                </a>
                {course && (
                  <a
                    className={styles.secondary}
                    href={course.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <BookIcon size={17} />
                    Open course
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function countdownChip(iso: string): string {
  const { value, unit } = countdownMagnitude(iso)
  return `in ${value} ${unit}`
}
