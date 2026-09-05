"""The shared job queue.

One asyncio worker (MAX_CONCURRENT_JOBS, one GPU job by contract) pulls the
highest-priority queued job, runs the tool in a worker thread so the event loop
stays free to stream progress, and enforces the non-destructive contract: the
result is always a new file, and the job row records the params that produced it.
"""
from __future__ import annotations

import asyncio
import threading
import time
from pathlib import Path

from . import config, db, storage
from .device import current_vram_used_mb, detect_device
from .imaging import io as vio
from .tools import Cancelled, ToolContext, get_tool
from .ws import hub


class _Control:
    def __init__(self) -> None:
        self.cancel = threading.Event()
        self.pause = threading.Event()
        self.started = time.time()
        self.last_db_write = 0.0


class JobQueue:
    def __init__(self) -> None:
        self._controls: dict[str, _Control] = {}
        self._loop: asyncio.AbstractEventLoop | None = None
        self._tasks: list[asyncio.Task] = []
        self._running = False

    async def start(self) -> None:
        self._loop = asyncio.get_running_loop()
        self._running = True
        await db.reset_running_to_queued()
        for _ in range(max(1, config.MAX_CONCURRENT_JOBS)):
            self._tasks.append(asyncio.create_task(self._worker()))
        self._tasks.append(asyncio.create_task(self._status_ticker()))

    async def stop(self) -> None:
        self._running = False
        for t in self._tasks:
            t.cancel()

    # ---- control surface (called from the API) ---------------------------

    def cancel(self, job_id: str) -> bool:
        c = self._controls.get(job_id)
        if c:
            c.cancel.set()
            c.pause.clear()
            return True
        return False

    def pause(self, job_id: str) -> bool:
        c = self._controls.get(job_id)
        if c:
            c.pause.set()
            return True
        return False

    def resume(self, job_id: str) -> bool:
        c = self._controls.get(job_id)
        if c:
            c.pause.clear()
            return True
        return False

    # ---- worker ----------------------------------------------------------

    async def _worker(self) -> None:
        while self._running:
            job = await db.next_queued()
            if not job or not await db.claim_job(job["id"]):
                await asyncio.sleep(0.25)
                continue
            await self._run_job(job)

    async def _run_job(self, job: dict) -> None:
        job_id = job["id"]
        control = _Control()
        self._controls[job_id] = control
        device = detect_device()

        await db.update_job(job_id, status="running", stage=job.get("stage") or job["tool"],
                            message="starting", progress=0.0)
        await hub.broadcast({"type": "job", "job": await db.get_job(job_id)})

        def progress_cb(overall, stage=None, message=None, eta=None,
                        stage_index=None, stage_count=None):
            now = time.time()
            elapsed = now - control.started
            if eta is None and overall and overall > 0.02:
                eta = max(0.0, elapsed / overall - elapsed)
            fut = asyncio.run_coroutine_threadsafe(
                self._emit(job_id, overall, stage, message, eta, stage_index, control),
                self._loop,
            )
            try:
                fut.result(timeout=5)
            except Exception:
                pass

        ctx = ToolContext(
            job_id=job_id, device=device, quality=job["params"].get("_quality", "balanced"),
            progress=progress_cb,
            is_cancelled=control.cancel.is_set, is_paused=control.pause.is_set,
            stage_count=job.get("stage_count", 1) or 1,
        )

        try:
            tool = get_tool(job["tool"])
            input_path = Path(job["input_path"])
            ext = ".png" if storage.media_kind(input_path) == "image" else Path(input_path).suffix
            out_path = storage.output_path(job_id, ext)

            result = await asyncio.to_thread(tool.run, ctx, input_path, out_path, job["params"])
            result = Path(result)

            thumb = await asyncio.to_thread(self._make_thumb, job_id, result)
            await db.update_job(job_id, status="done", progress=1.0, message="done",
                                output_path=str(result), thumbnail=str(thumb) if thumb else None,
                                finished_at=time.time(), eta_seconds=0)
        except Cancelled:
            await db.update_job(job_id, status="cancelled", message="cancelled",
                                finished_at=time.time())
        except Exception as exc:  # noqa: BLE001
            await db.update_job(job_id, status="error", error=f"{type(exc).__name__}: {exc}",
                                finished_at=time.time())
        finally:
            self._controls.pop(job_id, None)
            final = await db.get_job(job_id)
            await hub.broadcast({"type": "job", "job": final})
            if final and final["status"] == "done" and job.get("webhook_url"):
                asyncio.create_task(self._fire_webhook(job["webhook_url"], final))

    async def _emit(self, job_id, overall, stage, message, eta, stage_index, control):
        fields = {"progress": round(float(overall), 4)}
        if stage is not None:
            fields["stage"] = stage
        if message is not None:
            fields["message"] = message
        if eta is not None:
            fields["eta_seconds"] = round(float(eta), 1)
        if stage_index is not None:
            fields["stage_index"] = stage_index
        # throttle DB writes; always broadcast the light event
        now = time.time()
        if now - control.last_db_write > 0.4 or stage is not None:
            control.last_db_write = now
            await db.update_job(job_id, **fields)
        await hub.broadcast({"type": "progress", "job_id": job_id, **fields})

    def _make_thumb(self, job_id: str, result: Path) -> Path | None:
        try:
            from PIL import Image

            if storage.media_kind(result) == "image":
                arr = vio.load_image_rgba(result) if result.suffix == ".png" else vio.load_image(result)
            else:
                arr = next(vio.iter_frames(result))
            im = Image.fromarray(arr)
            im.thumbnail((240, 240))
            tp = storage.output_path(job_id, ".png", stem="thumb")
            im.save(tp)
            return tp
        except Exception:
            return None

    async def _status_ticker(self) -> None:
        """Push device + VRAM to the status bar ~1/s while jobs are active."""
        while self._running:
            info = detect_device()
            active = len(self._controls)
            await hub.broadcast({
                "type": "status",
                "device": info.as_dict(),
                "active_jobs": active,
                "vram_used_mb": current_vram_used_mb(info),
            })
            await asyncio.sleep(1.0 if active else 4.0)

    async def _fire_webhook(self, url: str, job: dict) -> None:
        try:
            import json
            import urllib.request

            data = json.dumps({"event": "job.completed", "job": job}, default=str).encode()
            req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
            await asyncio.to_thread(urllib.request.urlopen, req, None, 10)
        except Exception:
            pass


queue = JobQueue()
