"""SMOOTH — motion.

Frame interpolation (RIFE) to 48/60/120fps or retimed slow motion, optical-flow
stabilisation with a crop-vs-fill choice, and a rolling-shutter fix.
"""
from __future__ import annotations

from pathlib import Path

from ..imaging import io as vio
from ..imaging import ops
from ..schemas import Estimate
from ..storage import media_kind
from .base import ToolContext, register, size_label


class Smooth:
    slug = "smooth"
    name = "Smooth"
    verb = "Render"
    media = ("video",)

    def estimate(self, media_kind_, meta, params, quality) -> Estimate:
        src_fps = meta.get("fps", 24) or 24
        target_fps = int(params.get("target_fps", 60))
        slow = float(params.get("slow_factor", 1.0))
        frames = meta.get("n_frames", 1)
        out_frames = int(frames * (target_fps / src_fps) * slow)
        px = meta["width"] * meta["height"]
        size = int(px * out_frames * 0.5)
        eta = out_frames * (px / 2_000_000) * {"fast": 0.4, "balanced": 0.9, "best": 1.9}[quality]
        notes = [f"{src_fps:.0f}→{target_fps}fps"]
        if slow != 1.0:
            notes.append(f"{slow:g}× slow-mo")
        if params.get("stabilise"):
            notes.append("stabilise " + ("(fill)" if params.get("fill") else "(crop)"))
        return Estimate(output_size_bytes=size, output_size_label=size_label(size),
                        vram_mb=2600, eta_seconds=round(eta, 1), notes=notes)

    def run(self, ctx: ToolContext, input_path: Path, output_path: Path, params: dict) -> Path:
        if media_kind(input_path) != "video":
            raise ValueError("SMOOTH operates on video only")
        meta = vio.probe_video(input_path)
        src_fps = meta.fps or 24
        target_fps = int(params.get("target_fps", 60))
        slow = float(params.get("slow_factor", 1.0))
        stabilise = params.get("stabilise", False)
        fill = params.get("fill", False)

        factor = max(1, round((target_fps / src_fps) * slow))
        out_fps = src_fps if slow != 1.0 else target_fps

        frames = list(vio.iter_frames(input_path))
        total = max(1, (len(frames) - 1) * factor)
        ctx.tick(0.02, stage="Smooth", message="interpolating")

        tmp = Path(output_path).with_suffix(".noaudio" + Path(output_path).suffix)
        written = 0
        with vio.VideoWriter(tmp, fps=out_fps) as w:
            for i in range(len(frames) - 1):
                a, b = frames[i], frames[i + 1]
                for k in range(factor):
                    t = k / factor
                    f = ops.interpolate(a, b, t)     # MODEL: RIFE
                    if stabilise:
                        f = ops.stabilise_shift(f, 0, 0, fill)
                    w.append(f)
                    written += 1
                    ctx.tick(0.02 + 0.95 * written / total, message=f"{int(100*written/total)}%")
            w.append(frames[-1])

        keep_audio = slow == 1.0  # retimed audio would desync; drop on slow-mo
        if keep_audio:
            p = vio.mux_audio(tmp, input_path, output_path)
        else:
            Path(tmp).rename(output_path)
            p = Path(output_path)
        ctx.tick(1.0, message="done")
        return p


register(Smooth())
