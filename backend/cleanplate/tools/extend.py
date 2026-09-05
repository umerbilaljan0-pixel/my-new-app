"""EXTEND — reframe and outpaint.

Convert 16:9 to 9:16 / 1:1 by generating the missing plate instead of cropping,
with a subject-tracking safe area so the face never drifts out of frame.
Presets: YouTube, Shorts, Reels, TikTok, 4:5, 21:9.
"""
from __future__ import annotations

from pathlib import Path

from ..imaging import io as vio
from ..imaging import ops
from ..schemas import Estimate
from ..storage import media_kind
from .base import ToolContext, register, size_label

PRESETS = {
    "youtube": (16, 9),
    "shorts": (9, 16),
    "reels": (9, 16),
    "tiktok": (9, 16),
    "4:5": (4, 5),
    "1:1": (1, 1),
    "21:9": (21, 9),
}


def _target_dims(src_w, src_h, aspect):
    aw, ah = aspect
    # keep the source's larger dimension, generate the rest
    if aw / ah >= src_w / src_h:
        out_w = src_w
        out_h = round(out_w * ah / aw)
    else:
        out_h = src_h
        out_w = round(out_h * aw / ah)
    out_w -= out_w % 2
    out_h -= out_h % 2
    return out_w, out_h


class Extend:
    slug = "extend"
    name = "Extend"
    verb = "Render"
    media = ("image", "video")

    def estimate(self, media_kind_, meta, params, quality) -> Estimate:
        aspect = PRESETS.get(params.get("preset", "shorts"), (9, 16))
        ow, oh = _target_dims(meta["width"], meta["height"], aspect)
        frames = meta.get("n_frames", 1)
        size = int(ow * oh * frames * 0.6)
        eta = frames * (ow * oh / 2_000_000) * {"fast": 0.6, "balanced": 1.3, "best": 2.8}[quality]
        return Estimate(output_size_bytes=size, output_size_label=size_label(size),
                        vram_mb=3600, eta_seconds=round(eta, 1),
                        output_resolution=f"{ow}x{oh}", notes=[f"{aspect[0]}:{aspect[1]} outpaint"])

    def run(self, ctx: ToolContext, input_path: Path, output_path: Path, params: dict) -> Path:
        aspect = PRESETS.get(params.get("preset", "shorts"), (9, 16))
        safe = params.get("safe_center", [0.5, 0.5])
        ctx.tick(0.03, stage="Extend", message="planning")

        if media_kind(input_path) == "image":
            arr = vio.load_image(input_path)
            ow, oh = _target_dims(arr.shape[1], arr.shape[0], aspect)
            ctx.tick(0.4, message="outpainting")
            # MODEL: SD-outpaint with subject-tracking safe area
            out = ops.outpaint_to_aspect(arr, ow, oh, tuple(safe))
            p = vio.save_image(out, output_path)
            ctx.tick(1.0, message="done")
            return p

        meta = vio.probe_video(input_path)
        ow, oh = _target_dims(meta.width, meta.height, aspect)
        p = vio.process_video(
            input_path, output_path,
            lambda f, i: ops.outpaint_to_aspect(f, ow, oh, tuple(safe)),
            on_progress=lambda pr: ctx.tick(0.03 + pr * 0.95, message=f"{int(pr*100)}%"),
            keep_audio=True,
        )
        ctx.tick(1.0, message="done")
        return p


register(Extend())
