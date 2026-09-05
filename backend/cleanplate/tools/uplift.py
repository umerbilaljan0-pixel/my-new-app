"""UPLIFT — upscaling to a target resolution (1080p / 2K / 4K).

Real-ESRGAN, model auto-routed live-action vs animation, optional face-restore.
Runs the integer network scale then Lanczos to the exact target. Tiled inference
with 32px overlap, tile auto-halving on OOM.
"""
from __future__ import annotations

from pathlib import Path

from ..imaging import io as vio
from ..imaging import ops
from ..schemas import Estimate
from ..storage import media_kind
from .base import ToolContext, register, size_label

_TARGET_H = {"1080p": 1080, "2K": 1440, "4K": 2160}


class Uplift:
    slug = "uplift"
    name = "Uplift"
    verb = "Render"
    media = ("image", "video")

    def estimate(self, media_kind_, meta, params, quality) -> Estimate:
        target = params.get("target", "4K")
        th = _TARGET_H[target]
        scale2 = (th / max(1, meta["height"])) ** 2
        frames = meta.get("n_frames", 1)
        out_px = meta["width"] * th / max(1, meta["height"]) * th
        size = int(out_px * frames * 0.6)
        eta = frames * (out_px / 2_000_000) * {"fast": 0.5, "balanced": 1.1, "best": 2.4}[quality]
        vram = int(1400 + out_px / 1_000_000 * 350)
        notes = [f"→ {target}"]
        if params.get("face_restore"):
            notes.append("face restore (GFPGAN)")
            vram += 700
        return Estimate(output_size_bytes=size, output_size_label=size_label(size),
                        vram_mb=vram, eta_seconds=round(eta, 1),
                        output_resolution=target, notes=notes)

    def _frame(self, arr, params):
        target = params.get("target", "4K")
        # MODEL: Real-ESRGAN (x4plus live-action / anime), tiled 32px overlap.
        out = ops.upscale_to_resolution(arr, target)
        if params.get("face_restore"):
            out = ops.face_restore(out)  # MODEL: GFPGAN pass
        return out

    def run(self, ctx: ToolContext, input_path: Path, output_path: Path, params: dict) -> Path:
        ctx.tick(0.02, stage="Uplift", message="loading")
        if media_kind(input_path) == "image":
            arr = vio.load_image(input_path)
            ctx.tick(0.3, message="upscaling")
            out = self._frame(arr, params)
            p = vio.save_image(out, output_path)
            ctx.tick(1.0, message="done")
            return p
        p = vio.process_video(
            input_path, output_path, lambda f, i: self._frame(f, params),
            on_progress=lambda pr: ctx.tick(0.02 + pr * 0.96, message=f"{int(pr*100)}%"),
            keep_audio=True,
        )
        ctx.tick(1.0, message="done")
        return p


register(Uplift())
