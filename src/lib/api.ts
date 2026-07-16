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
 * Generate an in-app practice test from an exam-guide PDF. The backend fetches
 * the guide, extracts the outline + sample questions, and asks a Foundation
 * Model to write a multiple-choice set — persisting the questions (and any
 * newly discovered domains) onto the cert. Slow (a model call), so callers
 * should show a working state.
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
