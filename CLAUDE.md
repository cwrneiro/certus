# Certification Tracker

"Certus" — a personal home base for tracking certification study. See `README.md`
for the full architecture, data model, API, local dev, and deployment runbook.

## Architecture (at a glance)

- **Frontend:** React 18 + TypeScript + Vite, CSS Modules. Static SPA with a
  dependency-free hash router (`src/lib/useHashRoute.ts`); pages in `src/pages/`.
  Data comes from the backend via `src/lib/api.ts` — there is no in-repo seed the
  UI reads (data lives in Lakebase).
- **Backend:** FastAPI (`server/app.py`) serves the built `dist/` **and** a CRUD
  API (`/api/certifications`) over **Lakebase Postgres** (schema `certus`, nested
  arrays as JSONB). Seeds from `server/seed.json` only when the table is empty.
- **Hosting:** Databricks App `certus` on profile **<your-profile>**
  (<your-app-url>). Lakebase project
  `certus`. Deploy/gotchas are in `README.md` (port `sh -c`, `databricks-sdk>=0.91.0`,
  deploy-first for schema ownership).

When you change TypeScript types in `src/data/types.ts`, keep the backend
(`server/app.py` row mapping + inserts) and `server/seed.json` in sync.

## Design Context

This project has an impeccable design setup. Read these before doing UI work:

- **`PRODUCT.md`** — strategy. Register: `product`. A personal study home base for
  an individual professional working toward certifications: centralize study
  material, track exam prep and progress. Voice: **warm, encouraging, quietly
  confident** (supportive, focused, crisp).
- **`DESIGN.md`** — visual system. North Star **"The Warm Ledger"**.

**Direction in one breath:** restrained, Linear-like execution with warm
temperature. A **faint rose page with white cards** and one **deep-rose accent**
(`oklch(0.53 0.18 12)`) that carries progress, success, and the single primary
action. Semantic color is disciplined: **rose = progress/success, amber = below
the passing line, blue = booked exam, gray = queued/mid**. Single **humanist sans**
(Figtree, weight for hierarchy, tabular figures). **Light-first** with a
rose-accented warm-charcoal dark theme; responsive (not choreographed) motion;
keyboard-first; both themes WCAG AA.

**Hard don'ts:** no corporate-LMS look (dense tables, stock photos, clip-art
badges); no cheesy gamification (confetti, mascots, XP theatrics, badge walls);
never tint content cards pink (rose belongs to the page + accent only); never
flag "needs work" in rose (that's amber — rose means success); no status by
color alone.

Design principles: show progress don't perform it · calm under focus · one home
for everything · respect the keyboard · warm not cute.
