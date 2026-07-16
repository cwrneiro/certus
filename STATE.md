# STATE — session handoff

## Current focus
AI-generated in-app practice tests. New: paste an exam-guide PDF URL on the
dashboard's Practice tests card → backend fetches + parses it and a Foundation
Model writes a multiple-choice quiz. Taking the quiz logs a practice attempt +
per-domain mastery through the existing update path.

## Last completed
Built the feature end-to-end (not yet committed or deployed):
- `types.ts`: `QuizQuestion`/`QuizOption`, `Certification.quizQuestions` + `examGuideUrl`.
- `server/app.py`: `quiz_questions`/`exam_guide_url` columns (additive migration),
  `POST /api/certifications/{id}/quiz/generate` (httpx + pypdf + FMAPI via
  `api_client.do` on `/serving-endpoints/{model}/invocations` with strict JSON schema).
- Frontend: `PracticeQuiz.tsx` (keyboard-first modal + results), quiz entry
  points in `PracticeTests.tsx`, `onReplace` threaded App→Dashboard→PracticeTests.
- `requirements.txt`: +httpx +pypdf. README data-model/API updated.
- Verified: `npm run build` clean; `_assemble_quiz` unit-checked; live end-to-end
  generation against the real Databricks guide PDF works.

## Next step
Commit, then deploy (see README). Consider deploy-time verify of the generate
endpoint against Lakebase.

## Gotchas / in-flight decisions
- **Model params:** `databricks-claude-sonnet-5` rejects `temperature` — omitted.
- **Latency:** generation can take ~2 min (15 Q @ 8000 tokens). UI shows a
  working state; watch the Databricks Apps proxy timeout on deploy.
- Model call uses `api_client.do` (not `serving_endpoints.query`) so it's robust
  across SDK versions and can pass `response_format`.
- Keep `src/data/types.ts`, `server/app.py` (row mapping + inserts), and
  `server/seed.json` in sync when types change.
- Deploy-first: the app's service principal must own the `certus` Lakebase
  schema before local DB work (`README.md` → Deployment → Gotchas).
