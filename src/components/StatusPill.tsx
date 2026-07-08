import type { CertStatus } from '../data/types'
import {
  CheckCircleIcon,
  CalendarPinIcon,
  DotCircleIcon,
  ClockIcon,
} from '../lib/icons'
import styles from './StatusPill.module.css'

const CONFIG: Record<
  CertStatus,
  { label: string; Icon: typeof CheckCircleIcon; tone: string }
> = {
  passed: { label: 'Passed', Icon: CheckCircleIcon, tone: 'ok' },
  scheduled: { label: 'Exam booked', Icon: CalendarPinIcon, tone: 'info' },
  'in-progress': { label: 'Studying', Icon: DotCircleIcon, tone: 'warn' },
  queued: { label: 'Queued', Icon: ClockIcon, tone: 'neutral' },
}

export function StatusPill({
  status,
  size = 'md',
}: {
  status: CertStatus
  size?: 'sm' | 'md'
}) {
  const { label, Icon, tone } = CONFIG[status]
  return (
    <span
      className={styles.pill}
      data-tone={tone}
      data-size={size}
    >
      <Icon size={size === 'sm' ? 13 : 15} />
      {label}
    </span>
  )
}
