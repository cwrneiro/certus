import { ThemeToggle } from './ThemeToggle'
import {
  DashboardIcon,
  CertIcon,
  MaterialsIcon,
  ScheduleIcon,
  XIcon,
} from '../lib/icons'
import { routeHref, type Route } from '../lib/useHashRoute'
import styles from './Sidebar.module.css'

const NAV: { id: Route; label: string; Icon: typeof DashboardIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { id: 'certifications', label: 'Certifications', Icon: CertIcon },
  { id: 'materials', label: 'Materials', Icon: MaterialsIcon },
  { id: 'schedule', label: 'Schedule', Icon: ScheduleIcon },
]

function BrandMark() {
  // Progress-ring glyph — the "show progress" motif, in the accent.
  return (
    <svg viewBox="0 0 28 28" width={28} height={28} aria-hidden="true">
      <circle
        cx="14"
        cy="14"
        r="10.5"
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth="3"
      />
      <path
        d="M14 3.5a10.5 10.5 0 0 1 9.09 15.75"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="14" cy="14" r="3" fill="var(--accent)" />
    </svg>
  )
}

export function Sidebar({
  open,
  onClose,
  route,
  counts,
}: {
  open: boolean
  onClose: () => void
  route: Route
  counts: { certifications: number; materials: number; schedule: number }
}) {
  return (
    <>
      <div
        className={styles.scrim}
        data-open={open}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={styles.sidebar} data-open={open}>
        <div className={styles.head}>
          <a
            className={styles.brand}
            href={routeHref('dashboard')}
            aria-label="Certus — home"
          >
            <BrandMark />
            <span className={styles.wordmark}>Certus</span>
          </a>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close menu"
          >
            <XIcon size={20} />
          </button>
        </div>

        <nav className={styles.nav} aria-label="Primary">
          <ul>
            {NAV.map(({ id, label, Icon }) => {
              const active = id === route
              const count = counts[id as keyof typeof counts]
              return (
                <li key={id}>
                  <a
                    href={routeHref(id)}
                    className={styles.navItem}
                    data-active={active}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={19} />
                    <span>{label}</span>
                    {count != null && count > 0 && (
                      <span className={styles.count}>{count}</span>
                    )}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className={styles.foot}>
          <ThemeToggle />
        </div>
      </aside>
    </>
  )
}
