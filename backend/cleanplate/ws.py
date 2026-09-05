"""WebSocket broadcast hub.

Every job-progress update and device/VRAM tick is pushed to all connected
clients (the workbench queue bar, the viewer, the status bar). Clients may
subscribe to everything or filter to a single job id.
"""
from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import WebSocket


class Hub:
    def __init__(self) -> None:
        self._clients: dict[WebSocket, set[str] | None] = {}
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket, job_filter: set[str] | None = None) -> None:
        await ws.accept()
        async with self._lock:
            self._clients[ws] = job_filter

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._clients.pop(ws, None)

    async def broadcast(self, event: dict[str, Any]) -> None:
        job_id = event.get("job", {}).get("id") if isinstance(event.get("job"), dict) else event.get("job_id")
        payload = json.dumps(event, default=str)
        dead = []
        async with self._lock:
            targets = list(self._clients.items())
        for ws, flt in targets:
            if flt is not None and job_id is not None and job_id not in flt:
                continue
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._clients.pop(ws, None)


hub = Hub()
