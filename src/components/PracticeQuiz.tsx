import { useEffect, useMemo, useState } from 'react'
import type { Certification, CertPatch, QuizQuestion } from '../data/types'
import {
  XIcon,
  CheckCircleIcon,
  CheckIcon,
  TargetIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from '../lib/icons'
import { MasteryBar } from './MasteryBar'
import { masteryBand } from '../lib/metrics'
import styles from './PracticeQuiz.module.css'

/**
 * A full-screen, distraction-free practice test built from the cert's
 * AI-generated questions — its own route (`#/quiz/<certId>`), no sidebar, one
 * question at a time. On finish it shows a results screen and logs the run as a
 * practice attempt (overall score + per-domain mastery) via the same patch the
 * manual log form uses — so the sparkline and readiness update for free.
 * Keys: 1–9 pick an option, Enter/→ next, ← back.
 */
export function PracticeQuiz({
  cert,
  onExit,
  onUpdate,
}: {
  cert: Certification
  /** Leave the quiz and return to the dashboard. */
  onExit: () => void
  onUpdate: (id: string, patch: CertPatch) => Promise<Certification>
}) {
  const questions = cert.quizQuestions

  // answers[questionId] = chosen optionId
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const q = questions[current]
  const total = questions.length
  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === total

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (submitted) return
      if (e.key >= '1' && e.key <= '9') {
        const idx = Number(e.key) - 1
        if (q && idx < q.options.length) choose(q.options[idx].id)
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (current < total - 1) setCurrent((c) => c + 1)
      } else if (e.key === 'ArrowLeft') {
        if (current > 0) setCurrent((c) => c - 1)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, submitted, q, total])

  // Return to the top when moving between questions or into the results.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [current, submitted])

  function choose(optionId: string) {
    if (!q) return
    setAnswers((prev) => ({ ...prev, [q.id]: optionId }))
  }

  function requestExit() {
    if (submitted || answeredCount === 0) {
      onExit()
      return
    }
    if (window.confirm('Leave the practice test? Your progress will be lost.')) {
      onExit()
    }
  }

  const result = useMemo(() => scoreQuiz(cert, answers), [cert, answers])

  async function finish() {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    const today = new Date().toISOString().slice(0, 10)
    const patch: CertPatch = {
      attempts: [
        ...cert.attempts,
        {
          provider: `In-app practice · ${total} questions`,
          date: today,
          score: result.overall,
          url: '',
        },
      ],
    }
    // Update mastery only for domains this quiz actually tested.
    if (result.byDomain.size > 0) {
      patch.domains = cert.domains.map((d) => {
        const r = result.byDomain.get(d.id)
        return r ? { ...d, mastery: r.pct } : d
      })
    }
    try {
      await onUpdate(cert.id, patch)
      setSubmitted(true)
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Could not save your result.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (!q) return null

  const passed = result.overall >= cert.passingScore
  const titleId = `quiz-${cert.id}`

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <div className={styles.headText}>
            <p className={styles.eyebrow}>{cert.shortName || cert.name}</p>
            <h1 id={titleId} className={styles.headTitle}>
              {submitted ? 'Your results' : 'Practice test'}
            </h1>
          </div>
          <button type="button" className={styles.exit} onClick={requestExit}>
            <XIcon size={16} />
            {submitted ? 'Done' : 'Exit'}
          </button>
        </div>
        {!submitted && (
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={answeredCount}
            aria-label="Questions answered"
          >
            <div
              className={styles.progressFill}
              style={{ '--fill': answeredCount / total } as React.CSSProperties}
            />
          </div>
        )}
      </header>

      <main className={styles.content} aria-labelledby={titleId}>
        {submitted ? (
          <div className={styles.body}>
            <ResultsBody cert={cert} answers={answers} result={result} passed={passed} />
            <div className={styles.nav}>
              <span />
              <button type="button" className={styles.navPrimary} onClick={onExit}>
                <CheckCircleIcon size={16} />
                Back to dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.body}>
            <div className={styles.qMeta}>
              <span className="tnum">
                Question {current + 1} of {total}
              </span>
              <span className={styles.qCount}>
                {answeredCount}/{total} answered
              </span>
            </div>

            <p className={styles.prompt}>{q.prompt}</p>

            <ul className={styles.options}>
              {q.options.map((o, i) => {
                const selected = answers[q.id] === o.id
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      className={styles.option}
                      data-selected={selected}
                      onClick={() => choose(o.id)}
                    >
                      <span className={styles.optionKey} aria-hidden="true">
                        {selected ? <CheckIcon size={15} /> : i + 1}
                      </span>
                      <span className={styles.optionText}>{o.text}</span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {saveError && (
              <p className={styles.error} role="alert">
                {saveError}
              </p>
            )}

            <div className={styles.nav}>
              <button
                type="button"
                className={styles.navGhost}
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
              >
                <ChevronLeftIcon size={16} />
                Back
              </button>

              {current < total - 1 ? (
                <button
                  type="button"
                  className={styles.navPrimary}
                  onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
                >
                  Next
                  <ChevronRightIcon size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.navPrimary}
                  onClick={finish}
                  disabled={!allAnswered || saving}
                  title={
                    allAnswered ? undefined : 'Answer every question to finish'
                  }
                >
                  <CheckCircleIcon size={16} />
                  {saving ? 'Saving…' : 'Finish & score'}
                </button>
              )}
            </div>

            {!allAnswered && current === total - 1 && (
              <p className={styles.hint}>
                {total - answeredCount} question
                {total - answeredCount === 1 ? '' : 's'} still unanswered.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function ResultsBody({
  cert,
  answers,
  result,
  passed,
}: {
  cert: Certification
  answers: Record<string, string>
  result: QuizResult
  passed: boolean
}) {
  const domainRows = cert.domains
    .map((d) => ({ domain: d, r: result.byDomain.get(d.id) }))
    .filter((x) => x.r)

  return (
    <div className={styles.body}>
      <div className={styles.scoreCard} data-pass={passed}>
        <span className={`${styles.scoreVal} tnum`}>
          {result.overall}
          <span className={styles.pct}>%</span>
        </span>
        <span className={styles.scoreMeta}>
          <span className={styles.readyBadge} data-pass={passed}>
            {passed ? 'Above the line' : 'Below the line'}
          </span>
          <span className="tnum">
            {result.correct}/{result.total} correct · pass ≥ {cert.passingScore}%
          </span>
        </span>
      </div>
      <MasteryBar
        value={result.overall}
        marker={cert.passingScore}
        tone={passed ? 'strong' : 'weak'}
        height={10}
      />

      {domainRows.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>By topic</h3>
          <ul className={styles.domains}>
            {domainRows.map(({ domain, r }) => (
              <li key={domain.id} className={styles.domain}>
                <div className={styles.domainTop}>
                  <span className={styles.domainName}>{domain.name}</span>
                  <span className={`${styles.domainVal} tnum`}>
                    {r!.correct}/{r!.total}
                  </span>
                </div>
                <MasteryBar
                  value={r!.pct}
                  marker={cert.passingScore}
                  tone={masteryBand(r!.pct, cert.passingScore)}
                  height={7}
                />
              </li>
            ))}
          </ul>
          <p className={styles.savedNote}>
            <CheckCircleIcon size={14} />
            Saved to your practice tests — topic mastery updated.
          </p>
        </section>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Review answers</h3>
        <ol className={styles.review}>
          {cert.quizQuestions.map((question, i) => (
            <ReviewItem
              key={question.id}
              index={i}
              question={question}
              chosenId={answers[question.id]}
            />
          ))}
        </ol>
      </section>
    </div>
  )
}

function ReviewItem({
  index,
  question,
  chosenId,
}: {
  index: number
  question: QuizQuestion
  chosenId?: string
}) {
  const correct = chosenId === question.correctOptionId
  return (
    <li className={styles.reviewItem}>
      <div className={styles.reviewHead}>
        <span className={styles.reviewMark} data-correct={correct} aria-hidden="true">
          {correct ? <CheckIcon size={14} /> : <XIcon size={14} />}
        </span>
        <span className={styles.reviewPrompt}>
          <span className={styles.reviewNum}>{index + 1}.</span> {question.prompt}
        </span>
      </div>
      <ul className={styles.reviewOptions}>
        {question.options.map((o) => {
          const isCorrect = o.id === question.correctOptionId
          const isChosen = o.id === chosenId
          const state = isCorrect ? 'correct' : isChosen ? 'wrong' : 'idle'
          return (
            <li key={o.id} className={styles.reviewOption} data-state={state}>
              <span className={styles.reviewOptionText}>{o.text}</span>
              {isCorrect && <CheckIcon size={14} />}
              {isChosen && !isCorrect && <XIcon size={14} />}
            </li>
          )
        })}
      </ul>
      {question.explanation && (
        <p className={styles.explanation}>
          <TargetIcon size={13} className={styles.explanationIcon} />
          {question.explanation}
        </p>
      )}
    </li>
  )
}

interface DomainScore {
  correct: number
  total: number
  pct: number
}
interface QuizResult {
  correct: number
  total: number
  overall: number
  byDomain: Map<string, DomainScore>
}

function scoreQuiz(
  cert: Certification,
  answers: Record<string, string>,
): QuizResult {
  const tally = new Map<string, { correct: number; total: number }>()
  let correct = 0
  for (const q of cert.quizQuestions) {
    const ok = answers[q.id] === q.correctOptionId
    if (ok) correct += 1
    if (q.domainId) {
      const t = tally.get(q.domainId) ?? { correct: 0, total: 0 }
      t.total += 1
      if (ok) t.correct += 1
      tally.set(q.domainId, t)
    }
  }
  const total = cert.quizQuestions.length
  const byDomain = new Map<string, DomainScore>()
  for (const [id, t] of tally) {
    byDomain.set(id, {
      correct: t.correct,
      total: t.total,
      pct: Math.round((t.correct / t.total) * 100),
    })
  }
  return {
    correct,
    total,
    overall: total > 0 ? Math.round((correct / total) * 100) : 0,
    byDomain,
  }
}
