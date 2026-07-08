import styles from './Sparkline.module.css'

interface Point {
  score: number
  label: string
}

/** Small score-trend line for practice attempts, with a passing baseline.
   Purely decorative-supporting; the real values live in the list beside it. */
export function Sparkline({
  points,
  passing,
  width = 132,
  height = 48,
}: {
  points: Point[]
  passing: number
  width?: number
  height?: number
}) {
  if (points.length === 0) return null

  const pad = 6
  // Scale tight to the data (plus the passing line) so the trend is legible,
  // not compressed against a fixed 0–100 axis.
  const values = points.map((p) => p.score)
  const lo = Math.min(passing, ...values)
  const hi = Math.max(passing, ...values)
  const min = lo - 7
  const max = hi + 7
  const range = max - min || 1

  const x = (i: number) =>
    points.length === 1
      ? width / 2
      : pad + (i * (width - pad * 2)) / (points.length - 1)
  const y = (score: number) =>
    pad + (1 - (score - min) / range) * (height - pad * 2)

  const line = points.map((p, i) => `${x(i)},${y(p.score)}`).join(' ')
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`
  const passY = y(passing)
  const last = points[points.length - 1]
  const above = last.score >= passing

  return (
    <svg
      className={styles.spark}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Practice scores trending to ${last.score}%, passing line ${passing}%`}
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className={styles.gradTop} />
          <stop offset="100%" className={styles.gradBottom} />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sparkFill)" />
      <line
        x1={pad}
        x2={width - pad}
        y1={passY}
        y2={passY}
        className={styles.passLine}
      />
      <polyline points={line} className={styles.trend} data-above={above} />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.score)}
          r={i === points.length - 1 ? 3.5 : 2.5}
          className={styles.dot}
          data-last={i === points.length - 1}
        />
      ))}
    </svg>
  )
}
