"""STACK — the pipeline builder.

Chains tools into a named recipe ("Archive Restore" = Clarify > Revive >
Uplift 4K) and runs them as a single job with combined, per-stage progress. The
output of each stage feeds the next; every intermediate is a new file, so the
whole chain stays non-destructive and any stage can be re-rendered.

Presets are plain JSON so a team shares one recipe. See STARTER_PRESETS.
"""
from __future__ import annotations

import shutil
from pathlib import Path

from ..imaging import io as vio
from ..schemas import Estimate
from ..storage import media_kind, output_path
from .base import ToolContext, get_tool, register, size_label

STARTER_PRESETS = [
    {"name": "Archive Restore",
     "stages": [
         {"tool": "clarify", "params": {}, "quality": "balanced"},
         {"tool": "revive", "params": {"face_restore": True}, "quality": "balanced"},
         {"tool": "uplift", "params": {"target": "4K"}, "quality": "best"},
     ]},
    {"name": "Social Cutdown",
     "stages": [
         {"tool": "clarify", "params": {}, "quality": "fast"},
         {"tool": "extend", "params": {"preset": "shorts"}, "quality": "balanced"},
     ]},
    {"name": "Clean & Sharpen",
     "stages": [
         {"tool": "erase", "params": {"auto_detect": True}, "quality": "balanced"},
         {"tool": "uplift", "params": {"target": "2K"}, "quality": "balanced"},
     ]},
]


def _ext_for(current_input: Path, tool_slug: str) -> str:
    # ISOLATE forces PNG/WebM; everything else keeps the running container type.
    if tool_slug == "isolate":
        return ".png" if media_kind(current_input) == "image" else ".webm"
    return Path(current_input).suffix or (".png" if media_kind(current_input) == "image" else ".mp4")


class Stack:
    slug = "stack"
    name = "Stack"
    verb = "Render"
    media = ("image", "video")

    def _stages(self, params: dict) -> list[dict]:
        stages = list(params.get("stages", []))
        if params.get("clarify_prepass") and (not stages or stages[0]["tool"] != "clarify"):
            stages = [{"tool": "clarify", "params": {}, "quality": "fast"}] + stages
        return stages

    def estimate(self, media_kind_, meta, params, quality) -> Estimate:
        stages = self._stages(params)
        total_size, total_eta, max_vram = 0, 0.0, 0
        cur_meta = dict(meta)
        notes = []
        for st in stages:
            tool = get_tool(st["tool"])
            e = tool.estimate(media_kind_, cur_meta, st.get("params", {}),
                              st.get("quality", quality))
            total_eta += e.eta_seconds
            total_size = e.output_size_bytes  # last stage dominates final size
            max_vram = max(max_vram, e.vram_mb)
            notes.append(f"{tool.name}")
            if e.output_resolution and "x" not in e.output_resolution:
                th = {"1080p": 1080, "2K": 1440, "4K": 2160}.get(e.output_resolution)
                if th:
                    cur_meta = {**cur_meta,
                                "width": int(cur_meta["width"] * th / cur_meta["height"]),
                                "height": th}
        return Estimate(output_size_bytes=total_size, output_size_label=size_label(total_size),
                        vram_mb=max_vram, eta_seconds=round(total_eta, 1),
                        notes=[" > ".join(notes)] if notes else [])

    def run(self, ctx: ToolContext, input_path: Path, output_path_: Path, params: dict) -> Path:
        stages = self._stages(params)
        if not stages:
            raise ValueError("STACK needs at least one stage")
        n = len(stages)
        current = Path(input_path)

        for i, st in enumerate(stages):
            tool = get_tool(st["tool"])
            child = ToolContext(
                job_id=ctx.job_id, device=ctx.device,
                quality=st.get("quality", "balanced"),
                progress=ctx.progress,
                is_cancelled=ctx.is_cancelled, is_paused=ctx.is_paused,
                stage_index=i, stage_count=n,
            )
            child.progress(i / n, stage=f"{i+1}/{n} {tool.name}", message="starting",
                           stage_index=i, stage_count=n)
            stage_out = output_path(ctx.job_id, _ext_for(current, tool.slug),
                                    stem=f"stage{i}_{tool.slug}")
            current = Path(tool.run(child, current, stage_out, st.get("params", {})))

        final = Path(output_path_).with_suffix(current.suffix)
        if final != current:
            shutil.copy2(current, final)
        ctx.progress(1.0, stage=f"{n}/{n} done", message="done",
                     stage_index=n - 1, stage_count=n)
        return final


register(Stack())
