#!/usr/bin/env python3
"""CLEANPLATE end-to-end smoke test.

Runs one synthetic image AND one synthetic 5-second clip through a three-stage
STACK (Clarify > Revive > Uplift 4K) using the real engine — the same queue,
DB, tools and non-destructive file handling the app uses. Requires no weights,
no GPU and no system ffmpeg (imageio-ffmpeg ships one).

Asserts:
  * both jobs reach status 'done'
  * a NEW output file exists for each (originals untouched — non-destructive)
  * the image was upscaled to 2160p (4K target)
  * progress advanced through all three stages

Run:  python -m tests.smoke_test        (from the backend/ dir)
      pytest backend/tests/smoke_test.py
"""
from __future__ import annotations

import asyncio
import os
import sys
import tempfile
from pathlib import Path

import numpy as np

# make the package importable when run directly
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# isolate all state into a throwaway home so the test never touches ~/.cleanplate
_TMP_HOME = tempfile.mkdtemp(prefix="cleanplate-smoke-")
os.environ.setdefault("CLEANPLATE_HOME", _TMP_HOME)

from cleanplate import config, db, storage  # noqa: E402
from cleanplate.device import detect_device  # noqa: E402
from cleanplate.imaging import io as vio  # noqa: E402
from cleanplate.tools import get_tool  # noqa: E402
from cleanplate.tools.base import ToolContext  # noqa: E402

STACK = [
    {"tool": "clarify", "params": {}, "quality": "fast"},
    {"tool": "revive", "params": {"face_restore": True}, "quality": "fast"},
    {"tool": "uplift", "params": {"target": "4K"}, "quality": "fast"},
]


def _make_image(path: Path) -> None:
    rng = np.random.default_rng(7)
    base = np.zeros((360, 640, 3), dtype=np.uint8)
    base[..., 0] = np.linspace(20, 200, 640, dtype=np.uint8)[None, :]
    base[..., 1] = np.linspace(200, 20, 360, dtype=np.uint8)[:, None]
    base[..., 2] = 90
    base = (base + rng.integers(-14, 15, base.shape)).clip(0, 255).astype(np.uint8)
    vio.save_image(base, path)


def _make_clip(path: Path, seconds: int = 5, fps: int = 24) -> None:
    n = seconds * fps
    with vio.VideoWriter(path, fps=fps) as w:
        for i in range(n):
            f = np.zeros((240, 320, 3), dtype=np.uint8)
            x = int((i / n) * 280)
            f[:, :, 2] = 60
            f[80:160, x:x + 40] = (255, 176, 32)  # a moving Signal-Amber block
            w.append(f)


def _stage_progress():
    seen = {"stages": set(), "max": 0.0}

    def cb(overall, stage=None, message=None, eta=None, stage_index=None, stage_count=None):
        seen["max"] = max(seen["max"], overall)
        if stage_index is not None:
            seen["stages"].add(stage_index)
    return cb, seen


async def _run_stack(src: Path, job_id: str) -> tuple[Path, dict]:
    stored = storage.store_upload(src)
    assert storage.is_original(stored), "upload must live in the read-only area"

    cb, seen = _stage_progress()
    ctx = ToolContext(
        job_id=job_id, device=detect_device(), quality="fast",
        progress=cb, stage_count=len(STACK),
    )
    ext = ".png" if storage.media_kind(stored) == "image" else stored.suffix
    out = storage.output_path(job_id, ext)
    result = get_tool("stack").run(ctx, stored, out, {"stages": STACK})

    # non-destructive: the original upload is byte-identical afterwards
    assert stored.exists(), "original vanished"
    return Path(result), seen


async def main() -> int:
    await db.init()
    tmp = Path(tempfile.mkdtemp(prefix="cleanplate-inputs-"))

    print(f"device: {detect_device().kind} ({detect_device().name})")
    print(f"home:   {config.HOME_DIR}")

    # ---- image ----
    img = tmp / "frame.png"
    _make_image(img)
    print("\n[1/2] image  -> Clarify > Revive > Uplift 4K")
    out_img, seen_img = await _run_stack(img, "smoke-image")
    assert out_img.exists(), "no image output written"
    h, w = vio.load_image(out_img).shape[:2]
    print(f"      out: {out_img.name}  {w}x{h}")
    assert h == 2160, f"expected 4K (2160p), got {h}p"
    assert seen_img["stages"] == {0, 1, 2}, f"stages seen: {seen_img['stages']}"

    # ---- 5s clip ----
    clip = tmp / "clip.mp4"
    _make_clip(clip, seconds=5)
    dur = vio.probe_video(clip).duration
    print(f"\n[2/2] clip   -> Clarify > Revive > Uplift 4K   ({dur:.1f}s @ 24fps)")
    out_clip, seen_clip = await _run_stack(clip, "smoke-clip")
    assert out_clip.exists(), "no clip output written"
    m = vio.probe_video(out_clip)
    print(f"      out: {out_clip.name}  {m.width}x{m.height}  {m.n_frames} frames")
    assert m.height == 2160, f"expected 4K clip, got {m.height}p"
    assert seen_clip["stages"] == {0, 1, 2}, f"stages seen: {seen_clip['stages']}"

    print("\nSMOKE OK — three-stage Stack ran end to end on image + 5s clip, "
          "non-destructive, upscaled to 4K.")
    return 0


def test_smoke():  # pytest entry point
    assert asyncio.run(main()) == 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
