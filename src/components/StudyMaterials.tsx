import type { Certification, MaterialType } from '../data/types'
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

export function StudyMaterials({ cert }: { cert: Certification }) {
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

      <button type="button" className={styles.add}>
        <PlusIcon size={16} />
        Add material
      </button>
    </section>
  )
}
