"""CLEANPLATE engine — FastAPI app.

Serves the workbench (frontend) and the marketing/site build via REST + a single
WebSocket, and mounts the public /v1 API. One shared queue behind everything.
"""
from __future__ import annotations

import shutil
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from . import __version__, config, db, models_registry, storage
from .device import detect_device
from .imaging import io as vio
from .queue import queue
from .schemas import Estimate, JobCreate, JobOut, RightsConfirm
from .tools import all_tools, get_tool
from .tools.stack import STARTER_PRESETS
from .ws import hub


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init()
    await queue.start()
    yield
    await queue.stop()


def create_app() -> FastAPI:
    app = FastAPI(title="CLEANPLATE Engine", version=__version__,
                  description="Self-hostable media restoration suite — shared job engine.",
                  lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ---- meta ------------------------------------------------------------

    @app.get("/health")
    async def health() -> dict:
        return {"ok": True, "version": __version__, "flavour": config.FLAVOUR}

    @app.get("/api/device")
    async def device() -> dict:
        return detect_device().as_dict()

    @app.get("/api/tools")
    async def tools() -> list[dict]:
        return [
            {"slug": t.slug, "name": t.name, "verb": t.verb, "media": list(t.media),
             "models": models_registry.required_for(t.slug)}
            for t in all_tools()
        ]

    @app.get("/api/presets")
    async def presets() -> list[dict]:
        return STARTER_PRESETS

    # ---- models ----------------------------------------------------------

    @app.get("/api/models")
    async def models() -> dict:
        return {"models": models_registry.all_specs(),
                "cache_bytes": models_registry.cache_size_bytes()}

    @app.get("/api/models/{tool}/missing")
    async def models_missing(tool: str) -> list[dict]:
        return models_registry.missing_for(tool)

    @app.post("/api/models/{key}/download")
    async def model_download(key: str) -> dict:
        spec = models_registry.REGISTRY.get(key)
        if not spec:
            raise HTTPException(404, "unknown model")
        # Real downloader streams weights, verifies SHA256, then marks cached.
        # Reference build writes a placeholder so the offline flow is exercised.
        path = models_registry.model_path(spec)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"CLEANPLATE placeholder weights for %b" % key.encode())
        return spec.as_dict()

    @app.get("/api/models/cache")
    async def models_cache() -> dict:
        return {"bytes": models_registry.cache_size_bytes()}

    @app.delete("/api/models/cache")
    async def models_cache_purge() -> dict:
        return {"freed_bytes": models_registry.purge_cache()}

    # ---- uploads ---------------------------------------------------------

    @app.post("/api/uploads")
    async def upload(file: UploadFile = File(...)) -> dict:
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
        try:
            stored = storage.store_upload(tmp_path, file.filename)
        finally:
            Path(tmp_path).unlink(missing_ok=True)
        return {"upload_id": stored.name, **_meta_for(stored)}

    @app.get("/api/uploads/{upload_id}/meta")
    async def upload_meta(upload_id: str) -> dict:
        return _meta_for(_upload_path(upload_id))

    # ---- estimate --------------------------------------------------------

    @app.post("/api/estimate")
    async def estimate(payload: JobCreate) -> Estimate:
        path = _upload_path(payload.upload_id)
        meta = _meta_for(path)
        tool = get_tool(payload.tool)
        return tool.estimate(meta["media_kind"], meta, payload.params, payload.quality)

    # ---- jobs ------------------------------------------------------------

    @app.post("/api/jobs", response_model=JobOut)
    async def create_job(payload: JobCreate) -> JobOut:
        if config.RIGHTS_GATE_REQUIRED and not await db.has_rights_confirmation():
            raise HTTPException(428, "rights confirmation required (first launch)")
        path = _upload_path(payload.upload_id)
        meta = _meta_for(path)
        tool = get_tool(payload.tool)
        est = tool.estimate(meta["media_kind"], meta, payload.params, payload.quality)
        params = {**payload.params, "_quality": payload.quality}
        stage_count = len(payload.params.get("stages", [])) or 1 if payload.tool == "stack" else 1
        row = await db.create_job(
            tool=payload.tool, params=params, input_path=str(path),
            media_kind=meta["media_kind"], stage_count=stage_count,
            priority=payload.priority, webhook_url=payload.webhook_url,
            est_size_bytes=est.output_size_bytes, est_vram_mb=est.vram_mb,
        )
        await hub.broadcast({"type": "job", "job": row})
        return JobOut.from_row(row)

    @app.get("/api/jobs", response_model=list[JobOut])
    async def list_jobs(limit: int = 100) -> list[JobOut]:
        return [JobOut.from_row(r) for r in await db.list_jobs(limit)]

    @app.get("/api/jobs/{job_id}", response_model=JobOut)
    async def get_job(job_id: str) -> JobOut:
        row = await db.get_job(job_id)
        if not row:
            raise HTTPException(404, "no such job")
        return JobOut.from_row(row)

    @app.post("/api/jobs/{job_id}/pause")
    async def pause_job(job_id: str) -> dict:
        ok = queue.pause(job_id)
        if ok:
            await db.update_job(job_id, status="paused")
        return {"ok": ok}

    @app.post("/api/jobs/{job_id}/resume")
    async def resume_job(job_id: str) -> dict:
        ok = queue.resume(job_id)
        if ok:
            await db.update_job(job_id, status="running")
        return {"ok": ok}

    @app.post("/api/jobs/{job_id}/cancel")
    async def cancel_job(job_id: str) -> dict:
        if not queue.cancel(job_id):
            await db.update_job(job_id, status="cancelled")
        return {"ok": True}

    @app.post("/api/jobs/{job_id}/retry", response_model=JobOut)
    async def retry_job(job_id: str) -> JobOut:
        row = await db.get_job(job_id)
        if not row:
            raise HTTPException(404, "no such job")
        new = await db.create_job(
            tool=row["tool"], params=row["params"], input_path=row["input_path"],
            media_kind=row["media_kind"], stage_count=row.get("stage_count", 1),
            priority=row.get("priority", 0), webhook_url=row.get("webhook_url"),
        )
        await hub.broadcast({"type": "job", "job": new})
        return JobOut.from_row(new)

    @app.get("/api/jobs/{job_id}/output")
    async def job_output(job_id: str) -> FileResponse:
        row = await db.get_job(job_id)
        if not row or not row.get("output_path"):
            raise HTTPException(404, "no output")
        p = Path(row["output_path"])
        if not p.exists():
            raise HTTPException(404, "output missing")
        return FileResponse(p, filename=p.name)

    @app.get("/api/files")
    async def get_file(path: str = Query(...)) -> FileResponse:
        p = Path(path).resolve()
        # only serve from the managed data dirs — never arbitrary filesystem
        allowed = any(str(p).startswith(str(d.resolve())) for d in
                      (config.OUTPUTS_DIR, config.UPLOADS_DIR))
        if not allowed or not p.exists():
            raise HTTPException(404, "not found")
        return FileResponse(p, filename=p.name)

    # ---- rights gate -----------------------------------------------------

    @app.get("/api/rights/status")
    async def rights_status() -> dict:
        return {"first_launch_confirmed": await db.has_rights_confirmation(),
                "required": config.RIGHTS_GATE_REQUIRED}

    @app.post("/api/rights")
    async def rights_confirm(payload: RightsConfirm) -> dict:
        entry = await db.log_rights(payload.context, payload.confirmed,
                                    job_id=payload.job_id, filename=payload.filename,
                                    note=payload.note)
        return {"logged": True, "id": entry["id"], "ts": entry["ts"]}

    # ---- websocket -------------------------------------------------------

    @app.websocket("/ws")
    async def ws_endpoint(ws: WebSocket, job: str | None = None) -> None:
        flt = {job} if job else None
        await hub.connect(ws, flt)
        try:
            await ws.send_json({"type": "hello", "device": detect_device().as_dict()})
            while True:
                await ws.receive_text()  # keepalive / client pings
        except WebSocketDisconnect:
            await hub.disconnect(ws)
        except Exception:
            await hub.disconnect(ws)

    # ---- public API ------------------------------------------------------
    from .api.v1 import router as v1_router
    app.include_router(v1_router, prefix="/v1")

    return app


# ---- helpers -------------------------------------------------------------

def _upload_path(upload_id: str) -> Path:
    p = (config.UPLOADS_DIR / upload_id).resolve()
    if not str(p).startswith(str(config.UPLOADS_DIR.resolve())) or not p.exists():
        raise HTTPException(404, "unknown upload")
    return p


def _meta_for(path: Path) -> dict:
    kind = storage.media_kind(path)
    if kind == "image":
        from PIL import Image

        with Image.open(path) as im:
            w, h = im.size
        return {"media_kind": "image", "width": w, "height": h, "n_frames": 1,
                "fps": 0, "duration": 0, "size_bytes": path.stat().st_size}
    m = vio.probe_video(path)
    return {"media_kind": "video", "width": m.width, "height": m.height,
            "n_frames": m.n_frames, "fps": m.fps, "duration": m.duration,
            "size_bytes": path.stat().st_size}


app = create_app()
