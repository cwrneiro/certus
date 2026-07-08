import type { Certification } from '../data/types'
import { StatusPill } from './StatusPill'
import { MasteryBar } from './MasteryBar'
import { CheckIcon, ArrowRightIcon, AlertIcon, ExternalIcon } from '../lib/icons'
import {
  lastAttempt,
  weightedMastery,
  masteryBand,
  readiness,
} from '../lib/metrics'
import { countdownMagnitude, formatFullDate } from '../lib/format'
import styles from './CertCard.module.css'

export function CertCard({
  cert,
  onOpen,
  index = 0,
}: {
  cert: Certification
  onOpen: (id: string) => void
  index?: number
}) {
  const last = lastAttempt(cert)
  const ready = readiness(cert)
  const hasData = cert.attempts.length > 0
  const weak = cert.domains.filter((d) => d.mastery < cert.passingScore).length

  const bar = barData(cert)

  return (
    <div className={styles.card} style={{ '--i': index } as React.CSSProperties}>
      <button
        type="button"
        className={styles.openBtn}
        onClick={() => onOpen(cert.id)}
        aria-label={`Open ${cert.provider} ${cert.name} in the dashboard`}
      />
      <div className={styles.head}>
        <StatusPill status={cert.status} size="sm" />
        {cert.credentialUrl ? (
          <a
            className={styles.cred}
            href={cert.credentialUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Credential
            <ExternalIcon size={13} />
          </a>
        ) : (
          <ArrowRightIcon size={16} className={styles.go} />
        )}
      </div>

      <div className={styles.titleBlock}>
        <p className={styles.provider}>{cert.provider}</p>
        <p className={styles.name}>{cert.name}</p>
      </div>

      <p className={styles.meta}>{metaLine(cert, last?.score)}</p>

      {bar && (
        <div className={styles.progress}>
          <div className={styles.barRow}>
            <span className={styles.barLabel}>{bar.label}</span>
            {bar.value !== null && (
              <span className={`${styles.barVal} tnum`}>{bar.value}%</span>
            )}
          </div>
          <MasteryBar
            value={bar.value ?? 0}
            marker={bar.value === null ? undefined : cert.passingScore}
            tone={bar.tone}
            height={8}
            delay={120 + index * 40}
          />
        </div>
      )}

      <div className={styles.foot} data-nobar={!bar}>
        {cert.status === 'passed' ? (
          <span className={styles.done}>
            <CheckIcon size={14} />
            Certified
          </span>
        ) : (
          <>
            <span className={styles.ready} data-band={ready.band}>
              {ready.label}
            </span>
            {hasData && weak > 0 && (
              <span className={styles.weak}>
                <AlertIcon size={13} />
                {weak} under the line
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function barData(cert: Certification): {
  label: string
  value: number | null
  tone: 'strong' | 'fair' | 'weak' | 'muted'
} | null {
  if (cert.status === 'passed') {
    // Earned certs without a recorded score show no bar — the "Certified"
    // footer and earned date carry the meaning.
    if (cert.achievedScore == null) return null
    return { label: 'Exam score', value: cert.achievedScore, tone: 'strong' }
  }
  if (cert.attempts.length === 0) {
    return { label: 'Not started', value: null, tone: 'muted' }
  }
  const weighted = weightedMastery(cert)
  return {
    label: 'Domain mastery',
    value: weighted,
    tone: masteryBand(weighted, cert.passingScore),
  }
}

function metaLine(cert: Certification, lastScore?: number): string {
  if (cert.status === 'passed') {
    return cert.examDate ? `Earned ${formatFullDate(cert.examDate)}` : 'Certified'
  }
  if (cert.status === 'scheduled' && cert.examDate) {
    const { value, unit } = countdownMagnitude(cert.examDate)
    return `Exam in ${value} ${unit} · ${formatFullDate(cert.examDate)}`
  }
  if (cert.status === 'queued') return 'Not started yet'
  if (lastScore != null) return `Last practice ${lastScore}%`
  return 'Studying — no practice yet'
}
