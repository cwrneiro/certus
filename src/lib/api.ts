import type { Certification, NewCertInput } from '../data/types'

/** Client for the Certus backend (FastAPI + Lakebase). */

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
  if (!res.ok) {
    let message = 'Could not add certification.'
    try {
      const body = await res.json()
      if (body?.detail) message = body.detail
    } catch {
      /* keep default message */
    }
    throw new Error(message)
  }
  return res.json()
}
