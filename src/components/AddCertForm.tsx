import { useEffect, useRef, useState } from 'react'
import type { NewCertInput } from '../data/types'
import { PlusIcon, XIcon } from '../lib/icons'
import styles from './AddCertForm.module.css'

type Status = NewCertInput['status']

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'queued', label: 'Queued — not started yet' },
  { value: 'in-progress', label: 'Studying' },
  { value: 'scheduled', label: 'Exam booked' },
]

export function AddCertForm({
  onAdd,
  onCancel,
  submitting = false,
  error,
}: {
  onAdd: (input: NewCertInput) => void
  onCancel: () => void
  submitting?: boolean
  error?: string | null
}) {
  const [provider, setProvider] = useState('')
  const [name, setName] = useState('')
  const [passingScore, setPassingScore] = useState('70')
  const [status, setStatus] = useState<Status>('in-progress')
  const [examDate, setExamDate] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const firstField = useRef<HTMLInputElement>(null)
  useEffect(() => {
    firstField.current?.focus()
  }, [])

  function validate(): NewCertInput | null {
    const next: Record<string, string> = {}
    if (!provider.trim()) next.provider = 'Add the provider.'
    if (!name.trim()) next.name = 'Give the certification a name.'
    const score = Number(passingScore)
    if (!Number.isFinite(score) || score < 1 || score > 100) {
      next.passingScore = 'Enter a score between 1 and 100.'
    }
    if (status === 'scheduled' && !examDate) {
      next.examDate = 'Add the exam date you booked.'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return null
    return {
      provider: provider.trim(),
      name: name.trim(),
      passingScore: Math.round(score),
      status,
      examDate: examDate || undefined,
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const input = validate()
    if (input) onAdd(input)
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.formHead}>
        <h2 className={styles.formTitle}>Add a certification</h2>
        <button
          type="button"
          className={styles.dismiss}
          onClick={onCancel}
          aria-label="Cancel"
        >
          <XIcon size={18} />
        </button>
      </div>

      <div className={styles.grid}>
        <Field label="Provider" error={errors.provider} htmlFor="cert-provider">
          <input
            ref={firstField}
            id="cert-provider"
            className={styles.input}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="e.g. Microsoft"
            autoComplete="off"
            aria-invalid={!!errors.provider}
          />
        </Field>

        <Field
          label="Certification name"
          error={errors.name}
          htmlFor="cert-name"
          wide
        >
          <input
            id="cert-name"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Azure Data Engineer Associate"
            autoComplete="off"
            aria-invalid={!!errors.name}
          />
        </Field>

        <Field
          label="Passing score"
          error={errors.passingScore}
          htmlFor="cert-score"
        >
          <div className={styles.scoreWrap}>
            <input
              id="cert-score"
              className={`${styles.input} ${styles.score} tnum`}
              value={passingScore}
              onChange={(e) => setPassingScore(e.target.value)}
              inputMode="numeric"
              aria-invalid={!!errors.passingScore}
            />
            <span className={styles.pct} aria-hidden="true">
              %
            </span>
          </div>
        </Field>

        <Field label="Status" htmlFor="cert-status">
          <select
            id="cert-status"
            className={styles.input}
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={status === 'scheduled' ? 'Exam date' : 'Exam date (optional)'}
          error={errors.examDate}
          htmlFor="cert-date"
        >
          <input
            id="cert-date"
            type="date"
            className={styles.input}
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            aria-invalid={!!errors.examDate}
          />
        </Field>
      </div>

      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.ghost}
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button type="submit" className={styles.primary} disabled={submitting}>
          <PlusIcon size={17} />
          {submitting ? 'Adding…' : 'Add certification'}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  error,
  wide,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={styles.field} data-wide={wide}>
      <label htmlFor={htmlFor} className={styles.label}>
        {label}
      </label>
      {children}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
