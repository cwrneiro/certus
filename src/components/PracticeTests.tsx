import { useState } from 'react'
import type { Certification, CertPatch } from '../data/types'
import { Sparkline } from './Sparkline'
import { PracticeQuiz } from './PracticeQuiz'
import { generateQuiz } from '../lib/api'
import { sortedAttempts } from '../lib/metrics'
import { formatDate, formatRelativeAgo } from '../lib/format'
import { ExternalIcon, TargetIcon, PlusIcon, PlayIcon } from '../lib/icons'
import styles from './PracticeTests.module.css'
import edit from './InlineEdit.module.css'

export function PracticeTests({
  cert,
  onUpdate,
  onReplace,
}: {
  cert: Certification
  onUpdate: (id: string, patch: CertPatch) => Promise<Certification>
  /** Swap a full cert into app state — used after quiz generation. */
  onReplace: (cert: Certification) => void
}) {
  const attempts = sortedAttempts(cert)
  const best = attempts.reduce((m, a) => Math.max(m, a.score), 0)
  const points = attempts.map((a) => ({ score: a.score, label: a.date }))
  const [logging, setLogging] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const hasQuiz = cert.quizQuestions.length > 0

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

      {/* In-app quiz built from the exam guide — the primary way to practice. */}
      <QuizPanel
        cert={cert}
        hasQuiz={hasQuiz}
        onTake={() => setQuizOpen(true)}
        generating={generating}
        onGenerate={() => setGenerating(true)}
      />
      {generating && (
        <GenerateQuizForm
          cert={cert}
          onReplace={onReplace}
          onClose={() => setGenerating(false)}
        />
      )}
      {quizOpen && (
        <PracticeQuiz
          cert={cert}
          onUpdate={onUpdate}
          onClose={() => setQuizOpen(false)}
        />
      )}

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
          Log an external practice test
        </button>
      )}
    </section>
  )
}

/**
 * The in-app quiz call-to-action. With a question bank: a primary "Take
 * practice test" button. Without one: an invitation to build one from the
 * exam guide. Hidden while the generate form is open.
 */
function QuizPanel({
  cert,
  hasQuiz,
  onTake,
  generating,
  onGenerate,
}: {
  cert: Certification
  hasQuiz: boolean
  onTake: () => void
  generating: boolean
  onGenerate: () => void
}) {
  if (generating) return null

  if (hasQuiz) {
    const n = cert.quizQuestions.length
    return (
      <div className={styles.quizPanel}>
        <button type="button" className={styles.takeQuiz} onClick={onTake}>
          <PlayIcon size={17} />
          Take practice test
          <span className={styles.takeQuizCount}>
            <span className="tnum">{n}</span> questions
          </span>
        </button>
        <button type="button" className={styles.regen} onClick={onGenerate}>
          Rebuild from guide
        </button>
      </div>
    )
  }

  return (
    <button type="button" className={styles.generateCard} onClick={onGenerate}>
      <span className={styles.generateIcon} aria-hidden="true">
        <TargetIcon size={20} />
      </span>
      <span className={styles.generateText}>
        <span className={styles.generateTitle}>Build a practice test</span>
        <span className={styles.generateBody}>
          Paste the exam guide — we'll write questions from its outline.
        </span>
      </span>
    </button>
  )
}

/** Paste an exam-guide URL; the backend fetches it and generates a quiz. */
function GenerateQuizForm({
  cert,
  onReplace,
  onClose,
}: {
  cert: Certification
  onReplace: (cert: Certification) => void
  onClose: () => void
}) {
  const [url, setUrl] = useState(cert.examGuideUrl ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const guide = url.trim()
    if (!/^https?:\/\//i.test(guide)) {
      setError('Paste a link to the exam guide (a PDF works best).')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const updated = await generateQuiz(cert.id, guide)
      onReplace(updated)
      onClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not build the practice test.',
      )
      setBusy(false)
    }
  }

  return (
    <form className={edit.form} onSubmit={submit} noValidate>
      <p className={edit.formTitle}>Build a practice test from the exam guide</p>

      <div className={edit.field}>
        <label className={edit.label} htmlFor="guide-url">
          Exam guide link
        </label>
        <input
          id="guide-url"
          className={edit.input}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…/exam-guide.pdf"
          inputMode="url"
          autoFocus
          disabled={busy}
        />
        <span className={edit.hint}>
          {busy
            ? 'Reading the guide and writing questions — this takes a moment…'
            : 'The outline and any sample questions shape the test. Existing topics keep their mastery.'}
        </span>
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
          onClick={onClose}
          disabled={busy}
        >
          Cancel
        </button>
        <button type="submit" className={edit.primary} disabled={busy}>
          <TargetIcon size={15} />
          {busy ? 'Generating…' : 'Generate test'}
        </button>
      </div>
    </form>
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
