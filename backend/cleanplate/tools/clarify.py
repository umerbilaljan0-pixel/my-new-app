"""CLARIFY — compression repair.

De-blocks and de-bands re-uploaded / heavily compressed footage before it hits
any other stage. Its own tool, and also an optional pre-pass on every other tool
(see stack.py, which inserts it when `clarify_prepass` is set).
"""
from __future__ import annotations

from pathlib import Path

from ..imaging import io as vio
from ..imaging import ops
from ..schemas import Estimate
from ..storage import media_kind
from .base import ToolContext, register, size_label

_STRENGTH = {"fast": 0.3, "balanced": 0.5, "best": 0.75}


class Clarify:
    slug = "clarify"
    name = "Clarify"
    verb = "Render"
    media = ("image", "video")

    def estimate(self, media_kind_, meta, params, quality) -> Estimate:
        px = meta["width"] * meta["height"]
        frames = meta.get("n_frames", 1)
        size = int(px * frames * 0.5)
        eta = frames * (px / 2_000_000) * {"fast": 0.3, "balanced": 0.7, "best": 1.4}[quality]
        return Estimate(output_size_bytes=size, output_size_label=size_label(size),
                        vram_mb=1600, eta_seconds=round(eta, 1), notes=["de-block + de-band"])

    def _frame(self, arr, strength):
        return ops.deblock(arr, strength)  # MODEL: FBCNN

    def run(self, ctx: ToolContext, input_path: Path, output_path: Path, params: dict) -> Path:
        s = _STRENGTH[ctx.quality]
        ctx.tick(0.03, stage="Clarify", message="loading")
        if media_kind(input_path) == "image":
            arr = vio.load_image(input_path)
            ctx.tick(0.4, message="de-blocking")
            p = vio.save_image(self._frame(arr, s), output_path)
            ctx.tick(1.0, message="done")
            return p
        p = vio.process_video(
            input_path, output_path, lambda f, i: self._frame(f, s),
            on_progress=lambda pr: ctx.tick(0.03 + pr * 0.95, message=f"{int(pr*100)}%"),
            keep_audio=True,
        )
        ctx.tick(1.0, message="done")
        return p


register(Clarify())
