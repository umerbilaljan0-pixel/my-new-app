"""SQLite job table + rights log.

Async-friendly: every call runs the blocking sqlite3 work in a thread so the
asyncio event loop (queue, WebSocket broadcast) is never blocked. The schema is
deliberately small — the job row IS the record of what happened, so any result
can be re-rendered or reverted from its stored params.
"""
from __future__ import annotations

import asyncio
import json
import sqlite3
import time
import uuid
from pathlib import Path
from typing import Any, Optional

from . import config

_SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id            TEXT PRIMARY KEY,
    tool          TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'queued',   -- queued|running|paused|done|error|cancelled
    params        TEXT NOT NULL DEFAULT '{}',
    input_path    TEXT,
    output_path   TEXT,
    thumbnail     TEXT,
    media_kind    TEXT,                              -- image|video
    stage         TEXT,                              -- current stage label (for STACK)
    stage_index   INTEGER DEFAULT 0,
    stage_count   INTEGER DEFAULT 1,
    progress      REAL NOT NULL DEFAULT 0.0,         -- 0..1
    eta_seconds   REAL,
    message       TEXT,
    error         TEXT,
    est_size_bytes  INTEGER,
    est_vram_mb     INTEGER,
    priority      INTEGER NOT NULL DEFAULT 0,        -- higher runs first (Pro/Studio)
    api_key_id    TEXT,
    webhook_url   TEXT,
    created_at    REAL NOT NULL,
    started_at    REAL,
    updated_at    REAL NOT NULL,
    finished_at   REAL
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);

CREATE TABLE IF NOT EXISTS rights_log (
    id           TEXT PRIMARY KEY,
    context      TEXT NOT NULL,       -- first_launch | export
    job_id       TEXT,
    filename     TEXT,
    confirmed    INTEGER NOT NULL,
    note         TEXT,
    ts           REAL NOT NULL
);
"""

_JOB_COLUMNS = [
    "id", "tool", "status", "params", "input_path", "output_path", "thumbnail",
    "media_kind", "stage", "stage_index", "stage_count", "progress",
    "eta_seconds", "message", "error", "est_size_bytes", "est_vram_mb",
    "priority", "api_key_id", "webhook_url", "created_at", "started_at",
    "updated_at", "finished_at",
]


def _connect() -> sqlite3.Connection:
    Path(config.DB_URL).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(config.DB_URL, timeout=30, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def _init_sync() -> None:
    conn = _connect()
    try:
        conn.executescript(_SCHEMA)
    finally:
        conn.close()


def _row_to_job(row: sqlite3.Row) -> dict[str, Any]:
    d = dict(row)
    if isinstance(d.get("params"), str):
        try:
            d["params"] = json.loads(d["params"])
        except json.JSONDecodeError:
            d["params"] = {}
    return d


async def _run(fn, *args):
    return await asyncio.to_thread(fn, *args)


# ---- public async API ----------------------------------------------------

async def init() -> None:
    config.ensure_dirs()
    await _run(_init_sync)


async def create_job(
    tool: str,
    params: dict,
    input_path: Optional[str],
    media_kind: str,
    *,
    stage_count: int = 1,
    priority: int = 0,
    api_key_id: str | None = None,
    webhook_url: str | None = None,
    est_size_bytes: int | None = None,
    est_vram_mb: int | None = None,
) -> dict:
    now = time.time()
    job_id = uuid.uuid4().hex

    def _do():
        conn = _connect()
        try:
            conn.execute(
                """INSERT INTO jobs
                   (id, tool, status, params, input_path, media_kind,
                    stage_count, priority, api_key_id, webhook_url,
                    est_size_bytes, est_vram_mb, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (job_id, tool, "queued", json.dumps(params), input_path,
                 media_kind, stage_count, priority, api_key_id, webhook_url,
                 est_size_bytes, est_vram_mb, now, now),
            )
            row = conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
            return _row_to_job(row)
        finally:
            conn.close()

    return await _run(_do)


async def get_job(job_id: str) -> Optional[dict]:
    def _do():
        conn = _connect()
        try:
            row = conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
            return _row_to_job(row) if row else None
        finally:
            conn.close()

    return await _run(_do)


async def list_jobs(limit: int = 100, statuses: list[str] | None = None) -> list[dict]:
    def _do():
        conn = _connect()
        try:
            if statuses:
                q = ",".join("?" * len(statuses))
                rows = conn.execute(
                    f"SELECT * FROM jobs WHERE status IN ({q}) ORDER BY created_at DESC LIMIT ?",
                    (*statuses, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?", (limit,)
                ).fetchall()
            return [_row_to_job(r) for r in rows]
        finally:
            conn.close()

    return await _run(_do)


async def update_job(job_id: str, **fields) -> Optional[dict]:
    if "params" in fields and isinstance(fields["params"], (dict, list)):
        fields["params"] = json.dumps(fields["params"])
    fields["updated_at"] = time.time()
    cols = [c for c in fields if c in _JOB_COLUMNS]

    def _do():
        conn = _connect()
        try:
            sets = ", ".join(f"{c}=?" for c in cols)
            conn.execute(
                f"UPDATE jobs SET {sets} WHERE id=?",
                (*[fields[c] for c in cols], job_id),
            )
            row = conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
            return _row_to_job(row) if row else None
        finally:
            conn.close()

    return await _run(_do)


async def next_queued() -> Optional[dict]:
    """Highest priority, then oldest, among queued jobs."""
    def _do():
        conn = _connect()
        try:
            row = conn.execute(
                "SELECT * FROM jobs WHERE status='queued' "
                "ORDER BY priority DESC, created_at ASC LIMIT 1"
            ).fetchone()
            return _row_to_job(row) if row else None
        finally:
            conn.close()

    return await _run(_do)


async def claim_job(job_id: str) -> bool:
    """Atomically move a job from queued->running. Returns True if this caller
    won the claim (safe for multiple workers)."""
    now = time.time()

    def _do():
        conn = _connect()
        try:
            cur = conn.execute(
                "UPDATE jobs SET status='running', started_at=?, updated_at=? "
                "WHERE id=? AND status='queued'",
                (now, now, job_id),
            )
            return cur.rowcount == 1
        finally:
            conn.close()

    return await _run(_do)


async def reset_running_to_queued() -> int:
    """On boot, requeue anything left 'running' by a crash — nothing is lost."""
    def _do():
        conn = _connect()
        try:
            cur = conn.execute(
                "UPDATE jobs SET status='queued', progress=0 WHERE status IN ('running','paused')"
            )
            return cur.rowcount
        finally:
            conn.close()

    return await _run(_do)


async def log_rights(context: str, confirmed: bool, *, job_id: str | None = None,
                     filename: str | None = None, note: str | None = None) -> dict:
    entry = {
        "id": uuid.uuid4().hex,
        "context": context,
        "job_id": job_id,
        "filename": filename,
        "confirmed": 1 if confirmed else 0,
        "note": note,
        "ts": time.time(),
    }

    def _do():
        conn = _connect()
        try:
            conn.execute(
                "INSERT INTO rights_log (id,context,job_id,filename,confirmed,note,ts)"
                " VALUES (?,?,?,?,?,?,?)",
                (entry["id"], context, job_id, filename, entry["confirmed"], note, entry["ts"]),
            )
            return entry
        finally:
            conn.close()

    return await _run(_do)


async def has_rights_confirmation() -> bool:
    def _do():
        conn = _connect()
        try:
            row = conn.execute(
                "SELECT COUNT(*) AS n FROM rights_log WHERE context='first_launch' AND confirmed=1"
            ).fetchone()
            return row["n"] > 0
        finally:
            conn.close()

    return await _run(_do)
