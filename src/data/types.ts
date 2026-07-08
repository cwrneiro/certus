export type CertStatus = 'in-progress' | 'scheduled' | 'passed' | 'queued'

export type MaterialType = 'course' | 'doc' | 'video' | 'note' | 'practice'

export interface Material {
  id: string
  title: string
  source: string
  type: MaterialType
  url: string
  /** Optional: which domain(s) this material best covers, by domain id. */
  domainIds?: string[]
}

export interface Domain {
  id: string
  name: string
  /** Share of the exam this domain represents (0–1). */
  weight: number
  /** Latest practice-test accuracy for this domain, 0–100. */
  mastery: number
}

export interface PracticeAttempt {
  id: string
  provider: string
  date: string // ISO yyyy-mm-dd
  score: number // 0–100
  url: string
}

export interface Certification {
  id: string
  provider: string
  name: string
  shortName: string
  status: CertStatus
  /** ISO date of the booked/target exam, if any. */
  examDate?: string
  passingScore: number
  /** For passed certs: the score achieved. */
  achievedScore?: number
  domains: Domain[]
  attempts: PracticeAttempt[]
  materials: Material[]
  /** Minutes studied this week (honest activity, not a streak). */
  focusMinutesThisWeek?: number
  /** Public verification URL for an earned credential (badge page). */
  credentialUrl?: string
}

/** Fields captured by the inline "Add certification" form. */
export interface NewCertInput {
  provider: string
  name: string
  passingScore: number
  status: Exclude<CertStatus, 'passed'>
  /** ISO yyyy-mm-dd; required when status is 'scheduled'. */
  examDate?: string
  /** Public verification URL for an earned credential. */
  credentialUrl?: string
}
