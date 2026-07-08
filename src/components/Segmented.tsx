import { useRef } from 'react'
import styles from './Segmented.module.css'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  /** Optional count shown as a trailing chip. */
  count?: number
}

/** A keyboard-drivable filter control (radiogroup semantics + arrow keys). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function move(from: number, dir: 1 | -1) {
    const next = (from + dir + options.length) % options.length
    const opt = options[next]
    onChange(opt.value)
    refs.current[next]?.focus()
  }

  return (
    <div className={styles.group} role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt, i) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            className={styles.segment}
            data-active={active}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault()
                move(i, 1)
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault()
                move(i, -1)
              }
            }}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className={`${styles.count} tnum`}>{opt.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
