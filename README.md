# Certus — Certification Tracker

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white)
![Databricks Apps](https://img.shields.io/badge/runs%20on-Databricks%20Apps-FF3621?logo=databricks&logoColor=white)

A personal home base for studying toward professional certifications.

**Why it exists:** studying for a certification usually means a spreadsheet of
exam dates, a dozen bookmarked PDFs, and a vague sense of "am I ready yet?"
Certus puts all of that in one calm place. It shows which exam is next, how
ready you are for each topic, and what to study today. It can also generate a
practice test from the official exam guide.

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Setup](#setup)
- [Usage](#usage)
- [Local development](#local-development)
- [How it works](#how-it-works)
- [Troubleshooting](#troubleshooting)
- [Further reading](#further-reading)
- [License](#license)
- [Contact](#contact)

## Features

- **Dashboard.** Your next exam, how ready you are, and the topics to study next.
- **Certifications.** Every cert you're pursuing or have earned, with its exam
  date, passing score, and credential link.
- **Topic mastery.** Rate each exam domain, weighted by how much of the exam it
  covers.
- **Practice tests.** Log scores from any practice exam, or have Certus generate
  a multiple-choice quiz from the exam guide PDF.
- **Materials.** Keep every study link and resource next to the cert it belongs to.
- **Schedule.** A calendar and timeline of upcoming exams.
- **Light and dark themes**, keyboard-friendly, WCAG AA contrast.

## Requirements

- A **Databricks workspace** with these enabled:
  - [Databricks Apps](https://docs.databricks.com/en/dev-tools/databricks-apps/index.html)
    (hosting and sign-in)
  - [Lakebase](https://docs.databricks.com/en/oltp/index.html) (the Postgres
    database that stores your data)
  - Foundation Model APIs with the `databricks-claude-sonnet-5` endpoint (only
    needed for generated practice tests)
- The [Databricks CLI](https://docs.databricks.com/en/dev-tools/cli/install.html),
  logged in to that workspace (`databricks auth login`)
- [Node.js](https://nodejs.org/) 18 or newer, to build the frontend

## Setup

The commands below use two placeholders. Replace `<your-profile>` with your
Databricks CLI profile name and `<you>` with your workspace username (usually
your email).

**1. Clone and build the frontend**

```bash
git clone https://github.com/cwrneiro/certus.git
cd certus
npm ci
npm run build
```

**2. Create the database and the app**

```bash
databricks postgres create-project certus --profile <your-profile>
databricks apps create certus --profile <your-profile>
```

**3. Connect the database to the app**

In the workspace UI, open **Compute → Apps → certus → Edit**, add a
**Lakebase database** resource pointing at the `certus` project, give it the
key **`postgres`**, and grant **Can connect and create**. The key must be
exactly `postgres`, because `app.yaml` reads the connection details from it.

**4. Deploy**

Copy only the files the app needs into a clean folder, upload it, and deploy:

```bash
rm -rf /tmp/certus-deploy && mkdir /tmp/certus-deploy
rsync -a --exclude __pycache__ app.yaml requirements.txt server dist /tmp/certus-deploy/
databricks sync /tmp/certus-deploy /Workspace/Users/<you>/certus --profile <your-profile>
databricks apps deploy certus --source-code-path /Workspace/Users/<you>/certus --profile <your-profile>
```

**5. Check that it started**

```bash
databricks apps logs certus --profile <your-profile>
```

Look for `Application startup complete`, then open the app URL shown by
`databricks apps get certus --profile <your-profile>`.

To redeploy after making changes, run `npm run build` again and repeat step 4.

### Optional: start with sample data

When the table is empty on first startup, the backend loads `server/seed.json`
if that file exists. It's gitignored so your personal data stays out of the
repo. To use it, create the file as a JSON array of certifications (the shape is
`Certification` in [`src/data/types.ts`](src/data/types.ts)), then deploy:

```json
[
  {
    "id": "aws-saa",
    "provider": "Amazon Web Services",
    "name": "Certified Solutions Architect – Associate",
    "shortName": "Solutions Architect Associate",
    "status": "scheduled",
    "examDate": "2026-12-01",
    "passingScore": 72
  }
]
```

`status` is one of `queued`, `in-progress`, `scheduled`, or `passed`.

## Usage

1. **Add a certification** from the Certifications page: provider, name, exam
   date, and passing score.
2. **Add its topics** (exam domains) and rate your mastery of each one. The
   dashboard uses these ratings to show what to study next.
3. **Log practice tests** as you take them. Scores below the passing line are
   flagged so you know where to focus.
4. **Generate a practice test:** on the dashboard's *Practice tests* card, paste
   the URL of the official exam guide PDF. Generation runs in the background and
   takes about a minute. Then click **Take practice test**.
5. **Mark it passed** when you're done, with your score and credential link.

Practice-test keyboard shortcuts:

| Key | Action |
|-----|--------|
| `1`–`4` | Choose an answer |
| `Enter` / `→` | Next question |
| `←` | Previous question |
| `Esc` | Close a certification's detail panel |

## Local development

```bash
npm ci
npm run dev        # http://localhost:5173
npm run build      # type-check (tsc) and production build
```

`npm run dev` starts only the frontend, and with no backend the app shows its
error state. To work on the UI with real data, point the dev server at your
deployed app with a short-lived token:

```bash
CERTUS_API=<your-app-url> \
CERTUS_TOKEN=$(databricks auth token -p <your-profile> | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])') \
npm run dev
```

The token expires after about an hour, so rerun the command to refresh it.

The backend runs only inside Databricks Apps. Its database credentials come from
the app's own identity, so there's no local backend setup.

## How it works

```
Browser ──▶ Databricks Apps (sign-in) ──▶ FastAPI  (server/app.py)
                                            ├─ /api/certifications ──▶ Lakebase Postgres
                                            ├─ practice tests      ──▶ Foundation Model API
                                            └─ static files        ──▶ dist/ (React app)
```

- **Frontend:** React 18, TypeScript, and Vite, styled with CSS Modules, with a
  small built-in hash router (`#/dashboard`, `#/quiz/<certId>`, …). The code is
  in `src/`: pages in `src/pages/`, components in `src/components/`, and the API
  client in `src/lib/api.ts`.
- **Backend:** a single FastAPI app serves both the built frontend and the API,
  so there's one process and one origin (no CORS).
- **Data:** a single table, `certus.certifications`. Each cert's topics,
  practice attempts, materials, and quiz questions are stored as JSONB columns,
  so a row matches the frontend's `Certification` type one-to-one.
- **Practice tests:** the backend downloads the guide PDF and extracts its text.
  It asks the model for the exam outline, then asks for questions in parallel
  batches of 5. This runs in a background thread because Databricks Apps cuts
  off requests at 300 seconds. The frontend polls until the quiz is ready.

### API

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/certifications` | List all certifications |
| `GET` | `/api/certifications/{id}` | Get one (also used to poll quiz generation) |
| `POST` | `/api/certifications` | Add one |
| `PATCH` | `/api/certifications/{id}` | Update some fields |
| `DELETE` | `/api/certifications/{id}` | Remove one |
| `POST` | `/api/certifications/{id}/quiz/generate` | Start generating a practice test (returns `202`) |

## Troubleshooting

- **The app won't start / `w.postgres` is missing.** Databricks Apps comes with
  an old `databricks-sdk` preinstalled. `requirements.txt` requires
  `databricks-sdk>=0.91.0`, so check that the file was included in your deploy.
- **`permission denied for schema certus`.** The app's own identity needs to
  own the `certus` schema. To ensure it does, deploy the app first and let it
  create the schema, before connecting to the database any other way.
- **Port errors on startup.** Databricks Apps doesn't expand
  `${DATABRICKS_APP_PORT}` inside `command` arguments. That's why `app.yaml`
  starts uvicorn through `sh -c`. Keep it that way.
- **Practice-test generation fails with a permission error.** Add the
  `databricks-claude-sonnet-5` serving endpoint to the app as a resource with
  **Can query**.

## Further reading

- [`PRODUCT.md`](PRODUCT.md): who the app is for, its purpose, and its voice.
- [`DESIGN.md`](DESIGN.md): the visual design system, "The Warm Ledger".

## License

[MIT](LICENSE) © 2026 Augusto Carneiro

## Contact

Built by Augusto Carneiro ([@cwrneiro](https://github.com/cwrneiro)). Found a
bug or have an idea? [Open an issue](https://github.com/cwrneiro/certus/issues).
