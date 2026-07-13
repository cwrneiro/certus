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
