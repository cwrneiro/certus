import styles from './MasteryBar.module.css'

export function MasteryBar({
  value,
  tone = 'accent',
  marker,
  height = 8,
  delay = 0,
}: {
  value: number // 0–100
  tone?: 'accent' | 'weak' | 'fair' | 'strong' | 'muted'
  /** Optional passing-line marker, 0–100. */
  marker?: number
  height?: number
  delay?: number
}) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      className={styles.track}
      style={{ height: `${height}px` }}
      role="presentation"
    >
      <div
        className={styles.fill}
        data-tone={tone}
        style={
          {
            '--val': `${clamped}%`,
            '--delay': `${delay}ms`,
          } as React.CSSProperties
        }
      />
      {marker !== undefined && (
        <span
          className={styles.marker}
          style={{ left: `${Math.max(0, Math.min(100, marker))}%` }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
