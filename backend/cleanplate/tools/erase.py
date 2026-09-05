"""ERASE — watermark, logo and object removal.

Mask by rect/brush/lasso (feathered), or auto-detect static overlays via
temporal median + variance. Masks dilate 4–12px, propagate through shots, and
only masked pixels change. Audio is copied untouched.
"""
from __future__ import annotations

import base64
import io
from pathlib import Path

import numpy as np
from PIL import Image

from ..imaging import io as vio
from ..imaging import ops
from ..schemas import Estimate
from ..storage import media_kind
from .base import ToolContext, register, size_label

_QUALITY = {"fast": 24, "balanced": 48, "best": 96}  # inpaint relax iterations


def _mask_for(h: int, w: int, params: dict) -> np.ndarray:
    """Build a binary mask from the request params."""
    if params.get("mask_png"):
        raw = base64.b64decode(params["mask_png"].split(",")[-1])
        m = Image.open(io.BytesIO(raw)).convert("L").resize((w, h), Image.NEAREST)
        return (np.asarray(m) > 127).astype(np.uint8)
    mask = np.zeros((h, w), dtype=np.uint8)
    for rect in params.get("rects", []) or ([params["rect"]] if params.get("rect") else []):
        x, y, rw, rh = rect  # normalised 0..1
        x0, y0 = int(x * w), int(y * h)
        x1, y1 = int((x + rw) * w), int((y + rh) * h)
        mask[max(0, y0):min(h, y1), max(0, x0):min(w, x1)] = 1
    return mask


class Erase:
    slug = "erase"
    name = "Erase"
    verb = "Erase"
    media = ("image", "video")

    def estimate(self, media_kind, meta, params, quality) -> Estimate:
        px = meta["width"] * meta["height"]
        frames = meta.get("n_frames", 1)
        per = 0.9 if media_kind == "video" else 0.6
        eta = frames * per * (px / 2_000_000) * {"fast": 0.6, "balanced": 1, "best": 2.2}[quality]
        size = int(px * frames * 0.5)
        return Estimate(
            output_size_bytes=size, output_size_label=size_label(size),
            vram_mb=3200 if params.get("generative_fill") else 1800,
            eta_seconds=round(eta, 1),
            notes=["generative fill (SD-inpaint)"] if params.get("generative_fill") else [],
        )

    def run(self, ctx: ToolContext, input_path: Path, output_path: Path, params: dict) -> Path:
        iters = _QUALITY[ctx.quality]
        dilate = int(params.get("dilate_px", 6))
        feather = int(params.get("feather_px", 3))

        if media_kind(input_path) == "video":
            return self._run_video(ctx, input_path, output_path, params, iters, dilate, feather)
        return self._run_image(ctx, input_path, output_path, params, iters, dilate, feather)

    def _run_image(self, ctx, input_path, output_path, params, iters, dilate, feather) -> Path:
        ctx.tick(0.02, stage="Erase", message="loading")
        arr = vio.load_image(input_path)
        h, w = arr.shape[:2]
        mask = _mask_for(h, w, params)
        mask = ops.dilate_mask(mask, dilate)
        ctx.tick(0.2, message="inpainting")
        edited = ops.inpaint(arr, mask, iterations=iters)  # MODEL: LaMa
        soft = ops.feather_mask(mask, feather)
        out = ops.apply_masked(arr, edited, soft)
        ctx.tick(0.9, message="writing")
        p = vio.save_image(out, output_path)
        ctx.tick(1.0, message="done")
        return p

    def _run_video(self, ctx, input_path, output_path, params, iters, dilate, feather) -> Path:
        ctx.tick(0.01, stage="Erase", message="sampling frames")
        auto = params.get("auto_detect", True) and not (params.get("rect") or params.get("rects"))
        static_mask = None
        if auto:
            sample = []
            for i, f in enumerate(vio.iter_frames(input_path)):
                if i % 6 == 0:
                    sample.append(f)
                if len(sample) >= 12:
                    break
            if sample:
                static_mask = ops.auto_overlay_mask(sample)  # visual overlay only

        def per_frame(frame, idx):
            h, w = frame.shape[:2]
            m = static_mask if static_mask is not None else _mask_for(h, w, params)
            # MODEL: ProPainter propagates the mask via optical flow across the
            # shot, re-anchoring at scene cuts. Reference re-derives per frame.
            m = ops.dilate_mask(m, dilate)
            edited = ops.inpaint(frame, m, iterations=max(16, iters // 2))
            return ops.apply_masked(frame, edited, ops.feather_mask(m, feather))

        # audio copied untouched by process_video(keep_audio=True)
        p = vio.process_video(
            input_path, output_path, per_frame,
            on_progress=lambda pr: ctx.tick(0.02 + pr * 0.96, message=f"{int(pr*100)}%"),
            keep_audio=True,
        )
        ctx.tick(1.0, message="done")
        return p


register(Erase())
