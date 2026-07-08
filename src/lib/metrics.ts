import type { Certification, Domain, PracticeAttempt } from '../data/types'

export function sortedAttempts(cert: Certification): PracticeAttempt[] {
  return [...cert.attempts].sort((a, b) => a.date.localeCompare(b.date))
}

export function lastAttempt(cert: Certification): PracticeAttempt | undefined {
  const s = sortedAttempts(cert)
  return s[s.length - 1]
}

/** Change from the previous attempt to the latest, in points. */
export function scoreTrend(cert: Certification): number | undefined {
  const s = sortedAttempts(cert)
  if (s.length < 2) return undefined
  return s[s.length - 1].score - s[s.length - 2].score
}

/** Exam-weighted average of domain mastery, 0–100. */
export function weightedMastery(cert: Certification): number {
  const totalWeight = cert.domains.reduce((sum, d) => sum + d.weight, 0)
  if (totalWeight === 0) return 0
  const weighted = cert.domains.reduce((sum, d) => sum + d.mastery * d.weight, 0)
  return Math.round(weighted / totalWeight)
}

/** Domains below the passing line, weakest first. */
export function weakestDomains(cert: Certification): Domain[] {
  return [...cert.domains].sort((a, b) => a.mastery - b.mastery)
}

export type MasteryBand = 'weak' | 'fair' | 'strong'

export function masteryBand(mastery: number, passing: number): MasteryBand {
  if (mastery >= passing + 8) return 'strong'
  if (mastery >= passing - 6) return 'fair'
  return 'weak'
}

/** How ready, in words — derived, never a fabricated single %. */
export function readiness(cert: Certification): {
  band: 'not-started' | 'building' | 'closing-in' | 'ready'
  label: string
} {
  const last = lastAttempt(cert)
  if (!last) return { band: 'not-started', label: 'Not started' }
  const gap = last.score - cert.passingScore
  if (gap >= 6) return { band: 'ready', label: 'On track to pass' }
  if (gap >= -2) return { band: 'closing-in', label: 'Right at the line' }
  return { band: 'building', label: 'Building up' }
}

export function totalCoveredMaterials(cert: Certification): number {
  return cert.materials.length
}
