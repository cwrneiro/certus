import { useState } from 'react'
import type { Certification, CertPatch } from '../data/types'
import { Sparkline } from './Sparkline'
import { sortedAttempts } from '../lib/metrics'
import { formatDate, formatRelativeAgo } from '../lib/format'
import { ExternalIcon, TargetIcon, PlusIcon } from '../lib/icons'
import styles from './PracticeTests.module.css'
import edit from './InlineEdit.module.css'

export function PracticeTests({
  cert,
  onUpdate,
}: {
  cert: Certification
  onUpdate: (id: string, patch: CertPatch) => Promise<Certification>
}) {
  const attempts = sortedAttempts(cert)
  const best = attempts.reduce((m, a) => Math.max(m, a.score), 0)
  const points = attempts.map((a) => ({ score: a.score, label: a.date }))
  const [logging, setLogging] = useState(false)

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

      {logging && (
        <LogAttemptForm cert={cert} onUpdate={onUpdate} onClose={() => setLogging(false)} />
      )}

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
        !logging && (
          <div className={styles.empty}>
            <TargetIcon size={22} />
            <p>No attempts logged yet. Your first score sets the baseline.</p>
          </div>
        )
      )}

      {!logging && (
        <button type="button" className={edit.trigger} onClick={() => setLogging(true)}>
          <PlusIcon size={16} />
          Log practice test
        </button>
      )}
    </section>
  )
}

function LogAttemptForm({
  cert,
  onUpdate,
  onClose,
}: {
  cert: Certification
  onUpdate: (id: string, patch: CertPatch) => Promise<Certification>
  onClose: () => void
}) {
  const [provider, setProvider] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [score, setScore] = useState('')
  const [url, setUrl] = useState('')
  // Per-topic results — blank leaves that topic's mastery unchanged.
  const [byDomain, setByDomain] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const s = Number(score)
    if (!Number.isFinite(s) || s < 0 || s > 100) {
      setError('Enter an overall score between 0 and 100.')
      return
    }
    if (!date) {
      setError('Add the date you took the test.')
      return
    }
    for (const d of cert.domains) {
      const raw = byDomain[d.id]?.trim()
      if (!raw) continue
      const v = Number(raw)
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        setError(`"${d.name}" needs a score between 0 and 100 (or leave it blank).`)
        return
      }
    }

    setSaving(true)
    setError(null)
    const patch: CertPatch = {
      attempts: [
        ...cert.attempts,
        {
          provider: provider.trim() || 'Practice test',
          date,
          score: Math.round(s),
          url: url.trim(),
        },
      ],
    }
    const touched = cert.domains.some((d) => byDomain[d.id]?.trim())
    if (touched) {
      patch.domains = cert.domains.map((d) => {
        const raw = byDomain[d.id]?.trim()
        return raw ? { ...d, mastery: Math.round(Number(raw)) } : d
      })
    }
    try {
      await onUpdate(cert.id, patch)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log the attempt.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={edit.form} onSubmit={save} noValidate>
      <p className={edit.formTitle}>Log a practice test</p>

      <div className={edit.fieldRow}>
        <div className={edit.field}>
          <label className={edit.label} htmlFor="attempt-provider">
            Provider
          </label>
          <input
            id="attempt-provider"
            className={edit.input}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="e.g. Udemy mock #1"
            autoFocus
          />
        </div>
        <div className={edit.field} style={{ flex: 'none', width: '9.5rem' }}>
          <label className={edit.label} htmlFor="attempt-date">
            Date
          </label>
          <input
            id="attempt-date"
            type="date"
            className={edit.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className={edit.field} style={{ flex: 'none' }}>
          <label className={edit.label} htmlFor="attempt-score">
            Score
          </label>
          <span className={edit.numWrap}>
            <input
              id="attempt-score"
              className={`${edit.input} tnum`}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              inputMode="numeric"
              placeholder="72"
            />
            <span className={edit.numPct} aria-hidden="true">
              %
            </span>
          </span>
        </div>
      </div>

      <div className={edit.field}>
        <label className={edit.label} htmlFor="attempt-url">
          Link (optional)
        </label>
        <input
          id="attempt-url"
          className={edit.input}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          inputMode="url"
        />
      </div>

      {cert.domains.length > 0 && (
        <>
          <p className={edit.label}>Score by topic — blank keeps the current value</p>
          {cert.domains.map((d) => (
            <div key={d.id} className={edit.row}>
              <span className={styles.domainLabel}>{d.name}</span>
              <span className={edit.numWrap}>
                <input
                  className={`${edit.input} tnum`}
                  value={byDomain[d.id] ?? ''}
                  onChange={(e) =>
                    setByDomain((prev) => ({ ...prev, [d.id]: e.target.value }))
                  }
                  inputMode="numeric"
                  placeholder={String(d.mastery)}
                  aria-label={`${d.name} score, percent`}
                />
                <span className={edit.numPct} aria-hidden="true">
                  %
                </span>
              </span>
            </div>
          ))}
        </>
      )}

      {error && (
        <p className={edit.error} role="alert">
          {error}
        </p>
      )}

      <div className={edit.actions}>
        <button type="button" className={edit.ghost} onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className={edit.primary} disabled={saving}>
          {saving ? 'Saving…' : 'Log attempt'}
        </button>
      </div>
    </form>
  )
}
