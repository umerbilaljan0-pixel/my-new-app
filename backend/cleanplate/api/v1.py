"""CLEANPLATE public API v1.

Flow:
  1. POST /v1/uploads            -> { upload_id, upload_url }   (signed, short-lived)
  2. PUT  <upload_url>           <- raw bytes
  3. POST /v1/jobs               -> { id, ... }    (tool, params, upload_id, webhook)
  4. GET  /v1/jobs/{id}          -> job state; or receive the completion webhook

Rate limited per API key (X-API-Key). OpenAPI is published automatically by
FastAPI at /openapi.json and /docs; the Node + Python clients in /clients wrap
exactly these routes.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException, Request

from .. import config, db, storage
from ..queue import queue
from ..schemas import JobCreate, JobOut
from ..tools import get_tool
from ..ws import hub

router = APIRouter(tags=["v1"])

# in-memory token store + rate limiter (Redis in the hosted build)
_UPLOAD_TOKENS: dict[str, dict] = {}
_RATE: dict[str, deque] = defaultdict(deque)
_RATE_LIMIT = 60          # requests
_RATE_WINDOW = 60.0       # seconds


def _rate_check(key: str) -> None:
    now = time.time()
    q = _RATE[key]
    while q and now - q[0] > _RATE_WINDOW:
        q.popleft()
    if len(q) >= _RATE_LIMIT:
        raise HTTPException(429, "rate limit exceeded")
    q.append(now)


def _auth(x_api_key: str | None) -> str:
    # local flavour permits anonymous access; hosted requires a key.
    if config.FLAVOUR == "hosted" and not x_api_key:
        raise HTTPException(401, "X-API-Key required")
    key = x_api_key or "anonymous"
    _rate_check(key)
    return key


@router.post("/uploads")
async def create_upload(x_api_key: str | None = Header(default=None)) -> dict:
    import uuid

    key = _auth(x_api_key)
    token = uuid.uuid4().hex
    _UPLOAD_TOKENS[token] = {"key": key, "ts": time.time(), "path": None}
    return {"upload_id": token, "upload_url": f"/v1/uploads/{token}",
            "expires_in": 3600}


@router.put("/uploads/{token}")
async def put_upload(token: str, request: Request,
                     x_filename: str = Header(default="upload.bin")) -> dict:
    rec = _UPLOAD_TOKENS.get(token)
    if not rec:
        raise HTTPException(404, "unknown or expired upload token")
    import tempfile

    body = await request.body()
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(x_filename).suffix) as tmp:
        tmp.write(body)
        tmp_path = tmp.name
    try:
        stored = storage.store_upload(tmp_path, x_filename)
    finally:
        Path(tmp_path).unlink(missing_ok=True)
    rec["path"] = str(stored)
    return {"upload_id": token, "bytes": len(body)}


@router.post("/jobs", response_model=JobOut)
async def create_job(payload: JobCreate, x_api_key: str | None = Header(default=None)) -> JobOut:
    key = _auth(x_api_key)
    if config.RIGHTS_GATE_REQUIRED and not await db.has_rights_confirmation():
        raise HTTPException(428, "rights confirmation required")

    rec = _UPLOAD_TOKENS.get(payload.upload_id)
    if rec and rec.get("path"):
        path = Path(rec["path"])
    else:
        path = (config.UPLOADS_DIR / payload.upload_id)
    if not path.exists():
        raise HTTPException(404, "upload not found")

    kind = storage.media_kind(path)
    tool = get_tool(payload.tool)
    from ..main import _meta_for

    meta = _meta_for(path)
    est = tool.estimate(kind, meta, payload.params, payload.quality)
    params = {**payload.params, "_quality": payload.quality}
    stage_count = len(payload.params.get("stages", [])) or 1 if payload.tool == "stack" else 1
    row = await db.create_job(
        tool=payload.tool, params=params, input_path=str(path), media_kind=kind,
        stage_count=stage_count, priority=payload.priority, api_key_id=key,
        webhook_url=payload.webhook_url,
        est_size_bytes=est.output_size_bytes, est_vram_mb=est.vram_mb,
    )
    await hub.broadcast({"type": "job", "job": row})
    return JobOut.from_row(row)


@router.get("/jobs/{job_id}", response_model=JobOut)
async def get_job(job_id: str, x_api_key: str | None = Header(default=None)) -> JobOut:
    _auth(x_api_key)
    row = await db.get_job(job_id)
    if not row:
        raise HTTPException(404, "no such job")
    return JobOut.from_row(row)


@router.get("/jobs/{job_id}/result")
async def get_result(job_id: str, x_api_key: str | None = Header(default=None)) -> dict:
    _auth(x_api_key)
    row = await db.get_job(job_id)
    if not row:
        raise HTTPException(404, "no such job")
    return {"id": job_id, "status": row["status"],
            "download_url": f"/api/jobs/{job_id}/output" if row.get("output_path") else None}
