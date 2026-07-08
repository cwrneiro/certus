import { AlertIcon } from '../lib/icons'
import styles from './LoadState.module.css'

/** Full-content loading and error states for the initial data fetch. */
export function LoadState({
  variant,
  onRetry,
}: {
  variant: 'loading' | 'error'
  onRetry?: () => void
}) {
  if (variant === 'error') {
    return (
      <div className={styles.wrap} role="alert">
        <div className={styles.mark} data-tone="error" aria-hidden="true">
          <AlertIcon size={24} />
        </div>
        <p className={styles.title}>Couldn't load your certifications</p>
        <p className={styles.body}>
          Something went wrong reaching the server. Check your connection and try
          again.
        </p>
        {onRetry && (
          <button type="button" className={styles.retry} onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <span className={styles.pulse} aria-hidden="true" />
      <p className={styles.body}>Loading your study home…</p>
    </div>
  )
}
