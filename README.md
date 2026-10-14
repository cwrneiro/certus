# Certus — Certification Tracker

A calm, warm home base for studying toward professional certifications: centralize
study material, track exam prep and progress, and keep every earned credential in
one place.

Deployed as a Databricks App (sign-in required).

---

## Stack

| Layer | Tech |
|------|------|
| Frontend | React 18 + TypeScript + Vite, CSS Modules (design tokens in `src/styles/`) |
| Routing | Dependency-free hash router (`src/lib/useHashRoute.ts`) |
| Backend | FastAPI (Python) — `server/app.py` |
| Database | Lakebase (Databricks serverless Postgres, Autoscaling) |
| AI | Databricks Foundation Model API (practice-test generation) |
| Hosting | Databricks Apps |

The frontend is a static SPA. In production the FastAPI backend serves the built
`dist/` **and** a small CRUD API over Lakebase — one process, one origin, no CORS.

## Architecture

```
Browser ──▶ Databricks Apps proxy (SSO) ──▶ uvicorn / FastAPI (server/app.py)
                                              ├─ GET/POST/DELETE /api/certifications
                                              │     └─ psycopg3 ──▶ Lakebase Postgres
                                              │                     (schema "certus")
                                              └─ static files  ──▶ dist/  (React SPA)
```

Routing is hash-based (`#/dashboard`, `#/certifications`, …), so the server only
ever serves `/` and hashed asset paths — no history-fallback rewriting needed.

## Project structure

```
├── index.html              # Vite entry; loads Figtree + sets theme pre-paint
├── src/
│   ├── App.tsx             # Shell: data fetch, routing, loading/error states
│   ├── pages/              # DashboardPage, CertificationsPage, MaterialsPage, SchedulePage
│   ├── components/         # FocusCert, CertCard, ScheduleCalendar, Segmented, AddCertForm, …
│   ├── lib/                # api.ts (backend client), useHashRoute, metrics, format, icons
│   ├── data/types.ts       # Shared TypeScript types (Certification, Domain, …)
│   └── styles/             # tokens.css (design tokens) + base.css (reset)
├── server/
│   ├── app.py              # FastAPI: schema init, seed, CRUD API, static serving
│   └── seed.json           # Bootstrap data (inserted only when the table is empty)
├── requirements.txt        # Python deps (fastapi, uvicorn, psycopg, databricks-sdk)
├── app.yaml                # Databricks Apps runtime config (command + LAKEBASE_ENDPOINT)
├── PRODUCT.md              # Product strategy & voice
└── DESIGN.md              # Visual design system ("The Warm Ledger")
```

## Data model

One table, `certus.certifications`, with the nested arrays stored as JSONB (they map
1:1 to the frontend `Certification` shape, so no joins are needed):

| Column | Notes |
|--------|-------|
| `id` (PK), `provider`, `name`, `short_name`, `status` | `status` ∈ `queued` · `in-progress` · `scheduled` · `passed` |
| `exam_date`, `passing_score`, `achieved_score` | achieved score only for `passed` |
| `domains`, `attempts`, `materials`, `quiz_questions` | `jsonb` |
| `exam_guide_url` | source guide the practice test was generated from |
| `quiz_status`, `quiz_error` | background generation state (`generating` · `error` · NULL) |
| `credential_url` | public badge/verification link |
| `sort_order`, `created_at` | ordering |

### API

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/certifications` | list all (ordered) |
| `GET` | `/api/certifications/{id}` | one cert (used to poll quiz generation) |
| `POST` | `/api/certifications` | add one (validated) |
| `PATCH` | `/api/certifications/{id}` | partial update (status, scores, domains, attempts, materials) |
| `POST` | `/api/certifications/{id}/quiz/generate` | start async practice-test generation (returns `202`) |
| `DELETE` | `/api/certifications/{id}` | remove one |

### Practice tests (in-app quiz)

The dashboard's **Practice tests** card can build an interactive multiple-choice
quiz from an exam guide. Paste the guide's PDF URL; the backend downloads it,
extracts the text (`pypdf`), and asks a Foundation Model
(`databricks-claude-sonnet-5`, via the endpoint's OpenAI-compatible
`/invocations` route with a strict JSON schema) to produce the exam outline
(domains + weights) and questions tagged by domain. Newly discovered domains
are merged into the cert (existing domains keep their id + mastery).

**Generation is asynchronous.** A single model call for the whole test exceeds
the Databricks Apps proxy's 300s request cap, so `POST .../quiz/generate` marks
the row `quiz_status = 'generating'`, starts a background thread, and returns
`202` immediately. The thread runs generation in two phases — one call for the
outline, then question batches (5 each) **in parallel** across a thread pool, so
the whole thing finishes in well under a minute (~45s) instead of timing out.
The frontend polls `GET /api/certifications/{id}` every 4s until `quiz_status`
clears (done) or becomes `'error'` (message stored in `quiz_error`).

Taking a quiz opens a **full-screen, distraction-free view** (its own route,
`#/quiz/<certId>`, rendered outside the sidebar shell — one question at a time,
keyboard-first). On finish it logs a normal practice attempt (overall score) and
updates each tested domain's mastery — so it flows into the same sparkline,
readiness, and weighted-mastery views as a manually logged test.

## Local development

**Frontend** (UI work; needs a backend for data):

```bash
npm install
npm run dev        # http://localhost:5173
```

`npm run dev` alone has no `/api` backend, so the app shows its error state. To
develop the UI against **live** data, proxy `/api` to the deployed app with an
OAuth token (dev-only):

```bash
CERTUS_API=<your-app-url> \
CERTUS_TOKEN=$(databricks auth token -p <your-profile> | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])') \
npm run dev
```

(`vite.config.ts` wires this proxy only when `CERTUS_API` is set.)

**Build / typecheck:** `npm run build` (runs `tsc --noEmit` then `vite build`).

> Running the FastAPI backend locally against Lakebase requires deploy-first (the
> app's service principal must own the `certus` schema). See Deployment.

## Deployment (Databricks App + Lakebase)

Prereqs: Databricks CLI ≥ 1.x authenticated to the `<your-profile>` profile. The
app (`certus`) and Lakebase project (`certus`) already exist; the `postgres`
resource is attached to the app.

```bash
# 1. Build the frontend
npm run build

# 2. Stage a clean dir (app.yaml + requirements.txt + server/ + dist/ only — no node_modules)
#    then upload and deploy:
databricks sync <staged-dir> /Workspace/Users/<you>/certus --profile <your-profile>
databricks apps deploy certus --source-code-path /Workspace/Users/<you>/certus --profile <your-profile>

# 3. Verify
databricks apps logs certus --profile <your-profile>      # want "Application startup complete"
```

On first startup the backend creates the `certus` schema + table and seeds from
`server/seed.json` (only if empty).

### Gotchas (learned the hard way)

- **Port:** the Apps runtime does **not** expand `${DATABRICKS_APP_PORT}` inside
  `command` args, so `app.yaml` runs uvicorn through `sh -c` to let the shell expand it.
- **SDK:** the runtime preinstalls an old `databricks-sdk` without `w.postgres`;
  `requirements.txt` pins `databricks-sdk>=0.91.0` so pip upgrades it.
- **Schema ownership:** deploy before any local DB work so the service principal
  owns the schema (otherwise `permission denied`).

## Design

This project has a committed design system — read before UI work:

- **`PRODUCT.md`** — strategy, users, voice (warm, encouraging, quietly confident).
- **`DESIGN.md`** — the visual system, North Star **"The Warm Ledger"** (faint rose
  page, white cards, one deep-rose accent for progress/success; amber below the
  passing line; blue for booked exams). Light + dark, WCAG AA, keyboard-first.
