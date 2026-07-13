import { useEffect, useRef, useState } from 'react'
import type { Certification, CertPatch } from '../data/types'
import { StatusPill } from './StatusPill'
import { MasteryBar } from './MasteryBar'
import {
  XIcon,
  TargetIcon,
  ExternalIcon,
  CheckCircleIcon,
  CalendarPinIcon,
  FileIcon,
  VideoIcon,
  NoteIcon,
  BookIcon,
  PlayIcon,
} from '../lib/icons'
import type { MaterialType } from '../data/types'
import {
  lastAttempt,
  sortedAttempts,
  weightedMastery,
  masteryBand,
  readiness,
} from '../lib/metrics'
import { countdownMagnitude, formatFullDate, formatDate } from '../lib/format'
import styles from './CertDetail.module.css'
import edit from './InlineEdit.module.css'

const MATERIAL_ICON: Record<MaterialType, typeof FileIcon> = {
  course: BookIcon,
  doc: FileIcon,
  video: VideoIcon,
  note: NoteIcon,
  practice: PlayIcon,
}

/**
 * Compact read-only detail dialog for a certification. Opened from a card on
 * the Certifications page — a quiet way to inspect one cert without leaving the
 * page. Closes on Escape, backdrop click, or the close button.
 */
export function CertDetail({
  cert,
  onClose,
  onUpdate,
}: {
  cert: Certification | null
  onClose: () => void
  onUpdate: (id: string, patch: CertPatch) => Promise<Certification>
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!cert) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [cert, onClose])

  if (!cert) return null

  const isPassed = cert.status === 'passed'
  const last = lastAttempt(cert)
  const ready = readiness(cert)
  const weighted = weightedMastery(cert)
  const attempts = [...sortedAttempts(cert)].reverse().slice(0, 4)
  const titleId = `cert-detail-${cert.id}`

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.head}>
          <StatusPill status={cert.status} />
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close details"
          >
            <XIcon size={18} />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.titleBlock}>
            <p className={styles.provider}>{cert.provider}</p>
            <h2 id={titleId} className={styles.name}>
              {cert.name}
            </h2>
          </div>

          <div className={styles.metaRow}>
            {isPassed ? (
              <span className={styles.metaItem}>
                <CheckCircleIcon size={15} />
                {cert.examDate ? `Earned ${formatFullDate(cert.examDate)}` : 'Certified'}
              </span>
            ) : cert.examDate ? (
              <span className={styles.metaItem}>
                <CalendarPinIcon size={15} />
                Exam in {countdownMagnitude(cert.examDate).value}{' '}
                {countdownMagnitude(cert.examDate).unit} · {formatFullDate(cert.examDate)}
              </span>
            ) : (
              <span className={styles.metaItem} data-muted="true">
                <CalendarPinIcon size={15} />
                No exam date set
              </span>
            )}
            <span className={styles.metaItem}>
              <TargetIcon size={15} />
              <span className="tnum">Pass ≥ {cert.passingScore}%</span>
            </span>
          </div>

          {/* Headline score / readiness */}
          <div className={styles.scoreCard}>
            {isPassed ? (
              cert.achievedScore != null ? (
                <>
                  <span className={`${styles.scoreVal} tnum`}>
                    {cert.achievedScore}
                    <span className={styles.pct}>%</span>
                  </span>
                  <span className={styles.scoreLabel}>exam score</span>
                </>
              ) : (
                <span className={styles.scoreNote}>
                  Certified — your materials stay here for reference.
                </span>
              )
            ) : last ? (
              <div className={styles.scoreReady}>
                <div className={styles.scoreReadyTop}>
                  <span className={styles.readyBadge} data-band={ready.band}>
                    {ready.label}
                  </span>
                  <span className={`${styles.scoreVal} tnum`}>
                    {last.score}
                    <span className={styles.pct}>%</span>
                    <span className={styles.scoreLabel}>last practice</span>
                  </span>
                </div>
                <MasteryBar
                  value={last.score}
                  marker={cert.passingScore}
                  tone={last.score >= cert.passingScore ? 'strong' : 'weak'}
                  height={10}
                />
              </div>
            ) : (
              <span className={styles.scoreNote}>
                No practice scores yet — take your first to see where you stand.
              </span>
            )}
          </div>

          {/* Domains */}
          {cert.domains.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h3 className={styles.sectionTitle}>Domains</h3>
                {!isPassed && (
                  <span className={styles.sectionMeta}>
                    <span className="tnum">{weighted}%</span> weighted mastery
                  </span>
                )}
              </div>
              <ul className={styles.domains}>
                {cert.domains.map((d) => (
                  <li key={d.id} className={styles.domain}>
                    <div className={styles.domainTop}>
                      <span className={styles.domainName}>{d.name}</span>
                      <span className={`${styles.domainVal} tnum`}>{d.mastery}%</span>
                    </div>
                    <MasteryBar
                      value={d.mastery}
                      marker={cert.passingScore}
                      tone={masteryBand(d.mastery, cert.passingScore)}
                      height={7}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Recent attempts */}
          {attempts.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Recent practice</h3>
              <ul className={styles.attempts}>
                {attempts.map((a) => (
                  <li key={a.id} className={styles.attempt}>
                    <span className={styles.attemptMeta}>
                      <span className={`${styles.attemptScore} tnum`} data-pass={a.score >= cert.passingScore}>
                        {a.score}%
                      </span>
                      <span className={styles.attemptProvider}>{a.provider}</span>
                    </span>
                    <span className={styles.attemptDate}>
                      <span className="tnum">{formatDate(a.date)}</span>
                      {a.url && (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.attemptLink}
                          aria-label={`Open ${a.provider} practice test`}
                        >
                          <ExternalIcon size={14} />
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Materials */}
          {cert.materials.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Study materials</h3>
              <ul className={styles.materials}>
                {cert.materials.map((m) => {
                  const Icon = MATERIAL_ICON[m.type] ?? FileIcon
                  return (
                    <li key={m.id}>
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.material}
                      >
                        <span className={styles.materialIcon} aria-hidden="true">
                          <Icon size={16} />
                        </span>
                        <span className={styles.materialText}>
                          <span className={styles.materialTitle}>{m.title}</span>
                          <span className={styles.materialSource}>{m.source}</span>
                        </span>
                        <ExternalIcon size={14} className={styles.materialGo} />
                      </a>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {isPassed && cert.credentialUrl && (
            <a
              href={cert.credentialUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.credential}
            >
              View credential
              <ExternalIcon size={15} />
            </a>
          )}

          {!isPassed && (
            <MarkPassed key={cert.id} cert={cert} onUpdate={onUpdate} />
          )}
        </div>
      </div>
    </div>
  )
}

function MarkPassed({
  cert,
  onUpdate,
}: {
  cert: Certification
  onUpdate: (id: string, patch: CertPatch) => Promise<Certification>
}) {
  const [open, setOpen] = useState(false)
  const [earnedDate, setEarnedDate] = useState(
    () => cert.examDate ?? new Date().toISOString().slice(0, 10),
  )
  const [score, setScore] = useState('')
  const [credentialUrl, setCredentialUrl] = useState(cert.credentialUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button type="button" className={edit.trigger} onClick={() => setOpen(true)}>
        <CheckCircleIcon size={16} />
        Passed the exam? Mark it done
      </button>
    )
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!earnedDate) {
      setError('Add the date you earned it.')
      return
    }
    const s = score.trim() ? Number(score) : undefined
    if (s !== undefined && (!Number.isFinite(s) || s < 0 || s > 100)) {
      setError('Score must be between 0 and 100 — or leave it blank.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onUpdate(cert.id, {
        status: 'passed',
        examDate: earnedDate,
        ...(s !== undefined ? { achievedScore: Math.round(s) } : {}),
        ...(credentialUrl.trim() ? { credentialUrl: credentialUrl.trim() } : {}),
      })
      // The updated cert re-renders the dialog in its passed state.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark as passed.')
      setSaving(false)
    }
  }

  return (
    <form className={edit.form} onSubmit={save} noValidate>
      <p className={edit.formTitle}>Mark as passed</p>

      <div className={edit.fieldRow}>
        <div className={edit.field}>
          <label className={edit.label} htmlFor="passed-date">
            Earned on
          </label>
          <input
            id="passed-date"
            type="date"
            className={edit.input}
            value={earnedDate}
            onChange={(e) => setEarnedDate(e.target.value)}
          />
        </div>
        <div className={edit.field} style={{ flex: 'none' }}>
          <label className={edit.label} htmlFor="passed-score">
            Score (optional)
          </label>
          <span className={edit.numWrap}>
            <input
              id="passed-score"
              className={`${edit.input} tnum`}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              inputMode="numeric"
              placeholder="—"
            />
            <span className={edit.numPct} aria-hidden="true">
              %
            </span>
          </span>
        </div>
      </div>

      <div className={edit.field}>
        <label className={edit.label} htmlFor="passed-credential">
          Credential link (optional)
        </label>
        <input
          id="passed-credential"
          className={edit.input}
          value={credentialUrl}
          onChange={(e) => setCredentialUrl(e.target.value)}
          placeholder="https://credentials…"
          inputMode="url"
        />
      </div>

      {error && (
        <p className={edit.error} role="alert">
          {error}
        </p>
      )}

      <div className={edit.actions}>
        <button
          type="button"
          className={edit.ghost}
          onClick={() => setOpen(false)}
          disabled={saving}
        >
          Cancel
        </button>
        <button type="submit" className={edit.primary} disabled={saving}>
          <CheckCircleIcon size={15} />
          {saving ? 'Saving…' : 'Mark passed'}
        </button>
      </div>
    </form>
  )
}
