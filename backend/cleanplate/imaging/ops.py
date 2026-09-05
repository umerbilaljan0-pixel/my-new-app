"""Shared pixel operations — CPU reference implementations.

These are honest, deterministic stand-ins for the ML backends: UPLIFT really
resizes with Lanczos, ERASE really removes masked pixels by diffusion inpaint,
SMOOTH really blends adjacent frames, and so on. They keep the whole suite —
and the end-to-end smoke test — runnable with zero weights and zero GPU. Each
`# MODEL:` marker is where the real network is swapped in when cached.
"""
from __future__ import annotations

import numpy as np
from PIL import Image, ImageFilter

RESOLUTION_TARGETS = {"1080p": 1080, "2K": 1440, "4K": 2160}


# ---- geometry ------------------------------------------------------------

def _pil(arr: np.ndarray) -> Image.Image:
    mode = "RGBA" if arr.ndim == 3 and arr.shape[2] == 4 else "RGB"
    return Image.fromarray(arr.astype(np.uint8), mode=mode)


def resize_to(arr: np.ndarray, width: int, height: int) -> np.ndarray:
    return np.asarray(_pil(arr).resize((width, height), Image.LANCZOS), dtype=np.uint8)


def scale_to_height(arr: np.ndarray, target_h: int) -> np.ndarray:
    h, w = arr.shape[:2]
    if h == target_h:
        return arr
    target_w = round(w * target_h / h)
    target_w -= target_w % 2  # keep even for video codecs
    return resize_to(arr, max(2, target_w), target_h)


def upscale_to_resolution(arr: np.ndarray, target: str, integer_scale: int = 4) -> np.ndarray:
    """Run the integer network scale, then Lanczos to the exact target height."""
    h = arr.shape[0]
    target_h = RESOLUTION_TARGETS[target]
    # MODEL: Real-ESRGAN xN here (tiled, 32px overlap, OOM-halving). Reference =
    # a single Lanczos step at the integer scale before the exact-fit resample.
    stepped = resize_to(arr, arr.shape[1] * integer_scale, h * integer_scale)
    return scale_to_height(stepped, target_h)


# ---- masks ---------------------------------------------------------------

def dilate_mask(mask: np.ndarray, px: int) -> np.ndarray:
    if px <= 0:
        return mask
    m = Image.fromarray((mask > 0).astype(np.uint8) * 255)
    m = m.filter(ImageFilter.MaxFilter(size=px * 2 + 1))
    return (np.asarray(m) > 127).astype(np.uint8)


def feather_mask(mask: np.ndarray, px: int) -> np.ndarray:
    if px <= 0:
        return (mask > 0).astype(np.float32)
    m = Image.fromarray((mask > 0).astype(np.uint8) * 255)
    m = m.filter(ImageFilter.GaussianBlur(radius=px))
    return np.asarray(m, dtype=np.float32) / 255.0


def temporal_median(frames: list[np.ndarray]) -> np.ndarray:
    """Median across sampled frames — static overlays (logos, bugs) survive the
    median while moving content averages out. Basis for ERASE auto-detect."""
    stack = np.stack(frames, axis=0).astype(np.float32)
    return np.median(stack, axis=0).astype(np.uint8)


def auto_overlay_mask(frames: list[np.ndarray], variance_thresh: float = 60.0) -> np.ndarray:
    """Detect static overlays via low temporal variance. Operates purely on
    visual overlay characteristics — never on provenance signatures."""
    stack = np.stack(frames, axis=0).astype(np.float32)
    var = stack.var(axis=0).mean(axis=2)          # per-pixel temporal variance
    mean = stack.mean(axis=0).mean(axis=2)         # bright-ish overlay bias
    static = (var < variance_thresh) & (mean > 40)
    return static.astype(np.uint8)


# ---- inpaint (ERASE) -----------------------------------------------------

def inpaint(arr: np.ndarray, mask: np.ndarray, iterations: int = 48) -> np.ndarray:
    """Diffusion inpaint: only masked pixels change; unmasked pixels are held
    exactly, so audio/untouched regions stay bit-identical to the source.

    MODEL: LaMa (image) / ProPainter (video) / SD-inpaint (generative fill).
    Reference = seed masked pixels from the nearest edge, then relax by repeated
    neighbour-averaging under the mask — cheap, stable, weight-free.
    """
    h, w = arr.shape[:2]
    m = (mask > 0)
    if not m.any():
        return arr.copy()

    # Downscale large fills for speed, then upsample the filled region back.
    scale = 1
    if max(h, w) > 768 and m.mean() > 0.02:
        scale = 2
        small = resize_to(arr, w // scale, h // scale)
        sm = np.asarray(Image.fromarray((m * 255).astype(np.uint8))
                        .resize((w // scale, h // scale), Image.NEAREST)) > 127
        filled_small = _relax(small, sm, iterations)
        filled = resize_to(filled_small, w, h)
        out = arr.copy()
        out[m] = filled[m]
        return out

    return _relax(arr, m, iterations)


def _relax(arr: np.ndarray, m: np.ndarray, iterations: int) -> np.ndarray:
    out = arr.astype(np.float32).copy()
    # seed hole with the mean of its border so diffusion converges fast
    border = arr[~m]
    seed = border.reshape(-1, arr.shape[2]).mean(axis=0) if border.size else np.zeros(arr.shape[2])
    out[m] = seed
    for _ in range(iterations):
        blur = np.asarray(
            Image.fromarray(out.astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)),
            dtype=np.float32,
        )
        out[m] = blur[m]
    return out.astype(np.uint8)


def apply_masked(original: np.ndarray, edited: np.ndarray, feather: np.ndarray) -> np.ndarray:
    """Composite an edit back under a feathered mask. Guarantees only masked
    pixels change (the non-destructive contract at the pixel level)."""
    a = feather[..., None]
    return (original.astype(np.float32) * (1 - a) + edited.astype(np.float32) * a).astype(np.uint8)


# ---- restore (REVIVE / CLARIFY) ------------------------------------------

def denoise(arr: np.ndarray, strength: float = 0.5) -> np.ndarray:
    # MODEL: SCUNet. Reference = edge-preserving-ish blend of median + original.
    r = max(1, int(round(strength * 3)))
    med = _pil(arr).filter(ImageFilter.MedianFilter(size=r * 2 + 1))
    return np.asarray(Image.blend(_pil(arr), med, min(0.85, strength)), dtype=np.uint8)


def sharpen(arr: np.ndarray, amount: float = 0.4) -> np.ndarray:
    sharp = _pil(arr).filter(ImageFilter.UnsharpMask(radius=2, percent=int(amount * 150), threshold=2))
    return np.asarray(sharp, dtype=np.uint8)


def deblock(arr: np.ndarray, strength: float = 0.5) -> np.ndarray:
    """De-block / de-band compressed footage (CLARIFY). MODEL: FBCNN."""
    smooth = _pil(arr).filter(ImageFilter.GaussianBlur(radius=strength * 1.5))
    blended = Image.blend(_pil(arr), smooth, min(0.7, strength))
    # add tiny dither to break 8x8 banding
    out = np.asarray(blended, dtype=np.int16)
    out += np.random.default_rng(0).integers(-1, 2, out.shape, dtype=np.int16)
    return np.clip(out, 0, 255).astype(np.uint8)


def colourise(arr: np.ndarray, hue_override: tuple[int, int, int] | None = None) -> np.ndarray:
    """B&W colourisation stub (REVIVE). MODEL: DDColor. Reference applies a warm
    archival tone, or a per-region hue override when the operator forces one."""
    gray = np.asarray(_pil(arr).convert("L"), dtype=np.float32) / 255.0
    tint = np.array(hue_override or (196, 154, 108), dtype=np.float32)
    out = gray[..., None] * tint[None, None, :]
    return np.clip(out, 0, 255).astype(np.uint8)


def face_restore(arr: np.ndarray) -> np.ndarray:
    """MODEL: GFPGAN / CodeFormer. Reference = gentle detail + denoise pass."""
    return sharpen(denoise(arr, 0.3), 0.35)


# ---- matte (ISOLATE) -----------------------------------------------------

def estimate_alpha(arr: np.ndarray, seed_xy: tuple[int, int] | None = None) -> np.ndarray:
    """Reference matte: subject vs background by colour distance from the frame
    border (or a seed point). MODEL: SAM (selection) + ViTMatte (hair edges)."""
    h, w = arr.shape[:2]
    f = arr.astype(np.float32)
    if seed_xy:
        sx, sy = seed_xy
        ref = f[min(h - 1, sy), min(w - 1, sx)]
    else:
        border = np.concatenate([f[0], f[-1], f[:, 0], f[:, -1]], axis=0)
        ref = border.mean(axis=0)
    dist = np.sqrt(((f - ref) ** 2).sum(axis=2))
    dist /= (dist.max() + 1e-6)
    alpha = np.clip((dist - 0.15) * 2.2, 0, 1)
    # soften edges to fake matting on fine detail
    alpha = np.asarray(
        Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1)),
        dtype=np.float32,
    ) / 255.0
    return alpha


def cutout_rgba(arr: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    rgba = np.dstack([arr, (alpha * 255).astype(np.uint8)])
    return rgba.astype(np.uint8)


# ---- reframe (EXTEND) ----------------------------------------------------

def outpaint_to_aspect(arr: np.ndarray, target_w: int, target_h: int,
                       safe_center: tuple[float, float] = (0.5, 0.5)) -> np.ndarray:
    """Generate missing plate to reach a new aspect instead of cropping. MODEL:
    SD-outpaint with a subject-tracking safe area; reference mirrors + blurs the
    edges to fill, keeping the tracked centre in frame."""
    h, w = arr.shape[:2]
    canvas = np.zeros((target_h, target_w, arr.shape[2]), dtype=np.uint8)

    scale = min(target_w / w, target_h / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    fitted = resize_to(arr, nw, nh)

    cx = int(np.clip(safe_center[0] * target_w - nw / 2, 0, target_w - nw))
    cy = int(np.clip(safe_center[1] * target_h - nh / 2, 0, target_h - nh))

    # fill background by stretching a heavily blurred copy of the frame
    bg = np.asarray(_pil(resize_to(arr, target_w, target_h)).filter(ImageFilter.GaussianBlur(24)),
                    dtype=np.uint8)
    canvas[:] = bg
    canvas[cy:cy + nh, cx:cx + nw] = fitted
    return canvas


# ---- motion (SMOOTH) -----------------------------------------------------

def interpolate(a: np.ndarray, b: np.ndarray, t: float) -> np.ndarray:
    """Synthesize an in-between frame at time t in [0,1]. MODEL: RIFE.
    Reference = linear blend (real interpolation, motion-blur flavoured)."""
    if a.shape != b.shape:
        b = resize_to(b, a.shape[1], a.shape[0])
    return (a.astype(np.float32) * (1 - t) + b.astype(np.float32) * t).astype(np.uint8)


def stabilise_shift(frame: np.ndarray, dx: int, dy: int, fill: bool) -> np.ndarray:
    """Apply a stabilisation offset with crop-vs-fill choice. MODEL: optical-flow
    trajectory smoothing; reference does the compensating shift."""
    out = np.roll(frame, shift=(dy, dx), axis=(0, 1))
    if fill:
        return out
    # crop-in: zero the wrapped borders instead of showing them
    if dy > 0:
        out[:dy] = out[dy:dy + 1]
    if dx > 0:
        out[:, :dx] = out[:, dx:dx + 1]
    return out
