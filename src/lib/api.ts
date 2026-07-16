import type { Certification, CertPatch, NewCertInput } from '../data/types'

/** Client for the Certus backend (FastAPI + Lakebase). */

async function errorFrom(res: Response, fallback: string): Promise<Error> {
  let message = fallback
  try {
    const body = await res.json()
    if (body?.detail) message = body.detail
  } catch {
    /* keep default message */
  }
  return new Error(message)
}

export async function fetchCertifications(): Promise<Certification[]> {
  const res = await fetch('/api/certifications')
  if (!res.ok) throw new Error('Failed to load certifications')
  return res.json()
}

/** Fetch a single certification — used to poll background quiz generation. */
export async function fetchCertification(id: string): Promise<Certification> {
  const res = await fetch(`/api/certifications/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error('Failed to load certification')
  return res.json()
}

export async function createCertification(
  input: NewCertInput,
): Promise<Certification> {
  const res = await fetch('/api/certifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw await errorFrom(res, 'Could not add certification.')
  return res.json()
}

export async function updateCertification(
  id: string,
  patch: CertPatch,
): Promise<Certification> {
  const res = await fetch(`/api/certifications/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw await errorFrom(res, 'Could not save changes.')
  return res.json()
}

/**
 * Kick off in-app practice-test generation from an exam-guide PDF. The model
 * call far exceeds the request timeout, so the backend runs it in the
 * background and returns the cert immediately in its `quizStatus: 'generating'`
 * state. Poll `fetchCertification` until `quizStatus` clears (success) or
 * becomes `'error'`.
 */
export async function generateQuiz(
  id: string,
  guideUrl: string,
): Promise<Certification> {
  const res = await fetch(
    `/api/certifications/${encodeURIComponent(id)}/quiz/generate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guideUrl }),
    },
  )
  if (!res.ok)
    throw await errorFrom(res, 'Could not build a practice test from that guide.')
  return res.json()
}
