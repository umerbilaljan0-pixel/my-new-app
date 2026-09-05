"""REVIVE — archival repair.

Scratch/dust removal, deblur, denoise, face restoration (GFPGAN/CodeFormer),
and B&W colourisation with a per-region hue override so the operator can force a
colour instead of accepting the model's guess.
"""
from __future__ import annotations

from pathlib import Path

from ..imaging import io as vio
from ..imaging import ops
from ..schemas import Estimate
from ..storage import media_kind
from .base import ToolContext, register, size_label

_STRENGTH = {"fast": 0.35, "balanced": 0.55, "best": 0.8}


class Revive:
    slug = "revive"
    name = "Revive"
    verb = "Render"
    media = ("image", "video")

    def estimate(self, media_kind_, meta, params, quality) -> Estimate:
        px = meta["width"] * meta["height"]
        frames = meta.get("n_frames", 1)
        size = int(px * frames * 0.55)
        eta = frames * (px / 2_000_000) * {"fast": 0.5, "balanced": 1.0, "best": 2.0}[quality]
        vram = 1500 + (900 if params.get("face_restore") else 0) + (700 if params.get("colourise") else 0)
        notes = []
        if params.get("colourise"):
            notes.append("colourise (DDColor)")
        if params.get("face_restore"):
            notes.append("face restore (CodeFormer)")
        return Estimate(output_size_bytes=size, output_size_label=size_label(size),
                        vram_mb=vram, eta_seconds=round(eta, 1), notes=notes)

    def _frame(self, arr, params, strength):
        out = ops.denoise(arr, strength)             # MODEL: SCUNet
        if params.get("deblur", True):
            out = ops.sharpen(out, 0.35)
        if params.get("face_restore"):
            out = ops.face_restore(out)              # MODEL: CodeFormer / GFPGAN
        if params.get("colourise"):
            hue = params.get("hue_override")         # per-region force colour
            out = ops.colourise(out, tuple(hue) if hue else None)  # MODEL: DDColor
        return out

    def run(self, ctx: ToolContext, input_path: Path, output_path: Path, params: dict) -> Path:
        s = _STRENGTH[ctx.quality]
        ctx.tick(0.02, stage="Revive", message="loading")
        if media_kind(input_path) == "image":
            arr = vio.load_image(input_path)
            ctx.tick(0.3, message="restoring")
            p = vio.save_image(self._frame(arr, params, s), output_path)
            ctx.tick(1.0, message="done")
            return p
        p = vio.process_video(
            input_path, output_path, lambda f, i: self._frame(f, params, s),
            on_progress=lambda pr: ctx.tick(0.02 + pr * 0.96, message=f"{int(pr*100)}%"),
            keep_audio=True,
        )
        ctx.tick(1.0, message="done")
        return p


register(Revive())
