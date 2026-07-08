import { useMemo, useState } from 'react'
import type { Certification, Material, MaterialType } from '../data/types'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import {
  BookIcon,
  FileIcon,
  VideoIcon,
  NoteIcon,
  TargetIcon,
  ExternalIcon,
  ChevronRightIcon,
  MaterialsIcon,
} from '../lib/icons'
import styles from './MaterialsPage.module.css'

type MaterialWithCert = Material & { certId: string; certName: string }
type TypeFilter = 'all' | MaterialType

const TYPE_META: Record<
  MaterialType,
  { icon: typeof BookIcon; single: string; plural: string }
> = {
  course: { icon: BookIcon, single: 'Course', plural: 'Courses' },
  doc: { icon: FileIcon, single: 'Doc', plural: 'Docs' },
  video: { icon: VideoIcon, single: 'Video', plural: 'Videos' },
  note: { icon: NoteIcon, single: 'Note', plural: 'Notes' },
  practice: { icon: TargetIcon, single: 'Practice', plural: 'Practice' },
}

const TYPE_ORDER: MaterialType[] = ['course', 'doc', 'video', 'practice', 'note']

export function MaterialsPage({ certs }: { certs: Certification[] }) {
  const [type, setType] = useState<TypeFilter>('all')
  const [certId, setCertId] = useState<string>('all')

  const all = useMemo<MaterialWithCert[]>(
    () =>
      certs.flatMap((c) =>
        c.materials.map((m) => ({
          ...m,
          certId: c.id,
          certName: c.shortName,
        })),
      ),
    [certs],
  )

  const typeCounts = useMemo(() => {
    const c = {} as Record<MaterialType, number>
    for (const m of all) c[m.type] = (c[m.type] ?? 0) + 1
    return c
  }, [all])

  const visible = useMemo(
    () =>
      all.filter(
        (m) =>
          (type === 'all' || m.type === type) &&
          (certId === 'all' || m.certId === certId),
      ),
    [all, type, certId],
  )

  const certsWithMaterials = certs.filter((c) => c.materials.length > 0)

  const typeOptions = useMemo(
    () => [
      { value: 'all' as const, label: 'All', count: all.length },
      ...TYPE_ORDER.filter((t) => typeCounts[t]).map((t) => ({
        value: t,
        label: TYPE_META[t].plural,
        count: typeCounts[t],
      })),
    ],
    [all.length, typeCounts],
  )

  return (
    <div className={styles.page}>
      <PageHeader
        title="Study materials"
        subline="Every course, doc, video, and note — gathered from all your certifications, so nothing lives in ten tabs."
      />

      <p className={styles.summary}>
        <strong className="tnum">{all.length}</strong> materials across{' '}
        <strong className="tnum">{certsWithMaterials.length}</strong>{' '}
        {certsWithMaterials.length === 1 ? 'certification' : 'certifications'}
      </p>

      <div className={styles.controls}>
        <Segmented<TypeFilter>
          ariaLabel="Filter materials by type"
          value={type}
          onChange={setType}
          options={typeOptions}
        />

        <label className={styles.sort}>
          <span className={styles.sortLabel}>Certification</span>
          <span className={styles.selectWrap}>
            <select
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              aria-label="Filter materials by certification"
            >
              <option value="all">All certifications</option>
              {certsWithMaterials.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shortName}
                </option>
              ))}
            </select>
            <ChevronRightIcon size={15} className={styles.selectChevron} />
          </span>
        </label>
      </div>

      {visible.length > 0 ? (
        <ul className={styles.grid}>
          {visible.map((m) => (
            <li key={`${m.certId}-${m.id}`}>
              <MaterialItem material={m} />
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <div className={styles.emptyMark} aria-hidden="true">
            <MaterialsIcon size={26} />
          </div>
          <p className={styles.emptyTitle}>Nothing to show here</p>
          <p className={styles.emptyBody}>
            No materials match these filters yet.
          </p>
        </div>
      )}
    </div>
  )
}

function MaterialItem({ material }: { material: MaterialWithCert }) {
  const meta = TYPE_META[material.type]
  const Icon = meta.icon
  const isLink = material.url && material.url !== '#'

  const inner = (
    <>
      <span className={styles.icon} data-type={material.type} aria-hidden="true">
        <Icon size={18} />
      </span>
      <span className={styles.itemText}>
        <span className={styles.itemTitle}>{material.title}</span>
        <span className={styles.itemMeta}>
          <span className={styles.type}>{meta.single}</span>
          <span aria-hidden="true">·</span>
          <span>{material.source}</span>
        </span>
        <span className={styles.certChip}>{material.certName}</span>
      </span>
      {isLink && <ExternalIcon size={16} className={styles.ext} />}
    </>
  )

  if (isLink) {
    return (
      <a
        className={styles.item}
        href={material.url}
        target="_blank"
        rel="noreferrer"
      >
        {inner}
      </a>
    )
  }
  return (
    <div className={styles.item} data-static="true">
      {inner}
    </div>
  )
}
