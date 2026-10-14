# STATE — session handoff

## Current focus
Shipped: AI-generated in-app practice tests. On the dashboard's Practice tests
card, paste an exam-guide PDF URL → backend generates a multiple-choice quiz in
the background → "Take practice test" opens a keyboard-first quiz whose result
logs a practice attempt + per-domain mastery through the existing update path.

## Last completed
Feature built and verified on branch `practice-tests`: initial feature → async
generation → parallel batching → docs → **full-screen quiz view** (its own
`#/quiz/<certId>` route, no sidebar; browser-verified). Earlier commits are
deployed; the full-screen-view commit is not yet deployed.

## Next step
Deploy the full-screen-view commit (see README), then open a PR from
`practice-tests`. Consider `/review` first.

## Gotchas / in-flight decisions
- **Apps proxy caps requests at 300s.** Generation MUST stay async: POST
  .../quiz/generate returns 202 + `quiz_status='generating'`, a background thread
  does the work, frontend polls GET /api/certifications/{id} every 4s.
- **Per-request SDK timeout is also 300s.** A single 15-question call blew past
  it, so generation is split: 1 outline call + parallel 5-question batches via a
  thread pool. End-to-end ~45s live. `_model_w` uses http_timeout_seconds=600.
- `databricks-claude-sonnet-5` rejects `temperature` (omitted). The endpoint
  sometimes double-encodes a list field as a JSON string → `_extract_list` unwraps.
- Batches slightly over-produce (asked 15, got ~20) — harmless.
- Model call uses `api_client.do` on `/serving-endpoints/{model}/invocations`
  (robust across SDK versions; accepts response_format).
- Keep `src/data/types.ts`, `server/app.py` (row mapping + inserts), and
  `server/seed.json` in sync when types change.
- Deploy-first: the app's service principal must own the `certus` Lakebase
  schema before local DB work (`README.md` → Deployment → Gotchas).
- Repo is sanitized for public GitHub: docs use `<your-profile>` / `<your-app-url>`
  placeholders (real values are in local Claude memory, not the repo), and
  `package-lock.json` resolves from registry.npmjs.org. History was rewritten.
