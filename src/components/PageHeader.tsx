import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

/** Consistent title + subline header for the library pages. */
export function PageHeader({
  title,
  subline,
  children,
}: {
  title: string
  subline: string
  /** Optional actions rendered to the right of the title. */
  children?: ReactNode
}) {
  return (
    <header className={styles.head}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subline}>{subline}</p>
      </div>
      {children && <div className={styles.actions}>{children}</div>}
    </header>
  )
}
