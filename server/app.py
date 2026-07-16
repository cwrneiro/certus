"""Certus backend — serves the static SPA and a small CRUD API backed by Lakebase.

Certifications (with their nested domains / attempts / materials as JSONB) live in
an app-owned `certus` schema. On first startup the schema + table are created and
seeded from seed.json, so the deployed app opens with real sample data and any
certs the user adds persist across refreshes and restarts.
"""

from __future__ import annotations

import json
import math
import os
import re
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import asynccontextmanager, contextmanager
from pathlib import Path
from typing import Any, cast

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Json
from databricks.sdk import WorkspaceClient
from databricks.sdk.config import Config
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
SEED_FILE = Path(__file__).resolve().parent / "seed.json"
SCHEMA = "certus"
VALID_STATUSES = {"queued", "in-progress", "scheduled", "passed"}

# Foundation Model used to turn an exam guide into a practice test. Any
# llm/v1/chat endpoint on the workspace works; this one gives reliable JSON.
QUIZ_MODEL = "databricks-claude-sonnet-5"
QUIZ_QUESTION_COUNT = 15
QUIZ_BATCH_SIZE = 5  # questions per model call — small so each finishes fast
MAX_GUIDE_CHARS = 40_000  # plenty for an exam guide; keeps the prompt bounded

_w = WorkspaceClient()
# A separate client for model calls with a generous HTTP timeout — generating a
# batch can take a couple of minutes, above the SDK's 300s default per request.
_model_w = WorkspaceClient(config=Config(http_timeout_seconds=600))
_token_lock = threading.Lock()
_token_value_cache: str | None = None
_token_ts: float = 0.0
TOKEN_TTL = 40 * 60  # refresh well ahead of the 1-hour OAuth expiry


def _token_value(force_new: bool = False) -> str:
    global _token_value_cache, _token_ts
    with _token_lock:
        now = time.time()
        stale = _token_value_cache is None or now - _token_ts > TOKEN_TTL
        if force_new or stale:
            _token_value_cache = _w.postgres.generate_database_credential(
                endpoint=os.environ["LAKEBASE_ENDPOINT"]
            ).token
            _token_ts = now
        return cast(str, _token_value_cache)


def _connect(force_new_token: bool = False) -> psycopg.Connection:
    return psycopg.connect(
        host=os.environ["PGHOST"],
        port=int(os.environ.get("PGPORT", "5432")),
        dbname=os.environ["PGDATABASE"],
        user=os.environ["PGUSER"],
        password=_token_value(force_new=force_new_token),
        sslmode="require",
        row_factory=dict_row,  # type: ignore[arg-type]
        connect_timeout=15,
    )


@contextmanager
def get_conn():
    """A fresh connection per request — simple and robust across scale-to-zero
    wake-ups and token rotation. Retries once with a refreshed token."""
    try:
        conn = _connect()
    except psycopg.OperationalError:
        conn = _connect(force_new_token=True)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


DDL = f"""
CREATE SCHEMA IF NOT EXISTS {SCHEMA};
CREATE TABLE IF NOT EXISTS {SCHEMA}.certifications (
    id                       text PRIMARY KEY,
    provider                 text NOT NULL,
    name                     text NOT NULL,
    short_name               text NOT NULL,
    status                   text NOT NULL,
    exam_date                text,
    passing_score            integer NOT NULL,
    achieved_score           integer,
    focus_minutes_this_week  integer,
    domains                  jsonb NOT NULL DEFAULT '[]'::jsonb,
    attempts                 jsonb NOT NULL DEFAULT '[]'::jsonb,
    materials                jsonb NOT NULL DEFAULT '[]'::jsonb,
    quiz_questions           jsonb NOT NULL DEFAULT '[]'::jsonb,
    exam_guide_url           text,
    credential_url           text,
    sort_order               double precision NOT NULL DEFAULT 0,
    created_at               timestamptz NOT NULL DEFAULT now()
);
-- Additive migrations for tables created before these columns existed.
ALTER TABLE {SCHEMA}.certifications ADD COLUMN IF NOT EXISTS credential_url text;
ALTER TABLE {SCHEMA}.certifications ADD COLUMN IF NOT EXISTS quiz_questions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE {SCHEMA}.certifications ADD COLUMN IF NOT EXISTS exam_guide_url text;
-- Generation runs in the background (it exceeds the Apps proxy timeout), so we
-- track its state on the row: 'generating' | 'error' | NULL (idle/done).
ALTER TABLE {SCHEMA}.certifications ADD COLUMN IF NOT EXISTS quiz_status text;
ALTER TABLE {SCHEMA}.certifications ADD COLUMN IF NOT EXISTS quiz_error text;
"""


def _one(cur) -> dict[str, Any]:
    """fetchone() as a dict (row_factory=dict_row makes rows dicts at runtime)."""
    return cast("dict[str, Any]", cur.fetchone())


def _row_to_cert(r: dict) -> dict:
    return {
        "id": r["id"],
        "provider": r["provider"],
        "name": r["name"],
        "shortName": r["short_name"],
        "status": r["status"],
        "examDate": r["exam_date"],
        "passingScore": r["passing_score"],
        "achievedScore": r["achieved_score"],
        "focusMinutesThisWeek": r["focus_minutes_this_week"],
        "domains": r["domains"],
        "attempts": r["attempts"],
        "materials": r["materials"],
        "quizQuestions": r["quiz_questions"],
        "examGuideUrl": r["exam_guide_url"],
        "quizStatus": r["quiz_status"],
        "quizError": r["quiz_error"],
        "credentialUrl": r["credential_url"],
    }


def _insert_cert(conn, c: dict, sort_order: float) -> None:
    conn.execute(
        f"""INSERT INTO {SCHEMA}.certifications
            (id, provider, name, short_name, status, exam_date, passing_score,
             achieved_score, focus_minutes_this_week, domains, attempts, materials,
             quiz_questions, exam_guide_url, credential_url, sort_order)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (id) DO NOTHING""",
        (
            c["id"],
            c["provider"],
            c["name"],
            c.get("shortName", c["name"]),
            c["status"],
            c.get("examDate"),
            c["passingScore"],
            c.get("achievedScore"),
            c.get("focusMinutesThisWeek"),
            Json(c.get("domains", [])),
            Json(c.get("attempts", [])),
            Json(c.get("materials", [])),
            Json(c.get("quizQuestions", [])),
            c.get("examGuideUrl"),
            c.get("credentialUrl"),
            sort_order,
        ),
    )


def _init_db() -> None:
    with get_conn() as conn:
        conn.execute(DDL)
        count = _one(
            conn.execute(f"SELECT count(*) AS c FROM {SCHEMA}.certifications")
        )["c"]
        if count == 0 and SEED_FILE.exists():
            seed = json.loads(SEED_FILE.read_text())
            for i, cert in enumerate(seed):
                _insert_cert(conn, cert, sort_order=float(i))


def _slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "cert"


@asynccontextmanager
async def lifespan(_: FastAPI):
    _init_db()
    yield


app = FastAPI(lifespan=lifespan)


class NewCert(BaseModel):
    provider: str
    name: str
    passingScore: int
    status: str
    examDate: str | None = None
    achievedScore: int | None = None
    credentialUrl: str | None = None


class CertPatch(BaseModel):
    """Partial update. Only fields the client actually sent are applied
    (model_dump(exclude_unset=True)), so explicit nulls clear a value."""

    status: str | None = None
    examDate: str | None = None
    passingScore: int | None = None
    achievedScore: int | None = None
    credentialUrl: str | None = None
    focusMinutesThisWeek: int | None = None
    domains: list[dict] | None = None
    attempts: list[dict] | None = None
    materials: list[dict] | None = None


MATERIAL_TYPES = {"course", "doc", "video", "note", "practice"}


def _validated_domains(items: list[dict]) -> list[dict]:
    out = []
    for d in items:
        name = str(d.get("name", "")).strip()
        if not name:
            raise HTTPException(400, "Every domain needs a name.")
        try:
            weight = float(d.get("weight", 0))
            mastery = float(d.get("mastery", 0))
        except (TypeError, ValueError):
            raise HTTPException(400, "Domain weight and mastery must be numbers.")
        if not 0 <= weight <= 1:
            raise HTTPException(400, "Domain weight must be between 0 and 1.")
        if not 0 <= mastery <= 100:
            raise HTTPException(400, "Domain mastery must be between 0 and 100.")
        out.append(
            {
                "id": str(d.get("id") or f"d-{uuid.uuid4().hex[:8]}"),
                "name": name,
                "weight": weight,
                "mastery": round(mastery),
            }
        )
    return out


def _validated_attempts(items: list[dict]) -> list[dict]:
    out = []
    for a in items:
        try:
            score = float(a.get("score", -1))
        except (TypeError, ValueError):
            raise HTTPException(400, "Attempt score must be a number.")
        if not 0 <= score <= 100:
            raise HTTPException(400, "Attempt score must be between 0 and 100.")
        date = str(a.get("date", "")).strip()
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
            raise HTTPException(400, "Attempt date must be yyyy-mm-dd.")
        out.append(
            {
                "id": str(a.get("id") or f"a-{uuid.uuid4().hex[:8]}"),
                "provider": str(a.get("provider", "")).strip() or "Practice test",
                "date": date,
                "score": round(score),
                "url": str(a.get("url", "")).strip(),
            }
        )
    return out


def _validated_materials(items: list[dict]) -> list[dict]:
    out = []
    for m in items:
        title = str(m.get("title", "")).strip()
        if not title:
            raise HTTPException(400, "Every material needs a title.")
        mtype = m.get("type")
        if mtype not in MATERIAL_TYPES:
            raise HTTPException(400, "Invalid material type.")
        entry = {
            "id": str(m.get("id") or f"m-{uuid.uuid4().hex[:8]}"),
            "title": title,
            "source": str(m.get("source", "")).strip(),
            "type": mtype,
            "url": str(m.get("url", "")).strip() or "#",
        }
        domain_ids = m.get("domainIds")
        if isinstance(domain_ids, list) and domain_ids:
            entry["domainIds"] = [str(x) for x in domain_ids]
        out.append(entry)
    return out


def _fetch_guide_text(url: str) -> str:
    """Download an exam-guide PDF (or HTML page) and return its plain text."""
    import httpx
    from pypdf import PdfReader

    try:
        resp = httpx.get(url, follow_redirects=True, timeout=30.0)
        resp.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(400, "Could not download that guide. Check the URL.")

    ctype = resp.headers.get("content-type", "").lower()
    data = resp.content
    is_pdf = "pdf" in ctype or url.lower().endswith(".pdf") or data[:5] == b"%PDF-"
    if is_pdf:
        from io import BytesIO

        try:
            reader = PdfReader(BytesIO(data))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            raise HTTPException(400, "That PDF could not be read.")
    else:
        # Best-effort text from an HTML page: strip tags.
        text = re.sub(r"<[^>]+>", " ", resp.text)

    # PDFs often extract one token per line; collapse runs of whitespace
    # (incl. newlines) to keep the prompt compact and readable.
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) < 200:
        raise HTTPException(
            400, "That guide didn't contain enough readable text to use."
        )
    return text[:MAX_GUIDE_CHARS]


QUIZ_SYSTEM_PROMPT = (
    "You are an expert certification exam-prep author. Given the text of an "
    "official certification exam guide, you produce (1) the exam's outline as a "
    "list of domains with their exam weight, and (2) a set of high-quality "
    "multiple-choice practice questions that reflect the real exam's style, "
    "difficulty, and topic distribution. Each question has exactly one correct "
    "answer and a short explanation. Base questions on the guide's actual "
    "objectives and any sample questions it contains. Respond with JSON only."
)


def _outline_schema() -> dict:
    return {
        "type": "object",
        "properties": {
            "domains": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "weight": {
                            "type": "number",
                            "description": "Share of the exam, 0-1.",
                        },
                    },
                    "required": ["name", "weight"],
                },
            },
        },
        "required": ["domains"],
    }


def _questions_schema() -> dict:
    return {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "prompt": {"type": "string"},
                        "options": {
                            "type": "array",
                            "items": {"type": "string"},
                            "minItems": 4,
                            "maxItems": 4,
                        },
                        "correctIndex": {
                            "type": "integer",
                            "description": "0-based index of the correct option.",
                        },
                        "explanation": {"type": "string"},
                        "domain": {
                            "type": "string",
                            "description": "Name of the domain this tests; must match one provided.",
                        },
                    },
                    "required": ["prompt", "options", "correctIndex", "explanation", "domain"],
                },
            },
        },
        "required": ["questions"],
    }


def _model_json(user_prompt: str, schema: dict, schema_name: str) -> dict:
    """Call the endpoint's OpenAI-compatible /invocations route (works across SDK
    versions and accepts response_format) and return the parsed JSON object."""
    payload = {
        "messages": [
            {"role": "system", "content": QUIZ_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": 4000,
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": schema_name, "schema": schema, "strict": True},
        },
    }
    try:
        resp = _model_w.api_client.do(
            "POST", f"/serving-endpoints/{QUIZ_MODEL}/invocations", body=payload
        )
    except Exception as exc:  # noqa: BLE001 — surface a clean message to the UI
        raise HTTPException(502, f"The question generator was unavailable: {exc}")

    choices = (resp or {}).get("choices") if isinstance(resp, dict) else None
    content = choices[0]["message"]["content"] if choices else None
    if not content:
        raise HTTPException(502, "The question generator returned nothing.")
    try:
        return json.loads(content)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(502, "The question generator returned malformed data.")


def _extract_list(parsed: dict, key: str) -> list:
    """Pull a list out of a model response, tolerating the endpoint occasionally
    double-encoding the value as a JSON string (e.g. {"domains": "{\"domains\":[…]}"})."""
    val = parsed.get(key)
    if isinstance(val, str):
        try:
            val = json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return []
    if isinstance(val, dict):  # unwrap {"domains": [...]} nested one level
        val = val.get(key)
    return val if isinstance(val, list) else []


def _generate_quiz(cert: dict, guide_text: str) -> dict:
    """Generate a practice test in two phases, kept small so each model call
    finishes well under the request timeout: (1) one call for the exam outline
    (domains + weights); (2) parallel calls for question batches, distributed
    across domains by weight. Returns validated {domains, quizQuestions}."""
    label = f"{cert['provider']} — {cert['name']}"

    # Phase 1 — outline.
    outline = _model_json(
        f"Certification: {label}.\nExtract the exam outline: the list of domains "
        "(knowledge areas) and each domain's weight as a share of the exam "
        f"(0-1, summing to ~1). Here is the exam guide:\n\n{guide_text}",
        _outline_schema(),
        "exam_outline",
    )
    domains = _merge_domains(cert, _extract_list(outline, "domains"))
    domain_names = [d["name"] for d in domains]
    if not domain_names:
        raise HTTPException(502, "Could not read the exam outline — try again.")

    # Phase 2 — question batches in parallel. Trim the guide for these prompts;
    # the outline already captured structure, so batches need less context.
    guide_excerpt = guide_text[:12_000]
    batch_count = max(1, math.ceil(QUIZ_QUESTION_COUNT / QUIZ_BATCH_SIZE))

    def gen_batch(i: int) -> list[dict]:
        want = min(
            QUIZ_BATCH_SIZE, QUIZ_QUESTION_COUNT - i * QUIZ_BATCH_SIZE
        )
        prompt = (
            f"Certification: {label}.\n"
            f"Write {want} multiple-choice practice questions (each with exactly "
            "4 options, one correct, plus a short explanation). Tag each with the "
            "domain it tests, chosen from: "
            f"{', '.join(domain_names)}.\n"
            "Distribute across those domains by exam weight. This is batch "
            f"{i + 1} of {batch_count} — make these questions distinct from a "
            "typical set (vary the domains and scenarios). Exam guide:\n\n"
            f"{guide_excerpt}"
        )
        out = _model_json(prompt, _questions_schema(), "practice_questions")
        return _extract_list(out, "questions")

    raw_questions: list[dict] = []
    errors: list[str] = []
    with ThreadPoolExecutor(max_workers=batch_count) as pool:
        futures = {pool.submit(gen_batch, i): i for i in range(batch_count)}
        for fut in as_completed(futures):
            try:
                raw_questions.extend(fut.result())
            except HTTPException as exc:
                errors.append(str(exc.detail))
            except Exception as exc:  # noqa: BLE001
                errors.append(str(exc))

    questions = _build_questions(domains, raw_questions)
    if not questions:
        detail = errors[0] if errors else "No usable questions came back — try again."
        raise HTTPException(502, detail)

    return {"domains": domains, "quizQuestions": questions}


def _merge_domains(cert: dict, generated: list[dict]) -> list[dict]:
    """Merge generated domains into the cert's existing ones by name, keeping
    existing ids + mastery and refreshing weight from the guide."""
    existing = list(cert.get("domains") or [])
    by_name = {d["name"].strip().lower(): d for d in existing}
    for gd in generated:
        name = str(gd.get("name", "")).strip()
        if not name:
            continue
        key = name.lower()
        try:
            weight = float(gd.get("weight", 0))
        except (TypeError, ValueError):
            weight = 0.0
        weight = min(max(weight, 0.0), 1.0)
        if key in by_name:
            by_name[key]["weight"] = weight
        else:
            new_d = {
                "id": f"d-{uuid.uuid4().hex[:8]}",
                "name": name,
                "weight": weight,
                "mastery": 0,
            }
            by_name[key] = new_d
            existing.append(new_d)
    return existing


def _build_questions(domains: list[dict], raw: list[dict]) -> list[dict]:
    """Turn raw model questions into stored questions with option ids, a resolved
    correctOptionId, and a domainId matched by name. Drops malformed entries."""
    by_name = {d["name"].strip().lower(): d for d in domains}
    questions = []
    for q in raw:
        prompt = str(q.get("prompt", "")).strip()
        opts = q.get("options") or []
        idx = q.get("correctIndex")
        if not prompt or not isinstance(opts, list) or len(opts) < 2:
            continue
        if not isinstance(idx, int) or not 0 <= idx < len(opts):
            continue
        options = [
            {"id": f"o-{uuid.uuid4().hex[:6]}", "text": str(o).strip()}
            for o in opts
        ]
        dname = str(q.get("domain", "")).strip().lower()
        domain_id = by_name[dname]["id"] if dname in by_name else None
        questions.append(
            {
                "id": f"q-{uuid.uuid4().hex[:8]}",
                "prompt": prompt,
                "options": options,
                "correctOptionId": options[idx]["id"],
                "explanation": str(q.get("explanation", "")).strip(),
                **({"domainId": domain_id} if domain_id else {}),
            }
        )
    return questions


@app.get("/api/certifications")
def list_certifications():
    with get_conn() as conn:
        rows = conn.execute(
            f"SELECT * FROM {SCHEMA}.certifications ORDER BY sort_order ASC, created_at ASC"
        ).fetchall()
    return [_row_to_cert(cast("dict[str, Any]", r)) for r in rows]


@app.post("/api/certifications", status_code=201)
def add_certification(body: NewCert):
    provider = body.provider.strip()
    name = body.name.strip()
    if not provider or not name:
        raise HTTPException(400, "Provider and name are required.")
    if body.status not in VALID_STATUSES:
        raise HTTPException(400, "Invalid status.")
    if not 1 <= body.passingScore <= 100:
        raise HTTPException(400, "Passing score must be between 1 and 100.")
    exam_date = body.examDate or None
    if body.status == "scheduled" and not exam_date:
        raise HTTPException(400, "An exam date is required when the exam is booked.")
    achieved = body.achievedScore
    if achieved is not None and not 0 <= achieved <= 100:
        raise HTTPException(400, "Achieved score must be between 0 and 100.")
    if body.status != "passed":
        achieved = None  # only earned certs carry an achieved score

    cert_id = f"{_slug(name)}-{uuid.uuid4().hex[:6]}"
    with get_conn() as conn:
        min_order = _one(
            conn.execute(
                f"SELECT COALESCE(MIN(sort_order), 0) AS m FROM {SCHEMA}.certifications"
            )
        )["m"]
        conn.execute(
            f"""INSERT INTO {SCHEMA}.certifications
                (id, provider, name, short_name, status, exam_date, passing_score,
                 achieved_score, credential_url, sort_order)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (cert_id, provider, name, name, body.status, exam_date, body.passingScore,
             achieved, (body.credentialUrl or None), min_order - 1),
        )
        row = _one(
            conn.execute(f"SELECT * FROM {SCHEMA}.certifications WHERE id = %s", (cert_id,))
        )
    return _row_to_cert(row)


@app.patch("/api/certifications/{cert_id}")
def update_certification(cert_id: str, body: CertPatch):
    patch = body.model_dump(exclude_unset=True)

    with get_conn() as conn:
        row = conn.execute(
            f"SELECT * FROM {SCHEMA}.certifications WHERE id = %s", (cert_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(404, "Certification not found.")
        cur = cast("dict[str, Any]", row)

        status = patch.get("status", cur["status"])
        if status not in VALID_STATUSES:
            raise HTTPException(400, "Invalid status.")

        passing = patch.get("passingScore", cur["passing_score"])
        if not 1 <= passing <= 100:
            raise HTTPException(400, "Passing score must be between 1 and 100.")

        exam_date = patch.get("examDate", cur["exam_date"]) or None
        if status == "scheduled" and not exam_date:
            raise HTTPException(400, "An exam date is required when the exam is booked.")

        achieved = patch.get("achievedScore", cur["achieved_score"])
        if achieved is not None and not 0 <= achieved <= 100:
            raise HTTPException(400, "Achieved score must be between 0 and 100.")
        if status != "passed":
            achieved = None  # only earned certs carry an achieved score

        focus = patch.get("focusMinutesThisWeek", cur["focus_minutes_this_week"])
        if focus is not None and focus < 0:
            raise HTTPException(400, "Focus minutes cannot be negative.")

        domains = (
            _validated_domains(patch["domains"])
            if patch.get("domains") is not None
            else cur["domains"]
        )
        attempts = (
            _validated_attempts(patch["attempts"])
            if patch.get("attempts") is not None
            else cur["attempts"]
        )
        materials = (
            _validated_materials(patch["materials"])
            if patch.get("materials") is not None
            else cur["materials"]
        )

        conn.execute(
            f"""UPDATE {SCHEMA}.certifications
                SET status = %s, exam_date = %s, passing_score = %s,
                    achieved_score = %s, focus_minutes_this_week = %s,
                    domains = %s, attempts = %s, materials = %s,
                    credential_url = %s
                WHERE id = %s""",
            (
                status,
                exam_date,
                passing,
                achieved,
                focus,
                Json(domains),
                Json(attempts),
                Json(materials),
                patch.get("credentialUrl", cur["credential_url"]) or None,
                cert_id,
            ),
        )
        updated = _one(
            conn.execute(f"SELECT * FROM {SCHEMA}.certifications WHERE id = %s", (cert_id,))
        )
    return _row_to_cert(updated)


class QuizGenerateRequest(BaseModel):
    guideUrl: str


def _run_quiz_generation(cert_id: str, cert: dict, guide_url: str) -> None:
    """Background worker: fetch the guide, generate the quiz, persist the result.
    Runs off-request because the model call far exceeds the Apps proxy timeout.
    Records success (quiz_status NULL) or failure (quiz_status 'error') on the row."""
    try:
        guide_text = _fetch_guide_text(guide_url)
        result = _generate_quiz(cert, guide_text)
        with get_conn() as conn:
            conn.execute(
                f"""UPDATE {SCHEMA}.certifications
                    SET domains = %s, quiz_questions = %s, exam_guide_url = %s,
                        quiz_status = NULL, quiz_error = NULL
                    WHERE id = %s""",
                (
                    Json(result["domains"]),
                    Json(result["quizQuestions"]),
                    guide_url,
                    cert_id,
                ),
            )
    except Exception as exc:  # noqa: BLE001 — record any failure for the UI to show
        detail = exc.detail if isinstance(exc, HTTPException) else str(exc)
        try:
            with get_conn() as conn:
                conn.execute(
                    f"""UPDATE {SCHEMA}.certifications
                        SET quiz_status = 'error', quiz_error = %s WHERE id = %s""",
                    (str(detail)[:500], cert_id),
                )
        except Exception:  # noqa: BLE001 — nothing more we can do
            pass


@app.post("/api/certifications/{cert_id}/quiz/generate", status_code=202)
def generate_quiz(cert_id: str, body: QuizGenerateRequest):
    """Start background generation and return the cert in its 'generating' state.
    The client polls GET /api/certifications/{id} until quiz_status clears."""
    guide_url = body.guideUrl.strip()
    if not re.match(r"^https?://", guide_url, re.IGNORECASE):
        raise HTTPException(400, "Enter a valid http(s) link to the exam guide.")

    with get_conn() as conn:
        row = conn.execute(
            f"SELECT * FROM {SCHEMA}.certifications WHERE id = %s", (cert_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(404, "Certification not found.")
        cert = _row_to_cert(cast("dict[str, Any]", row))
        # We don't hard-block a concurrent 'generating' state: an app restart can
        # strand it, and a retry should always be able to recover.
        conn.execute(
            f"""UPDATE {SCHEMA}.certifications
                SET quiz_status = 'generating', quiz_error = NULL WHERE id = %s""",
            (cert_id,),
        )
        updated = _one(
            conn.execute(f"SELECT * FROM {SCHEMA}.certifications WHERE id = %s", (cert_id,))
        )

    threading.Thread(
        target=_run_quiz_generation,
        args=(cert_id, cert, guide_url),
        daemon=True,
    ).start()
    return _row_to_cert(updated)


@app.get("/api/certifications/{cert_id}")
def get_certification(cert_id: str):
    """Single cert — used to poll generation status."""
    with get_conn() as conn:
        row = conn.execute(
            f"SELECT * FROM {SCHEMA}.certifications WHERE id = %s", (cert_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(404, "Certification not found.")
    return _row_to_cert(cast("dict[str, Any]", row))


@app.delete("/api/certifications/{cert_id}", status_code=204)
def delete_certification(cert_id: str):
    with get_conn() as conn:
        conn.execute(f"DELETE FROM {SCHEMA}.certifications WHERE id = %s", (cert_id,))
    return None


# Serve the built SPA for everything else. Hash routing means only "/" and the
# hashed asset paths are ever requested, so no history-fallback rewriting is needed.
app.mount("/", StaticFiles(directory=str(DIST), html=True), name="static")
