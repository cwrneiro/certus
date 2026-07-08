import { useMemo, useState } from 'react'
import type { Certification, CertStatus, NewCertInput } from '../data/types'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { CertCard } from '../components/CertCard'
import { AddCertForm } from '../components/AddCertForm'
import { PlusIcon, ChevronRightIcon, CertIcon } from '../lib/icons'
import { weightedMastery } from '../lib/metrics'
import { daysUntil } from '../lib/format'
import styles from './CertificationsPage.module.css'

type Filter = 'all' | CertStatus
type Sort = 'exam' | 'readiness' | 'name'

const STATUS_ORDER: Record<CertStatus, number> = {
  'in-progress': 0,
  scheduled: 1,
  queued: 2,
  passed: 3,
}

const STATUS_LABEL: Record<CertStatus, string> = {
  'in-progress': 'Studying',
  scheduled: 'Booked',
  queued: 'Queued',
  passed: 'Passed',
}

export function CertificationsPage({
  certs,
  onOpen,
  onAdd,
}: {
  certs: Certification[]
  onOpen: (id: string) => void
  onAdd: (input: NewCertInput) => Promise<void>
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('exam')
  const [adding, setAdding] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const counts = useMemo(() => {
    const c: Record<CertStatus, number> = {
      'in-progress': 0,
      scheduled: 0,
      queued: 0,
      passed: 0,
    }
    for (const cert of certs) c[cert.status]++
    return c
  }, [certs])

  const visible = useMemo(() => {
    const filtered =
      filter === 'all' ? certs : certs.filter((c) => c.status === filter)
    return [...filtered].sort((a, b) => compare(a, b, sort))
  }, [certs, filter, sort])

  async function handleAdd(input: NewCertInput) {
    setSubmitting(true)
    setFormError(null)
    try {
      await onAdd(input)
      setAdding(false)
      setFilter('all')
      setSort('name')
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : 'Could not add certification.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function closeForm() {
    setAdding(false)
    setFormError(null)
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Certifications"
        subline="Everything you're working toward — one place to see where each one stands."
      >
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => (adding ? closeForm() : setAdding(true))}
          aria-expanded={adding}
        >
          <PlusIcon size={17} />
          Add certification
        </button>
      </PageHeader>

      <p className={styles.summary}>
        <span className={styles.count}>
          <strong className="tnum">{certs.length}</strong> tracked
        </span>
        {(['in-progress', 'scheduled', 'queued', 'passed'] as CertStatus[])
          .filter((s) => counts[s] > 0)
          .map((s) => (
            <span key={s} className={styles.breakdown}>
              <span className={styles.dot} data-status={s} aria-hidden="true" />
              <span className="tnum">{counts[s]}</span> {STATUS_LABEL[s]}
            </span>
          ))}
      </p>

      {adding && (
        <AddCertForm
          onAdd={handleAdd}
          onCancel={closeForm}
          submitting={submitting}
          error={formError}
        />
      )}

      <div className={styles.controls}>
        <Segmented<Filter>
          ariaLabel="Filter certifications by status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: certs.length },
            { value: 'in-progress', label: 'Studying', count: counts['in-progress'] },
            { value: 'scheduled', label: 'Booked', count: counts.scheduled },
            { value: 'queued', label: 'Queued', count: counts.queued },
            { value: 'passed', label: 'Passed', count: counts.passed },
          ]}
        />

        <label className={styles.sort}>
          <span className={styles.sortLabel}>Sort</span>
          <span className={styles.selectWrap}>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort certifications"
            >
              <option value="exam">Exam date</option>
              <option value="readiness">Readiness</option>
              <option value="name">Name</option>
            </select>
            <ChevronRightIcon size={15} className={styles.selectChevron} />
          </span>
        </label>
      </div>

      {visible.length > 0 ? (
        <ul className={styles.grid}>
          {visible.map((cert, i) => (
            <li key={cert.id}>
              <CertCard cert={cert} onOpen={onOpen} index={i} />
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <div className={styles.emptyMark} aria-hidden="true">
            <CertIcon size={26} />
          </div>
          <p className={styles.emptyTitle}>
            No {filter === 'all' ? '' : `${STATUS_LABEL[filter as CertStatus]?.toLowerCase()} `}
            certifications here
          </p>
          <p className={styles.emptyBody}>
            {filter === 'all'
              ? 'Add your first certification to start tracking it.'
              : 'Try another filter, or add a new certification.'}
          </p>
        </div>
      )}
    </div>
  )
}

function compare(a: Certification, b: Certification, sort: Sort): number {
  if (sort === 'name') return a.name.localeCompare(b.name)
  if (sort === 'readiness') {
    return weightedMastery(b) - weightedMastery(a)
  }
  // exam: soonest upcoming exam first, then undated by status, passed last
  const ax = examRank(a)
  const bx = examRank(b)
  if (ax !== bx) return ax - bx
  const aDays = a.examDate ? daysUntil(a.examDate) : Infinity
  const bDays = b.examDate ? daysUntil(b.examDate) : Infinity
  if (aDays !== bDays) return aDays - bDays
  return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
}

/** Upcoming booked exams sort ahead of everything; passed sink to the end. */
function examRank(c: Certification): number {
  if (c.status === 'scheduled' && c.examDate && daysUntil(c.examDate) >= 0) return 0
  if (c.status === 'passed') return 2
  return 1
}
