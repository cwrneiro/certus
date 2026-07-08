import { PlusIcon, CertIcon } from '../lib/icons'
import styles from './EmptyState.module.css'

export function EmptyState() {
  return (
    <div className={styles.wrap}>
      <div className={styles.mark} aria-hidden="true">
        <CertIcon size={30} />
      </div>
      <h1 className={styles.title}>Set your first certification in focus</h1>
      <p className={styles.body}>
        Add a certification and this becomes its home — practice-test scores, the
        topics to work on next, and every study link in one place. No more
        scattered tabs.
      </p>
      <button type="button" className={styles.cta}>
        <PlusIcon size={18} />
        Add a certification
      </button>
    </div>
  )
}
