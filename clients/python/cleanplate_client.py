"""CLEANPLATE Python client — zero dependencies (stdlib only).

    from cleanplate_client import CleanplateClient

    cp = CleanplateClient("http://localhost:8000", api_key="KEY")
    job = cp.run("uplift", "photo.jpg", params={"target": "4K"}, quality="best")
    cp.wait(job["id"])
    cp.download(job["id"], "photo_4k.png")

Mirrors the public /v1 API: signed upload, job create, poll, download.
"""
from __future__ import annotations

import json
import mimetypes
import os
import time
import urllib.request
from typing import Any, Optional


class CleanplateError(RuntimeError):
    pass


class CleanplateClient:
    def __init__(self, base_url: str = "http://localhost:8000", api_key: Optional[str] = None,
                 timeout: float = 60.0):
        self.base = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    # ---- low level -------------------------------------------------------
    def _req(self, method: str, path: str, *, data: bytes | None = None,
             headers: dict | None = None) -> Any:
        h = {"Accept": "application/json"}
        if self.api_key:
            h["X-API-Key"] = self.api_key
        if headers:
            h.update(headers)
        req = urllib.request.Request(self.base + path, data=data, method=method, headers=h)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                body = r.read()
                ctype = r.headers.get("Content-Type", "")
        except urllib.error.HTTPError as e:  # type: ignore[attr-defined]
            raise CleanplateError(f"{e.code} {e.reason}: {e.read().decode(errors='replace')}") from None
        if not body:
            return None
        if "application/json" not in ctype:
            # binary (image/video output) — hand back raw bytes
            return body
        try:
            return json.loads(body)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return body

    def _post_json(self, path: str, payload: dict) -> Any:
        return self._req("POST", path, data=json.dumps(payload).encode(),
                         headers={"Content-Type": "application/json"})

    # ---- high level ------------------------------------------------------
    def confirm_rights(self, context: str = "first_launch") -> Any:
        return self._post_json("/api/rights", {"context": context, "confirmed": True})

    def upload(self, path: str) -> str:
        """Sign an upload and PUT the bytes; returns the upload_id."""
        token = self._post_json("/v1/uploads", {})["upload_id"]
        with open(path, "rb") as f:
            data = f.read()
        ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
        self._req("PUT", f"/v1/uploads/{token}", data=data,
                  headers={"X-Filename": os.path.basename(path), "Content-Type": ctype})
        return token

    def create_job(self, tool: str, upload_id: str, params: dict | None = None,
                   quality: str = "balanced", webhook_url: str | None = None,
                   priority: int = 0) -> dict:
        return self._post_json("/v1/jobs", {
            "tool": tool, "upload_id": upload_id, "params": params or {},
            "quality": quality, "webhook_url": webhook_url, "priority": priority,
        })

    def run(self, tool: str, path: str, params: dict | None = None,
            quality: str = "balanced", **kw) -> dict:
        """Upload a file and create a job in one call."""
        return self.create_job(tool, self.upload(path), params, quality, **kw)

    def get(self, job_id: str) -> dict:
        return self._req("GET", f"/v1/jobs/{job_id}")

    def wait(self, job_id: str, poll: float = 1.0, timeout: float = 3600) -> dict:
        deadline = time.time() + timeout
        while time.time() < deadline:
            job = self.get(job_id)
            if job["status"] in ("done", "error", "cancelled"):
                if job["status"] == "error":
                    raise CleanplateError(f"job failed: {job.get('error')}")
                return job
            time.sleep(poll)
        raise CleanplateError("timed out waiting for job")

    def download(self, job_id: str, dest: str) -> str:
        data = self._req("GET", f"/api/jobs/{job_id}/output")
        if isinstance(data, (dict, list)):
            raise CleanplateError("no binary output available")
        with open(dest, "wb") as f:
            f.write(data if isinstance(data, bytes) else str(data).encode())
        return dest


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("usage: cleanplate_client.py <tool> <file> [target]")
        raise SystemExit(2)
    cp = CleanplateClient(os.environ.get("CLEANPLATE_URL", "http://localhost:8000"),
                          api_key=os.environ.get("CLEANPLATE_API_KEY"))
    cp.confirm_rights()
    tool, path = sys.argv[1], sys.argv[2]
    params = {"target": sys.argv[3]} if len(sys.argv) > 3 else {}
    job = cp.run(tool, path, params=params, quality="fast")
    print("job", job["id"])
    done = cp.wait(job["id"])
    out = f"out_{job['id'][:8]}.png"
    cp.download(job["id"], out)
    print("done ->", out)
