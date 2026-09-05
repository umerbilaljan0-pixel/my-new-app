"""Tool interface, execution context, and the tool registry.

A Tool is a route, a dashboard card, and a Stack stage. Each implements:
  - `estimate()`  cheap, no processing: output size, VRAM need, ETA (shown in
                  the right panel before the user commits)
  - `run()`       synchronous, runs in a worker thread, reports progress through
                  the context callback, writes a NEW output file
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Protocol

from ..device import DeviceInfo
from ..schemas import Estimate


class Cancelled(Exception):
    """Raised inside run() when the job has been cancelled."""


@dataclass
class ToolContext:
    job_id: str
    device: DeviceInfo
    quality: str = "balanced"
    # progress(progress0to1, stage=None, message=None, eta=None)
    progress: Callable[..., None] = lambda *a, **k: None
    is_cancelled: Callable[[], bool] = lambda: False
    is_paused: Callable[[], bool] = lambda: False
    stage_index: int = 0
    stage_count: int = 1
    extras: dict = field(default_factory=dict)

    def tick(self, p: float, stage: str | None = None, message: str | None = None,
             eta: float | None = None) -> None:
        # cooperative pause: block the worker thread while paused
        while self.is_paused() and not self.is_cancelled():
            time.sleep(0.1)
        if self.is_cancelled():
            raise Cancelled()
        # normalise a stage-local 0..1 into the whole-job progress for STACK
        overall = (self.stage_index + max(0.0, min(1.0, p))) / max(1, self.stage_count)
        self.progress(overall, stage=stage, message=message, eta=eta,
                      stage_index=self.stage_index, stage_count=self.stage_count)


class Tool(Protocol):
    slug: str
    name: str
    verb: str          # button label ("Erase", "Render", "Export")
    media: tuple[str, ...]

    def estimate(self, media_kind: str, meta: dict, params: dict, quality: str) -> Estimate: ...
    def run(self, ctx: ToolContext, input_path: Path, output_path: Path, params: dict) -> Path: ...


_REGISTRY: dict[str, Tool] = {}


def register(tool: Tool) -> Tool:
    _REGISTRY[tool.slug] = tool
    return tool


def get_tool(slug: str) -> Tool:
    if slug not in _REGISTRY:
        raise KeyError(f"unknown tool: {slug}")
    return _REGISTRY[slug]


def all_tools() -> list[Tool]:
    order = ["erase", "uplift", "revive", "isolate", "extend", "smooth", "clarify", "stack"]
    return [_REGISTRY[s] for s in order if s in _REGISTRY]


# ---- estimation helpers --------------------------------------------------

def _fmt_size(n: float) -> str:
    units = ["B", "KB", "MB", "GB"]
    i = 0
    while n >= 1024 and i < len(units) - 1:
        n /= 1024
        i += 1
    return f"{n:.1f} {units[i]}"


def size_label(n: int) -> str:
    return _fmt_size(float(n))
