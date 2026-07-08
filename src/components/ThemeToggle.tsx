import { useTheme } from '../lib/useTheme'
import { SunIcon, MoonIcon } from '../lib/icons'
import styles from './ThemeToggle.module.css'

export function ThemeToggle() {
  const [theme, toggle] = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      <span className={styles.track} data-theme={theme}>
        <span className={styles.thumb}>
          {theme === 'dark' ? <MoonIcon size={14} /> : <SunIcon size={14} />}
        </span>
      </span>
      <span className={styles.label}>{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  )
}
