"""Compute-device detection.

Detected once at boot and shown in the status bar with live VRAM. No hard
dependency on torch/onnx — if neither is present we fall back to CPU and the
suite still runs its reference implementations.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from functools import lru_cache

from . import config


@dataclass
class DeviceInfo:
    kind: str          # "cuda" | "rocm" | "mps" | "onnx-cpu" | "cpu"
    name: str
    vram_total_mb: int | None
    half_precision: bool
    backend: str       # "torch" | "onnxruntime" | "reference"

    def as_dict(self) -> dict:
        d = asdict(self)
        d["vram_used_mb"] = current_vram_used_mb(self)
        return d


@lru_cache(maxsize=1)
def detect_device() -> DeviceInfo:
    forced = config.FORCE_DEVICE
    # Try torch first — covers CUDA, ROCm (also reports as cuda) and Apple MPS.
    try:
        import torch  # type: ignore

        if (forced in ("", "cuda", "rocm")) and torch.cuda.is_available():
            idx = 0
            props = torch.cuda.get_device_properties(idx)
            is_rocm = bool(getattr(torch.version, "hip", None))
            return DeviceInfo(
                kind="rocm" if is_rocm else "cuda",
                name=props.name,
                vram_total_mb=int(props.total_memory / (1024 * 1024)),
                half_precision=config.HALF_PRECISION,
                backend="torch",
            )
        if (forced in ("", "mps")) and getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return DeviceInfo(
                kind="mps",
                name="Apple GPU (Metal)",
                vram_total_mb=None,  # unified memory; reported at runtime
                half_precision=False,  # fp16 on MPS is unreliable for these nets
                backend="torch",
            )
    except Exception:
        pass

    # ONNX Runtime CPU (or DirectML/OpenVINO EP if the user installed one).
    try:
        import onnxruntime as ort  # type: ignore

        if forced in ("", "onnx-cpu"):
            providers = ort.get_available_providers()
            return DeviceInfo(
                kind="onnx-cpu",
                name=f"ONNX Runtime ({', '.join(providers[:2])})",
                vram_total_mb=None,
                half_precision=False,
                backend="onnxruntime",
            )
    except Exception:
        pass

    return DeviceInfo(
        kind="cpu",
        name="CPU (reference)",
        vram_total_mb=None,
        half_precision=False,
        backend="reference",
    )


def current_vram_used_mb(info: DeviceInfo | None = None) -> int | None:
    info = info or detect_device()
    if info.backend != "torch":
        return None
    try:
        import torch  # type: ignore

        if info.kind in ("cuda", "rocm"):
            return int(torch.cuda.memory_allocated() / (1024 * 1024))
    except Exception:
        return None
    return None
