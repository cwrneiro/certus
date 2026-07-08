"""Certus backend — serves the static SPA and a small CRUD API backed by Lakebase.

Certifications (with their nested domains / attempts / materials as JSONB) live in
an app-owned `certus` schema. On first startup the schema + table are created and
seeded from seed.json, so the deployed app opens with real sample data and any
certs the user adds persist across refreshes and restarts.
"""

from __future__ import annotations

import json
import os
import re
import threading
import time
import uuid
from contextlib import asynccontextmanager, contextmanager
from pathlib import Path
from typing import Any, cast

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Json
from databricks.sdk import WorkspaceClient
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
SEED_FILE = Path(__file__).resolve().parent / "seed.json"
SCHEMA = "certus"
VALID_STATUSES = {"queued", "in-progress", "scheduled", "passed"}

_w = WorkspaceClient()
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
    credential_url           text,
    sort_order               double precision NOT NULL DEFAULT 0,
    created_at               timestamptz NOT NULL DEFAULT now()
);
-- Additive migration for tables created before credential_url existed.
ALTER TABLE {SCHEMA}.certifications ADD COLUMN IF NOT EXISTS credential_url text;
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
        "credentialUrl": r["credential_url"],
    }


def _insert_cert(conn, c: dict, sort_order: float) -> None:
    conn.execute(
        f"""INSERT INTO {SCHEMA}.certifications
            (id, provider, name, short_name, status, exam_date, passing_score,
             achieved_score, focus_minutes_this_week, domains, attempts, materials,
             credential_url, sort_order)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
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


@app.delete("/api/certifications/{cert_id}", status_code=204)
def delete_certification(cert_id: str):
    with get_conn() as conn:
        conn.execute(f"DELETE FROM {SCHEMA}.certifications WHERE id = %s", (cert_id,))
    return None


# Serve the built SPA for everything else. Hash routing means only "/" and the
# hashed asset paths are ever requested, so no history-fallback rewriting is needed.
app.mount("/", StaticFiles(directory=str(DIST), html=True), name="static")
