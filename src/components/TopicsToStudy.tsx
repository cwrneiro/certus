import { useState } from 'react'
import type { Certification, CertPatch, Domain } from '../data/types'
import { MasteryBar } from './MasteryBar'
import { masteryBand, weakestDomains } from '../lib/metrics'
import { ArrowRightIcon, PlusIcon, XIcon } from '../lib/icons'
import styles from './TopicsToStudy.module.css'
import edit from './InlineEdit.module.css'

const BAND_LABEL = {
  weak: 'Focus here',
  fair: 'Getting there',
  strong: 'Strong',
} as const

type TopicRowDraft = { id?: string; name: string; weight: string; mastery: number }

export function TopicsToStudy({
  cert,
  onUpdate,
}: {
  cert: Certification
  onUpdate: (id: string, patch: CertPatch) => Promise<Certification>
}) {
  const domains = weakestDomains(cert)
  const started = cert.attempts.length > 0
  const [editing, setEditing] = useState(false)

  return (
    <section className={styles.card} aria-labelledby="topics-heading">
      <header className={styles.head}>
        <div>
          <h2 id="topics-heading" className={styles.title}>
            Topics to study
          </h2>
          <p className={styles.sub}>
            {domains.length === 0
              ? 'List the exam domains to see what to study next.'
              : started
                ? 'Ranked by your last practice test — weakest first.'
                : 'Domains for this exam. Take a practice test to see where you stand.'}
          </p>
        </div>
        {!editing && domains.length > 0 && (
          <button
            type="button"
            className={edit.headBtn}
            onClick={() => setEditing(true)}
          >
            Edit topics
          </button>
        )}
      </header>

      {editing ? (
        <TopicsEditor
          cert={cert}
          onUpdate={onUpdate}
          onClose={() => setEditing(false)}
        />
      ) : domains.length === 0 ? (
        <button
          type="button"
          className={edit.trigger}
          onClick={() => setEditing(true)}
        >
          <PlusIcon size={16} />
          Set up exam topics
        </button>
      ) : (
        <ol className={styles.list}>
          {domains.map((d, i) => (
            <TopicRow
              key={d.id}
              domain={d}
              passing={cert.passingScore}
              started={started}
              material={materialFor(cert, d.id)}
              index={i}
            />
          ))}
        </ol>
      )}
    </section>
  )
}

function TopicsEditor({
  cert,
  onUpdate,
  onClose,
}: {
  cert: Certification
  onUpdate: (id: string, patch: CertPatch) => Promise<Certification>
  onClose: () => void
}) {
  const [rows, setRows] = useState<TopicRowDraft[]>(() =>
    cert.domains.length > 0
      ? cert.domains.map((d) => ({
          id: d.id,
          name: d.name,
          weight: String(Math.round(d.weight * 100)),
          mastery: d.mastery,
        }))
      : [{ name: '', weight: '', mastery: 0 }],
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalWeight = rows.reduce((sum, r) => sum + (Number(r.weight) || 0), 0)

  function setRow(i: number, next: Partial<TopicRowDraft>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...next } : r)))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const filled = rows.filter((r) => r.name.trim())
    if (filled.length === 0) {
      setError('Add at least one topic.')
      return
    }
    for (const r of filled) {
      const w = Number(r.weight)
      if (!Number.isFinite(w) || w <= 0 || w > 100) {
        setError('Give every topic a weight between 1 and 100%.')
        return
      }
    }
    setSaving(true)
    setError(null)
    try {
      await onUpdate(cert.id, {
        domains: filled.map((r) => ({
          ...(r.id ? { id: r.id } : {}),
          name: r.name.trim(),
          weight: Number(r.weight) / 100,
          mastery: r.mastery,
        })),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save topics.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={edit.form} onSubmit={save} noValidate>
      <p className={edit.formTitle}>Exam topics</p>
      {rows.map((r, i) => (
        <div key={r.id ?? `new-${i}`} className={edit.row}>
          <input
            className={edit.input}
            value={r.name}
            onChange={(e) => setRow(i, { name: e.target.value })}
            placeholder={`Topic ${i + 1} — e.g. Data modeling`}
            aria-label={`Topic ${i + 1} name`}
            autoFocus={i === rows.length - 1 && !r.name}
          />
          <span className={edit.numWrap}>
            <input
              className={`${edit.input} tnum`}
              value={r.weight}
              onChange={(e) => setRow(i, { weight: e.target.value })}
              inputMode="numeric"
              placeholder="20"
              aria-label={`Topic ${i + 1} share of the exam, percent`}
            />
            <span className={edit.numPct} aria-hidden="true">
              %
            </span>
          </span>
          <button
            type="button"
            className={edit.removeBtn}
            onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
            aria-label={`Remove topic ${i + 1}`}
            disabled={rows.length === 1}
          >
            <XIcon size={15} />
          </button>
        </div>
      ))}

      <div className={edit.row}>
        <button
          type="button"
          className={edit.ghost}
          onClick={() =>
            setRows((prev) => [...prev, { name: '', weight: '', mastery: 0 }])
          }
        >
          <PlusIcon size={14} /> Add topic
        </button>
        <span
          className={`${edit.hint} tnum`}
          data-warn={totalWeight !== 100}
          style={{ marginLeft: 'auto' }}
        >
          Weights add up to {totalWeight}%{totalWeight !== 100 ? ' — aim for 100%' : ''}
        </span>
      </div>

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
          {saving ? 'Saving…' : 'Save topics'}
        </button>
      </div>
    </form>
  )
}

function TopicRow({
  domain,
  passing,
  started,
  material,
  index,
}: {
  domain: Domain
  passing: number
  started: boolean
  material?: { title: string; url: string }
  index: number
}) {
  const band = masteryBand(domain.mastery, passing)
  const barTone = band === 'weak' ? 'weak' : band === 'strong' ? 'strong' : 'muted'

  return (
    <li className={styles.row} style={{ '--i': index } as React.CSSProperties}>
      <div className={styles.rowHead}>
        <span className={styles.topicName}>{domain.name}</span>
        {started ? (
          <span className={`${styles.mastery} tnum`} data-band={band}>
            {domain.mastery}%
          </span>
        ) : (
          <span className={styles.notStarted}>—</span>
        )}
      </div>

      <MasteryBar
        value={started ? domain.mastery : 0}
        marker={started ? passing : undefined}
        tone={started ? barTone : 'muted'}
        height={7}
        delay={index * 45}
      />

      <div className={styles.rowFoot}>
        <span className={styles.band} data-band={band} data-started={started}>
          {started ? BAND_LABEL[band] : `${Math.round(domain.weight * 100)}% of exam`}
        </span>
        {material && (
          <a className={styles.studyLink} href={material.url} target="_blank" rel="noreferrer">
            <span className={styles.studyLabel}>{material.title}</span>
            <ArrowRightIcon size={14} />
          </a>
        )}
      </div>
    </li>
  )
}

function materialFor(
  cert: Certification,
  domainId: string,
): { title: string; url: string } | undefined {
  // Only link a topic to a material that actually covers it — no generic
  // course fallback, which reads as repeated filler across every row.
  const m = cert.materials.find((x) => x.domainIds?.includes(domainId))
  return m ? { title: m.title, url: m.url } : undefined
}
