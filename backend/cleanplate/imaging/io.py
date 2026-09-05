"""Media I/O for images and video.

Images via Pillow. Video via imageio + imageio-ffmpeg (a static ffmpeg ships
with the wheel, so real MP4/MOV/WebM read+write works with no system ffmpeg).
Everything hands frames to the ops layer as uint8 HxWxC numpy arrays.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterator

import numpy as np
from PIL import Image


# ---- images --------------------------------------------------------------

def load_image(path: str | Path) -> np.ndarray:
    img = Image.open(path).convert("RGB")
    return np.asarray(img, dtype=np.uint8)


def load_image_rgba(path: str | Path) -> np.ndarray:
    img = Image.open(path).convert("RGBA")
    return np.asarray(img, dtype=np.uint8)


def save_image(arr: np.ndarray, path: str | Path) -> Path:
    path = Path(path)
    mode = "RGBA" if arr.ndim == 3 and arr.shape[2] == 4 else "RGB"
    Image.fromarray(arr.astype(np.uint8), mode=mode).save(path)
    return path


# ---- video ---------------------------------------------------------------

@dataclass
class VideoMeta:
    width: int
    height: int
    fps: float
    n_frames: int
    duration: float


def probe_video(path: str | Path) -> VideoMeta:
    import imageio.v3 as iio

    meta = iio.immeta(path, plugin="pyav") if False else iio.immeta(path)
    fps = float(meta.get("fps", 24.0))
    # frame count is not always in metadata; count lazily but cheaply
    n = 0
    for _ in iio.imiter(path):
        n += 1
    first = iio.imread(path, index=0)
    h, w = first.shape[:2]
    return VideoMeta(width=int(w), height=int(h), fps=fps, n_frames=n,
                     duration=(n / fps if fps else 0.0))


def iter_frames(path: str | Path) -> Iterator[np.ndarray]:
    import imageio.v3 as iio

    for frame in iio.imiter(path):
        if frame.ndim == 2:
            frame = np.stack([frame] * 3, axis=-1)
        if frame.shape[2] == 4:
            frame = frame[:, :, :3]
        yield frame.astype(np.uint8)


class VideoWriter:
    """Writes RGB frames to a new file. Audio is copied from the source
    separately by `mux_audio` so the audio stream is never re-encoded."""

    def __init__(self, path: str | Path, fps: float):
        import imageio

        self.path = Path(path)
        self._w = imageio.get_writer(
            self.path, fps=fps, codec="libx264", quality=8,
            macro_block_size=None, ffmpeg_log_level="error",
        )

    def append(self, frame: np.ndarray) -> None:
        self._w.append_data(frame.astype(np.uint8))

    def close(self) -> None:
        self._w.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()


def mux_audio(video_no_audio: str | Path, source_with_audio: str | Path,
              dest: str | Path) -> Path:
    """Copy the source's audio stream onto the processed video without
    re-encoding it — audio is preserved untouched (ERASE contract, etc.).
    Falls back to the silent video if the source has no audio track."""
    import shutil

    import imageio_ffmpeg

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    import subprocess

    dest = Path(dest)
    cmd = [
        ffmpeg, "-y", "-loglevel", "error",
        "-i", str(video_no_audio), "-i", str(source_with_audio),
        "-map", "0:v:0", "-map", "1:a:0?",
        "-c:v", "copy", "-c:a", "copy", "-shortest", str(dest),
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except Exception:
        # source had no audio, or copy failed — keep the processed video as-is
        if Path(video_no_audio) != dest:
            shutil.copy2(video_no_audio, dest)
    return dest


def process_video(
    src: str | Path,
    dest: str | Path,
    fn: Callable[[np.ndarray, int], np.ndarray],
    *,
    on_progress: Callable[[float], None] | None = None,
    fps_override: float | None = None,
    keep_audio: bool = True,
) -> Path:
    """Apply a per-frame function, writing a NEW file. Progress reported 0..1."""
    meta = probe_video(src)
    total = max(meta.n_frames, 1)
    fps = fps_override or meta.fps
    tmp = Path(dest).with_suffix(".noaudio" + Path(dest).suffix)

    with VideoWriter(tmp, fps=fps) as w:
        for i, frame in enumerate(iter_frames(src)):
            w.append(fn(frame, i))
            if on_progress:
                on_progress(min(1.0, (i + 1) / total))

    if keep_audio:
        return mux_audio(tmp, src, dest)
    Path(tmp).rename(dest)
    return Path(dest)
