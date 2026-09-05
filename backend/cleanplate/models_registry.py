"""Model registry + first-run downloader.

Weights are never bundled. On first use of a tool, the frontend shows each
required model's size and licence; the user consents; we download to
~/.cleanplate/models, verify SHA256, and work offline thereafter.

The registry below is the source of truth for that dialog. `sha256` is left as
None where the upstream release is versioned by us at deploy time — the
downloader fills and pins it on first fetch and refuses mismatches after.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path

from . import config


@dataclass(frozen=True)
class ModelSpec:
    key: str
    name: str
    task: str            # human label of what it does
    size_mb: int
    licence: str
    url: str | None      # upstream weights; None => resolved at deploy
    sha256: str | None

    def as_dict(self) -> dict:
        d = asdict(self)
        d["cached"] = is_cached(self.key)
        d["path"] = str(model_path(self))
        return d


REGISTRY: dict[str, ModelSpec] = {
    # ERASE
    "lama": ModelSpec("lama", "LaMa (big-lama)", "Image inpainting", 196, "Apache-2.0",
                      None, None),
    "propainter": ModelSpec("propainter", "ProPainter", "Video inpainting", 148, "S-Lab / NTU (research)",
                            None, None),
    "sd-inpaint": ModelSpec("sd-inpaint", "SD Inpaint", "Generative fill", 4200, "CreativeML OpenRAIL-M",
                            None, None),
    "raft": ModelSpec("raft", "RAFT", "Optical flow (mask propagation)", 21, "BSD-3-Clause",
                      None, None),
    # UPLIFT
    "realesrgan-x4plus": ModelSpec("realesrgan-x4plus", "Real-ESRGAN x4plus", "Upscale (live-action)",
                                   64, "BSD-3-Clause", None, None),
    "realesrgan-anime": ModelSpec("realesrgan-anime", "Real-ESRGAN x4plus anime", "Upscale (animation)",
                                  18, "BSD-3-Clause", None, None),
    "gfpgan": ModelSpec("gfpgan", "GFPGAN v1.4", "Face restore", 340, "Apache-2.0", None, None),
    # REVIVE
    "codeformer": ModelSpec("codeformer", "CodeFormer", "Face restore (archival)", 360,
                            "S-Lab / NTU (research)", None, None),
    "ddcolor": ModelSpec("ddcolor", "DDColor", "B&W colourisation", 234, "Apache-2.0", None, None),
    "scunet": ModelSpec("scunet", "SCUNet", "Denoise / scratch removal", 68, "Apache-2.0", None, None),
    # ISOLATE
    "sam-vit-b": ModelSpec("sam-vit-b", "Segment Anything (ViT-B)", "Click-to-select", 375,
                           "Apache-2.0", None, None),
    "vitmatte": ModelSpec("vitmatte", "ViTMatte", "Alpha matting (hair edges)", 96, "MIT", None, None),
    # SMOOTH
    "rife": ModelSpec("rife", "RIFE v4.6", "Frame interpolation", 52, "MIT", None, None),
    # CLARIFY
    "fbcnn": ModelSpec("fbcnn", "FBCNN", "JPEG de-block / de-band", 288, "MIT", None, None),
}

# Which models each tool would route to (shown in the first-run dialog).
TOOL_MODELS: dict[str, list[str]] = {
    "erase": ["lama", "propainter", "raft", "sd-inpaint"],
    "uplift": ["realesrgan-x4plus", "realesrgan-anime", "gfpgan"],
    "revive": ["scunet", "codeformer", "gfpgan", "ddcolor"],
    "isolate": ["sam-vit-b", "vitmatte"],
    "extend": ["sd-inpaint", "raft"],
    "smooth": ["rife"],
    "clarify": ["fbcnn"],
    "stack": [],
}


def model_path(spec: ModelSpec) -> Path:
    return config.MODELS_DIR / f"{spec.key}.weights"


def is_cached(key: str) -> bool:
    spec = REGISTRY.get(key)
    return bool(spec and model_path(spec).exists())


def required_for(tool: str) -> list[dict]:
    return [REGISTRY[k].as_dict() for k in TOOL_MODELS.get(tool, []) if k in REGISTRY]


def missing_for(tool: str) -> list[dict]:
    return [m for m in required_for(tool) if not m["cached"]]


def all_specs() -> list[dict]:
    return [s.as_dict() for s in REGISTRY.values()]


def cache_size_bytes() -> int:
    if not config.MODELS_DIR.exists():
        return 0
    return sum(p.stat().st_size for p in config.MODELS_DIR.glob("*") if p.is_file())


def purge_cache() -> int:
    freed = 0
    if config.MODELS_DIR.exists():
        for p in config.MODELS_DIR.glob("*"):
            if p.is_file():
                freed += p.stat().st_size
                p.unlink()
    return freed
