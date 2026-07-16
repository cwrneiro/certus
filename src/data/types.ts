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

export interface QuizOption {
  id: string
  text: string
}

/** One AI-generated multiple-choice question, drawn from an exam guide. */
export interface QuizQuestion {
  id: string
  prompt: string
  options: QuizOption[]
  /** The id of the single correct option. */
  correctOptionId: string
  /** Why the correct answer is right — shown on the results screen. */
  explanation: string
  /** Which domain this question tests, by domain id (for per-topic scoring). */
  domainId?: string
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
  /** In-app practice questions, AI-generated from the exam guide. */
  quizQuestions: QuizQuestion[]
  /** The exam-guide PDF the quiz was generated from, if any. */
  examGuideUrl?: string
  /** Background quiz generation state: 'generating' | 'error' | null (idle/done). */
  quizStatus?: 'generating' | 'error' | null
  /** Message when the last generation failed. */
  quizError?: string | null
  /** Minutes studied this week (honest activity, not a streak). */
  focusMinutesThisWeek?: number
  /** Public verification URL for an earned credential (badge page). */
  credentialUrl?: string
}

/** Array items in a patch may omit `id` — the server generates one. */
type WithOptionalId<T extends { id: string }> = Omit<T, 'id'> & { id?: string }

/** Partial update sent to PATCH /api/certifications/{id}. */
export type CertPatch = Partial<
  Pick<
    Certification,
    | 'status'
    | 'examDate'
    | 'passingScore'
    | 'achievedScore'
    | 'credentialUrl'
    | 'focusMinutesThisWeek'
  >
> & {
  domains?: WithOptionalId<Domain>[]
  attempts?: WithOptionalId<PracticeAttempt>[]
  materials?: WithOptionalId<Material>[]
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
