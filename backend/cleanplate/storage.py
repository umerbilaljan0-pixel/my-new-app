"""Non-destructive file handling.

By law of this suite: originals are never written to. Uploads land read-only in
UPLOADS_DIR; every job writes a *new* file into OUTPUTS_DIR keyed by job id, so
any result can be re-rendered or reverted without touching the source.
"""
from __future__ import annotations

import hashlib
import os
import shutil
from pathlib import Path

from . import config

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp"}
VIDEO_EXT = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".gif", ".m4v"}


def media_kind(path: str | Path) -> str:
    ext = Path(path).suffix.lower()
    if ext in VIDEO_EXT:
        return "video"
    if ext in IMAGE_EXT:
        return "image"
    raise ValueError(f"unsupported media type: {ext}")


def sha256_file(path: str | Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            b = f.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def store_upload(src: str | Path, original_name: str | None = None) -> Path:
    """Copy an incoming file into the read-only uploads area, named by content
    hash so identical uploads dedupe and the source is preserved verbatim."""
    config.ensure_dirs()
    src = Path(src)
    digest = sha256_file(src)[:16]
    ext = Path(original_name or src.name).suffix.lower()
    dest = config.UPLOADS_DIR / f"{digest}{ext}"
    if not dest.exists():
        shutil.copy2(src, dest)
        os.chmod(dest, 0o444)  # read-only: enforce non-destructive contract
    return dest


def output_path(job_id: str, suffix: str, *, stem: str = "out") -> Path:
    """A fresh, per-job output path. Never overwrites an input."""
    config.ensure_dirs()
    d = config.OUTPUTS_DIR / job_id
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{stem}{suffix}"


def is_original(path: str | Path) -> bool:
    """Guardrail used in tests + processors: refuse to write to an upload."""
    p = Path(path).resolve()
    try:
        p.relative_to(config.UPLOADS_DIR.resolve())
        return True
    except ValueError:
        return False
