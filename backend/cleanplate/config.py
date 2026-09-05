"""Runtime configuration. Everything is env-overridable; see .env.example."""
from __future__ import annotations

import os
from pathlib import Path


def _bool(name: str, default: bool) -> bool:
    v = os.environ.get(name)
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "on"}


def _path(name: str, default: Path) -> Path:
    v = os.environ.get(name)
    return Path(v).expanduser() if v else default


# ~/.cleanplate holds the SQLite DB, the model cache, and job outputs so the
# suite works the same whether run locally or in a container (override with env).
HOME_DIR = _path("CLEANPLATE_HOME", Path.home() / ".cleanplate")

DATA_DIR = _path("CLEANPLATE_DATA_DIR", HOME_DIR / "data")
MODELS_DIR = _path("CLEANPLATE_MODELS_DIR", HOME_DIR / "models")
UPLOADS_DIR = _path("CLEANPLATE_UPLOADS_DIR", DATA_DIR / "uploads")
OUTPUTS_DIR = _path("CLEANPLATE_OUTPUTS_DIR", DATA_DIR / "outputs")

# job table + rights log
DB_URL = os.environ.get("CLEANPLATE_DB", str(DATA_DIR / "cleanplate.db"))

# one concurrent GPU job by contract; kept configurable for CPU farms/tests.
MAX_CONCURRENT_JOBS = int(os.environ.get("CLEANPLATE_MAX_CONCURRENT", "1"))

# device preference override; empty => auto-detect (CUDA/ROCm/MPS/ONNX CPU).
FORCE_DEVICE = os.environ.get("CLEANPLATE_DEVICE", "").strip()

# half precision on CUDA when available.
HALF_PRECISION = _bool("CLEANPLATE_HALF_PRECISION", True)

# CORS origins for the web frontend and marketing site.
CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "CLEANPLATE_CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,tauri://localhost",
    ).split(",")
    if o.strip()
]

# Deployment flavour: "local" (SQLite, no auth) or "hosted" (Postgres, auth,
# Stripe). The reference engine ships "local"; hosted wiring lives behind flags.
FLAVOUR = os.environ.get("CLEANPLATE_FLAVOUR", "local")

# Rights gate: confirmation is required on first launch and every export.
RIGHTS_GATE_REQUIRED = _bool("CLEANPLATE_RIGHTS_GATE", True)


def ensure_dirs() -> None:
    for p in (DATA_DIR, MODELS_DIR, UPLOADS_DIR, OUTPUTS_DIR):
        p.mkdir(parents=True, exist_ok=True)
