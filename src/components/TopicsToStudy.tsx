import type { Certification, Domain } from '../data/types'
import { MasteryBar } from './MasteryBar'
import { masteryBand, weakestDomains } from '../lib/metrics'
import { ArrowRightIcon } from '../lib/icons'
import styles from './TopicsToStudy.module.css'

const BAND_LABEL = {
  weak: 'Focus here',
  fair: 'Getting there',
  strong: 'Strong',
} as const

export function TopicsToStudy({ cert }: { cert: Certification }) {
  const domains = weakestDomains(cert)
  const started = cert.attempts.length > 0

  return (
    <section className={styles.card} aria-labelledby="topics-heading">
      <header className={styles.head}>
        <div>
          <h2 id="topics-heading" className={styles.title}>
            Topics to study
          </h2>
          <p className={styles.sub}>
            {started
              ? 'Ranked by your last practice test — weakest first.'
              : 'Domains for this exam. Take a practice test to see where you stand.'}
          </p>
        </div>
      </header>

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
    </section>
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
