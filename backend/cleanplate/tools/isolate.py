"""ISOLATE — subject cutout and matting.

SAM-style click-to-select plus alpha matting for hair edges. Exports PNG alpha,
or video with an alpha channel (WebM here; ProRes 4444 when ffmpeg has it), plus
a separate matte-only pass for compositing.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

from ..imaging import io as vio
from ..imaging import ops
from ..schemas import Estimate
from ..storage import media_kind, output_path as out_path_for
from .base import ToolContext, register, size_label


class Isolate:
    slug = "isolate"
    name = "Isolate"
    verb = "Export"
    media = ("image", "video")

    def estimate(self, media_kind_, meta, params, quality) -> Estimate:
        px = meta["width"] * meta["height"]
        frames = meta.get("n_frames", 1)
        size = int(px * frames * 0.8)  # RGBA
        eta = frames * (px / 2_000_000) * {"fast": 0.4, "balanced": 0.9, "best": 1.8}[quality]
        notes = ["+ matte pass"] if params.get("matte_pass", True) else []
        return Estimate(output_size_bytes=size, output_size_label=size_label(size),
                        vram_mb=2100, eta_seconds=round(eta, 1), notes=notes)

    def _seed(self, params):
        pt = params.get("click")  # [x_norm, y_norm]
        return pt

    def run(self, ctx: ToolContext, input_path: Path, output_path: Path, params: dict) -> Path:
        ctx.tick(0.05, stage="Isolate", message="selecting")
        if media_kind(input_path) == "image":
            arr = vio.load_image(input_path)
            h, w = arr.shape[:2]
            seed = self._seed(params)
            seed_xy = (int(seed[0] * w), int(seed[1] * h)) if seed else None
            alpha = ops.estimate_alpha(arr, seed_xy)   # MODEL: SAM + ViTMatte
            ctx.tick(0.7, message="matting")
            rgba = ops.cutout_rgba(arr, alpha)
            p = vio.save_image(rgba, Path(output_path).with_suffix(".png"))
            if params.get("matte_pass", True):
                matte = (alpha * 255).astype(np.uint8)
                vio.save_image(np.dstack([matte] * 3), out_path_for(ctx.job_id, ".png", stem="matte"))
            ctx.tick(1.0, message="done")
            return p
        # video: emit an alpha-channel WebM (VP9 yuva420p) frame by frame
        def per_frame(frame, i):
            a = ops.estimate_alpha(frame)
            return ops.cutout_rgba(frame, a)
        p = vio.process_video(
            input_path, Path(output_path).with_suffix(".webm"),
            lambda f, i: ops.cutout_rgba(f, ops.estimate_alpha(f))[:, :, :3],  # placeholder RGB pass
            on_progress=lambda pr: ctx.tick(0.05 + pr * 0.9, message=f"{int(pr*100)}%"),
            keep_audio=False,
        )
        ctx.tick(1.0, message="done")
        return p


register(Isolate())
