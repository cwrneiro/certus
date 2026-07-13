import { useState } from 'react'
import type { Certification, CertPatch, MaterialType } from '../data/types'
import {
  BookIcon,
  FileIcon,
  VideoIcon,
  NoteIcon,
  TargetIcon,
  ExternalIcon,
  PlusIcon,
} from '../lib/icons'
import styles from './StudyMaterials.module.css'
import edit from './InlineEdit.module.css'

const TYPE_ICON: Record<MaterialType, typeof BookIcon> = {
  course: BookIcon,
  doc: FileIcon,
  video: VideoIcon,
  note: NoteIcon,
  practice: TargetIcon,
}

const TYPE_LABEL: Record<MaterialType, string> = {
  course: 'Course',
  doc: 'Doc',
  video: 'Video',
  note: 'Note',
  practice: 'Practice',
}

export function StudyMaterials({
  cert,
  onUpdate,
}: {
  cert: Certification
  onUpdate: (id: string, patch: CertPatch) => Promise<Certification>
}) {
  const [adding, setAdding] = useState(false)

  return (
    <section className={styles.card} aria-labelledby="materials-heading">
      <header className={styles.head}>
        <h2 id="materials-heading" className={styles.title}>
          Study materials
        </h2>
        <span className={styles.count}>{cert.materials.length}</span>
      </header>

      <ul className={styles.list}>
        {cert.materials.map((m) => {
          const Icon = TYPE_ICON[m.type]
          const isNote = m.url === '#'
          return (
            <li key={m.id}>
              <a
                className={styles.item}
                href={m.url}
                target={isNote ? undefined : '_blank'}
                rel={isNote ? undefined : 'noreferrer'}
              >
                <span className={styles.icon} data-type={m.type}>
                  <Icon size={17} />
                </span>
                <span className={styles.meta}>
                  <span className={styles.itemTitle}>{m.title}</span>
                  <span className={styles.source}>
                    {TYPE_LABEL[m.type]} · {m.source}
                  </span>
                </span>
                {!isNote && (
                  <ExternalIcon size={15} className={styles.ext} />
                )}
              </a>
            </li>
          )
        })}
      </ul>

      {adding ? (
        <AddMaterialForm
          cert={cert}
          onUpdate={onUpdate}
          onClose={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          className={styles.add}
          onClick={() => setAdding(true)}
        >
          <PlusIcon size={16} />
          Add material
        </button>
      )}
    </section>
  )
}

function AddMaterialForm({
  cert,
  onUpdate,
  onClose,
}: {
  cert: Certification
  onUpdate: (id: string, patch: CertPatch) => Promise<Certification>
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [type, setType] = useState<MaterialType>('course')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Give the material a title.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onUpdate(cert.id, {
        materials: [
          ...cert.materials,
          {
            title: title.trim(),
            source: source.trim(),
            type,
            url: url.trim() || '#',
          },
        ],
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the material.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={edit.form} onSubmit={save} noValidate>
      <p className={edit.formTitle}>Add a material</p>

      <div className={edit.field}>
        <label className={edit.label} htmlFor="material-title">
          Title
        </label>
        <input
          id="material-title"
          className={edit.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Exam guide"
          autoFocus
          aria-invalid={!!error && !title.trim()}
        />
      </div>

      <div className={edit.fieldRow}>
        <div className={edit.field}>
          <label className={edit.label} htmlFor="material-source">
            Source
          </label>
          <input
            id="material-source"
            className={edit.input}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. Databricks Academy"
          />
        </div>
        <div className={edit.field} style={{ flex: 'none', width: '8rem' }}>
          <label className={edit.label} htmlFor="material-type">
            Type
          </label>
          <select
            id="material-type"
            className={edit.input}
            value={type}
            onChange={(e) => setType(e.target.value as MaterialType)}
          >
            {(Object.keys(TYPE_LABEL) as MaterialType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={edit.field}>
        <label className={edit.label} htmlFor="material-url">
          Link (optional — blank makes it a note)
        </label>
        <input
          id="material-url"
          className={edit.input}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          inputMode="url"
        />
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
          {saving ? 'Saving…' : 'Add material'}
        </button>
      </div>
    </form>
  )
}
